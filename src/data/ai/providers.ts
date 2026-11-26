import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { parseAssistantReply, type AssistantReply } from "./schema";
import {
  AI_TOOLS,
  ClarificationNeeded,
  executeTool,
  type State,
  type ToolContext,
} from "./tools";

export interface RunInput {
  locale: "ar" | "en";
  text?: string;
  audio?: { base64: string; mimeType: string };
  ctx: ToolContext;
  state: State;
  system: string;
}

export function systemInstruction(locale: "ar" | "en"): string {
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
You are a private tutor's assistant. Answer briefly in the same language as the question.
Every number must come from a tool result — never guess. Use propose_* tools for
actions; never claim something was saved. Ask for clarification on ambiguous names.
Reply with JSON only: {"answer":"...", "proposals":[]}.
`;
  return locale === "ar" ? arabic : english;
}

/** Gemini (primary). Keeps raw model parts so thought_signature survives. */
export async function runGemini(
  input: RunInput,
  model: string,
): Promise<AssistantReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_NOT_CONFIGURED");

  const parts: Part[] = [];
  if (input.text) parts.push({ text: input.text });
  if (input.audio) {
    parts.push({
      inlineData: {
        mimeType: input.audio.mimeType,
        data: input.audio.base64,
      },
    });
  }
  const contents: Content[] = [{ role: "user", parts }];

  const ai = new GoogleGenAI({ apiKey });

  for (let round = 0; round < 3; round += 1) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: input.system,
        tools: [{ functionDeclarations: AI_TOOLS }],
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) {
      return parseAssistantReply(response.text ?? "", input.locale);
    }

    contents.push(
      response.candidates?.[0]?.content ?? {
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
          input.ctx,
          input.state,
        );
        outcomes.push({ name: call.name ?? "", output });
      } catch (error) {
        if (error instanceof ClarificationNeeded) throw error;
        console.warn("ai_tool_error", call.name, (error as Error)?.name ?? "Error");
        outcomes.push({
          name: call.name ?? "",
          output: { error: (error as Error)?.name ?? "TOOL_ERROR" },
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

  return parseAssistantReply("", input.locale);
}

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

function groqTools() {
  return AI_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name ?? "",
      description: tool.description ?? "",
      parameters: (tool.parametersJsonSchema ?? {
        type: "object",
        properties: {},
      }) as Record<string, unknown>,
    },
  }));
}

/**
 * Groq fallback. Text-only (no inline audio); uses the OpenAI-compatible API
 * with the same read/propose tools as Gemini.
 */
export async function runGroq(input: RunInput): Promise<AssistantReply> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_NOT_CONFIGURED");

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const messages: GroqMessage[] = [
    { role: "system", content: input.system },
    {
      role: "user",
      content: input.text || "اكتب سؤالك بدل التسجيل الصوتي.",
    },
  ];

  for (let round = 0; round < 3; round += 1) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools: groqTools(),
          tool_choice: "auto",
          temperature: 0.1,
          max_completion_tokens: 2048,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`GROQ_${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };
    const message = body.choices?.[0]?.message;
    if (!message) throw new Error("GROQ_EMPTY_RESPONSE");

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return parseAssistantReply(message.content ?? "", input.locale);
    }

    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: "function",
        function: {
          name: call.function.name,
          arguments: call.function.arguments,
        },
      })),
    });

    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        // Keep empty args; the tool validator will report the problem to the model.
      }

      let output: unknown;
      try {
        output = await executeTool(
          call.function.name,
          args,
          input.ctx,
          input.state,
        );
      } catch (error) {
        if (error instanceof ClarificationNeeded) throw error;
        console.warn("ai_tool_error", call.function.name, (error as Error)?.name ?? "Error");
        output = { error: (error as Error)?.name ?? "TOOL_ERROR" };
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output),
      });
    }
  }

  return parseAssistantReply("", input.locale);
}
