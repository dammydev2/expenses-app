# Expense Tracker

An offline-first mobile app for logging daily spending and reviewing it month by month. Built with React Native (Expo) and SQLite. Android is the first target; iOS can follow from the same codebase.

> **Status:** Phase 1 complete: database, migrations, and add/list/edit/delete expenses with month navigation. Next: Phase 2 (charts). See [Roadmap](#roadmap).
> For *why* the project uses this stack and design, see [`decision.md`](decision.md).

---

## Contents

- [What the app does](#what-the-app-does)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Reports and charts](#reports-and-charts)
- [Month close and notifications](#month-close-and-notifications)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Building and releasing](#building-and-releasing)
- [Conventions](#conventions)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## What the app does

1. **Log an expense in a few seconds:** amount, category, date (defaults to today), optional note.
   *Example: €65.00 · Fuel/Car · 23 Nov 2026*
2. **Browse expenses** for any month, grouped by day with daily and monthly totals.
3. **See where the money went** with a category pie/donut chart, a bar chart of spending per day, and a bar chart comparing recent months.
4. **Review and close each month.** On the 1st of each month a local notification says, for example, *"October is over: you spent €1,240. Tap to review."* The review screen shows the charts and totals, and **Close month** marks the month as reviewed and optionally locks it.
5. **Keep data safe** by exporting to CSV (for spreadsheets) or JSON (a full backup that can be restored).

All data is stored **on the device** in SQLite. There is no account, no server, and no internet requirement.

---

## Features

### v1: MVP

| Feature | Description |
|---|---|
| Add expense | Numeric keypad opens automatically; last used category preselected; date defaults to today, and past dates are allowed |
| Edit / delete | Tap an expense to edit it; deleting shows an undo snackbar (soft delete) |
| Categories | Default set seeded on first launch (Groceries, Fuel/Car, Transport, Rent, Utilities, Eating out, Health, Shopping, Entertainment, Subscriptions, Other), each with an icon and colour. Categories can be added, renamed, reordered and archived |
| Monthly list | Current month by default, grouped by day with totals; previous/next month navigation |
| Monthly summary | Total spent, donut chart by category, bar chart by day, ranked category list with amounts and percentages |
| Month-end notification | Local notification on the 1st of each month, linking to that month's review |
| Close month | Marks a month as reviewed, stores a total snapshot, and optionally locks edits (can be unlocked) |
| Export | CSV and JSON export through the Android share sheet (Drive, email, files…) |
| Settings | Currency (EUR by default), locale formatting, notification time, first day of week |

### v2

- Monthly **budgets** per category and overall, with progress bars and warnings at 80% and 100%
- **Recurring expenses** (rent, subscriptions) added automatically or as pending items to confirm
- **Daily reminder** to log spending
- **Month-over-month comparison** ("Groceries −18% vs September")
- **Search and filters** by category, amount, date range or note
- **Restore** from a JSON backup
- Payment method (cash / card / transfer)
- Dark mode, and an app lock using fingerprint or PIN

### v3 / later

Income tracking and savings, cloud sync across devices, shared household budgets, receipt photos, a home screen widget, PDF monthly report, multi-currency, tags, a yearly overview, and an iOS release.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | [Expo](https://docs.expo.dev) SDK 58 · React Native 0.88 · React 19 |
| Language | TypeScript |
| Navigation | [expo-router](https://docs.expo.dev/router/introduction/) (file-based routes in `src/app/`) |
| Database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/), with plain SQL in repositories |
| Migrations | Hand-written, versioned with `PRAGMA user_version` (`src/db/migrations.ts`) |
| IDs | `expo-crypto` `randomUUID()` |
| Date picker | `@react-native-community/datetimepicker` |
| Icons | `@expo/vector-icons` (MaterialCommunityIcons) |
| Tests | Jest (`jest-expo`); repository tests use Node's built-in `node:sqlite` in memory |
| Charts | [react-native-gifted-charts](https://gifted-charts.web.app) + react-native-svg *(to be added)* |
| Notifications | [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) (local, scheduled) *(to be added)* |
| Dates | Small local helpers in `src/utils/dates.ts` (no library needed so far) |
| State | React state + a tiny `useSyncExternalStore` store; Zustand if it grows |
| Forms / validation | react-hook-form + zod *(to be added)* |
| Export | expo-file-system + expo-sharing *(to be added)* |
| Builds | EAS Build |

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Screens (src/app/*)          expo-router routes            │
│    └─ use hooks / stores, render components                 │
├────────────────────────────────────────────────────────────┤
│  Components (src/components/*)  AmountInput, CategoryPicker,│
│                                 DonutChart, DailyBarChart…  │
├────────────────────────────────────────────────────────────┤
│  State (src/stores/*)          small shared UI state        │
│                                (e.g. undo-delete snackbar)  │
├────────────────────────────────────────────────────────────┤
│  Services (src/services/*)     notifications, export/backup,│
│                                month close, recurring       │
├────────────────────────────────────────────────────────────┤
│  Repositories (src/db/repos/*) ALL SQL lives here:          │
│                                expenses, categories,        │
│                                reports, months, settings    │
├────────────────────────────────────────────────────────────┤
│  SQLite (expo-sqlite, plain SQL) + versioned migrations     │
└────────────────────────────────────────────────────────────┘
```

Design principles:

- **Local-first.** SQLite on the device is the only data store. Sync is a future, optional layer and must not change the core model.
- **Screens never run SQL.** Data access goes through repositories, the same idea as a service/DAO layer in a PHP or Node backend.
- **Reports are computed, not stored.** Charts are built from aggregate queries each time a month is viewed, so they always reflect edits.
- **Sync-ready from day one.** Every table uses UUID primary keys, `created_at`, `updated_at`, and `deleted_at` (soft delete).

---

## Data model

```
categories ─┐
            │ 1..*
            ▼
         expenses            month_closures       settings
                             (one row per         (key/value)
budgets ──► categories        closed month)
recurring_expenses ──► categories
```

| Table | Purpose | Key columns |
|---|---|---|
| `categories` | Spending categories | `id` (UUID), `name`, `icon`, `color`, `sort_order`, `is_archived` |
| `expenses` | One row per expense | `id`, `amount_cents` (INTEGER), `currency`, `category_id`, `spent_on` (`YYYY-MM-DD`), `note`, `deleted_at` |
| `month_closures` | Reviewed/closed months | `month` (`YYYY-MM`), `closed_at`, `total_cents`, `is_locked` |
| `settings` | App preferences | `key`, `value` |
| `budgets` *(v2)* | Monthly limits | `category_id` (NULL = overall), `amount_cents` |
| `recurring_expenses` *(v2)* | Repeating costs | `amount_cents`, `category_id`, `day_of_month`, `last_applied` |

Full SQL definitions and the report queries are in [`decision.md` § 7](decision.md#7-data-model-sqlite-schema).

**Rules that matter:**

- **Money is stored as integer cents**: `6500` = €65.00. Never store money as a float. Format only for display, using `Intl.NumberFormat`.
- **Expense dates are local calendar dates** (`YYYY-MM-DD`), not UTC timestamps, so an expense logged at 23:30 stays on the right day and in the right month.
- **Categories are archived, never hard-deleted**, because existing expenses still reference them.
- **Schema changes go through migrations** and must never drop user data.

---

## Reports and charts

| Chart | Data | Notes |
|---|---|---|
| Donut by category | `SUM(amount_cents) GROUP BY category_id` for the month | Top 5–6 categories, the rest grouped as "Other"; month total shown in the centre |
| Bar per day | `SUM(amount_cents) GROUP BY spent_on` for the month | Days with no spending shown as 0 |
| Bar per month | `SUM(amount_cents) GROUP BY substr(spent_on,1,7)` for the last 6–12 months | Trend view |
| Budget progress *(v2)* | Spent vs budget per category | Horizontal bars |

Every chart is accompanied by a list of the same numbers (category · amount · %). Colour is never the only way information is shown.

---

## Month close and notifications

```
App opens
  └─ notifications.ensureScheduled()
       └─ schedules a local notification for the 1st of next month, 09:00
            "October is over: you spent €1,240. Tap to review."

User taps notification ──► /review/2026-10
  └─ reports repo computes totals + charts live
  └─ "Close October" ──► INSERT INTO month_closures (…)

Fallback: on app open, if last month has no month_closures row,
          show an "October isn't reviewed yet" banner.
```

- Notifications are **local** (`expo-notifications`), so no server or push service is needed.
- Android 13+ requires runtime notification permission. The app asks after the first expense is saved, not on first launch.
- Locked months reject edits in the repository layer, not just in the UI. The user can unlock a month from its review screen.

---

## Project structure

Current layout (*planned* marks folders and files for later phases):

```
expense-tracker/
├── src/
│   ├── app/                      # expo-router routes (screens)
│   │   ├── _layout.tsx           # Root: SQLiteProvider (runs migrations) + Stack navigator
│   │   ├── index.tsx             # Home: month switcher, total, expenses grouped by day, + button
│   │   ├── expense/new.tsx       # Add expense
│   │   ├── expense/[id].tsx      # Edit / delete expense
│   │   ├── summary.tsx           # Charts for the selected month             (planned)
│   │   ├── review/[month].tsx    # Month review + close                      (planned)
│   │   ├── categories.tsx        # Manage categories                         (planned)
│   │   └── settings.tsx          #                                            (planned)
│   ├── components/               # expense-form, expense-row, month-switcher,
│   │                             # category-icon, snackbar, themed-text/view
│   ├── constants/theme.ts        # Colours (light/dark), spacing
│   ├── db/
│   │   ├── migrations.ts         # Versioned schema migrations (PRAGMA user_version)
│   │   ├── seed.ts               # Default categories + settings
│   │   ├── types.ts              # Category, Expense, ExpenseInput…
│   │   ├── repos/                # categories.ts, expenses.ts: ALL SQL lives here
│   │   └── __tests__/            # Repository + migration tests (real SQL, in memory)
│   ├── hooks/                    # use-month-expenses, use-theme, use-color-scheme
│   ├── services/                 # notifications, export, month close          (planned)
│   ├── stores/                   # undo-delete.ts
│   ├── test-utils/               # In-memory SQLite adapter for Jest
│   └── utils/                    # money.ts, dates.ts (+ __tests__)
├── assets/                       # Icons, splash
├── app.json                      # Expo config (name, icons, plugins)
├── package.json
├── tsconfig.json                 # `@/` path alias → src/
├── README.md                     # This file: technical overview
└── decision.md                   # Planning decisions and rationale
```

---

## Getting started

### Prerequisites

- **Node.js** (current LTS recommended) and npm
- An **Android phone** with **[Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)** installed, *or* Android Studio with an emulator
- Any editor (PhpStorm/WebStorm or VS Code)

### Run locally

```bash
npm install          # install dependencies
npx expo start       # start the dev server
```

Then scan the QR code with Expo Go. The phone and computer must be on the same Wi-Fi network. Press `a` in the terminal to open an Android emulator instead, if one is installed.

### Resetting local data

The database lives inside the app (`expenses.db`). To start fresh while developing, clear the app's storage (Android: Settings → Apps → Expo Go → Storage → Clear data) or uninstall the app.

---

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on Android device or emulator |
| `npm run ios` | Start and open on iOS simulator (macOS only) |
| `npm run web` | Run in the browser (handy for quick UI checks) |
| `npm run lint` | Run ESLint |
| `npm run icons` | Regenerate app icons + splash image from the logo |
| `npm test` | Run the Jest test suite |
| `npm run typecheck` | Type-check the project (`tsc --noEmit`) |
| `npx expo-doctor` | Check the project for dependency and config issues |

---

## Building and releasing

```bash
npm install -g eas-cli
eas login
eas build:configure

eas build -p android --profile preview      # installable .apk for testing
eas build -p android --profile production   # .aab for Google Play
```

### App icon and splash screen

All icons and the splash image are generated from one logo (a receipt with a € sign) by `assets/source/generate-icons.mjs`:

```bash
npm run icons   # regenerates everything in assets/images/ + assets/source/logo.svg
```

| File | Used for |
|---|---|
| `icon.png` (1024², opaque) | Main icon: Expo Go, iOS, store listing |
| `android-icon-foreground.png` + `android-icon-background.png` | Android adaptive icon (the launcher crops it into a circle, squircle, etc.) |
| `android-icon-monochrome.png` | Android 13+ themed icons (recoloured by the system) |
| `splash-icon.png` | Splash screen image (background colour set in `app.json`) |
| `favicon.png` | Web |

- To change the logo or brand colour, edit the script, run `npm run icons`, and **rebuild the app**. Icons and splash are native assets, so hot reload won't update them.
- The app keeps the splash visible until the database is open and migrated (`src/app/_layout.tsx`).
- **Expo Go shows neither the custom splash nor your launcher icon** (it shows its own). To see them, install a release build: `eas build -p android --profile preview`.

Before publishing on Google Play, you'll need a developer account (one-time fee), a privacy policy, the Data Safety form, the app icon and screenshots, and a closed testing period for new personal developer accounts. Check Google's current requirements before submitting.

---

## Conventions

- **TypeScript strict mode**; no `any` in repositories or services.
- **Imports** use the `@/` alias (`@/db/repos/expenses`).
- **Money**: integer cents everywhere; convert with the helpers in `src/utils/money.ts` only.
- **Dates**: `YYYY-MM-DD` strings for expense dates, `YYYY-MM` for months, ISO 8601 for timestamps; use the helpers in `src/utils/dates.ts`.
- **IDs**: UUID v4 strings.
- **Deletes**: soft delete (`deleted_at`); queries always filter `deleted_at IS NULL`.
- **Files**: `kebab-case.tsx` for components, matching the Expo template.

---

## Testing

- **Unit tests (Jest)** for `money.ts`, `dates.ts`, and the report aggregations. Most of the bugs that matter will be in these.
- **Repository tests** run the real migrations and SQL against an in-memory SQLite database (Node's `node:sqlite`, wrapped to look like expo-sqlite in `src/test-utils/test-db.ts`).
- **Manual checklist** before each release: add, edit and delete an expense; switch months; close and unlock a month; receive the notification; export and re-import a backup.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Project setup (Expo, TypeScript, expo-router) | ✅ Done |
| 1 | Database layer, migrations, seed categories; add/list/edit/delete expenses; month navigation | ✅ Done |
| 2 | Summary screen: donut chart, daily bar chart, category breakdown | ⏳ Next |
| 3 | Month-end notification, review screen, close/lock month | |
| 4 | CSV/JSON export, backup restore | |
| 5 | Use the app for a full month; collect issues | |
| 6 | v2: budgets, recurring expenses, daily reminder, comparisons, search | |
| 7 | Release: icon, splash, privacy policy, Play Store | |
| 8 | Optional cloud sync (Node/PHP API + MySQL/Postgres) | |
