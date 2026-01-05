import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Check, Calendar, Repeat, DollarSign, Tag, User, CreditCard, 
  Wallet, PiggyBank, TrendingUp, Landmark, ShieldCheck, RefreshCw, 
  ChevronDown, ArrowRight, Target, Infinity, Building2, Zap, Link as LinkIcon 
} from 'lucide-react';
import { Money, calculateIdealBalance, getTodayStr, getPreviousDateStr } from '../../lib/finance';

// --- HELPER COMPONENTS ---

const MoneyInput = ({ value, onChange, placeholder = "0.00", disabled = false }) => {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      if (value === undefined || value === null) setDisplayValue('');
      else setDisplayValue((value / 100).toFixed(2));
    }
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setDisplayValue(newVal);
    const cents = Money.toCents(newVal);
    onChange(cents);
  };

  const handleBlur = () => {
    const cents = Money.toCents(displayValue);
    setDisplayValue((cents / 100).toFixed(2));
  };

  return (
    <div className={`relative flex items-center ${disabled ? 'opacity-50' : ''}`}>
      <span className="absolute left-3 text-slate-400 font-bold text-lg">$</span>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        onFocus={(e) => e.target.select()}
        className="w-full pl-7 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white text-lg focus:border-emerald-500 outline-none transition-all disabled:cursor-not-allowed"
        placeholder={placeholder}
      />
    </div>
  );
};

const DateInput = ({ value, onChange, label }) => (
  <div>
    {label && <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 block">{label}</label>}
    <input
      type="date"
      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none h-[52px] dark:text-white"
      value={value || ''}
      onChange={onChange}
    />
  </div>
);

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${checked ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}
  >
    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
  </button>
);

const FrequencySelect = ({value, onChange}) => (
  <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none" value={value || 'Monthly'} onChange={onChange}>
    <option>One-Time</option>
    <option>Weekly</option>
    <option>Biweekly</option>
    <option>Twice a Month</option>
    <option>Every 4 Weeks</option>
    <option>Monthly</option>
    <option>Every 2 Months</option>
    <option>Quarterly</option>
    <option>Semi-Annually</option>
    <option>Annually</option>
  </select>
);

// --- MAIN MODAL COMPONENT ---

const UnifiedEntryModal = ({ isOpen, onClose, onSave, accounts, initialData, incomes, type: initialType, context, partners = [] }) => {
  const [mode, setMode] = useState('start');
  const [formData, setFormData] = useState({});
  const [userEditedBalance, setUserEditedBalance] = useState(false);
  
  // Expense Toggles
  const [isFixed, setIsFixed] = useState(true); 
  const [isRollover, setIsRollover] = useState(false);
  const [specialType, setSpecialType] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expenseType, setExpenseType] = useState('bill'); 

  // Savings Toggle
  const [savingsType, setSavingsType] = useState('goal'); 

  // Account Automation Toggles
  const [showAutoConfig, setShowAutoConfig] = useState(false);

  useEffect(() => {
    if (expenseType === 'bill') {
      setIsFixed(true);
      setIsRollover(false);
    } else {
      setIsFixed(false);
      setIsRollover(true);
    }
  }, [expenseType]);

  // INITIALIZATION LOGIC
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // --- EDIT MODE ---
        const initData = { ...initialData };
        if (context === 'expense' && initData.type === 'savings') initData.isGoal = true;

        if (initData.type === 'account' || ['checking','savings','credit','investment','loan'].includes(initData.type)) {
          if (!initData.accountType && initData.type) initData.accountType = initData.type;
          if (initData.autoConfig) setShowAutoConfig(true);
        }
        
        // Ensure linkedAccountIds exists
        if (!initData.linkedAccountIds) initData.linkedAccountIds = [];

        setFormData(initData);

        // Restore Settings
        if (initData.splitConfig) { setIsSplit(true); }
        
        if (initData.type === 'variable') { setExpenseType('bucket'); setSpecialType(''); }
        else if (initData.type === 'bill') { setExpenseType('bill'); setSpecialType(''); }
        else if (initData.type === 'debt') { setSpecialType('debt'); setShowAdvanced(true); setExpenseType('bill'); }
        
        if (initData.savingsType) setSavingsType(initData.savingsType);
        else setSavingsType('goal');

        // Set Mode
        if (initialData.type === 'income') setMode('income');
        else if (context === 'account' || ['checking','credit','investment','loan'].includes(initialData.type) || (initialData.type === 'savings' && !initData.isGoal)) {
          setMode('account');
        } 
        else if (initData.isGoal || (initialData.type === 'savings' && context !== 'account')) {
          setMode('savings');
        } 
        else {
          setMode('expense');
        }
      } else {
        // --- NEW ITEM MODE ---
        setExpenseType('bill'); 
        setSavingsType('goal');
        setIsSplit(false);
        setShowAdvanced(false);
        setShowAutoConfig(false);
        setSpecialType('');

        // Normalize Mode
        if (initialType === 'income') setMode('income');
        else if (initialType === 'account') setMode('account');
        else if (initialType === 'savings') setMode('savings');
        else if (['bill', 'variable', 'debt', 'expense'].includes(initialType)) {
            setMode('expense');
            if (initialType === 'bill') setExpenseType('bill');
            if (initialType === 'variable') setExpenseType('bucket');
            if (initialType === 'debt') { setExpenseType('bill'); setSpecialType('debt'); setShowAdvanced(true); }
        } 
        else {
            setMode('start');
        }

        setFormData({
          name: '', amount: 0, frequency: 'Monthly', accountId: accounts?.[0]?.id || '',
          date: getTodayStr(), startDate: getPreviousDateStr(getTodayStr(), 'Monthly'),
          isSplit: false, isPrimary: false, accountType: 'checking',
          targetDate: '', dueDate: '', addedFunds: 0, rollover: 0, spent: 0,
          currentBalance: 0, totalDebtBalance: 0, interestRate: 0, targetBalance: 0,
          savingsType: 'goal', isDiscretionary: false, linkedAccountId: '',
          isEssential: true, isSubscription: false, fundedFromId: '', 
          splitConfig: { isSplit: false, partnerId: '', partnerAmount: 0, payer: 'me', isOwedOnly: false },
          autoConfig: { isAuto: false, amount: 0, frequency: 'Monthly' }, 
          retirementType: 'none', isPreTax: false,
          linkedAccountIds: [] 
        });
      }
      setUserEditedBalance(false);
    }
  }, [isOpen, initialData, accounts, initialType, context]);

  // --- SMART LOGIC ---
  const idealData = useMemo(() => {
    if (mode !== 'expense' && mode !== 'savings') return { amount: 0 };
    
    const dataToUse = { ...formData };
    if (!dataToUse.amount) return { amount: 0 };
    if (!dataToUse.date && !dataToUse.dueDate) dataToUse.date = getTodayStr();
    
    const primaryIncome = incomes?.find(i => i.isPrimary) || incomes?.[0];
    if (!primaryIncome) return { amount: 0 };
    
    const result = calculateIdealBalance(dataToUse, primaryIncome);
    const amount = typeof result === 'object' ? (result.amount || 0) : (result || 0);
    return { amount };
  }, [mode, formData, incomes]);

  useEffect(() => {
    if (isOpen && !initialData && !userEditedBalance && idealData.amount >= 0 && (mode === 'expense' || mode === 'savings')) {
      if (formData.currentBalance !== idealData.amount) {
        setFormData(prev => ({...prev, currentBalance: idealData.amount}));
      }
    }
  }, [idealData, isOpen, initialData, userEditedBalance, formData.currentBalance, mode]);

  // FIX: Moved useMemo for linkedTotal UP here, BEFORE the early return
  const linkedTotal = useMemo(() => {
      if (!formData.linkedAccountIds || formData.linkedAccountIds.length === 0) return 0;
      return formData.linkedAccountIds.reduce((sum, id) => {
          const acc = accounts.find(a => a.id === id);
          return sum + (acc?.currentBalance || 0);
      }, 0);
  }, [formData.linkedAccountIds, accounts]);

  // NOW we can check for return
  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      if ((field === 'date' || field === 'dueDate' || field === 'targetDate') && newData.frequency) {
        newData.startDate = getPreviousDateStr(value, newData.frequency);
      }
      if (field === 'frequency' && (newData.date || newData.dueDate || newData.targetDate)) {
        const refDate = newData.date || newData.dueDate || newData.targetDate;
        newData.startDate = getPreviousDateStr(refDate, value);
      }
      return newData;
    });
    if (field === 'currentBalance') setUserEditedBalance(true);
  };

  const handleSplitChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      splitConfig: { ...prev.splitConfig, [field]: value, isSplit: true }
    }));
  };

  const handleAutoConfigChange = (field, value) => {
      setFormData(prev => ({
          ...prev,
          autoConfig: { ...(prev.autoConfig || { isAuto: false, amount: 0, frequency: 'Monthly' }), [field]: value }
      }));
  };

  const toggleLinkedAccount = (accId) => {
      setFormData(prev => {
          const current = prev.linkedAccountIds || [];
          const exists = current.includes(accId);
          let newIds;
          if (exists) newIds = current.filter(id => id !== accId);
          else newIds = [...current, accId];
          
          return { ...prev, linkedAccountIds: newIds };
      });
  };

  const handleSave = () => {
    let finalType = 'variable';
    
    if (mode === 'income') finalType = 'income';
    else if (mode === 'account') finalType = 'account';
    else if (mode === 'savings') finalType = 'savings';
    else {
      if (specialType === 'debt') finalType = 'debt';
      else if (expenseType === 'bill') finalType = 'bill'; 
      else finalType = 'variable'; 
    }

    let finalData = { ...formData };

    if (mode === 'savings') {
        finalData.savingsType = savingsType; 
        if (savingsType === 'revolving') {
            finalData.targetBalance = 0; 
        }
    }

    if(!isSplit) delete finalData.splitConfig;

    if (mode !== 'account') delete finalData.accountType;
    if (mode === 'account' && finalData.accountType) {
      finalType = 'account';
      finalData.type = finalData.accountType.toLowerCase();
    }

    if (initialData && mode === 'expense' && initialData.type === 'bill' && specialType !== 'debt') {
        finalType = 'bill';
    }

    // Smart Fill for New Items
    if (!initialData && !userEditedBalance && ['bill','variable','savings','debt'].includes(finalType)) {
      const primaryIncome = incomes?.find(i => i.isPrimary) || incomes?.[0];
      if (primaryIncome && finalData.amount) {
         if (!finalData.date && !finalData.dueDate) finalData.date = getTodayStr();
         const result = calculateIdealBalance(finalData, primaryIncome);
         const idealAmount = typeof result === 'object' ? (result.amount || 0) : (result || 0);
         finalData.currentBalance = idealAmount;
      }
    }
    
    finalData.currentBalance = finalData.currentBalance || 0;

    onSave(finalType, finalData);
    onClose();
  };

  const isOwedOnly = isSplit && formData.splitConfig?.isOwedOnly;

  // --- RENDER: START SCREEN ---
  if (mode === 'start') {
    return (
      <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">What would you like to add?</h2>
            <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <button onClick={() => setMode('expense')} className="p-6 rounded-2xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all group text-left">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform"><Wallet className="text-emerald-600 w-6 h-6"/></div>
                <h3 className="font-bold text-slate-800 dark:text-white">Expense Bucket</h3>
                <p className="text-xs text-slate-500 mt-1">Bills, groceries, daily spending.</p>
             </button>
             <button onClick={() => setMode('savings')} className="p-6 rounded-2xl bg-slate-50 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-900/20 border border-slate-200 dark:border-slate-700 hover:border-purple-500 transition-all group text-left">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform"><PiggyBank className="text-purple-600 w-6 h-6"/></div>
                <h3 className="font-bold text-slate-800 dark:text-white">Savings Goal</h3>
                <p className="text-xs text-slate-500 mt-1">Vacation, emergency fund, car.</p>
             </button>
             <button onClick={() => setMode('income')} className="p-6 rounded-2xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all group text-left">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform"><TrendingUp className="text-indigo-600 w-6 h-6"/></div>
                <h3 className="font-bold text-slate-800 dark:text-white">Income Source</h3>
                <p className="text-xs text-slate-500 mt-1">Job, side hustle, deposits.</p>
             </button>
             <button onClick={() => setMode('account')} className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-all group text-left opacity-50 hover:opacity-100">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform"><Landmark className="text-slate-600 dark:text-slate-300 w-6 h-6"/></div>
                <h3 className="font-bold text-slate-800 dark:text-white">Account</h3>
                <p className="text-xs text-slate-500 mt-1">Add bank or credit card.</p>
             </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: ENTRY FORMS ---
  return (
    <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
            {initialData ? 'Edit' : 'New'} {mode === 'expense' ? 'Bucket' : mode}
          </h2>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">What is this called?</label>
            <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none" placeholder="e.g. Rent, Groceries, Paycheck" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)}/>
          </div>

          {/* === SAVINGS MODE (Updated with Split & Tags) === */}
          {mode === 'savings' && (
            <>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                 <button onClick={() => setSavingsType('goal')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${savingsType === 'goal' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <Target size={14} /> Target Goal
                 </button>
                 <button onClick={() => setSavingsType('revolving')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${savingsType === 'revolving' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <Infinity size={14} /> Revolving Fund
                 </button>
              </div>

              {/* NEW TAX & RETIREMENT TAGGING */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1 block">Tax Bucket Tag</label>
                          <select className="w-full p-2 bg-white dark:bg-slate-800 dark:text-white border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs font-bold outline-none" value={formData.retirementType || 'none'} onChange={e => handleChange('retirementType', e.target.value)}>
                              <option value="none">Standard / None</option>
                              <option value="401k">401k / 403b</option>
                              <option value="ira">IRA / Roth IRA</option>
                              <option value="hsa">HSA / FSA</option>
                              <option value="taxable">Taxable Brokerage</option>
                          </select>
                      </div>
                      <div className="flex flex-col justify-end pb-2">
                          <div className="flex items-center justify-between">
                              <label className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Deducted from Pay?</label>
                              <ToggleSwitch checked={formData.isPreTax || false} onChange={v => handleChange('isPreTax', v)} />
                          </div>
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-1 leading-tight">If ON, this won't reduce your spendable budget (Net Income).</div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Contribution</label><MoneyInput value={formData.amount} onChange={e => handleChange('amount', e)} /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Frequency</label><FrequencySelect value={formData.frequency} onChange={e => handleChange('frequency', e.target.value)} /></div>
              </div>

              {/* SAVINGS SPLIT */}
              <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50">
                 <div className="flex justify-between items-center">
                   <div><div className="font-bold text-slate-700 dark:text-slate-300 text-sm">Split this contribution?</div><div className="text-[10px] text-slate-400">Share goal with partner.</div></div>
                   <ToggleSwitch checked={isSplit} onChange={setIsSplit} />
                 </div>
                 {isSplit && (
                   <div className="animate-in slide-in-from-top-2 space-y-3 mt-3 pt-3 border-t border-purple-200 dark:border-purple-800/50">
                     <div className="flex justify-between items-center mb-2">
                       <div>
                         <div className="font-bold text-purple-700 dark:text-purple-300 text-xs">Track Owed Amount Only?</div>
                         <div className="text-[9px] text-purple-500">Just track the debt, don't budget.</div>
                       </div>
                       <ToggleSwitch checked={formData.splitConfig?.isOwedOnly || false} onChange={v => handleSplitChange('isOwedOnly', v)} />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase mb-1 block">Select Partner</label>
                          <select className="w-full p-2 bg-white dark:bg-slate-800 dark:text-white border border-purple-200 dark:border-purple-700 rounded-lg text-xs font-bold outline-none" value={formData.splitConfig?.partnerId || ''} onChange={e => handleSplitChange('partnerId', e.target.value)}>
                            <option value="">Choose...</option>
                            {(partners || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase mb-1 block">Who Contributes?</label>
                          <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
                            <button onClick={() => handleSplitChange('payer', 'me')} className={`flex-1 py-2 text-xs font-bold ${formData.splitConfig?.payer === 'me' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Me</button>
                            <button onClick={() => handleSplitChange('payer', 'partner')} className={`flex-1 py-2 text-xs font-bold ${formData.splitConfig?.payer === 'partner' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Partner</button>
                          </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase mb-1 block">Partner's Portion</label>
                        <MoneyInput value={formData.splitConfig?.partnerAmount || 0} onChange={v => handleSplitChange('partnerAmount', v)} />
                        <div className="text-[10px] text-purple-600 dark:text-purple-300 mt-1 text-right">
                          You contribute: <strong>{Money.format((formData.amount || 0) - (formData.splitConfig?.partnerAmount || 0))}</strong>
                        </div>
                     </div>
                   </div>
                 )}
               </div>
              
              {!isOwedOnly && (
                <>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Next Contribution Date</label><DateInput value={formData.date || formData.nextDate} onChange={e => handleChange('date', e.target.value)} label="" /></div>
                  
                  {/* MULTI-ACCOUNT LINKING */}
                  <div className="mt-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><LinkIcon size={12}/> Link Accounts (Auto-Track Progress)</label>
                      <div className="max-h-32 overflow-y-auto custom-scrollbar p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                          {(accounts.filter(a => ['checking','savings','investment'].includes(a.type))||[]).map(a => {
                              const isSelected = (formData.linkedAccountIds || []).includes(a.id);
                              return (
                                  <div 
                                    key={a.id} 
                                    onClick={() => toggleLinkedAccount(a.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700' : 'bg-white border-transparent hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                                  >
                                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{a.name}</div>
                                      {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                                  </div>
                              );
                          })}
                          {accounts.length === 0 && <div className="text-[10px] text-slate-400 text-center">No accounts available to link.</div>}
                      </div>
                  </div>

                  {savingsType === 'goal' && (
                        <div className="mt-4"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Target Goal (Total)</label><MoneyInput value={formData.targetBalance} onChange={e => handleChange('targetBalance', e)} /></div>
                  )}
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase">
                            {(formData.linkedAccountIds && formData.linkedAccountIds.length > 0) ? "Total Tracked (Auto)" : "Already Saved (Manual)"}
                        </label>
                    </div>
                    {/* If linked, disable input and show total. If not, enable input. */}
                    <MoneyInput 
                        value={(formData.linkedAccountIds && formData.linkedAccountIds.length > 0) ? linkedTotal : formData.currentBalance} 
                        onChange={(e) => handleChange('currentBalance', e)} 
                        disabled={formData.linkedAccountIds && formData.linkedAccountIds.length > 0}
                    />
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 italic">
                        {formData.linkedAccountIds?.length > 0 
                             ? `Automatically summing ${formData.linkedAccountIds.length} linked account(s).` 
                             : (savingsType === 'goal' ? 'Progress towards your target.' : 'Existing funds in this bucket.')
                        }
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* === EXPENSE MODE === */}
          {mode === 'expense' && (
             <>
               <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                 <button onClick={() => setExpenseType('bill')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${expenseType === 'bill' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Fixed Bill</button>
                 <button onClick={() => setExpenseType('bucket')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${expenseType === 'bucket' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Flexible Bucket</button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{specialType === 'debt' ? "Payment Amount" : "Budget Amount"}</label><MoneyInput value={formData.amount} onChange={e => handleChange('amount', e)} /></div>
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Frequency</label><FrequencySelect value={formData.frequency} onChange={e => handleChange('frequency', e.target.value)} /></div>
               </div>

               <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                 <div className="flex justify-between items-center">
                   <div><div className="font-bold text-slate-700 dark:text-slate-300 text-sm">Split this expense?</div><div className="text-[10px] text-slate-400">Share cost with partner.</div></div>
                   <ToggleSwitch checked={isSplit} onChange={setIsSplit} />
                 </div>
                 {isSplit && (
                   <div className="animate-in slide-in-from-top-2 space-y-3 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50">
                     <div className="flex justify-between items-center mb-2">
                       <div>
                         <div className="font-bold text-blue-700 dark:text-blue-300 text-xs">Track Owed Amount Only?</div>
                         <div className="text-[9px] text-blue-500">Don't budget for this, just track debt.</div>
                       </div>
                       <ToggleSwitch checked={formData.splitConfig?.isOwedOnly || false} onChange={v => handleSplitChange('isOwedOnly', v)} />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-1 block">Select Partner</label>
                          <select className="w-full p-2 bg-white dark:bg-slate-800 dark:text-white border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-bold outline-none" value={formData.splitConfig?.partnerId || ''} onChange={e => handleSplitChange('partnerId', e.target.value)}>
                            <option value="">Choose...</option>
                            {(partners || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-1 block">Who Pays This?</label>
                          <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 overflow-hidden">
                            <button onClick={() => handleSplitChange('payer', 'me')} className={`flex-1 py-2 text-xs font-bold ${formData.splitConfig?.payer === 'me' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Me</button>
                            <button onClick={() => handleSplitChange('payer', 'partner')} className={`flex-1 py-2 text-xs font-bold ${formData.splitConfig?.payer === 'partner' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Partner</button>
                          </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-1 block">Partner Pays (Amount)</label>
                        <MoneyInput value={formData.splitConfig?.partnerAmount || 0} onChange={v => handleSplitChange('partnerAmount', v)} />
                        <div className="text-[10px] text-blue-600 dark:text-blue-300 mt-1 text-right">
                          You pay: <strong>{Money.format((formData.amount || 0) - (formData.splitConfig?.partnerAmount || 0))}</strong>
                        </div>
                     </div>
                   </div>
                 )}
               </div>

               {!isOwedOnly && (
                 <>
                   <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                      <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Paid From</label><select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none" value={formData.accountId || ''} onChange={e => handleChange('accountId', e.target.value)}>{(accounts.filter(a => ['checking','savings','credit'].includes(a.type))||[]).map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</select></div>
                      <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{isFixed ? 'Next Due Date' : 'Next Target / Due Date'}</label><DateInput value={formData.date || formData.dueDate} onChange={e => { handleChange('date', e.target.value); handleChange('dueDate', e.target.value); }} /></div>
                   </div>
                   <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 space-y-2 mt-2 animate-in fade-in">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase">Start Balance (Already allocated?)</label></div>
                      <MoneyInput value={formData.currentBalance} onChange={(e) => handleChange('currentBalance', e)} />
                   </div>
                 </>
               )}

               <div className="pt-2">
                 <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">
                   {showAdvanced ? <ChevronDown size={14}/> : <ArrowRight size={14}/>} Advanced Settings
                 </button>
               </div>
               {showAdvanced && (
                 <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 mt-2 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                      <div><div className="font-bold text-slate-700 dark:text-slate-300 text-sm">Link to Debt?</div><div className="text-[10px] text-slate-400">Pay off a loan/card.</div></div>
                      <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold p-2 outline-none dark:text-white" value={specialType} onChange={e => setSpecialType(e.target.value)}><option value="">No, just spending</option><option value="debt">Debt Payment</option></select>
                    </div>

                    {specialType === 'debt' && (
                      <div className="animate-in slide-in-from-top-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <label className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1 block">Which Debt Account?</label>
                        <select className="w-full p-3 bg-white dark:bg-slate-900 dark:text-white border border-orange-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none" value={formData.totalDebtBalance} onChange={e => handleChange('totalDebtBalance', e.target.value)}><option value="">Select Loan/Card...</option>{accounts.filter(a => a.type === 'loan' || a.type === 'credit').map(a => <option key={a.id} value={a.id}>{a.name} (Bal: {Money.format(a.currentBalance)})</option>)}</select>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button onClick={() => handleChange('isEssential', !formData.isEssential)} className={`flex-1 py-3 px-2 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.isEssential ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}><ShieldCheck size={16}/> <span className="text-xs font-bold">Essential</span></button>
                      <button onClick={() => handleChange('isSubscription', !formData.isSubscription)} className={`flex-1 py-3 px-2 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.isSubscription ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-400'}`}><RefreshCw size={16}/> <span className="text-xs font-bold">Subscription</span></button>
                    </div>
                 </div>
               )}
             </>
          )}

          {mode === 'income' && (
             <>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount</label><MoneyInput value={formData.amount} onChange={e => handleChange('amount', e)} /></div>
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Frequency</label><FrequencySelect value={formData.frequency} onChange={e => handleChange('frequency', e.target.value)} /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Deposit To</label><select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none" value={formData.accountId || ''} onChange={e => handleChange('accountId', e.target.value)}>{(accounts||[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Next Pay Date</label><DateInput value={formData.date || formData.nextDate} onChange={e => handleChange('date', e.target.value)} /></div>
               </div>
               <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 mt-2">
                 <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Is this Primary Income?</span>
                 <ToggleSwitch checked={formData.isPrimary || false} onChange={v => handleChange('isPrimary', v)} />
               </div>
             </>
          )}

          {mode === 'account' && (
             <div className="space-y-3">
               <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Current Balance</label><MoneyInput value={formData.currentBalance} onChange={e => handleChange('currentBalance', e)} /></div>
               <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Account Type</label>
               <div className="grid grid-cols-2 gap-2">{['checking','savings','credit','investment','loan'].map(t => (<button key={t} onClick={() => handleChange('accountType', t)} className={`py-2 rounded-xl text-xs font-bold border capitalize ${formData.accountType === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t}</button>))}</div>
               </div>
               {(formData.accountType === 'checking' || formData.accountType === 'credit') && (
                 <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800"><button onClick={() => handleChange('isDiscretionary', !formData.isDiscretionary)} className={`w-5 h-5 rounded border flex items-center justify-center ${formData.isDiscretionary ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-200'}`}>{formData.isDiscretionary && <Check size={12} className="text-white" />}</button><span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Receive Discretionary Funds?</span></div>
               )}
               {formData.accountType === 'credit' && (
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Paid from (Backing Account)</label><select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none" value={formData.linkedAccountId || ''} onChange={e => handleChange('linkedAccountId', e.target.value)}><option value="">Select Checking Account</option>{accounts.filter(a => a.type === 'checking').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
               )}
               
               {/* NEW: RETIREMENT TAGGING FOR ACCOUNTS */}
               {['savings', 'investment'].includes(formData.accountType) && (
                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                       <label className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1 block">Tax Bucket Tag (Optional)</label>
                       <select className="w-full p-2 bg-white dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none" value={formData.retirementType || 'none'} onChange={e => handleChange('retirementType', e.target.value)}>
                           <option value="none">Standard / None</option>
                           <option value="401k">401k / 403b</option>
                           <option value="ira">IRA / Roth IRA</option>
                           <option value="hsa">HSA / FSA</option>
                           <option value="taxable">Taxable Brokerage</option>
                       </select>
                       <p className="text-[9px] text-slate-400 mt-1">Tagging this helps the Independence page calculate tax efficiency.</p>
                   </div>
               )}

               {/* NEW: DAISY CHAIN & AUTOMATION LOGIC */}
               {['checking','savings'].includes(formData.accountType) && (
                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                         <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2"><Zap size={14} className="text-amber-500"/> Funding & Automation</div>
                         <button onClick={() => setShowAutoConfig(!showAutoConfig)} className="text-[10px] font-bold text-blue-500 hover:text-blue-600">{showAutoConfig ? 'Hide' : 'Configure'}</button>
                      </div>
                      
                      {showAutoConfig && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in slide-in-from-top-2">
                           {/* 1. DAISY CHAIN PARENT */}
                           <div>
                               <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Funded By (Parent Account)</label>
                               <select 
                                  className="w-full p-2 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none" 
                                  value={formData.fundedFromId || ''} 
                                  onChange={e => handleChange('fundedFromId', e.target.value)}
                               >
                                  <option value="">Direct Deposit (Default)</option>
                                  {accounts.filter(a => a.id !== formData.id && ['checking','savings'].includes(a.type)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                               </select>
                               <p className="text-[9px] text-slate-400 mt-1">If set, transfers will go from {accounts.find(a=>a.id===formData.fundedFromId)?.name || 'Direct Deposit'} &rarr; This Account.</p>
                           </div>

                           {/* 2. AUTO TRANSFER CONFIG */}
                           <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                               <div className="flex justify-between items-center mb-2">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">Automatic Transfer?</label>
                                  <ToggleSwitch checked={formData.autoConfig?.isAuto || false} onChange={v => handleAutoConfigChange('isAuto', v)} />
                               </div>
                               {formData.autoConfig?.isAuto && (
                                   <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                                       <div><label className="text-[9px] text-slate-400">Amount</label><MoneyInput value={formData.autoConfig?.amount || 0} onChange={v => handleAutoConfigChange('amount', v)} /></div>
                                       <div><label className="text-[9px] text-slate-400">Frequency</label><FrequencySelect value={formData.autoConfig?.frequency} onChange={e => handleAutoConfigChange('frequency', e.target.value)} /></div>
                                   </div>
                               )}
                           </div>
                        </div>
                      )}
                   </div>
               )}
             </div>
          )}
        </div>

        <div className="p-6 pt-2 border-t border-slate-100 dark:border-slate-700"><button onClick={handleSave} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-all">Save {mode === 'start' ? 'Item' : mode}</button></div>
      </div>
    </div>
  );
};

export default UnifiedEntryModal;