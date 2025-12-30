import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Wallet, Building2, Settings, LogOut, Sun, Moon, Menu, RefreshCw, 
  CheckCircle2, Sparkles, ShieldCheck, TrendingDown, Medal, CreditCard as CardIcon, 
  Info, TrendingUp, PiggyBank, RotateCcw, Flame, CreditCard, Trash2, Activity, History, Zap, ArrowLeftRight, Check, FlaskConical, XCircle, PieChart, CalendarDays, Undo2
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, 
  runTransaction, orderBy, limit, getDoc, setDoc, where, getDocs 
} from 'firebase/firestore';

// --- IMPORTS ---
import { auth, db } from './lib/firebase'; 
import { Money, getTodayStr, getNextDateStr, getPreviousDateStr, calculateDynamicAllocation, getAnnualAmount, countPaydaysInWindow, getOccurrencesInWindow, getReservedAmount } from './lib/finance';
import AuthScreen from './components/modules/AuthScreen';
import FireDashboard from './components/modules/FireDashboard';
import PaydayWizard from './components/modules/PaydayWizard';
import UnifiedEntryModal from './components/modules/UnifiedEntryModal';
import BillCalendar from './components/modules/BillCalendar'; 
import FlowVisualizer from './components/modules/FlowVisualizer'; 
import ActionCenter from './components/modules/ActionCenter'; 
import { StatCard, ItemCard } from './components/ui/Cards';
import Confetti from './components/ui/Confetti'; 
import { SpeedDial, PaydayBanner, CashFlowForecast, PartnerManager, LiquidityTrendChart, GameStats, TrophyCase } from './components/modules/Widgets'; 
import { 
  DailyAuditModal, CycleEndModal, SafeToSpendInfoModal, CreditPaymentModal, 
  ReservedBreakdownModal, PartnerIncomeBreakdownModal, ToastContainer, ConfirmationModal 
} from './components/modules/HelperModals';
import TransactionHistoryModal from './components/modules/TransactionHistoryModal'; 
import QuickLogModal from './components/modules/QuickLogModal'; 
import DebtSimulatorModal from './components/modules/DebtSimulatorModal';
import FundMoverModal from './components/modules/FundMoverModal'; 
import BackupManager from './components/modules/BackupManager'; 
import PayDebtModal from './components/modules/PayDebtModal'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [permissionError, setPermissionError] = useState(false);

  // --- DATA STATE (LIVE) ---
  const [liveAccounts, setLiveAccounts] = useState([]);
  const [liveIncomes, setLiveIncomes] = useState([]);
  const [liveExpenses, setLiveExpenses] = useState([]);
  const [livePartners, setLivePartners] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [transactions, setTransactions] = useState([]); 
  const [gameStats, setGameStats] = useState({ level: 1, xp: 0, streak: 0, lastAuditDate: '', nextLevelXP: 100, badges: [] });

  // --- SIMULATION STATE ---
  const [isSimMode, setIsSimMode] = useState(false);
  const [simData, setSimData] = useState({ accounts: [], incomes: [], expenses: [], partners: [] });

  // --- UI STATE ---
  const [modalType, setModalType] = useState(null);
  const [modalContext, setModalContext] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showPayday, setShowPayday] = useState(false);
  const [showCycleEnd, setShowCycleEnd] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showSafeInfo, setShowSafeInfo] = useState(false);
  const [breakdownModal, setBreakdownModal] = useState(null); 
  const [breakdownIncome, setBreakdownIncome] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [payCardAccount, setPayCardAccount] = useState(null);
  const [sortType, setSortType] = useState('date');
  const [budgetView, setBudgetView] = useState('upcoming'); 
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({ isOpen: false });
  const [showConfetti, setShowConfetti] = useState(false); 
  
  // Feature Modals
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showDebtSim, setShowDebtSim] = useState(false);
  const [showFundMover, setShowFundMover] = useState(false);
  const [payingDebtItem, setPayingDebtItem] = useState(null); 
  const [historyView, setHistoryView] = useState({ isOpen: false, filterId: null, itemName: null });

  // --- ACTIVE DATA ---
  const accounts = isSimMode ? simData.accounts : liveAccounts;
  const incomes = isSimMode ? simData.incomes : liveIncomes;
  const expenses = isSimMode ? simData.expenses : liveExpenses;
  const partners = isSimMode ? simData.partners : livePartners;

  // --- ACTIONS ---
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const confirmAction = (title, message, actionLabel, action) => {
    setConfirmState({ isOpen: true, title, message, actionLabel, onConfirm: action });
  };

  // --- GAME ENGINE & SETUP ---
  const triggerConfetti = () => {
      setShowConfetti(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
      setTimeout(() => setShowConfetti(false), 3000);
  };

  const awardXP = async (amount) => {
      if (isSimMode) return;
      const newXP = gameStats.xp + amount;
      let newLevel = gameStats.level;
      let nextLevelXP = gameStats.nextLevelXP;

      if (newXP >= nextLevelXP) {
          newLevel += 1;
          nextLevelXP = Math.floor(nextLevelXP * 1.5);
          addToast(`LEVEL UP! You are now Level ${newLevel}! 🎉`, 'success');
          triggerConfetti(); 
      } else {
          addToast(`+${amount} XP`, 'success');
      }

      let newBadges = [...(gameStats.badges || [])];
      if (gameStats.streak >= 7 && !newBadges.includes('streak_7')) {
          newBadges.push('streak_7');
          addToast('BADGE UNLOCKED: 7 Day Streak! 🔥', 'success');
      }

      const newStats = { ...gameStats, level: newLevel, xp: newXP, nextLevelXP, badges: newBadges };
      setGameStats(newStats);
      await updateDoc(doc(db, 'users', user.uid, 'settings', 'gameStats'), newStats);
  };

  const checkStreak = async (stats) => {
      const today = getTodayStr();
      const lastAudit = stats.lastAuditDate;
      let newStreak = stats.streak;
      if (lastAudit === today) return; 
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (lastAudit !== yesterdayStr && lastAudit !== today) {
          if (newStreak > 0) {
              newStreak = 0;
              setGameStats(prev => ({ ...prev, streak: 0 }));
          }
      }
  };

  const toggleSimMode = () => {
    if (!isSimMode) {
      setSimData({
        accounts: JSON.parse(JSON.stringify(liveAccounts)),
        incomes: JSON.parse(JSON.stringify(liveIncomes)),
        expenses: JSON.parse(JSON.stringify(liveExpenses)),
        partners: JSON.parse(JSON.stringify(livePartners))
      });
      setIsSimMode(true);
      addToast("Entering Simulator Mode", "success");
    } else {
      setIsSimMode(false);
      setSimData({ accounts: [], incomes: [], expenses: [], partners: [] });
      addToast("Simulation Ended. Data Reverted.", "success");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLiveAccounts([]); setLiveIncomes([]); setLiveExpenses([]); setLivePartners([]); setSnapshots([]); setTransactions([]);
      return;
    }
    const getPath = (col) => collection(db, 'users', user.uid, col);
    const unsubAccounts = onSnapshot(query(getPath('accounts')), (snap) => setLiveAccounts(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(d => !d.deletedAt)));
    const unsubIncomes = onSnapshot(query(getPath('incomes')), (snap) => setLiveIncomes(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(d => !d.deletedAt)));
    const unsubExpenses = onSnapshot(query(getPath('expenses')), (snap) => setLiveExpenses(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(d => !d.deletedAt)));
    const unsubPartners = onSnapshot(query(getPath('partners')), (snap) => setLivePartners(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(d => !d.deletedAt)));
    const unsubSnapshots = onSnapshot(query(getPath('history_snapshots')), (snap) => setSnapshots(snap.docs.map(d => d.data())));
    const unsubGame = onSnapshot(doc(db, 'users', user.uid, 'settings', 'gameStats'), (doc) => {
        if (doc.exists()) { const stats = doc.data(); setGameStats(stats); checkStreak(stats); } 
        else { const initStats = { level: 1, xp: 0, streak: 0, lastAuditDate: '', nextLevelXP: 100, badges: [] }; setDoc(doc.ref, initStats); setGameStats(initStats); }
    });
    const unsubTransactions = onSnapshot(query(getPath('transactions'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubAccounts(); unsubIncomes(); unsubExpenses(); unsubPartners(); unsubSnapshots(); unsubTransactions(); unsubGame(); };
  }, [user]);

  // --- DERIVED INCOMES ---
  const derivedIncomes = useMemo(() => {
    const realIncomes = incomes.filter(i => !i.isDerived);
    const partnerIncomes = partners.map(p => {
      const partnerExpenses = expenses.filter(e => e.splitConfig && e.splitConfig.partnerId === p.id && !e.deletedAt);
      let totalNextCheck = 0;
      const contributingItems = [];
      const partnerPayDate = p.nextPayDate || getTodayStr();
      const partnerFreq = p.payFrequency || 'Biweekly';

      partnerExpenses.forEach(e => {
        const partnerShare = e.splitConfig.partnerAmount || 0;
        let cycleEnd = e.date || e.dueDate || e.nextDate;
        if (!cycleEnd) return;
        const occs = getOccurrencesInWindow(cycleEnd, e.frequency, new Date(partnerPayDate), 365);
        let targetDueDate = occs.find(d => d >= partnerPayDate); 
        if (!targetDueDate) targetDueDate = cycleEnd; 
        const targetStartDate = getPreviousDateStr(targetDueDate, e.frequency);
        const paydaysInCycle = countPaydaysInWindow(targetStartDate, targetDueDate, partnerPayDate, partnerFreq);
        const amountForThisCheck = Math.round(partnerShare / (paydaysInCycle || 1));
        totalNextCheck += amountForThisCheck;
        contributingItems.push({ 
            name: e.name, amount: partnerShare, calculatedAmount: amountForThisCheck, 
            frequency: e.frequency, isOwedOnly: e.splitConfig.isOwedOnly,
            paydaysInCycle: paydaysInCycle, dueDate: targetDueDate, currentBalance: e.currentBalance 
        });
      });
      if (totalNextCheck === 0) return null;
      return {
        id: `virtual-${p.id}`, name: `${p.name} (Split Reimbursement)`, amount: totalNextCheck, 
        frequency: partnerFreq, nextDate: partnerPayDate,
        accountId: p.depositAccountId || accounts.find(a => a.type==='checking')?.id,
        isDerived: true, isPrimary: false, breakdownItems: contributingItems, totalAnnual: 0 
      };
    }).filter(Boolean);
    return [...realIncomes, ...partnerIncomes];
  }, [incomes, partners, expenses, accounts]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handlePaydayComplete = async (completed, incomeId) => {
      setShowPayday(false);
      if (!completed) return; 
      let targetIncome = null;
      if (incomeId && incomeId.startsWith('virtual-')) targetIncome = derivedIncomes.find(i => i.id === incomeId);
      else targetIncome = incomeId ? incomes.find(i => i.id === incomeId) : (incomes.find(i => i.isPrimary) || incomes[0]);
      if (!targetIncome) return;

      const today = getTodayStr();
      let nextDate = getNextDateStr(targetIncome.nextDate || today, targetIncome.frequency);
      if (nextDate < today) nextDate = getNextDateStr(today, targetIncome.frequency);
      
      const isPartnerIncome = targetIncome.isDerived && targetIncome.id.startsWith('virtual-');
      if (isSimMode) {
          setSimData(prev => {
              if (isPartnerIncome) {
                  const partnerId = targetIncome.id.replace('virtual-', '');
                  return { ...prev, partners: prev.partners.map(p => p.id === partnerId ? { ...p, nextPayDate: nextDate } : p) };
              } else {
                  return { ...prev, incomes: prev.incomes.map(i => i.id === targetIncome.id ? { ...i, nextDate } : i) };
              }
          });
          addToast("Date Advanced (Sim)");
      } else {
          try {
              if (isPartnerIncome) {
                  const partnerId = targetIncome.id.replace('virtual-', '');
                  await updateDoc(doc(db, 'users', user.uid, 'partners', partnerId), { nextPayDate: nextDate }); 
                  addToast("Partner Pay Date Advanced");
              } else {
                  await updateDoc(doc(db, 'users', user.uid, 'incomes', targetIncome.id), { nextDate });
                  addToast("Income Date Advanced");
              }
              awardXP(100); triggerConfetti(); 
          } catch (e) { addToast("Failed to advance date: " + e.message, "error"); }
      }
  };

  // --- ACTIONS ---
  const handleAddItem = async (type, data) => {
    if (isSimMode) { return; }
    if (!user) return;
    let collectionName = 'expenses';
    if (type === 'income') collectionName = 'incomes';
    if (type === 'account') collectionName = 'accounts';
    if (type === 'partner') collectionName = 'partners';
    const payload = { ...data, updatedAt: serverTimestamp() };
    if (collectionName === 'accounts') {
      let specificType = data.accountType || data.type || 'checking';
      if(specificType === 'account') specificType = 'checking';
      payload.type = specificType.toLowerCase();
    } else { payload.type = type; }
    if (collectionName === 'expenses' && data.splitConfig && data.splitConfig.isSplit) {
      const totalAmount = data.amount;
      const partnerAmount = data.splitConfig.partnerAmount || 0;
      const myAmount = totalAmount - partnerAmount;
      if (data.splitConfig.payer === 'me') payload.amount = totalAmount; 
      else payload.amount = myAmount;
    }
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'users', user.uid, collectionName, editingItem.id), payload);
        addToast(`Updated ${payload.name}`); setEditingItem(null);
      } else {
        await addDoc(collection(db, 'users', user.uid, collectionName), { ...payload, createdAt: serverTimestamp() });
        addToast(`Added ${payload.name}`); awardXP(5); 
      }
    } catch (e) { if (e.code === 'permission-denied') setPermissionError(true); else addToast(`Error: ${e.message}`, 'error'); }
    setModalType(null); setModalContext(null);
  };

  const handleDelete = async (id, type) => {
    if (isSimMode) { return; }
    confirmAction("Delete Item", "This will move the item to trash.", "Delete", async () => {
      if (!user) return;
      let collectionName = 'expenses';
      if (type === 'income') collectionName = 'incomes';
      if (['account','checking','savings','credit','investment','loan'].includes(type)) collectionName = 'accounts';
      if (type === 'partner') collectionName = 'partners';
      try { await updateDoc(doc(db, 'users', user.uid, collectionName, id), { deletedAt: serverTimestamp() }); addToast("Item deleted"); } 
      catch(e) { addToast("Failed to delete", 'error'); }
    });
  };

  const handleAuditComplete = async () => { 
    if (isSimMode) { addToast("Audit Logged (Sim)"); setShowAudit(false); return; }
    setShowAudit(false);
    if (!user) return;
    let totalLiquid = 0; let netWorth = 0;
    accounts.forEach(acc => {
        const bal = acc.currentBalance || 0;
        if (['checking', 'savings', 'cash'].includes(acc.type)) totalLiquid += bal;
        if (acc.type === 'credit' || acc.type === 'loan') netWorth -= Math.abs(bal);
        else netWorth += bal;
    });
    try { await addDoc(collection(db, 'users', user.uid, 'history_snapshots'), { date: new Date().toISOString(), totalLiquid, netWorth }); } catch (e) {}
  };

  // --- NEW HELPER: ENSURE DEBT BUCKET EXISTS ---
  const ensureDebtBucketExists = async (accountId, accountName) => {
      // Logic: Check if a Debt Bucket already exists for this credit account
      // We do this OUTSIDE the transaction because we can't reliably query inside without knowing ID.
      // If missing, we create it.
      const existing = expenses.find(e => e.type === 'debt' && e.totalDebtBalance === accountId && !e.deletedAt);
      if (existing) return existing.id;

      // Create new
      try {
          const newDoc = await addDoc(collection(db, 'users', user.uid, 'expenses'), {
              name: `Pay ${accountName || 'Credit Card'}`,
              type: 'debt',
              totalDebtBalance: accountId, // This links it
              currentBalance: 0,
              amount: 0, // It's a revolving debt bucket
              frequency: 'Monthly',
              createdAt: serverTimestamp()
          });
          return newDoc.id;
      } catch (e) {
          console.error("Failed to create auto-debt bucket", e);
          return null;
      }
  };

  // --- UPDATED: CLEAR TRANSACTION LOGIC ---
  const handleClearTransaction = async (item) => {
      if (isSimMode) return;
      if (!user) return;

      const type = item.originalType || item.type; 
      const accountId = item.accountId;
      const account = accounts.find(a => a.id === accountId);
      const isCreditAccount = account?.type === 'credit';

      // PRE-FLIGHT: Ensure Debt Bucket exists if Credit
      let targetPayBucketId = null;
      if (isCreditAccount) {
          targetPayBucketId = await ensureDebtBucketExists(accountId, account.name);
          if (!targetPayBucketId) {
              addToast("Error: Could not find or create Payment Bucket.", "error");
              return;
          }
      }

      try {
          await runTransaction(db, async (transaction) => {
              const expenseRef = doc(db, 'users', user.uid, 'expenses', item.id);
              const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
              
              const accountDoc = await transaction.get(accountRef);
              const expDoc = await transaction.get(expenseRef);
              if (!accountDoc.exists() || !expDoc.exists()) throw new Error("Data missing");
              
              const expData = expDoc.data();
              const fundsInBucket = expData.currentBalance || 0; 
              
              // 1. HANDLE ACCOUNT BALANCE
              if (isCreditAccount) {
                  // CREDIT: Add to balance (Increase Debt)
                  const newBal = (accountDoc.data().currentBalance || 0) + expData.amount;
                  transaction.update(accountRef, { currentBalance: newBal });

                  // CREDIT: Move Reserved Funds to "Pay [Card]" Bucket
                  if (targetPayBucketId) {
                      const payCardRef = doc(db, 'users', user.uid, 'expenses', targetPayBucketId);
                      const payCardDoc = await transaction.get(payCardRef);
                      if (payCardDoc.exists()) {
                          const newPayCardBal = (payCardDoc.data().currentBalance || 0) + fundsInBucket;
                          transaction.update(payCardRef, { currentBalance: newPayCardBal });
                      }
                  }
              } else {
                  // CHECKING/CASH: Deduct from balance (Spend Money)
                  const newBal = (accountDoc.data().currentBalance || 0) - expData.amount;
                  transaction.update(accountRef, { currentBalance: newBal });
              }

              // 2. RESET EXPENSE
              const nextDate = getNextDateStr(expData.date || expData.dueDate, expData.frequency);
              const updates = { 
                  isPaid: false, 
                  isCleared: false, 
                  currentBalance: 0, 
              };
              
              if (expData.date) updates.date = nextDate;
              else updates.dueDate = nextDate;

              transaction.update(expenseRef, updates);
              
              // 3. LOG
              const transRef = doc(collection(db, 'users', user.uid, 'transactions'));
              transaction.set(transRef, {
                  createdAt: serverTimestamp(),
                  amount: -expData.amount,
                  type: 'bill_cleared',
                  itemId: item.id,
                  itemName: expData.name,
                  accountName: accountDoc.data().name,
                  originalAccountId: accountId // Store for undo
              });
          });

          addToast("Transaction Cleared & Finalized");
          awardXP(50);
      } catch (e) {
          addToast("Failed to clear: " + e.message, 'error');
      }
  };

  // --- NEW: UNDO HISTORY LOGIC ---
  const handleUndoTransaction = async (transactionItem) => {
      if (!user || isSimMode) return;
      
      try {
          if (transactionItem.type === 'bill_cleared') {
              // REVERSE CLEARING
              // 1. Find original expense
              const expRef = doc(db, 'users', user.uid, 'expenses', transactionItem.itemId);
              const expDoc = await getDoc(expRef);
              if (!expDoc.exists()) throw new Error("Expense missing");
              const expData = expDoc.data();

              // 2. Find Account
              const accountId = transactionItem.originalAccountId || expData.accountId;
              const accRef = doc(db, 'users', user.uid, 'accounts', accountId);
              const accDoc = await getDoc(accRef);
              
              // Determine logic based on account type
              const isCredit = accDoc.data().type === 'credit';
              const amount = Math.abs(transactionItem.amount); // positive amount

              await runTransaction(db, async (t) => {
                  // A. Restore Account Balance
                  const currentAccBal = (await t.get(accRef)).data().currentBalance || 0;
                  if (isCredit) {
                      // We added debt, so remove it
                      t.update(accRef, { currentBalance: currentAccBal - amount });
                      
                      // Remove funds from Pay Bucket
                      const payBucketId = await ensureDebtBucketExists(accountId, accDoc.data().name); // Should exist
                      const payRef = doc(db, 'users', user.uid, 'expenses', payBucketId);
                      const payDoc = await t.get(payRef);
                      if (payDoc.exists()) {
                          // Funds were moved TO here, so take them back
                          const currentPayBal = payDoc.data().currentBalance || 0;
                          // If currentBalance < amount, we just zero it (edge case protection)
                          t.update(payRef, { currentBalance: Math.max(0, currentPayBal - amount) });
                      }
                  } else {
                      // We spent money, so add it back
                      t.update(accRef, { currentBalance: currentAccBal + amount });
                  }

                  // B. Restore Expense State
                  // Revert date? This is hard if it's recurring. 
                  // For now, we just mark it PAID (Pending) and give the money back to the bucket.
                  // We do NOT revert the date because the user might just be fixing the status, not the schedule.
                  // Ideally we would revert date, but we don't know the previous date easily without storing it.
                  // Compromise: Just set isPaid=true, isCleared=false, and restore funds.
                  
                  // Restore funds to the expense bucket
                  const currentExpBal = (await t.get(expRef)).data().currentBalance || 0;
                  t.update(expRef, { 
                      isPaid: true, 
                      isCleared: false,
                      currentBalance: currentExpBal + amount // Put money back in envelope
                  });

                  // C. Delete Log
                  t.delete(doc(db, 'users', user.uid, 'transactions', transactionItem.id));
              });
              addToast("Transaction Reverted to Pending");

          } else if (transactionItem.type === 'bill_paid') {
              // REVERSE MARK PAID
              await updateDoc(doc(db, 'users', user.uid, 'expenses', transactionItem.itemId), {
                  isPaid: false
              });
              await updateDoc(doc(db, 'users', user.uid, 'transactions', transactionItem.id), {
                  type: 'reverted' // Soft delete log
              });
              addToast("Transaction Un-marked as Paid");
          }
      } catch (e) {
          addToast("Undo Failed: " + e.message, 'error');
      }
  };

  // --- ATOMIC UPDATE (Mark Paid / Unpaid) ---
  const updateExpense = async (id, field, value) => {
    // ... [Same updateExpense logic as previous]
    if (isSimMode) { return; }
    if (!user) return;
    const expenseItem = expenses.find(e => e.id === id);
    if (!expenseItem) return;
    try {
      if (field === 'isPaid') {
         if (value === true) {
            await updateDoc(doc(db, 'users', user.uid, 'expenses', id), { isPaid: true, isCleared: false });
            addToast("Marked Paid (Pending Clearance)");
            if (navigator.vibrate) navigator.vibrate(200);
         } else {
             await updateDoc(doc(db, 'users', user.uid, 'expenses', id), { isPaid: false, isCleared: false });
             addToast("Marked Unpaid");
         }
      } 
      else if (field === 'spent') { /* ... */ 
          const amount = value; const accRef = doc(db, 'users', user.uid, 'accounts', expenseItem.accountId); const expRef = doc(db, 'users', user.uid, 'expenses', id);
          await runTransaction(db, async (t) => {
              const accDoc = await t.get(accRef); const expDoc = await t.get(expRef);
              t.update(accRef, { currentBalance: (accDoc.data().currentBalance||0) - amount });
              t.update(expRef, { currentBalance: (expDoc.data().currentBalance||0) - amount });
          }); addToast("Spend Logged");
      }
      else if (field === 'addedFunds') {
          const current = expenseItem.currentBalance || 0;
          await updateDoc(doc(db, 'users', user.uid, 'expenses', id), { currentBalance: current + value });
          addToast("Funds Added");
      }
      else { await updateDoc(doc(db, 'users', user.uid, 'expenses', id), { [field]: value }); }
    } catch (e) { addToast("Update failed: " + e.message, 'error'); }
  };

  // --- CALCULATIONS ---
  const transferStrategy = useMemo(() => {
    const s = {}; accounts.forEach(a => s[a.id] = { requiredBalance: 0, pendingBalance: 0, totalFlow: 0, items: [], heldForCredit: 0, reservedItems: [] });
    expenses.forEach(e => {
      if (e.splitConfig?.isOwedOnly || e.isCleared) return;
      const targetAcc = accounts.find(a => a.id === e.accountId); if(!targetAcc) return;
      const isPending = e.isPaid && !e.isCleared; const currentRes = e.currentBalance || 0;
      if(targetAcc.type === 'credit' && targetAcc.linkedAccountId) {
        const backingId = targetAcc.linkedAccountId;
        if(s[backingId] && currentRes > 0) {
            s[backingId].heldForCredit += currentRes;
            s[backingId].reservedItems.push({ id: e.id, name: `${e.name} (Credit)`, amount: currentRes, type: 'Credit Hold', originalType: e.type, accountId: backingId, isPaid: e.isPaid, isCleared: e.isCleared });
        }
      } else {
        if(isPending) s[e.accountId].pendingBalance += currentRes; else s[e.accountId].requiredBalance += currentRes;
        if(currentRes > 0) s[e.accountId].reservedItems.push({ id: e.id, name: e.name, amount: currentRes, type: isPending ? 'Pending Clearance' : e.type, originalType: e.type, accountId: e.accountId, isPaid: e.isPaid, isCleared: e.isCleared });
      }
    }); return s;
  }, [expenses, accounts]);

  const safeToSpend = useMemo(() => {
    let totalSafe = 0; accounts.filter(a => a.type === 'checking').forEach(acc => {
      const strat = transferStrategy[acc.id]; const reserved = strat ? (strat.requiredBalance + strat.pendingBalance + strat.heldForCredit) : 0;
      const free = (acc.currentBalance || 0) - reserved; if (free > 0) totalSafe += free;
    }); return totalSafe;
  }, [accounts, transferStrategy]);

  // --- FORECAST FEED (FIXED: Date Parsing) ---
  const forecastFeed = useMemo(() => {
      if (!expenses.length) return [];
      const items = [];
      const windowStart = new Date(); // Current local time
      
      expenses.forEach(e => {
          if (['bill', 'subscription', 'loan'].includes(e.type)) {
               const startDate = e.date || e.dueDate || e.nextDate;
               if (!startDate) return;
               
               // Fix: Parse YYYY-MM-DD as local midnight to avoid timezone shifts
               const [y, m, d] = startDate.split('-').map(Number);
               const localStartDate = new Date(y, m - 1, d); 

               const occs = getOccurrencesInWindow(startDate, e.frequency, windowStart, 90);
               occs.forEach(dateStr => {
                   const isCurrentCycle = dateStr === startDate;
                   if (isCurrentCycle && e.isPaid) return; 
                   // Fix: Re-construct Date object locally for display sorting
                   const [oy, om, od] = dateStr.split('-').map(Number);
                   const localDate = new Date(oy, om - 1, od);

                   items.push({
                       id: e.id, name: e.name, amount: e.amount, date: dateStr, dateObj: localDate, original: e,
                       status: isCurrentCycle ? 'Due Soon' : 'Upcoming'
                   });
               });
          }
      });
      return items.sort((a,b) => a.dateObj - b.dateObj);
  }, [expenses]);

  // Sorting
  const sortedAccounts = useMemo(() => { return [...accounts].sort((a,b) => (a.order||0)-(b.order||0)); }, [accounts]);
  const sortedExpenses = useMemo(() => { return [...expenses].sort((a,b) => new Date(a.date) - new Date(b.date)); }, [expenses]);
  const totalDebt = useMemo(() => { /* ... */ return 0; }, [accounts]);
  const subBleed = useMemo(() => expenses.filter(e => e.isSubscription).reduce((sum, e) => sum + getAnnualAmount(e.amount, e.frequency)/12, 0), [expenses]);

  if (authLoading) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading...</div>;
  if (!user) return <AuthScreen />;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 text-slate-900 dark:text-slate-100 ${isSimMode ? 'bg-indigo-50 dark:bg-slate-950 border-[8px] border-indigo-500' : 'bg-slate-50 dark:bg-slate-950'}`}>
      {isSimMode && <div className="fixed top-0 left-0 w-full z-[100] bg-indigo-600 text-white text-center py-1 text-xs font-bold">SIMULATION MODE <button onClick={toggleSimMode} className="ml-2 underline">EXIT</button></div>}
      <Confetti isActive={showConfetti} />

      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-8 border-b border-slate-200 dark:border-slate-800"><div className="font-bold text-xl text-emerald-600">OneViewPro</div></div>
        <nav className="p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard }, 
            { id: 'budget', label: 'Budget Plan', icon: Wallet }, 
            { id: 'insights', label: 'Insights', icon: PieChart }, 
            { id: 'fire', label: 'Independence', icon: Flame }, 
            { id: 'accounts', label: 'Accounts', icon: Building2 }, 
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><item.icon className="w-5 h-5"/> {item.label}</button>
          ))}
        </nav>
      </aside>

      <main className="lg:ml-64 min-h-screen flex flex-col pb-20 relative">
        <header className="h-20 sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2"><Menu/></button>
           <div className="flex gap-3">
              <button onClick={toggleSimMode} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><FlaskConical size={20}/></button>
              <button onClick={() => setShowQuickLog(true)} className="p-2 rounded-lg bg-amber-100 text-amber-600"><Zap size={20}/></button>
           </div>
        </header>

        <div className="p-6 lg:p-8 flex-1 overflow-x-hidden">
          {activeTab === 'dashboard' && (
             <div className="space-y-8 animate-in fade-in">
                {/* ... (Keep existing Dashboard code) ... */}
                <div className="flex justify-between items-end">
                   <div><h1 className="text-3xl font-bold">Overview</h1><p className="text-slate-500">Financial Command Center</p></div>
                   <div className="flex gap-2">
                      <button onClick={() => setShowAudit(true)} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg font-bold flex gap-2 items-center"><CheckCircle2 size={16}/> Daily Audit</button>
                      <button onClick={() => setShowPayday(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex gap-2 items-center"><Sparkles size={16}/> Payday</button>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <StatCard title="Safe to Spend" value={Money.format(safeToSpend)} icon={ShieldCheck} isPositive={true} highlight />
                   <StatCard title="Total Debt" value={Money.format(totalDebt)} icon={TrendingDown} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {sortedAccounts.filter(a => !a.isHidden).map(acc => {
                      const strat = transferStrategy[acc.id] || { requiredBalance: 0, pendingBalance: 0, heldForCredit: 0 };
                      const isCredit = acc.type === 'credit';
                      const isTracking = ['loan', 'investment'].includes(acc.type);
                      const required = isCredit ? 0 : (strat.requiredBalance + strat.heldForCredit);
                      const pending = isCredit ? 0 : strat.pendingBalance;
                      const free = (acc.currentBalance || 0) - required - pending;
                      const totalUsed = required + pending + Math.max(0, free);
                      return (
                         <div key={acc.id} onClick={() => { if(acc.type === 'credit') setPayCardAccount(acc); else if(!isTracking) setBreakdownModal({ accountId: acc.id, name: acc.name }); }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-all">
                            <div className="flex justify-between items-center mb-4">
                               <div className="flex items-center gap-3">
                                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><Building2/></div>
                                  <div><h3 className="font-bold text-lg">{acc.name}</h3><p className="text-xs text-slate-500 uppercase">{acc.type}</p></div>
                               </div>
                               <div className="text-xl font-bold">{Money.format(acc.currentBalance)}</div>
                            </div>
                            {!isCredit && !isTracking && (
                               <div className="space-y-2">
                                  <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                                     <div className="bg-blue-500 h-full" style={{ width: `${(pending/totalUsed)*100}%`}}></div>
                                     <div className="bg-amber-400 h-full" style={{ width: `${(required/totalUsed)*100}%`}}></div>
                                     <div className="bg-emerald-400 h-full" style={{ width: `${(Math.max(0,free)/totalUsed)*100}%`}}></div>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold text-slate-500">
                                     <span className="text-amber-500 flex items-center gap-1">Reserved: {Money.format(required)} {pending > 0 && <span className="text-blue-500"> (+{Money.format(pending)} pending)</span>}</span>
                                     <span className="text-emerald-500">Free: {Money.format(free)}</span>
                                  </div>
                               </div>
                            )}
                         </div>
                      );
                   })}
                </div>
             </div>
          )}

          {activeTab === 'budget' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                   <div className="flex gap-2">
                      <button onClick={() => setBudgetView('upcoming')} className={`px-4 py-2 rounded-lg font-bold text-sm ${budgetView==='upcoming' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Upcoming</button>
                      <button onClick={() => setBudgetView('history')} className={`px-4 py-2 rounded-lg font-bold text-sm ${budgetView==='history' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>History</button>
                   </div>
                   {subBleed > 0 && <div className="text-xs font-bold text-orange-600 flex items-center gap-1"><RefreshCw size={12}/> {Money.format(subBleed)}/mo</div>}
                </div>

                {budgetView === 'upcoming' && (
                   <div className="space-y-8">
                      {/* FORECAST LIST */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                         <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center gap-2"><CalendarDays size={16}/><h3 className="font-bold">Projected (90 Days)</h3></div>
                         <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                            {forecastFeed.map((item, idx) => {
                               // Date object is already local safe from forecastFeed
                               const dayName = item.dateObj.toLocaleDateString('en-US',{weekday:'short'});
                               const dayNum = item.dateObj.getDate();
                               return (
                                  <div key={`${item.id}-${idx}`} className="flex justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                                     <div className="flex items-center gap-4">
                                        <div className="text-center w-10">
                                           <div className="text-[10px] font-bold text-slate-400 uppercase">{dayName}</div>
                                           <div className="font-bold">{dayNum}</div>
                                        </div>
                                        <div><div className="font-bold">{item.name}</div><div className="text-xs text-slate-500">{item.status}</div></div>
                                     </div>
                                     <div className="font-bold">{Money.format(item.amount)}</div>
                                  </div>
                               );
                            })}
                            {forecastFeed.length === 0 && <div className="p-8 text-center text-slate-400">No upcoming bills found.</div>}
                         </div>
                      </div>
                      
                      <BillCalendar expenses={expenses} incomes={derivedIncomes} transactions={transactions} />
                      
                      {/* SORT CONTROLS MOVED BELOW CALENDAR */}
                      <div className="flex justify-center gap-2 pb-4">
                        <button onClick={() => setSortType('date')} className={`px-4 py-1 rounded-full text-xs font-bold border ${sortType === 'date' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Sort Date</button>
                        <button onClick={() => setSortType('amount')} className={`px-4 py-1 rounded-full text-xs font-bold border ${sortType === 'amount' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Sort Amount</button>
                        <button onClick={() => setSortType('frequency')} className={`px-4 py-1 rounded-full text-xs font-bold border ${sortType === 'frequency' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Sort Freq</button>
                      </div>

                      {/* Category Cards with Progress for ALL types */}
                      {['bill', 'variable', 'savings', 'debt'].map(type => (
                         <div key={type} className="space-y-4">
                            <h3 className="text-lg font-bold capitalize">{type}s</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {sortedExpenses.filter(e => e.type === type).map(item => {
                                  // Progress Logic for All Types
                                  let progress = 0;
                                  // For Debt: Current Balance vs Amount? Or 0? Debt buckets are usually 0->Amount logic reversed.
                                  // For Bill: Current Balance vs Amount.
                                  if (item.amount > 0) progress = ((item.currentBalance||0) / item.amount) * 100;
                                  
                                  return (
                                    <ItemCard key={item.id} title={item.name} amount={Money.format(item.amount)} subtitle={item.frequency} 
                                       icon={type==='debt'?TrendingDown:CardIcon} colorClass="bg-slate-100 text-slate-600"
                                       isExpanded={expandedId === item.id} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                       isPaid={item.isPaid}
                                       progress={progress} // Passed to all types
                                       currentBalance={item.currentBalance} // Passed for display
                                    >
                                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 grid grid-cols-2 gap-2 border-t border-slate-200 dark:border-slate-700">
                                          <button onClick={(e) => { e.stopPropagation(); updateExpense(item.id, 'isPaid', !item.isPaid); }} className={`col-span-2 py-2 rounded-lg font-bold text-sm ${item.isPaid ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500 text-white'}`}>{item.isPaid ? 'Mark Unpaid' : 'Mark Paid'}</button>
                                          <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setModalType('new'); }} className="py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold">Edit</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, 'expense'); }} className="py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold">Delete</button>
                                       </div>
                                    </ItemCard>
                                  );
                               })}
                            </div>
                         </div>
                      ))}
                   </div>
                )}

                {budgetView === 'history' && (
                   <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold flex items-center gap-2"><History size={16}/> Payment History</div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                         {transactions.filter(t => t.type === 'bill_paid' || t.type === 'bill_cleared').map(t => (
                            <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800">
                               <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${t.type==='bill_cleared' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}><Check size={14}/></div>
                                  <div>
                                      <div className="font-bold">{t.itemName}</div>
                                      <div className="text-xs text-slate-500">{new Date(t.createdAt?.seconds*1000).toLocaleDateString()} • {t.type.replace('bill_','').toUpperCase()}</div>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                   <div className="font-bold">{Money.format(Math.abs(t.amount))}</div>
                                   {/* UNDO BUTTON */}
                                   <button onClick={() => handleUndoTransaction(t)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full" title="Undo/Revert"><Undo2 size={16}/></button>
                               </div>
                            </div>
                         ))}
                         {transactions.length === 0 && <div className="p-8 text-center text-slate-400">No history yet.</div>}
                      </div>
                   </div>
                )}
             </div>
          )}
          {/* ... Other Tabs ... */}
          {activeTab === 'accounts' && <div className="p-4">Account Management Placeholder</div>}
          {activeTab === 'settings' && <PartnerManager onAdd={handleAddItem} onDelete={handleDelete} partners={partners} accounts={accounts} />}
        </div>
      </main>

      {/* MODALS */}
      <SpeedDial onAdd={(type) => { setModalType(type); setModalContext(type); }} />
      <UnifiedEntryModal isOpen={!!modalType} onClose={() => { setModalType(null); setEditingItem(null); }} onSave={handleAddItem} accounts={accounts} initialData={editingItem} incomes={incomes} type={modalType} context={modalContext} partners={partners} />
      <PaydayWizard isOpen={showPayday} onClose={handlePaydayComplete} income={incomes.find(i=>i.isPrimary)||incomes[0]} expenses={expenses} updateExpense={updateExpense} accounts={accounts} updateAccount={updateAccount} incomes={derivedIncomes} />
      <DailyAuditModal isOpen={showAudit} onClose={handleAuditComplete} accounts={accounts} updateAccount={updateAccount} expenses={expenses} onClear={handleClearTransaction} onMarkPaid={updateExpense} updateExpense={updateExpense} onPayDebt={(item) => setPayingDebtItem(item)} />
      <ReservedBreakdownModal isOpen={!!breakdownModal} onClose={() => setBreakdownModal(null)} items={breakdownModal ? (transferStrategy[breakdownModal.accountId]?.reservedItems || []) : []} accountName={breakdownModal?.name} onMarkPaid={updateExpense} onClear={handleClearTransaction} updateExpense={updateExpense} />
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <ConfirmationModal isOpen={confirmState.isOpen} onClose={() => setConfirmState({...confirmState, isOpen: false})} onConfirm={confirmState.onConfirm} title={confirmState.title} message={confirmState.message} actionLabel={confirmState.actionLabel} />
    </div>
  );
}