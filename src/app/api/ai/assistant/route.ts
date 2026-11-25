import { NextResponse, type NextRequest } from "next/server";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { getAdmin } from "@/data/firebase/admin";
import {
  AssistantBodySchema,
  parseAssistantReply,
} from "@/data/ai/schema";
import {
  AI_TOOLS,
  ClarificationNeeded,
  executeTool,
  type ToolContext,
} from "@/data/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function systemInstruction(locale: "ar" | "en"): string {
  const arabic = `
أنت مساعد مدير مدرس خاص. أجب بالعربية المصرية الواضحة والمختصرة.
قواعد لا تخرقها:
1) كل رقم في إجابتك يجب أن يأتي من نتيجة أداة (tool) — لا تخمن أبدًا.
2) إذا سُئلت عن مبلغ أو طالب أو حصة، استدعِ الأداة المناسبة أولًا.
3) لا تنفّذ أي تعديل بنفسك. استخدم أدوات propose_* فقط لإرجاع مقترح، ثم يؤكد المستخدم في الواجهة.
4) إذا كان الاسم مكررًا أو غير واضح، اطلب التوضيح ولا تختر طالبًا.
5) لا تذكر أرقام تليفونات، ولا تدّعي أنك حفظت شيئًا.
6) أرجع القيمة بصيغة JSON فقط: {"answer":"...", "proposals":[{"type":"...","params":{...}}]}.
7) إذا لم تكن هناك مقترحات، أرجع proposals كقائمة فارغة أو احذفها.
`;
  const english = `
You are a private tutor's assistant. Answer briefly in English.
Every number must come from a tool result — never guess. Use propose_* tools for
actions; never claim something was saved. Ask for clarification on ambiguous names.
Reply with JSON only: {"answer":"...", "proposals":[]}.
`;
  return locale === "ar" ? arabic : english;
}

export async function POST(request: NextRequest) {
  // 1) Authenticate the tutor with the real Firebase ID token.
  const token = /^Bearer\s+(.+)$/i.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "authRequired" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAdmin().auth.verifyIdToken(token)).uid;
  } catch (error) {
    // Log only the error class, never the token or student data.
    console.warn("ai_auth_error", (error as Error)?.name ?? "Error");
    return NextResponse.json({ error: "authRequired" }, { status: 401 });
  }

  // 2) Validate body.
  const parsedBody = AssistantBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalidRequest" }, { status: 400 });
  }
  const body = parsedBody.data;

  // 3) Daily cap, per tutor and Cairo day.
  const limit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? 100) || 100);
  let count = 0;
  try {
    const usageRef = getAdmin().db.doc(`users/${uid}/meta/aiUsage`);
    const usage = await usageRef.get();
    const usageData = usage.data() as
      | { dateKey?: string; count?: number }
      | undefined;
    count =
      usageData?.dateKey === body.clientToday ? Number(usageData?.count ?? 0) : 0;
    if (count >= limit) {
      return NextResponse.json({ error: "limitReached" }, { status: 429 });
    }
    await usageRef.set(
      {
        dateKey: body.clientToday,
        count: count + 1,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (error) {
    // A missing/misconfigured service account or Firestore outage surfaces here.
    console.warn(
      "ai_usage_error",
      (error as Error)?.name ?? "Error",
      String((error as { code?: string })?.code ?? ""),
    );
    return NextResponse.json({ error: "usageError" }, { status: 503 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "aiUnconfigured" }, { status: 503 });
  }

  const ctx: ToolContext = { uid, clientToday: body.clientToday };
  const parts: Part[] = [];
  if (body.text) parts.push({ text: body.text });
  if (body.audio) {
    parts.push({
      inlineData: {
        mimeType: body.audio.mimeType,
        data: body.audio.base64,
      },
    });
  }
  const contents: Content[] = [{ role: "user", parts }];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    let finalText = "";

    // Up to 2 tool rounds, then the model must produce the final JSON answer.
    for (let round = 0; round < 3; round += 1) {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction(body.locale),
          tools: [{ functionDeclarations: AI_TOOLS }],
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        finalText = response.text ?? "";
        break;
      }

      // Keep the model's raw parts: Gemini 3.x requires the thought_signature
      // attached to each functionCall part when replaying the tool round.
      const modelContent = response.candidates?.[0]?.content;
      contents.push(
        modelContent ?? {
          role: "model",
          parts: calls.map((call) => ({
            functionCall: { name: call.name ?? "", args: call.args ?? {} },
          })),
        },
      );

      const outcomes: Array<{ name: string; output: unknown }> = [];
      for (const call of calls) {
        try {
          const output = await executeTool(
            call.name ?? "",
            (call.args ?? {}) as Record<string, unknown>,
            ctx,
          );
          outcomes.push({ name: call.name ?? "", output });
        } catch (error) {
          if (error instanceof ClarificationNeeded) {
            return NextResponse.json({
              answer:
                body.locale === "ar"
                  ? "أي طالب تقصد؟"
                  : "Which student do you mean?",
              needsClarification: { candidates: error.candidates },
            });
          }
          // Log only the tool name and error type — never student data.
          console.warn("ai_tool_error", call.name, (error as Error)?.name ?? "Error");
          outcomes.push({
            name: call.name ?? "",
            output: { error: (error as Error)?.message ?? "TOOL_ERROR" },
          });
        }
      }

      contents.push({
        role: "user",
        parts: outcomes.map((outcome) => ({
          functionResponse: {
            name: outcome.name,
            response: { output: outcome.output },
          },
        })),
      });
    }

    return NextResponse.json(parseAssistantReply(finalText, body.locale));
  } catch (error) {
    // Only error class / status are logged, never prompts or student data.
    console.warn("ai_model_error", (error as Error)?.name ?? "Error");
    const message = String((error as Error)?.message ?? "").toLowerCase();
    if (body.audio && /mime|format|unsupported|decode|audio/.test(message)) {
      return NextResponse.json({ error: "audioUnsupported" }, { status: 422 });
    }
    return NextResponse.json({ error: "modelError" }, { status: 502 });
  }
}
