# Tutor Manager (مدير المدرس) — Complete Build Plan

*Version 1.0 · For vibe coding · Flutter + Firebase · Part A: English · Part B: العربية (further down)*

---

# PART A — ENGLISH

## 1. Overview

A mobile app for ONE private tutor (science, about 9–15 students, 4–7 groups) to run his teaching: weekly schedule, fast attendance after each lesson, a session counter per student, payment tracking (cash, usually after every 4 sessions), dues, statistics, and an AI assistant (text + voice) that answers questions and records attendance from speech.

Built first for a tutor the developer knows. It may be offered to other tutors later, so keep the code clean, but do not build multi-tutor features now.

**Goals**

- Replace the notebook's calculations, not the notebook itself. Recording a lesson must take under 30 seconds.
- The tutor never forgets who owes money.
- Calm, simple, beautiful UI.
- Works offline, syncs through Firebase so he can open it on a second phone.

**Non-goals for v1**

- Parent or student accounts, online payments, automatic messages to parents, multi-tutor or centre accounts, homework or grades, video lessons.

## 2. Core business rules (source of truth)

These rules decide everything. Implement them as a pure Dart class (`BalanceCalculator`) with unit tests, with no Flutter or Firebase imports.

1. **Cycle length L = 4 sessions** (a setting, default 4). One lesson per week, so a cycle is about a month.
2. **The counter belongs to the student, not the group.** A student who joins late starts at 0. A student who moves to another group keeps his counters and payment status.
3. **A session counts for a student** when he is present, or when he is absent and the setting `absenceCounts` is true. Default is true (absence counts); the tutor can change it in Settings. Cancelled sessions never count. Extra sessions (rare, exam periods) count like regular ones.
4. **Payments** are cash, full amount, normally after the student finishes 4 sessions, sometimes earlier. Each payment stores the amount actually paid, the date, `sessionsCovered` (default 4) and an optional note.
5. **Price is per student.** Some students pay less. Expected amount per cycle = `pricePerSession × L`. A payment stores the real amount, so old records never change when the price changes later.
6. **balance = sessionsCounted − sessionsPaid**
   - `balance >= L` → **DUE**. `dueCycles = floor(balance / L)`. Amount due = `dueCycles × L × pricePerSession`.
   - `0 < balance < L` → in progress, not due yet.
   - `balance == 0` → settled.
   - `balance < 0` → **paid ahead** by `abs(balance)` sessions. Such a student must never appear as unpaid when he reaches session 4.
7. **cyclePosition** = `counted == 0 ? 0 : ((counted − 1) mod L) + 1`, shown as 'session 3 of 4'. It is based on counted sessions, not on payments, so a student who paid early at session 3 still shows '3 of 4 · paid ✓'.
8. **Group position** = the most common cyclePosition among its active students with counted > 0 (tie → the higher one). Students whose position differs are flagged, for example 'Ahmed 2/4'.
9. `sessionsCounted` and `sessionsPaid` are cached fields on the student. The source of truth is attendance + payments + settings. After any edit, call `recomputeStudent(studentId)`.
10. Past attendance can be edited; counters are recomputed afterwards.
11. Makeup for a missed lesson is informal (explained in the next lesson). Do not model it.

## 3. Tech stack and architecture

- **Flutter** (stable), Material 3 as the base, fully custom theme. Arabic (RTL) is the default UI language, English is available.
- **State:** `flutter_riverpod`. **Routing:** `go_router`.
- **Firebase:** Auth (Google sign-in + email), Cloud Firestore with offline persistence enabled, Cloud Functions (callable) for the AI.
- **Packages:** `firebase_core`, `firebase_auth`, `cloud_firestore`, `cloud_functions`, `google_sign_in`, `intl`, `google_fonts` (Cairo), `speech_to_text` (on-device, locale `ar_EG`), `fl_chart`, `flutter_localizations`.
- **AI:** a callable Cloud Function calls a Claude model through the Anthropic API. The API key lives in Firebase Secret Manager and never inside the app. The model name is an environment variable.

**Folder structure**

```
lib/
  core/        theme/, widgets/ (glass_card, status_chip...), utils/, l10n/
  domain/      balance_calculator.dart (pure Dart), models/
  data/        repositories/ (groups, students, sessions, attendance, payments, settings)
  features/    auth/, today/, schedule/, attendance/, groups/, students/,
               payments/, dues/, stats/, ai/, settings/
  app.dart, main.dart
functions/     index.ts (aiAssistant), tools.ts
```

**Rules for the codebase**

- UI never talks to Firestore directly; only repositories do.
- All user-facing strings go through l10n (ar + en).
- All money is stored as integers (whole currency units). Currency label comes from Settings (default EGP / ج.م).
- Every list screen has loading, empty and error states.

## 4. Data model (Firestore)

Everything lives under `users/{uid}`.

```
users/{uid}
  settings: { absenceCounts: true, cycleLength: 4, language: 'ar',
              currency: 'EGP', weekStartsOn: 6 /* Saturday */ }

users/{uid}/groups/{groupId}
  name, subject?, slots: [{ weekday: 0-6, time: 'HH:mm', durationMin }],
  active: true, createdAt

users/{uid}/students/{studentId}
  name, phone? (parent), groupId, pricePerSession, startedAt,
  active: true, note?,
  sessionsCounted: 0, sessionsPaid: 0        // cached, see rule 9

users/{uid}/sessions/{groupId_yyyymmdd[_n]}
  groupId, date (timestamp), time, type: 'regular'|'extra',
  status: 'scheduled'|'completed'|'cancelled', note?

users/{uid}/attendance/{sessionId_studentId}
  sessionId, studentId, groupId (at that time), date,
  status: 'present'|'absent'

users/{uid}/payments/{paymentId}
  studentId, date, amount, sessionsCovered, note?
```

**Indexes:** attendance (studentId, date desc); sessions (date asc, groupId); payments (studentId, date desc).

**Security rules:** a signed-in user can read and write only documents under `users/{request.auth.uid}/`. Everything else is denied.

**Session generation:** sessions are created from group `slots`. On app start (and when a group's slots change), idempotently create sessions for the next 14 days using the deterministic id above, so running it twice never duplicates. Extra sessions get a `_n` suffix. The tutor can cancel any session or add an extra one for any group and date.

## 5. Screens

Navigation: bottom bar with 4 tabs (**Today, Schedule, Students, Stats**) plus **More** (Groups, Dues, Settings). A floating mic/sparkle button opens the AI assistant from any tab.

### S1. Splash and Sign-in

- Logo, 'Continue with Google' and email/password. First launch → short onboarding: create first group, add first students (skippable).
- States: loading, wrong password, no network (offline sign-in works if previously signed in).

### S2. Today (home)

- Header: greeting, today's date (Gregorian + weekday in Arabic).
- **Today's lessons**: card per session (group name, time, number of students, 'session 3/4' badge, status: scheduled / completed / cancelled). Tap → Attendance (S3).
- **Reminder card** 'Reaching session 4 today': students whose next counted session is their 4th and who are not paid ahead, listed per group (this is the reminder the tutor asked for: today is session 4 for X and Y, did they pay?).
- **Due now card**: number of students with `balance >= L` and total amount; tap → Dues (S8).
- Quick actions: add extra session, record payment.
- Empty state: 'No lessons today' with a calm illustration.

### S3. Attendance (the most important screen)

- Opened from a session card. Title: group, date, time, 'session 3/4' badge.
- List of the group's active students. **Everyone is Present by default.** Tapping a row toggles Absent (row turns soft red, light haptic). Each row shows name, cyclePosition ('2 of 4'), and a payment chip (Paid ahead / Due / —).
- Mic button: tutor says 'Ahmed and Hamada were absent'; names get highlighted as Absent; a confirm bar shows the result before saving.
- Buttons: **Save lesson** (primary), **Cancel lesson**, **Add note**.
- On save: write attendance docs, set session `completed`, recompute counters in one batch, then show a result sheet: 'Saved. 2 students reached a due payment' with a shortcut to record payment.
- Editable later: reopening a completed session shows saved states; editing triggers recompute.
- Edge cases: student joined after the session date (hidden), student inactive (hidden), working offline (saves locally, syncs later).

### S4. Schedule

- Toggle Day / Week. Week view is a 7-column or vertical list of days with lesson blocks (group colour, time). Day view lists lessons with status.
- Actions: add extra session, cancel a session, jump to date.

### S5. Groups (More → Groups)

- **List:** name, student count, next lesson, group position badge ('session 3/4') and a small warning if some students differ.
- **Group detail:** schedule slots, student list with each student's position and payment state, flagged outliers, 'Add student', 'Edit', 'Archive'.
- **Group form:** name, weekly slots (weekday + time, multiple), subject (optional).

### S6. Students

- **List:** search, filter (All / Due / Paid ahead / Archived), grouped by group or flat. Row: name, group, position, status chip.
- **Student detail:** name, parent phone (tap to call or WhatsApp), group, price per session, start date; counter ring ('3 of 4'); balance and status; tabs: **Attendance history**, **Payments history**; buttons: Record payment, Move group, Edit, Archive.
- **Student form:** name, parent phone, group, price per session, start date, optional note. Starting counter field (default 0) for students who already have history.
- **Move group:** pick new group; counters stay; attendance history keeps old group ids.

### S7. Record payment (bottom sheet)

- Fields: student (prefilled), amount (prefilled = expected for dueCycles, or one cycle if none due), sessions covered (default 4), date (default today), note.
- Shows a live preview: 'After this payment: paid ahead 1 session' or 'Settled'.
- Warns (does not block) if amount differs from the expected amount.

### S8. Dues

- Sorted list of students with `balance >= L`: name, group, sessions completed since last payment, amount due, 'Record payment' button. Total at the top.
- Second section: 'Almost due' (balance = L−1) so the tutor can prepare.
- Row action: draft a polite reminder text for the parent (AI), copy it, open WhatsApp. Never sent automatically.

### S9. Statistics

- Month picker. Cards: **Collected**, **Outstanding** (sum of amounts due now), **Expected** this month, **Attendance rate**.
- Charts (`fl_chart`): income per month (last 6 months), attendance rate per group (bars).
- Lists: students with most absences, students most often late to pay (days between cycle end and payment), top groups by income.
- All numbers computed in plain Dart/Firestore queries, never by the AI.

### S10. AI assistant

- Bottom sheet or full screen chat. Input: text field + mic. Suggestion chips: 'Who hasn't paid?', 'Who was absent this week?', 'How much did I collect this month?', 'Who reaches session 4 this week?'.
- Two behaviours: **answer questions** (read-only) and **prepare actions** (attendance, payment, cancel session). An action is always shown as a confirmation card with Confirm / Edit / Cancel. Nothing is written without a tap.
- Details in section 6.

### S11. Settings

- Absence counts toward the cycle (switch, default ON), cycle length (default 4), currency label, week start day, language (Arabic / English), account (email, sign out), data export (CSV/JSON, v1.1), about.
- Changing 'absence counts' recomputes all students (show a confirm dialog).

## 6. AI design

**Principle:** the AI understands language; plain code does the maths and the writing to the database.

**Flow**

1. The app sends `{ text, locale, today, groups:[{id,name}], students:[{id,name,groupId}] }` to the callable function `aiAssistant`. The list is small (about 15 students), so it is cheap.
2. The function calls the model with a system prompt and a fixed set of **tools**. The model chooses a tool and arguments; it never invents numbers.
3. Read tools run in the function against Firestore (admin SDK, scoped to the caller's uid) and return JSON. The model phrases the answer from that JSON in the tutor's language.
4. Action tools do NOT write. They return a proposed action `{type, params}`; the app renders a confirmation card and performs the write through the normal repositories after the tutor taps Confirm.

**Tools**

- Read: `get_dues()`, `get_almost_due()`, `get_absences({studentId?, groupId?, from, to})`, `get_income({from, to})`, `get_group_status({groupId})`, `get_student_summary({studentId})`, `get_today_overview()`.
- Propose: `propose_attendance({groupId, date, absentStudentIds[]})`, `propose_payment({studentId, amount, sessionsCovered, date})`, `propose_cancel_session({groupId, date})`, `draft_parent_reminder({studentId})`.

**Name matching:** if a spoken name matches more than one student, return `needs_clarification` with the candidates and ask 'Which Ahmed?'. Never guess. If a name matches nobody, say so.

**System prompt (summary):** You are the assistant inside a private tutor's management app. Reply in the same language and dialect the tutor used (Egyptian Arabic by default), briefly. Use tools for every number and never calculate from memory. Never claim an action was done; you only propose it. If the request is ambiguous, ask one short question.

**Voice:** `speech_to_text` on device with locale `ar_EG` converts speech to text, then it follows the same path as typed text. Show the recognised text so the tutor can fix it before sending.

**Safety and cost:** rate-limit the function per user, cap input length, never send phone numbers to the model, log errors only.

## 7. Design system

**Mood:** calm, warm, quiet. Soft beige and sand, one muted sage accent, frosted-glass cards. It should feel like good stationery, not a tech product.

**Hard rules**

- No gradients, no purple/blue AI glow, no neon, no glowing orbs.
- Glass effect is subtle: translucent white cards with blur over a flat warm background.
- One accent colour, used sparingly.

**Background:** flat `#F3EDE3`. To give the glass something to blur, place 2–3 large solid blurred circles (sand `#E6DBC9`, sage `#CFDCD3`, clay `#EBD5C7`) at 40–60% opacity behind the content. Solid colours only.

| Token | Value | Use |
| --- | --- | --- |
| background | #F3EDE3 | app background |
| surface-glass | white 55% + blur 18 | cards, sheets |
| glass-border | white 70%, 1px | card outline |
| text | #2E2B27 | main text |
| text-muted | #7A7468 | secondary text |
| primary | #6B8F7B | buttons, active tab |
| primary-dark | #4F7261 | pressed, links |
| accent | #C58B6D | highlights, charts |
| success | #6B8F7B | present, paid |
| warning | #D8A24A | almost due |
| danger | #C45B52 | absent, due |
| info | #6F8FA6 | paid ahead |

Status chips use the same colours at 15% opacity as fill with the full colour as text.

**Typography:** Cairo (supports Arabic and Latin). Title 22/700, section 17/600, body 15/400, caption 12.5/400. Numbers use tabular figures.

**Shape and space:** card radius 20, buttons 14, chips fully round. 4-pt grid (8 / 12 / 16 / 24). Minimum tap target 48 dp. Card shadow: 0 8 24 rgba(60,50,40,0.08).

**Components:** `GlassCard`, `StatusChip`, `CounterRing` (thin ring showing 3 of 4), `StudentRow`, `SessionCard`, `BigPrimaryButton`, `EmptyState` (single-colour line illustration), `ConfirmCard` (AI actions).

**Motion:** 200 ms ease-out, no bounce. Press scale 0.98. Light haptic when toggling attendance. Sheets slide up softly.

**Accessibility:** contrast at least 4.5:1 for text, never rely on colour alone (absent also shows an icon and the word), support system font scaling, full RTL mirroring.

**Dark mode:** v1.1 (deep warm brown `#1F1B17`, same accent).

## 8. Build plan (about 4 weeks)

**Week 1 — Foundation**

- Create the Flutter project, Firebase (Auth, Firestore, Functions), theme, l10n (ar/en, RTL), router, `GlassCard`.
- Sign-in, settings document, security rules.
- Groups and students: full CRUD with repositories.
- *Done when:* he can sign in, add 5 groups and 12 students, close and reopen the app offline and see them.

**Week 2 — Sessions and attendance**

- Session generation from slots, Schedule (day/week), cancel and extra session.
- `BalanceCalculator` + unit tests for every scenario in section 9.
- Attendance screen with default-present, save, recompute.
- *Done when:* all tests pass and a lesson can be recorded in under 30 seconds.

**Week 3 — Money and dashboard**

- Payments sheet, student detail histories, Dues screen.
- Today screen with reminder and due cards, group position badges and outlier flags.
- *Done when:* the early-payment and late-joiner cases behave exactly as in section 9.

**Week 4 — Stats, AI, polish**

- Statistics screen and charts.
- `aiAssistant` function, tools, chat UI, voice, confirmation cards.
- Empty/error states, haptics, app icon, splash, Android release build, internal test with the tutor.
- *Done when:* the tutor used it for one real week without opening the notebook for calculations.

**After v1:** dark mode, CSV/JSON export and backup, iOS release, yearly statistics, multi-tutor support if he decides to offer it to others.

## 9. Test scenarios (unit tests for BalanceCalculator)

Assume L = 4, price = 50, `absenceCounts = true` unless stated.

1. New student, 4 present sessions, no payment → counted 4, paid 0, balance 4 → DUE, amount 200, position 4.
2. Pays at session 3 (covers 4) → counted 3, paid 4, balance −1 → paid ahead 1, position 3 'paid ✓'. After session 4 → balance 0, settled. After session 8 → balance 4 → DUE.
3. Absent once, `absenceCounts = true` → absence counts as a session. With `false` → it does not; position and balance stay.
4. Group is at session 3; a student joined last week with counted 1 → group shows 3/4, student flagged '1/4'.
5. Student moves group at counted 3 → counters unchanged, next session in the new group is his 4th.
6. Student unpaid for 6 sessions → balance 6, dueCycles 1, amount 200, position 2. After paying 4 → balance 2, position 2, not due.
7. Discounted student price 40 → due amount 160.
8. Cancelled session → nobody's counter changes.
9. Extra session in exam week → counts for present students.
10. Edit an old absence to present → counters recomputed.
11. Offline: mark attendance, close app, reconnect → data synced, no duplicates.
12. Two students both named 'Ahmed' + voice command 'Ahmed was absent' → AI asks which one.

## 10. Master prompt for the vibe-coding tool

Copy this first, then paste the relevant section of this document with each step.

```
You are building 'Tutor Manager', a Flutter + Firebase app for ONE private
tutor (about 15 students, 4-7 groups). Read the whole spec I give you and
follow it exactly.

Rules:
- Business rules in section 2 are the source of truth. Put them in a pure
  Dart BalanceCalculator with unit tests for every scenario in section 9
  BEFORE building UI.
- Architecture: riverpod + go_router; UI never calls Firestore directly,
  only repositories do. Firestore offline persistence ON.
- Arabic RTL by default, all strings in l10n (ar + en). Font: Cairo.
- Design: follow section 7 exactly. No gradients, no purple/blue AI look.
  Warm beige background, frosted glass cards, one sage accent.
- Money = integers. Counters are cached on the student and recomputed from
  attendance + payments + settings after every change.
- Do not add features that are not in the spec. Ask me if something is unclear.
- Work one week of the build plan at a time. After each step, tell me what
  to test by hand.
```

**Suggested step prompts**

1. 'Do Week 1: project setup, theme, l10n, auth, groups and students CRUD.'
2. 'Do the BalanceCalculator and its unit tests only. Show me the test output.'
3. 'Do session generation, Schedule and the Attendance screen (S3).'
4. 'Do payments, student detail, Dues and Today screens.'
5. 'Do Statistics.'
6. 'Do the aiAssistant Cloud Function with the tools in section 6, then the chat UI with voice and confirmation cards.'
7. 'Polish: empty/error states, haptics, icon, splash, release build.'

## 11. Decisions to confirm with the tutor

- Does an absence count toward the 4 sessions? (default in the app: yes, changeable in Settings)
- Is the first lesson of a new student counted, or is there a free trial?
- What are the real per-student prices for the discounted students?
- Which weekday does his week start on, and what are the lesson times for each group?
- Does he want to enter old data (students already mid-cycle)? The student form has a starting counter for this.

---

*End of Part A. Part B (العربية) follows.*
