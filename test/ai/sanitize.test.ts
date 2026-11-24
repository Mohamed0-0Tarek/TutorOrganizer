import { describe, expect, it } from "vitest";
import { redactPhones, redactStrings } from "@/domain/aiSanitize";
import { AI_TOOLS, ClarificationNeeded } from "@/data/ai/tools";

describe("AI privacy", () => {
  it("redacts local and international phone numbers", () => {
    expect(redactPhones("اتصل ب 01001234567")).toBe("اتصل ب [number]");
    expect(redactPhones("+20 100 123 4567")).toBe("[number]");
    expect(redactPhones("السعر 200 ج.م")).toBe("السعر 200 ج.م");
  });

  it("keeps ids but redacts every string field in a tool result", () => {
    const result = redactStrings({
      studentId: "s1_20261125",
      note: "موبيله 01123456789",
      nested: [{ phone: "01234567890", name: "أحمد" }],
      amount: 200,
    });
    expect(result.studentId).toBe("s1_20261125");
    expect(result.note).toBe("موبيله [number]");
    expect(result.nested[0]).toEqual({ phone: "[number]", name: "أحمد" });
    expect(result.amount).toBe(200);
  });
});

describe("AI tools", () => {
  it("declares all seven read tools and four proposal tools", () => {
    const names = AI_TOOLS.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "get_dues",
        "get_almost_due",
        "get_absences",
        "get_income",
        "get_group_status",
        "get_student_summary",
        "get_today_overview",
        "propose_attendance",
        "propose_payment",
        "propose_cancel_session",
        "draft_parent_reminder",
      ]),
    );
    expect(names.every((name) => name?.startsWith("get_") || name?.startsWith("propose_") || name === "draft_parent_reminder")).toBe(true);
  });

  it("carries duplicate-name candidates without guessing", () => {
    const error = new ClarificationNeeded([
      { id: "s1", name: "أحمد", groupName: "رياضيات" },
      { id: "s2", name: "أحمد", groupName: "إنجليزي" },
    ]);
    expect(error.candidates).toHaveLength(2);
    expect(error.candidates[1].groupName).toBe("إنجليزي");
  });
});
