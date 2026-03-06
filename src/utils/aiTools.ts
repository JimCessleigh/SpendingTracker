import { AppAction, AppState, Transaction, Card, Goal } from '../types';
import { CARD_COLORS } from '../constants/categories';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// JSON Schema definitions for all tools (provider-agnostic)
export const TOOL_DEFINITIONS = [
  {
    name: 'add_transaction',
    description: 'Add a new expense or income transaction to the app.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Transaction amount (positive number)' },
        type: { type: 'string', enum: ['expense', 'income'], description: 'Whether this is an expense or income' },
        category: { type: 'string', description: 'Category name (e.g. Food & Dining, Transport, Shopping, etc.)' },
        note: { type: 'string', description: 'Optional note or description' },
        date: { type: 'string', description: 'ISO date string (e.g. 2026-03-05T00:00:00.000Z). Defaults to now if omitted.' },
      },
      required: ['amount', 'type', 'category'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Delete a transaction by its ID.',
    parameters: {
      type: 'object',
      properties: {
        transaction_id: { type: 'string', description: 'The ID of the transaction to delete (from the transaction list in context)' },
      },
      required: ['transaction_id'],
    },
  },
  {
    name: 'add_card',
    description: 'Add a new credit card to track payment due dates.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Card name (e.g. Chase Sapphire, Citi Double Cash)' },
        last_four: { type: 'string', description: 'Last 4 digits of the card number' },
        due_month: { type: 'number', description: 'Payment due month (1-12)' },
        due_day: { type: 'number', description: 'Payment due day (1-31)' },
        benefits: { type: 'string', description: 'Optional card benefits or rewards description' },
        color: { type: 'string', description: 'Optional hex color for the card (e.g. #6C5CE7)' },
      },
      required: ['name', 'last_four', 'due_month', 'due_day'],
    },
  },
  {
    name: 'delete_card',
    description: 'Delete a card by its ID.',
    parameters: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'The ID of the card to delete (from the card list in context)' },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'set_language',
    description: "Change the app's display language.",
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'zh'], description: "'en' for English, 'zh' for Chinese (Simplified)" },
      },
      required: ['language'],
    },
  },
  {
    name: 'send_email_export',
    description: 'Export all transactions as a CSV file and send to an email address.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email address to send the CSV export to' },
      },
      required: ['email'],
    },
  },
  {
    name: 'set_goal',
    description: 'Create a new financial savings goal (e.g. emergency fund, vacation, new phone).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal name (e.g. Emergency Fund, Europe Trip, New Laptop)' },
        target_amount: { type: 'number', description: 'Total amount to save' },
        saved_amount: { type: 'number', description: 'Amount already saved toward this goal (default 0)' },
        deadline: { type: 'string', description: 'Optional target date in YYYY-MM-DD format' },
      },
      required: ['title', 'target_amount'],
    },
  },
  {
    name: 'update_goal',
    description: 'Update progress on an existing financial goal (update saved amount, title, or deadline).',
    parameters: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'The ID of the goal to update (from the goals list in context)' },
        saved_amount: { type: 'number', description: 'New saved amount' },
        title: { type: 'string', description: 'Optional new title' },
        deadline: { type: 'string', description: 'Optional new deadline (YYYY-MM-DD)' },
      },
      required: ['goal_id', 'saved_amount'],
    },
  },
  {
    name: 'delete_goal',
    description: 'Delete a financial goal by its ID.',
    parameters: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'The ID of the goal to delete (from the goals list in context)' },
      },
      required: ['goal_id'],
    },
  },
];

export interface ToolCallResult {
  ok: boolean;
  summary: string;
}

export async function executeToolCall(
  name: string,
  args: Record<string, any>,
  dispatch: React.Dispatch<AppAction>,
  state: AppState,
  onSendEmail: (email: string) => Promise<void>
): Promise<ToolCallResult> {
  switch (name) {
    case 'add_transaction': {
      const tx: Transaction = {
        id: generateId(),
        amount: args.amount,
        type: args.type,
        category: args.category,
        note: args.note || '',
        date: args.date || new Date().toISOString(),
      };
      dispatch({ type: 'ADD_TRANSACTION', payload: tx });
      const sign = tx.type === 'expense' ? '-' : '+';
      const noteStr = tx.note ? ` · ${tx.note}` : '';
      return { ok: true, summary: `Added ${tx.type}: ${sign}${tx.amount} · ${tx.category}${noteStr}` };
    }

    case 'delete_transaction': {
      const tx = state.transactions.find(t => t.id === args.transaction_id);
      if (!tx) return { ok: false, summary: `Transaction not found: ${args.transaction_id}` };
      dispatch({ type: 'DELETE_TRANSACTION', payload: args.transaction_id });
      return { ok: true, summary: `Deleted transaction: ${tx.date.slice(0, 10)} · ${tx.category} · ${tx.amount}` };
    }

    case 'add_card': {
      const card: Card = {
        id: generateId(),
        name: args.name,
        lastFour: String(args.last_four),
        dueDate: String(args.due_day),
        benefits: args.benefits || '',
        color: args.color || CARD_COLORS[0],
      };
      dispatch({ type: 'ADD_CARD', payload: card });
      return { ok: true, summary: `Added card: ${card.name} (···· ${card.lastFour})` };
    }

    case 'delete_card': {
      const card = state.cards.find(c => c.id === args.card_id);
      if (!card) return { ok: false, summary: `Card not found: ${args.card_id}` };
      dispatch({ type: 'DELETE_CARD', payload: args.card_id });
      return { ok: true, summary: `Deleted card: ${card.name} (···· ${card.lastFour})` };
    }

    case 'set_language': {
      dispatch({ type: 'SET_LANGUAGE', payload: args.language });
      const label = args.language === 'zh' ? '中文' : 'English';
      return { ok: true, summary: `Language changed to ${label}` };
    }

    case 'send_email_export': {
      await onSendEmail(args.email);
      return { ok: true, summary: `CSV sent to ${args.email}` };
    }

    case 'set_goal': {
      const goal: Goal = {
        id: generateId(),
        title: args.title,
        targetAmount: args.target_amount,
        savedAmount: args.saved_amount || 0,
        deadline: args.deadline,
      };
      dispatch({ type: 'ADD_GOAL', payload: goal });
      const deadlineStr = goal.deadline ? ` · due ${goal.deadline}` : '';
      return { ok: true, summary: `Goal set: "${goal.title}" — ${goal.savedAmount}/${goal.targetAmount}${deadlineStr}` };
    }

    case 'update_goal': {
      const goal = (state.goals || []).find(g => g.id === args.goal_id);
      if (!goal) return { ok: false, summary: `Goal not found: ${args.goal_id}` };
      const updated: Goal = {
        ...goal,
        savedAmount: args.saved_amount ?? goal.savedAmount,
        title: args.title || goal.title,
        deadline: args.deadline || goal.deadline,
      };
      dispatch({ type: 'UPDATE_GOAL', payload: updated });
      const pct = Math.round((updated.savedAmount / updated.targetAmount) * 100);
      return { ok: true, summary: `Updated "${updated.title}": ${updated.savedAmount}/${updated.targetAmount} (${pct}%)` };
    }

    case 'delete_goal': {
      const goal = (state.goals || []).find(g => g.id === args.goal_id);
      if (!goal) return { ok: false, summary: `Goal not found: ${args.goal_id}` };
      dispatch({ type: 'DELETE_GOAL', payload: args.goal_id });
      return { ok: true, summary: `Deleted goal: "${goal.title}"` };
    }

    default:
      return { ok: false, summary: `Unknown tool: ${name}` };
  }
}
