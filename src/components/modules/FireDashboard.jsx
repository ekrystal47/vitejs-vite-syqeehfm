import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Target, Building2, Calendar, TrendingUp, Flame, Info } from 'lucide-react';
import { StatCard } from '../ui/Cards';
import { Money, getAnnualAmount } from '../../lib/finance';

const FireDashboard = ({ expenses, incomes, accounts }) => {
  const [currentAge, setCurrentAge] = useState(() => Number(localStorage.getItem('oneview_fire_age')) || 30);
  const [leanMode, setLeanMode] = useState(() => localStorage.getItem('oneview_fire_lean') === 'true');
  const [spendingCut, setSpendingCut] = useState(() => Number(localStorage.getItem('oneview_fire_cut')) || 0);
  const [showInfo, setShowInfo] = useState(false);
  const [visible, setVisible] = useState({ path: true, coast: true, target: true });

  useEffect(() => localStorage.setItem('oneview_fire_age', currentAge), [currentAge]);
  useEffect(() => localStorage.setItem('oneview_fire_lean', leanMode), [leanMode]);
  useEffect(() => localStorage.setItem('oneview_fire_cut', spendingCut), [spendingCut]);

  const annualIncome = incomes.reduce((sum, i) => sum + getAnnualAmount(i.amount, i.frequency), 0);
  const activeExpenses = expenses.filter(e => ['bill','variable','debt'].includes(e.type));
  const annualSpend = activeExpenses.reduce((sum, e) => {
    if (leanMode && !e.isEssential && e.type !== 'debt') return sum;
    return sum + getAnnualAmount(e.amount, e.frequency);
  }, 0);

  const adjustedAnnualSpend = Math.max(0, annualSpend - (spendingCut * 100 * 12));
  const fireNumber = adjustedAnnualSpend * 25;
  const savingsRate = annualIncome > 0 ? (annualIncome - adjustedAnnualSpend) / annualIncome : 0;
  const currentInvested = accounts.reduce((sum, a) => (a.type === 'investment' || a.type === 'savings') ? sum + (a.currentBalance || 0) : sum, 0);
  const progress = fireNumber > 0 ? (currentInvested / fireNumber) * 100 : 0;

  const projectionData = useMemo(() => {
    const data = [];
    const r = 0.07;
    const annualSavings = annualIncome - adjustedAnnualSpend;
    let pot = currentInvested;
    let coastPot = currentInvested;

    for(let age = currentAge; age <= 65; age++) {
      data.push({
        age,
        currentPath: Math.round(Money.fromCents(pot)),
        coastPath: Math.round(Money.fromCents(coastPot)),
        fireTarget: Math.round(Money.fromCents(fireNumber))
      });
      pot = (pot * (1 + r)) + annualSavings;
      coastPot = (coastPot * (1 + r));
    }
    return data;
  }, [currentInvested, annualIncome, adjustedAnnualSpend, currentAge, fireNumber]);

  const freedomYear = projectionData.find(d => d.currentPath >= d.fireTarget);
  const freedomAge = freedomYear ? freedomYear.age : "65+";
  const yearsToFreedom = typeof freedomAge === 'number' ? freedomAge - currentAge : "N/A";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Independence</h2>
          <p className="text-slate-500">Your path to financial freedom.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:text-slate-800 transition-colors"><Info size={20}/></button>
          <div className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 px-2">Mode:</span>
            <button onClick={() => setLeanMode(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${!leanMode ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>Standard</button>
            <button onClick={() => setLeanMode(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${leanMode ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>Lean FIRE</button>
          </div>
        </div>
      </div>
      {showInfo && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">How is this calculated?</h3>
          <ul className="list-disc list-inside text-sm text-indigo-800 dark:text-indigo-400 space-y-1">
            <li><strong>Freedom Number:</strong> Your Annual Expenses × 25. This is based on the "4% Rule".</li>
            <li><strong>Coast FIRE:</strong> How your investments grow if you stop contributing today.</li>
            <li><strong>Current Path:</strong> Trajectory with your current savings rate.</li>
            <li><strong>Savings Rate:</strong> (Total Income - Total Expenses) / Total Income.</li>
          </ul>
        </div>
      )}
      
      {/* STAT CARDS: Strict Grid to prevent shifting */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        <StatCard title="Freedom Number" value={Money.format(fireNumber)} icon={Target} subtitle={leanMode ? "Essential Expenses x 25" : "All Expenses x 25"}/>
        <StatCard title="Invested Assets" value={Money.format(currentInvested)} icon={Building2} subtitle={`${progress.toFixed(1)}% Complete`}/>
        <StatCard title="Years to Freedom" value={yearsToFreedom} icon={Calendar} subtitle={`Age ${freedomAge}`} isPositive={true}/>
        <StatCard title="Savings Rate" value={`${(savingsRate*100).toFixed(1)}%`} icon={TrendingUp} subtitle="Income - Spend" isPositive={savingsRate > 0.2}/>
      </div>

      {/* CHART SECTION: Added overflow-hidden to stop overlap */}
       <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full overflow-hidden min-w-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Wealth Projection</h3>
          <div className="flex gap-2">
            <button onClick={() => setVisible({...visible, path: !visible.path})} className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${visible.path ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}><div className={`w-2 h-2 rounded-full ${visible.path ? 'bg-emerald-500' : 'bg-slate-300'}`}/> Current</button>
            <button onClick={() => setVisible({...visible, coast: !visible.coast})} className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${visible.coast ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-400'}`}><div className={`w-2 h-2 rounded-full ${visible.coast ? 'bg-purple-500' : 'bg-slate-300'}`}/> Coast</button>
            <button onClick={() => setVisible({...visible, target: !visible.target})} className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${visible.target ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-400'}`}><div className={`w-2 h-2 rounded-full border border-dashed ${visible.target ? 'border-orange-500' : 'border-slate-300'}`}/> Target</button>
          </div>
        </div>
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPath" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
              <XAxis dataKey="age" tick={{fontSize: 12}} stroke="#94a3b8"/>
              <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 12}} stroke="#94a3b8" domain={[0, 'auto']}/>
              <RechartsTooltip formatter={(val) => `$${val.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
              {visible.path && <Area type="monotone" dataKey="currentPath" stroke="#10b981" strokeWidth={3} fillOpacity={0.4} fill="url(#colorPath)" />}
              {visible.coast && <Line type="monotone" dataKey="coastPath" stroke="#a855f7" strokeWidth={3} dot={false} strokeDasharray="3 3"/>}
              {visible.target && <ReferenceLine y={Money.fromCents(fireNumber)} stroke="orange" strokeDasharray="5 5" label={{ position: 'insideTopRight',  value: 'FIRE', fill: 'orange', fontSize: 10 }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold uppercase text-slate-500">Accelerate: Cut Monthly Spending</label>
            <span className="font-bold text-emerald-600">-${spendingCut}/mo</span>
          </div>
          <input type="range" min="0" max="2000" step="50" value={spendingCut} onChange={(e) => setSpendingCut(Number(e.target.value))} className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
          <p className="text-xs text-slate-400 mt-2">Current Age: <input type="number" value={currentAge} onChange={e => setCurrentAge(Number(e.target.value))} className="w-12 bg-transparent border-b border-slate-300 text-center font-bold"/> (Edit to update chart)</p>
        </div>
      </div>
    </div>
  );
};

export default FireDashboard;