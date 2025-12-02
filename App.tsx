import React, { useState, useEffect, useCallback } from 'react';
// FIX: Added ChevronLeft and ChevronRight to lucide-react imports.
import { LayoutDashboard, List, MessageSquare, Plus, LogOut, FileText, Menu, X, Calendar, Settings as SettingsIcon, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppView, ChatMessage, SummaryData, Transaction, User, ToastNotification, Account, CategoryConfig } from './types';
import * as geminiService from './services/geminiService';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AIChat from './components/AIChat';
import LoginScreen from './components/LoginScreen';
import TransactionForm from './components/TransactionForm';
import InvoiceView from './components/InvoiceView';
import Settings from './components/Settings';
import { WalletCards } from 'lucide-react';

const DB_KEY = 'meufinance_db_users';
const PHOTO_KEY_PREFIX = 'meufinance_photo_';
const SESSION_KEY = 'meufinance_last_user_id';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingPersistence, setIsLoadingPersistence] = useState(true);
  
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [view, setView] = useState<AppView>('dashboard');
  
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const addNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // Initial Load - Robust data hydration from "DB"
  useEffect(() => {
    const savedUserId = localStorage.getItem(SESSION_KEY);
    if (savedUserId) {
      try {
        const dbString = localStorage.getItem(DB_KEY);
        const users: User[] = dbString ? JSON.parse(dbString) : [];
        const loggedUserFromDb = users.find(u => u.id === savedUserId);
        
        if (loggedUserFromDb) {
          const photoUrl = localStorage.getItem(`${PHOTO_KEY_PREFIX}${loggedUserFromDb.id}`);
          const transactionsString = localStorage.getItem(`meufinance_data_${loggedUserFromDb.id}`);
          
          setUser({ ...loggedUserFromDb, photoUrl: photoUrl || undefined });
          setTransactions(transactionsString ? JSON.parse(transactionsString) : []);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        addNotification("Erro ao carregar sessão.", "error");
        localStorage.removeItem(SESSION_KEY); // Clear corrupted session
      }
    }
    setIsLoadingPersistence(false);
  }, [addNotification]);
  
  // Auto-save transactions whenever they change
  useEffect(() => {
    if (user && !isLoadingPersistence) {
      try {
        localStorage.setItem(`meufinance_data_${user.id}`, JSON.stringify(transactions));
      } catch (error) {
        console.error("Failed to save transactions:", error);
        addNotification('Erro ao salvar transações.', 'error');
      }
    }
  }, [transactions, user, isLoadingPersistence, addNotification]);

  // Update user data in the main "DB"
  const handleUpdateUser = useCallback((updatedUser: User, successMessage: string) => {
    try {
      const dbString = localStorage.getItem(DB_KEY);
      if (!dbString) throw new Error("User DB not found.");
      
      let users: User[] = JSON.parse(dbString);
      const userIndex = users.findIndex(u => u.id === updatedUser.id);
      if (userIndex === -1) throw new Error("User not found in DB.");

      const { photoUrl, ...userToSaveInDb } = updatedUser;
      
      users[userIndex] = userToSaveInDb;
      localStorage.setItem(DB_KEY, JSON.stringify(users));

      if (photoUrl) {
        localStorage.setItem(`${PHOTO_KEY_PREFIX}${updatedUser.id}`, photoUrl);
      } else {
        localStorage.removeItem(`${PHOTO_KEY_PREFIX}${updatedUser.id}`);
      }
      
      setUser(updatedUser);
      addNotification(successMessage, 'success');
    } catch (error) {
      console.error("Failed to update user in DB:", error);
      const message = "Falha ao salvar no banco de dados. A foto pode ser muito grande.";
      addNotification(message, 'error');
    }
  }, [addNotification]);

  // Local Summary Calculation - Updates instantly
  useEffect(() => {
    const currentMonthTransactions = transactions.filter(t => t.month_reference === currentMonth);
    const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount_cents || 0), 0);
    const expense = currentMonthTransactions.filter(t => t.type === 'expense' || t.type === 'loan_payment').reduce((acc, t) => acc + Number(t.amount_cents || 0), 0);
    const monthDate = new Date(`${currentMonth}-02T00:00:00Z`);
    const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    
    const categoriesSummary = currentMonthTransactions
      .filter(t => t.type === 'expense' || t.type === 'loan_payment')
      .reduce<Record<string, number>>((acc, t) => {
        const category = t.category || 'Outros';
        acc[category] = (acc[category] || 0) + Number(t.amount_cents || 0);
        return acc;
      }, {});

    setSummary({
      period_label: monthLabel,
      numbers: { 
        total_income: income / 100, 
        total_expense: expense / 100, 
        balance: (income - expense) / 100 
      },
      categories: Object.entries(categoriesSummary).map(([cat, amount]) => ({
        category: cat,
        amount: Number(amount) / 100,
        percent_of_expenses: expense > 0 ? (Number(amount) / expense) : 0,
      })),
      highlights: [], suggestions: [], summary_text: ""
    });
  }, [transactions, currentMonth]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    const savedTransactions = localStorage.getItem(`meufinance_data_${loggedUser.id}`);
    setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
    localStorage.setItem(SESSION_KEY, loggedUser.id);
    setView('dashboard');
    setChatMessages([]);
  };

  const handleLogout = () => {
    setUser(null);
    setTransactions([]);
    setSummary(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const changeMonth = (offset: number) => {
    const date = new Date(`${currentMonth}-02T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };
  
  const handleCategorize = async () => { /* ... Gemini logic ... */ };
  const handleSendMessage = async (text: string) => { /* ... Gemini logic ... */ };
  
  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
    addNotification('Transação excluída com sucesso!', 'success');
  };
  
  const handleSaveTransaction = (
    transactionsData: Omit<Transaction, 'id' | 'month_reference'>[], 
    updateMode?: 'single' | 'all-future' | 'renegotiate',
    renegotiateData?: { newTotalAmountCents: number; newInstallmentsCount: number }
  ) => {
    if (editingTransaction) {
        const updatedData = transactionsData[0];
        setTransactions(prev => {
            let newTransactions = [...prev];
            const baseIndex = newTransactions.findIndex(t => t.id === editingTransaction.id);
            if (baseIndex === -1) return prev;

            if (updateMode === 'single') {
                newTransactions[baseIndex] = { ...newTransactions[baseIndex], ...updatedData, month_reference: updatedData.date.substring(0, 7) };
            } else if (editingTransaction.installment_id && (updateMode === 'all-future' || updateMode === 'renegotiate')) {
                const installmentId = editingTransaction.installment_id;
                const baseInstallmentNumber = editingTransaction.installment_number || 0;
                let originalTotalAmount = editingTransaction.original_amount_cents || 0;

                const allInstallments = newTransactions.filter(t => t.installment_id === installmentId).sort((a,b) => (a.installment_number || 0) - (b.installment_number || 0));
                
                if (updateMode === 'renegotiate' && renegotiateData) {
                    const { newTotalAmountCents, newInstallmentsCount } = renegotiateData;
                    const newInstallmentValue = Math.round(newTotalAmountCents / newInstallmentsCount);

                    allInstallments.forEach(inst => {
                        const instNum = inst.installment_number || 0;
                        if (instNum >= baseInstallmentNumber) {
                           const installmentIndex = instNum - baseInstallmentNumber;
                           if (installmentIndex < newInstallmentsCount) {
                               const newDate = new Date(`${updatedData.date}T12:00:00Z`);
                               newDate.setUTCMonth(newDate.getUTCMonth() + installmentIndex);
                               inst.amount_cents = newInstallmentValue;
                               inst.date = newDate.toISOString().split('T')[0];
                               inst.month_reference = inst.date.substring(0,7);
                           } else {
                               inst.amount_cents = 0; // Mark for removal
                           }
                        }
                    });
                    
                    newTransactions = newTransactions.filter(t => t.amount_cents > 0);
                    const newTotal = allInstallments.filter(t => t.amount_cents > 0).reduce((sum, i) => sum + i.amount_cents, 0);

                    newTransactions.forEach(t => {
                        if (t.installment_id === installmentId) {
                            t.original_amount_cents = newTotal;
                            t.total_installments = (allInstallments.find(i => i.amount_cents > 0)?.installment_number || 0) + newInstallmentsCount -1;
                        }
                    });

                } else { // 'all-future' standard update
                     allInstallments.forEach(inst => {
                        if ((inst.installment_number || 0) >= baseInstallmentNumber) {
                           inst.description = updatedData.description.replace(/\s\(\d+\/\d+\)$/, ` (${inst.installment_number}/${inst.total_installments})`);
                           inst.category = updatedData.category;
                           inst.account_id = updatedData.account_id;
                        }
                    });
                }
            }
            return newTransactions;
        });
    } else { // Creating New
      const newTransactions: Transaction[] = transactionsData.map(tData => ({
        id: `${Date.now()}-${Math.random()}`, ...tData, month_reference: tData.date.substring(0, 7)
      }));
      setTransactions(prev => [...prev, ...newTransactions]);
    }
    addNotification(editingTransaction ? 'Transação atualizada!' : 'Transação salva!', 'success');
    setShowTransactionModal(false);
    setEditingTransaction(null);
  };
  
  const openAddModal = () => { setEditingTransaction(null); setShowTransactionModal(true); };
  const openEditModal = (t: Transaction) => { setEditingTransaction(t); setShowTransactionModal(true); };

  if (isLoadingPersistence) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando sua carteira...</div>;
  if (!user) { return <LoginScreen onLogin={handleLogin} />; }

  const monthLabel = new Date(`${currentMonth}-02T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const currentMonthTransactions = transactions.filter(t => t.month_reference === currentMonth).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return (
    <div className="flex bg-slate-50 h-screen">
      <aside className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className={`p-4 border-b border-slate-100 flex items-center gap-3 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
           <div className={`flex items-center gap-2 overflow-hidden transition-all ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
             <div className="bg-emerald-600 p-2 rounded-lg"><WalletCards className="w-5 h-5 text-white" /></div>
             <h1 className="text-lg font-bold text-slate-800 tracking-tight whitespace-nowrap">Meu DinDin</h1>
           </div>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100">
             {isSidebarOpen ? <X className="w-5 h-5 text-slate-500"/> : <Menu className="w-5 h-5 text-slate-500"/>}
           </button>
        </div>

        <button onClick={() => setView('settings')} className={`px-4 py-4 hover:bg-slate-100/70 transition-colors w-full text-left ${isSidebarOpen ? '' : 'flex justify-center'}`}>
           <div className={`flex items-center gap-3 text-slate-700 font-medium ${isSidebarOpen ? '' : 'justify-center'}`}>
             <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0 overflow-hidden">
               {user.photoUrl ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
             </div>
             {isSidebarOpen && (
                <div className="overflow-hidden">
                   <span className="text-sm leading-tight truncate block">{user.name}</span>
                   <span className="text-xs text-slate-400 font-normal">@{user.username}</span>
                </div>
             )}
           </div>
        </button>

        <nav className="flex-1 p-2 space-y-1">
          {[{label: 'Visão Geral', view: 'dashboard', icon: LayoutDashboard}, {label: 'Transações', view: 'transactions', icon: List}, {label: 'Planejador', view: 'invoices', icon: FileText}, {label: 'Assistente IA', view: 'ai-chat', icon: MessageSquare}].map(item => (
            <button key={item.view} onClick={() => setView(item.view as AppView)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${isSidebarOpen ? '' : 'justify-center'} ${ view === item.view ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' }`}>
              <item.icon className="w-5 h-5 shrink-0" /> {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={`p-2 border-t border-slate-100 ${isSidebarOpen ? 'space-y-2' : ''}`}>
          {isSidebarOpen && <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-500 px-4 py-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"> <LogOut className="w-4 h-4" /> Sair </button>}
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div> <h2 className="text-2xl font-bold text-slate-800"> {view === 'dashboard' && 'Visão Geral'} {view === 'transactions' && 'Extrato Detalhado'} {view === 'invoices' && 'Planejador Financeiro'} {view === 'ai-chat' && 'Consultor Financeiro'} {view === 'settings' && 'Configurações'} </h2> </div>
            {view !== 'settings' && (
              <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex items-center gap-2 px-4 min-w-[180px] justify-center text-slate-700 font-semibold capitalize select-none"> <Calendar className="w-4 h-4 text-emerald-500" /> {monthLabel} </div>
                <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            )}
          </header>
          {view === 'dashboard' && <Dashboard summary={summary} loading={false} transactions={currentMonthTransactions} categories={user.categories} hasTransactions={transactions.length > 0} />}
          {view === 'transactions' && <TransactionList transactions={currentMonthTransactions} allTransactions={transactions} categories={user.categories} onCategorize={handleCategorize} isCategorizing={categorizing} onEdit={openEditModal} onDelete={handleDeleteTransaction}/>}
          {view === 'invoices' && <InvoiceView transactions={currentMonthTransactions} categories={user.categories} />}
          {view === 'settings' && <Settings user={user} onUpdateUser={handleUpdateUser} />}
          {view === 'ai-chat' && <div className="max-w-3xl mx-auto"><AIChat messages={chatMessages} onSendMessage={handleSendMessage} isLoading={chatLoading} /></div>}
        </main>
        
        <button onClick={openAddModal} className="absolute bottom-8 right-8 bg-slate-900 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 transition-transform hover:scale-105 active:scale-95 z-40">
           <Plus className="w-6 h-6" />
        </button>
      </div>

      {showTransactionModal && <TransactionForm onClose={() => { setShowTransactionModal(false); setEditingTransaction(null);}} onSave={handleSaveTransaction} initialData={editingTransaction} accounts={user.accounts} categories={user.categories} />}
      
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-full max-w-xs">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl text-white animate-fade-in-up ${n.type === 'success' ? 'bg-slate-800' : 'bg-red-600'}`}>
            {n.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0"/> : <XCircle className="w-5 h-5 text-white shrink-0"/> }
            <p className="text-sm font-medium">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}