import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getTodayStr, getOccurrencesInWindow } from '../../lib/finance';

const BillCalendar = ({ expenses, incomes, transactions = [] }) => {
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(); // 0 = Sun

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  const prevMonth = () => setViewDate(new Date(year, viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, viewDate.getMonth() + 1, 1));

  // --- BUILD EVENTS MAP ---
  const events = {};

  // 1. Paid History (From Transactions) - Renders actual past payments
  transactions.forEach(t => {
      if (t.type === 'bill_paid' && t.createdAt) {
          const dateObj = t.createdAt.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.createdAt);
          if (dateObj.getMonth() === viewDate.getMonth() && dateObj.getFullYear() === viewDate.getFullYear()) {
              const day = dateObj.getDate();
              if (!events[day]) events[day] = [];
              events[day].push({
                  id: t.id,
                  name: t.itemName,
                  type: 'paid',
                  isPaid: true
              });
          }
      }
  });

  // Helper to process recurrences
  const processRecurrences = (items, itemType) => {
    const startOfMonth = new Date(year, viewDate.getMonth(), 1);
    
    items.forEach(item => {
        // EXCLUSION: If this is an "Owed Only" tracker, skip it on the calendar
        if (item.splitConfig?.isOwedOnly) return;

        const dateStr = item.date || item.dueDate || item.nextDate || item.targetDate;
        if (!dateStr) return;

        // Generate all occurrences for this specific month view
        // We look 35 days ahead from start of month to catch everything
        const occurrences = getOccurrencesInWindow(dateStr, item.frequency, startOfMonth, daysInMonth);

        occurrences.forEach(occDateStr => {
            const [oy, om, od] = occDateStr.split('-').map(Number);
            
            // Double check strict month match (occ engine might bleed slightly)
            if (om - 1 === viewDate.getMonth()) {
                if (!events[od]) events[od] = [];
                
                let finalType = itemType;
                if (item.type === 'variable') finalType = 'variable';
                if (item.type === 'savings') finalType = 'savings';
                if (item.type === 'debt') finalType = 'debt';

                events[od].push({
                    id: item.id,
                    name: item.name,
                    amount: item.amount,
                    type: finalType,
                    isPaid: item.isPaid
                });
            }
        });
    });
  };

  // 2. Process Expenses (Bills, etc)
  processRecurrences(expenses, 'bill');

  // 3. Process Incomes
  processRecurrences(incomes, 'income');

  // Helper to render event list
  const renderEvents = (dayEvents) => {
    if (!dayEvents || dayEvents.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5 mt-2">
        {dayEvents.map((ev, idx) => {
            let bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
            if (ev.type === 'income') bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            else if (ev.type === 'paid') bgClass = 'bg-slate-100 text-slate-400 line-through decoration-slate-400 border-slate-200 opacity-80';
            else if (ev.type === 'variable') bgClass = 'bg-blue-100 text-blue-800 border-blue-200';
            else if (ev.type === 'savings') bgClass = 'bg-purple-100 text-purple-800 border-purple-200';
            else if (ev.type === 'debt') bgClass = 'bg-orange-100 text-orange-800 border-orange-200';
            else bgClass = 'bg-orange-50 text-orange-700 border-orange-200'; // Standard Bills

            return (
                <div key={`${ev.id}-${idx}`} className={`text-[10px] font-medium truncate px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${bgClass}`}>
                    {ev.type === 'paid' && <CheckCircle2 size={10}/>}
                    {ev.name}
                </div>
            );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <CalendarIcon className="text-slate-400"/> {monthName} {year}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><ChevronLeft size={20}/></button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = getTodayStr() === `${year}-${String(viewDate.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          return (
            <div key={day} className={`h-[110px] p-2 rounded-xl border transition-colors flex flex-col ${isToday ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
              <div className={`text-xs font-bold mb-1 shrink-0 ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>{day}</div>
              
              {/* SCROLLABLE AREA for Events */}
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
                 {renderEvents(events[day])}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillCalendar;