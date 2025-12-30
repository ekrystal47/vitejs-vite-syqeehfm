import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { Money, getOccurrencesInWindow, getTodayStr } from '../../lib/finance';
import { Info } from 'lucide-react';

const FlowVisualizer = ({ incomes, expenses }) => {
  const today = new Date();
  // Start of current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  // Days in current month
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Helper: Calculate ACTUAL amount occurring this specific month
  const getMonthlyActual = (item) => {
    // 1. If it's a Savings Goal (Monthly Contribution), use that directly
    if (item.type === 'savings' && item.frequency === 'Monthly') return item.amount;
    
    // 2. For everything else, count occurrences in this calendar month
    const dateStr = item.date || item.dueDate || item.nextDate || item.targetDate;
    if (!dateStr) return 0;

    const occurrences = getOccurrencesInWindow(dateStr, item.frequency, startOfMonth, daysInMonth);
    
    // Sum up the amount for each occurrence (e.g. 4 weekly grocery trips)
    // Note: Variable expenses might be "Budget Pools", so we take the full budget amount if it resets this month.
    // For simplicity/accuracy: We sum the 'amount' for every reset/due date that falls in this month.
    return occurrences.length * (item.amount || 0);
  };

  // -- INFLOWS --
  let totalIncome = 0;
  const incomeNodes = incomes.map((inc, idx) => {
    const val = getMonthlyActual(inc);
    totalIncome += val;
    return { name: inc.name, value: val, type: 'source' };
  }).filter(n => n.value > 0); // Only show incomes happening this month

  // -- OUTFLOWS --
  let totalBills = 0;
  let totalDebt = 0;
  let totalSavings = 0;
  let totalVariable = 0;

  expenses.forEach(e => {
    const val = getMonthlyActual(e);
    if (e.type === 'bill') totalBills += val;
    else if (e.type === 'debt') totalDebt += val;
    else if (e.type === 'savings') totalSavings += val;
    else if (e.type === 'variable') totalVariable += val;
  });

  const totalExpenses = totalBills + totalDebt + totalSavings + totalVariable;
  const surplus = Math.max(0, totalIncome - totalExpenses);

  // 2. Construct Sankey Data
  const nodes = [
    ...incomeNodes.map(i => ({ name: i.name, fill: '#10b981' })), 
    { name: 'This Month', fill: '#3b82f6' },                    
    { name: 'Fixed Bills', fill: '#f59e0b' },                     
    { name: 'Lifestyle & Variable', fill: '#ec4899' },            
    { name: 'Debt Repayment', fill: '#ef4444' },                  
    { name: 'Savings & Goals', fill: '#8b5cf6' },                 
    { name: 'Unallocated Surplus', fill: '#06b6d4' }              
  ];

  const hubIndex = incomeNodes.length;
  const destStart = hubIndex + 1;

  const links = [];

  // Link Incomes -> Hub
  incomeNodes.forEach((inc, idx) => {
    if (inc.value > 0) {
        links.push({ source: idx, target: hubIndex, value: inc.value });
    }
  });

  // Link Hub -> Destinations
  if (totalBills > 0) links.push({ source: hubIndex, target: destStart, value: totalBills });
  if (totalVariable > 0) links.push({ source: hubIndex, target: destStart + 1, value: totalVariable });
  if (totalDebt > 0) links.push({ source: hubIndex, target: destStart + 2, value: totalDebt });
  if (totalSavings > 0) links.push({ source: hubIndex, target: destStart + 3, value: totalSavings });
  if (surplus > 0) links.push({ source: hubIndex, target: destStart + 4, value: surplus });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const isLink = data.payload.source !== undefined;
      const val = data.value; 

      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs z-50">
          {isLink ? (
             <>
               <div className="font-bold mb-1 opacity-80">{data.payload.source.name} <span className="text-slate-400">→</span> {data.payload.target.name}</div>
               <div className="text-white font-bold text-lg">{Money.format(val)}</div>
             </>
          ) : (
             <>
               <div className="font-bold mb-1 opacity-80">{data.payload.name}</div>
               <div className="text-white font-bold text-lg">{Money.format(val)}</div>
             </>
          )}
        </div>
      );
    }
    return null;
  };

  if (totalIncome === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Add Income with a date in THIS month to see Flow.</div>;

  return (
    <div className="h-[600px] w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Cash Flow River</h2>
            <p className="text-xs text-slate-500">Actuals for {today.toLocaleString('default', { month: 'long' })}</p>
        </div>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Info size={20}/></div>
      </div>
      
      <div className="flex-1 -ml-4 font-sans">
        <ResponsiveContainer width="100%" height="100%">
            <Sankey
                data={{ nodes, links }}
                node={{ stroke: 'none', strokeWidth: 0 }} 
                link={{ stroke: '#94a3b8', strokeOpacity: 0.4, fill: 'none' }} 
                nodePadding={50}
                margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                sort={false}
            >
                <Tooltip content={<CustomTooltip />} />
            </Sankey>
        </ResponsiveContainer>
      </div>
      
      <div className="flex gap-8 justify-center border-t border-slate-100 dark:border-slate-800 pt-6 mt-2">
         <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">In (This Month)</div>
            <div className="font-bold text-emerald-500 text-lg">{Money.format(totalIncome)}</div>
         </div>
         <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Out (This Month)</div>
            <div className="font-bold text-orange-500 text-lg">{Money.format(totalExpenses)}</div>
         </div>
         <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Surplus</div>
            <div className={`font-bold text-lg ${surplus > 0 ? 'text-blue-500' : 'text-slate-300'}`}>{Money.format(surplus)}</div>
         </div>
      </div>
    </div>
  );
};

export default FlowVisualizer;