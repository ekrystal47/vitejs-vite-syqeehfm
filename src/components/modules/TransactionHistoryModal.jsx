import React from 'react';
import { X, History, Check, RotateCcw } from 'lucide-react';
import { Money } from '../../lib/finance';

export default function TransactionHistoryModal({ isOpen, onClose, transactions, filterId, itemName, onUndo }) {
  if (!isOpen) return null;

  // Filter transactions based on the ID passed (if any)
  const filtered = filterId && filterId !== 'global'
    ? transactions.filter(t => t.itemId === filterId)
    : transactions;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><History size={20} className="text-slate-500"/></div>
             <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Transaction History</h3>
                {itemName && <p className="text-xs text-slate-500">For: {itemName}</p>}
             </div>
          </div>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
           {filtered.length === 0 && (
               <div className="text-center py-10 text-slate-400 text-sm">No transactions found.</div>
           )}

           {filtered.map(t => {
               const date = new Date(t.createdAt?.seconds * 1000);
               const isPositive = t.amount > 0;
               const canUndo = (t.type === 'bill_paid' || t.type === 'expense_cleared') && onUndo;

               return (
                   <div key={t.id} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-300 transition-colors group">
                       <div className="flex gap-3">
                           <div className={`p-2 rounded-full mt-1 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                               {t.type === 'bill_paid' ? <Check size={14}/> : (isPositive ? <RotateCcw size={14}/> : <History size={14}/>)}
                           </div>
                           <div>
                               <div className="font-bold text-slate-800 dark:text-white text-sm">{t.itemName || 'Transaction'}</div>
                               <div className="text-xs text-slate-500">{t.description}</div>
                               <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{date.toLocaleDateString()} • {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                           </div>
                       </div>
                       <div className="text-right">
                           <div className={`font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                               {isPositive ? '+' : ''}{Money.format(t.amount)}
                           </div>
                           
                           {/* UNDO BUTTON */}
                           {canUndo && (
                               <button 
                                   onClick={(e) => { e.stopPropagation(); onUndo(t.id, t); }} 
                                   className="mt-2 text-[10px] font-bold text-red-400 hover:text-red-600 hover:underline flex items-center justify-end gap-1 w-full"
                               >
                                   <RotateCcw size={10}/> Undo
                               </button>
                           )}
                       </div>
                   </div>
               );
           })}
        </div>

      </div>
    </div>
  );
}