import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Wallet, RefreshCw, LogIn, UserPlus } from 'lucide-react';
import { auth } from '../../lib/firebase'; // Importing from your new file

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase:', '').replace('auth/', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 text-emerald-500"><Wallet size={48} /></div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">OneView<span className="text-emerald-500">Pro</span></h1>
          <p className="text-slate-500">Your financial life, simplified.</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
            <input type="email" required className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white border-none outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
            <input type="password" required className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white border-none outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-orange-500 text-sm font-bold text-center">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex justify-center items-center gap-2">
            {loading ? <RefreshCw className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-slate-500 hover:text-emerald-500 transition-colors">
            {isLogin ? "New here? Create an account" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;