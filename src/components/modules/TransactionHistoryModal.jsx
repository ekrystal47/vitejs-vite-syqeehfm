import React, { useMemo } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, History, Filter } from 'lucide-react';
import { Money } from '../../lib/finance';

const TransactionHistoryModal = ({ isOpen, onClose, transactions, filterId, itemName }) => {
  if (!isOpen) return null;

  // Filter transactions if looking at a specific item
  const displayData = useMemo(() => {
    let data = [...transactions];
    if (filterId && filterId !== 'global') {
      data = data.filter(t => t.itemId === filterId);
    }
    // Sort Newest First
    return data.sort((a, b) => new Date(b.createdAt?.seconds * 1000 || b.date) - new Date(a.createdAt?.seconds * 1000 || a.date));
  }, [transactions, filterId]);

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <History className="text-emerald-500" /> 
              {itemName ? `History: ${itemName}` : 'Recent Activity'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {itemName ? 'Audit trail for this specific bucket.' : 'Global log of all financial actions.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {displayData.length === 0 && (
            <div className="text-center py-10 text-slate-400 italic">
              No records found. Start spending!
            </div>
          )}

          {displayData.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${t.amount < 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {t.amount < 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">{t.itemName || 'Unknown Item'}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                     {new Date(t.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()} 
                     <span className="opacity-50">•</span> 
                     {t.type}
                  </div>
                </div>
              </div>
              <div className={`font-bold ${t.amount < 0 ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600'}`}>
                {t.amount > 0 ? '+' : ''}{Money.format(t.amount)}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TransactionHistoryModal;