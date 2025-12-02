import React, { useState, useEffect } from 'react';
import { X, CalendarClock, AlertCircle, Plus, Edit } from 'lucide-react';
import { Transaction, TransactionType, Account, CategoryConfig } from '../types';

interface TransactionFormProps {
  onClose: () => void;
  onSave: (
    transactions: Omit<Transaction, 'id' | 'month_reference'>[], 
    updateMode?: 'single' | 'all-future' | 'renegotiate',
    renegotiateData?: { newTotalAmountCents: number; newInstallmentsCount: number }
  ) => void;
  initialData?: Transaction | null;
  accounts: Account[];
  categories: CategoryConfig[];
}

const getAccountTypeName = (type: Account['type']) => {
  switch (type) {
    case 'bank': return 'Conta';
    case 'credit_card': return 'Crédito';
    case 'cash': return 'Dinheiro';
    case 'pix': return 'Pix';
    default: return type;
  }
};

const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, onSave, initialData, accounts, categories }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
  
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('2');

  const [editStep, setEditStep] = useState<'initial' | 'prompt' | 'renegotiate'>('initial');
  const [renegotiateAmount, setRenegotiateAmount] = useState('');
  const [renegotiateInstallments, setRenegotiateInstallments] = useState('1');
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description.replace(/\s\(\d+\/\d+\)$/, ''));
      setAmount((initialData.amount_cents / 100).toFixed(2).replace('.', ','));
      setDate(initialData.date);
      setType(initialData.type);
      setCategory(initialData.category || '');
      setAccountId(initialData.account_id);
      setIsInstallment(!!initialData.is_installment);
      if (initialData.total_installments) {
        setTotalInstallments(initialData.total_installments.toString());
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !accountId) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    if (isEditMode && initialData?.is_installment && editStep === 'initial') {
      setEditStep('prompt');
      return;
    }
    
    processSubmit('single');
  };

  const processSubmit = (
    updateMode: 'single' | 'all-future' | 'renegotiate',
  ) => {
    const numericAmount = parseFloat(amount.replace(',', '.'));
    const amountCents = Math.round(numericAmount * 100);
    const transactionsToSave: any[] = [];
    
    let renegotiateData;
    if (updateMode === 'renegotiate') {
      const numericRenegotiateAmount = parseFloat(renegotiateAmount.replace(',', '.'));
      renegotiateData = {
        newTotalAmountCents: Math.round(numericRenegotiateAmount * 100),
        newInstallmentsCount: parseInt(renegotiateInstallments, 10),
      };
    }

    if (type === 'expense' && isInstallment && !isEditMode) {
      const installmentsCount = parseInt(totalInstallments);
      const installmentValueCents = Math.round(amountCents / installmentsCount);
      const installmentId = Date.now().toString();
      const startDate = new Date(date + "T12:00:00Z");

      for (let i = 0; i < installmentsCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setUTCMonth(startDate.getUTCMonth() + i);
        
        transactionsToSave.push({
          description: `${description} (${i + 1}/${installmentsCount})`, amount_cents: installmentValueCents, date: currentDate.toISOString().split('T')[0], type, category: category || null, account_id: accountId, nature: 'installment', is_installment: true, installment_id: installmentId, installment_number: i + 1, total_installments: installmentsCount, original_amount_cents: amountCents
        });
      }
    } else {
      transactionsToSave.push({
        description: isEditMode && initialData?.is_installment ? `${description} (${initialData.installment_number}/${initialData.total_installments})` : description, amount_cents: amountCents, date, type, category: category || null, account_id: accountId, nature: isEditMode ? initialData?.nature : (isInstallment ? 'installment' : null), is_installment: isInstallment, installment_id: initialData?.installment_id, installment_number: initialData?.installment_number, total_installments: initialData?.total_installments, original_amount_cents: isEditMode ? initialData?.original_amount_cents : (isInstallment ? amountCents : undefined)
      });
    }

    onSave(transactionsToSave, updateMode, renegotiateData);
    onClose();
  };

  const renderContent = () => {
    switch(editStep) {
      case 'prompt':
        return (
          <div className="p-6 space-y-6">
             <div className="bg-purple-50 p-4 rounded-lg flex gap-3 items-start">
               <AlertCircle className="w-6 h-6 text-purple-600 shrink-0" />
               <p className="text-sm text-purple-800">Esta é uma transação parcelada. Como deseja aplicar as alterações?</p>
             </div>
             <div className="space-y-3">
               <button onClick={() => processSubmit('single')} className="w-full p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition-colors"> <span className="block font-bold text-slate-800">Apenas esta parcela</span> <span className="text-xs text-slate-500">Alterar apenas a transação selecionada.</span> </button>
               <button onClick={() => processSubmit('all-future')} className="w-full p-4 border border-purple-200 bg-purple-50/50 rounded-lg hover:bg-purple-50 text-left transition-colors"> <span className="block font-bold text-purple-800">Atualizar futuras</span> <span className="text-xs text-purple-600">Aplicar descrição, valor e categoria para parcelas futuras.</span> </button>
               <button onClick={() => setEditStep('renegotiate')} className="w-full p-4 border border-amber-200 bg-amber-50/50 rounded-lg hover:bg-amber-50 text-left transition-colors"> <span className="block font-bold text-amber-800">Renegociar Saldo</span> <span className="text-xs text-amber-600">Recalcular o valor das parcelas futuras com base em um novo saldo.</span> </button>
             </div>
             <button onClick={() => setEditStep('initial')} className="w-full text-center text-slate-400 text-sm hover:text-slate-600">Voltar à Edição</button>
          </div>
        );
      case 'renegotiate':
        return (
           <div className="p-6 space-y-4">
             <h4 className="font-bold text-slate-800">Renegociar Saldo Restante</h4>
             <p className="text-sm text-slate-500">Informe o novo valor total que falta pagar e em quantas vezes ele será dividido a partir desta parcela.</p>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Novo Valor Total Restante (R$)</label>
                <input type="number" step="0.01" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: 1500,00" value={renegotiateAmount} onChange={(e) => setRenegotiateAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dividir em quantas parcelas?</label>
                <input type="number" min="1" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: 6" value={renegotiateInstallments} onChange={(e) => setRenegotiateInstallments(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                 <button onClick={() => setEditStep('prompt')} className="flex-1 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50">Voltar</button>
                 <button onClick={() => processSubmit('renegotiate')} className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600">Confirmar Renegociação</button>
              </div>
           </div>
        );
      case 'initial':
      default:
        return (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button type="button" onClick={() => { setType('expense'); if(!isEditMode) setIsInstallment(false); }} disabled={isEditMode} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${ type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700' } ${isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}>Despesa</button>
              <button type="button" onClick={() => { setType('income'); if(!isEditMode) setIsInstallment(false); }} disabled={isEditMode} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${ type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700' } ${isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}>Receita</button>
            </div>
            <div> <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label> <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder={type === 'expense' ? "Ex: Notebook" : "Ex: Salário"} value={description} onChange={(e) => setDescription(e.target.value)} /> </div>
            <div className="grid grid-cols-2 gap-4">
              <div> <label className="block text-sm font-medium text-slate-700 mb-1">{isInstallment && !isEditMode ? 'Valor Total (R$)' : 'Valor (R$)'}</label> <input type="text" pattern="[0-9]+([,\.][0-9]{1,2})?" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /> </div>
              <div> <label className="block text-sm font-medium text-slate-700 mb-1">{isInstallment && !isEditMode ? '1ª Parcela' : 'Data'}</label> <input type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={date} onChange={(e) => setDate(e.target.value)} /> </div>
            </div>
            <div> <label className="block text-sm font-medium text-slate-700 mb-1">Conta / Cartão</label> <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" value={accountId} onChange={(e) => setAccountId(e.target.value)}> {accounts.length === 0 ? <option>Crie uma conta nas configurações</option> : accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.name} ({getAccountTypeName(acc.type)})</option> ))} </select> </div>
            <div> <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label> <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" value={category} onChange={(e) => setCategory(e.target.value)}> <option value="">Selecione uma categoria...</option> {categories.filter(c => c.isVisible).map(cat => ( <option key={cat.id} value={cat.name}>{cat.name}</option>))} </select> </div>
            {type === 'expense' && !isEditMode && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2"> <input type="checkbox" id="installmentCheck" checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" /> <label htmlFor="installmentCheck" className="text-sm font-medium text-slate-700 flex items-center gap-1 cursor-pointer"> <CalendarClock className="w-4 h-4 text-slate-400" /> Compra Parcelada </label> </div>
                {isInstallment && (
                  <div className="mt-2 pl-6 animate-fade-in"> <label className="block text-xs text-slate-500 mb-1">Número de parcelas</label> <input type="number" min="2" max="60" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm" /> {amount && ( <p className="text-xs text-slate-400 mt-1">~ {parseInt(totalInstallments)}x de R$ {(parseFloat(amount.replace(',', '.'))/parseInt(totalInstallments)).toFixed(2)}</p> )} </div>
                )}
              </div>
            )}
            {isEditMode && isInstallment && ( <div className="bg-purple-50 border border-purple-100 p-2 rounded text-xs text-purple-700 flex items-center gap-2"> <CalendarClock className="w-4 h-4" /> Editando parcela {initialData?.installment_number} de {initialData?.total_installments} </div> )}
            <div className="pt-4"> <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"> {isEditMode ? 'Avançar' : (isInstallment ? `Gerar ${totalInstallments} Parcelas` : 'Salvar Transação')} </button> </div>
          </form>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">{isEditMode ? 'Editar Transação' : 'Nova Transação'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"> <X className="w-5 h-5 text-slate-500" /> </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default TransactionForm;
