import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Check } from 'lucide-react';
import { Money } from '../../lib/finance';

const QuickLogModal = ({ isOpen, onClose, expenses, onLogSpend }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [amount, setAmount] = useState('');
  const inputRef = useRef(null);

  // Filter for Variable Buckets only
  const buckets = expenses.filter(e => e.type === 'variable' && !e.deletedAt);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setAmount('');
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-focus input when a bucket is selected
    if (selectedId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedId || !amount) return;
    
    // Send to parent
    onLogSpend(selectedId, Money.toCents(amount));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* UPDATED: Changed max-w-lg to max-w-4xl for a wider view */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 rounded-t-3xl">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" /> Speed Log
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {!selectedId ? (
            /* UPDATED: Added md:grid-cols-4 to utilize the new width */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {buckets.map(b => (
                <button 
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group text-left flex flex-col justify-between min-h-[100px]"
                >
                  <div className="font-bold text-lg text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 break-words leading-tight">
                    {b.name}
                  </div>
                  <div className="text-xs text-slate-400 font-bold mt-2">
                    {Money.format(b.currentBalance)}
                  </div>
                </button>
              ))}
              {buckets.length === 0 && <p className="col-span-full text-center text-slate-400 italic py-10">No variable buckets found.</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-8 animate-in slide-in-from-right-4 duration-200 py-6">
               <div className="text-center">
                 <div className="text-sm font-bold text-slate-400 uppercase mb-2">Logging spend for</div>
                 <h3 className="text-3xl font-bold text-slate-800 dark:text-white">
                   {buckets.find(b => b.id === selectedId)?.name}
                 </h3>
               </div>

               <div className="relative max-w-xs mx-auto">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-300">$</span>
                 <input 
                   ref={inputRef}
                   type="number" 
                   step="0.01"
                   value={amount}
                   onChange={e => setAmount(e.target.value)}
                   className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-4xl font-bold text-center text-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                   placeholder="0.00"
                 />
               </div>

               <div className="flex gap-4">
                 <button 
                   type="button" 
                   onClick={() => setSelectedId(null)}
                   className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                 >
                   Back
                 </button>
                 <button 
                   type="submit"
                   className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 transition-transform active:scale-95 text-lg"
                 >
                   <Check size={24} /> Log It
                 </button>
               </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickLogModal;