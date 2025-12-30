import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, Sparkles as SparklesIcon, Wallet as WalletIcon, Sun, Moon, Coffee } from 'lucide-react';
import { Money, getTodayStr } from '../../lib/finance';

const ActionCenter = ({ expenses, incomes, onMarkPaid, onOpenWizard, userLevel }) => {
  const today = getTodayStr();
  
  // --- SMART GREETING LOGIC ---
  const getGreeting = () => {
      const hour = new Date().getHours();
      const rank = userLevel > 10 ? "Liquidity Legend" : (userLevel > 5 ? "Cash Flow Captain" : "Budget Novice");
      
      if (hour < 12) return { text: `Good Morning, ${rank}`, icon: Coffee, color: 'text-amber-600' };
      if (hour < 18) return { text: `Good Afternoon, ${rank}`, icon: Sun, color: 'text-orange-500' };
      return { text: `Good Evening, ${rank}`, icon: Moon, color: 'text-indigo-400' };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // 1. Find Overdue Bills (Date < Today AND Not Paid AND Not "Owed Only")
  const overdue = expenses.filter(e => {
    if (e.splitConfig?.isOwedOnly) return false; 
    const date = e.date || e.dueDate || e.nextDate;
    return date && date < today && !e.isPaid && e.type === 'bill';
  });

  // 2. Find Due Today (Date === Today AND Not Paid AND Not "Owed Only")
  const dueToday = expenses.filter(e => {
    if (e.splitConfig?.isOwedOnly) return false; 
    const date = e.date || e.dueDate || e.nextDate;
    return date === today && !e.isPaid && (e.type === 'bill' || e.type === 'debt');
  });

  // 3. Find Income Expected Today or Past Due
  const pendingIncome = incomes.filter(i => {
    if (i.isDerived) return false;
    const date = i.nextDate;
    return date && date <= today;
  });

  return (
    <div className="mb-8 space-y-4 animate-in slide-in-from-top-4">
      {/* HEADER GREETING */}
      <div className="flex items-center gap-2 mb-2 px-1">
          <GreetingIcon size={18} className={greeting.color} />
          <span className={`text-sm font-bold ${greeting.color} opacity-80`}>{greeting.text}</span>
      </div>

      {/* SECTION: INCOME DETECTED */}
      {pendingIncome.map(inc => (
        <div key={inc.id} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-xl shadow-lg flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><SparklesIcon size={100}/></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 dark:bg-slate-900/10 rounded-full"><WalletIcon size={24}/></div>
            <div>
               <h3 className="font-bold text-lg">Expected Income: {inc.name}</h3>
               <p className="text-white/80 dark:text-slate-600 text-sm">Scheduled for {inc.nextDate === today ? 'Today' : inc.nextDate}. Did it hit your account?</p>
            </div>
          </div>
          <button onClick={onOpenWizard} className="relative z-10 px-6 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold rounded-lg hover:scale-105 transition-transform shadow-md">
            Start Payday Ritual
          </button>
        </div>
      ))}

      {/* SECTION: OVERDUE ALERTS */}
      {overdue.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
           <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400 font-bold">
              <AlertCircle size={20}/>
              <span>Past Due / Missed ({overdue.length})</span>
           </div>
           <div className="space-y-2">
             {overdue.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                    <div className="flex items-center gap-3">
                        <div className="text-center leading-tight">
                            <div className="text-[9px] font-bold text-red-400 uppercase">Due</div>
                            <div className="font-bold text-slate-700 dark:text-slate-300">{item.date || item.dueDate}</div>
                        </div>
                        <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-red-500">{Money.format(item.amount)}</span>
                        <button onClick={() => onMarkPaid(item.id, 'isPaid', true)} className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-full transition-colors" title="Mark Paid Now">
                            <CheckCircle2 size={20}/>
                        </button>
                    </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* SECTION: DUE TODAY */}
      {dueToday.length > 0 && (
         <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 font-bold">
               <Clock size={20}/>
               <span>Due Today ({dueToday.length})</span>
            </div>
            <div className="space-y-2">
              {dueToday.map(item => (
                 <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded text-indigo-600 dark:text-indigo-400">
                             <Calendar size={18}/>
                         </div>
                         <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                     </div>
                     <div className="flex items-center gap-3">
                         <span className="font-mono font-bold text-slate-800 dark:text-white">{Money.format(item.amount)}</span>
                         <button onClick={() => onMarkPaid(item.id, 'isPaid', true)} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-md hover:bg-emerald-600 shadow-sm transition-colors">
                             Pay
                         </button>
                     </div>
                 </div>
              ))}
            </div>
         </div>
      )}
    </div>
  );
};

export default ActionCenter;