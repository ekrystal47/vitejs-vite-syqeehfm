import React, { useState } from 'react';
import { Download, Upload, FileJson, AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

const COLLECTIONS = ['accounts', 'expenses', 'incomes', 'partners', 'transactions', 'history_snapshots'];

const BackupManager = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  // --- EXPORT FUNCTION ---
  const handleExport = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setStatus(null);

    try {
      const backupData = {
        meta: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          uid: auth.currentUser.uid,
          email: auth.currentUser.email
        },
        data: {}
      };

      // Fetch all collections in parallel
      await Promise.all(COLLECTIONS.map(async (colName) => {
        const querySnapshot = await getDocs(collection(db, 'users', auth.currentUser.uid, colName));
        backupData.data[colName] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }));

      // Create Download Link
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OneViewPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus({ type: 'success', message: 'Backup downloaded successfully.' });
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Export failed: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  // --- IMPORT FUNCTION ---
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (!window.confirm("WARNING: This will ERASE your current data and replace it with the backup. Are you sure?")) {
        e.target.value = null; // Reset input
        return;
    }

    setLoading(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        
        // Basic Validation
        if (!backup.data || !backup.meta) throw new Error("Invalid backup file format.");

        const uid = auth.currentUser.uid;
        const totalOps = []; // Store all batch operations

        // 1. PREPARE DELETE OPERATIONS (Wipe current data)
        for (const colName of COLLECTIONS) {
            const snapshot = await getDocs(collection(db, 'users', uid, colName));
            snapshot.docs.forEach(d => {
                totalOps.push({ type: 'delete', ref: doc(db, 'users', uid, colName, d.id) });
            });
        }

        // 2. PREPARE WRITE OPERATIONS (Restore data)
        Object.keys(backup.data).forEach(colName => {
            if (COLLECTIONS.includes(colName)) {
                backup.data[colName].forEach(item => {
                    const { id, ...data } = item;
                    // Fix Timestamps: Convert ISO strings back to Firestore timestamps if needed, 
                    // or let Firestore ServerTimestamp handle updates? 
                    // Ideally, we keep original data. Firestore handles standard JSON okay, 
                    // but Dates might need parsing if we want them as objects. 
                    // For now, we store exactly what was in JSON.
                    totalOps.push({ type: 'set', ref: doc(db, 'users', uid, colName, id), data: data });
                });
            }
        });

        // 3. EXECUTE BATCHES (Chunk by 450 to stay under 500 limit safely)
        const chunkSize = 450;
        for (let i = 0; i < totalOps.length; i += chunkSize) {
            const batch = writeBatch(db);
            const chunk = totalOps.slice(i, i + chunkSize);
            
            chunk.forEach(op => {
                if (op.type === 'delete') batch.delete(op.ref);
                if (op.type === 'set') batch.set(op.ref, op.data);
            });

            await batch.commit();
        }

        setStatus({ type: 'success', message: 'Restoration complete! Reloading...' });
        setTimeout(() => window.location.reload(), 1500);

      } catch (e) {
        console.error(e);
        setStatus({ type: 'error', message: 'Import failed: ' + e.message });
      } finally {
        setLoading(false);
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
            <Save size={24} />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Backup & Restore</h3>
            <p className="text-sm text-slate-500">Save a copy of your financial data or restore from a file.</p>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EXPORT BUTTON */}
        <button 
            onClick={handleExport}
            disabled={loading}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group text-slate-600 dark:text-slate-400 hover:text-blue-600"
        >
            {loading ? <Loader2 className="animate-spin" size={32}/> : <Download size={32} className="group-hover:scale-110 transition-transform"/>}
            <span className="font-bold">Download Backup</span>
            <span className="text-xs opacity-70">JSON Format</span>
        </button>

        {/* IMPORT BUTTON */}
        <div className="relative">
            <input 
                type="file" 
                accept=".json" 
                onChange={handleImport}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-slate-600 dark:text-slate-400 hover:text-emerald-600">
                {loading ? <Loader2 className="animate-spin" size={32}/> : <Upload size={32} />}
                <span className="font-bold">Restore from File</span>
                <span className="text-xs opacity-70">Click to upload JSON</span>
            </div>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <p><strong>Warning:</strong> Restoring a backup will wipe all current data and replace it with the file contents. This action cannot be undone.</p>
      </div>
    </div>
  );
};

export default BackupManager;