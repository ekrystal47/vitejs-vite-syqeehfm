import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Wallet, Building2, Settings, LogOut, Sun, Moon, Menu, RefreshCw, 
  CheckCircle2, Sparkles, ShieldCheck, TrendingDown, Medal, CreditCard as CardIcon, 
  Info, TrendingUp, PiggyBank, RotateCcw, Flame, CreditCard, Trash2, Activity, History, Zap, ArrowLeftRight, Check, FlaskConical, XCircle, PieChart, CalendarDays, Edit2, ExternalLink, Plus, ChevronUp, ChevronDown, Clock, Download
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, 
  runTransaction, orderBy, limit, getDoc, setDoc, deleteDoc 
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
  ReservedBreakdownModal, PartnerIncomeBreakdownModal, ToastContainer, ConfirmationModal, AdjustmentModal
} from './components/modules/HelperModals';
import TransactionHistoryModal from './components/modules/TransactionHistoryModal'; 
import QuickLogModal from './components/modules/QuickLogModal'; 
import DebtSimulatorModal from './components/modules/DebtSimulatorModal';
import FundMoverModal from './components/modules/FundMoverModal'; 
import BackupManager from './components/modules/BackupManager'; 
import PayDebtModal from './components/modules/PayDebtModal'; 

// --- NEW: Discretionary Log Modal Component ---
const DiscretionaryLogModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = formData.get('amount');
    const name = formData.get('name');
    if (amount && name) {
      onConfirm(Money.toCents(amount), name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Zap className="text-purple-500 fill-purple-500" size={20}/> Log Discretionary Spend</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><XCircle size={20} className="text-slate-400"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">What did you buy?</label>
            <input name="name" autoFocus placeholder="e.g. Dinner, Concert, Coffee" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
              <input type="number" step="0.01" name="amount" placeholder="0.00" className="w-full p-3 pl-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-lg focus:ring-2 focus:ring-purple-500 outline-none" required onWheel={(e) => e.target.blur()} />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
            <CheckCircle2 size={20} /> Confirm Spend
          </button>
        </form>
      </div>
    </div>
  );
};

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
  // Added totalAudits and debtsCleared to default state
  const [gameStats, setGameStats] = useState({ level: 1, xp: 0, streak: 0, lastAuditDate: '', nextLevelXP: 100, badges: [], totalAudits: 0, debtsCleared: 0 });

  // --- NEW: FIRE SETTINGS PERSISTENCE ---
  const [fireSettings, setFireSettings] = useState(null);

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
  const [adjustItem, setAdjustItem] = useState(null); 
  
  // Feature Modals
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showDebtSim, setShowDebtSim] = useState(false);
  const [showFundMover, setShowFundMover] = useState(false);
  const [payingDebtItem, setPayingDebtItem] = useState(null); 
  const [historyView, setHistoryView] = useState({ isOpen: false, filterId: null, itemName: null });
  const [showDiscLog, setShowDiscLog] = useState(false); 

  // --- ACTIVE DATA ---
  const accounts = isSimMode ? simData.accounts : liveAccounts;
  const incomes = isSimMode ? simData.incomes : liveIncomes;
  const expenses = isSimMode ? simData.expenses : liveExpenses;
  const partners = isSimMode ? simData.partners : livePartners;

  // --- ACTIONS ---
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random(); 
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const confirmAction = (title, message, actionLabel, action) => {
    setConfirmState({ isOpen: true, title, message, actionLabel, onConfirm: action });
  };

  // --- GAME ENGINE ---
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

  // --- NEW: EXPORT TO CSV FUNCTIONALITY ---
  const handleExportCSV = () => {
    const headers = ['Category', 'Name', 'Amount', 'Frequency', 'Next Date', 'Status'];
    const rows = [];

    // 1. Incomes
    incomes.forEach(i => {
      rows.push([
        'Income',
        `"${i.name}"`, // Quote to handle commas in names
        (i.amount / 100).toFixed(2),
        i.frequency,
        i.nextDate || '',
        i.isPrimary ? 'Primary' : ''
      ].join(','));
    });

    // 2. Expenses
    expenses.forEach(e => {
       const typeLabel = e.type ? e.type.charAt(0).toUpperCase() + e.type.slice(1) : 'Expense';
       rows.push([
        typeLabel,
        `"${e.name}"`,
        (e.amount / 100).toFixed(2),
        e.frequency,
        e.date || e.dueDate || e.nextDate || '',
        e.isPaid ? 'Paid' : 'Unpaid'
      ].join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n" 
      + rows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_plan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Exported to CSV", "success");
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
        if (doc.exists()) {
            const stats = doc.data();
            setGameStats(stats);
            checkStreak(stats);
        } else {
            const initStats = { level: 1, xp: 0, streak: 0, lastAuditDate: '', nextLevelXP: 100, badges: [], totalAudits: 0, debtsCleared: 0 };
            setDoc(doc.ref, initStats);
            setGameStats(initStats);
        }
    });

    const unsubFire = onSnapshot(doc(db, 'users', user.uid, 'settings', 'fire_config'), (doc) => {
        if (doc.exists()) {
            setFireSettings(doc.data());
        } else {
            setFireSettings({});
        }
    });

    const unsubTransactions = onSnapshot(query(getPath('transactions'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAccounts(); unsubIncomes(); unsubExpenses(); unsubPartners(); unsubSnapshots(); unsubTransactions(); unsubGame(); unsubFire(); };
  }, [user]);

  const updateFireSettings = async (newSettings) => {
      if (isSimMode) {
          setFireSettings(prev => ({ ...prev, ...newSettings }));
          addToast("Settings Saved (Sim)");
          return;
      }
      if (!user) return;
      try {
          await setDoc(doc(db, 'users', user.uid, 'settings', 'fire_config'), newSettings, { merge: true });
          addToast("Settings Saved");
      } catch (e) {
          console.error("Failed to save FIRE settings", e);
          addToast("Save Failed", "error");
      }
  };

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

        const occs = getOccurrencesInWindow(cycleEnd, e.frequency, partnerPayDate, 365);
        let targetDueDate = occs.find(d => d >= partnerPayDate); 
        if (!targetDueDate) targetDueDate = cycleEnd; 

        const targetStartDate = getPreviousDateStr(targetDueDate, e.frequency);
        const paydaysInCycle = countPaydaysInWindow(targetStartDate, targetDueDate, partnerPayDate, partnerFreq);
        const amountForThisCheck = Math.round(partnerShare / (paydaysInCycle || 1));

        totalNextCheck += amountForThisCheck;

        contributingItems.push({ 
            name: e.name, 
            amount: partnerShare, 
            calculatedAmount: amountForThisCheck, 
            frequency: e.frequency, 
            isOwedOnly: e.splitConfig.isOwedOnly,
            paydaysInCycle: paydaysInCycle,
            dueDate: targetDueDate,
            currentBalance: e.currentBalance 
        });
      });

      if (totalNextCheck === 0) return null;

      return {
        id: `virtual-${p.id}`, 
        name: `${p.name} (Split Reimbursement)`, 
        amount: totalNextCheck, 
        frequency: partnerFreq, 
        nextDate: partnerPayDate,
        accountId: p.depositAccountId || accounts.find(a => a.type==='checking')?.id,
        isDerived: true, 
        isPrimary: false, 
        breakdownItems: contributingItems, 
        totalAnnual: 0 
      };
    }).filter(Boolean);

    return [...realIncomes, ...partnerIncomes];
  }, [incomes, partners, expenses, accounts]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handlePaydayComplete = async (completed, incomeId, pendingTransfers = []) => {
      setShowPayday(false);
      if (!completed) return; 

      // 1. Advance Income Date
      let targetIncome = null;
      if (incomeId && incomeId.startsWith('virtual-')) {
          targetIncome = derivedIncomes.find(i => i.id === incomeId);
      } else {
          targetIncome = incomeId ? incomes.find(i => i.id === incomeId) : (incomes.find(i => i.isPrimary) || incomes[0]);
      }

      if (targetIncome) {
          const today = getTodayStr();
          let nextDate = getNextDateStr(targetIncome.nextDate || today, targetIncome.frequency);
          
          if (nextDate < today) {
              nextDate = getNextDateStr(today, targetIncome.frequency);
          }
          
          const isPartnerIncome = targetIncome.isDerived && targetIncome.id.startsWith('virtual-');

          if (isSimMode) {
              // ... sim logic ...
          } else {
              try {
                  if (isPartnerIncome) {
                      const partnerId = targetIncome.id.replace('virtual-', '');
                      await updateDoc(doc(db, 'users', user.uid, 'partners', partnerId), { nextPayDate: nextDate }); 
                  } else {
                      await updateDoc(doc(db, 'users', user.uid, 'incomes', targetIncome.id), { nextDate });
                  }
              } catch (e) {
                  addToast("Failed to advance date: " + e.message, "error");
              }
          }
      }

      // 2. Create Pending Transfers
      if (pendingTransfers.length > 0 && !isSimMode) {
          try {
              const batchPromises = pendingTransfers.map(t => 
                  addDoc(collection(db, 'users', user.uid, 'transactions'), {
                      type: 'transfer_pending',
                      amount: t.amount,
                      sourceId: t.sourceId,
                      targetId: t.targetId,
                      targetName: t.targetName, 
                      date: t.date,
                      createdAt: serverTimestamp(),
                      description: `Pending Transfer to ${t.targetName}`,
                      // SAVE THE BREAKDOWN so we can allocate later
                      breakdown: t.breakdown || []
                  })
              );
              await Promise.all(batchPromises);
              addToast(`${pendingTransfers.length} Pending Transfers Created`);
          } catch (e) {
              console.error("Failed to create pending transfers", e);
              addToast("Failed to log pending transfers", "error");
          }
      }

      if (!isSimMode) {
          awardXP(100); 
          triggerConfetti(); 
          addToast("Payday Complete!");
      }
  };

  const handleAddItem = async (type, data) => {
    if (isSimMode) {
        const newItem = { ...data, id: `sim-${Date.now()}`, createdAt: new Date() };
        if ((type === 'expense' || type === 'bill' || type === 'variable') && data.splitConfig && data.splitConfig.isSplit) {
             const total = data.amount;
             const partnerAmt = data.splitConfig.partnerAmount || 0;
             if (data.splitConfig.payer === 'partner') newItem.amount = total - partnerAmt;
        }
        setSimData(prev => {
            const key = type === 'income' ? 'incomes' : type === 'partner' ? 'partners' : type === 'account' || type === 'checking' || type === 'credit' ? 'accounts' : 'expenses';
            return { ...prev, [key]: [...prev[key], newItem] };
        });
        addToast(editingItem ? "Updated (Sim)" : "Added (Sim)");
        setModalType(null); setModalContext(null); setEditingItem(null);
        return;
    }

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
    const userColRef = (col) => collection(db, 'users', user.uid, col);
    const userDocRef = (col, id) => doc(db, 'users', user.uid, col, id);
    try {
      if (editingItem) {
        await updateDoc(userDocRef(collectionName, editingItem.id), payload);
        addToast(`Updated ${payload.name}`);
        setEditingItem(null);
      } else {
        await addDoc(userColRef(collectionName), { ...payload, createdAt: serverTimestamp() });
        addToast(`Added ${payload.name}`);
        awardXP(5); 
      }
    } catch (e) {
      if (e.code === 'permission-denied') setPermissionError(true);
      else addToast(`Error: ${e.message}`, 'error');
    }
    setModalType(null); setModalContext(null);
  };

  const handleDelete = async (id, type) => {
    if (isSimMode) {
        setSimData(prev => {
            const key = type === 'income' ? 'incomes' : type === 'partner' ? 'partners' : ['account','checking','savings','credit'].includes(type) ? 'accounts' : 'expenses';
            return { ...prev, [key]: prev[key].filter(i => i.id !== id) };
        });
        addToast("Item Deleted (Sim)");
        return;
    }

    confirmAction("Delete Item", "This will move the item to trash.", "Delete", async () => {
      if (!user) return;
      let collectionName = 'expenses';
      if (type === 'income') collectionName = 'incomes';
      if (['account','checking','savings','credit','investment','loan'].includes(type)) collectionName = 'accounts';
      if (type === 'partner') collectionName = 'partners';
      try {
        await updateDoc(doc(db, 'users', user.uid, collectionName, id), { deletedAt: serverTimestamp() });
        addToast("Item deleted");
      } catch(e) { addToast("Failed to delete", 'error'); }
    });
  };

  // --- NEW: REORDER ACCOUNT LOGIC ---
  const handleReorderAccount = async (id, direction) => {
      if (isSimMode) return;
      const sorted = [...sortedAccounts];
      const index = sorted.findIndex(a => a.id === id);
      if (index === -1) return;
      
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return;

      const newOrderList = [...sorted];
      // Swap elements
      [newOrderList[index], newOrderList[targetIndex]] = [newOrderList[targetIndex], newOrderList[index]];

      try {
          // Normalize orders and save all
          const batchPromises = newOrderList.map((acc, idx) => 
              updateDoc(doc(db, 'users', user.uid, 'accounts', acc.id), { order: idx })
          );
          await Promise.all(batchPromises);
      } catch (e) {
          addToast("Failed to reorder: " + e.message, "error");
      }
  };

  const handleAtomicPayment = async (creditAccountId, sourceAccountId, amountCents) => {
    if (isSimMode) {
        setSimData(prev => {
            const newAccounts = prev.accounts.map(a => {
                if (a.id === creditAccountId) return { ...a, currentBalance: (a.currentBalance || 0) + amountCents };
                if (a.id === sourceAccountId) return { ...a, currentBalance: (a.currentBalance || 0) - amountCents };
                return a;
            });
            return { ...prev, accounts: newAccounts };
        });
        addToast("Payment Processed (Sim)");
        return;
    }

    if (!user) return;
    try {
      await runTransaction(db, async (transaction) => {
        const creditRef = doc(db, 'users', user.uid, 'accounts', creditAccountId);
        const sourceRef = doc(db, 'users', user.uid, 'accounts', sourceAccountId);
        const transRef = doc(collection(db, 'users', user.uid, 'transactions')); 

        const creditDoc = await transaction.get(creditRef);
        const sourceDoc = await transaction.get(sourceRef);
        
        if (!creditDoc.exists() || !sourceDoc.exists()) throw new Error("Account does not exist!");
        
        transaction.update(creditRef, { currentBalance: (creditDoc.data().currentBalance || 0) + amountCents });
        transaction.update(sourceRef, { currentBalance: (sourceDoc.data().currentBalance || 0) - amountCents });

        transaction.set(transRef, {
            createdAt: serverTimestamp(),
            amount: -amountCents,
            type: 'payment',
            itemId: creditAccountId,
            itemName: `Paid ${creditDoc.data().name}`,
            description: `Payment from ${sourceDoc.data().name}`
        });
      });
      addToast("Payment Processed Successfully");
      awardXP(20); 
    } catch (e) { addToast("Payment Failed! No funds moved.", 'error'); }
  };

  const handleFundTransfer = async (sourceId, targetId, amount) => {
    if (isSimMode) {
        setSimData(prev => {
            const newExpenses = prev.expenses.map(e => {
                if (e.id === sourceId) return { ...e, currentBalance: (e.currentBalance || 0) - amount };
                if (e.id === targetId) return { ...e, currentBalance: (e.currentBalance || 0) + amount };
                return e;
            });
            return { ...prev, expenses: newExpenses };
        });
        addToast("Funds Moved (Sim)");
        return;
    }

    if (!user) return;
    try {
      await runTransaction(db, async (transaction) => {
        const sourceRef = doc(db, 'users', user.uid, 'expenses', sourceId);
        const targetRef = doc(db, 'users', user.uid, 'expenses', targetId);
        const sourceLogRef = doc(collection(db, 'users', user.uid, 'transactions')); 
        const targetLogRef = doc(collection(db, 'users', user.uid, 'transactions')); 

        const sourceDoc = await transaction.get(sourceRef);
        const targetDoc = await transaction.get(targetRef);

        if (!sourceDoc.exists() || !targetDoc.exists()) throw new Error("Bucket not found!");

        const newSourceBal = (sourceDoc.data().currentBalance || 0) - amount;
        const newTargetBal = (targetDoc.data().currentBalance || 0) + amount;

        transaction.update(sourceRef, { currentBalance: newSourceBal });
        transaction.update(targetRef, { currentBalance: newTargetBal });

        transaction.set(sourceLogRef, { createdAt: serverTimestamp(), amount: -amount, type: 'transfer_out', itemId: sourceId, itemName: sourceDoc.data().name, description: `Transfer to ${targetDoc.data().name}` });
        transaction.set(targetLogRef, { createdAt: serverTimestamp(), amount: amount, type: 'transfer_in', itemId: targetId, itemName: targetDoc.data().name, description: `Transfer from ${sourceDoc.data().name}` });
      });
      addToast("Funds Moved Successfully");
    } catch (e) { addToast("Transfer Failed: " + e.message, 'error'); }
  };

  const handleAuditComplete = async () => {
    if (isSimMode) {
        addToast("Audit Logged (Sim - Not Saved)");
        setShowAudit(false);
        return;
    }

    setShowAudit(false);
    if (!user) return;
    let totalLiquid = 0;
    let netWorth = 0;
    accounts.forEach(acc => {
        const bal = acc.currentBalance || 0;
        if (['checking', 'savings', 'cash'].includes(acc.type)) totalLiquid += bal;
        if (acc.type === 'credit' || acc.type === 'loan') netWorth -= Math.abs(bal);
        else netWorth += bal;
    });
    try {
        await addDoc(collection(db, 'users', user.uid, 'history_snapshots'), { date: new Date().toISOString(), totalLiquid, netWorth });
        
        // GAME: Streak & Audit Count Logic
        const today = getTodayStr();
        const lastAudit = gameStats.lastAuditDate;
        let newStreak = gameStats.streak;
        let newTotalAudits = (gameStats.totalAudits || 0) + 1; // Increment total audits

        if (lastAudit !== today) {
            newStreak += 1;
            const newStats = { 
                ...gameStats, 
                streak: newStreak, 
                lastAuditDate: today, 
                xp: gameStats.xp + 50,
                totalAudits: newTotalAudits
            };
            if (newStats.xp >= newStats.nextLevelXP) {
                newStats.level += 1;
                newStats.nextLevelXP = Math.floor(newStats.nextLevelXP * 1.5);
                addToast(`LEVEL UP! Level ${newStats.level}`, 'success');
                triggerConfetti();
            }
            setGameStats(newStats);
            await updateDoc(doc(db, 'users', user.uid, 'settings', 'gameStats'), newStats);
            addToast(`Audit Complete! ${newStreak} Day Streak! 🔥`);
        } else {
             // Still increment total audits even if streak doesn't update (e.g. multiple audits same day, though usually once/day)
             // Actually, limiting audit count to once per day for "stats" is safer to prevent spamming
             // But user asked for "Audit Master" which implies consistency.
             // Let's only update if lastAudit !== today to prevent spamming stats.
             addToast("Audit Updated");
        }
        
    } catch (e) { console.error("Snapshot failed", e); }
  };

  const handleClearTransaction = async (item) => {
    if (isSimMode) return;
    if (!user) return;

    try {
      await runTransaction(db, async (transaction) => {
        // CASE: PENDING TRANSFER
        if (item.type === 'transfer_pending' || item.originalType === 'transfer') {
             const sourceRef = doc(db, 'users', user.uid, 'accounts', item.sourceId);
             const targetRef = doc(db, 'users', user.uid, 'accounts', item.targetId);
             const transRef = doc(db, 'users', user.uid, 'transactions', item.id);

             const sourceDoc = await transaction.get(sourceRef);
             const targetDoc = await transaction.get(targetRef);

             if (!sourceDoc.exists() || !targetDoc.exists()) throw new Error("Account not found");

             const amount = item.amount;
             
             // Move money
             transaction.update(sourceRef, { currentBalance: (sourceDoc.data().currentBalance || 0) - amount });
             transaction.update(targetRef, { currentBalance: (targetDoc.data().currentBalance || 0) + amount });
             
             // Update transaction status
             transaction.update(transRef, { type: 'transfer_cleared' });

             // --- NEW: Process Deferred Allocations ---
             if (item.breakdown && Array.isArray(item.breakdown)) {
                 for (const alloc of item.breakdown) {
                     if (alloc.id) {
                         const bucketRef = doc(db, 'users', user.uid, 'expenses', alloc.id);
                         const bucketDoc = await transaction.get(bucketRef);
                         if (bucketDoc.exists()) {
                             const newBal = (bucketDoc.data().currentBalance || 0) + alloc.amount;
                             transaction.update(bucketRef, { currentBalance: newBal });
                         }
                     }
                 }
             }
             return;
        }

        // CASE: STANDARD EXPENSE CLEARING
        const expenseRef = doc(db, 'users', user.uid, 'expenses', item.id);
        const expDoc = await transaction.get(expenseRef);
        if (!expDoc.exists()) throw new Error("Data missing");
        const expData = expDoc.data();
        
        // --- FIX: LOOKUP PARENT ACCOUNT IF CHILD DOESN'T HAVE ONE ---
        let realAccountId = expData.accountId;
        let parentDoc = null;
        let parentRef = null;

        if (!realAccountId && expData.parentExpenseId) {
            parentRef = doc(db, 'users', user.uid, 'expenses', expData.parentExpenseId);
            parentDoc = await transaction.get(parentRef);
            if (parentDoc.exists()) {
                realAccountId = parentDoc.data().accountId;
            }
        }

        if (!realAccountId) throw new Error("This expense is not assigned to a valid account.");

        const accountRef = doc(db, 'users', user.uid, 'accounts', realAccountId);
        const accDoc = await transaction.get(accountRef);
        if (!accDoc.exists()) throw new Error("Assigned account does not exist.");
        const accData = accDoc.data();
        
        const isCredit = (accData.type || '').toLowerCase() === 'credit';
        const linkedBackingId = accData.linkedAccountId || accounts.find(a => a.type === 'checking')?.id;
        
        let debtBucket = null;
        let debtRef = null;
        let debtDoc = null;

        if (isCredit) {
            debtBucket = expenses.find(e => e.type === 'debt' && e.totalDebtBalance === realAccountId && !e.deletedAt);
            if (debtBucket) {
                debtRef = doc(db, 'users', user.uid, 'expenses', debtBucket.id);
                debtDoc = await transaction.get(debtRef); 
            }
        }

        // --- ENHANCEMENT: Handle Debt Payment Clearance Logic ---
        let amountToClear = item.amount || expData.amount;
        if (expData.type === 'debt') {
             // For debt, prioritize clearing the pending amount
             amountToClear = expData.pendingPayment || amountToClear;
        }

        // 1. Subtract from Account
        const newBal = (accData.currentBalance || 0) - amountToClear;
        transaction.update(accountRef, { currentBalance: newBal });

        // Handle Credit Card Payment "Debt Bucket" Logic (If paying OFF a card)
        if (isCredit) {
            if (debtBucket && debtDoc && debtDoc.exists()) {
                const currentDebtReserved = debtDoc.data().currentBalance || 0;
                transaction.update(debtRef, { 
                    currentBalance: currentDebtReserved + amountToClear 
                });
            } else {
                // If no debt bucket exists, creating one (Auto-generated)
                const newDebtRef = doc(collection(db, 'users', user.uid, 'expenses'));
                transaction.set(newDebtRef, {
                    name: `Pay ${accData.name}`,
                    amount: 0,
                    currentBalance: amountToClear,
                    totalDebtBalance: realAccountId, 
                    accountId: linkedBackingId, 
                    type: 'debt',
                    frequency: 'Monthly',
                    createdAt: serverTimestamp(),
                    uid: user.uid
                });
            }
        }

        // Log Transaction
        const transRef = doc(collection(db, 'users', user.uid, 'transactions'));
        transaction.set(transRef, {
            createdAt: serverTimestamp(),
            amount: -amountToClear,
            type: 'expense_cleared',
            itemId: item.id,
            itemName: expData.name,
            description: isCredit ? 'Cleared on Credit Card (Funds Moved)' : 'Cleared from Account'
        });

        // --- UPDATE BUCKET BALANCE LOGIC ---
        const updates = { isPaid: false, isCleared: false };
        
        if (expData.type === 'debt') {
             // For debt, reset pendingPayment but preserve currentBalance
             updates.pendingPayment = 0;
             // GAME: If this Debt Bucket reaches 0 currentBalance, count as "Debt Cleared"
             // (Assuming user pays full amount. This is a heuristic)
             if ((expData.currentBalance || 0) <= 0) {
                 const newClearedCount = (gameStats.debtsCleared || 0) + 1;
                 const gameStatsRef = doc(db, 'users', user.uid, 'settings', 'gameStats');
                 transaction.update(gameStatsRef, { debtsCleared: newClearedCount });
             }
        } else {
             // FIX: For bills, subtract the cleared amount from the bucket balance.
             // If it's a child expense (tied to a parent bucket), we must deduct from the PARENT bucket.
             if (parentDoc && parentDoc.exists()) {
                 const parentBal = parentDoc.data().currentBalance || 0;
                 transaction.update(parentRef, { currentBalance: Math.max(0, parentBal - amountToClear) });
             } else {
                 const currentBucketBal = expData.currentBalance || 0;
                 updates.currentBalance = Math.max(0, currentBucketBal - amountToClear);
             }
        }

        if (expData.frequency && expData.frequency !== 'One-Time') {
            const nextDate = getNextDateStr(expData.date || expData.dueDate, expData.frequency);
            if (expData.date) updates.date = nextDate;
            else updates.dueDate = nextDate;
        } 
        transaction.update(expenseRef, updates);
      });

      addToast("Transaction Cleared & Processed");
      awardXP(30);

    } catch (e) {
      addToast("Failed to clear: " + e.message, 'error');
    }
  };

  const handleUndoTransaction = async (transId, transactionData) => {
      if (isSimMode) return;
      if (!user) return;

      const type = transactionData.type;
      const expenseId = transactionData.itemId;
      const amount = Math.abs(transactionData.amount);

      try {
          if (type === 'bill_paid') {
              await updateDoc(doc(db, 'users', user.uid, 'expenses', expenseId), {
                  isPaid: false,
                  isCleared: false
              });
              await updateDoc(doc(db, 'users', user.uid, 'transactions', transId), { type: 'voided', voidedAt: serverTimestamp() });
              addToast("Transaction Unmarked.");
          } 
          else if (type === 'expense_cleared') {
              await runTransaction(db, async (transaction) => {
                  const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseId);
                  const expDoc = await transaction.get(expenseRef);
                  if (!expDoc.exists()) throw "Expense not found";
                  const expData = expDoc.data();
                  
                  let accountId = expData.accountId;
                  
                  // Handle Parent Account ID lookup for Undo
                  let parentDoc = null;
                  let parentRef = null;
                  if (!accountId && expData.parentExpenseId) {
                      parentRef = doc(db, 'users', user.uid, 'expenses', expData.parentExpenseId);
                      parentDoc = await transaction.get(parentRef);
                      if (parentDoc.exists()) accountId = parentDoc.data().accountId;
                  }

                  const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
                  const accDoc = await transaction.get(accountRef);
                  const accData = accDoc.data();
                  
                  const isCredit = (accData.type || '').toLowerCase() === 'credit';
                  let debtBucket = null;
                  let debtRef = null;
                  let debtDoc = null;

                  if (isCredit) {
                      debtBucket = expenses.find(e => e.type === 'debt' && e.totalDebtBalance === accountId);
                      if (debtBucket) {
                          debtRef = doc(db, 'users', user.uid, 'expenses', debtBucket.id);
                          debtDoc = await transaction.get(debtRef);
                      }
                  }

                  transaction.update(accountRef, {
                      currentBalance: (accData.currentBalance || 0) + amount
                  });

                  if (isCredit && debtBucket && debtDoc && debtDoc.exists()) {
                      const current = debtDoc.data().currentBalance || 0;
                      transaction.update(debtRef, { currentBalance: Math.max(0, current - amount) });
                  }

                  // Restore Balance to either Parent or Self
                  if (parentDoc && parentDoc.exists()) {
                      transaction.update(parentRef, { 
                          currentBalance: (parentDoc.data().currentBalance || 0) + amount 
                      });
                      // Only mark child as paid/uncleared
                      transaction.update(expenseRef, { isPaid: true, isCleared: false });
                  } else {
                      transaction.update(expenseRef, {
                          isPaid: true, 
                          isCleared: false,
                          currentBalance: (expData.currentBalance || 0) + amount 
                      });
                  }
                  
                  const transRef = doc(db, 'users', user.uid, 'transactions', transId);
                  transaction.update(transRef, { type: 'voided', voidedAt: serverTimestamp() });
              });
              addToast("Transaction Reverted to Pending.");
          }
      } catch (e) {
          addToast("Undo failed: " + e.message, 'error');
      }
  };

  const handleConfirmPayCard = async (bucketId, amountCents) => {
    if (isSimMode) return;

    if (!user) return;
    try {
        const bucket = expenses.find(e => e.id === bucketId);
        if (!bucket || !bucket.totalDebtBalance) return;
        
        await runTransaction(db, async (transaction) => {
            const bucketRef = doc(db, 'users', user.uid, 'expenses', bucketId);
            const creditRef = doc(db, 'users', user.uid, 'accounts', bucket.totalDebtBalance);

            const bucketDoc = await transaction.get(bucketRef);
            const creditDoc = await transaction.get(creditRef);

            if (!bucketDoc.exists() || !creditDoc.exists()) throw new Error("Data missing.");

            transaction.update(bucketRef, { 
                currentBalance: (bucketDoc.data().currentBalance || 0) - amountCents,
                pendingPayment: (bucketDoc.data().pendingPayment || 0) + amountCents,
                // --- FIX: Explicitly mark as Paid so it shows as pending in UI/Strategy ---
                isPaid: true 
            });

            transaction.update(creditRef, { currentBalance: (creditDoc.data().currentBalance || 0) + amountCents });

            const transRef = doc(collection(db, 'users', user.uid, 'transactions'));
            transaction.set(transRef, {
                createdAt: serverTimestamp(),
                amount: -amountCents,
                type: 'payment',
                itemId: bucketId,
                itemName: bucket.name,
                description: `Payment Sent (Pending Clearance)`
            });
        });
        addToast("Payment Sent! Funds marked Pending.");
        awardXP(50);
    } catch (e) { addToast("Payment Failed: " + e.message, 'error'); }
  };

  // --- NEW: Handle Ad-Hoc Discretionary Spending ---
  const handleLogDiscretionary = async (amount, name) => {
      if (isSimMode) {
          addToast("Spend Logged (Sim)");
          return;
      }
      if (!user) return;

      const discretionaryAcc = accounts.find(a => a.isDiscretionary);
      if (!discretionaryAcc) {
          addToast("No discretionary account set!", "error");
          return;
      }

      try {
          await runTransaction(db, async (transaction) => {
              const accRef = doc(db, 'users', user.uid, 'accounts', discretionaryAcc.id);
              const accDoc = await transaction.get(accRef);
              if (!accDoc.exists()) throw new Error("Account not found");

              const currentBal = accDoc.data().currentBalance || 0;
              transaction.update(accRef, { currentBalance: currentBal - amount });

              const transRef = doc(collection(db, 'users', user.uid, 'transactions'));
              transaction.set(transRef, {
                  createdAt: serverTimestamp(),
                  amount: -amount,
                  type: 'expense', // Generic expense
                  itemId: 'discretionary',
                  itemName: name,
                  description: 'Discretionary Spend'
              });
          });
          addToast("Spend Logged!");
          awardXP(10);
      } catch (e) {
          addToast("Failed to log spend: " + e.message, 'error');
      }
  };

  // --- UPDATED: updateExpense with Linked Bucket & BNPL Logic ---
  const updateExpense = async (id, field, value, customAmountStr = null) => {
    if (isSimMode) { setSimData(prev => prev); addToast("Updated (Sim)"); return; }
    if (!user) return;

    const expenseItem = expenses.find(e => e.id === id);
    if (!expenseItem) return;
    const accountId = expenseItem.accountId;
    const linkedDebtBucket = expenses.find(e => e.type === 'debt' && e.totalDebtBalance === accountId && !e.deletedAt);

    try {
      if (field === 'spent' || field === 'isPaid' || field === 'addedFunds' || field === 'isCleared') {
        
        const expRef = doc(db, 'users', user.uid, 'expenses', id);
        const transRef = doc(collection(db, 'users', user.uid, 'transactions'));
        const accRef = accountId ? doc(db, 'users', user.uid, 'accounts', accountId) : null;
        const debtRef = linkedDebtBucket ? doc(db, 'users', user.uid, 'expenses', linkedDebtBucket.id) : null;

        let logAmount = 0;
        let logType = '';

        await runTransaction(db, async (transaction) => {
          const expDoc = await transaction.get(expRef);
          if(!expDoc.exists()) throw "Expense not found";
          const exp = expDoc.data();

          let accDoc = null;
          if (accRef) accDoc = await transaction.get(accRef);

          let debtDoc = null;
          if (debtRef) debtDoc = await transaction.get(debtRef);

          let currentBucketBal = exp.currentBalance || 0;
          let newAccBal = accDoc && accDoc.exists() ? (accDoc.data().currentBalance || 0) : 0;
          let debtBucketBal = debtDoc && debtDoc.exists() ? (debtDoc.data().currentBalance || 0) : 0;
          const isCreditAccount = accDoc && accDoc.exists() && accDoc.data().type === 'credit';

          // --- NEW: LINKED PARENT BUCKET DEDUCTION ---
          // If this expense is funded by another bucket (parentExpenseId), deduct from THERE.
          if (field === 'spent' && exp.parentExpenseId) {
              const parentRef = doc(db, 'users', user.uid, 'expenses', exp.parentExpenseId);
              const parentDoc = await transaction.get(parentRef);
              if (parentDoc.exists()) {
                  const parentBal = parentDoc.data().currentBalance || 0;
                  transaction.update(parentRef, { currentBalance: parentBal - value });
                  // Note: We still update the account balance below because money physically left the account.
              }
          }

          if (field === 'addedFunds') {
            currentBucketBal += value;
            logAmount = value;
            logType = 'deposit';
            transaction.update(expRef, { currentBalance: currentBucketBal });
          }

          else if (field === 'spent') {
            currentBucketBal -= value;
            logAmount = -value;
            logType = 'expense';
            transaction.update(expRef, { currentBalance: currentBucketBal });

            if (accDoc && accDoc.exists()) {
                newAccBal -= value;
                transaction.update(accRef, { currentBalance: newAccBal });
            }

            if (isCreditAccount && debtDoc && debtDoc.exists()) {
                debtBucketBal += value;
                transaction.update(debtRef, { currentBalance: debtBucketBal });
            }
          }

          else if (field === 'isPaid') {
             if (value === true) {
                let amountToPay = exp.amount || 0;
                if (customAmountStr) amountToPay = Money.toCents(customAmountStr);
                
                // --- NEW: BNPL LOGIC ---
                if (exp.type === 'bnpl') {
                    const currentPaid = exp.installmentsPaid || 0;
                    const total = exp.totalInstallments || 1;
                    const nextDate = getNextDateStr(exp.date || exp.dueDate, exp.frequency);
                    
                    if (currentPaid + 1 < total) {
                        transaction.update(expRef, {
                            installmentsPaid: currentPaid + 1,
                            date: nextDate,
                            isPaid: false // Reset for next cycle
                        });
                    } else {
                        transaction.update(expRef, {
                            installmentsPaid: total,
                            isPaid: true,
                            name: `${exp.name} (Paid Off)`
                        });
                    }
                    // BNPL payments still log a transaction and reserve funds below
                } else if (exp.type === 'debt' || exp.type === 'loan') {
                    // NEW: Handle Debt/Loan Payment
                    // Move funds from 'Available' (currentBalance) to 'Pending' (pendingPayment)
                    const newBal = Math.max(0, (exp.currentBalance || 0) - amountToPay);
                    const newPending = (exp.pendingPayment || 0) + amountToPay;
                    
                    transaction.update(expRef, { 
                        isPaid: true, 
                        isCleared: false, 
                        currentBalance: newBal,
                        pendingPayment: newPending
                    });
                } else {
                    // Standard Logic
                    transaction.update(expRef, { isPaid: true, isCleared: false, currentBalance: amountToPay });
                }

                logAmount = -amountToPay;
                logType = 'bill_paid';
             } 
             else {
                 transaction.update(expRef, { isPaid: false, isCleared: false });
             }
          }

          if (logType) {
             transaction.set(transRef, {
                 createdAt: serverTimestamp(),
                 amount: logAmount,
                 type: logType,
                 itemId: id,
                 itemName: exp.name,
                 description: field === 'spent' && isCreditAccount ? 'Spent on Credit (Funds Reserved)' : 'Transaction Logged'
             });
          }
        });
        
        if (field === 'isPaid' && value === true && customAmountStr) {
            const enteredCents = Money.toCents(customAmountStr);
            if (expenseItem.amount !== enteredCents) {
                confirmAction("Update Recurring Amount?", `You paid ${Money.format(enteredCents)} but the bill was set to ${Money.format(expenseItem.amount)}. Update future recurring bills to this new amount?`, "Yes, Update It",
                    async () => { await updateDoc(doc(db, 'users', user.uid, 'expenses', id), { amount: enteredCents }); addToast("Recurring amount updated."); });
            }
        }

        if (field === 'spent') { addToast("Transaction Logged"); awardXP(5); }
        else if (field === 'isPaid') { addToast(value ? "Marked Paid" : "Marked Unpaid"); awardXP(value ? 10 : 0); }
        else addToast("Updated Successfully");

      } else {
        await updateDoc(doc(db, 'users', user.uid, 'expenses', id), { [field]: value });
      }
    } catch (e) { addToast("Update failed: " + e.message, 'error'); }
  };

  const updateAccount = async (id, field, value) => {
    if (isSimMode) {
        setSimData(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => a.id === id ? { ...a, [field]: value } : a)
        }));
        addToast("Account Updated (Sim)");
        return;
    }
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'accounts', id), { [field]: value });
  };

  // --- CALCULATIONS ---
  const totalDebt = useMemo(() => {
    let debt = 0;
    accounts.forEach(a => {
      if(a.type === 'credit') debt += Math.abs(Math.min(0, a.currentBalance || 0));
      if(a.type === 'loan') debt += (a.currentBalance || 0);
    });
    return debt;
  }, [accounts]);

  const transferStrategy = useMemo(() => {
    const s = {};
    // Added 'discretionaryAllocated' to track auto-reserved excess
    accounts.forEach(a => s[a.id] = { requiredBalance: 0, pendingBalance: 0, totalFlow: 0, items: [], heldForCredit: 0, reservedItems: [], discretionaryAllocated: 0 });
    const primaryIncome = incomes.find(i => i.isPrimary) || incomes[0];

    // 1. Process Expenses
    expenses.forEach(e => {
      // EXCLUDE Linked Expenses from allocation requirements (Parent bucket holds the money)
      if (e.splitConfig?.isOwedOnly || e.parentExpenseId) return;
      if (e.isCleared) return;
      
      const targetAcc = accounts.find(a => a.id === e.accountId);
      if(!targetAcc) return;
      
      const dynamicAlloc = calculateDynamicAllocation(e, primaryIncome);
      if(s[e.accountId]) s[e.accountId].totalFlow += dynamicAlloc;
      
      let pendingVal = 0;
      let allocatedVal = 0;
      const totalInBucket = e.currentBalance || 0;

      // FIX: Check for Debt Type FIRST to capture pendingPayment correctly
      if (e.type === 'debt') {
         if ((e.pendingPayment || 0) > 0) pendingVal = e.pendingPayment;
         allocatedVal = totalInBucket; 
      }
      else if (e.isPaid && !e.isCleared) {
         pendingVal = e.amount;
         allocatedVal = Math.max(0, totalInBucket - pendingVal);
      } 
      else {
         allocatedVal = totalInBucket;
      }

      if (pendingVal > 0) {
           if(targetAcc.type !== 'credit') {
               s[e.accountId].pendingBalance += pendingVal;
               s[e.accountId].reservedItems.push({ 
                   id: e.id, 
                   name: e.name, 
                   amount: pendingVal, 
                   type: 'Pending Clearance', 
                   originalType: e.type, 
                   accountId: e.accountId, 
                   isPending: true,
                   date: e.date || e.dueDate 
               });
           }
      }

      if (allocatedVal > 0) {
          const isBillType = ['bill', 'loan', 'subscription', 'bnpl'].includes(e.type); // Included bnpl
          const currentDueDate = e.date || e.dueDate;
          const displayDate = (isBillType && e.isPaid && !e.isCleared) 
                              ? getNextDateStr(currentDueDate, e.frequency) 
                              : currentDueDate;

          if(targetAcc.type === 'credit' && targetAcc.linkedAccountId) {
            const backingId = targetAcc.linkedAccountId;
            if(s[backingId]) {
                s[backingId].heldForCredit += allocatedVal;
                s[backingId].reservedItems.push({ 
                    id: e.id, 
                    name: `${e.name} (Credit Hold)`, 
                    amount: allocatedVal, 
                    type: 'Credit Hold', 
                    originalType: e.type, 
                    accountId: backingId, 
                    isPending: false,
                    date: displayDate
                });
            }
          }
          else if(targetAcc.type !== 'credit') {
            s[e.accountId].requiredBalance += allocatedVal;
            s[e.accountId].reservedItems.push({ 
                id: e.id, 
                name: e.name, 
                amount: allocatedVal, 
                type: e.type, 
                originalType: e.type, 
                accountId: e.accountId, 
                isPending: false,
                date: displayDate
            });
          }
      }
    });

    // 2. Process Pending Transfers (NEW)
    transactions.filter(t => t.type === 'transfer_pending').forEach(t => {
        if (s[t.sourceId]) {
            s[t.sourceId].pendingBalance += t.amount;
            s[t.sourceId].reservedItems.push({
                id: t.id,
                name: `Transfer -> ${t.targetName || 'Account'}`,
                amount: t.amount,
                type: 'Pending Transfer',
                originalType: 'transfer',
                accountId: t.sourceId,
                isPending: true,
                date: t.date,
                // NEED THESE FOR CLEARING:
                sourceId: t.sourceId,
                targetId: t.targetId,
                breakdown: t.breakdown // For deferred allocations
            });
        }
    });

    // 3. NEW: Auto-Allocate Excess Funds for Discretionary Account
    const discretionaryAcc = accounts.find(a => a.isDiscretionary);
    if (discretionaryAcc && s[discretionaryAcc.id]) {
        const strat = s[discretionaryAcc.id];
        // Calculate what is already spoken for
        const obligated = strat.requiredBalance + strat.pendingBalance + strat.heldForCredit;
        const current = discretionaryAcc.currentBalance || 0;
        // The rest is "Discretionary"
        const excess = Math.max(0, current - obligated);
        
        if (excess > 0) {
            strat.discretionaryAllocated = excess;
            strat.reservedItems.push({
                id: 'auto-disc',
                name: 'Discretionary Spending',
                amount: excess,
                type: 'discretionary',
                isPending: false,
                date: 'Available Now'
            });
            // We treat this as 'required' to fill the visual bar for Zero-Based logic
            // But we track it separately in discretionaryAllocated for coloring
            strat.requiredBalance += excess;
        }
    }

    return s;
  }, [expenses, accounts, incomes, transactions]);


  const safeToSpend = useMemo(() => {
    let totalSafe = 0;
    accounts.filter(a => a.type === 'checking').forEach(acc => {
      const strat = transferStrategy[acc.id];
      if (!strat) return;

      // Reserved includes bills + pending + held + auto-allocated discretionary
      // To calculate "Safe to Spend" (Liquid Cash), we take Current Balance - Bills - Pending - Holds.
      // Since 'requiredBalance' includes 'discretionaryAllocated', we subtract that back out to find true obligations.
      const totalObligations = (strat.requiredBalance - (strat.discretionaryAllocated || 0)) + strat.pendingBalance + strat.heldForCredit;
      const free = (acc.currentBalance || 0) - totalObligations;
      
      if (free > 0) totalSafe += free;
    });
    return totalSafe;
  }, [accounts, transferStrategy]);

  // --- GAME: ACHIEVEMENT CHECKER ---
  useEffect(() => {
    if (!user || isSimMode) return;

    const checkAchievements = async () => {
        const currentBadges = gameStats.badges || [];
        const newBadges = [];
        let xpGained = 0;

        // 1. ZERO HERO: Checking + Savings must be Zero-Based
        const eligibleAccounts = accounts.filter(a => ['checking', 'savings'].includes(a.type));
        
        if (eligibleAccounts.length > 0) {
            const allZeroBased = eligibleAccounts.every(acc => {
                const strat = transferStrategy[acc.id];
                if (!strat) return false;
                const discAlloc = strat.discretionaryAllocated || 0;
                const obligated = (strat.requiredBalance - discAlloc) + strat.pendingBalance + strat.heldForCredit;
                const free = (acc.currentBalance || 0) - obligated - discAlloc;
                return Math.abs(free) < 100; // $1.00 margin
            });

            if (allZeroBased && !currentBadges.includes('zero_hero')) {
                newBadges.push('zero_hero');
                xpGained += 500;
                addToast("🏆 TROPHY UNLOCKED: Zero-Based Hero! (All funds assigned)", "success");
                triggerConfetti();
            }
        }

        // 2. SAVINGS STAR: Multi-Level
        const totalSavings = expenses.filter(e => e.type === 'savings').reduce((sum, e) => sum + (e.currentBalance || 0), 0);
        
        // Level 1: $1k
        if (totalSavings >= 100000 && !currentBadges.includes('savings_star')) {
             newBadges.push('savings_star');
             xpGained += 300;
             addToast("🏆 TROPHY UNLOCKED: Savings Star! ($1k Saved)", "success");
             triggerConfetti();
        }
        // Level 2: $5k
        if (totalSavings >= 500000 && !currentBadges.includes('savings_5k')) {
             newBadges.push('savings_5k');
             xpGained += 500;
             addToast("🏆 TROPHY UNLOCKED: Savings Pro! ($5k Saved)", "success");
             triggerConfetti();
        }
        // Level 3: $10k
        if (totalSavings >= 1000000 && !currentBadges.includes('savings_10k')) {
             newBadges.push('savings_10k');
             xpGained += 1000;
             addToast("🏆 TROPHY UNLOCKED: Savings Elite! ($10k Saved)", "success");
             triggerConfetti();
        }
        // Level 4: $25k
        if (totalSavings >= 2500000 && !currentBadges.includes('savings_25k')) {
             newBadges.push('savings_25k');
             xpGained += 2500;
             addToast("🏆 TROPHY UNLOCKED: Savings Master! ($25k Saved)", "success");
             triggerConfetti();
        }

        // 3. STREAK: Multi-Level (Logic relies on checkStreak updating stats.streak first)
        const currentStreak = gameStats.streak || 0;
        // Level 1: 7 Days
        if (currentStreak >= 7 && !currentBadges.includes('streak_7')) {
             newBadges.push('streak_7');
             xpGained += 200;
             addToast("🏆 TROPHY UNLOCKED: 7 Day Streak!", "success");
             triggerConfetti();
        }
        // Level 2: 30 Days
        if (currentStreak >= 30 && !currentBadges.includes('streak_30')) {
             newBadges.push('streak_30');
             xpGained += 500;
             addToast("🏆 TROPHY UNLOCKED: 30 Day Streak!", "success");
             triggerConfetti();
        }
        // Level 3: 100 Days
        if (currentStreak >= 100 && !currentBadges.includes('streak_100')) {
             newBadges.push('streak_100');
             xpGained += 2000;
             addToast("🏆 TROPHY UNLOCKED: 100 Day Streak!", "success");
             triggerConfetti();
        }
        
        // 4. AUDIT MASTER: Multi-Level (Counts tracked in gameStats.totalAudits)
        const audits = gameStats.totalAudits || 0;
        if (audits >= 10 && !currentBadges.includes('audit_master')) {
            newBadges.push('audit_master');
            xpGained += 300;
            addToast("🏆 TROPHY UNLOCKED: Audit Master! (10 Audits)", "success");
            triggerConfetti();
        }
        if (audits >= 50 && !currentBadges.includes('audit_grand')) {
            newBadges.push('audit_grand');
            xpGained += 1000;
            addToast("🏆 TROPHY UNLOCKED: Grandmaster Auditor! (50 Audits)", "success");
            triggerConfetti();
        }
        if (audits >= 100 && !currentBadges.includes('audit_legend')) {
            newBadges.push('audit_legend');
            xpGained += 2500;
            addToast("🏆 TROPHY UNLOCKED: Legendary Auditor! (100 Audits)", "success");
            triggerConfetti();
        }
        
        // 5. DEBT SLAYER: Multi-Level (Counts tracked in gameStats.debtsCleared)
        const debtsCleared = gameStats.debtsCleared || 0;
        if (debtsCleared >= 1 && !currentBadges.includes('debt_slayer')) {
             newBadges.push('debt_slayer');
             xpGained += 300;
             addToast("🏆 TROPHY UNLOCKED: Debt Slayer! (1 Debt Paid)", "success");
             triggerConfetti();
        }
        if (debtsCleared >= 5 && !currentBadges.includes('debt_destroyer')) {
             newBadges.push('debt_destroyer');
             xpGained += 1000;
             addToast("🏆 TROPHY UNLOCKED: Debt Destroyer! (5 Debts Paid)", "success");
             triggerConfetti();
        }
        if (debtsCleared >= 10 && !currentBadges.includes('debt_free')) {
             newBadges.push('debt_free');
             xpGained += 2500;
             addToast("🏆 TROPHY UNLOCKED: Freedom Fighter! (10 Debts Paid)", "success");
             triggerConfetti();
        }

        if (newBadges.length > 0) {
            const newStats = { 
                ...gameStats, 
                xp: gameStats.xp + xpGained, 
                badges: [...currentBadges, ...newBadges] 
            };
            setGameStats(newStats);
            await updateDoc(doc(db, 'users', user.uid, 'settings', 'gameStats'), newStats);
        }
    };

    checkAchievements();
  }, [accounts, transferStrategy, expenses, user, isSimMode, gameStats]);

  const sortedAccounts = useMemo(() => {
    // Primary sort: 'order' field (if exists)
    // Secondary sort: Type groupings
    const typeOrder = { 'checking': 0, 'credit': 1, 'loan': 2, 'savings': 3, 'investment': 4 };
    return [...accounts].sort((a, b) => {
        // If one has order and other doesn't, ordered comes first (or treat undefined as high number)
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        
        if (orderA !== orderB) return orderA - orderB;

        // Fallback to Type
        const typeA = typeOrder[(a.type || '').toLowerCase()] ?? 99;
        const typeB = typeOrder[(b.type || '').toLowerCase()] ?? 99;
        if (typeA !== typeB) return typeA - typeB;
        
        return 0;
    });
  }, [accounts]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a,b) => {
      if(sortType === 'amount') return (b.amount || 0) - (a.amount || 0);
      if(sortType === 'frequency') {
        const order = { 'Weekly': 1, 'Biweekly': 2, 'Twice a Month': 3, 'Monthly': 4, 'Quarterly': 5, 'Annually': 6 };
        return (order[a.frequency] || 99) - (order[b.frequency] || 99);
      }
      if(sortType === 'account') return (a.accountId || '').localeCompare(b.accountId || '');
      return new Date(a.date || a.nextDate) - new Date(b.date || b.nextDate);
    });
  }, [expenses, sortType]);

  const subBleed = useMemo(() => expenses.filter(e => e.isSubscription).reduce((sum, e) => sum + getAnnualAmount(e.amount, e.frequency)/12, 0), [expenses]);

  const forecastFeed = useMemo(() => {
      if (!expenses.length) return [];
      const items = [];
      const windowStart = new Date();
      expenses.forEach(e => {
          // --- UPDATED FILTER: CLEAN UP THE FORECAST ---
          if (e.splitConfig?.isOwedOnly) return;
          if (e.excludeFromPayday) return; 
          if (e.type === 'savings') return; // Handled by transfers
          if (e.type === 'variable') return; // Buckets, not bills
          if (e.type === 'debt' && (e.amount || 0) <= 0) return; // Only scheduled payments

          if (['bill', 'subscription', 'loan', 'bnpl', 'debt'].includes(e.type)) { 
               const startDate = e.date || e.dueDate || e.nextDate;
               if (!startDate) return;
               const occs = getOccurrencesInWindow(startDate, e.frequency, windowStart, 90);
               occs.forEach(dateStr => {
                   const isCurrentCycle = dateStr === startDate;
                   items.push({ 
                       id: e.id, 
                       name: e.name, 
                       amount: e.amount, 
                       date: dateStr, 
                       original: e, 
                       status: isCurrentCycle ? 'Due Soon' : 'Upcoming' 
                   });
               });
          }
      });
      return items.sort((a,b) => {
          const d1 = new Date(a.date + 'T12:00:00'); 
          const d2 = new Date(b.date + 'T12:00:00');
          return d1 - d2;
      });
  }, [expenses]);

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><RefreshCw className="animate-spin mr-2"/> Loading OneViewPro...</div>;
  if (!user) return <AuthScreen />;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 text-slate-900 dark:text-slate-100 ${isSimMode ? 'bg-indigo-50 dark:bg-slate-950 border-[8px] border-indigo-500' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      {/* SIMULATION BANNER */}
      {isSimMode && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-indigo-600 text-white text-center py-1 font-bold text-xs shadow-lg flex items-center justify-center gap-2">
            <FlaskConical size={14} className="animate-pulse"/> SIMULATION MODE ACTIVE - DATA WILL NOT BE SAVED
            <button onClick={toggleSimMode} className="ml-4 bg-white text-indigo-600 px-2 rounded-full text-[10px] hover:bg-indigo-50 flex items-center gap-1"><XCircle size={10}/> EXIT</button>
        </div>
      )}

      {/* CONFETTI OVERLAY */}
      <Confetti isActive={showConfetti} />

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`h-20 flex items-center px-8 border-b border-slate-200 dark:border-slate-800 ${isSimMode ? 'pt-6' : ''}`}>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xl"><Wallet className="w-8 h-8" /><span>OneView<span className="text-slate-900 dark:text-white">Pro</span></span></div>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard }, 
            { id: 'budget', label: 'Budget Plan', icon: Wallet }, 
            { id: 'insights', label: 'Insights', icon: PieChart }, 
            { id: 'fire', label: 'Independence', icon: Flame }, 
            { id: 'accounts', label: 'Accounts', icon: Building2 }, 
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><item.icon className="w-5 h-5" /> {item.label}</button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all mb-2"><LogOut className="w-5 h-5"/> Sign Out</button>
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">{darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} {darkMode ? 'Light Mode' : 'Dark Mode'}</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`lg:ml-64 min-h-screen flex flex-col relative pb-20 transition-all duration-300 ${isSimMode ? 'bg-indigo-50/50' : 'bg-slate-50 dark:bg-slate-950'}`}>
        <header className={`h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 flex items-center justify-between ${isSimMode ? 'top-6' : ''}`}>
          <div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Menu className="w-6 h-6" /></button></div>
          <div className="flex items-center gap-3">
             <button onClick={toggleSimMode} className={`p-2 rounded-lg transition-all ${isSimMode ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title={isSimMode ? "Exit Simulation" : "Enter Simulator Mode"}>
                <FlaskConical className="w-5 h-5" />
             </button>

             <button onClick={() => setShowFundMover(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-indigo-500" title="Move Funds"><ArrowLeftRight className="w-5 h-5" /></button>
             <button onClick={() => setShowQuickLog(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-amber-500" title="Speed Log"><Zap className="w-5 h-5 fill-amber-500" /></button>
             <button onClick={() => setHistoryView({ isOpen: true, filterId: 'global' })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Recent History"><History className="w-5 h-5" /></button>
             {/* NEW EXPORT BUTTON */}
             <button onClick={handleExportCSV} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-emerald-500" title="Export CSV"><Download className="w-5 h-5" /></button>
             
             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block border-l pl-3 ml-1 border-slate-200">Financial OS</div>
          </div>
        </header>
        <div className="p-6 lg:p-8 flex-1 overflow-x-hidden">
          {permissionError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"><strong className="font-bold">Database Permission Error! </strong> Check Firestore Rules.</div>}
          
          {/* ACTION CENTER (Morning Briefing) */}
          {activeTab === 'dashboard' && <ActionCenter expenses={expenses} incomes={incomes} onMarkPaid={updateExpense} onOpenWizard={() => setShowPayday(true)} userLevel={gameStats.level} />}

          {/* PAYDAY BANNER (If Active) */}
          <PaydayBanner incomes={derivedIncomes} onPayday={() => setShowPayday(true)} />
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500 w-full">
              {/* GAME STATS WIDGET */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GameStats stats={gameStats} />
                  <TrophyCase badges={gameStats.badges} />
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financial Overview</h1><p className="text-slate-500 dark:text-slate-400 mt-1">Budget tracking.</p></div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAudit(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"><CheckCircle2 className="w-4 h-4" /> Daily Audit</button>
                  <button onClick={() => setShowPayday(true)} className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"><Sparkles className="w-4 h-4" /> Payday</button>
                </div>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Safe to Spend" value={Money.format(safeToSpend)} isPositive={true} icon={ShieldCheck} highlight={true} subtitle="Net Liquid Cash (Checking)" />
                <StatCard title="Total Debt" value={Money.format(totalDebt)} isPositive={false} icon={TrendingDown} />
              </div>

              {/* ACCOUNTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedAccounts.filter(a => !a.isHidden).map((acc, index) => {
                  const strat = transferStrategy[acc.id] || { requiredBalance: 0, pendingBalance: 0, heldForCredit: 0, reservedItems: [], discretionaryAllocated: 0 };
                  const isCredit = acc.type === 'credit';
                  const isTrackingAccount = ['loan', 'investment'].includes(acc.type);
                  
                  const pending = isCredit ? 0 : strat.pendingBalance;
                  // Separate Bill requirements from Discretionary Allocation for the visualization
                  const discAlloc = strat.discretionaryAllocated || 0;
                  const billRequired = isCredit ? 0 : (strat.requiredBalance - discAlloc + strat.heldForCredit); 
                  
                  // 'Free' is what's left after all reservations (bills + discretionary + pending). 
                  // For the discretionary account, this will likely be 0 due to auto-allocation.
                  const free = (acc.currentBalance || 0) - billRequired - pending - discAlloc;
                  
                  // Zero-Based Badge: Show if very little free cash is left (meaning everything is assigned, even if assigned to 'fun')
                  const isFullyAllocated = Math.abs(free) < 50 && !isCredit && !isTrackingAccount && (acc.currentBalance || 0) > 0;
                  const totalUsed = billRequired + pending + discAlloc + Math.max(0, free);
                  
                  // --- NEW ICON/COLOR LOGIC ---
                  let icon = <Building2 size={24}/>;
                  let colorClass = 'bg-emerald-100 text-emerald-600';
                  let borderColor = 'border-slate-200 dark:border-slate-800';

                  if (acc.type === 'savings') {
                      icon = <PiggyBank size={24}/>;
                      colorClass = 'bg-emerald-100 text-emerald-600';
                  } else if (acc.type === 'credit') {
                      icon = <CardIcon size={24}/>;
                      colorClass = 'bg-orange-100 text-orange-600';
                      borderColor = 'border-orange-200 dark:border-orange-900';
                  } else if (acc.type === 'loan') {
                      icon = <TrendingDown size={24}/>;
                      colorClass = 'bg-orange-100 text-orange-600';
                      borderColor = 'border-orange-200 dark:border-orange-900';
                  } else if (acc.type === 'investment') {
                      icon = <TrendingUp size={24}/>;
                      colorClass = 'bg-purple-100 text-purple-600';
                      borderColor = 'border-purple-200 dark:border-purple-900';
                  }

                  return (
                    <div key={acc.id} onClick={() => { if(acc.type === 'credit') setPayCardAccount(acc); else if (!isTrackingAccount) setBreakdownModal({ accountId: acc.id, name: acc.name }); }} className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${borderColor} shadow-sm cursor-pointer hover:border-emerald-500 transition-colors relative overflow-hidden group`}>
                      {isFullyAllocated && <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm"><Medal size={12}/> Zero-Based Hero</div>}
                      
                      {/* REORDER BUTTONS */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {index > 0 && <button onClick={(e) => { e.stopPropagation(); handleReorderAccount(acc.id, 'up'); }} className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded shadow-sm text-slate-500"><ChevronUp size={14}/></button>}
                          {index < sortedAccounts.length - 1 && <button onClick={(e) => { e.stopPropagation(); handleReorderAccount(acc.id, 'down'); }} className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded shadow-sm text-slate-500"><ChevronDown size={14}/></button>}
                      </div>

                      <div className="flex justify-between items-center mb-4 mt-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl ${colorClass}`}>
                             {icon}
                          </div>
                          <div><h3 className="font-bold text-lg text-slate-800 dark:text-white">{acc.name}</h3><p className="text-xs text-slate-500 uppercase">{acc.type}</p></div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-xl ${(acc.currentBalance || 0) < 0 ? 'text-orange-500' : 'text-slate-800 dark:text-white'}`}>{Money.format(acc.currentBalance)}</div>
                          {isCredit && <div className="text-xs text-indigo-500 font-bold mt-1">Tap to Pay</div>}
                        </div>
                      </div>
                      {!isCredit && !isTrackingAccount && (
                        <div className="space-y-2">
                          <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                             {/* BLUE = PENDING */}
                            <div className="bg-blue-400 h-full" style={{ width: `${(pending / totalUsed) * 100}%` }}></div>
                             {/* AMBER = BILLS */}
                            <div className="bg-amber-400 h-full" style={{ width: `${(billRequired / totalUsed) * 100}%` }}></div>
                             {/* PURPLE = DISCRETIONARY (New) */}
                            <div className="bg-purple-400 h-full" style={{ width: `${(discAlloc / totalUsed) * 100}%` }}></div>
                             {/* EMERALD = FREE (Unallocated) */}
                            <div className="bg-emerald-400 h-full" style={{ width: `${(Math.max(0, free) / totalUsed) * 100}%` }}></div>
                          </div>
                          <div className="flex justify-between text-sm font-medium">
                            <div className="flex items-center gap-1 text-amber-500 cursor-pointer hover:text-amber-600" onClick={(e) => { e.stopPropagation(); setBreakdownModal({ accountId: acc.id, name: acc.name }); }}>
                                Reserved: {Money.format(billRequired + pending)} 
                                {pending > 0 && <span className="text-[10px] text-blue-500 ml-1">({Money.format(pending)} pending)</span>}
                                <Info size={14}/>
                            </div>
                            
                            {/* DISCRETIONARY LOG BUTTON & BALANCE */}
                            {acc.isDiscretionary ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-purple-500 font-bold">Available: {Money.format(free + discAlloc)}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowDiscLog(true); }}
                                        className="p-1 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors"
                                        title="Log Discretionary Spend"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            ) : (
                                <span className={free < 0 ? "text-red-500 font-bold" : "text-emerald-500"}>{free < 0 ? 'Overallocated: ' : 'Free: '}{Money.format(free)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* ... Rest of tabs ... */}
          {activeTab === 'insights' && (
             <div className="animate-in fade-in duration-500 w-full space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cash Flow Insights</h1>
                </div>
                
                {/* ROW 1: Net Worth & Forecast */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-64">
                   <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-w-0 relative group overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <div><h3 className="font-bold text-sm text-slate-800 dark:text-white">Net Worth Trend</h3><p className="text-[10px] text-slate-500">History (Daily Audits)</p></div>
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Activity size={16}/></div>
                      </div>
                      <div className="flex-1 min-h-0 -ml-2"><LiquidityTrendChart snapshots={snapshots} /></div>
                   </div>

                   <div onClick={() => setActiveTab('budget')} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-w-0 relative cursor-pointer hover:border-blue-400 transition-colors group overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <div><h3 className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">30-Day Cash Flow</h3><p className="text-[10px] text-slate-500">Projected Balance</p></div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">View Calendar</span>
                           <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={16}/></div>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 -ml-2"><CashFlowForecast accounts={accounts} incomes={derivedIncomes} expenses={expenses} /></div>
                   </div>
                </div>

                {/* ROW 2: The River */}
                <FlowVisualizer incomes={derivedIncomes} expenses={expenses} />
             </div>
          )}

          {activeTab === 'fire' && (
            <FireDashboard 
                expenses={expenses} 
                incomes={derivedIncomes} 
                accounts={accounts} 
                updateAccount={updateAccount}
                fireSettings={fireSettings} 
                updateFireSettings={updateFireSettings} 
            />
          )}

          {activeTab === 'budget' && (
            <div className="w-full space-y-6 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex gap-2">
                  <button onClick={() => setBudgetView('upcoming')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${budgetView === 'upcoming' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Upcoming Plan</button>
                  <button onClick={() => setBudgetView('history')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${budgetView === 'history' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>History</button>
                </div>
                {subBleed > 0 && <div className="text-xs font-bold text-orange-600 flex items-center gap-1"><RefreshCw size={12}/> Subscription Bleed: {Money.format(subBleed)}/mo</div>}
              </div>

              {budgetView === 'upcoming' && (
                <div className="space-y-8">
                  {/* FORECAST FEED */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center gap-2">
                      <CalendarDays size={18} className="text-slate-400"/>
                      <h3 className="font-bold text-slate-700 dark:text-slate-300">Projected Expenses (90 Days)</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {forecastFeed.map((item, idx) => {
                          const dateObj = new Date(item.date + 'T12:00:00');
                          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                          const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const isEffectivePaid = item.original.isPaid && (item.date === (item.original.date || item.original.dueDate));
                          const isCleared = item.original.isCleared;
                          
                          return (
                            <div key={`${item.id}-${item.date}-${idx}`} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className="text-center w-12">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase">{dayName}</div>
                                   <div className="font-bold text-slate-800 dark:text-white">{monthDay}</div>
                                 </div>
                                 <div>
                                   <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                       {item.name}
                                       {isEffectivePaid && !isCleared && <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">PENDING</span>}
                                   </div>
                                   <div className="text-xs text-slate-500">{item.status}</div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="font-bold text-slate-800 dark:text-white">{Money.format(item.amount)}</div>
                                  
                                  {/* NEW ACTION BUTTONS FOR FORECAST VIEW */}
                                  <div className="flex gap-2">
                                      {isEffectivePaid && !isCleared && (
                                          <button onClick={(e) => { e.stopPropagation(); handleClearTransaction(item.original); }} className="p-2 bg-white dark:bg-slate-800 text-blue-600 border border-blue-200 dark:border-blue-700 rounded-lg hover:scale-105 transition-transform" title="Clear">
                                              <ExternalLink size={16}/>
                                          </button>
                                      )}
                                      {!isEffectivePaid && (
                                          <button onClick={(e) => { e.stopPropagation(); setAdjustItem(item.original); }} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors" title="Mark Paid">
                                              <Check size={16}/>
                                          </button>
                                      )}
                                  </div>
                              </div>
                            </div>
                          );
                        })}
                        {forecastFeed.length === 0 && <div className="p-8 text-center text-slate-400">No upcoming expenses found.</div>}
                    </div>
                  </div>
                  
                  {/* BILL CALENDAR (COLLAPSED BY DEFAULT OR BELOW) */}
                  <div className="mb-8"><BillCalendar expenses={expenses} incomes={derivedIncomes} transactions={transactions} /></div>
                  
                  {/* UI LAYOUT FIX: Moved Sort Buttons Here, below Calendar */}
                  {budgetView === 'upcoming' && (
                      <div className="flex gap-2 mb-4 justify-end">
                        <button onClick={() => setSortType('date')} className={`px-4 py-1 rounded-full text-xs font-bold border ${sortType === 'date' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Sort Date</button>
                        <button onClick={() => setSortType('amount')} className={`px-4 py-1 rounded-full text-xs font-bold border ${sortType === 'amount' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Sort Amount</button>
                        <button onClick={() => setSortType('frequency')} className={`px-4 py-1 rounded-full text-xs font-bold border ${sortType === 'frequency' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Sort Freq</button>
                      </div>
                  )}

                  {/* MANAGEMENT CARDS */}
                  <div>
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-slate-800 dark:text-white">Manage Expenses</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {derivedIncomes.map(i => (
                        <ItemCard key={i.id} title={i.name} amount={Money.format(i.amount)} subtitle={i.frequency} icon={TrendingUp} colorClass="bg-emerald-100 text-emerald-600" isExpanded={expandedId === i.id} onClick={() => setExpandedId(expandedId === i.id ? null : i.id)} date={i.nextDate}>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setShowPayday(true); }} className="flex-1 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg text-xs font-bold">Deposit Now</button>
                            <button onClick={(e) => { e.stopPropagation(); if (i.isDerived) { setBreakdownIncome(i); } else { setEditingItem(i); setModalType('new'); setModalContext('income'); } }} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold dark:text-white">{i.isDerived ? 'View Breakdown' : 'Edit'}</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(i.id, 'income'); }} className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-xs font-bold">Delete</button>
                          </div>
                        </ItemCard>
                      ))}
                    </div>
                  </div>

                  {['bill', 'variable', 'savings', 'debt'].map(type => {
                    const items = sortedExpenses.filter(e => e.type === type);
                    if (items.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="flex justify-between items-center mb-4 capitalize"><h2 className="text-xl font-bold text-slate-800 dark:text-white">{type === 'debt' ? 'Debt Payments' : (type === 'savings' ? 'Savings' : type + 's')}</h2>
                        {type === 'debt' && <button onClick={() => setShowDebtSim(true)} className="flex items-center gap-1 text-xs font-bold bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-200"><Zap size={12}/> Simulate Payoff</button>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.map(item => {
                            let icon = CreditCard; let color = "bg-orange-100 text-orange-600"; let subtitle = item.frequency;
                            let badges = [];
                            if (item.isEssential) badges.push({label: 'Essential', color: 'bg-indigo-100 text-indigo-600'});
                            if (item.isSubscription) badges.push({label: 'Sub', color: 'bg-orange-100 text-orange-600'});
                            let progress = 0;
                            if(type === 'variable') { icon = Wallet; color = "bg-blue-100 text-blue-600"; subtitle = `Left: ${Money.format(item.currentBalance || 0)}`; if ((item.amount||1) > 0) progress = ((item.currentBalance||0) / (item.amount||1)) * 100; }
                            if(type === 'savings') { icon = PiggyBank; color = "bg-emerald-100 text-emerald-600"; subtitle = `Saved: ${Money.format(item.currentBalance)}`; }
                            
                            if(type === 'debt') { 
                                icon = TrendingDown; 
                                color = "bg-orange-100 text-orange-600"; 
                                const linkedAcc = accounts.find(a => a.id === item.totalDebtBalance);
                                subtitle = linkedAcc ? `Bal: ${Money.format(Math.abs(linkedAcc.currentBalance))}` : `Target: ${Money.format(item.totalDebtBalance || 0)}`;
                            }

                            const linkedAccountForDebt = type === 'debt' ? accounts.find(a => a.id === item.totalDebtBalance) : null;
                            const isCreditDebt = linkedAccountForDebt?.type === 'credit';

                            // --- LINKED AGGREGATION (For Savings) ---
                            let displayBalance = item.currentBalance;
                            if (type === 'savings' && item.linkedAccountIds && item.linkedAccountIds.length > 0) {
                                displayBalance = item.linkedAccountIds.reduce((sum, id) => {
                                    const acc = accounts.find(a => a.id === id);
                                    return sum + (acc ? (acc.currentBalance || 0) : 0);
                                }, 0);
                            }

                            return (
                              <ItemCard 
                                key={item.id} 
                                title={item.name} 
                                amount={type === 'debt' && item.amount === 0 ? Money.format(item.currentBalance || 0) : Money.format(item.amount || 0)}
                                subtitle={subtitle} 
                                frequency={item.frequency} 
                                icon={icon} 
                                colorClass={color} 
                                isExpanded={expandedId === item.id} 
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} 
                                isPaid={item.isPaid} 
                                badges={badges} 
                                progress={type==='variable' ? progress : undefined} 
                                date={item.date || item.dueDate}
                                type={type} 
                                currentBalance={displayBalance} // Use new displayBalance
                                savingsType={item.savingsType} 
                                targetAmount={item.targetBalance}
                                pendingPayment={item.pendingPayment} 
                              >
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2">
                                  {/* FIX: Only show Pay Card button if linked account is Credit */}
                                  {type === 'debt' && isCreditDebt && (
                                    <button onClick={(e) => { e.stopPropagation(); setPayingDebtItem(item); }} className="col-span-2 py-3 bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none mb-2"><Check size={18}/> Pay Card Now</button>
                                  )}

                                  {type === 'variable' && (
                                    <>
                                      {/* ADDED onWheel HANDLER TO PREVENT SCROLL VALUE CHANGE */}
                                      <div className="col-span-2 flex gap-2 mb-2"><input type="number" id={`add-${item.id}`} placeholder="+Add Funds" className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" onWheel={(e) => e.target.blur()} onClick={e => e.stopPropagation()}/><button onClick={(e) => { e.stopPropagation(); const val = document.getElementById(`add-${item.id}`).value; if(val) updateExpense(item.id, 'addedFunds', Money.toCents(val)); }} className="px-4 bg-emerald-500 text-white rounded-lg font-bold">Add</button></div>
                                      <div className="col-span-2 flex gap-2 mb-2"><input type="number" id={`spd-${item.id}`} placeholder="-Log Spend" className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-600 dark:text-white" onWheel={(e) => e.target.blur()} onClick={e => e.stopPropagation()}/><button onClick={(e) => { e.stopPropagation(); const val = document.getElementById(`spd-${item.id}`).value; if(val) updateExpense(item.id, 'spent', Money.toCents(val)); }} className="px-4 bg-red-500 text-white rounded-lg font-bold">Log</button></div>
                                      <button onClick={(e) => { e.stopPropagation(); setShowCycleEnd(item); }} className="col-span-2 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold mb-2 flex items-center justify-center gap-2"><RotateCcw size={12}/> Close Cycle / Rollover</button>
                                    </>
                                  )}
                                  {type === 'bill' && (<button onClick={(e) => { e.stopPropagation(); updateExpense(item.id, 'isPaid', !item.isPaid); }} className={`col-span-2 py-2 rounded-lg text-xs font-bold mb-2 ${item.isPaid ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500 text-white'}`}>{item.isPaid ? 'Mark Unpaid' : 'Mark Paid'}</button>)}
                                  <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setModalType('new'); setModalContext('expense'); }} className="py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold dark:text-white">Edit</button>
                                  <button onClick={(e) => { e.stopPropagation(); setHistoryView({ isOpen: true, filterId: item.id, itemName: item.name }); }} className="py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold dark:text-white">History</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, 'expense'); }} className="col-span-2 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-xs font-bold">Delete</button>
                                </div>
                              </ItemCard>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HISTORY VIEW */}
              {budgetView === 'history' && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center gap-2">
                        <History size={18} className="text-slate-400"/>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">Recently Paid Bills</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {transactions.filter(t => t.type === 'bill_paid' || t.type === 'expense_cleared' && t.type !== 'voided').length === 0 && <div className="p-8 text-center text-slate-400">No recent payments found.</div>}
                        {transactions.filter(t => (t.type === 'bill_paid' || t.type === 'expense_cleared') && t.type !== 'voided').map(t => (
                          <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><Check size={16}/></div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{t.itemName}</div>
                                    <div className="text-xs text-slate-500">{new Date(t.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="font-bold text-slate-800 dark:text-white">{Money.format(Math.abs(t.amount))}</div>
                                {/* NEW UNDO BUTTON IN HISTORY LIST */}
                                <button onClick={() => handleUndoTransaction(t.id, t)} className="text-xs font-bold text-red-500 hover:underline">Undo</button>
                              </div>
                          </div>
                        ))}
                    </div>
                  </div>
              )}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="w-full space-y-8 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800 dark:text-white">Accounts</h2><button onClick={() => { setModalType('account'); setModalContext('account'); }} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">+ Add Account</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['checking','credit','savings','loan','investment'].map(groupType => {
                  const groupAccounts = sortedAccounts.filter(a => (a.type||'').toLowerCase() === groupType);
                  if (groupAccounts.length === 0) return null;
                  return (
                    <div key={groupType} className="col-span-full space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">{groupType}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groupAccounts.map(acc => (
                          <div key={acc.id} onClick={() => { if(acc.type === 'credit') setPayCardAccount(acc); else if (!isTrackingAccount) setBreakdownModal({ accountId: acc.id, name: acc.name }); }} className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${borderColor} shadow-sm cursor-pointer hover:border-emerald-500 transition-colors ${acc.isHidden ? 'opacity-50 border-slate-200 border-dashed' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><Building2 size={24} className="text-slate-600 dark:text-slate-400"/></div>
                                <div><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">{acc.name}{acc.isHidden && <span className="text-[10px] bg-slate-100 px-2 rounded text-slate-500">HIDDEN</span>}</h3></div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right"><div className="font-bold text-xl text-slate-800 dark:text-white">{Money.format(acc.currentBalance)}</div></div>
                                
                                <div className="flex gap-2">
                                    {/* EDIT BUTTON ADDED */}
                                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(acc); setModalType('account'); setModalContext('account'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"><Edit2 size={18}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); confirmAction('Delete Account', 'This cannot be undone.', 'Delete', () => handleDelete(acc.id, 'account')); }} className="p-2 hover:bg-red-50 rounded-full text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="w-full space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Data Management</h2>
              
              <PartnerManager onAdd={handleAddItem} onDelete={handleDelete} partners={partners} accounts={accounts} />
              
              {/* NEW BACKUP MANAGER */}
              <BackupManager /> 

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <button onClick={() => { if(confirm("Reset everything?")) { localStorage.clear(); window.location.reload(); }}} className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30"><Trash2 size={20}/> Reset All Data</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FLOATING ACTION BUTTON & MODALS */}
      <SpeedDial onAdd={(type) => { setModalType(type); setModalContext(type); }} />
      <UnifiedEntryModal 
          isOpen={!!modalType} 
          onClose={() => { setModalType(null); setEditingItem(null); setModalContext(null); }} 
          onSave={handleAddItem} 
          accounts={accounts} 
          expenses={expenses} // Pass full expenses list for Linking
          initialData={editingItem} 
          incomes={incomes} 
          type={modalType} 
          context={modalContext} 
          partners={partners} 
      />
      {/* UPDATE: PaydayWizard now receives the completion handler */}
      <PaydayWizard 
          isOpen={showPayday} 
          onClose={handlePaydayComplete} 
          income={incomes.find(i => i.isPrimary) || incomes[0]} 
          expenses={expenses} 
          updateExpense={updateExpense} 
          accounts={accounts} 
          updateAccount={updateAccount} // Passed to allow audit step to save
          incomes={derivedIncomes} // PASS DERIVED INCOMES HERE
      />
      <CycleEndModal isOpen={!!showCycleEnd} onClose={() => setShowCycleEnd(null)} expense={showCycleEnd} savingsGoals={expenses.filter(e => e.type === 'savings')} debts={expenses.filter(e => e.type === 'debt')} updateExpense={updateExpense} />
      <DailyAuditModal 
        isOpen={showAudit} 
        onClose={handleAuditComplete} 
        accounts={accounts} 
        updateAccount={updateAccount} 
        expenses={expenses} 
        onClear={handleClearTransaction} 
        onMarkPaid={updateExpense} 
        updateExpense={updateExpense} 
        onPayDebt={(item) => setPayingDebtItem(item)} 
        transactions={transactions} // PASS TRANSACTIONS FOR PENDING TRANSFERS
      />
      <SafeToSpendInfoModal isOpen={showSafeInfo} onClose={() => setShowSafeInfo(false)} safeAmount={safeToSpend} accountName={accounts.find(a => a.isDiscretionary)?.name} />
      <CreditPaymentModal isOpen={!!payCardAccount} onClose={() => setPayCardAccount(null)} account={payCardAccount} onPay={handleAtomicPayment} accounts={accounts} />
      
      {/* UPDATE: Reserved Breakdown now gets handlers to modify state */}
      <ReservedBreakdownModal 
          isOpen={!!breakdownModal} 
          onClose={() => setBreakdownModal(null)} 
          items={breakdownModal ? (transferStrategy[breakdownModal.accountId]?.reservedItems || []) : []} 
          accountName={breakdownModal?.name} 
          onMarkPaid={updateExpense} 
          onClear={handleClearTransaction}
          updateExpense={updateExpense} 
      />
      
      <PartnerIncomeBreakdownModal isOpen={!!breakdownIncome} onClose={() => setBreakdownIncome(null)} partnerName={breakdownIncome?.name} items={breakdownIncome?.breakdownItems || []} totalAnnual={breakdownIncome?.totalAnnual} payFrequency={breakdownIncome?.frequency} perPaycheck={breakdownIncome?.amount} />
      
      {/* HISTORY & QUICK LOG & DEBT SIM & FUND MOVER & PAY DEBT */}
      <TransactionHistoryModal 
        isOpen={historyView.isOpen} 
        onClose={() => setHistoryView({ isOpen: false, filterId: null, itemName: null })} 
        transactions={transactions} 
        filterId={historyView.filterId} 
        itemName={historyView.itemName} 
        onUndo={handleUndoTransaction} 
      />
      <QuickLogModal 
        isOpen={showQuickLog} 
        onClose={() => setShowQuickLog(false)} 
        expenses={expenses}
        onLogSpend={(id, amt) => updateExpense(id, 'spent', amt)}
      />
      <DebtSimulatorModal 
        isOpen={showDebtSim} 
        onClose={() => setShowDebtSim(false)} 
        accounts={accounts} 
        expenses={expenses} 
      />
      <FundMoverModal 
        isOpen={showFundMover} 
        onClose={() => setShowFundMover(false)} 
        expenses={expenses} 
        accounts={accounts}
        onTransfer={handleFundTransfer}
      />
      
      {/* NEW PAY DEBT MODAL */}
      <PayDebtModal 
        isOpen={!!payingDebtItem}
        onClose={() => setPayingDebtItem(null)}
        bucket={payingDebtItem}
        account={accounts.find(a => a.id === payingDebtItem?.totalDebtBalance)}
        onConfirm={handleConfirmPayCard}
      />

      {/* NEW DISCRETIONARY LOG MODAL */}
      <DiscretionaryLogModal 
        isOpen={showDiscLog}
        onClose={() => setShowDiscLog(false)}
        onConfirm={handleLogDiscretionary}
      />

      {/* GLOBAL TOAST & CONFIRM */}
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <ConfirmationModal 
         isOpen={confirmState.isOpen} 
         onClose={() => setConfirmState({ ...confirmState, isOpen: false })} 
         onConfirm={confirmState.onConfirm} 
         title={confirmState.title} 
         message={confirmState.message} 
         actionLabel={confirmState.actionLabel} 
      />
      
      {/* App-Level Adjustment Modal for Budget View */}
      <AdjustmentModal 
          isOpen={!!adjustItem} 
          onClose={() => setAdjustItem(null)} 
          item={adjustItem} 
          onConfirm={(item, amt) => updateExpense(item.id, 'isPaid', true, amt)} 
          actionLabel="Confirm & Mark Paid"
      />
    </div>
  );
}