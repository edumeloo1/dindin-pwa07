import React, { useState, useMemo } from 'react';
import { Transaction, CategoryConfig } from '../types';
import { 
  Tag, ArrowUpCircle, ArrowDownCircle, AlertCircle, Sparkles, Inbox, 
  CreditCard, X, Edit2, Trash2, AlertTriangle
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  categories: CategoryConfig[];
  onCategorize: () => void;
  isCategorizing: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

const isDueSoon = (transaction: Transaction): boolean => {
  if (transaction.type !== 'expense' && transaction.type !== 'loan_payment') return false;
  if (transaction.nature !== 'fixed' && !transaction.is_installment) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const transactionDate = new Date(`${transaction.date}T00:00:00`);
  if (transactionDate < today) return false;

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  return transactionDate <= sevenDaysFromNow;
};

const isPaid = (transaction: Transaction): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const transactionDate = new Date(`${transaction.date}T00:00:00`);
    return transactionDate < today;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, allTransactions, categories, onCategorize, isCategorizing, onEdit, onDelete }) => {
  const [selectedInstallment, setSelectedInstallment] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  
  const upcomingDues = useMemo(() => transactions.filter(t => isDueSoon(t)), [transactions]);

  const formatCurrency = (value: number | undefined | null) => {
    const safeValue = (typeof value === 'number' && !isNaN(value)) ? value / 100 : 0;
    return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getCategoryIcon = (categoryName: string | null) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? <span className="text-base">{category.icon}</span> : <Tag className="w-4 h-4 text-slate-500" />;
  };

  const getInstallmentSummary = (t: Transaction) => {
    if (!t.installment_id) return null;
    const related = allTransactions.filter(tr => tr.installment_id === t.installment_id);
    const originalTransaction = related.sort((a,b) => (a.installment_number || 0) - (b.installment_number || 0))[0];
    const originalDescription = originalTransaction.description.replace(/\s\(1\/\d+\)$/, '');

    const totalPaid = related
      .filter(tr => isPaid(tr))
      .reduce((acc, curr) => acc + curr.amount_cents, 0);
    
    const totalAmount = t.original_amount_cents || related.reduce((acc, curr) => acc + curr.amount_cents, 0);
    const remaining = totalAmount - totalPaid;
    
    return {
      originalDescription,
      total: totalAmount,
      paid: totalPaid,
      remaining: Math.max(0, remaining),
      current: t.installment_number,
      totalCount: t.total_installments
    };
  };

  const handleDeleteConfirm = () => {
    if (deletingTransaction) {
      onDelete(deletingTransaction.id);
      setDeletingTransaction(null);
    }
  };

  return (
    <div className="space-y-4 relative">
      {upcomingDues.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-800">Alerta de Vencimento</h3>
              <p className="text-sm text-amber-700"> Você tem {upcomingDues.length} conta{upcomingDues.length > 1 ? 's' : ''} vencendo nos próximos 7 dias. </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Extrato de Transações</h2>
           <p className="text-slate-500 text-sm">Gerencie lançamentos, parcelas e categorias</p>
        </div>
        {transactions.length > 0 && (
          <button onClick={onCategorize} disabled={isCategorizing} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${ isCategorizing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg' }`}>
            {isCategorizing ? ('Sugerindo...') : (<> <Sparkles className="w-4 h-4" /> Categorizar com IA </>)}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
            <div className="bg-slate-50 p-4 rounded-full mb-4"> <Inbox className="w-10 h-10 text-slate-300" /> </div>
            <p className="text-lg font-medium text-slate-600">Nenhuma transação encontrada</p>
            <p className="text-sm">Clique em "Nova Transação" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Data</th> <th className="px-6 py-4">Descrição</th> <th className="px-6 py-4">Categoria</th> <th className="px-6 py-4">Detalhes</th> <th className="px-6 py-4 text-right">Valor</th> <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className={`transition-colors ${isPaid(t) && t.is_installment ? 'opacity-60' : ''} ${ isDueSoon(t) ? 'bg-amber-50/60 hover:bg-amber-100/70' : t.is_installment ? 'hover:bg-purple-50' : 'hover:bg-slate-50' }`}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                      <div className="flex items-center gap-2"> {isDueSoon(t) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Vencimento próximo" />} <span>{t.date ? new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}</span> </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900"> {t.description} </td>
                    <td className="px-6 py-4">
                      {t.category ? ( <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-slate-200 shadow-sm"> {getCategoryIcon(t.category)} {t.category} </span> ) : ( <span className="inline-flex items-center gap-1 text-orange-500 text-xs bg-orange-50 px-2 py-1 rounded-full border border-orange-100"> <AlertCircle className="w-3 h-3" /> Sem categoria </span> )}
                    </td>
                    <td className="px-6 py-4">
                      {t.is_installment ? ( <button onClick={() => setSelectedInstallment(t)} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold border border-purple-200 hover:bg-purple-200 transition-colors shadow-sm"> <CreditCard className="w-3 h-3" /> {t.installment_number}/{t.total_installments} </button> ) : ( <span className="text-xs text-slate-400 capitalize">{t.nature?.replace('_', ' ') || '-'}</span> )}
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                      <div className="flex items-center justify-end gap-2"> {t.type === 'income' ? <ArrowUpCircle className="w-4 h-4 text-emerald-500"/> : <ArrowDownCircle className="w-4 h-4 text-slate-400"/>} {formatCurrency(t.amount_cents)} </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Editar transação"> <Edit2 className="w-4 h-4" /> </button>
                      <button onClick={() => setDeletingTransaction(t)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Excluir transação"> <Trash2 className="w-4 h-4" /> </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInstallment && (() => {
          const summary = getInstallmentSummary(selectedInstallment);
          if (!summary) return null;
          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative">
                <button onClick={() => setSelectedInstallment(null)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"> <X className="w-5 h-5" /> </button>
                <div className="flex items-center gap-3 mb-4"> <div className="bg-purple-100 p-3 rounded-full text-purple-600"> <CreditCard className="w-6 h-6" /> </div> <div> <h3 className="font-bold text-slate-800">Detalhes do Parcelamento</h3> <p className="text-sm font-medium text-slate-600">{summary.originalDescription}</p> </div> </div>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                    <div className="flex justify-between text-sm"> <span className="text-slate-500">Compra Original</span> <span className="font-semibold text-slate-900">{formatCurrency(summary.total)}</span> </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"> <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(summary.paid / summary.total) * 100}%` }}></div> </div>
                    <div className="flex justify-between text-xs text-slate-500"> <span>Parcela {summary.current} de {summary.totalCount}</span> <span>{((summary.paid / summary.total) * 100 ).toFixed(0)}% pago</span> </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-emerald-100 bg-emerald-50/50 rounded-lg"> <p className="text-xs text-emerald-600 font-medium mb-1">Já Pago</p> <p className="font-bold text-emerald-700">{formatCurrency(summary.paid)}</p> </div>
                    <div className="p-3 border border-slate-200 bg-slate-50 rounded-lg"> <p className="text-xs text-slate-500 font-medium mb-1">Restante</p> <p className="font-bold text-slate-700">{formatCurrency(summary.remaining)}</p> </div>
                  </div>
                  <button onClick={() => { setSelectedInstallment(null); onEdit(selectedInstallment); }} className="w-full py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"> <Edit2 className="w-3 h-3" /> Editar Parcela </button>
                </div>
              </div>
            </div>
          );
      })()}
      
      {deletingTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4"> <AlertCircle className="w-8 h-8" /> </div>
              <h3 className="font-bold text-lg text-slate-800">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-2">Tem certeza que deseja apagar a transação "{deletingTransaction.description}"? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-4 mt-6 w-full">
                <button onClick={() => setDeletingTransaction(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Sim, Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;