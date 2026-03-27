# Pockyt - Personal Finance Tracker

A mobile app for tracking expenses, managing credit cards, scanning receipts, and setting savings goals — with built-in AI assistance.

Built with React Native / Expo. Supports iOS, Android, and Web.

---

## Features

### Dashboard
- Income / expense / balance summary
- Monthly and yearly bar chart views
- Spending breakdown by category (pie chart with drill-down)
- Budget progress bars with alerts at 80% and 100%
- Savings goals overview

### Transactions
- Add, edit, and delete income or expense entries
- **Duplicate** any transaction with one tap
- **Undo delete** with a 4-second undo toast
- Filter by type, category, month, amount range, and date range
- **Bulk select** (long-press) → bulk delete or bulk recategorize
- Paginated list (40 per page) for large transaction sets
- Attach receipt photos
- Set up recurring transactions (daily, weekly, monthly)
- **Card statement view** — transactions grouped by card and month
- **Merchant auto-categorization** — notes matching saved keywords auto-fill the category
- **Cashback optimizer** — form hints when a different card earns more cashback for the selected category

### Receipt Scanning
- Capture receipts with the camera or pick from your photo library
- AI-powered OCR extracts amount, date, merchant, and category
- Review and confirm before saving

### Credit Card Management
- Track multiple cards with due dates, annual fees, and benefits
- Payment reminders (push notification 1 day before due date)
- Bank logo auto-detection

### AI Assistant
- Chat interface for managing your finances conversationally
- The AI can add transactions, create goals, update cards, and export data
- Analyzes spending patterns and flags anomalies
- Supports ChatGPT, Gemini, Claude, and DeepSeek

### Savings Goals
- Create goals with target amounts and optional deadlines
- Visual progress tracking

### Spending Heatmap
- Calendar view showing daily spending intensity for any month
- Color-coded cells (light → dark blue) scaled to peak day
- Tap a day to see all transactions for that date
- Monthly summary stats: total, daily average, active days, peak day

### Cash Flow Forecast
- 6 months of historical income vs. expense bar chart
- 3-month forward forecast based on trailing averages
- Factors in recurring transactions and subscriptions
- Running net balance and upcoming known expenses

### Bill Splitting
- Create a bill split with description, total, and participants
- Split evenly with one tap or enter custom amounts per person
- Mark individual participants as settled
- Tracks outstanding balance across all splits

### Settings
- Currency: USD, EUR, GBP, JPY, CNY, HKD, SGD, AUD, CAD
- Language: English and Simplified Chinese
- Dark mode
- Custom expense categories and monthly budgets per category (with validation)
- Category deletion warns if transactions are still using it
- **Merchant auto-categorization rules** — keyword → category mappings
- **Subscription management** — track recurring services with due dates and renewal alerts
- **CSV import** — paste bank CSV (Date, Type, Category, Amount, Note) to bulk-import transactions
- PDF export with optional date range filter
- AI provider and API key configuration
- Export/import data as JSON or CSV

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation (bottom tabs) |
| Charts | react-native-chart-kit + react-native-svg |
| Storage | AsyncStorage (local) + Firebase (optional cloud sync) |
| Camera | expo-camera, expo-image-picker |
| Notifications | expo-notifications |
| PDF / Email | expo-print, expo-mail-composer |
| AI | OpenAI, Google Gemini, Anthropic Claude, DeepSeek |
| Dates | date-fns |

---

## Getting Started

### Prerequisites
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A physical device or simulator (iOS/Android)

### Install

```bash
git clone <repo-url>
cd SpendingTracker
npm install
npx expo start
```

Scan the QR code with Expo Go on your device, or press `i` for iOS simulator / `a` for Android emulator.

### AI Features (Optional)

To use receipt scanning and the AI assistant, add an API key in **Settings > AI Assistant**. Supported providers:

- [OpenAI](https://platform.openai.com/)
- [Google Gemini](https://aistudio.google.com/)
- [Anthropic Claude](https://console.anthropic.com/)
- [DeepSeek](https://platform.deepseek.com/)

### Cloud Sync (Optional)

Firebase sync is optional and disabled by default. To enable it:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Add your credentials to `src/firebase/config.ts`

---

## Project Structure

```
src/
├── screens/          # Tab screens (Home, Transactions, Camera, Cards, Settings, AI, Goals)
├── navigation/       # Bottom tab navigator
├── context/          # Global state (AppContext) and theme (ThemeContext)
├── utils/            # AI chat, tool calling, OCR logic
├── storage/          # AsyncStorage persistence, import/export
├── constants/        # Categories, bank detection, theme colors
├── types/            # TypeScript interfaces
├── hooks/            # useTranslation hook
├── i18n/             # English and Chinese translations
├── firebase/         # Firebase config and sync (optional)
└── notifications/    # Push notification scheduling
```

---

## Data Models

**Transaction** — `id, amount, type (expense|income), category, note, date, receiptUri?, cardId?`

**Card** — `id, name, lastFour, dueDate, benefits, color, reminderEnabled?, annualFee?, anniversaryDate?`

**Goal** — `id, title, targetAmount, savedAmount, deadline?, color?, icon?`

**RecurringTransaction** — `id, amount, type, category, note, frequency (daily|weekly|monthly), lastAddedDate`

---

## Permissions

| Permission | Platform | Purpose |
|---|---|---|
| Camera | iOS & Android | Receipt capture |
| Photo Library | iOS | Receipt selection |
| Notifications | iOS & Android | Card payment reminders |
