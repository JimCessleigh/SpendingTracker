export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
  date: string; // ISO date string
  receiptUri?: string;
  cardId?: string;
  isSplit?: boolean;
  splitFrom?: string; // parent transaction id
}

export interface Card {
  id: string;
  name: string;
  lastFour: string;
  dueDate: string; // day of month e.g. "15" = due on the 15th every month
  benefits: string;
  color: string;
  reminderEnabled?: boolean;
  annualFee?: number;       // e.g. 95
  anniversaryDate?: string; // "M-D" format e.g. "3-15" = March 15
  bankDomain?: string;      // clearbit domain e.g. "chase.com", absent = no logo
  // cashback rates per category (percentage, e.g. 3 = 3%)
  cashbackRates?: Record<string, number>;
  defaultCashback?: number; // fallback rate for unspecified categories
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
  frequency: RecurringFrequency;
  lastAddedDate: string; // ISO string
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string; // ISO date string
  color?: string;
  icon?: string;
}

// Merchant auto-categorization rule
export interface MerchantRule {
  id: string;
  keyword: string;   // substring match on transaction note (case-insensitive)
  category: string;
}

// Bill split tracking
export interface BillSplit {
  id: string;
  transactionId: string;
  totalAmount: number;
  description: string;
  date: string;
  participants: BillParticipant[];
}

export interface BillParticipant {
  name: string;
  amount: number;
  settled: boolean;
}

// Subscription tracking (separate from recurring transactions)
export interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: string;
  billingCycle: 'monthly' | 'yearly';
  nextDueDate: string; // ISO date string
  color?: string;
  notes?: string;
}

// AI chat message for persistence
export interface PersistedChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
  timestamp: number;
}

export interface AppState {
  transactions: Transaction[];
  cards: Card[];
  currency: string;
  categories: string[];
  aiProvider: string;
  aiKey: string;
  language: string;
  budgets: Record<string, number>;
  recurringTransactions: RecurringTransaction[];
  goals: Goal[];
  darkMode: boolean;
  merchantRules: MerchantRule[];
  billSplits: BillSplit[];
  subscriptions: Subscription[];
  chatHistory: PersistedChatMessage[];
  hasCompletedOnboarding?: boolean;
}

export type AppAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_CARD'; payload: Card }
  | { type: 'UPDATE_CARD'; payload: Card }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'TOGGLE_CARD_REMINDER'; payload: string }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_AI_SETTINGS'; payload: { provider: string; apiKey: string } }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SET_BUDGET'; payload: { category: string; amount: number } }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
  | { type: 'DELETE_RECURRING'; payload: string }
  | { type: 'UPDATE_RECURRING_DATE'; payload: { id: string; lastAddedDate: string } }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'IMPORT_STATE'; payload: AppState }
  | { type: 'LOAD_STATE'; payload: AppState }
  // Merchant rules
  | { type: 'ADD_MERCHANT_RULE'; payload: MerchantRule }
  | { type: 'DELETE_MERCHANT_RULE'; payload: string }
  // Bill splits
  | { type: 'ADD_BILL_SPLIT'; payload: BillSplit }
  | { type: 'UPDATE_BILL_SPLIT'; payload: BillSplit }
  | { type: 'DELETE_BILL_SPLIT'; payload: string }
  | { type: 'SETTLE_PARTICIPANT'; payload: { splitId: string; participantName: string } }
  // Subscriptions
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  // Chat history
  | { type: 'SET_CHAT_HISTORY'; payload: PersistedChatMessage[] }
  | { type: 'CLEAR_CHAT_HISTORY' }
  // Onboarding
  | { type: 'COMPLETE_ONBOARDING' };
