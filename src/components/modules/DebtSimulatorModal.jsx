import React, { useState, useMemo, useEffect } from 'react';
import { X, TrendingDown, Calendar, DollarSign, Zap, ChevronRight, Settings, Eye, EyeOff } from 'lucide-react';
import { Money } from '../../lib/finance';

const DebtSimulatorModal = ({ isOpen, onClose, accounts, expenses }) => {
  const [extraPayment, setExtraPayment] = useState(0);
  const [strategy, setStrategy] = useState('snowball'); // 'snowball' (lowest bal) or 'avalanche' (highest int)
  const [simDebts, setSimDebts] = useState([]);

  // Initialize Debts based on Accounts & Linked Expenses
  useEffect(() => {
    if (isOpen) {
      const debtAccounts = accounts.filter(a => a.type === 'loan' || (a.type === 'credit' && a.currentBalance < 0));
      
      const mapped = debtAccounts.map(acc => {
        // Try to find the budgeted payment for this account
        const linkedExpense = expenses.find(e => 
            (e.type === 'debt' || e.type === 'bill') && 
            (e.accountId === acc.id || e.totalDebtBalance === acc.id)
        );

        // CONVERT FROM CENTS TO DOLLARS FOR SIMULATION
        // This fixes the "Funky Dollar Amounts" bug
        const balanceDollars = Math.abs(acc.currentBalance) / 100;
        
        // Default payment to 3% of balance if no expense found
        const paymentDollars = linkedExpense ? (linkedExpense.amount / 100) : Math.ceil(balanceDollars * 0.03); 
        
        return {
          id: acc.id,
          name: acc.name,
          balance: balanceDollars, 
          rate: 18.0, // Default APR guess
          minPayment: Math.max(25, paymentDollars), 
          isIncluded: true // Default to included
        };
      });
      
      setSimDebts(mapped);
      setExtraPayment(0);
    }
  }, [isOpen, accounts, expenses]);

  const updateDebt = (id, field, val) => {
    setSimDebts(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  // --- THE SIMULATION ENGINE ---
  const simulation = useMemo(() => {
    // 1. Filter out ignored debts
    const activeDebts = simDebts.filter(d => d.isIncluded);
    
    if (activeDebts.length === 0) return null;

    let queue = activeDebts.map(d => ({ ...d, currentBal: d.balance }));
    let totalInterest = 0;
    let months = 0;

    // Sort Queue based on Strategy
    const sortQueue = (q) => {
        return q.sort((a, b) => {
            if (a.currentBal <= 0) return 1; 
            if (b.currentBal <= 0) return -1;
            if (strategy === 'snowball') return a.balance - b.balance;
            return b.rate - a.rate;
        });
    };

    // Run Simulation Month by Month (Max 30 years)
    while (queue.some(d => d.currentBal > 0.01) && months < 360) {
      months++;
      let monthlySurplus = extraPayment; 

      // 1. Accrue Interest & Pay Minimums
      queue.forEach(d => {
        if (d.currentBal > 0) {
            const interest = (d.currentBal * (d.rate / 100)) / 12;
            totalInterest += interest;
            d.currentBal += interest;
            
            let pay = d.minPayment;
            if (d.currentBal < pay) pay = d.currentBal; 
            
            d.currentBal -= pay;
            
            // If debt paid off, roll min payment into surplus
            if (d.currentBal <= 0.01) {
                d.currentBal = 0;
                monthlySurplus += (d.minPayment - pay); 
                monthlySurplus += d.minPayment; 
            }
        } else {
            monthlySurplus += d.minPayment; 
        }
      });

      // 2. Apply Surplus to Target
      const targets = sortQueue([...queue]).filter(d => d.currentBal > 0);
      
      if (targets.length > 0) {
          let target = targets[0]; 
          const realTarget = queue.find(d => d.id === target.id);
          
          if (realTarget) {
              if (realTarget.currentBal <= monthlySurplus) {
                  monthlySurplus -= realTarget.currentBal;
                  realTarget.currentBal = 0;
              } else {
                  realTarget.currentBal -= monthlySurplus;
              }
          }
      }
    }

    const today = new Date();
    const payoffDate = new Date(today.getFullYear(), today.getMonth() + months, 1);

    return {
        months,
        totalInterest,
        payoffDate,
        isDebtFree: months < 360
    };

  }, [simDebts, extraPayment, strategy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Zap className="text-orange-500 fill-orange-500" /> Debt Destroyer
            </h2>
            <p className="text-xs text-slate-500 mt-1">Simulate extra payments to see the future.</p>
          </div>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white transition-colors" /></button>
        </div>

        {/* CONTROLS */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 dark:border-slate-800">
            {/* INPUTS */}
            <div className="space-y-6">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Monthly "Firepower" (Extra)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-8 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-xl outline-none focus:ring-2 ring-emerald-500 dark:text-white"
                            value={extraPayment}
                            onChange={(e) => setExtraPayment(Number(e.target.value))}
                        />
                    </div>
                    <input 
                        type="range" 
                        min="0" max="2000" step="50"
                        className="w-full mt-3 accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                        value={extraPayment}
                        onChange={(e) => setExtraPayment(Number(e.target.value))}
                    />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Strategy</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button onClick={() => setStrategy('snowball')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${strategy === 'snowball' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}>Snowball (Smallest First)</button>
                        <button onClick={() => setStrategy('avalanche')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${strategy === 'avalanche' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}>Avalanche (High Interest)</button>
                    </div>
                </div>
            </div>

            {/* RESULTS */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
                
                <div>
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Debt Free Date</div>
                    <div className="text-3xl font-bold text-emerald-400">
                        {simulation?.isDebtFree ? simulation.payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Never'}
                    </div>
                    <div className="text-slate-400 text-sm mt-1">In {Math.floor(simulation?.months / 12)} Years, {simulation?.months % 12} Months</div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                    <div>
                        <div className="text-slate-400 text-xs font-bold uppercase">Total Interest</div>
                        <div className="text-xl font-bold text-orange-400">{Money.format(simulation?.totalInterest * 100)}</div>
                    </div>
                </div>
            </div>
        </div>

        {/* DEBT LIST (Editable) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Settings size={14}/> Fine-tune your debt details</h3>
            <div className="space-y-3">
                {simDebts.map(debt => (
                    <div key={debt.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${debt.isIncluded ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700' : 'opacity-50 border-transparent bg-slate-100 dark:bg-slate-900'}`}>
                        
                        {/* TOGGLE VISIBILITY */}
                        <button 
                            onClick={() => updateDebt(debt.id, 'isIncluded', !debt.isIncluded)}
                            className={`p-2 rounded-lg transition-colors ${debt.isIncluded ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                            title={debt.isIncluded ? "Include in simulation" : "Exclude from simulation"}
                        >
                            {debt.isIncluded ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{debt.name}</div>
                            <div className="text-xs text-slate-400">Bal: {Money.format(debt.balance * 100)}</div>
                        </div>
                        
                        {debt.isIncluded && (
                            <>
                                <div className="w-20">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">APR %</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold dark:text-white"
                                        value={debt.rate}
                                        onChange={(e) => updateDebt(debt.id, 'rate', parseFloat(e.target.value))}
                                    />
                                </div>

                                <div className="w-24">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Min Pay</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold dark:text-white"
                                        value={debt.minPayment}
                                        onChange={(e) => updateDebt(debt.id, 'minPayment', parseFloat(e.target.value))}
                                    />
                                </div>
                            </>
                        )}
                        {!debt.isIncluded && (
                            <div className="text-xs font-bold text-slate-400 uppercase pr-4">Excluded</div>
                        )}
                    </div>
                ))}
                {simDebts.length === 0 && <div className="text-center text-slate-400 py-10">No active debts found to simulate.</div>}
            </div>
        </div>

      </div>
    </div>
  );
};

export default DebtSimulatorModal;