import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Activity, Target, ShieldCheck, 
  Settings, Coffee, Plane, Info, Plus, Minus, ArrowRight, 
  DollarSign, Trash2, RefreshCw, Lock, Unlock, Zap, X, Calculator, Save, AlertTriangle, PieChart, Sliders 
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, ReferenceLine, CartesianGrid, Legend 
} from 'recharts';
import { Money, getAnnualAmount } from '../../lib/finance';
import { MoneyInput } from '../ui/Forms';

// --- HELPER: SLIDER CONTROL ---
const SliderControl = ({ label, value, onChange, min, max, step, unit = '' }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
      <span>{label}</span>
      <span>{value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
    />
  </div>
);

// --- HELPER: FUTURE EXPENSE ROW ---
const FutureExpenseRow = ({ item, modifier, onModify, onToggle }) => {
    const originalAnnualCents = getAnnualAmount(item.amount, item.frequency);
    const isExcluded = modifier?.excluded;
    const annualCents = modifier?.amount !== undefined ? modifier.amount : originalAnnualCents;
    const monthlyCents = Math.round(annualCents / 12);

    return (
        <div className={`flex items-center justify-between p-3 rounded-xl border mb-2 transition-all ${isExcluded ? 'bg-slate-50 border-slate-200 opacity-60 dark:bg-slate-900 dark:border-slate-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <button 
                    onClick={() => onToggle(item.id)}
                    className={`p-2 rounded-lg transition-colors ${isExcluded ? 'text-slate-400 hover:text-slate-600' : 'bg-emerald-100 text-emerald-600'}`}
                >
                    {isExcluded ? <Unlock size={14}/> : <Lock size={14}/>}
                </button>
                <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${isExcluded ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.frequency}</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isExcluded && (
                    <div className="w-28">
                        <MoneyInput 
                            value={monthlyCents} 
                            onChange={(val) => onModify(item.id, val * 12)}
                            placeholder="0.00"
                        />
                    </div>
                )}
                {!isExcluded && <span className="text-[9px] text-slate-400">/mo</span>}
                {isExcluded && <span className="text-xs text-slate-400 font-mono mr-4">--</span>}
            </div>
        </div>
    );
};

// --- HELPER: CUSTOM FUTURE EXPENSE ROW ---
const CustomFutureRow = ({ item, onDelete }) => (
    <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 mb-2">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Plus size={14}/></div>
            <div>
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300">{item.name}</div>
                <div className="text-[10px] text-indigo-500">Future Addition</div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{Money.format(item.amount)}/yr</span>
            <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
        </div>
    </div>
);

// --- HELPER: ACCOUNT RATE ROW ---
const AccountRateRow = ({ acc, updateAccount }) => {
    const [rate, setRate] = useState(acc.interestRate || '');

    useEffect(() => {
        setRate(acc.interestRate || '');
    }, [acc.interestRate]);

    const handleBlur = () => {
        if (updateAccount && rate !== acc.interestRate) {
            updateAccount(acc.id, 'interestRate', rate);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <div>
                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    {acc.name} 
                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 uppercase">{acc.retirementType || acc.type}</span>
                </div>
                <div className="text-xs text-slate-500">{Money.format(acc.currentBalance)}</div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Return %</span>
                <input 
                    type="number" 
                    step="0.1" 
                    className="w-16 p-1 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm font-bold outline-none focus:ring-1 ring-emerald-500 dark:text-white"
                    value={rate} 
                    placeholder="0"
                    onChange={(e) => setRate(e.target.value)}
                    onBlur={handleBlur}
                />
            </div>
        </div>
    );
};

// --- DETAILS MODAL: INVESTED ASSETS ---
const InvestedModal = ({ isOpen, onClose, accounts, updateAccount, onApplyWeightedReturn }) => {
    // Local staging state
    const [localRates, setLocalRates] = useState({}); 

    useEffect(() => {
        if (isOpen) {
            const initRates = {};
            accounts.forEach(a => {
                initRates[a.id] = a.interestRate || '';
            });
            setLocalRates(initRates);
        }
    }, [isOpen, accounts]);

    if (!isOpen) return null;
    
    const investmentAccounts = accounts.filter(a => {
        const isRetirement = ['401k', 'ira', 'hsa'].includes(a.retirementType);
        const isInvestment = a.type === 'investment';
        return isRetirement || isInvestment;
    });

    const totalBalance = investmentAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    
    // Calculate Weighted Return
    let weightedSum = 0;
    investmentAccounts.forEach(a => {
        const rateStr = localRates[a.id];
        const rate = parseFloat(rateStr); 
        if (!isNaN(rate)) {
            weightedSum += (a.currentBalance || 0) * rate;
        }
    });
    const weightedAvg = totalBalance > 0 ? (weightedSum / totalBalance).toFixed(2) : "0.00";

    const handleSave = () => {
        // 1. Commit to DB for each account
        Object.keys(localRates).forEach(accId => {
            const newVal = localRates[accId];
            const oldVal = accounts.find(a => a.id === accId)?.interestRate;
            if (newVal !== oldVal) {
                updateAccount(accId, 'interestRate', newVal);
            }
        });
        // 2. Pass to parent to update FIRE config
        onApplyWeightedReturn(Number(weightedAvg));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><TrendingUp size={20}/> Portfolio Breakdown</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl mb-4 border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                    <div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Invested</div>
                        <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{Money.format(totalBalance)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Weighted Return</div>
                        <div className="text-xl font-bold text-slate-800 dark:text-white">{weightedAvg}%</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 mb-4">
                    {investmentAccounts.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                    {acc.name} 
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 uppercase">{acc.retirementType || acc.type}</span>
                                </div>
                                <div className="text-xs text-slate-500">{Money.format(acc.currentBalance)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Return %</span>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    className="w-16 p-1 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm font-bold outline-none focus:ring-1 ring-emerald-500 dark:text-white"
                                    value={localRates[acc.id] || ''} 
                                    placeholder="0"
                                    onChange={(e) => setLocalRates(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                />
                            </div>
                        </div>
                    ))}
                    {investmentAccounts.length === 0 && <div className="text-center text-slate-400 py-4 text-sm">No investment accounts found.</div>}
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90"
                >
                    <Save size={18} /> Save & Apply Weighted Return
                </button>
            </div>
        </div>
    );
};

// --- DETAILS MODAL: FREEDOM NUMBER ---
const FreedomModal = ({ isOpen, onClose, fiNumber, annualSpend, withdrawalRate, fireMode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Calculator size={20}/> The Math</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between mb-1">
                            <span>Future Annual Spend</span>
                            <span className="font-bold">{Money.format(annualSpend)}</span>
                        </div>
                        <div className="flex justify-between mb-1 text-slate-400 text-xs">
                            <span>Mode Multiplier ({fireMode})</span>
                            <span>{fireMode === 'fat' ? '125%' : (fireMode === 'lean' ? 'Essential Only' : '100%')}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span>Safe Withdrawal Rate</span>
                            <span className="font-bold text-emerald-600">{withdrawalRate}%</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-xs uppercase font-bold text-slate-400 mb-1">Calculation</div>
                        <div className="text-lg font-mono font-bold text-slate-800 dark:text-white">
                            {Money.format(annualSpend)} ÷ {(withdrawalRate / 100).toFixed(2)}
                        </div>
                        <div className="my-2 text-slate-300">↓</div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{Money.format(fiNumber)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---
export default function FireDashboard({ expenses, incomes, accounts, updateAccount, fireSettings, updateFireSettings }) {
  // 1. STATE
  const [currentAge, setCurrentAge] = useState(30);
  const [targetAge, setTargetAge] = useState(50); // New: Target Retirement Age
  const [config, setConfig] = useState({ returnRate: 7, inflation: 3, withdrawalRate: 4 });
  const [fireMode, setFireMode] = useState('traditional'); 
  const [modifiers, setModifiers] = useState({}); 
  const [customExpenses, setCustomExpenses] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // NEW: Blending State (Default 50% split)
  const [mixPercent, setMixPercent] = useState(50); 
  
  // Sync state with persisted props
  useEffect(() => {
      if (fireSettings && !isLoaded) {
          if(fireSettings.currentAge) setCurrentAge(fireSettings.currentAge);
          if(fireSettings.targetAge) setTargetAge(fireSettings.targetAge);
          if(fireSettings.returnRate !== undefined) setConfig(prev => ({...prev, returnRate: fireSettings.returnRate}));
          if(fireSettings.inflation !== undefined) setConfig(prev => ({...prev, inflation: fireSettings.inflation}));
          if(fireSettings.withdrawalRate !== undefined) setConfig(prev => ({...prev, withdrawalRate: fireSettings.withdrawalRate}));
          if(fireSettings.fireMode) setFireMode(fireSettings.fireMode);
          if(fireSettings.modifiers) setModifiers(fireSettings.modifiers);
          if(fireSettings.customExpenses) setCustomExpenses(fireSettings.customExpenses);
          if(fireSettings.mixPercent !== undefined) setMixPercent(fireSettings.mixPercent);
          setIsLoaded(true);
      }
  }, [fireSettings, isLoaded]);

  // Mark dirty on change
  useEffect(() => {
      if(isLoaded) setIsDirty(true);
  }, [currentAge, targetAge, config, fireMode, modifiers, customExpenses, mixPercent]);

  // Manual Save Function
  const handleManualSave = () => {
      const newSettings = {
          currentAge,
          targetAge,
          returnRate: config.returnRate,
          inflation: config.inflation,
          withdrawalRate: config.withdrawalRate,
          fireMode,
          modifiers,
          customExpenses,
          mixPercent
      };
      if (updateFireSettings) updateFireSettings(newSettings);
      setIsDirty(false);
  };

  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [activeModal, setActiveModal] = useState(null); 

  // --- DATA CALCULATION ---
  const financialData = useMemo(() => {
    // A. Invested Assets
    const investedAssets = accounts.reduce((sum, a) => {
        const isRetirement = ['401k', 'ira', 'hsa'].includes(a.retirementType);
        const isInvestment = a.type === 'investment';
        if (isRetirement || isInvestment) return sum + (a.currentBalance || 0);
        return sum;
    }, 0);

    // B. Contribution Logic
    const contributionBuckets = { '401k': 0, 'ira': 0, 'hsa': 0, 'taxable': 0 };
    const contributionSources = []; 
    let totalAnnualContribution = 0;

    expenses.forEach(e => {
        if (e.type === 'savings' && ['401k', 'ira', 'hsa', 'taxable'].includes(e.retirementType)) {
             const annualAmount = getAnnualAmount(e.amount, e.frequency);
             contributionBuckets[e.retirementType] += annualAmount;
             totalAnnualContribution += annualAmount;
             contributionSources.push({ name: e.name, amount: annualAmount, type: e.retirementType });
        }
    });

    // C. Future Budget Logic
    const currentAnnualSpend = expenses.reduce((sum, e) => {
        if (e.isPreTax || e.type === 'savings') return sum; 
        return sum + getAnnualAmount(e.amount, e.frequency);
    }, 0);

    let futureAnnualSpend = 0;
    
    expenses.forEach(e => {
        if (e.type === 'savings' || e.isPreTax) return;

        const mod = modifiers[e.id];
        if (mod?.excluded) return; 

        const amount = mod?.amount !== undefined ? mod.amount : getAnnualAmount(e.amount, e.frequency);
        
        if (fireMode === 'lean' && !e.isEssential) return; 

        futureAnnualSpend += amount;
    });

    customExpenses.forEach(c => futureAnnualSpend += c.amount);

    if (fireMode === 'fat') futureAnnualSpend *= 1.25; 

    // D. FI Number
    const fiNumber = futureAnnualSpend * (100 / config.withdrawalRate);

    return { investedAssets, totalAnnualContribution, contributionBuckets, contributionSources, currentAnnualSpend, futureAnnualSpend, fiNumber };
  }, [accounts, expenses, modifiers, customExpenses, fireMode, config]);

  // --- PROJECTION ENGINE ---
  const projection = useMemo(() => {
    const data = [];
    let balance = financialData.investedAssets;
    let coastBalance = financialData.investedAssets;
    const realReturn = (config.returnRate - config.inflation) / 100;
    const yearlyContribution = financialData.totalAnnualContribution;
    const target = financialData.fiNumber;

    let hitFreedom = false;
    let hitCoast = false;

    for (let i = 0; i <= 60; i++) {
      const year = new Date().getFullYear() + i;
      const age = currentAge + i;
      
      data.push({
        year,
        age,
        balance: Math.round(balance / 100),
        coast: Math.round(coastBalance / 100),
        target: Math.round(target / 100)
      });

      if (!hitFreedom && balance >= target) hitFreedom = age;
      if (!hitCoast && coastBalance >= target) hitCoast = age;

      balance = balance * (1 + realReturn) + yearlyContribution;
      coastBalance = coastBalance * (1 + realReturn);

      if (balance > (target * 4) && i > 15) break; 
    }

    if (!hitCoast && target > coastBalance && realReturn > 0 && financialData.investedAssets > 0) {
        const yearsNeeded = Math.log(target / financialData.investedAssets) / Math.log(1 + realReturn);
        const calcAge = currentAge + Math.ceil(yearsNeeded);
        hitCoast = calcAge < 150 ? calcAge : "150+";
    }

    if (!hitFreedom && target > balance && realReturn > 0 && yearlyContribution > 0) {
        hitFreedom = "90+"; 
    }

    return { data, hitFreedom, hitCoast };
  }, [financialData, config, currentAge]);

  // --- PLANNER (GAP ANALYSIS - REFINED) ---
  const planner = useMemo(() => {
    // 1. Get Projected Balance at Target Age (from Chart Data)
    const targetData = projection.data.find(d => d.age === targetAge);
    
    const projectedBalanceCents = targetData ? (targetData.balance * 100) : 0; 
    const targetAmount = financialData.fiNumber;
    
    // Strict comparison matching the visual chart lines
    const isOnTrack = projectedBalanceCents >= targetAmount;

    // 2. Calculate Gap Variables
    // Variable A: "Shortfall Amount" (Assets needed - Assets Projected)
    const shortfall = Math.max(0, targetAmount - projectedBalanceCents);

    // Variable B: "Extra Savings Needed" to cover shortfall (Option A)
    // PMT = Shortfall * r / ((1+r)^n - 1)
    let savingsGapMonthly = 0;
    const yearsToTarget = Math.max(1, targetAge - currentAge);
    const realReturn = (config.returnRate - config.inflation) / 100;
    const compoundFactor = Math.pow(1 + realReturn, yearsToTarget) - 1;

    if (realReturn === 0) {
        savingsGapMonthly = (shortfall / yearsToTarget) / 12;
    } else {
        if (compoundFactor > 0) {
            const annualCatchUp = shortfall * (realReturn / compoundFactor);
            savingsGapMonthly = annualCatchUp / 12;
        }
    }

    // Variable C: "Budget Reduction Needed" to cover shortfall (Option B)
    // Reduce Future Spend so that NewTarget = ProjectedBalance
    // NewTarget = (FutureSpend - Cut) / SWR
    // ProjectedBalance = (FutureSpend - Cut) / SWR
    // ProjectedBalance * SWR = FutureSpend - Cut
    // Cut = FutureSpend - (ProjectedBalance * SWR)
    
    const swr = config.withdrawalRate / 100;
    const maxSustainableSpend = projectedBalanceCents * swr;
    // Current Planned Spend
    const currentPlannedSpend = financialData.futureAnnualSpend;
    
    const annualExpenseCut = Math.max(0, currentPlannedSpend - maxSustainableSpend);
    const expenseGapMonthly = annualExpenseCut / 12;

    return { isOnTrack, savingsGapMonthly, expenseGapMonthly };

  }, [projection.data, financialData.fiNumber, financialData.futureAnnualSpend, targetAge, currentAge, config]);

  // --- BLENDING LOGIC (THE MIXER) ---
  const mixValues = useMemo(() => {
     if (planner.isOnTrack) return { save: 0, cut: 0 };

     // SLIDER LOGIC:
     // 0% Mix = 100% Cuts (Option B)
     // 100% Mix = 100% Savings (Option A)
     
     // To blend, we need to cover the "Shortfall".
     // Let 'p' be percent covered by savings (mixPercent / 100).
     // Savings Target = p * (Total Savings Gap)
     // Remaining Gap for Cuts = (1-p) * (Total Expense Gap)
     // *Critically*: If I save 50% of the gap, the expense gap shrinks linearly 
     // because every dollar saved increases the Projected Balance, reducing the gap needed to be cut.
     
     const savePortion = (mixPercent / 100) * planner.savingsGapMonthly;
     const cutPortion = (1 - (mixPercent / 100)) * planner.expenseGapMonthly;

     return { save: savePortion, cut: cutPortion };
  }, [planner, mixPercent]);


  const handleModify = (id, amount) => {
      setModifiers(prev => ({ ...prev, [id]: { ...prev[id], amount } }));
  };
  const handleToggle = (id) => {
      setModifiers(prev => ({ ...prev, [id]: { ...prev[id], excluded: !prev[id]?.excluded } }));
  };
  const handleAddCustom = () => {
      if(!newExpenseName || !newExpenseAmount) return;
      const amountCents = Money.toCents(newExpenseAmount) * 12; 
      const newExp = { id: Date.now(), name: newExpenseName, amount: amountCents };
      setCustomExpenses(prev => [...prev, newExp]);
      setNewExpenseName(''); setNewExpenseAmount('');
  };

  const formatYAxis = (val) => {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER CONTROLS */}
      <div className="flex justify-end">
          <button 
              onClick={handleManualSave}
              disabled={!isDirty}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${isDirty ? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800'}`}
          >
              <Save size={18} /> {isDirty ? 'Save Changes' : 'Saved'}
          </button>
      </div>
      
      {/* HEADER METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div onClick={() => setActiveModal('invested')} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">Current Invested <Info size={12}/></div>
              <div className="text-2xl font-black text-slate-800 dark:text-white">{Money.format(financialData.investedAssets)}</div>
              <div className="text-[10px] text-slate-400 mt-1">Retirement & Brokerage</div>
          </div>
          <div onClick={() => setActiveModal('freedom')} className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">Freedom Number <Info size={12}/></div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{Money.format(financialData.fiNumber)}</div>
              <div className="text-[10px] text-emerald-600/70 mt-1">{fireMode.toUpperCase()} Target</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Years to Freedom</div>
              <div className="flex justify-between items-end">
                  <div>
                      <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                          {projection.hitFreedom && (typeof projection.hitFreedom === 'number' || typeof projection.hitFreedom === 'string') ? (typeof projection.hitFreedom === 'number' ? projection.hitFreedom - currentAge : projection.hitFreedom) : "--"} <span className="text-sm font-normal text-slate-400">yrs</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Active (Age {projection.hitFreedom || '?'})</div>
                  </div>
                  <div className="text-right">
                      <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                          {projection.hitCoast && (typeof projection.hitCoast === 'number' || typeof projection.hitCoast === 'string') ? (typeof projection.hitCoast === 'number' ? projection.hitCoast - currentAge : projection.hitCoast) : "--"} <span className="text-sm font-normal text-slate-400">yrs</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Coast (Age {projection.hitCoast || '?'})</div>
                  </div>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Current Age</div>
              <input type="number" value={currentAge} onChange={e => setCurrentAge(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-2 font-bold text-center outline-none focus:ring-2 ring-indigo-500 dark:text-white" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: RETIREMENT PLANNER + CHART + SLIDERS */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* RETIREMENT PLANNER (NEW & IMPROVED) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <Target className="text-indigo-500" />
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Retirement Planner</h3>
                      <div className="ml-auto text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                          Goal: Age {targetAge}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Control: Target Age */}
                      <div className="space-y-4">
                          <div>
                              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                  <span>Target Retirement Age</span>
                                  <span>{targetAge}</span>
                              </div>
                              <input 
                                  type="range" min={currentAge + 1} max="80" step="1" 
                                  value={targetAge} 
                                  onChange={(e) => setTargetAge(Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                  <span>Now ({currentAge})</span>
                                  <span>80</span>
                              </div>
                          </div>
                          
                          {/* Gap Status */}
                          <div className={`p-4 rounded-xl border flex flex-col justify-center h-32 ${planner.isOnTrack ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800'}`}>
                             {planner.isOnTrack ? (
                                 <div className="text-center">
                                     <div className="flex justify-center mb-1"><ShieldCheck size={32} className="text-emerald-500"/></div>
                                     <div className="font-bold text-emerald-700 dark:text-emerald-400">On Track!</div>
                                     <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">Projected to retire before {targetAge}.</p>
                                 </div>
                             ) : (
                                 <div className="text-center">
                                     <div className="flex justify-center mb-1"><AlertTriangle size={32} className="text-orange-500"/></div>
                                     <div className="font-bold text-orange-700 dark:text-orange-400">Shortfall Detected</div>
                                     <p className="text-[10px] text-orange-600 dark:text-orange-500 mt-1">Use the slider below to fix.</p>
                                 </div>
                             )}
                          </div>
                      </div>

                      {/* BLENDER CONTROLS (NEW) */}
                      <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Sliders size={12}/> Strategy Mixer</h4>
                          
                          {/* The Mix Slider */}
                          <div className={`p-4 rounded-xl border ${planner.isOnTrack ? 'opacity-50 pointer-events-none' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                               <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                   <span>Cut Future Expenses</span>
                                   <span>Save More Now</span>
                               </div>
                               <input 
                                  type="range" min="0" max="100" step="5" 
                                  value={mixPercent} 
                                  onChange={(e) => setMixPercent(Number(e.target.value))}
                                  className="w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg appearance-none cursor-pointer"
                                  disabled={planner.isOnTrack}
                               />
                               <div className="mt-4 space-y-2">
                                   <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                       <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Increase Current Savings</span>
                                       <span className="text-sm font-black text-slate-800 dark:text-white">+{Money.format(mixValues.save)}<span className="text-[9px] text-slate-400 font-normal">/mo</span></span>
                                   </div>
                                   <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-purple-100 dark:border-purple-900/50">
                                       <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Reduce Future Budget</span>
                                       <span className="text-sm font-black text-slate-800 dark:text-white">-{Money.format(mixValues.cut)}<span className="text-[9px] text-slate-400 font-normal">/mo</span></span>
                                   </div>
                               </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* CHART */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-[350px]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity size={18}/> Projection</h3>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                          {['lean', 'traditional', 'fat'].map(m => (
                              <button key={m} onClick={() => setFireMode(m)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${fireMode === m ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{m}</button>
                          ))}
                      </div>
                  </div>
                  <ResponsiveContainer width="100%" height="85%">
                      <ComposedChart data={projection.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="age" tick={{fontSize: 10}} label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                          <YAxis tickFormatter={formatYAxis} tick={{fontSize: 10}} width={45} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} formatter={(value, name) => [Money.format(value * 100), name === 'balance' ? 'Projected' : (name === 'coast' ? 'Coast FIRE' : 'Target')]} labelFormatter={(label) => `Age ${label}`} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                          <Line type="step" dataKey="target" stroke="#f59e0b" strokeWidth={2} dot={false} name="FI Target" strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="coast" stroke="#6366f1" strokeWidth={2} dot={false} name="Coast FIRE" strokeOpacity={0.6} />
                          <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} fill="url(#colorBal)" name="Projected Portfolio" />
                          {/* Target Age Line */}
                          <ReferenceLine x={targetAge} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'Goal', position: 'insideTopLeft', fontSize: 10, fill: '#6366f1', angle: -90 }} />
                      </ComposedChart>
                  </ResponsiveContainer>
              </div>

              {/* SLIDERS */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <SliderControl label="Annual Return" value={config.returnRate} onChange={v => setConfig({...config, returnRate: v})} min={1} max={30} step={0.5} unit="%" />
                      <SliderControl label="Inflation" value={config.inflation} onChange={v => setConfig({...config, inflation: v})} min={1} max={8} step={0.5} unit="%" />
                      <SliderControl label="Safe Withdraw Rate" value={config.withdrawalRate} onChange={v => setConfig({...config, withdrawalRate: v})} min={2} max={6} step={0.1} unit="%" />
                  </div>
                  {config.returnRate > 12 && (
                    <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-3 text-orange-800 dark:text-orange-200">
                        <AlertTriangle size={18} />
                        <div className="text-xs">
                            <strong>Optimistic Return Alert:</strong> Historical S&P 500 average is ~10% (unadjusted). Planning with {config.returnRate}% may be risky.
                        </div>
                    </div>
                  )}
              </div>

              {/* CONTRIBUTIONS BREAKDOWN */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Target size={18}/> Annual Contributions (2025)</h3>
                     <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total: {Money.format(financialData.totalAnnualContribution)}/yr</span>
                  </div>
                  
                  {/* Visual Bars for Tax Efficiency */}
                  {[
                      { type: '401k', limit: 2350000, color: 'bg-blue-500', label: '401k / 403b' },
                      { type: 'ira', limit: 700000, color: 'bg-purple-500', label: 'IRA / Roth' },
                      { type: 'hsa', limit: 430000, color: 'bg-emerald-500', label: 'HSA' }
                  ].map(bucket => {
                      const current = financialData.contributionBuckets[bucket.type];
                      const pct = Math.min(100, (current / bucket.limit) * 100);
                      return (
                          <div key={bucket.type} className="mb-4 last:mb-0">
                              <div className="flex justify-between text-xs font-bold mb-1">
                                  <span className="text-slate-600 dark:text-slate-300">{bucket.label}</span>
                                  <span className="text-slate-400">{Money.format(current)} / {Money.format(bucket.limit)}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${bucket.color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                              </div>
                          </div>
                      )
                  })}
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                     <div className="font-bold text-slate-500 mb-2 uppercase">Source Breakdown</div>
                     <div className="flex flex-wrap gap-2">
                        {financialData.contributionSources.map((s, i) => (
                           <div key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                               {s.name}: {Money.format(s.amount)} <span className="text-[9px] text-slate-400 uppercase">({s.type})</span>
                           </div>
                        ))}
                        {financialData.contributionSources.length === 0 && <span className="text-slate-400 italic">No savings goals tagged for retirement.</span>}
                     </div>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: BUDGET BUILDER */}
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full max-h-[1000px]">
                  <div className="mb-4">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Coffee size={18}/> Future Budget</h3>
                      <p className="text-xs text-slate-400 mt-1">Adjust current expenses for retirement reality.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                      <div className="flex gap-2 mb-4 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          <input className="flex-1 bg-transparent text-xs font-bold outline-none dark:text-white" placeholder="Add Expense (e.g. Travel)" value={newExpenseName} onChange={e => setNewExpenseName(e.target.value)} />
                          <MoneyInput value={Money.toCents(newExpenseAmount)} onChange={(e) => setNewExpenseAmount((e/100).toString())} placeholder="0.00" />
                          <button onClick={handleAddCustom} className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"><Plus size={14}/></button>
                      </div>
                      {customExpenses.map(c => <CustomFutureRow key={c.id} item={c} onDelete={(id) => setCustomExpenses(prev => prev.filter(x => x.id !== id))} />)}
                      {expenses.filter(e => e.type !== 'savings' && !e.isPreTax).map(e => (
                          <FutureExpenseRow key={e.id} item={e} modifier={modifiers[e.id]} onModify={handleModify} onToggle={handleToggle} />
                      ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-500 font-bold">Future Annual Spend</span>
                          <span className="font-black text-slate-800 dark:text-white">{Money.format(financialData.futureAnnualSpend)}</span>
                      </div>
                      <div className="text-[10px] text-right text-slate-400">(vs. Current: {Money.format(financialData.currentAnnualSpend)})</div>
                  </div>
              </div>
          </div>
      </div>

      <InvestedModal 
          isOpen={activeModal === 'invested'} 
          onClose={() => setActiveModal(null)} 
          accounts={accounts} 
          updateAccount={updateAccount} 
          onApplyWeightedReturn={(avg) => {
              const val = Number(avg);
              setConfig(prev => ({ ...prev, returnRate: val }));
              
              // Force Save to Persist the weighted average to the user config
              if (updateFireSettings) {
                 updateFireSettings({ 
                    returnRate: val,
                    currentAge, 
                    targetAge,
                    inflation: config.inflation,
                    withdrawalRate: config.withdrawalRate,
                    fireMode,
                    modifiers,
                    customExpenses,
                    mixPercent
                 });
                 setIsDirty(false); // Reset dirty since we just saved
              }
          }}
      />
      <FreedomModal 
          isOpen={activeModal === 'freedom'} 
          onClose={() => setActiveModal(null)} 
          fiNumber={financialData.fiNumber} 
          annualSpend={financialData.futureAnnualSpend} 
          withdrawalRate={config.withdrawalRate} 
          fireMode={fireMode}
      />
    </div>
  );
}