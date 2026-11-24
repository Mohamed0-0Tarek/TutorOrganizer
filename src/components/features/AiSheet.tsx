"use client";

import { useState } from "react";
import { Loader2, Mic, Send, SquarePen } from "lucide-react";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sheet } from "@/components/ui/Sheet";
import { StatusChip } from "@/components/ui/StatusChip";
import { useAuth } from "@/data/auth/AuthProvider";
import { useTutorData } from "@/data/provider/hooks";
import { saveLesson } from "@/data/services/attendanceService";
import { recordPayment } from "@/data/services/paymentService";
import { cancelSession } from "@/data/services/sessionService";
import { todayKey } from "@/domain/dateKey";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";

type Message = { role: "user" | "assistant"; text: string };
type Proposal = { type: string; params: Record<string, unknown> };
type Candidate = { id: string; name: string; groupName: string };

interface SpeechLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(text);
}

export function AiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { getIdToken } = useAuth();
  const {
    uid,
    online,
    students,
    sessionsById,
    attendance,
    payments,
    settings,
  } = useTutorData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const source = { students, sessionsById, attendance, payments, settings };

  function mapError(status: number, code?: string): string {
    if (status === 401) return "auth";
    if (status === 429) return "limit";
    if (status === 422) return "audio";
    if (status === 503 || status === 502) return "model";
    if (code === "invalidRequest") return "generic";
    return "network";
  }

  async function ask(text: string, audio?: { base64: string; mimeType: string }) {
    if (busy || !online) return;
    setBusy(true);
    setErrorKey(null);
    setResult(null);
    setProposals([]);
    setCandidates([]);
    if (text) setMessages((current) => [...current, { role: "user", text }]);

    try {
      const token = await getIdToken();
      if (!token) {
        setErrorKey("auth");
        return;
      }
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...(text ? { text } : {}),
          ...(audio ? { audio } : {}),
          locale,
          clientToday: todayKey(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        answer?: string;
        proposals?: Proposal[];
        needsClarification?: { candidates: Candidate[] };
        error?: string;
      };

      if (!response.ok) {
        setErrorKey(mapError(response.status, data.error));
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.answer ?? "" },
      ]);
      setProposals(data.proposals ?? []);
      setCandidates(data.needsClarification?.candidates ?? []);
    } catch {
      setErrorKey("network");
    } finally {
      setBusy(false);
    }
  }

  function startSpeech() {
    type SpeechWindow = Window & {
      SpeechRecognition?: new () => SpeechLike;
      webkitSpeechRecognition?: new () => SpeechLike;
    };
    const scope = window as SpeechWindow;
    const Recognizer = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;

    if (Recognizer) {
      const recognition = new Recognizer();
      recognition.lang = "ar-EG";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        setInput(event.results[0][0].transcript);
        setListening(false);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognition.start();
      setListening(true);
      return;
    }

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          setErrorKey("audio");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
          (candidate) => MediaRecorder.isTypeSupported(candidate),
        );
        const recorder = new MediaRecorder(
          stream,
          mime ? { mimeType: mime } : undefined,
        );
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
          void blob.arrayBuffer().then((buffer) => {
            void ask("", { base64: toBase64(buffer), mimeType: blob.type });
          });
          stream.getTracks().forEach((track) => track.stop());
          setListening(false);
        };
        recorder.start();
        setListening(true);
        window.setTimeout(() => recorder.stop(), 3000);
      } catch {
        setListening(false);
        setErrorKey("audio");
      }
    })();
  }

  async function runProposal(proposal: Proposal, params: Record<string, unknown>) {
    if (!uid) return;
    setBusy(true);
    setErrorKey(null);
    try {
      if (proposal.type === "attendance") {
        const resultFromSave = await saveLesson(uid, {
          sessionId: String(params.sessionId),
          absentIds: Array.isArray(params.absentIds)
            ? params.absentIds.map(String)
            : [],
          source,
        });
        setResult(
          resultFromSave.newlyDue.length > 0
            ? format(t.attendance.newlyDue, { n: resultFromSave.newlyDue.length })
            : t.attendance.savedBody,
        );
      } else if (proposal.type === "payment") {
        await recordPayment(
          uid,
          {
            studentId: String(params.studentId),
            amount: Number(params.amount),
            sessionsCovered: Number(params.sessionsCovered ?? settings.cycleLength),
            dateKey: String(params.dateKey ?? todayKey()),
            ...(typeof params.note === "string" ? { note: params.note } : {}),
          },
          source,
        );
        setResult(t.ai.resultBody);
      } else if (proposal.type === "cancelSession") {
        await cancelSession(uid, String(params.sessionId), undefined, source);
        setResult(t.ai.resultBody);
      } else if (proposal.type === "reminder") {
        const text = String(params.text ?? "");
        void navigator.clipboard?.writeText(text).catch(() => {});
        const student = students.find((item) => item.id === params.studentId);
        const phone = student?.phone?.replace(/[^\d]/g, "") ?? "";
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
          "_blank",
          "noreferrer",
        );
        setResult(t.dues.copied);
      }
      setProposals((current) => current.filter((_, index) => index !== editing));
      setEditing(null);
    } catch {
      setErrorKey("generic");
    } finally {
      setBusy(false);
    }
  }

  const suggestions = [
    t.ai.suggestion1,
    t.ai.suggestion2,
    t.ai.suggestion3,
    t.ai.suggestion4,
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t.ai.title}>
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-muted">{t.ai.subtitle}</p>

        <div className="no-scrollbar flex max-h-64 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  disabled={!online || busy}
                  className="press shrink-0 rounded-full bg-white/60 px-3 py-2 text-[12px] disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : (
            messages.map((message, index) => (
              <GlassCard
                key={index}
                className={`max-w-[90%] p-3 text-[13.5px] leading-6 ${
                  message.role === "user" ? "self-end bg-primary/15" : "self-start"
                }`}
              >
                {message.text}
              </GlassCard>
            ))
          )}

          {candidates.length > 0 ? (
            <GlassCard className="self-start p-3">
              <p className="mb-2 text-[13px] font-semibold">{t.ai.clarifyTitle}</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => void ask(`${candidate.name} — ${candidate.groupName}`)}
                    className="press rounded-full bg-white/60 px-3 py-1.5 text-[12px]"
                  >
                    {candidate.name} · {candidate.groupName}
                  </button>
                ))}
              </div>
            </GlassCard>
          ) : null}

          {proposals.map((proposal, index) => (
            <GlassCard key={index} className="self-start p-3">
              <p className="mb-1 text-[13px] font-semibold">{t.ai.proposalTitle}</p>
              <p className="mb-2 text-[12px] text-muted">{t.ai.proposalExplain}</p>
              <p dir="ltr" className="mb-2 text-[12px]">{proposal.type}</p>
              {editing === index ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={4}
                    dir="ltr"
                    className="w-full rounded-btn border border-white/80 bg-white/70 p-2 text-[11px] outline-none"
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                  />
                  <p className="text-[11px] text-muted">{t.ai.editHint}</p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(editText) as Record<string, unknown>;
                        setProposals((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, params: parsed } : item,
                          ),
                        );
                        setEditing(null);
                      } catch {
                        setErrorKey("generic");
                      }
                    }}
                    className="press min-h-10 rounded-btn bg-primary text-[12px] font-semibold text-white"
                  >
                    {t.common.save}
                  </button>
                </div>
              ) : (
                <ConfirmCard
                  title={proposal.type}
                  confirmLabel={t.ai.confirm}
                  cancelLabel={t.ai.cancel}
                  tone="primary"
                  busy={busy}
                  onCancel={() =>
                    setProposals((current) => current.filter((_, i) => i !== index))
                  }
                  onConfirm={() => void runProposal(proposal, proposal.params)}
                />
              )}
              {editing !== index ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(index);
                    setEditText(JSON.stringify(proposal.params, null, 2));
                  }}
                  className="press mt-1 flex items-center gap-1 text-[12px] text-primary-dark"
                >
                  <SquarePen size={13} aria-hidden />
                  {t.ai.edit}
                </button>
              ) : null}
            </GlassCard>
          ))}
        </div>

        {busy ? (
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            {t.ai.thinking}
          </p>
        ) : null}
        {errorKey ? (
          <p role="alert" className="text-[12.5px] text-danger">
            {t.ai.errors[errorKey as keyof typeof t.ai.errors]}
          </p>
        ) : null}
        {result ? (
          <div className="flex items-center justify-between gap-2 rounded-btn bg-success/10 px-3 py-2">
            <StatusChip tone="success">{result}</StatusChip>
            <button type="button" onClick={() => setResult(null)} className="text-[12px] text-muted">
              {t.common.close}
            </button>
          </div>
        ) : null}

        {!online ? <p className="text-[12.5px] text-warning">{t.ai.offline}</p> : null}

        <div className="flex items-center gap-2">
          <input
            className="min-h-11 flex-1 rounded-btn border border-white/80 bg-white/70 px-3 text-[14px] outline-none focus:border-primary/60"
            placeholder={t.ai.placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && input.trim()) {
                const text = input.trim();
                setInput("");
                void ask(text);
              }
            }}
          />
          <button
            type="button"
            aria-label={t.ai.mic}
            disabled={!online || busy}
            onClick={startSpeech}
            className={`press flex h-11 w-11 shrink-0 items-center justify-center rounded-btn ${
              listening ? "bg-danger text-white" : "bg-white/60 text-primary"
            } disabled:opacity-50`}
          >
            <Mic size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t.ai.send}
            disabled={!online || busy || !input.trim()}
            onClick={() => {
              const text = input.trim();
              setInput("");
              void ask(text);
            }}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-primary text-white disabled:opacity-50"
          >
            <Send size={17} aria-hidden />
          </button>
        </div>

        {listening ? (
          <p className="text-[12px] text-primary-dark">{t.ai.listening}</p>
        ) : null}
      </div>
    </Sheet>
  );
}
