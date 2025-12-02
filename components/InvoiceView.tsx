import React, { useMemo } from 'react';
import { Transaction, CategoryConfig } from '../types';
import { Layers, CreditCard, Variable, ArrowDownCircle, Inbox } from 'lucide-react';

interface InvoiceViewProps {
  transactions: Transaction[]; // Should receive only transactions for the current month
  categories: CategoryConfig[];
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ transactions, categories }) => {
  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const getCategoryIcon = (categoryName: string | null) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? <span className="text-lg">{category.icon}</span> : <div className="w-4 h-4 bg-slate-200 rounded-md" />;
  };

  const expenseData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense' || t.type === 'loan_payment');
    
    const total = expenses.reduce((sum, t) => sum + t.amount_cents, 0);
    const installments = expenses.filter(t => t.is_installment).reduce((sum, t) => sum + t.amount_cents, 0);
    const fixed = expenses.filter(t => t.nature === 'fixed').reduce((sum, t) => sum + t.amount_cents, 0);
    const variable = total - installments - fixed;

    return {
      total,
      installments,
      fixed,
      variable,
      items: expenses.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  }, [transactions]);

  if (expenseData.items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
           <Inbox className="w-8 h-8 mb-2 text-slate-300" />
           <p>Nenhuma despesa registrada neste mês.</p>
        </div>
      );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 self-start">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Resumo da Fatura</h3>
        <p className="text-sm text-slate-500 mb-6">Composição das suas despesas no mês.</p>
        
        <div className="space-y-2 mb-6">
            <div className="text-xs text-slate-500">Total de Despesas</div>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(expenseData.total)}</div>
        </div>

        <div className="space-y-4">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-700"> <Layers className="w-4 h-4"/> Parcelamentos </div>
                    <span className="text-sm font-semibold text-purple-700">{formatCurrency(expenseData.installments)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full"><div className="bg-purple-500 h-2 rounded-full" style={{width: `${(expenseData.installments/expenseData.total)*100}%`}}></div></div>
            </div>
             <div>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-700"> <CreditCard className="w-4 h-4"/> Gastos Fixos </div>
                    <span className="text-sm font-semibold text-orange-700">{formatCurrency(expenseData.fixed)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full"><div className="bg-orange-500 h-2 rounded-full" style={{width: `${(expenseData.fixed/expenseData.total)*100}%`}}></div></div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-sky-700"> <Variable className="w-4 h-4"/> Gastos Variáveis </div>
                    <span className="text-sm font-semibold text-sky-700">{formatCurrency(expenseData.variable)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full"><div className="bg-sky-500 h-2 rounded-full" style={{width: `${(expenseData.variable/expenseData.total)*100}%`}}></div></div>
            </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Lançamentos do Mês</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {expenseData.items.map(t => (
               <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-lg"> {getCategoryIcon(t.category)} </div>
                   <div> <p className="font-semibold text-sm text-slate-800">{t.description}</p> <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p> </div>
                 </div>
                 <div className="flex items-center gap-1 text-sm font-bold text-slate-700"> <ArrowDownCircle className="w-4 h-4 opacity-70"/> {formatCurrency(t.amount_cents)} </div>
               </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;