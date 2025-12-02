import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, List, MessageSquare, Plus, LogOut, FileText, Menu, X, Calendar, Settings as SettingsIcon, CheckCircle, XCircle, ChevronLeft, ChevronRight, WalletCards } from 'lucide-react';
import { AppView, ChatMessage, SummaryData, Transaction, User, ToastNotification } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AIChat from './components/AIChat';
import LoginScreen from './components/LoginScreen';
import TransactionForm from './components/TransactionForm';
import InvoiceView from './components/InvoiceView';
import Settings from './components/Settings';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as Omit<User, 'id'>;
          setUser({ id: fbUser.uid, ...userData });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setTransactions([]);
      }
      setIsLoadingPersistence(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const transactionsColRef = collection(db, "users", firebaseUser.uid, "transactions");
    const unsubscribe = onSnapshot(transactionsColRef, (snapshot) => {
      const newTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(newTransactions);
    });
    return () => unsubscribe();
  }, [firebaseUser]);

  const handleUpdateUser = useCallback(async (updatedUser: User, successMessage: string) => {
    if (!firebaseUser) return;
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const { id, ...userDataToSave } = updatedUser;
      await updateDoc(userDocRef, userDataToSave);
      setUser(updatedUser);
      addNotification(successMessage, 'success');
    } catch (error) {
      console.error("Failed to update user in DB:", error);
      addNotification("Falha ao salvar no banco de dados.", 'error');
    }
  }, [firebaseUser, addNotification]);

  useEffect(() => {
    // ... Local summary calculation logic remains the same
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setTransactions([]);
      setSummary(null);
      setView('dashboard');
      setChatMessages([]);
    } catch (error) {
      console.error("Error signing out:", error);
      addNotification("Erro ao sair da conta.", "error");
    }
  };

  const changeMonth = (offset: number) => { /* ... same ... */ };
  const handleCategorize = async () => { /* ... Gemini logic ... */ };
  const handleSendMessage = async (text: string) => { /* ... Gemini logic ... */ };
  
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!firebaseUser) return;
    try {
      const transactionDocRef = doc(db, "users", firebaseUser.uid, "transactions", transactionId);
      await deleteDoc(transactionDocRef);
      addNotification('Transação excluída com sucesso!', 'success');
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      addNotification('Erro ao excluir transação.', 'error');
    }
  };
  
  const handleSaveTransaction = async (
    transactionsData: Omit<Transaction, 'id' | 'month_reference'>[], 
    updateMode?: 'single' | 'all-future' | 'renegotiate',
    renegotiateData?: { newTotalAmountCents: number; newInstallmentsCount: number }
  ) => {
    if (!firebaseUser) return;
    const batch = writeBatch(db);

    try {
        if (editingTransaction) {
            const updatedData = transactionsData[0];
            const transactionDocRef = doc(db, "users", firebaseUser.uid, "transactions", editingTransaction.id);
            
            if (updateMode === 'single') {
                batch.update(transactionDocRef, { ...updatedData, month_reference: updatedData.date.substring(0, 7) });
            } else if (editingTransaction.installment_id && (updateMode === 'all-future' || updateMode === 'renegotiate')) {
                // Complex logic needs careful fetching and batching
                // For simplicity, this example shows a basic update. A full implementation would query all related installments first.
                // This is a placeholder for a more complex batch write.
                batch.update(transactionDocRef, { ...updatedData, month_reference: updatedData.date.substring(0, 7) });
                addNotification('Atualização de múltiplas parcelas requer uma implementação mais complexa.', 'error');
            }
        } else { // Creating New
          const transactionsColRef = collection(db, "users", firebaseUser.uid, "transactions");
          transactionsData.forEach(tData => {
            const newDocRef = doc(transactionsColRef); // Auto-generates ID
            batch.set(newDocRef, { ...tData, month_reference: tData.date.substring(0, 7) });
          });
        }

        await batch.commit();
        addNotification(editingTransaction ? 'Transação atualizada!' : 'Transação salva!', 'success');
        setShowTransactionModal(false);
        setEditingTransaction(null);
    } catch (error) {
        console.error("Error saving transaction(s): ", error);
        addNotification('Erro ao salvar transação.', 'error');
    }
  };
  
  const openAddModal = () => { setEditingTransaction(null); setShowTransactionModal(true); };
  const openEditModal = (t: Transaction) => { setEditingTransaction(t); setShowTransactionModal(true); };

  if (isLoadingPersistence) return <div className="min-h-screen flex items-center justify-center text-slate-500">Conectando...</div>;
  if (!user) { return <LoginScreen />; }

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