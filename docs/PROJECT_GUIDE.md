# دليل مشروع Tutor Manager (مدير المدرس) — شرح كامل

> هذا الملف هو المرجع الواحد لكل حاجة في المشروع: إيه اللي بيحصل، فين، بإيه، وليه اتعمل كده.
> آخر تحديث: 26 نوفمبر 2026 — بعد كل Stage 0–10 + تحسينات AI/Vercel.

---

## 1) المشروع في سطرين

تطبيق PWA ** RTL بالعربية المصرية** لمدرس خاص واحد (9–15 طالب، 4–7 مجموعات).
يغطي: الحصص، الحضور، عداد الحصص لكل طالب، الدفعات، المستحقات، الإحصائيات، ومساعد ذكي بالصوت/النص.

**الهدف:** المدرس يفتح التطبيق الصبح يلاقي: حصص النهاردة + مين قرب يدفع + مين عليه فلوس، من غير ما يفتح دفتر ورقي.

---

## 2) الحقائق السريعة

| حاجة | القيمة |
|---|---|
| Live URL | `https://tutor-organizer.vercel.app` |
| GitHub | `https://github.com/Mohamed0-0Tarek/TutorOrganizer` |
| Firebase project | `tutororganizer` |
| Firestore location | `me-central1` (Doha]— أقرب منطقة لمصر) |
| Framework | Next.js 16.4.6 — App Router + TypeScript |
| React | 19.3.0 |
| Tailwind | 4.3.3 (Turbopack في dev / PostCSS في build) |
| Firebase client | 13.4.0 |
| Firebase Admin | 14.5.1 (Firestore فقط — لا نستورد `auth` منه، انظر §13) |
| AI SDK | `@google/genai` 3.6.1 + `jose` 6.2.18 للتحقق من التوكن |
| Charts | `recharts` 3.11.1 |
| Icons | `lucide-react` 1.79.0 |
| Validation | `zod` 4.6.7 |
| PWA | `@serwist/next` + `serwist` 9.5.15 |
| Tests | `vitest` 5.1.1 + `@firebase/rules-unit-testing` 6 |
| Node | `24.x` (مثبّت في `engines`) |

### الأوامر

```bash
npm run dev            # Turbopack — Serwist متوقف في التطوير
npm run build          # next build --webpack  (لازم webpack عشان الـ service worker)
npm start              # تشغيل نسخة الإنتاج محليًا
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # 88 unit tests
npm run test:emulator  # 20 test (قواعد + تكامل) على emulators
npm run emulators      # Auth :9099 + Firestore :8080 + UI :4000
```

---

## 3) القواعد الذهبية (لو كسرتها هتقع في مشاكل)

1. `src/domain/**` **خالص TypeScript**: مفيش React، Next، Firebase، ولا متصفح. كل الدوال قابلة للاختبار لوحدها.
2. **الشاشات ما بتكتبش Firestore مباشرةً.** القراءة كلها في `TutorDataProvider`، والكتابة كلها في `src/data/services/*`.
3. `counterService` هو **الوحيد** اللي بيكتب `sessionsCounted` / `sessionsPaid`.
4. كل الكتابات بـ `writeBatch` (آمنة للـ offline). **ممنوع `runTransaction`** — محتاج نت ومعندناش.
5. التواريخ كلها `yyyy-MM-dd` في **Africa/Cairo**. ممنوع `toISOString().slice(0,10)`.
6. الفلوس **integers** دايمًا (ج.م)، والأرقام بتتعرض بـ Latin digits (123) مع `tabular-nums`.
7. **كل كلمة بيشوفها المستخدم** في `src/i18n/ar.ts` + `en.ts`. مفيش نصوص hardcoded في الشاشات.
8. المساعد AI **ما بيكتبش أبدًا من غير بطاقة اقتراح + ضغط «تنفيذ»**.

---

## 4) هيكل المجلدات

```
src/
  app/                 #Routes (App Router)
    (auth)/            # sign-in, onboarding — بدون bottom bar
    (app)/             # اليوم، الجدول، الطلاب، المجموعات، الحضور، المستحقات، الإحصائيات، الإعدادات، dev
    api/ai/assistant/  # الـ route الخلفي للمساعد (Node runtime)
    offline/           # صفحة fallback للـ service worker
    manifest.ts        # PWA manifest
    sw.ts              # مصدر الـ service worker (Serwist)
    globals.css        # الـ design tokens + وصفة الـ glass
    layout.tsx         # الـ root: Cairo font + providers
    error.tsx          # Error boundary عام
  components/
    ui/                # مكتبة القطع المشتركة (glass card, chips, sheet...)
    features/          # قطع خاصة: forms, BalanceChip, PaymentSheet, AiSheet...
  domain/              # المنطق الخالص (لا تبعيات)
  data/
    firebase/          # client (lazy) + admin (server)
    ai/                # tools, providers, schema — المساعد
    auth/              # AuthProvider
    provider/          # TutorDataProvider + hooks
    services/          # كل الكتابات على Firestore
    mappers.ts         # Firestore -> domain types
    paths.ts           # كل مساراتFirestore في مكان واحد
  i18n/                # ar/en + provider + locale store
  lib/                 # helper صغيرة (cn, vibrate, weekdays, groupColor...)
test/
  domain/              # unit tests للمنطق الخالص
  ai/                  # schema + privacy tests
  integration/         # emulator tests (CRUD, sessions, attendance, payments, AI)
  emulator/            # firestore.rules tests
docs/                  # spikes, manual-tests, versions, release-checklist, هذا الملف
scripts/               # gemini-audio-probe.mjs
firebase.json / firestore.rules / firestore.indexes.json
next.config.ts / postcss.config.mjs / vitest*.mts / .env.example
```

---

## 5) طبقة `domain/` — كل دالة وظيفتها

| الملف | بيعمل إيه بالظبط |
|---|---|
| `types.ts` | كل الـ interfaces: `Group`, `Student`, `Session`, `Attendance`, `Payment`, `TutorSettings`, `StudentBalance`. فيه `DEFAULT_SETTINGS`: `absenceCounts=true`, `cycleLength=4`, `weekStartsOn=6` (السبت)، العملة EGP/ج.م. |
| `dateKey.ts` | `dateKeyOf`, `todayKey`, `addDaysKey`, `weekdayOfKey`, `formatArabicDate`, `formatTime`. كل الحسابات على UTC كـ `yyyy-MM-dd` عشان Cairo والـ DST ما يbosوا الحساب. |
| `sessionId.ts` | ID حتمي: `{groupId}_{yyyyMMdd}` للحصة العادية، `_{n}` للإضافية. `attendanceId = {sessionId}_{studentId}`. `nextExtraSessionNumber` بيرجع **أصغر رقم حر ≥2**. الـ deterministic ID هو اللي بيمنع التكرار offline. |
| `money.ts` | `expectedCycleAmount(price,L) = price × L`، `formatMoney` بالـ en-US digits، assertions إن المبلغ integer موجب. |
| `counters.ts` | **المرجع الوحيد** لحساب `counted` و`paid`: `initial + attendance(completed && >= startedAtKey && present أو absent مع absenceCounts) - dedupe`, و`paid = initialPaid + Σ sessionsCovered`. |
| `balanceCalculator.ts` | `balance = counted - paid` → DUE / IN_PROGRESS / SETTLED / PAID_AHEAD. `cyclePosition` من الـ counted فقط. `needsReminder` = «الحصة الجاية هي رقم 4/8/…» مع استبعاد PaidAhead و DUE. |
| `groupPosition.ts` | موقف المجموعة = أكثر `cyclePosition` تكرار بين الطلاب النشطين (التعادل ← الأعلى)، والباقي `outliers` بأسمائهم. |
| `sessionGenerator.ts` | `GENERATION_HORIZON_DAYS = 14`. يخطط الحصص من slots المجموعات النشطة: ينشئ اللي مفقود، يحدّث time للحصص المستقبلية المجدولة بس، **ما يرجّعش ملغية ولا يلمس الإضافية**. |
| `stats.ts` | `collectedInMonth`, `outstandingNow`, `expectedForMonth`, `attendanceRate`, `incomeByMonth(6)`, `attendanceByGroup`, `topAbsences`, `slowestPayers`, `topGroupsByIncome`. كلها pure. |
| `validation.ts` | تحليل أسماء، وقت `HH:mm`، مدة 15–180، فلوس صحيحة، عدادات، تاريخ، تليفون. بترجع `{ok:true,value}` أو `{ok:false,error}` والـ error key بيتترجم في i18n. |
| `aiSanitize.ts` | `redactPhones` / `redactStrings`: بيشيل أي رقم تليفون من كل اللي بيتبعت لـ Gemini/Groq. الأرقام القصيرة والتواريخ والـ IDs ما بتتلمسش. |

---

## 6) طبقة `data/` — القراءة والكتابة

### 6.1 `firebase/client.ts`

Singleton كسول ( lazy ) لأن `next build` لازم يشتغل من غير env. لو `NEXT_PUBLIC_USE_EMULATORS=1`:
- بيربط Auth بـ `127.0.0.1:9099` و Firestore بـ `8080`
- بيستخدم `memoryLocalCache()` بدل `persistentLocalCache` (عشان الكاش القديم ما يبوظش تجارب الإيموليتر).

في الإنتاج: `persistentLocalCache({tabManager: persistentMultipleTabManager()})` → IndexedDB + مزامنة بين التبويبات.

### 6.2 `firebase/admin.ts`

Server-only. بيعمل `initializeApp` بـ service account من `FIREBASE_SERVICE_ACCOUNT` (base64 JSON). **متعمدًا ما بيستوردش `firebase-admin/auth`** لأنه على Vercel بيحمل `jwks-rsa → jose` بـ `require` CommonJS وبيكسر الـ route (`ERR_REQUIRE_ESM`). بدل كده `verifyTutorToken` بيعمل `await import('jose')` ويتحقق من الـ JWT مقابل Google JWKS (`securetoken@system.gserviceaccount.com`) مع `iss`/`aud` الصح. في الإيموليتر بيDecode الـ payload غير الموقّع فقط.

### 6.3 `TutorDataProvider.tsx`

**مصدر الحقيقة الوحيد في الواجهة.** 6 `onSnapshot` على:

```
users/{uid}                       -> settings
users/{uid}/groups
users/{uid}/students
users/{uid}/sessions
users/{uid}/attendance
users/{uid}/payments
```

بيعمل `markLoaded` / `markCache` لكل source، و`status` (`loading|ready|error`)، و`online` من أحداث `online/offline`. بيحسب `sessionsById` و`balances` بـ `useMemo`، وبيعمل:
- `createDefaults` مرة واحدة لو مستند الإعدادات مش موجود.
- `ensureGenerated` عند ready + focus + visibility + online.
- `reconcileCounters` على كل snapshot → self-heal للعدادات المخزنة.

الشاشات بتقرأ منه عبر `src/data/provider/hooks.ts`: `useTutorData`, `useStudentBalance`, `useGroupStatus`, `useDueStudents`, `useTodaySessions`, `useToday`.

### 6.4 الخدمات (services)

| ملف | مسؤوليته |
|---|---|
| `settingsService` | إنشاء/defaults + تحديث الإعدادات. |
| `groupService` | إنشاء/تعديل/أرشفة مجموعة (يمرّر patch عبر `definedFields` عشان `undefined` ما يبوظش `updateDoc`). |
| `studentService` | إنشاء/تعديل/نقل/أرشفة طالب. |
| `enrollmentService` | يلفّ عمليات الطالب ويستدعي `reconcileStudent` بعدها (العدادات تفضل متسقة). |
| `counterService` | **الكاتب الوحيد** للعدادات المخزنة؛ `persist` / `reconcile` / `reconcileStudent` بـ writeBatch. |
| `sessionGenerator` | `ensureGenerated` مع in-flight guard لكل uid (يمنع تكرار الـ batch مع كذا trigger). |
| `sessionService` | إلغاء حصة (ولو كان لها حضور بيحدّث العدادات في نفس الـ batch)، حصة إضافية، تعديل وقت/ملاحظة، حذف إضافية. |
| `attendanceService` | `saveLesson`: كل حضور + حالة الحصة + العدادات **في batch واحد**، وبيرجّع `newlyDue`. و`setAttendanceStatus` لتعديل حصة محفوظة. |
| `paymentService` | `record/update/remove` — كل واحد بيكتب الدفعة ويعيد حساب عداد الطالب في batch واحد. |
| `devSeedService` | بيانات تجريبية + تبديل غياب + إفساد العدادات (للـ self-heal) + مسح. `/dev` مخفي في الإنتاج. |
| `cleanPatch.ts` | يشيل مفاتيح `undefined` من أي patch قبل `updateDoc`. |

---

## 7) الـ routes (الشاشات)

### `(auth)` — بدون bottom bar
- `sign-in`: إيميل/كلمة سر تسجيل ودخول، mapping لأخطاء Firebase على كلمات عربية من i18n، عرض واضح لو Firebase مش متعداد.
- `onboarding`: خطوتين (مجموعة + طالب) مع تخطي.

### `(app)` — الـ shell
`layout.tsx` فيه AuthGuard + `TutorDataProvider` + `Backdrop` + `OfflineBar` + skeletons + `BottomBar` + More sheet + Floating AI button + PWA prompts.
كل شاشة ليها loading/empty/error.

| Route | الوظيفة |
|---|---|
| `/` (Today) | تحية حسب الوقت + تاريخ Cairo، حصص اليوم مع badge موقف المجموعة، كارت «وصلوا للرابعة»، كارت المستحقات، إجراءات سريعة. |
| `/schedule` | يوم/أسبوع، DateStepper، إلغاء حصة بملاحظة، إضافة حصة إضافية، رسوم بيانية لا — charts في Stats بس. |
| `/attendance/[sessionId]` | جدول الطلاب، اللمسة الواحدة لتغيير حاضر/غايب + vibration، ملاحظة، شريط حفظ ثابت، result sheet بالـ newly-due، تحذير قبل الخروج مع تغييرات مش محفوظة. |
| `/students` | بحث + 4 فلاتر (الكل/عليهم دفعات/مدفوع مقدمًا/مؤرشفين) + CountRing. |
| `/students/[id]` | الرصيد المحسوب لحظيًا، أزرار تليفون/واتساب، تعديل/نقل/أرشفة، سجل الحضور مع رقم الدورة، سجل الدفعات مع تعديل/حذف. |
| `/students/new`, `/students/[id]/edit` | نموذج الطالب + قسم «بيانات سابقة» (`initialCounted`, `initialPaid`) + اختيار المجموعة. |
| `/groups` | شارات الموقف + outliers بالاسم والوضع. |
| `/groups/[id]` | المواعيد، الطلاب، إضافة طالب بالمجموعة محفوظة، تعديل/أرشفة. |
| `/groups/new`, `/groups/[id]/edit` | محرر المواعيد (يوم + وقت + مدة) بإضافة/حذف. |
| `/dues` | إجمالي، قائمة المستحقة مرتبة بالمبلغ then الاسم، «قربوا يستحقوا»، تسجيل دفعة، نسخ رسالة/واتساب. |
| `/stats` | month stepper، 4 بطاقات، chart دخل 6 شهور، chart حضور لكل مجموعة، 3 قوائم (أكتر غياب/أبطأ دفع/أعلى دخل). |
| `/settings` | لغة، غياب يتحسب (تأكيد + reconcile)، عدد حصص الدورة 2–8 (تأكيد + reconcile)، العملة، بداية الأسبوع، الحساب، تنبيه backup. |
| `/dev` | أدوات تجريبية (فقط لو `NODE_ENV !== production`). |
| `/dev/style` | معرض التصميم (ألوان/بطاقات/StatusChips/CountRing). |
| `/offline` | صفحة fallback للـ service worker. |

---

## 8) موديل البيانات في Firestore

كل حاجة تحت `users/{uid}` — القواعد تسمح للمالك فقط:

```
users/{uid}                       { settings, createdAt, updatedAt }
users/{uid}/groups/{groupId}      { name, subject?, slots[], active, createdAt, updatedAt }
users/{uid}/students/{studentId}  { name, phone?, groupId, pricePerSession,
                                    startedAtKey, active, note?,
                                    initialCounted, initialPaid,
                                    sessionsCounted, sessionsPaid, createdAt, updatedAt }
users/{uid}/sessions/{sessionId}  { groupId, groupName, dateKey, time, type, status, note? }
users/{uid}/attendance/{id}       { sessionId, studentId, groupId, dateKey, status }
users/{uid}/payments/{id}         { studentId, dateKey, amount, sessionsCovered, note? }
users/{uid}/meta/aiUsage          { dateKey, count }   <- حد المساعد اليومي
```

**ملاحظات مهمة:**
- `groupId` في مستند الحضور **بيفضل زي ما هو بعد نقل الطالب**، عشان إحصائيات المجموعات التاريخية تفضل صحيحة.
- `sessionsCounted/Paid` مجرد cache للـ AI/التصدير؛ الواجهة بتحسب الرصيد من المستندات المصدرية كل مرة.
- `firestore.rules` تسمح `read, write` لو `request.auth.uid == uid` فقط، والباقي `false`.

---

## 9) محرك العدادات (قلب التطبيق)

```
counted = initialCounted
        + لكل attendance:
            لازم session.status == "completed"
            و session.dateKey >= student.startedAtKey
            و (present OR (absent AND absenceCounts))
            + dedupe على (sessionId::studentId)
paid    = initialPaid + كل payment.sessionsCovered
balance = counted - paid
cyclePosition = counted == 0 ? 0 : ((counted-1) % L) + 1
```

- `L = settings.cycleLength` (افتراضي 4).
- `balance >= L` → `DUE` و`amountDue = floor(balance/L) × L × price`.
- `balance < 0` → `PAID_AHEAD`.
- عند حفظ حصة بيتم تحديث الـ cache **في نفس الـ batch**، وعند أي قراءة بيتم reconcile تاني (self-heal).

---

## 10) توليد الحصص

- الأفق: من النهاردة **14 يوم** (شامل النهاردة).
- لكل مجموعة نشطة ولكل slot: لو `weekday` اليوم مطابق → ID = `groupId_yyyyMMdd`.
- موجود؟ ما نعملش حاجة (حتى لو ملغية — لا نبعثها تاني).
- موجود ومجدول ومستقبلي ووقته اتغير؟ نحدّث `time` بس.
- الإضافية `_2`, `_3`... المولّد ما بيلمسهاش أبدًا.
- مُحفّزات: provider ready / focus / visibility / online / حفظ مجموعة.

---

## 11) الحضور والدفعات — ليه batch واحد؟

عشان الموبايل يكتب offline ويقفل التاب والمزامنة تحصل مرة واحدة. لو عملنا Transaction كان هيحتاج نت ومكناش بنضمن الحفظ.

- `saveLesson`: attendance docs + session `completed` + student counters → **writeBatch واحد**، وبرجّع `newlyDue` عشان الـ result sheet تعرض «ن طالب وصلوا للدفعة».
- `setAttendanceStatus`: تعديل حصة محفوظة (غاب بدل حاضر مثلًا) →حديث row واحد + إعادة حساب.
- إلغاء حصة ليها حضور → العداداتustral ترجع لوراء في نفس الـ batch.
- الدفعات: `record/update/remove` كل واحد batch مع عداد الطالب. التسجيل بيعرض معاينة حيّة للرصيد الجديد، وتحذير غيرمانع لو المبلغ مش مساوي `sessionsCovered × price`.

---

## 12) المساعد الذكي (AI)

### الـ route: `POST /api/ai/assistant`
- `runtime = nodejs`, `maxDuration = 300`, `dynamic = force-dynamic`.
- التوكن بيتحقق بـ `jose` (مش `firebase-admin/auth` — انظر §6.2).
- Body بـ zod: `text <= 1000` أو `audio <= 2MB` + `locale` + `clientToday`.
- حد يومي لكل uid في `meta/aiUsage`، افتراضي 100.
- **Provider ladder**: `gemini-3.5-flash-lite` (الأساسي الأسرع) → `gemini-3.5-flash` → Groq (`openai/gpt-oss-120b`) لو `GROQ_API_KEY` موجود.
- الحالة (`loadState`) بيتقرأ **مرة واحدة** ويتبع لكل الأدوات → توفير 10–30 ثانية.
- `GET /api/ai/assistant` endpoint للفحص: بيرجع booleans للمفاتيح + حالة Firestore (بدون أي سر).

### الأدوات (11)
**قراءة فقط (7):** `get_dues`, `get_almost_due`, `get_absences`, `get_income`, `get_group_status`, `get_student_summary`, `get_today_overview`.
**اقتراحات (4، ما بيكتبوش حاجة):** `propose_attendance`, `propose_payment`, `propose_cancel_session`, `draft_parent_reminder`.

### في الواجهة `AiSheet`
اقتراحات جاهزة، إدخال نص، ميكروفون (`SpeechRecognition ar-EG` أولًا، أو MediaRecorder → base64)، typing indicator، بطاقة اقتراح بـ **تنفيذ/تعديل/إلغاء**. التنفيذ بيستدعي الـ repository العادي وبعدين result sheet زي اليدوي. حالة offline / 401 / 429 / model error كل واحدة ليها رسالة هادية في i18n.

**مهم:** مفيش أداة لإضافة طالب — لو طلبت «ضيف طالب» هيحصلك رد إنه مش متاح. الإضافة تتم من شاشة الطلاب فيها validation.

### الخصوصية
أرقام التليفونات بتت.shiel من كل tool result قبل ما تتبعت للموديل. اللوجات فيها بس أسماء الأخطاء، مش بيانات الطلاب.

---

## 13) PWA

- `manifest.ts`: اسم عربي، `display: standalone`, `theme/background #F3EDE3`, أيقونات 192/512 + maskable في `public/icons/`.
- `layout.tsx` فيه metadata للـ manifest و apple-touch-icon و viewport-fit=cover.
- `src/app/sw.ts` + `@serwist/next` → `public/sw.js` (اتولد في الـ build، مش متCommit).
  - Precache لشل التطبيق وصفحة `/offline`.
  - `NetworkOnly` لـ `/api/*` وكل نطاقات Firebase/Google.
  - cross-origin باقي الحاجات NetworkFirst.
- `PwaPrompts`: install sheet بعد أول حصة محفوظة (مش أول زيارة) + toast «نسخة جديدة» عند تحديث الـ build.
- `npm run build` لازم يكون `--webpack` لأن @serwist/next مش بيشتغل مع Turbopack.
- أيقونات `public/icons/*.png` اتولدت بـ PIL، مش generated image.

---

## 14) الاختبارات

| النوع | العدد | بيفحص إيه |
|---|---|---|
| `test/domain/*` | ~65 | التاريخ، IDs، الفلوس، العدادات، الرصيد، المجموعات، الحصص، الإحصائيات، validation، سيناريوهات الفلوس، خصوصية الـ AI |
| `test/ai/*` | ~5 | zod schema للطلب/الرد + redaction التليفونات |
| `test/emulator/rules.test.ts` | 4 | المالك يقرأ/يكتب، مالك تاني ممنوع، مجهول ممنوع |
| `test/integration/*` | 16 | CRUD، توليد الحصص، الحضور والعدادات، الدفعات، وroute الـ AI بموديل وهمي |

`npm run test:emulator` بيشغّل الإيموليترات تلقائيًا. محتاج JDK 21+ (משום firebase-tools يرفض Java 17).

---

## 15) النشر والتشغيل

1. Firebase: Firestore API مفعّل + database في `me-central1` + Auth Email/Password + authorized domain للـ Vercel + rules/indexes منشورة.
2. Vercel env (Production):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / MESSAGING_SENDER_ID / APP_ID
   NEXT_PUBLIC_USE_EMULATORS=0
   FIREBASE_SERVICE_ACCOUNT=<base64 سطر واحد>
   GEMINI_API_KEY / GEMINI_MODEL=gemini-3.5-flash-lite
   AI_DAILY_LIMIT=100 / AI_ENABLED=true
   GROQ_API_KEY? / GROQ_MODEL=openai/gpt-oss-120b
   ```
3. `vercel --prod` (أو Push لـ GitHub والـ Vercel يعمل Deploy تلقائي).
4. `GET /api/ai/assistant` المفروض يرجع 200 مع `geminiKey:true, serviceAccount:true, firestore:"ok"`.

---

## 16) متغيرات البيئة (ملخص)

| المتغير | منين | ليه |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project settings → Web app | عميل Firebase |
| `NEXT_PUBLIC_USE_EMULATORS` | يدوي | 1 = إيموليتر + memory cache |
| `FIREBASE_SERVICE_ACCOUNT` | Service accounts → Generate key → base64 | Admin SDK على السيرفر |
| `GEMINI_API_KEY` | Google AI Studio | الموديل الأساسي |
| `GEMINI_MODEL` | ثابت | `gemini-3.5-flash-lite` |
| `AI_DAILY_LIMIT` / `AI_ENABLED` | ثابت | حد/مفتاح المساعد |
| `GROQ_API_KEY` / `GROQ_MODEL` | console.groq.com/keys | fallback اختياري |

---

## 17) اللي لسه مستني / حدود معروفة

- **Spike A** (offline على تليفون حقيقي) و**Spike B** (audio MIME على Android/iOS) لسه التقارير لازم تتكتب في `docs/spikes.md`.
- **Real-week trial** 7 أيام قبل وضع `v1.0`.
- تصدير JSON كامل للبيانات مؤجل لـ v1.1.
- مفيش Google sign-in في v1 — Email/Password بس.
- المساعد مش بيضيف طلاب (انظر §12).
- المجاني بتاع Gemini بيعستخدم الرسائل لتحسين المنتجات — البيانات المبعتة أسماء ومبالغ فقط، التليفونات متشالة.
- Free tier limits بتتغير؛ لو كتير من الأسئلة، اربط billing أو استخدم Groq.

---

## 18) استكشاف الأخطاء الشائعة

| العَرَض | السبب | الحل |
|---|---|---|
| `API_KEY_INVALID` في المتصفح فقط | `NEXT_PUBLIC_*` اتحفظ في build قديم | غيّر env + **Redeploy** |
| `500` من `/api/ai/assistant` | كان `firebase-admin/auth` → `jwks-rsa/jose` | اتصلح بـ `jose` dynamic import |
| `504 FUNCTION_INVOCATION_TIMEOUT` | maxDuration كان 60 | رفعناه لـ 300 |
| `CONFIGURATION_NOT_FOUND` | Auth مش متفعّل في المشروع | Firebase Console → Authentication → Get started + Email/Password |
| `PERMISSION_DENIED` من Firestore | الـ API مفعّل بس الـ database مش موجودة | Firestore Database → Create database |
| عدادات غلط بعد تعديل قديم | cache قديم | `/dev` → Recompute (أو reconcile تلقائي على snapshot) |
| خطأ `undefined` في `updateDoc` | patch فيه `undefined` | `definedFields()` في `cleanPatch.ts` |

---

## 19) خريطة ملفات سريعة

| الملف | وظيفته في سطر |
|---|---|
| `src/app/layout.tsx` | Cairo font + I18n + AiConfig + Auth + PwaPrompts |
| `src/app/globals.css` | tokens اللون (beige/sage) + `.glass-card` + safe-area + reduced-motion |
| `src/app/manifest.ts` | PWA manifest |
| `src/app/sw.ts` | Serwist worker |
| `src/i18n/ar.ts` | مصدر كل كلمة عربية |
| `src/i18n/en.ts` | ترجمة إجبارية بنفس الشكل (TS يرفض أي key ناقص) |
| `src/data/paths.ts` | كل مسارات Firestore |
| `src/data/mappers.ts` | Timestamp → ms وتحويل docs لأنواع domain |
| `src/data/ai/tools.ts` | الأدوات + تنفيذها على state محمّل |
| `src/data/ai/providers.ts` | Gemini و Groq runners |
| `src/data/ai/schema.ts` | zod + parse الرد |
| `src/components/ui/*` | مكتبة القطع المشتركة |
| `src/components/features/*` | النماذج والبطاقات والمساعد |
| `firebase.json` / `firestore.rules` / `firestore.indexes.json` | إعداداتFirestore والصلاحيات |
| `vitest.config.mts` / `vitest.emulator.mts` | اختبارات الوحدة / الإيموليتر |
| `docs/release-checklist.md` | خطوات النشر والتجربة الحقيقية |
| `docs/spikes.md` | فحص الـ offline والصوت |
| `docs/manual-tests.md` | قوائم الفحص اليدوي لكل stage |
| `docs/versions.md` | الإصدارات المثبّتة وملاحظاتها |

---

**الخلاصة:** الواجهة بتقرأ من provider واحد، والكتابة كلها services بـ batch، والمنطق كله pure في `domain/`، والذكاء الاصطناعي مقفول بعدد أدوات معروف ومش بيكتب من غير تأكيد. لو غيّرت حاجة في مكان، غالبًا فيه test أو type بيقولك.
