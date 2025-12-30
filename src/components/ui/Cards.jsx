import React from 'react';
import { ChevronDown, ChevronUp, Check, Infinity, Flame, Clock, CheckCircle2, AlertCircle, Skull, Sword, Hourglass } from 'lucide-react';
import { Money, calculateSinkingFund, getPreviousDateStr } from '../../lib/finance';

// --- SUB-COMPONENT: CIRCULAR PROGRESS (For Goals) ---
const SavingsRing = ({ current, target }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, (current / (target || 1)) * 100));
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
        <circle 
          cx="32" cy="32" r={radius} 
          stroke="currentColor" strokeWidth="6" fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${percent >= 100 ? 'text-emerald-500' : 'text-purple-600'}`}
        />
      </svg>
      <div className="absolute text-[10px] font-bold text-slate-600 dark:text-slate-300">
        {Math.round(percent)}%
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: REVOLVING BUCKET ---
const RevolvingBucket = ({ current }) => (
  <div className="flex flex-col items-end justify-center h-full">
    <div className="flex items-center gap-1 text-slate-400 mb-1">
      <Infinity size={14} /> <span className="text-[10px] font-bold uppercase">Revolving</span>
    </div>
    <div className="font-bold text-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
      {Money.format(current)}
    </div>
  </div>
);

// --- SUB-COMPONENT: SMART PROGRESS BAR (Cycle-Aware Logic) ---
const SmartProgressBar = ({ current, target, type, date, frequency }) => {
  let pacerPercent = 0; 
  let showPacer = false;

  if (date && frequency && frequency !== 'One-Time') {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const endDate = new Date(date);
    endDate.setHours(0,0,0,0);
    
    const startStr = getPreviousDateStr(date, frequency);
    const startDate = new Date(startStr);
    startDate.setHours(0,0,0,0);

    const totalDuration = endDate - startDate;
    const timeElapsed = today - startDate;

    if (totalDuration > 0) {
      const timePercent = Math.max(0, Math.min(1, timeElapsed / totalDuration));
      pacerPercent = (1 - timePercent) * 100; 
      showPacer = true;
    }
  }

  const rawPercent = (current / (target || 1)) * 100;
  const visualPercent = Math.min(100, Math.max(0, rawPercent));
  
  let barColor = 'bg-blue-500'; 
  let statusIcon = null;

  if (rawPercent > 100) {
    barColor = 'bg-purple-500'; // Surplus
  } else if (rawPercent < 0) {
    barColor = 'bg-red-500'; // Overdraft
  } else if (showPacer) {
    if (visualPercent < (pacerPercent - 5)) {
      barColor = 'bg-orange-500'; 
      statusIcon = <Flame size={12} className="text-orange-500 absolute -top-4 right-0 animate-pulse" />;
    } else {
      barColor = 'bg-emerald-500'; 
    }
  }

  return (
    <div className="mt-3 relative group/bar">
      {rawPercent > 100 ? (
        <div className="absolute -top-5 right-0 text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
          <Infinity size={10} /> Surplus
        </div>
      ) : null}
      
      {statusIcon}

      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full relative">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`} 
          style={{ width: `${visualPercent}%` }}
        />
        
        {showPacer && rawPercent <= 100 && rawPercent >= 0 ? (
          <div 
            className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-slate-800 dark:bg-white z-20 transition-all duration-500" 
            style={{ left: `${pacerPercent}%` }}
          >
            <div className="absolute -top-1 -left-[3px] w-2 h-1 bg-slate-800 dark:bg-white rounded-full"></div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
              Pacer: Ideal Balance
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: BOSS HEALTH BAR (For Debt) ---
const BossHealthBar = ({ current, pending = 0 }) => {
    return (
        <div className="mt-3">
             <div className="flex justify-between items-center text-[10px] font-bold text-red-500 mb-1 uppercase tracking-widest">
                 <span className="flex items-center gap-1"><Skull size={12}/> Boss HP</span>
                 <div className="flex items-center gap-2">
                     {pending > 0 && <span className="text-blue-500 flex items-center gap-1 animate-pulse"><Hourglass size={10}/> -{Money.format(pending)}</span>}
                     <span>{Money.format(current)}</span>
                 </div>
             </div>
             <div className="h-4 w-full bg-red-900/20 rounded border border-red-900/30 relative overflow-hidden">
                 {/* Striped Pattern Background */}
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #ef4444 5px, #ef4444 10px)' }}></div>
                 
                 <div 
                    className="h-full bg-red-600 transition-all duration-500" 
                    style={{ width: '100%' }} 
                 ></div>
             </div>
        </div>
    );
};

// 1. STAT CARD
export const StatCard = ({ title, value, icon: Icon, isPositive, highlight, subtitle }) => (
  <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-md ${highlight ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className={`text-sm font-medium ${highlight ? 'text-emerald-100' : 'text-slate-500'}`}>{title}</p>
        <h3 className={`text-2xl font-bold mt-1 ${highlight ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${highlight ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
        <Icon size={24} />
      </div>
    </div>
    {subtitle ? (
      <div className={`text-xs font-bold flex items-center gap-1 ${highlight ? 'text-emerald-50' : (isPositive ? 'text-emerald-600' : 'text-slate-400')}`}>
        {subtitle}
      </div>
    ) : null}
  </div>
);

// 2. ITEM CARD
export const ItemCard = ({ 
  title, amount, subtitle, icon: Icon, colorClass, isExpanded, onClick, 
  children, isPaid, badges, progress, date, frequency, currentBalance, 
  type, savingsType, targetAmount, pendingPayment // RECEIVED HERE
}) => {
  
  const sfData = calculateSinkingFund(
    Money.toCents(amount), 
    currentBalance || 0, 
    date
  );

  const isSavings = type === 'savings';
  const isRevolving = savingsType === 'revolving';
  const isVariable = type === 'variable';
  const isDebt = type === 'debt';
  const showSmartBar = isVariable && !isPaid;

  // Helper to parse string money
  function MoneyToNumber(str) {
     if (typeof str === 'number') return str;
     if (!str) return 0;
     return parseFloat(str.replace(/[^0-9.-]/g, '')) * 100;
  }

  return (
    <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${isExpanded ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'} ${isDebt ? 'hover:border-red-500' : ''}`}>
      <div className="p-4 flex items-center gap-4">
        
        {isSavings && !isRevolving ? (
           <div className="shrink-0">
             <SavingsRing current={currentBalance || 0} target={targetAmount || MoneyToNumber(amount)} />
           </div>
        ) : (
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isPaid ? 'bg-slate-100 text-slate-400 grayscale' : (isDebt ? 'bg-red-100 text-red-600' : colorClass)}`}>
             {isPaid ? <CheckCircle2 size={24}/> : (isDebt ? <Skull size={24}/> : <Icon size={24} />)}
           </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h4 className={`font-bold text-lg truncate ${isPaid ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{title}</h4>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                {date && <span>{isSavings ? 'Contrib: ' : (isVariable ? 'Reset: ' : 'Due: ')}{date}</span>}
                {frequency && <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase">{frequency}</span>}
              </p>
            </div>
            
            <div className="text-right">
              {isSavings && isRevolving ? (
                 <RevolvingBucket current={currentBalance || 0} />
              ) : (
                 <>
                   <div className={`font-bold text-lg ${isPaid ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                     {isSavings ? Money.format(targetAmount || MoneyToNumber(amount)) : amount}
                   </div>
                   <div className="text-xs text-slate-400">{isSavings ? 'Goal Target' : subtitle}</div>
                 </>
              )}
            </div>
          </div>

          {badges && badges.length > 0 ? (
            <div className="flex gap-2 mt-2">
              {badges.map((b, i) => (
                <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${b.color}`}>{b.label}</span>
              ))}
            </div>
          ) : null}

          {/* SINKING FUND BAR */}
          {(typeof sfData === 'object' && sfData !== null && !isPaid && !isSavings && !isDebt) ? (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span className={sfData.isBehind ? "text-orange-500" : "text-emerald-600"}>
                   {sfData.isBehind ? `Behind by ${Money.format(Math.abs(sfData.difference))}` : "On Track"}
                </span>
                <span className="text-slate-400">Target: {Math.round(sfData.timeProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${sfData.timeProgress}%` }} />
                <div className={`h-full rounded-full transition-all duration-500 ${sfData.isBehind ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(sfData.fundingProgress, 100)}%` }} />
              </div>
            </div>
          ) : null}

          {/* BOSS HEALTH BAR (DEBT) */}
          {isDebt && !isPaid && (
              <BossHealthBar current={currentBalance || 0} pending={pendingPayment || 0} /> // PASSED PROP HERE
          )}

          {/* SMART BAR */}
          {showSmartBar && (!sfData || typeof sfData !== 'object') ? (
            <SmartProgressBar 
                current={currentBalance || 0} 
                target={MoneyToNumber(amount) || 1} 
                type="variable" 
                date={date}
                frequency={frequency}
            />
          ) : null}
          
          {/* STANDARD BAR */}
          {progress !== undefined && !showSmartBar && (!sfData || typeof sfData !== 'object') && !isSavings && !isDebt ? (
            <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${progress > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          ) : null}
        </div>

        <div className="text-slate-300">
          {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
        </div>
      </div>
      
      {isExpanded ? (
        <div className="animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      ) : null}
    </div>
  );
};