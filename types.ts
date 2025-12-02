// FIX: Added 'loan_payment' to TransactionType to align with its usage as a type of expense throughout the application.
export type TransactionType = "expense" | "income" | "loan" | "transfer" | "loan_payment";
export type TransactionNature = "fixed" | "variable" | "extra_income" | "salary" | "loan_payment" | "loan_received" | "installment" | null;

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string; // Emoji
  isVisible: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: "bank" | "credit_card" | "cash" | "pix";
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  categories: CategoryConfig[];
  accounts: Account[];
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  nature: TransactionNature;
  description: string;
  category: string | null; // Armazena o NOME da categoria
  amount_cents: number; 
  date: string; // YYYY-MM-DD
  month_reference: string; // YYYY-MM
  
  is_installment?: boolean;
  installment_id?: string;
  installment_number?: number;
  total_installments?: number;
  original_amount_cents?: number;
}

export interface Period {
  month: string;
  label: string;
}

export interface SummaryData {
  period_label: string;
  numbers: {
    total_income: number;
    total_expense: number;
    balance: number;
  };
  categories: {
    category: string;
    amount: number;
    percent_of_expenses: number;
  }[];
  highlights: string[];
  suggestions: string[];
  summary_text: string;
}

export type AppView = 'dashboard' | 'transactions' | 'ai-chat' | 'invoices' | 'settings';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}