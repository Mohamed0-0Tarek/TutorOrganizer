import { getAdmin } from "@/data/firebase/admin";
import {
  attendancePath,
  groupsPath,
  paymentsPath,
  sessionsPath,
  studentsPath,
  userPath,
} from "@/data/paths";
import {
  mapAttendance,
  mapGroup,
  mapPayment,
  mapSession,
  mapSettings,
  mapStudent,
} from "@/data/mappers";
import { needsReminder, computeStudentBalance } from "@/domain/balanceCalculator";
import { computeCounters } from "@/domain/counters";
import { expectedCycleAmount, formatMoney } from "@/domain/money";
import { computeGroupStatus } from "@/domain/groupPosition";
import {
  collectedInMonth,
  incomeByMonth,
  monthKeyOf,
} from "@/domain/stats";
import type {
  Counters,
  DateKey,
  Group,
  Session,
  Student,
  StudentBalance,
  TutorSettings,
} from "@/domain/types";
import { redactStrings } from "@/domain/aiSanitize";
import type { FunctionDeclaration } from "@google/genai";

/** Raised when a name matches several students; the model must ask, not guess. */
export class ClarificationNeeded extends Error {
  constructor(
    public readonly candidates: Array<{ id: string; name: string; groupName: string }>,
  ) {
    super("NEEDS_CLARIFICATION");
  }
}

export interface ToolContext {
  uid: string;
  clientToday: DateKey;
}

export interface State {
  settings: TutorSettings;
  groups: Group[];
  students: Student[];
  sessionsById: Map<string, Session>;
  attendance: ReturnType<typeof mapAttendance>[];
  payments: ReturnType<typeof mapPayment>[];
  counters: Map<string, Counters>;
  balances: Map<string, StudentBalance>;
}

export async function loadState(uid: string): Promise<State> {
  const { db } = getAdmin();
  const [user, groups, students, sessions, attendance, payments] =
    await Promise.all([
      db.doc(userPath(uid)).get(),
      db.collection(groupsPath(uid)).get(),
      db.collection(studentsPath(uid)).get(),
      db.collection(sessionsPath(uid)).get(),
      db.collection(attendancePath(uid)).get(),
      db.collection(paymentsPath(uid)).get(),
    ]);

  const settings = mapSettings(user.data()?.settings);
  const groupList = groups.docs.map((item) => mapGroup(item.id, item.data()));
  const studentList = students.docs.map((item) => mapStudent(item.id, item.data()));
  const sessionMap = new Map(
    sessions.docs.map((item) => {
      const session = mapSession(item.id, item.data());
      return [session.id, session];
    }),
  );
  const attendanceList = attendance.docs.map((item) =>
    mapAttendance(item.id, item.data()),
  );
  const paymentList = payments.docs.map((item) => mapPayment(item.id, item.data()));

  const counters = computeCounters({
    students: studentList,
    sessionsById: sessionMap,
    attendance: attendanceList,
    payments: paymentList,
    settings,
  });
  const balances = new Map<string, StudentBalance>();
  for (const student of studentList) {
    balances.set(
      student.id,
      computeStudentBalance(
        student,
        counters.get(student.id) ?? { counted: 0, paid: 0 },
        settings,
      ),
    );
  }

  return {
    settings,
    groups: groupList,
    students: studentList,
    sessionsById: sessionMap,
    attendance: attendanceList,
    payments: paymentList,
    counters,
    balances,
  };
}

function resolveStudent(state: State, raw: unknown): Student {
  const name = String(raw ?? "").trim().toLowerCase();
  if (!name) throw new Error("STUDENT_NAME_REQUIRED");
  const byId = state.students.find((student) => student.id === name);
  if (byId) return byId;

  const exact = state.students.filter(
    (student) => student.name.trim().toLowerCase() === name,
  );
  const matches = exact.length
    ? exact
    : state.students.filter((student) =>
        student.name.toLowerCase().includes(name),
      );
  if (matches.length === 0) throw new Error("STUDENT_NOT_FOUND");
  if (matches.length > 1) {
    throw new ClarificationNeeded(
      matches.map((student) => ({
        id: student.id,
        name: student.name,
        groupName:
          state.groups.find((group) => group.id === student.groupId)?.name ?? "—",
      })),
    );
  }
  return matches[0];
}

function groupName(state: State, groupId: string): string {
  return state.groups.find((group) => group.id === groupId)?.name ?? "—";
}

function studentRow(state: State, student: Student) {
  const balance = state.balances.get(student.id);
  return {
    id: student.id,
    name: student.name,
    groupName: groupName(state, student.groupId),
    counted: balance?.counted ?? 0,
    paid: balance?.paid ?? 0,
    balance: balance?.balance ?? 0,
    state: balance?.state ?? "SETTLED",
    amountDue: balance?.amountDue ?? 0,
  };
}

async function execute(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  state: State,
): Promise<unknown> {
  switch (name) {
    case "get_dues": {
      const rows = state.students
        .filter((student) => student.active)
        .map((student) => studentRow(state, student))
        .filter((row) => row.state === "DUE")
        .sort((a, b) => b.amountDue - a.amountDue || a.name.localeCompare(b.name, "ar"));
      return { rows, total: rows.reduce((sum, row) => sum + row.amountDue, 0) };
    }

    case "get_almost_due": {
      const rows = state.students
        .filter((student) => student.active)
        .map((student) => ({
          ...studentRow(state, student),
          counted: state.counters.get(student.id)?.counted ?? 0,
        }))
        .filter((row) =>
          needsReminder(
            { counted: row.counted, state: row.state as StudentBalance["state"] },
            state.settings.cycleLength,
          ),
        );
      return { rows };
    }

    case "get_absences": {
      const monthKey = typeof args.monthKey === "string" ? args.monthKey : undefined;
      const target = args.studentName ? resolveStudent(state, args.studentName) : null;
      const rows = state.attendance
        .filter((row) => row.status === "absent")
        .filter((row) => !target || row.studentId === target.id)
        .filter((row) => {
          const session = state.sessionsById.get(row.sessionId);
          return (
            session?.status === "completed" &&
            (!monthKey || row.dateKey.startsWith(monthKey))
          );
        })
        .map((row) => ({
          dateKey: row.dateKey,
          studentName:
            state.students.find((student) => student.id === row.studentId)?.name ?? "—",
          groupName: groupName(state, row.groupId),
        }));
      return { total: rows.length, rows: rows.slice(0, 40) };
    }

    case "get_income": {
      const monthKey =
        typeof args.monthKey === "string" ? args.monthKey : monthKeyOf(ctx.clientToday);
      return {
        monthKey,
        collected: collectedInMonth(state.payments, monthKey),
        expectedOneCycle: state.students
          .filter((student) => student.active)
          .reduce(
            (sum, student) =>
              sum + expectedCycleAmount(student.pricePerSession, state.settings.cycleLength),
            0,
          ),
        series: incomeByMonth(state.payments, monthKey, 6),
      };
    }

    case "get_group_status": {
      return {
        groups: state.groups.map((group) => {
          const status = computeGroupStatus(
            state.students.filter((student) => student.groupId === group.id),
            state.balances,
          );
          return { id: group.id, name: group.name, ...status };
        }),
      };
    }

    case "get_student_summary": {
      const student = resolveStudent(state, args.studentName ?? args.studentId);
      return {
        ...studentRow(state, student),
        initialCounted: student.initialCounted,
        initialPaid: student.initialPaid,
      };
    }

    case "get_today_overview": {
      const activeIds = new Set(
        state.students
          .filter((student) => student.active)
          .map((student) => student.id),
      );
      const sessions = [...state.sessionsById.values()]
        .filter((session) => session.dateKey === ctx.clientToday)
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((session) => ({
          id: session.id,
          time: session.time,
          groupName: session.groupName,
          status: session.status,
          roster: state.students
            .filter(
              (student) =>
                student.active &&
                student.groupId === session.groupId &&
                student.startedAtKey <= session.dateKey,
            )
            .map((student) => ({ id: student.id, name: student.name })),
        }));
      return {
        dateKey: ctx.clientToday,
        sessions,
        // Only active students, matching get_dues and the /dues screen.
        dueTotal: [...state.balances.entries()].reduce(
          (sum, [studentId, balance]) =>
            activeIds.has(studentId)
              ? sum + Math.max(0, balance.amountDue)
              : sum,
          0,
        ),
        reminderCount: state.students.filter(
          (student) =>
            student.active &&
            needsReminder(
              {
                counted: state.counters.get(student.id)?.counted ?? 0,
                state: state.balances.get(student.id)?.state ?? "SETTLED",
              },
              state.settings.cycleLength,
            ),
        ).length,
      };
    }

    case "propose_attendance": {
      const sessionId = String(args.sessionId ?? "");
      const session = state.sessionsById.get(sessionId);
      if (!session) throw new Error("SESSION_NOT_FOUND");
      const absentIds = Array.isArray(args.absentStudentIds)
        ? args.absentStudentIds.map(String)
        : [];
      const valid = new Set(
        state.students
          .filter(
            (student) =>
              student.groupId === session.groupId &&
              student.active &&
              student.startedAtKey <= session.dateKey,
          )
          .map((student) => student.id),
      );
      if (absentIds.some((id) => !valid.has(id))) throw new Error("STUDENT_NOT_IN_LESSON");
      return {
        type: "attendance",
        params: { sessionId, absentIds, dateKey: session.dateKey },
      };
    }

    case "propose_payment": {
      const student = resolveStudent(state, args.studentName ?? args.studentId);
      const amount = Number(args.amount);
      if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
      const sessionsCovered = Number(
        args.sessionsCovered ?? state.settings.cycleLength,
      );
      if (!Number.isInteger(sessionsCovered) || sessionsCovered < 1) {
        throw new Error("INVALID_SESSIONS");
      }
      return {
        type: "payment",
        params: {
          studentId: student.id,
          amount,
          sessionsCovered,
          dateKey: typeof args.dateKey === "string" ? args.dateKey : ctx.clientToday,
          ...(typeof args.note === "string" ? { note: args.note } : {}),
        },
      };
    }

    case "propose_cancel_session": {
      const sessionId = String(args.sessionId ?? "");
      if (!state.sessionsById.has(sessionId)) throw new Error("SESSION_NOT_FOUND");
      return { type: "cancelSession", params: { sessionId } };
    }

    case "draft_parent_reminder": {
      const student = resolveStudent(state, args.studentName ?? args.studentId);
      const balance = state.balances.get(student.id);
      const amount = formatMoney(
        balance?.amountDue ?? 0,
        state.settings.currencyLabel,
      );
      const text = `السلام عليكم ${student.name}، عندك ${amount} مستحق. لو تحب نرتب الدفعة كلمني.`;
      return { type: "reminder", params: { studentId: student.id, text } };
    }

    default:
      throw new Error(`UNKNOWN_TOOL: ${name}`);
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  preloaded?: State,
): Promise<unknown> {
  // One hydrated snapshot per request: a question that calls three tools must
  // not re-read six Firestore collections three times.
  const state = preloaded ?? (await loadState(ctx.uid));
  return redactStrings(await execute(name, args, ctx, state));
}

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  additionalProperties: false,
  ...(required.length ? { required } : {}),
});

export const AI_TOOLS: FunctionDeclaration[] = [
  {
    name: "get_dues",
    description: "Students who currently owe money, with exact amounts. No arguments.",
    parametersJsonSchema: object({}),
  },
  {
    name: "get_almost_due",
    description: "Active students whose next counted session reaches the payment cycle. No arguments.",
    parametersJsonSchema: object({}),
  },
  {
    name: "get_absences",
    description: "Absence records of completed lessons. Optionally for one student or one month.",
    parametersJsonSchema: object({
      studentName: { type: "string" },
      monthKey: { type: "string", description: "yyyy-MM" },
    }),
  },
  {
    name: "get_income",
    description: "Money collected in a Cairo month plus a six-month series.",
    parametersJsonSchema: object({ monthKey: { type: "string" } }),
  },
  {
    name: "get_group_status",
    description: "Current cycle position and outliers for every group. No arguments.",
    parametersJsonSchema: object({}),
  },
  {
    name: "get_student_summary",
    description: "Exact counters, balance and group for one student. Ask by name; ambiguous names return candidates.",
    parametersJsonSchema: object({ studentName: { type: "string" } }, ["studentName"]),
  },
  {
    name: "get_today_overview",
    description: "Today's lessons with each session's eligible student roster ids, total due and how many students reach a payment. Uses the client's Cairo date.",
    parametersJsonSchema: object({}),
  },
  {
    name: "propose_attendance",
    description: "Propose saving a lesson with the given absent student ids. Never writes anything.",
    parametersJsonSchema: object(
      {
        sessionId: { type: "string" },
        absentStudentIds: { type: "array", items: { type: "string" } },
      },
      ["sessionId"],
    ),
  },
  {
    name: "propose_payment",
    description: "Propose recording a whole-unit payment for one student. Never writes anything.",
    parametersJsonSchema: object(
      {
        studentName: { type: "string" },
        amount: { type: "integer" },
        sessionsCovered: { type: "integer" },
        dateKey: { type: "string" },
        note: { type: "string" },
      },
      ["studentName", "amount"],
    ),
  },
  {
    name: "propose_cancel_session",
    description: "Propose cancelling a lesson by id. Never writes anything.",
    parametersJsonSchema: object({ sessionId: { type: "string" } }, ["sessionId"]),
  },
  {
    name: "draft_parent_reminder",
    description: "Draft a WhatsApp reminder for one student. Never sends anything.",
    parametersJsonSchema: object({ studentName: { type: "string" } }, ["studentName"]),
  },
];

