# Expense Tracker (Android-first)

A personal expense tracking app for your phone. You log what you spend each day (amount, category, date), and at the end of every month the app gives you a summary with a **pie chart** (where the money went) and a **bar chart** (how spending moved over time), plus a reminder to review and close the month.

This README is the planning document. It answers the original questions, says which parts of the idea needed adjusting, and sets out a roadmap. Work through it as you build.

---

## Table of contents

1. [Short answers](#1-short-answers)
2. [Mobile app or web app?](#2-mobile-app-or-web-app)
3. [Recommended tech stack](#3-recommended-tech-stack)
4. [SQLite on the phone or MySQL over the internet?](#4-sqlite-on-the-phone-or-mysql-over-the-internet)
5. [Parts of the idea to rethink](#5-parts-of-the-idea-to-rethink)
6. [Features: MVP and later](#6-features-mvp-and-later)
7. [Data model (SQLite schema)](#7-data-model-sqlite-schema)
8. [How the month-end report and notification work](#8-how-the-month-end-report-and-notification-work)
9. [Charts](#9-charts)
10. [Project structure](#10-project-structure)
11. [Getting started](#11-getting-started)
12. [Roadmap](#12-roadmap)
13. [Things you might have missed](#13-things-you-might-have-missed)
14. [Learning resources](#14-learning-resources)

---

## 1. Short answers

| Question | Answer |
|---|---|
| Phone app or website? | A **real mobile app**, and you're right that people don't like visiting a website for something they use every day. |
| Which technology? | **React Native with Expo, in TypeScript.** You already know JavaScript from Node, it builds for Android now and iOS later from the same code, and Expo removes most of the native Android setup. |
| SQLite or MySQL? | **SQLite on the device.** Storage size won't be a problem (see the numbers in section 4). Add **backup/export** early, and add cloud sync later only if you need it. |
| Automatic monthly charts? | Yes, with one change to how it works: the charts are **calculated live from the data** whenever you open them, rather than generated once at month end. A **scheduled local notification** on the 1st of each month tells you that last month's summary is ready to review and close. |
| What did I miss? | Backups, money stored as integers, budgets, recurring expenses, a daily reminder to log, CSV export, editing and deleting entries, and an app lock. All covered below. |

---

## 2. Mobile app or web app?

There are three realistic options:

| Option | Pros | Cons |
|---|---|---|
| **Website** (PHP/Node + MySQL) | Uses your existing skills; nothing to install | People forget to open it; needs internet; weak notifications; feels clunky for 5-second daily entries |
| **PWA** (Progressive Web App: a website that can be "installed" to the home screen) | One codebase; installable icon; works offline; Android supports push | Scheduled reminders such as "1st of the month" need a server to send push; offline storage is less robust; harder to get into the Play Store; iOS support is weaker |
| **Native / cross-platform app** ✅ | Home screen icon, fast entry, works fully offline, reliable **local scheduled notifications**, Play Store, home screen widgets later | You have to learn a mobile framework |

**Recommendation: build a real app with React Native + Expo.** An expense tracker only works if logging is quick and habitual. A one-tap app icon and a reminder notification are what keep people logging, and both are much easier in a real app.

> If you ever want a web dashboard as well (for example, to view charts on a laptop), you can add one later on top of a sync backend (section 4). Your PHP/Node skills fit that part well.

---

## 3. Recommended tech stack

### Why React Native + Expo

- **Language:** TypeScript/JavaScript, which you already use with Node.
- **Android now, iOS later**, from the same codebase.
- **Expo** handles builds, native modules, and over-the-air updates, so you rarely have to open Android Studio.
- A large ecosystem with libraries for everything this app needs.

### Alternatives considered

| Option | Verdict |
|---|---|
| **Flutter** (Dart) | Excellent, with great built-in charts and UI. But it's a new language for you. A solid second choice. |
| **Kotlin + Jetpack Compose** (native Android) | The best Android experience, but Android-only, and you'd be learning a new language and toolchain. |
| **Ionic / Capacitor** | A web app wrapped as a mobile app. Fine, but React Native feels more native for about the same effort. |

### Libraries

| Need | Library |
|---|---|
| Framework | `expo` (latest SDK) + **TypeScript** |
| Navigation / screens | `expo-router` (file-based routing, similar to Next.js) |
| Local database | `expo-sqlite` |
| ORM / query builder (optional but nice) | `drizzle-orm` (has an Expo SQLite driver and migrations) |
| Charts | `react-native-gifted-charts` (simple pie and bar charts) or `victory-native` (more powerful) |
| Notifications | `expo-notifications` (local scheduled notifications, no server needed) |
| Dates | `date-fns` |
| App state | `zustand` (small and simple) or React Context |
| Forms | `react-hook-form` + `zod` for validation |
| Export / backup | `expo-file-system` + `expo-sharing` (CSV/JSON export to Drive, email, etc.) |
| PDF report (later) | `expo-print` |
| App lock (later) | `expo-local-authentication` (fingerprint/face) |
| Builds / publishing | **EAS Build** (`eas-cli`) |

---

## 4. SQLite on the phone or MySQL over the internet?

### Storage size is not a problem

A rough worst case:

- One expense row (id, amount, category, date, note, timestamps) is about **100–200 bytes**.
- At **20 expenses a day** (most people log 3–8): 20 × 365 = **7,300 rows a year**.
- 7,300 × 200 bytes ≈ **1.5 MB a year**.

**Ten years of heavy use is about 15 MB, smaller than a few photos.** SQLite handles databases of many gigabytes without trouble. Storage space is not a reason to move to a server.

### Comparison

| | **SQLite (on device)** ✅ | **MySQL on a server** |
|---|---|---|
| Works offline | ✅ Always | ❌ Needs internet, or you write offline caching and sync |
| Speed | Instant | Network latency |
| Cost | Free | Hosting, domain, SSL, maintenance |
| Privacy | Data never leaves the phone | You hold users' financial data, which brings GDPR obligations in Europe |
| Effort | Low | You also build an API, authentication, password reset, security… |
| Multiple devices / sharing with partner | ❌ | ✅ |
| Survives losing the phone | ❌ unless you add backup | ✅ |

### Recommendation: local-first

1. **v1:** SQLite on the device, plus **export/backup** (CSV and JSON file you can save to Google Drive or email). This covers the main risk, which is losing the phone and the data with it.
2. **Later, only if needed:** add **cloud sync**. Keep SQLite as the main database on the phone and sync to a backend in the background. That backend can be **Node (or PHP/Laravel) + MySQL/PostgreSQL**, which is your strength. Hosted options such as Supabase or Firebase work too.

To make later sync easier, design for it now:
- Use **UUIDs** as primary keys, not auto-increment integers, so records created on different devices never clash.
- Store `created_at`, `updated_at`, and `deleted_at` (soft delete) on every row.

---

## 5. Parts of the idea to rethink

Most of your idea is sound. These parts need adjusting:

1. **"Generate the charts automatically at the end of the month."**
   You don't need to generate and store charts. A chart is just a query (`SUM(amount) GROUP BY category WHERE month = ?`) drawn on screen. Calculate it **whenever the user opens the month view**. It's instant on this amount of data, it's always correct (even if you edit an old expense), and you can view *any* month, including the current one so far.
   Android also restricts apps running in the background, so "run a job at midnight on the 31st" is unreliable. A **scheduled notification** is reliable.

2. **"Close down the account for October."**
   "Account" usually means a bank account or user login, so call this **"Close the month"** or **"Monthly review"** instead. It should be optional:
   - The notification on the 1st says: *"October is over. You spent €1,240. Tap to review."*
   - The review screen shows the charts, totals, and a comparison with the previous month.
   - Tapping **"Close October"** marks it reviewed. Optionally, it **locks** the month so you can't edit it by accident, with an "unlock" option in case you forgot a receipt.
   - Expenses still have to be allowed **for past dates**, because people forget to log.

3. **"Bar chart and pie chart."** Both are good, but use each for a different purpose (section 9):
   - **Pie/donut:** share of spending per category *within* one month.
   - **Bar:** spending per **day** (or week) within the month, and spending per **month** across the last 6–12 months.

4. **Money and decimals.** Never store money as a float (`0.1 + 0.2 !== 0.3`). Store **cents as an integer** (`6500` = €65.00) and format only for display. This is the classic mistake in finance apps.

---

## 6. Features: MVP and later

### MVP (version 1): build this first

- [ ] **Add expense**: amount, category, date (defaults to today), optional note. Should take under 5 seconds.
- [ ] **Categories**: a default set (Groceries, Fuel/Car, Transport, Rent, Utilities, Eating out, Health, Shopping, Entertainment, Subscriptions, Other), each with an icon and colour. The user can add, rename, or hide categories.
- [ ] **Expense list**: grouped by day, with daily totals, for the current month by default.
- [ ] **Edit and delete** an expense (with an undo snackbar).
- [ ] **Month summary**: total, pie chart by category, bar chart by day, and the top categories.
- [ ] **Switch month**: arrows to go to previous and next months.
- [ ] **Month-end notification** (1st of each month) linking to the review screen.
- [ ] **Close/review month** flow.
- [ ] **Export to CSV** (and JSON backup) using the share sheet.
- [ ] **Settings**: currency (EUR default), first day of the week, notification time.

### Version 2

- [ ] **Monthly budgets** per category and overall, with progress bars and a warning at 80% and 100%. This feature changes spending behaviour the most.
- [ ] **Recurring expenses**: rent, Netflix, insurance. Auto-added each month, or as "pending" items to confirm.
- [ ] **Daily reminder** ("Did you log today's spending?") at a time the user chooses.
- [ ] **Month-over-month comparison**: "You spent 18% less on groceries than in September."
- [ ] **Search and filters**: by category, amount range, date range, or note text.
- [ ] **Restore from backup**: import the JSON file.
- [ ] **Payment method**: cash, card, bank transfer.
- [ ] **Dark mode.**
- [ ] **App lock** with fingerprint or PIN, since financial data is personal.

### Version 3 / ideas

- [ ] **Income tracking**, giving "income − expenses = savings this month".
- [ ] **Cloud sync and multiple devices** (section 4).
- [ ] **Shared budget** with a partner or household.
- [ ] **Receipt photo** attached to an expense (`expo-image-picker`).
- [ ] **Home screen widget** for adding an expense in one tap.
- [ ] **PDF monthly report** you can save or email.
- [ ] **Multi-currency** for travel, with the exchange rate stored per expense.
- [ ] **Tags**, e.g. "#holiday-spain" spanning several categories.
- [ ] **Yearly overview.**
- [ ] **iOS release.**

> **Keep the MVP small.** Ship v1, use it yourself for one full month, then decide what to build next based on what annoyed you.

---

## 7. Data model (SQLite schema)

```sql
-- Categories (seeded with defaults on first launch)
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,            -- UUID
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,               -- e.g. 'car', 'cart'
  color       TEXT NOT NULL,               -- e.g. '#4C9AFF'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,  -- hide instead of delete (old expenses still reference it)
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Expenses
CREATE TABLE expenses (
  id           TEXT PRIMARY KEY,           -- UUID
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),  -- 6500 = €65.00
  currency     TEXT NOT NULL DEFAULT 'EUR',
  category_id  TEXT NOT NULL REFERENCES categories(id),
  spent_on     TEXT NOT NULL,              -- 'YYYY-MM-DD' (local date, no time zone issues)
  note         TEXT,
  created_at   TEXT NOT NULL,              -- ISO 8601 timestamp
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT                        -- soft delete (helps undo and future sync)
);
CREATE INDEX idx_expenses_spent_on ON expenses(spent_on);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- Month closing / review
CREATE TABLE month_closures (
  month        TEXT PRIMARY KEY,           -- 'YYYY-MM'
  closed_at    TEXT NOT NULL,
  total_cents  INTEGER NOT NULL,           -- snapshot at close time (handy for quick history)
  is_locked    INTEGER NOT NULL DEFAULT 1
);

-- v2: budgets
CREATE TABLE budgets (
  id           TEXT PRIMARY KEY,
  category_id  TEXT REFERENCES categories(id),  -- NULL = overall monthly budget
  amount_cents INTEGER NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- v2: recurring expenses
CREATE TABLE recurring_expenses (
  id            TEXT PRIMARY KEY,
  amount_cents  INTEGER NOT NULL,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  note          TEXT,
  day_of_month  INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  last_applied  TEXT,                       -- 'YYYY-MM' last month it was added
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Key/value settings
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Key queries

```sql
-- Pie chart: total per category for a month
SELECT c.name, c.color, SUM(e.amount_cents) AS total
FROM expenses e
JOIN categories c ON c.id = e.category_id
WHERE e.deleted_at IS NULL
  AND e.spent_on >= '2026-10-01' AND e.spent_on < '2026-11-01'
GROUP BY c.id
ORDER BY total DESC;

-- Bar chart: total per day in a month
SELECT e.spent_on AS day, SUM(e.amount_cents) AS total
FROM expenses e
WHERE e.deleted_at IS NULL
  AND e.spent_on >= '2026-10-01' AND e.spent_on < '2026-11-01'
GROUP BY e.spent_on
ORDER BY e.spent_on;

-- Bar chart: last 12 months
SELECT substr(spent_on, 1, 7) AS month, SUM(amount_cents) AS total
FROM expenses
WHERE deleted_at IS NULL AND spent_on >= date('now', 'start of month', '-11 months')
GROUP BY month
ORDER BY month;
```

> **Dates:** store the expense date as a plain `YYYY-MM-DD` string in the user's local time. If you store a UTC timestamp, an expense logged at 23:30 can land on the wrong day or even the wrong month.

---

## 8. How the month-end report and notification work

```
App first launch / every app open
        │
        ▼
Schedule (or re-schedule) a LOCAL notification:
  "1st of next month, 09:00 → 'October summary is ready'"
        │                       (no server; Android delivers it)
        ▼
User taps notification ──► opens /review/2026-10 screen
        │
        ▼
Screen queries SQLite live → pie chart + bar chart + totals + vs. last month
        │
        ▼
User taps "Close October" → row in month_closures (optionally locks edits)
```

Implementation notes:
- Use `expo-notifications`, either with a **monthly calendar trigger** (day 1, 09:00, repeats) or by scheduling the next single notification each time the app opens.
- Android 13+ requires you to **ask for notification permission** at runtime. Ask at a sensible moment, such as after the first expense is added, not on first launch.
- When the app opens and the previous month has no row in `month_closures`, show a banner such as "October isn't reviewed yet." This acts as a fallback if the notification was dismissed.
- Fill notification text with real data where possible, e.g. "You spent €1,240 in October". Rescheduling the notification when the app opens lets you update that text.

---

## 9. Charts

| Chart | Question it answers | Notes |
|---|---|---|
| **Donut/pie by category** (one month) | "Where did my money go?" | Show the **top 5–6 categories** and group the rest as "Other". A pie with 12 slivers is hard to read. Put the total in the middle of the donut. |
| **Bar per day** (one month) | "When did I spend?" | Shows big days at a glance (rent day, weekend shopping). |
| **Bar per month** (last 6–12 months) | "Am I spending more or less over time?" | Probably the most useful long-term chart. |
| **Budget progress bars** (v2) | "How much do I have left?" | One horizontal bar per budgeted category. |

Always show the **numbers next to the chart** (a list of category, amount, and %). Charts are for a quick look; people need the numbers to act on.

---

## 10. Project structure

```
expense-tracker/
├── app/                        # expo-router screens
│   ├── _layout.tsx             # root layout, DB init, notification setup
│   ├── (tabs)/
│   │   ├── index.tsx           # Home: this month's list + total + quick add button
│   │   ├── summary.tsx         # Charts for selected month
│   │   └── settings.tsx
│   ├── expense/new.tsx         # Add expense
│   ├── expense/[id].tsx        # Edit expense
│   ├── review/[month].tsx      # Month-end review + "Close month"
│   └── categories.tsx          # Manage categories
├── src/
│   ├── db/
│   │   ├── client.ts           # open SQLite connection
│   │   ├── schema.ts           # drizzle schema (or raw SQL)
│   │   ├── migrations/         # versioned migrations, needed when you change tables later
│   │   └── seed.ts             # default categories
│   ├── repositories/           # expenses.ts, categories.ts, reports.ts (all SQL lives here)
│   ├── services/
│   │   ├── notifications.ts
│   │   └── export.ts           # CSV / JSON backup
│   ├── components/             # AmountInput, CategoryPicker, PieChart, BarChart…
│   ├── utils/money.ts          # cents <-> "€65.00" formatting (Intl.NumberFormat)
│   └── utils/dates.ts
├── app.json
├── package.json
└── README.md
```

Your backend experience applies directly: treat `repositories/` like a service/DAO layer, keep SQL out of the screens, and write **migrations** from day one. Once real data is on your phone, you can't just drop the table.

---

## 11. Getting started

Prerequisites: Node.js LTS, and an Android phone with the **Expo Go** app installed (or Android Studio with an emulator).

```bash
# 1. Create the project (TypeScript + expo-router template)
npx create-expo-app@latest expense-tracker
cd expense-tracker

# 2. Add core libraries
npx expo install expo-sqlite expo-notifications expo-file-system expo-sharing
npm install date-fns zustand drizzle-orm react-native-gifted-charts
npx expo install react-native-svg          # needed by the chart library
npm install -D drizzle-kit

# 3. Run it
npx expo start
# scan the QR code with Expo Go on your Android phone
```

To get an installable APK for your own phone:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview    # produces an .apk you can install directly
```

To publish on the **Google Play Store**: a developer account costs a one-time **$25**. New personal accounts must run a **closed test with a group of testers for a period of time** before a production release, so plan for that (check Google's current requirements when you get there).

---

## 12. Roadmap

| Phase | Goal | Done when |
|---|---|---|
| **0. Learn** (≈1 week) | Expo + React Native basics, expo-router, one SQLite read/write | A "hello world" list from SQLite on your phone |
| **1. Core logging** | Add, list, edit, and delete expenses; categories; month switcher | You can log a real day's spending |
| **2. Reports** | Summary screen with pie chart, daily bar chart, and totals | You can see the current month's charts |
| **3. Month close** | Notification on the 1st, review screen, close/lock month | You get a notification and can close a test month |
| **4. Safety** | CSV/JSON export, backup restore, migrations in place | You can wipe the app and restore your data |
| **5. Use it for a month** | Dogfood: use it yourself every day | Write down everything that annoyed you |
| **6. v2 features** | Budgets, recurring expenses, daily reminder, comparisons | — |
| **7. Release** | App icon, splash screen, privacy policy, Play Store listing | Live on Play Store (or shared APK) |
| **8. Optional sync** | Node/PHP API + MySQL/Postgres, login, background sync | Same data on two devices |

---

## 13. Things you might have missed

- **Backups.** With local-only storage, a lost or reset phone means all data is gone. Export/backup belongs in the MVP. Android's auto-backup may also cover the app's data; check and configure it.
- **Money as integers (cents).** See section 5.
- **Local dates, not UTC.** See section 7.
- **Database migrations.** You *will* change the schema later. Version it from day one.
- **Fast entry UX.** Open the numeric keypad automatically, preselect the last used category, default the date to today. If adding an expense takes more than about 5 seconds, people stop logging.
- **Late entries.** People forget, so make it easy to pick yesterday or another past date.
- **Deleting a category.** Archive it instead, because old expenses still point to it.
- **Currency formatting.** Use `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })` (or the user's locale) so the result is `65,00 €` or `€65.00` as appropriate.
- **Privacy.** The Play Store requires a privacy policy and a Data Safety form even for offline apps. "All data stays on your device" is a strong and simple selling point.
- **Notification permission** on Android 13+ (see section 8).
- **Testing.** Unit-test `money.ts`, `dates.ts`, and the report queries, because those are where the bugs that matter will be. Use Jest, which comes with Expo.
- **Empty states.** Decide what the charts show when a month has no expenses.
- **Accessibility.** Don't rely on colour alone in charts; show labels and percentages too.

---

## 14. Learning resources

- Expo docs: https://docs.expo.dev
- Expo Router: https://docs.expo.dev/router/introduction/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Drizzle ORM with Expo SQLite: https://orm.drizzle.team/docs/get-started/expo-new
- React Native Gifted Charts: https://gifted-charts.web.app
- EAS Build: https://docs.expo.dev/build/introduction/
- React Native basics (if you are new to React): https://reactnative.dev/docs/getting-started

---

*Next step: complete Phase 0, then come back and we can scaffold the project, database layer, and first screens together.*
