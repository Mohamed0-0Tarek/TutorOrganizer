"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/data/auth/AuthProvider";
import {
  attendancePath,
  groupsPath,
  paymentsPath,
  sessionsPath,
  studentsPath,
  userPath,
} from "@/data/paths";
import { getFirebase } from "@/data/firebase/client";
import {
  mapAttendance,
  mapGroup,
  mapPayment,
  mapSession,
  mapSettings,
  mapStudent,
} from "@/data/mappers";
import { createDefaults } from "@/data/services/settingsService";
import { ensureGenerated } from "@/data/services/sessionGenerator";
import { todayKey } from "@/domain/dateKey";
import { computeCounters } from "@/domain/counters";
import { computeStudentBalance } from "@/domain/balanceCalculator";
import {
  DEFAULT_SETTINGS,
  type Attendance,
  type Group,
  type Payment,
  type Session,
  type Student,
  type StudentBalance,
  type TutorSettings,
} from "@/domain/types";

type Source =
  | "settings"
  | "groups"
  | "students"
  | "sessions"
  | "attendance"
  | "payments";

const SOURCES: Source[] = [
  "settings",
  "groups",
  "students",
  "sessions",
  "attendance",
  "payments",
];

const emptyFlags = (): Record<Source, boolean> => ({
  settings: false,
  groups: false,
  students: false,
  sessions: false,
  attendance: false,
  payments: false,
});

export type TutorData = {
  status: "loading" | "ready" | "error";
  error: string | null;
  fromCache: boolean;
  online: boolean;
  uid: string | null;
  settings: TutorSettings;
  groups: Group[];
  students: Student[];
  sessions: Session[];
  attendance: Attendance[];
  payments: Payment[];
  sessionsById: ReadonlyMap<string, Session>;
  balances: ReadonlyMap<string, StudentBalance>;
};

const TutorDataContext = createContext<TutorData | null>(null);

export { TutorDataContext };

/**
 * The single hydrated source of truth for the signed-in tutor.
 *
 * Six listeners cover six small collections (≈15 students, ≤ 1k docs/year), so
 * every screen and the counter engine can work from memory — including offline,
 * where Firestore replays its IndexedDB cache.
 */
export function TutorDataProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const uid = user?.uid ?? null;

  const [settings, setSettings] = useState<TutorSettings>(DEFAULT_SETTINGS);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loaded, setLoaded] = useState<Record<Source, boolean>>(emptyFlags);
  const [cache, setCache] = useState<Record<Source, boolean>>(emptyFlags);
  const [settingsMissing, setSettingsMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const bootstrappedFor = useRef<string | null>(null);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!uid || !configured) return;

    const { db } = getFirebase();

    const markLoaded = (source: Source, fromCache: boolean) => {
      setLoaded((prev) => (prev[source] ? prev : { ...prev, [source]: true }));
      setCache((prev) =>
        prev[source] === fromCache ? prev : { ...prev, [source]: fromCache },
      );
    };

    const onError = (err: unknown) => {
      setError(err instanceof Error ? err.message : "load-failed");
    };

    const unsubscribers = [
      onSnapshot(
        doc(db, userPath(uid)),
        (snap) => {
          const data = snap.data() as Record<string, unknown> | undefined;
          const hasSettings = Boolean(data?.settings);
          setSettingsMissing(!hasSettings);
          setSettings(
            hasSettings ? mapSettings(data?.settings) : DEFAULT_SETTINGS,
          );
          markLoaded("settings", snap.metadata.fromCache);
        },
        onError,
      ),
      onSnapshot(
        collection(db, groupsPath(uid)),
        (snap) => {
          setGroups(snap.docs.map((item) => mapGroup(item.id, item.data())));
          markLoaded("groups", snap.metadata.fromCache);
        },
        onError,
      ),
      onSnapshot(
        collection(db, studentsPath(uid)),
        (snap) => {
          setStudents(snap.docs.map((item) => mapStudent(item.id, item.data())));
          markLoaded("students", snap.metadata.fromCache);
        },
        onError,
      ),
      onSnapshot(
        collection(db, sessionsPath(uid)),
        (snap) => {
          setSessions(snap.docs.map((item) => mapSession(item.id, item.data())));
          markLoaded("sessions", snap.metadata.fromCache);
        },
        onError,
      ),
      onSnapshot(
        collection(db, attendancePath(uid)),
        (snap) => {
          setAttendance(
            snap.docs.map((item) => mapAttendance(item.id, item.data())),
          );
          markLoaded("attendance", snap.metadata.fromCache);
        },
        onError,
      ),
      onSnapshot(
        collection(db, paymentsPath(uid)),
        (snap) => {
          setPayments(snap.docs.map((item) => mapPayment(item.id, item.data())));
          markLoaded("payments", snap.metadata.fromCache);
        },
        onError,
      ),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [uid, configured]);

  // First-run bootstrap: create settings defaults exactly once per account.
  useEffect(() => {
    if (!uid || !settingsMissing) return;
    if (bootstrappedFor.current === uid) return;
    bootstrappedFor.current = uid;
    void createDefaults(uid).catch(() => {
      bootstrappedFor.current = null;
    });
  }, [uid, settingsMissing]);

  const sessionsById = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  );

  const balances = useMemo(() => {
    const counters = computeCounters({
      students,
      sessionsById,
      attendance,
      payments,
      settings,
    });
    const result = new Map<string, StudentBalance>();
    for (const student of students) {
      result.set(
        student.id,
        computeStudentBalance(
          student,
          counters.get(student.id) ?? { counted: 0, paid: 0 },
          settings,
        ),
      );
    }
    return result;
  }, [students, sessionsById, attendance, payments, settings]);

  const fromCache = SOURCES.some((source) => cache[source]);

  const status: TutorData["status"] = error
    ? "error"
    : SOURCES.every((source) => loaded[source])
      ? "ready"
      : "loading";

  // Materialise the rolling horizon whenever hydrated data or connectivity
  // changes. planGeneration is idempotent, so a no-op run writes nothing and
  // cannot loop with its own snapshot.
  useEffect(() => {
    if (!uid || status !== "ready") return;

    const run = () => {
      void ensureGenerated(uid, { groups, sessions, today: todayKey() }).catch(
        () => {
          // Retried on the next snapshot / focus / online event.
        },
      );
    };

    run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uid, status, groups, sessions]);

  const value = useMemo<TutorData>(
    () => ({
      status,
      error,
      fromCache,
      online,
      uid,
      settings,
      groups,
      students,
      sessions,
      attendance,
      payments,
      sessionsById,
      balances,
    }),
    [
      status,
      error,
      fromCache,
      online,
      uid,
      settings,
      groups,
      students,
      sessions,
      attendance,
      payments,
      sessionsById,
      balances,
    ],
  );

  return (
    <TutorDataContext.Provider value={value}>
      {children}
    </TutorDataContext.Provider>
  );
}
