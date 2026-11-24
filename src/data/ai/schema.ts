import { z } from "zod";

export const AssistantBodySchema = z
  .object({
    text: z.string().trim().min(1).max(1000).optional(),
    audio: z
      .object({
        base64: z.string().min(1).max(2_800_000), // ≤ 2 MB decoded
        mimeType: z.string().min(1).max(100),
      })
      .optional(),
    locale: z.enum(["ar", "en"]),
    clientToday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((body) => Boolean(body.text || body.audio), {
    message: "text_or_audio_required",
  });

export const AssistantReplySchema = z.object({
  answer: z.string().min(1),
  proposals: z
    .array(
      z.object({
        type: z.string(),
        params: z.record(z.string(), z.unknown()),
      }),
    )
    .optional(),
});

export type AssistantReply = z.infer<typeof AssistantReplySchema>;

/** Defensive parse: a model that ignores the JSON contract still gets an answer. */
export function parseAssistantReply(
  text: string,
  locale: "ar" | "en",
): AssistantReply {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return AssistantReplySchema.parse(JSON.parse(cleaned));
  } catch {
    return {
      answer:
        cleaned ||
        (locale === "ar" ? "مش قادر أجاوب دلوقتي." : "I can't answer right now."),
    };
  }
}
