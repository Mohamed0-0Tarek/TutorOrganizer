# Stage 0 spikes

Two assumptions must be proven before later stages rely on them. Fill in a
verdict for each platform you test. Do not mark the stage done without them.

Dev-only helpers: `/dev` (bottom bar → **المزيد / More** → Dev tools) seeds a
group, two students, one completed session for today and two attendance rows,
and can toggle an absence, recompute counters and clear the data again.

---

## Spike A — Firestore offline + batched writes (PWA)

Device(s): ____________________  Browser: ____________________

1. [ ] Sign in with email/password (a real project, **not** the emulator —
       emulator mode deliberately runs on `memoryLocalCache`).
2. [ ] `/dev` → **Seed demo data**. Confirm counts: students 2, groups 1, sessions 1, attendance 2.
3. [ ] Open Today, Schedule, Students, Dues once (warms the cache).
4. [ ] Turn on airplane mode. Reload the tab.
       → App shell loads, data still visible, offline bar appears.
5. [ ] `/dev` → **Toggle first student's absence** while offline.
       → The attendance row flips, and after ~1 s the counters follow (the dev
         screen reconciles counters from hydrated state).
6. [ ] Kill the tab, reopen while still offline.
       → The write is still there (queued in IndexedDB).
7. [ ] Reconnect.
       → Offline bar disappears, exactly one sync, no duplicate attendance rows.
8. [ ] Cold profile: new browser profile, offline, open the app.
       → Honest "first load needs a connection" behaviour (no fake zeros).

**Verdict:** ______________________________________________

Notes / copy changes needed: ______________________________

---

## Spike B — Gemini audio MIME

The question: does Gemini accept the audio container that each phone actually
records, without a conversion step?

Helper (no app route, no `firebase-admin` needed):

```bash
# record ~3 s of Egyptian Arabic, save the blob to a file, then:
node scripts/gemini-audio-probe.mjs clip.webm "audio/webm;codecs=opus"
node scripts/gemini-audio-probe.mjs clip.m4a  "audio/mp4"
```

It reads `GEMINI_API_KEY` / `GEMINI_MODEL` from the environment or `.env.local`,
posts `inlineData` to `v1beta/models/{model}:generateContent`, and prints the
HTTP status plus the transcription (exit code 0 = accepted).

| Platform | `MediaRecorder` type | Verdict | Notes |
| --- | --- | --- | --- |
| Android Chrome | `audio/webm;codecs=opus` | pending | |
| iOS Safari 17+ | `audio/mp4` | pending | |
| Desktop Chrome (fallback dev) | `audio/webm;codecs=opus` | pending | |

**Fallback ladder** if a container is rejected (decided **now**, used in Stage 9):

1. Try the same container with the bare MIME type (`audio/webm`, `audio/mp4`).
2. Web Speech API `ar-EG` on the client → send **text** to the AI route
   (server still caps usage; no audio leaves the phone).
3. Client-side conversion (WAV/MP4) — last resort, only if 1 and 2 both fail.

In the shipped route (`POST /api/ai/assistant`), a rejected audio MIME returns
`422 { error: "audioUnsupported" }`; the sheet shows the calm fallback copy and
the user types instead. Phone numbers are stripped from every tool result before
it reaches the model.

**Verdict:** ______________________________________________

Notes / chosen path: ______________________________________

---

## Stage 0 environment notes

- Firestore emulator needs **JDK 21+** (`firebase-tools` refuses Java 17).
  Verified locally with Temurin 21 JRE:
  `JAVA_HOME=/path/to/jre21 npm run test:emulator` → 4/4 rules tests pass.
- Emulator mode (`NEXT_PUBLIC_USE_EMULATORS=1`) uses `memoryLocalCache`, so
  offline behaviour must be verified on a real project.
