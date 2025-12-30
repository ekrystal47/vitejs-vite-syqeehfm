// --- FORMATTING & MATH ---
export const Money = {
  format: (cents) => {
    if (cents === undefined || cents === null || isNaN(cents)) return '$0.00';
    const num = Number(cents);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 100);
  },
  toCents: (amountStr) => {
    if (!amountStr) return 0;
    if (typeof amountStr === 'number') return Math.round(amountStr * 100);
    const clean = amountStr.toString().replace(/[^0-9.-]/g, '');
    return Math.round(parseFloat(clean || 0) * 100);
  },
  fromCents: (cents) => {
      return (Number(cents) || 0) / 100;
  }
};

// --- DATE HELPERS ---
export const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (dateInput, days) => {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + days);
  return date;
};

// --- RECURRENCE ---
export const getNextDateStr = (currentDateStr, frequency) => {
  if (!currentDateStr) return getTodayStr();
  const [yStr, mStr, dStr] = currentDateStr.split('-');
  let year = parseInt(yStr); let month = parseInt(mStr) - 1; let day = parseInt(dStr);
  const date = new Date(year, month, day);

  switch (frequency) {
    case 'Weekly': date.setDate(date.getDate() + 7); break;
    case 'Biweekly': date.setDate(date.getDate() + 14); break;
    case 'Twice a Month': date.setDate(date.getDate() + 15); break; 
    case 'Every 4 Weeks': date.setDate(date.getDate() + 28); break;
    case 'Monthly': date.setMonth(date.getMonth() + 1); if (date.getDate() !== day) date.setDate(0); break;
    case 'Every 2 Months': date.setMonth(date.getMonth() + 2); break;
    case 'Quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'Semi-Annually': date.setMonth(date.getMonth() + 6); break;
    case 'Annually': date.setFullYear(date.getFullYear() + 1); break;
    default: break; 
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getPreviousDateStr = (dateStr, frequency) => {
  if (!dateStr) return '';
  const [yStr, mStr, dStr] = dateStr.split('-');
  const date = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));

  switch (frequency) {
    case 'Weekly': date.setDate(date.getDate() - 7); break;
    case 'Biweekly': date.setDate(date.getDate() - 14); break;
    case 'Twice a Month': date.setDate(date.getDate() - 15); break;
    case 'Every 4 Weeks': date.setDate(date.getDate() - 28); break;
    case 'Monthly': date.setMonth(date.getMonth() - 1); break;
    case 'Every 2 Months': date.setMonth(date.getMonth() - 2); break;
    case 'Quarterly': date.setMonth(date.getMonth() - 3); break;
    case 'Semi-Annually': date.setMonth(date.getMonth() - 6); break; 
    case 'Annually': date.setFullYear(date.getFullYear() - 1); break;
    default: date.setMonth(date.getMonth() - 1); break; 
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// --- FORECASTING ---
export const getOccurrencesInWindow = (startDateStr, frequency, windowStartObj, daysInWindow) => {
  if (!startDateStr) return [];
  const occurrences = [];
  const windowEnd = new Date(windowStartObj);
  windowEnd.setDate(windowEnd.getDate() + daysInWindow);
  
  const [yStr, mStr, dStr] = startDateStr.split('-');
  let current = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));
  let limit = 0;
  while (current <= windowEnd && limit < 50) {
    if (current >= windowStartObj) {
      occurrences.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`);
    }
    switch (frequency) {
      case 'Weekly': current.setDate(current.getDate() + 7); break;
      case 'Biweekly': current.setDate(current.getDate() + 14); break;
      case 'Monthly': current.setMonth(current.getMonth() + 1); break;
      default: current.setMonth(current.getMonth() + 1); break;
    }
    limit++;
  }
  return occurrences;
};

export const countPaydaysInWindow = (startStr, endStr, payDateStr, payFreq) => {
  if (!startStr || !endStr || !payDateStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const [py, pm, pd] = payDateStr.split('-').map(Number);
  let currentPay = new Date(py, pm - 1, pd);
  while (currentPay > start) {
       switch (payFreq) {
          case 'Weekly': currentPay.setDate(currentPay.getDate() - 7); break;
          case 'Biweekly': currentPay.setDate(currentPay.getDate() - 14); break;
          case 'Monthly': currentPay.setMonth(currentPay.getMonth() - 1); break;
          default: currentPay.setDate(currentPay.getDate() - 14); break;
      }
  }
  let count = 0; let safety = 0;
  while (currentPay <= end && safety < 100) { 
      if (currentPay >= start) count++;
      switch (payFreq) {
          case 'Weekly': currentPay.setDate(currentPay.getDate() + 7); break;
          case 'Biweekly': currentPay.setDate(currentPay.getDate() + 14); break;
          case 'Monthly': currentPay.setMonth(currentPay.getMonth() + 1); break;
          default: currentPay.setDate(currentPay.getDate() + 14); break;
      }
      safety++;
  }
  return count;
};

export const calculateDynamicAllocation = (expense, primaryIncome) => {
  if (!expense || !primaryIncome) return 0;
  const annualCost = getAnnualAmount(expense.amount, expense.frequency);
  const paychecksPerYear = getAnnualAmount(1, primaryIncome.frequency);
  return Math.ceil(annualCost / (paychecksPerYear || 1));
};

export const getAnnualAmount = (amount, frequency) => {
  if (!amount) return 0;
  switch (frequency) {
    case 'Weekly': return amount * 52;
    case 'Biweekly': return amount * 26;
    case 'Twice a Month': return amount * 24;
    case 'Monthly': return amount * 12;
    case 'Quarterly': return amount * 4;
    case 'Semi-Annually': return amount * 2;
    case 'Annually': return amount;
    default: return amount;
  }
};

export const calculateIdealBalance = (expense, primaryIncome) => {
    if (!expense.amount || !expense.date && !expense.dueDate) return 0;
    return 0; 
};

export const calculateSinkingFund = (targetAmount, currentBalance, targetDateStr) => {
  if (!targetAmount || !targetDateStr) return 0;
  const today = new Date();
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  if (target <= today) return Math.max(0, targetAmount - (currentBalance || 0));
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  const remaining = Math.max(0, targetAmount - (currentBalance || 0));
  if (months <= 0) return remaining;
  return Math.ceil(remaining / months);
};

// --- RESERVED FUNDS CALCULATOR ---
export const getReservedAmount = (items, accountId) => {
    return items.reduce((sum, item) => {
        if (item.accountId !== accountId) return sum;
        if (item.splitConfig?.isOwedOnly) return sum;
        
        // 1. CLEARED = 0. Always.
        if (item.isCleared) return sum;

        // 2. PAID = 0. (Because it is shown as "Pending" in Blue, not Reserved Amber)
        if (item.isPaid) return sum;

        let itemTotal = 0;
        
        // 3. ALLOCATED / UNPAID (Sitting in Bucket)
        // Whatever is currently in the bucket is reserved.
        itemTotal += (item.currentBalance || 0);

        // Special Case: Fixed Bills that are due SOON (within 35 days) but have $0 balance.
        // We count the amount to show you need this money *now*.
        if (['bill', 'loan'].includes(item.type) && (item.currentBalance||0) < item.amount) {
            const today = new Date();
            const due = new Date(item.date || item.dueDate);
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 35) {
                itemTotal = Math.max(itemTotal, item.amount);
            }
        }
        
        // Special Case: Fixed Loan-Like Debt
        if (item.type === 'debt' && item.amount > 0 && !item.targetBalance) {
             const today = new Date();
             const due = new Date(item.date || item.dueDate);
             const diffTime = due - today;
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             if (diffDays <= 35 && (item.currentBalance || 0) < item.amount) {
                 itemTotal = Math.max(itemTotal, item.amount);
             }
        }

        return sum + itemTotal;
    }, 0);
};