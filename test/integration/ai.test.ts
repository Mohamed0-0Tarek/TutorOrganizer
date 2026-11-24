import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { createUserWithEmailAndPassword } from "firebase/auth";

// The auth emulator mints tokens for the project in .firebaserc; the admin SDK
// must verify against that same audience.
process.env.GOOGLE_CLOUD_PROJECT = "tutor-manager-demo";

const mock = vi.hoisted(() => ({ calls: 0, answering: true }));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async () => {
        mock.calls += 1;
        if (mock.calls === 1) {
          return {
            functionCalls: [{ name: "get_dues", args: {} }],
            text: "",
          };
        }
        return {
          functionCalls: [],
          text: JSON.stringify({
            answer: mock.answering
              ? "عليه 200 ج.م"
              : "ما قدرش أجاوب النهاردة",
            proposals: [],
          }),
        };
      },
    };
  },
}));

import { POST } from "@/app/api/ai/assistant/route";
import { getFirebase } from "@/data/firebase/client";
import { createGroup } from "@/data/services/groupService";
import { createStudent } from "@/data/services/studentService";
import { todayKey } from "@/domain/dateKey";

describe("AI assistant route (emulator + mocked model)", () => {
  let testEnv: RulesTestEnvironment;
  let token = "";

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-tutor-manager",
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
    await testEnv.clearFirestore();

    const { auth } = getFirebase();
    const credentials = await createUserWithEmailAndPassword(
      auth,
      `ai-${Date.now()}@example.com`,
      "password123",
    );
    token = await credentials.user.getIdToken();

    const groupId = await createGroup(credentials.user.uid, {
      name: "رياضيات",
      slots: [],
    });
    await createStudent(credentials.user.uid, {
      name: "أحمد",
      groupId,
      pricePerSession: 50,
      startedAtKey: todayKey(),
      initialCounted: 6,
      initialPaid: 0,
      phone: "01001234567",
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv.cleanup();
  });

  function request(body: unknown, bearer = token) {
    return new NextRequest("http://localhost:3000/api/ai/assistant", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("rejects unauthenticated callers", async () => {
    const response = await POST(
      request({ text: "مين عليه دفعات؟", locale: "ar", clientToday: todayKey() }, ""),
    );
    expect(response.status).toBe(401);
  });

  it("answers from tool results and never includes the parent's phone", async () => {
    const response = await POST(
      request({ text: "مين عليه دفعات؟", locale: "ar", clientToday: todayKey() }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toBe("عليه 200 ج.م");
    expect(JSON.stringify(body)).not.toContain("01001234567");
    expect(mock.calls).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("enforces the daily cap", async () => {
    process.env.AI_DAILY_LIMIT = "2";
    // Two more calls hit the limit configured for this tutor/day.
    await POST(request({ text: "سؤال", locale: "ar", clientToday: todayKey() }));
    const response = await POST(
      request({ text: "سؤال تاني", locale: "ar", clientToday: todayKey() }),
    );
    expect(response.status).toBe(429);
  }, 30_000);
});
