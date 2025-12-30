import React from 'react';
import { 
  Plus, DollarSign, Calendar, TrendingUp, Users, CreditCard, 
  Wallet, PiggyBank, Flame, Trophy, Star, Zap, ShieldCheck, Medal
} from 'lucide-react';
import { getTodayStr, addDays, getOccurrencesInWindow } from '../../lib/finance';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

// --- HELPER: FORCE LOCAL YYYY-MM-DD ---
const makeDateKey = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
      return dateInput.split('T')[0]; 
  }
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- 0. GAME STATS WIDGET ---
export const GameStats = ({ stats }) => {
    const { level = 1, xp = 0, streak = 0, nextLevelXP = 1000 } = stats || {};
    const progress = Math.min(100, (xp / nextLevelXP) * 100);

    return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden mb-6 border border-slate-700">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={80}/></div>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-amber-400 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-[10px] font-bold text-amber-900 uppercase">Lvl</span>
                    <span className="text-xl font-black text-amber-900 leading-none">{level}</span>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-300">
                        <span>Financial Rank</span>
                        <span>{xp} / {nextLevelXP} XP</span>
                    </div>
                    <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}/>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center px-2">
                    <div className={`p-2 rounded-full ${streak > 0 ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                        <Flame size={20} fill={streak > 0 ? "currentColor" : "none"} />
                    </div>
                    <span className="text-[10px] font-bold mt-1 text-orange-100">{streak} Day Streak</span>
                </div>
            </div>
        </div>
    );
};

// --- 0.5 TROPHY CASE (NEW) ---
export const TrophyCase = ({ badges = [] }) => {
    // Defines potential badges. We only show if unlocked or as silhouette.
    const allBadges = [
        { id: 'streak_7', label: '7 Day Streak', icon: Flame, color: 'text-orange-500', desc: 'Maintained consistency for a week.' },
        { id: 'audit_master', label: 'Audit Master', icon: ShieldCheck, color: 'text-emerald-500', desc: 'Completed 10 Daily Audits.' },
        { id: 'debt_slayer', label: 'Debt Slayer', icon: Zap, color: 'text-yellow-500', desc: 'Paid off a debt bucket.' },
        { id: 'zero_hero', label: 'Zero Hero', icon: Medal, color: 'text-blue-500', desc: 'Allocated budget perfectly to $0.' },
    ];

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Star size={14} className="text-amber-400" /> Trophy Case</h3>
            <div className="grid grid-cols-4 gap-2">
                {allBadges.map(badge => {
                    const isUnlocked = badges.includes(badge.id);
                    return (
                        <div key={badge.id} className={`aspect-square rounded-xl flex flex-col items-center justify-center p-2 text-center border transition-all ${isUnlocked ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50/50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 opacity-40 grayscale'}`}>
                            <badge.icon size={24} className={`mb-1 ${isUnlocked ? badge.color : 'text-slate-400'}`} />
                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 leading-tight">{badge.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- 1. SPEED DIAL ---
export const SpeedDial = ({ onAdd }) => {
  const [open, setOpen] = React.useState(false);
  const actions = [
    { label: 'Income', icon: TrendingUp, color: 'bg-emerald-500', type: 'income' },
    { label: 'Bill', icon: Calendar, color: 'bg-blue-500', type: 'bill' },
    { label: 'Variable', icon: Wallet, color: 'bg-purple-500', type: 'variable' },
    { label: 'Savings', icon: PiggyBank, color: 'bg-teal-500', type: 'savings' }, 
    { label: 'Debt', icon: CreditCard, color: 'bg-orange-500', type: 'debt' },
  ];
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      {open && actions.map((action, idx) => (
        <button key={idx} onClick={() => { onAdd(action.type); setOpen(false); }} className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg text-white font-bold transition-all animate-in slide-in-from-bottom-4 duration-200 ${action.color}`}><span className="text-sm">{action.label}</span><action.icon size={18} /></button>
      ))}
      <button onClick={() => setOpen(!open)} className={`p-4 rounded-full shadow-xl text-white transition-all duration-300 ${open ? 'bg-slate-800 rotate-45' : 'bg-emerald-600 hover:bg-emerald-700'}`}><Plus size={28} /></button>
    </div>
  );
};

// --- 2. PAYDAY BANNER ---
export const PaydayBanner = ({ incomes = [], onPayday }) => {
  const today = getTodayStr();
  const paydays = incomes.filter(i => i.nextDate && i.nextDate <= today && !i.isDerived);
  if (paydays.length === 0) return null;
  return (
    <div className="mb-6 p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none flex justify-between items-center text-white animate-in slide-in-from-top-4">
      <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-xl"><DollarSign size={24} /></div><div><h3 className="font-bold text-lg">It's Payday!</h3><p className="text-emerald-100 text-xs">{paydays.map(p => p.name).join(' & ')} ready to deposit.</p></div></div>
      <button onClick={onPayday} className="px-4 py-2 bg-white text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-50 transition-colors">Process</button>
    </div>
  );
};

// --- 3. CASH FLOW FORECAST ---
export const CashFlowForecast = ({ accounts = [], incomes = [], expenses = [] }) => {
  const data = React.useMemo(() => {
    const today = new Date();
    
    let runningBalance = accounts
        .filter(a => a.type === 'checking' || a.type === 'savings')
        .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    
    const dailyChange = {};

    const registerChange = (dateStr, amount) => {
        const key = makeDateKey(dateStr); 
        if (!key) return;
        if (!dailyChange[key]) dailyChange[key] = 0;
        dailyChange[key] += amount;
    };

    incomes.forEach(inc => {
        const start = inc.nextDate || inc.date; 
        if (!start) return;
        const occurrences = getOccurrencesInWindow(start, inc.frequency, today, 35);
        occurrences.forEach(dateStr => {
            registerChange(dateStr, Number(inc.amount) || 0);
        });
    });

    expenses.forEach(exp => {
        const start = exp.date || exp.dueDate || exp.nextDate;
        if (!start) return;
        const occurrences = getOccurrencesInWindow(start, exp.frequency, today, 35);
        occurrences.forEach(dateStr => {
            registerChange(dateStr, -(Number(exp.amount) || 0));
        });
    });

    const chartData = [];
    for (let i = 0; i <= 30; i++) {
        const d = addDays(today, i);
        const dateKey = makeDateKey(d);
        
        if (dailyChange[dateKey]) {
            runningBalance += dailyChange[dateKey];
        }

        chartData.push({
            displayDate: `${d.getMonth()+1}/${d.getDate()}`,
            rawDate: dateKey,
            balance: runningBalance / 100 
        });
    }
    return chartData;
  }, [accounts, incomes, expenses]);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          <XAxis 
            dataKey="displayDate" 
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            axisLine={false} 
            tickLine={false} 
            interval={2} 
          />
          <YAxis 
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
          />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Liquidity']}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorBal)" 
            animationDuration={500} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- 4. PARTNER MANAGER ---
export const PartnerManager = ({ onAdd, onDelete, partners = [], accounts = [] }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [newPartner, setNewPartner] = React.useState({ name: '', payFrequency: 'Biweekly', nextPayDate: '', depositAccountId: '' });

  const handleSave = () => {
    if (!newPartner.name) return;
    onAdd('partner', newPartner);
    setIsAdding(false);
    setNewPartner({ name: '', payFrequency: 'Biweekly', nextPayDate: '', depositAccountId: '' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users size={20} className="text-purple-500" /> Partners</h3>
        <button onClick={() => setIsAdding(!isAdding)} className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-600 dark:text-slate-300 hover:text-purple-600">{isAdding ? 'Cancel' : '+ Add Partner'}</button>
      </div>
      {isAdding && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
          <input className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder="Partner Name" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-2">
            <select className="p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={newPartner.payFrequency} onChange={e => setNewPartner({...newPartner, payFrequency: e.target.value})}><option>Weekly</option><option>Biweekly</option><option>Twice a Month</option><option>Monthly</option></select>
            <input type="date" className="p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={newPartner.nextPayDate} onChange={e => setNewPartner({...newPartner, nextPayDate: e.target.value})} />
          </div>
          <select className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={newPartner.depositAccountId} onChange={e => setNewPartner({...newPartner, depositAccountId: e.target.value})}><option value="">Default Deposit Account...</option>{accounts.filter(a => a.type === 'checking').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <button onClick={handleSave} className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">Save Partner</button>
        </div>
      )}
      <div className="space-y-2">
        {partners.map(p => {
            const depositAcc = accounts.find(a => a.id === p.depositAccountId) || accounts.find(a => a.type === 'checking');
            return (
                <div key={p.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">{(p.name || '?')[0]}</div>
                        <div><div className="font-bold text-sm text-slate-800 dark:text-white">{p.name || 'Unnamed'}</div><div className="text-[10px] text-slate-400">{p.payFrequency} • Next: {p.nextPayDate || 'N/A'}</div></div>
                    </div>
                    <div className="text-right"><div className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 mb-1">{depositAcc ? depositAcc.name : 'No Account'}</div><button onClick={() => onDelete(p.id, 'partner')} className="text-[10px] text-red-400 hover:text-red-600 underline">Remove</button></div>
                </div>
            );
        })}
        {partners.length === 0 && !isAdding && <p className="text-center text-xs text-slate-400 py-4">No partners added.</p>}
      </div>
    </div>
  );
};

// --- 5. LIQUIDITY TREND CHART ---
export const LiquidityTrendChart = ({ snapshots = [] }) => {
    const data = React.useMemo(() => {
        if (!snapshots || snapshots.length === 0) return [];
        
        const safeDate = (d) => {
            if (!d) return new Date();
            if (d.seconds) return new Date(d.seconds * 1000);
            return new Date(d);
        };

        return [...snapshots]
            .sort((a, b) => safeDate(a.date) - safeDate(b.date))
            .slice(-14)
            .map(s => {
                const d = safeDate(s.date);
                const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
                
                return {
                    date: dateStr,
                    netWorth: Number(s.netWorth || 0) / 100,
                    liquidity: Number(s.totalLiquid || 0) / 100
                };
            });
    }, [snapshots]);

    if (data.length === 0) return <div className="flex h-full items-center justify-center text-xs text-slate-400">Perform a Daily Audit to see history.</div>;

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={2}/>
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value) => [`$${value.toFixed(0)}`, '']} labelFormatter={() => ''} />
                    <Area type="monotone" dataKey="liquidity" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLiq)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};