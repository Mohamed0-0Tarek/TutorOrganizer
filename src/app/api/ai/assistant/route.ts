import { NextResponse, type NextRequest } from "next/server";
import { getAdmin, verifyTutorToken } from "@/data/firebase/admin";
import {
  AssistantBodySchema,
  type AssistantReply,
} from "@/data/ai/schema";
import {
  runGemini,
  runGroq,
  systemInstruction,
  type RunInput,
} from "@/data/ai/providers";
import {
  ClarificationNeeded,
  loadState,
  type ToolContext,
} from "@/data/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const FALLBACK_GEMINI = PRIMARY_MODEL.includes("lite")
  ? "gemini-3.5-flash"
  : "gemini-3.5-flash-lite";

/** Config probe: booleans only, no secret values. */
export async function GET() {
  let firestore = "unknown";
  try {
    await getAdmin().db.doc("users/healthcheck-probe").get();
    firestore = "ok";
  } catch (error) {
    firestore = String(
      (error as { code?: string })?.code ?? (error as Error)?.name ?? "error",
    );
  }

  return NextResponse.json({
    geminiKey: Boolean(process.env.GEMINI_API_KEY),
    groqKey: Boolean(process.env.GROQ_API_KEY),
    serviceAccount: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    model: PRIMARY_MODEL,
    groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    dailyLimit: process.env.AI_DAILY_LIMIT ?? null,
    enabled: process.env.AI_ENABLED !== "false",
    firestore,
  });
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
    uid = (await verifyTutorToken(token)).uid;
  } catch (error) {
    console.warn("ai_auth_error", (error as Error)?.name ?? "Error");
    return NextResponse.json({ error: "authRequired" }, { status: 401 });
  }

  // 2) Validate body.
  const parsedBody = AssistantBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalidRequest" }, { status: 400 });
  }
  const body = parsedBody.data;

  // 3) Daily cap, per tutor and Cairo day.
  const limit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? 100) || 100);
  try {
    const usageRef = getAdmin().db.doc(`users/${uid}/meta/aiUsage`);
    const usage = await usageRef.get();
    const usageData = usage.data() as
      | { dateKey?: string; count?: number }
      | undefined;
    const count =
      usageData?.dateKey === body.clientToday
        ? Number(usageData?.count ?? 0)
        : 0;
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
    console.warn(
      "ai_usage_error",
      (error as Error)?.name ?? "Error",
      String((error as { code?: string })?.code ?? ""),
    );
    return NextResponse.json({ error: "usageError" }, { status: 503 });
  }

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "aiUnconfigured" }, { status: 503 });
  }

  // 4) One hydrated snapshot for every tool call in this request.
  let state;
  try {
    state = await loadState(uid);
  } catch (error) {
    console.warn("ai_state_error", (error as Error)?.name ?? "Error");
    return NextResponse.json({ error: "usageError" }, { status: 503 });
  }

  const ctx: ToolContext = { uid, clientToday: body.clientToday };
  const input: RunInput = {
    locale: body.locale,
    ...(body.text ? { text: body.text } : {}),
    ...(body.audio ? { audio: body.audio } : {}),
    ctx,
    state,
    system: systemInstruction(body.locale),
  };

  // 5) Provider ladder: fast Gemini → other Gemini → Groq (text only).
  const attempts: Array<() => Promise<AssistantReply>> = [];
  if (process.env.GEMINI_API_KEY) {
    attempts.push(() => runGemini(input, PRIMARY_MODEL));
    attempts.push(() => runGemini(input, FALLBACK_GEMINI));
  }
  if (process.env.GROQ_API_KEY && (body.text || !body.audio)) {
    attempts.push(() => runGroq(input));
  }

  let reply: AssistantReply | null = null;
  for (const attempt of attempts) {
    try {
      reply = await attempt();
      break;
    } catch (error) {
      if (error instanceof ClarificationNeeded) {
        return NextResponse.json({
          answer:
            body.locale === "ar" ? "أي طالب تقصد؟" : "Which student do you mean?",
          needsClarification: { candidates: error.candidates },
        });
      }
      // Log only the error class — never prompts, tokens or student data.
      console.warn("ai_provider_error", (error as Error)?.name ?? "Error");
    }
  }

  if (!reply) {
    return NextResponse.json({ error: "modelError" }, { status: 502 });
  }
  return NextResponse.json(reply);
}
