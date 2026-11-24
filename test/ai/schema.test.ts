import { describe, expect, it } from "vitest";
import {
  AssistantBodySchema,
  parseAssistantReply,
} from "@/data/ai/schema";

describe("assistant request schema", () => {
  const base = { locale: "ar", clientToday: "2026-11-25" };

  it("accepts text or audio, not neither", () => {
    expect(AssistantBodySchema.safeParse({ ...base, text: "مين عليه دفعات؟" }).success).toBe(true);
    expect(
      AssistantBodySchema.safeParse({
        ...base,
        audio: { base64: "AAAA", mimeType: "audio/webm;codecs=opus" },
      }).success,
    ).toBe(true);
    expect(AssistantBodySchema.safeParse(base).success).toBe(false);
  });

  it("enforces the 1000-character and 2 MB caps", () => {
    expect(
      AssistantBodySchema.safeParse({ ...base, text: "x".repeat(1001) }).success,
    ).toBe(false);
    expect(
      AssistantBodySchema.safeParse({
        ...base,
        audio: { base64: "A".repeat(2_800_001), mimeType: "audio/mp4" },
      }).success,
    ).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(
      AssistantBodySchema.safeParse({
        ...base,
        clientToday: "25-11-2026",
        text: "مرحبا",
      }).success,
    ).toBe(false);
  });
});

describe("assistant reply parsing", () => {
  it("parses JSON answers with proposals", () => {
    const reply = parseAssistantReply(
      '{"answer":"عليه 200 ج.م","proposals":[{"type":"payment","params":{"amount":200}}]}',
      "ar",
    );
    expect(reply.answer).toBe("عليه 200 ج.م");
    expect(reply.proposals?.[0]?.type).toBe("payment");
  });

  it("accepts fenced JSON and falls back to plain text", () => {
    expect(
      parseAssistantReply('```json\n{"answer":"تمام"}\n```', "ar").answer,
    ).toBe("تمام");
    expect(parseAssistantReply("مش قادر أفهم السؤال", "ar").answer).toBe(
      "مش قادر أفهم السؤال",
    );
  });
});
