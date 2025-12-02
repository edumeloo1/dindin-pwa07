
import React from 'react';
import { Transaction } from '../types';
import { Bell, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';

interface NotificationsProps {
  transactions: Transaction[];
}

const Notifications: React.FC<NotificationsProps> = ({ transactions }) => {
  const getAlerts = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Filter unpaid expenses due soon (assuming if it's in the list, it might be paid or not, 
    // but typically user adds future transactions as 'unpaid'. 
    // Since we don't have a 'paid' status field in the schema yet, 
    // we'll assume future dates are 'to pay')
    
    return transactions
      .filter(t => t.type === 'expense' || t.type === 'loan_payment')
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate >= today && tDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const alerts = getAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-slate-800">Alertas da Semana</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map(t => (
          <div key={t.id} className="bg-white border-l-4 border-amber-400 p-4 rounded-r-lg shadow-sm flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-800">{t.description}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Calendar className="w-3 h-3" />
                {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                {t.is_installment && <span className="text-purple-500 font-medium ml-1">(Parcela {t.installment_number}/{t.total_installments})</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">
                {(t.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <span className="text-xs text-amber-600 font-medium">A vencer</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
