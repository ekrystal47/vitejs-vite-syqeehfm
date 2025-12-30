import React, { useState, useEffect, useRef } from 'react';
import { Money } from '../../lib/finance';

export const MoneyInput = ({ value, onChange, placeholder = "0.00" }) => {
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
    <div className="relative flex items-center">
      <span className="absolute left-3 text-slate-400 font-bold text-lg">$</span>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
        className="w-full pl-7 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white text-lg focus:border-emerald-500 outline-none transition-all"
        placeholder={placeholder}
      />
    </div>
  );
};

export const DateInput = ({ value, onChange, label }) => (
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

export const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${checked ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}
  >
    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
  </button>
);

export const FrequencySelect = ({ value, onChange }) => (
  <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none" value={value || 'Monthly'} onChange={onChange}>
    <option>Weekly</option>
    <option>Biweekly</option>
    <option>Twice a Month</option>
    <option>Every 4 Weeks</option>
    <option>Monthly</option>
    <option>Every 2 Months</option>
    <option>Quarterly</option>
    <option>Semi-Annually</option>
    <option>Annually</option>
    <option>One-Time</option>
  </select>
);