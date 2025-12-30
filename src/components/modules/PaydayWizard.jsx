import React, { useState, useEffect } from 'react';
import { Check, DollarSign, ArrowRight, X, Sparkles, Building2, CheckCircle2, ArrowRightLeft, Bot, AlertTriangle, MinusCircle, ChevronDown, ChevronUp, PlusCircle, ArrowDownRight, Info } from 'lucide-react';
import { Money, countPaydaysInWindow, getPreviousDateStr, getTodayStr, calculateDynamicAllocation } from '../../lib/finance';
import { MoneyInput } from '../ui/Forms'; 

const PaydayWizard = ({ isOpen, onClose, income, expenses, updateExpense, accounts, updateAccount, incomes }) => {
  const [step, setStep] = useState('confirm'); 
  const [allocations, setAllocations] = useState({});
  const [incomeAmount, setIncomeAmount] = useState(0);
  const [suggestions, setSuggestions] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [auditBalances, setAuditBalances] = useState({});
  const [expandedTransfer, setExpandedTransfer] = useState(null);
  const [shownExplanation, setShownExplanation] = useState(null); // Track which explanation to show

  useEffect(() => {
    if (isOpen && income) {
      setStep('confirm'); 
      setIncomeAmount(income.amount);
      setTransfers([]);
      setAuditBalances({});
      setExpandedTransfer(null);
      
      const newAllocations = {};
      const newSuggestions = {};
      const payDate = income.nextDate || getTodayStr();
      
      expenses.forEach(e => {
        if (e.splitConfig?.isOwedOnly) return;
        if (e.type === 'bill' && e.isPaid) return; 

        const isRevolvingSavings = e.type === 'savings' && (!e.targetBalance || e.targetBalance === 0);
        const isVariable = e.type === 'variable';
        
        if (isVariable || e.type === 'savings') {
             const dynamicAmount = calculateDynamicAllocation(e, income);
             newAllocations[e.id] = dynamicAmount;
             // Store Logic Reasoning
             newSuggestions[e.id] = { 
                 share: dynamicAmount, 
                 reason: `Contribution: ${Money.format(e.amount)} / ${e.frequency} (Scaled to Paycheck)`
             }; 
             return;
        }

        let target = e.amount;
        const current = e.currentBalance || 0;
        const gap = Math.max(0, target - current);

        if (gap === 0) return; 

        let share = 0;
        let reasoning = "Manual Entry";
        const dueDate = e.date || e.dueDate || e.nextDate;

        if (dueDate) {
            const prevDue = getPreviousDateStr(dueDate, e.frequency);
            const paydaysLeft = countPaydaysInWindow(prevDue, dueDate, payDate, income.frequency);
            share = Math.ceil(gap / (paydaysLeft || 1));
            reasoning = `Need ${Money.format(gap)} by ${dueDate} (${paydaysLeft} paydays left)`;
        } else {
            share = Math.ceil(gap / 2); 
            reasoning = "General Allocation (50% of gap)";
        }

        share = Math.min(share, income.amount); 
        newAllocations[e.id] = share;
        newSuggestions[e.id] = { share, reason: reasoning }; 
      });
      setAllocations(newAllocations);
      setSuggestions(newSuggestions);
    }
  }, [isOpen, income, expenses]);

  if (!isOpen || !income) return null;

  const handleAllocate = (id, amount) => {
    setAllocations(prev => ({ ...prev, [id]: Number(amount) }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remaining = incomeAmount - totalAllocated;

  const goToTransfers = () => { /* ...Same Logic as before... */ 
      // Re-implementing simplified logic here to save space, assuming previous logic persists 
      // or referencing context. I will keep the complex transfer logic hidden in this snippet 
      // unless specifically requested, but for functional completeness in response:
      // (The Transfer Logic is complex, so I will retain it fully below)
      
      const needs = {}; 
      const baseBreakdowns = {}; 
      Object.entries(allocations).forEach(([expId, amt]) => {
          if (amt <= 0) return;
          const exp = expenses.find(e => e.id === expId);
          if (!exp || !exp.accountId) return;
          let targetAccountId = exp.accountId;
          const account = accounts.find(a => a.id === targetAccountId);
          let isRedirected = false;
          if (account && account.type === 'credit' && account.linkedAccountId) { targetAccountId = account.linkedAccountId; isRedirected = true; }
          if (!needs[targetAccountId]) needs[targetAccountId] = 0;
          if (!baseBreakdowns[targetAccountId]) baseBreakdowns[targetAccountId] = [];
          needs[targetAccountId] += amt;
          baseBreakdowns[targetAccountId].push({ name: exp.name, amount: amt, type: 'expense', note: isRedirected ? `(for ${account.name})` : '' });
      });

      const payDateStr = income.nextDate || getTodayStr();
      const incomeOffsets = {}; 
      incomes.forEach(inc => {
          if (inc.id === income.id) return; 
          if (!inc.accountId) return;
          const incDate = inc.nextDate || getTodayStr();
          const isForced = inc.isDerived; 
          const diff = Math.abs(new Date(incDate) - new Date(payDateStr)) / (1000 * 60 * 60 * 24);
          if (isForced || diff <= 3) {
              if (!incomeOffsets[inc.accountId]) incomeOffsets[inc.accountId] = 0;
              incomeOffsets[inc.accountId] += inc.amount;
              if (!baseBreakdowns[inc.accountId]) baseBreakdowns[inc.accountId] = [];
              baseBreakdowns[inc.accountId].push({ name: `Less: ${inc.name}`, amount: -inc.amount, type: 'offset' });
          }
      });

      const depositAcctId = income.accountId;
      const finalTransfers = []; 
      Object.keys(needs).forEach(accId => {
          const expenseTotal = needs[accId];
          const offsetTotal = incomeOffsets[accId] || 0;
          const netNeed = Math.max(0, expenseTotal - offsetTotal);
          if (netNeed > 0) {
             let currentId = accId;
             let amountToMove = netNeed;
             let depth = 0;
             while (currentId !== depositAcctId && depth < 5) {
                 const targetAcc = accounts.find(a => a.id === currentId);
                 if (!targetAcc) break;
                 const sourceId = targetAcc.fundedFromId || depositAcctId;
                 let transfer = finalTransfers.find(t => t.fromId === sourceId && t.toId === currentId);
                 if (!transfer) {
                     transfer = { fromId: sourceId, toId: currentId, amount: 0, targetName: targetAcc.name, sourceName: accounts.find(a => a.id === sourceId)?.name || 'Deposit', isAuto: targetAcc.autoConfig?.isAuto || false, autoAmount: targetAcc.autoConfig?.amount || 0, breakdown: [] };
                     finalTransfers.push(transfer);
                 }
                 transfer.amount += amountToMove;
                 if (currentId === accId) { transfer.breakdown = [...transfer.breakdown, ...(baseBreakdowns[accId] || [])]; } 
                 else { transfer.breakdown.push({ name: `Flow to ${accounts.find(a => a.id === accId)?.name}`, amount: amountToMove, type: 'flow' }); }
                 currentId = sourceId; depth++;
             }
          }
      });
      finalTransfers.forEach(t => { t.drift = t.amount - t.autoAmount; });
      setTransfers(finalTransfers);
      setStep(finalTransfers.length > 0 ? 'transfer' : 'audit'); 
      const initialAudit = {};
      accounts.forEach(a => initialAudit[a.id] = a.currentBalance || 0);
      setAuditBalances(initialAudit);
  };

  const toggleTransfer = (idx) => { const newT = [...transfers]; newT[idx].isDone = !newT[idx].isDone; setTransfers(newT); };
  const handleAuditChange = (id, val) => { setAuditBalances(prev => ({ ...prev, [id]: val })); };
  const handleSkip = () => { setAllocations({}); const initialAudit = {}; accounts.forEach(a => initialAudit[a.id] = a.currentBalance || 0); if (income.accountId) { initialAudit[income.accountId] = (initialAudit[income.accountId] || 0) + incomeAmount; } setAuditBalances(initialAudit); setStep('audit'); };
  const executeUpdates = () => { Object.entries(allocations).forEach(([expId, amount]) => { if (amount > 0) { updateExpense(expId, 'addedFunds', Number(amount)); } }); Object.entries(auditBalances).forEach(([accId, bal]) => { updateAccount(accId, 'currentBalance', bal); }); onClose(true, income.id); };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Sparkles className="text-amber-400" /> Payday Ritual</h2><div className="flex gap-2 text-xs font-bold mt-1"><span className={step === 'confirm' ? 'text-emerald-500' : 'text-slate-400'}>1. Confirm</span><span className="text-slate-300">→</span><span className={step === 'allocate' ? 'text-emerald-500' : 'text-slate-400'}>2. Allocate</span><span className="text-slate-300">→</span><span className={step === 'transfer' ? 'text-emerald-500' : 'text-slate-400'}>3. Transfer</span><span className="text-slate-300">→</span><span className={step === 'audit' ? 'text-emerald-500' : 'text-slate-400'}>4. Audit</span></div></div>
          <button onClick={() => onClose(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {step === 'confirm' && (
            <div className="space-y-6 text-center py-8">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Incoming Funds</div>
              <div className="flex justify-center items-center gap-2"><DollarSign size={32} className="text-emerald-500"/><input type="number" className="text-5xl font-bold text-slate-900 dark:text-white bg-transparent outline-none w-64 text-center border-b-2 border-slate-200 dark:border-slate-800 focus:border-emerald-500 transition-colors" value={incomeAmount / 100} onChange={(e) => setIncomeAmount(Money.toCents(e.target.value))} /></div>
              <div className="space-y-3"><button onClick={() => setStep('allocate')} className="mx-auto flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform">Start Sorting <ArrowRight size={18}/></button><button onClick={handleSkip} className="block mx-auto text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold underline decoration-slate-300 underline-offset-4">Deposit Only (Skip Allocations)</button></div>
            </div>
          )}

          {step === 'allocate' && (
            <div className="space-y-6">
               <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center z-10 shadow-sm">
                  <div><div className="text-xs font-bold text-slate-400 uppercase">Left to Budget</div><div className={`text-xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{Money.format(remaining)}</div></div>
                  <button onClick={goToTransfers} className="px-6 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-lg hover:opacity-90 flex items-center gap-2">Next: Transfers <ArrowRight size={18}/></button>
               </div>

               <div className="space-y-4">
                 {expenses.filter(e => !e.splitConfig?.isOwedOnly && !(e.type === 'bill' && e.isPaid)).map(exp => {
                    const current = allocations[exp.id] || 0;
                    const suggestion = suggestions[exp.id];
                    return (
                        <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-colors group">
                            <div className="flex-1">
                                <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    {exp.name}
                                    {/* INTERACTIVE SUGGESTION BADGE */}
                                    {suggestion && suggestion.share > 0 && (
                                        <div className="relative">
                                            <button onClick={() => setShownExplanation(shownExplanation === exp.id ? null : exp.id)} className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full hover:bg-blue-200 flex items-center gap-1">
                                                Suggested: {Money.format(suggestion.share)} <Info size={10}/>
                                            </button>
                                            {shownExplanation === exp.id && (
                                                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 text-white text-xs p-2 rounded-lg z-20 shadow-xl border border-slate-700 animate-in fade-in zoom-in-95">
                                                    <div className="font-bold mb-1">Why this amount?</div>
                                                    {suggestion.reason}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                    <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (exp.currentBalance / (exp.amount||1))*100)}%` }}></div></div>
                                    {Money.format(exp.currentBalance)} / {Money.format(exp.type === 'savings' ? exp.targetBalance : exp.amount)}
                                </div>
                            </div>
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span><input type="number" className="w-24 pl-6 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold outline-none focus:border-blue-500 dark:text-white" value={current / 100} onChange={(e) => handleAllocate(exp.id, Money.toCents(e.target.value))} onFocus={(e) => e.target.select()} /></div>
                        </div>
                    );
                 })}
               </div>
            </div>
          )}

          {step === 'transfer' && (
             <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3"><ArrowRightLeft className="text-indigo-600 dark:text-indigo-400 mt-1" /><div><h4 className="font-bold text-indigo-900 dark:text-indigo-300">Move Money</h4><p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">Transfer these amounts. Click arrow to see breakdown.</p></div></div>
                <div className="space-y-3">
                    {transfers.map((t, idx) => (
                        <div key={idx} className={`rounded-xl border transition-all ${t.isDone ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleTransfer(idx)}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>{t.isDone && <Check size={14} className="text-white"/>}</div>
                                    <div><div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.sourceName} <ArrowRight size={12}/> {t.targetName}</div><div className="font-bold text-slate-800 dark:text-white text-lg">{Money.format(t.amount)}</div><div className="flex flex-wrap gap-2 mt-1">{t.isAuto ? (t.drift > 0 ? (<span className="text-[10px] flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full"><AlertTriangle size={10}/> Manual Drift: {Money.format(t.drift)}</span>) : (<span className="text-[10px] flex items-center gap-1 text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"><Bot size={10}/> Auto-Transfer</span>)) : (<span className="text-[10px] text-slate-400">Manual Transfer</span>)}</div></div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setExpandedTransfer(expandedTransfer === idx ? null : idx); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">{expandedTransfer === idx ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
                            </div>
                            {expandedTransfer === idx && (
                                <div className="px-4 pb-4 pt-0 text-xs animate-in slide-in-from-top-2">
                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1">
                                        <div className="font-bold text-slate-400 uppercase text-[10px] mb-2">ALLOCATIONS</div>
                                        {t.breakdown && t.breakdown.map((item, bIdx) => (<div key={bIdx} className={`flex justify-between ${item.type === 'offset' ? 'text-blue-500 font-bold' : 'text-slate-600 dark:text-slate-300'}`}><span className="flex items-center gap-1">{item.type === 'offset' ? <MinusCircle size={10}/> : (item.type === 'flow' ? <ArrowDownRight size={10}/> : <PlusCircle size={10} className="text-emerald-500"/>)} {item.name} {item.note}</span><span>{Money.format(item.amount)}</span></div>))}
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-800 dark:text-white pt-3 mt-3 border-t border-slate-100 dark:border-slate-800"><span>Total Transfer</span><span>{Money.format(t.amount)}</span></div>
                                </div>
                            )}
                        </div>
                    ))}
                    {transfers.length === 0 && <div className="text-center text-slate-400 py-8">No manual transfers needed!</div>}
                </div>
                <div className="flex justify-end pt-4"><button onClick={() => setStep('audit')} className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl hover:opacity-90 flex items-center gap-2">Next: Verify Balances <ArrowRight size={18}/></button></div>
             </div>
          )}

          {step === 'audit' && (
             <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="text-emerald-500"/><h3 className="text-xl font-bold text-slate-800 dark:text-white">Final Check</h3></div>
                <p className="text-sm text-slate-500">Update your account balances to match your banking app.</p>
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {accounts.filter(a => ['checking','savings'].includes(a.type)).map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                             <div className="flex items-center gap-2"><Building2 size={16} className="text-slate-400"/><span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{acc.name}</span></div>
                             <MoneyInput value={auditBalances[acc.id]} onChange={v => handleAuditChange(acc.id, v)} />
                        </div>
                    ))}
                </div>
                <button onClick={executeUpdates} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">Complete Ritual <Sparkles size={20}/></button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaydayWizard;