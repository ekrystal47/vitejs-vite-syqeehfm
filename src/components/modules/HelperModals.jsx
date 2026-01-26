import React, { useState, useEffect, useMemo } from 'react';
import { X, Calculator, PiggyBank, Flame, RotateCcw, AlertOctagon, CheckCircle2, Info, ArrowRight, ListChecks, Check, Trash2, ExternalLink, Calendar, Wallet, Plus, Minus, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { MoneyInput } from '../ui/Forms';
import { Money, getTodayStr, getNextDateStr } from '../../lib/finance';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'; 
import { db, auth } from '../../lib/firebase'; 

// 1. Toast Container
export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-24 right-4 z-[200] space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-10 pointer-events-auto ${t.type === 'error' ? 'bg-white border-red-200 text-red-600' : 'bg-slate-900 text-white border-slate-700'}`}>
        {t.type === 'error' ? <AlertOctagon size={18}/> : <CheckCircle2 size={18} className="text-emerald-400"/>}
        <span className="text-sm font-bold">{t.message}</span>
        <button onClick={() => removeToast(t.id)}><X size={14} className="opacity-50 hover:opacity-100"/></button>
      </div>
    ))}
  </div>
);

// 2. Adjustment Modal
export const AdjustmentModal = ({ isOpen, onClose, item, onConfirm, actionLabel = "Confirm" }) => {
    const [amount, setAmount] = useState(0); 
    
    useEffect(() => {
        if(item) {
            setAmount(item.amount || 0); 
        }
    }, [item]);

    const handleConfirm = () => {
        const dollarString = (amount / 100).toFixed(2);
        onConfirm(item, dollarString);
        onClose();
    };

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
             <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Confirm Payment</h3>
                <p className="text-sm text-slate-500 mb-4">Did the amount for <strong>{item.name}</strong> change?</p>
                
                <div className="mb-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount Paid</label>
                    <MoneyInput value={amount} onChange={setAmount} />
                </div>
                
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold">Cancel</button>
                    <button onClick={handleConfirm} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">{actionLabel}</button>
                </div>
             </div>
        </div>
    );
};

// 3. Confirmation Modal
export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, actionLabel }) => {
  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-3 text-white rounded-xl font-bold ${actionLabel === 'Delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{actionLabel}</button>
        </div>
      </div>
    </div>
  );
};

// 4. Daily Audit (UPDATED FILTERS)
export const DailyAuditModal = ({ isOpen, onClose, accounts, updateAccount, expenses = [], onClear, onMarkPaid, updateExpense, onPayDebt }) => {
  const [step, setStep] = useState(1); 
  const [balances, setBalances] = useState({});
  const [calcData, setCalcData] = useState({});
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null); 
  const today = getTodayStr();
  
  const pendingItems = useMemo(() => {
      return expenses.filter(e => {
          if (e.splitConfig?.isOwedOnly) return false; 
          
          if (e.isPaid && !e.isCleared) return true;
          if (e.type === 'debt' && (e.pendingPayment || 0) > 0) return true;
          
          return false;
      });
  }, [expenses]);

  const dueItems = useMemo(() => {
      return expenses.filter(e => {
          // --- FILTER: HIDE FROM AUDIT ---
          if (e.splitConfig?.isOwedOnly) return false; 
          if (e.isPaid) return false;
          if (e.excludeFromPayday) return false; // Hide Pre-tax
          if (e.type === 'savings') return false; // Hide Savings (Handled by Payday)
          if (e.type === 'variable') return false; // Hide Buckets (Handled by Log)
          // Hide Debt unless allocated
          if (e.type === 'debt' && (e.amount || 0) <= 0) return false;

          const d = e.date || e.dueDate || e.nextDate;
          return d && d <= today;
      });
  }, [expenses, today]);

  const upcomingItems = useMemo(() => {
      const list = [];
      expenses.forEach(e => {
          if (e.splitConfig?.isOwedOnly) return;
          if (e.excludeFromPayday) return;
          if (e.type === 'savings') return;
          if (e.type === 'variable') return;
          if (e.type === 'debt' && (e.amount || 0) <= 0) return;
          
          let targetDate = e.date || e.dueDate || e.nextDate;
          if (!targetDate) return;

          let isFutureAllocated = false;

          if (e.isPaid && !e.isCleared) {
              const nextD = getNextDateStr(targetDate, e.frequency);
              if (nextD > today) {
                  targetDate = nextD;
                  isFutureAllocated = true;
              } else {
                  return; 
              }
          } else if (e.isPaid) {
              return;
          }

          if (targetDate > today) {
              list.push({ 
                  ...e, 
                  date: targetDate, 
                  dueDate: targetDate,
                  _isFutureAllocated: isFutureAllocated 
              });
          }
      });
      return list.sort((a,b) => (a.date||a.dueDate).localeCompare(b.date||b.dueDate));
  }, [expenses, today]);

  const variableWallets = useMemo(() => {
      // Variable items WITHOUT dates go here (pure buckets)
      return expenses.filter(e => e.type === 'variable' && !e.splitConfig?.isOwedOnly && !e.date && !e.dueDate && !e.nextDate && !e.excludeFromPayday);
  }, [expenses]);

  const auditAccounts = useMemo(() => {
    if(!accounts) return [];
    return accounts.filter(a => ['checking', 'savings', 'credit', 'loan'].includes(a.type));
  }, [accounts]);

  useEffect(() => {
    if(isOpen) {
        setStep(1); 
        setShowUpcoming(false);
        const initial = {};
        auditAccounts.forEach(a => initial[a.id] = a.currentBalance || 0);
        setBalances(initial);
    }
  }, [isOpen]); 

  if(!isOpen) return null;

  const handleLogSpend = (id, amountStr) => {
      const val = Money.toCents(amountStr);
      if (val > 0) updateExpense(id, 'spent', val);
  };
  const handleAddFunds = (id, amountStr) => {
      const val = Money.toCents(amountStr);
      if (val > 0) updateExpense(id, 'addedFunds', val);
  };

  const handleCalcChange = (accId, field, val) => {
    setCalcData(prev => {
      const current = prev[accId] || { posted: 0, pendingCharges: 0, pendingPayments: 0 };
      const newData = { ...current, [field]: val };
      const posted = newData.posted || 0;
      const charges = newData.pendingCharges || 0;
      const payments = newData.pendingPayments || 0;
      const acc = auditAccounts.find(a => a.id === accId);
      let result = 0;
      if (acc && (acc.type === 'credit' || acc.type === 'loan')) {
        result = posted - charges + payments;
      } else {
        result = posted - charges - payments;
      }
      setBalances(prevBal => ({ ...prevBal, [accId]: result }));
      return { ...prev, [accId]: newData };
    });
  };

  const handleSaveAll = async () => {
    auditAccounts.forEach(a => {
      const entered = balances[a.id] || 0;
      updateAccount(a.id, 'currentBalance', entered);
    });

    if (auth.currentUser) {
      const totalCash = auditAccounts.reduce((sum, a) => {
          if (['checking', 'savings', 'cash'].includes(a.type)) return sum + (balances[a.id] || 0);
          return sum;
      }, 0);
      const netWorth = auditAccounts.reduce((sum, a) => sum + (balances[a.id] || 0), 0);
      try {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'history_snapshots'), {
          date: new Date().toISOString().split('T')[0], 
          totalLiquid: totalCash,
          netWorth: netWorth,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to save snapshot", e);
      }
    }
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800">
        
        <div className="flex justify-between items-center mb-6">
          <div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Daily Audit</h3>
              <p className="text-sm text-slate-400">{step === 1 ? 'Action Items' : 'Verify Balances'}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-500"/></button>
        </div>

        {/* STEP 1: ACTIONS */}
        {step === 1 && (
            <div className="flex-grow overflow-auto px-1 custom-scrollbar space-y-6">
                
                {/* 1. PENDING CLEARANCE */}
                {pendingItems.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-blue-500 uppercase mb-2 flex items-center gap-2"><Info size={14}/> Pending Clearance</h4>
                        <div className="space-y-2">
                            {pendingItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                        <div className="text-xs text-blue-600 dark:text-blue-300">
                                            {Money.format(item.type === 'debt' ? item.pendingPayment : item.amount)} 
                                            <span className="opacity-50 ml-1">In Transit</span>
                                        </div>
                                    </div>
                                    <button onClick={() => onClear(item)} className="px-3 py-1.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 font-bold text-xs rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm hover:bg-blue-50">
                                        Clear
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. DUE ITEMS */}
                {dueItems.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Calendar size={14}/> Due Now</h4>
                        <div className="space-y-2">
                            {dueItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {Money.format(item.amount)} • Due {item.date || item.dueDate}
                                        </div>
                                    </div>
                                    {item.type === 'debt' ? (
                                        <button onClick={() => onPayDebt(item)} className="px-3 py-1.5 bg-orange-500 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-orange-600">
                                            Pay Card
                                        </button>
                                    ) : (
                                        <button onClick={() => setAdjustItem(item)} className="px-3 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-emerald-600">
                                            Mark Paid
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. UPCOMING (Collapsible) */}
                {upcomingItems.length > 0 && (
                    <div>
                        <button onClick={() => setShowUpcoming(!showUpcoming)} className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-2 hover:text-slate-600 dark:hover:text-slate-200">
                            <span className="flex items-center gap-2"><ListChecks size={14}/> Upcoming ({upcomingItems.length})</span>
                            {showUpcoming ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </button>
                        
                        {showUpcoming && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                {upcomingItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100 transition-opacity">
                                        <div>
                                            <div className="font-bold text-slate-700 dark:text-slate-300">{item.name}</div>
                                            <div className="text-xs text-slate-500">
                                                {Money.format(item.amount)} • {item.date || item.dueDate}
                                            </div>
                                        </div>
                                        <button onClick={() => setAdjustItem(item)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-lg hover:bg-emerald-500 hover:text-white transition-colors">
                                            Pay Early
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. VARIABLE WALLETS (No Date) */}
                {variableWallets.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Wallet size={14}/> Manage Wallets</h4>
                        <div className="space-y-2">
                            {variableWallets.map(item => (
                                <div key={item.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</div>
                                        <div className="text-xs font-bold text-emerald-600">{Money.format(item.currentBalance)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex gap-1">
                                            <input type="number" id={`audit-add-${item.id}`} placeholder="Add" className="w-full p-1 text-xs rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white" onWheel={(e) => e.target.blur()} />
                                            <button onClick={() => handleAddFunds(item.id, document.getElementById(`audit-add-${item.id}`).value)} className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Plus size={14}/></button>
                                        </div>
                                        <div className="flex gap-1">
                                            <input type="number" id={`audit-spd-${item.id}`} placeholder="Spend" className="w-full p-1 text-xs rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white" onWheel={(e) => e.target.blur()} />
                                            <button onClick={() => handleLogSpend(item.id, document.getElementById(`audit-spd-${item.id}`).value)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><Minus size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* STEP 2: BALANCES */}
        {step === 2 && (
            <div className="space-y-4 flex-grow overflow-auto px-1 custom-scrollbar animate-in slide-in-from-right-4">
            {auditAccounts.map(acc => {
                const isCredit = acc.type === 'credit' || acc.type === 'loan';
                const showCalc = calcData[acc.id] !== undefined;
                return (
                <div key={acc.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{acc.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{acc.type}</span>
                        <button onClick={() => setCalcData(prev => ({...prev, [acc.id]: prev[acc.id] ? undefined : {}}))} className="p-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-500 hover:text-indigo-500"><Calculator size={14}/></button>
                    </div>
                    </div>
                    {showCalc && (
                    <div className="space-y-2 mb-4 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[9px] uppercase font-bold text-slate-400">Posted Bal</label><MoneyInput value={calcData[acc.id]?.posted} onChange={v => handleCalcChange(acc.id, 'posted', v)} onWheel={(e) => e.target.blur()} /></div>
                        <div><label className="text-[9px] uppercase font-bold text-slate-400">Pending Charges</label><MoneyInput value={calcData[acc.id]?.pendingCharges} onChange={v => handleCalcChange(acc.id, 'pendingCharges', v)} onWheel={(e) => e.target.blur()} /></div>
                        </div>
                        <div><label className="text-[9px] uppercase font-bold text-slate-400">Pending Payments</label><MoneyInput value={calcData[acc.id]?.pendingPayments} onChange={v => handleCalcChange(acc.id, 'pendingPayments', v)} onWheel={(e) => e.target.blur()} /></div>
                        <div className="text-[10px] text-center text-indigo-500 font-bold">Auto-Calculating True Balance...</div>
                    </div>
                    )}
                    <MoneyInput value={balances[acc.id]} onChange={(val) => setBalances({...balances, [acc.id]: val})} onWheel={(e) => e.target.blur()} />
                </div>
                )})}
            </div>
        )}

        {/* FOOTER BUTTONS */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            {step === 1 ? (
                <button onClick={() => setStep(2)} className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                    Next: Verify Balances <ArrowRight size={20}/>
                </button>
            ) : (
                <button onClick={handleSaveAll} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg">
                    Confirm & Finish
                </button>
            )}
        </div>

      </div>
    </div>
    
    <AdjustmentModal 
        isOpen={!!adjustItem} 
        onClose={() => setAdjustItem(null)} 
        item={adjustItem} 
        onConfirm={(item, amt) => onMarkPaid(item.id, 'isPaid', true, amt)} 
        actionLabel="Confirm & Mark Paid"
    />
    </>
  );
};

// ... (CycleEnd, CreditPayment, SafeToSpend, PartnerIncomeBreakdown) ...
// (I will omit the full re-paste of these smaller modals unless you need them, they are unchanged except for scroll safety which is minor)

export const CycleEndModal = ({ isOpen, onClose, expense, savingsGoals, debts, updateExpense }) => {
  const [action, setAction] = useState(null);
  const [targetId, setTargetId] = useState('');
  if (!isOpen || !expense) return null;
  const leftover = Math.max(0, expense.currentBalance || 0);

  const handleExecute = () => {
    if (action === 'sweep' && targetId) {
      const goal = savingsGoals.find(g => g.id === targetId);
      if (goal) updateExpense(goal.id, 'currentBalance', (goal.currentBalance || 0) + leftover);
    }
    if (action === 'snowball' && targetId) {
      const debt = debts.find(d => d.id === targetId);
      if (debt) updateExpense(debt.id, 'totalDebtBalance', Math.max(0, (debt.totalDebtBalance || 0) - leftover));
    }
    let newBalance = expense.currentBalance || 0;
    if (action === 'sweep' || action === 'snowball') { newBalance -= leftover; }
    updateExpense(expense.id, 'currentBalance', newBalance);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Cycle Complete</h3>
          <p className="text-slate-500">You have <strong className="text-emerald-600">{Money.format(leftover)}</strong> remaining.</p>
        </div>
        <div className="space-y-3 mb-6">
          <button onClick={() => setAction('sweep')} className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${action === 'sweep' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><PiggyBank size={20}/></div>
            <div className="text-left"><div className="font-bold text-slate-800 dark:text-white">Sweep to Savings</div><div className="text-[10px] text-slate-400">Move to a goal</div></div>
          </button>
          {debts.length > 0 && (
            <button onClick={() => setAction('snowball')} className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${action === 'snowball' ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Flame size={20}/></div>
              <div className="text-left"><div className="font-bold text-slate-800 dark:text-white">Snowball Debt</div><div className="text-[10px] text-slate-400">Pay down smallest debt</div></div>
            </button>
          )}
          <button onClick={() => setAction('rollover')} className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${action === 'rollover' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><RotateCcw size={20}/></div>
            <div className="text-left"><div className="font-bold text-slate-800 dark:text-white">Rollover</div><div className="text-[10px] text-slate-400">Keep for next month</div></div>
          </button>
        </div>
        {(action === 'sweep' || action === 'snowball') && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Select Target</label>
            <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-none" onChange={e => setTargetId(e.target.value)} value={targetId}>
              <option value="">Select...</option>
              {action === 'sweep' ? savingsGoals.map(g => <option key={g.id} value={g.id}>{g.name}</option>) : debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={handleExecute} disabled={!action || ((action === 'sweep' || action === 'snowball') && !targetId)} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold disabled:opacity-50">Confirm Cycle End</button>
      </div>
    </div>
  );
};

export const CreditPaymentModal = ({ isOpen, onClose, account, onPay, accounts }) => {
  const [amount, setAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  useEffect(() => {
    if (account && account.linkedAccountId) setFromAccount(account.linkedAccountId);
  }, [account]);
  if(!isOpen || !account) return null;

  const handlePay = () => {
    if(!amount || !fromAccount) return;
    onPay(account.id, fromAccount, amount);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-lg mb-4 dark:text-white">Pay {account.name}</h3>
        <div className="space-y-4">
          <MoneyInput value={amount} onChange={setAmount} placeholder="Amount to Pay" onWheel={(e) => e.target.blur()}/>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pay From</label>
            <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none" value={fromAccount} onChange={e => setFromAccount(e.target.value)}>
              <option value="">Select Account...</option>
              {accounts.filter(a => a.type === 'checking' || a.type === 'savings').map(a => <option key={a.id} value={a.id}>{a.name} ({Money.format(a.currentBalance)})</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button>
          <button onClick={handlePay} disabled={!amount || !fromAccount} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">Confirm Payment</button>
        </div>
      </div>
    </div>
  );
};

export const SafeToSpendInfoModal = ({ isOpen, onClose, safeAmount, accountName }) => {
  if(!isOpen) return null;
  return (<div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={onClose}><div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800 dark:text-white">Real-Time Liquidity</h3><button onClick={onClose}><X size={20} className="text-slate-400"/></button></div><div className="space-y-4"><div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center border border-emerald-100 dark:border-emerald-800"><div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{Money.format(safeAmount)}</div><div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase mt-1">Safe To Spend</div></div><div className="text-sm text-slate-600 dark:text-slate-300"><p>This is the actual cash sitting in <strong>{accountName || 'Checking'}</strong> right now that is <strong>NOT</strong> reserved for any upcoming bills or savings goals.</p><br/><p className="text-xs text-slate-400">Unlike "Budget Remaining," this number is based on your real bank balance.</p></div></div></div></div>);
};

// 7. Reserved Breakdown
export const ReservedBreakdownModal = ({ isOpen, onClose, items, accountName, onMarkPaid, onClear, updateExpense }) => {
  const [adjustItem, setAdjustItem] = useState(null); 

  if(!isOpen) return null;

  const pendingItems = items.filter(i => i.isPending);
  const reservedItems = items.filter(i => !i.isPending);
  
  const totalReserved = reservedItems.reduce((sum, i) => sum + i.amount, 0);
  const totalPending = pendingItems.reduce((sum, i) => sum + i.amount, 0);

  const handleLogSpend = (id, amountStr) => {
    const val = Money.toCents(amountStr);
    if (val > 0) updateExpense(id, 'spent', val);
  };
  
  const handleAddFunds = (id, amountStr) => {
      const val = Money.toCents(amountStr);
      if (val > 0) updateExpense(id, 'addedFunds', val);
  };
  
  return (
    <>
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-4">
          <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Funds Breakdown</h3><p className="text-xs text-slate-500">{accountName}</p></div>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            
            {pendingItems.length > 0 && (
                <div className="animate-in slide-in-from-left-4">
                     <h4 className="text-xs font-bold text-blue-500 uppercase mb-2 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 z-10 py-1"><Info size={14}/> Pending Clearance ({Money.format(totalPending)})</h4>
                     <div className="space-y-2">
                        {pendingItems.map((item, idx) => (
                            <div key={`p-${idx}`} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                    <div className="text-[10px] text-blue-600 dark:text-blue-300">In Transit • {item.originalType}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 opacity-60">{Money.format(item.amount)}</span>
                                    <button onClick={() => onClear(item)} className="p-2 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm hover:scale-105 transition-transform" title="Clear / Finalize">
                                        <ExternalLink size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            )}

            {reservedItems.length > 0 && (
                <div className="animate-in slide-in-from-left-4 delay-75">
                    <h4 className="text-xs font-bold text-amber-500 uppercase mb-2 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 z-10 py-1"><PiggyBank size={14}/> Available / Reserved ({Money.format(totalReserved)})</h4>
                    <div className="space-y-2">
                        {reservedItems.map((item, idx) => {
                             const isPayable = ['bill', 'loan', 'subscription', 'debt'].includes(item.originalType);
                             const isVariable = item.originalType === 'variable';

                             return (
                                <div key={`r-${idx}`} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">{item.originalType} {item.date ? `• ${item.date}` : ''}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{Money.format(item.amount)}</span>
                                            
                                            {isPayable && (
                                                <button onClick={() => setAdjustItem(item)} className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors" title="Mark Paid">
                                                    <Check size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isVariable && (
                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <div className="flex gap-1">
                                                <input type="number" id={`res-add-${item.id}`} placeholder="Add" className="w-full p-1 text-xs rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white" onClick={e => e.stopPropagation()} onWheel={(e) => e.target.blur()} />
                                                <button onClick={() => handleAddFunds(item.id, document.getElementById(`res-add-${item.id}`).value)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Plus size={12}/></button>
                                            </div>
                                            <div className="flex gap-1">
                                                <input type="number" id={`res-spd-${item.id}`} placeholder="Spend" className="w-full p-1 text-xs rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white" onClick={e => e.stopPropagation()} onWheel={(e) => e.target.blur()} />
                                                <button onClick={() => handleLogSpend(item.id, document.getElementById(`res-spd-${item.id}`).value)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Minus size={12}/></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             );
                        })}
                    </div>
                </div>
            )}
            
            {items.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">No funds reserved in this account.</div>}
        </div>
        
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
             <div className="text-xs text-slate-400 font-bold uppercase">Total Withheld</div>
             <div className="font-black text-xl text-slate-800 dark:text-white">{Money.format(totalReserved + totalPending)}</div>
        </div>
      </div>
    </div>

    <AdjustmentModal 
        isOpen={!!adjustItem} 
        onClose={() => setAdjustItem(null)} 
        item={adjustItem} 
        onConfirm={(item, amt) => onMarkPaid(item.id, 'isPaid', true, amt)} 
        actionLabel="Confirm & Mark Paid"
    />
    </>
  );
};

export const PartnerIncomeBreakdownModal = ({ isOpen, onClose, partnerName, items, totalAnnual, payFrequency, perPaycheck }) => {
  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{partnerName}</h3>
            <p className="text-xs text-slate-500">Income Breakdown</p>
          </div>
          <button onClick={onClose}><X className="text-slate-400"/></button>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl mb-6 border border-indigo-100 dark:border-indigo-800 text-center">
          <span className="text-sm text-indigo-500 font-bold uppercase tracking-widest block mb-1">Due This Paycheck</span>
          <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{Money.format(perPaycheck)}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contributing Splits</h4>
          {items.map((item, idx) => {
             const totalOwed = item.amount;
             const contrib = item.currentBalance || 0; 
             const progress = totalOwed > 0 ? (contrib / totalOwed) * 100 : 0;

             return (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {item.name}
                                {item.isOwedOnly && <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">TRACKER</span>}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Info size={12}/> 
                                {item.paydaysInCycle} paydays in this cycle
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{Money.format(item.calculatedAmount)}</div>
                            <div className="text-[10px] text-slate-400">of {Money.format(item.amount)} Total Share</div>
                        </div>
                    </div>
                    
                    <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Cycle Progress</span>
                            <span>Due: {item.dueDate}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }}></div>
                        </div>
                    </div>
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};