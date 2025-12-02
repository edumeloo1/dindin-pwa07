import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { SummaryData, Transaction, CategoryConfig } from '../types';
import { Loader2, TrendingDown, TrendingUp, Wallet, ArrowUpCircle, ArrowDownCircle, Inbox } from 'lucide-react';

interface DashboardProps {
  summary: SummaryData | null;
  loading: boolean;
  transactions: Transaction[];
  categories: CategoryConfig[];
  hasTransactions: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const totalExpenses = data.totalExpenses;
    const percentage = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(0) : 0;
    return (
      <div className="bg-slate-900 text-white p-2 rounded-lg shadow-lg text-sm">
        <p>{`${data.category}: ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${percentage}%)`}</p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ summary, loading, transactions, categories, hasTransactions }) => {
  const formatCurrency = (value: number | undefined | null, useCents = false) => {
    const safeValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
    return (useCents ? safeValue / 100 : safeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getCategoryIcon = (categoryName: string | null) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? <span className="text-lg">{category.icon}</span> : <div className="w-4 h-4 bg-slate-200 rounded-md" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600" />
        <p>A IA está analisando suas finanças...</p>
      </div>
    );
  }
  
  const numbers = summary?.numbers || {};
  const totalIncome = numbers.total_income ?? 0;
  const totalExpense = numbers.total_expense ?? 0;
  const balance = numbers.balance ?? 0;
  
  const categoryData = useMemo(() => {
    if (!summary || !summary.categories) return [];
    return summary.categories
      .filter(c => c.amount > 0)
      .map(c => ({
        category: c.category,
        amount: c.amount,
        totalExpenses: totalExpense,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [summary, totalExpense]);

  if (transactions.length === 0) {
      const monthLabel = summary?.period_label || 'este mês';
    return (
         <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4"> <Wallet className="w-8 h-8 text-slate-400" /> </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Sem dados para {monthLabel}</h3>
            <p className="text-slate-500 mb-6 max-w-md"> Adicione suas primeiras transações neste mês para que o sistema gere relatórios. </p>
          </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2"> <span className="text-slate-500 text-sm font-medium">Receitas</span> <div className="p-2 bg-emerald-50 rounded-full"> <TrendingUp className="w-4 h-4 text-emerald-600" /> </div> </div>
          <p className="text-2xl font-bold text-slate-900"> {formatCurrency(totalIncome)} </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2"> <span className="text-slate-500 text-sm font-medium">Despesas</span> <div className="p-2 bg-red-50 rounded-full"> <TrendingDown className="w-4 h-4 text-red-600" /> </div> </div>
          <p className="text-2xl font-bold text-slate-900"> {formatCurrency(totalExpense)} </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2"> <span className="text-slate-500 text-sm font-medium">Saldo</span> <div className="p-2 bg-blue-50 rounded-full"> <Wallet className="w-4 h-4 text-blue-600" /> </div> </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}> {formatCurrency(balance)} </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-3">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Últimas Movimentações</h3>
           <div className="space-y-3">
             {transactions.slice(0, 7).map(t => (
               <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-lg"> {getCategoryIcon(t.category)} </div>
                   <div> <p className="font-semibold text-sm text-slate-800">{t.description}</p> <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p> </div>
                 </div>
                 <div className={`flex items-center gap-1 text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                   {t.type === 'income' ? <ArrowUpCircle className="w-4 h-4 opacity-70"/> : <ArrowDownCircle className="w-4 h-4 opacity-70"/>}
                   {formatCurrency(t.amount_cents, true)}
                 </div>
               </div>
             ))}
             {transactions.length === 0 && ( <div className="flex flex-col items-center justify-center py-10 text-slate-400"> <Inbox className="w-8 h-8 mb-2" /> <p>Nenhuma transação este mês.</p> </div> )}
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Gastos por Categoria</h3>
          <div className="h-48 w-full relative">
            {categoryData.length > 0 ? (
              <>
                 <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="amount" stroke="none">
                      {categoryData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-xl font-bold text-slate-800">{formatCurrency(totalExpense)}</span>
                </div>
              </>
            ) : ( <div className="w-full h-full flex items-center justify-center text-slate-400"> <p>Sem despesas para exibir.</p> </div> )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
