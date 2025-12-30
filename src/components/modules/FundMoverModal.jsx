import React, { useState, useMemo } from 'react';
import { X, ArrowRight, ArrowDown, Wallet, PiggyBank, ArrowLeftRight, Check, AlertTriangle, Building2, CreditCard } from 'lucide-react';
import { Money } from '../../lib/finance';

const FundMoverModal = ({ isOpen, onClose, expenses, accounts, onTransfer }) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('');

  // 1. Filter Eligible Buckets (Variable & Savings only)
  // We sort by balance descending so "rich" buckets are at the top
  const buckets = useMemo(() => 
    expenses
        .filter(e => (e.type === 'variable' || e.type === 'savings') && !e.deletedAt)
        .sort((a,b) => (b.currentBalance || 0) - (a.currentBalance || 0)), 
  [expenses]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceId || !targetId || !amount || sourceId === targetId) return;
    
    // Send to App.jsx logic
    onTransfer(sourceId, targetId, Money.toCents(amount));
    
    // Reset & Close
    onClose();
    setSourceId(''); 
    setTargetId(''); 
    setAmount('');
  };

  const sourceItem = buckets.find(b => b.id === sourceId);
  const targetItem = buckets.find(b => b.id === targetId);
  const transferAmount = Money.toCents(amount);

  // --- LOGIC: RESOLVE ACTUAL CASH LOCATION ---
  const resolveCashAccount = (bucket) => {
    if (!bucket?.accountId) return null;
    const directAccount = accounts.find(a => a.id === bucket.accountId);
    
    if (!directAccount) return null;

    // If it's a Credit Card, find the "Backing" Checking Account
    if (directAccount.type === 'credit' && directAccount.linkedAccountId) {
        const backingAccount = accounts.find(a => a.id === directAccount.linkedAccountId);
        return backingAccount || directAccount; // Fallback to direct if backing not found
    }

    return directAccount;
  };

  const sourceCashAcc = resolveCashAccount(sourceItem);
  const targetCashAcc = resolveCashAccount(targetItem);
  
  // Logic: Do these buckets live in different PHYSICAL places?
  const isDifferentBank = sourceCashAcc && targetCashAcc && sourceCashAcc.id !== targetCashAcc.id;

  // Helper to show if it's credit
  const getAccountLabel = (bucket) => {
      const acc = accounts.find(a => a.id === bucket?.accountId);
      if(!acc) return 'Unknown';
      if(acc.type === 'credit') return `${acc.name} (Credit)`;
      return acc.name;
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 rounded-t-3xl">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="text-indigo-500" /> Reallocate Funds
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          
          {/* FROM SECTION */}
          <div className={`p-4 rounded-2xl border-2 transition-colors ${sourceId ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Move From (Source)</label>
            <select 
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-indigo-500"
            >
              <option value="">Select Bucket...</option>
              {buckets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({Money.format(b.currentBalance)})
                </option>
              ))}
            </select>
            {sourceItem && (
               <div className="mt-2 flex justify-between items-center">
                 <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    {getAccountLabel(sourceItem).includes('Credit') ? <CreditCard size={10}/> : <Building2 size={10} />}
                    {getAccountLabel(sourceItem)}
                 </span>
                 <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                   Available: {Money.format(sourceItem.currentBalance)}
                 </div>
               </div>
            )}
          </div>

          {/* ARROW & AMOUNT INPUT */}
          <div className="flex items-center justify-center gap-4 relative">
             <div className="h-full absolute w-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
             <div className="bg-white dark:bg-slate-900 p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400">
                <ArrowDown size={20} />
             </div>
             <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 text-center font-bold text-xl rounded-xl border-2 border-indigo-100 dark:border-slate-700 focus:border-indigo-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                />
             </div>
          </div>

          {/* TO SECTION */}
          <div className={`p-4 rounded-2xl border-2 transition-colors ${targetId ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Move To (Destination)</label>
            <select 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-emerald-500"
            >
              <option value="">Select Bucket...</option>
              {buckets.filter(b => b.id !== sourceId).map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({Money.format(b.currentBalance)})
                </option>
              ))}
            </select>
            {targetItem && (
               <div className="mt-2 flex justify-between items-center">
                 <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    {getAccountLabel(targetItem).includes('Credit') ? <CreditCard size={10}/> : <Building2 size={10} />}
                    {getAccountLabel(targetItem)}
                 </span>
                 {amount && (
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                      New Balance: {Money.format((targetItem.currentBalance || 0) + transferAmount)}
                    </div>
                 )}
               </div>
            )}
          </div>

          {/* BANK WARNING / INFO */}
          {sourceItem && targetItem && (
             <div className={`p-3 rounded-xl flex gap-3 ${isDifferentBank ? 'bg-orange-50 border border-orange-100 text-orange-800' : 'bg-slate-50 border border-slate-100 text-slate-500'}`}>
               <div className="shrink-0 pt-0.5">
                 {isDifferentBank ? <AlertTriangle size={18} className="text-orange-500"/> : <Check size={18} className="text-slate-400"/>}
               </div>
               <div>
                 <div className="text-xs font-bold uppercase mb-1">
                   {isDifferentBank ? 'Bank Transfer Required' : 'Internal Adjustment Only'}
                 </div>
                 <div className="text-xs opacity-90 leading-relaxed">
                   {isDifferentBank 
                     ? <span>Move <strong>{Money.format(transferAmount || 0)}</strong> from <strong>{sourceCashAcc?.name}</strong> to <strong>{targetCashAcc?.name}</strong>.</span>
                     : "Both buckets are reserved in the same bank account. No transfer needed."
                   }
                 </div>
               </div>
             </div>
          )}

          {/* SUBMIT */}
          <button 
            type="submit"
            disabled={!sourceId || !targetId || !amount}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Check size={20} /> Confirm Reallocation
          </button>

        </form>
      </div>
    </div>
  );
};

export default FundMoverModal;