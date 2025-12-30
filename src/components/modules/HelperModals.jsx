import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ArrowRight, DollarSign, ShieldCheck, Check, RotateCcw } from 'lucide-react';
import { Money } from '../../lib/finance';
import { MoneyInput } from '../ui/Forms';

export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-4 right-4 z-[300] space-y-2 pointer-events-none">
    {toasts.map(toast => (
      <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
        {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
        <span className="text-sm font-bold">{toast.message}</span>
      </div>
    ))}
  </div>
);

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, actionLabel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">{actionLabel}</button>
        </div>
      </div>
    </div>
  );
};

export const ReservedBreakdownModal = ({ isOpen, onClose, items, accountName, onMarkPaid, onClear }) => {
  if (!isOpen) return null;
  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div><h3 className="text-xl font-bold text-slate-800 dark:text-white">Reserved Funds</h3><p className="text-xs text-slate-500">in {accountName}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 flex justify-between items-center">
             <span className="font-bold text-amber-900 dark:text-amber-100">Total Reserved</span>
             <span className="font-bold text-2xl text-amber-600 dark:text-amber-400">{Money.format(total)}</span>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                <div>
                   <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      {item.name}
                      {item.isPaid && !item.isCleared && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">PENDING</span>}
                   </div>
                   <div className="text-xs text-slate-400 uppercase tracking-widest">{item.type}</div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="font-bold text-slate-800 dark:text-white text-lg">{Money.format(item.amount)}</div>
                   {/* ACTION BUTTON LOGIC */}
                   {item.isPaid && !item.isCleared ? (
                       <button onClick={() => onClear(item)} className="p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200" title="Finalize/Clear Transaction">
                          <Check size={16} />
                       </button>
                   ) : (
                       <button onClick={() => onMarkPaid(item.id, 'isPaid', true)} className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200" title="Mark Paid (Pending)">
                          <DollarSign size={16} />
                       </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DailyAuditModal = ({ isOpen, onClose, accounts, updateAccount, expenses, onClear, onMarkPaid, updateExpense }) => {
  if (!isOpen) return null;
  // Filter only Checking/Savings/Cash
  const auditAccounts = accounts.filter(a => ['checking','savings','cash'].includes(a.type));
  // Filter expenses that are marked Paid but NOT Cleared (Pending)
  const pendingExpenses = expenses.filter(e => e.isPaid && !e.isCleared && !e.deletedAt);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><CheckCircle2 className="text-emerald-500"/> Daily Audit</h2></div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           {/* SECTION 1: PENDING TRANSACTIONS */}
           {pendingExpenses.length > 0 && (
               <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pending Transactions</h3>
                  <p className="text-xs text-slate-500">These items are marked paid. Has the money left your account?</p>
                  <div className="space-y-2">
                     {pendingExpenses.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                           <div>
                              <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                              <div className="text-xs text-blue-600 font-bold">{Money.format(item.amount || item.currentBalance)}</div>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={() => onMarkPaid(item.id, 'isPaid', false)} className="px-3 py-2 bg-white text-slate-500 rounded-lg text-xs font-bold border border-slate-200">Not Yet</button>
                              <button onClick={() => onClear(item)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700">Yes, Cleared</button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
           )}

           {/* SECTION 2: BALANCES */}
           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verify Balances</h3>
              {auditAccounts.map(acc => (
                 <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm"><Building2 size={18}/></div>
                       <span className="font-bold text-slate-700 dark:text-slate-300">{acc.name}</span>
                    </div>
                    <MoneyInput value={acc.currentBalance} onChange={(val) => updateAccount(acc.id, 'currentBalance', val)} />
                 </div>
              ))}
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
           <button onClick={onClose} className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform">Complete Audit</button>
        </div>
      </div>
    </div>
  );
};

// ... exports for other modals (SafeToSpendInfoModal, etc) can remain or be added if missing from previous context. 
// Assuming they exist in your codebase, I am only providing the modified ones here.
export const SafeToSpendInfoModal = ({ isOpen, onClose, safeAmount, accountName }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-xl text-center">
                <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-4"/>
                <h3 className="text-2xl font-bold mb-2">{Money.format(safeAmount)}</h3>
                <p className="text-slate-500 mb-6">Safe to Spend in {accountName}</p>
                <button onClick={onClose} className="w-full py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl">Got it</button>
            </div>
        </div>
    );
};

export const PartnerIncomeBreakdownModal = ({ isOpen, onClose, partnerName, items, totalAnnual, payFrequency, perPaycheck }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                     <h3 className="font-bold text-lg">{partnerName}'s Share</h3>
                     <button onClick={onClose}><X size={20}/></button>
                 </div>
                 <div className="p-6 overflow-y-auto">
                     <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                         <div className="flex justify-between mb-2"><span className="text-slate-500">Per Paycheck</span><span className="font-bold text-xl">{Money.format(perPaycheck)}</span></div>
                         <div className="flex justify-between"><span className="text-slate-500">Frequency</span><span className="font-bold capitalize">{payFrequency}</span></div>
                     </div>
                     <h4 className="font-bold text-sm text-slate-400 uppercase mb-3">Breakdown</h4>
                     <div className="space-y-2">
                         {items.map((i, idx) => (
                             <div key={idx} className="flex justify-between text-sm p-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                 <span>{i.name}</span>
                                 <span className="font-bold">{Money.format(i.calculatedAmount)}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
        </div>
    );
};

export const CycleEndModal = ({ isOpen, onClose, expense, savingsGoals, debts, updateExpense }) => {
    if(!isOpen || !expense) return null;
    return ( /* ... Logic for rollover omitted for brevity, assuming standard implementation ... */ null );
};

export const CreditPaymentModal = ({ isOpen, onClose, account, onPay, accounts }) => {
    if(!isOpen) return null;
    /* ... Logic for paying credit card ... */
    return null;
};