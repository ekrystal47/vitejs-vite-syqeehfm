import React, { useState } from 'react';
import { X, Check, CreditCard, Wallet } from 'lucide-react';
import { Money } from '../../lib/finance';

const PayDebtModal = ({ isOpen, onClose, bucket, account, onConfirm }) => {
  const [amount, setAmount] = useState('');

  if (!isOpen || !bucket) return null;

  // Default to the full bucket balance (paying what you have reserved)
  // or the full debt balance, whichever is smaller.
  const maxPay = Math.min(bucket.currentBalance || 0, Math.abs(account?.currentBalance || 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    const cents = Money.toCents(amount);
    if (cents > 0) {
      onConfirm(bucket.id, cents);
      onClose();
      setAmount('');
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="text-emerald-500" /> Pay Card
          </h2>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* INFO CARD */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Reserved Cash:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{Money.format(bucket.currentBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Card Balance:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{Money.format(account?.currentBalance)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Payment Amount</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input 
                    type="number" step="0.01" autoFocus
                    className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xl outline-none focus:border-emerald-500 dark:text-white"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
            </div>
            <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setAmount((maxPay/100).toFixed(2))} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200">Max ({Money.format(maxPay)})</button>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2">
            <Check size={18} /> Confirm Payment
          </button>
        </form>
      </div>
    </div>
  );
};

export default PayDebtModal;