import React, { useEffect, useState } from 'react';
import { Activity, LogOut } from 'lucide-react';
import { apiRequest, getToken, setToken } from './api/client.js';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import BorrowerPortal from './pages/BorrowerPortal.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

export default function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    if (getToken()) {
      apiRequest('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(''));
    }
  }, []);

  function handleNavigate(target) {
    if ((target === 'borrower' || target === 'admin') && !user) {
      setView('auth');
      return;
    }
    if (target === 'admin' && user?.accountType !== 'ADMIN') {
      notify('Sign in with the Demo Super-Admin account to open the Admin Panel.', 'warning');
      setView('auth');
      return;
    }
    setView(target);
  }

  function handleLogout() {
    setToken('');
    setUser(null);
    setView('landing');
    notify('Signed out.', 'info');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-navy-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button onClick={() => setView('landing')} className="flex items-center gap-2 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center"><Activity className="w-4 h-4" /></div>
            <span>FlowLine AI</span>
          </button>
          <nav className="flex items-center bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            {['landing', 'borrower', 'admin'].map((m) => (
              <button key={m} onClick={() => handleNavigate(m)} className={`px-3 py-1.5 rounded-md capitalize ${view === m ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'}`}>
                {m === 'landing' ? 'Overview' : m === 'borrower' ? 'Borrower Portal' : 'Admin Panel'}
              </button>
            ))}
          </nav>
          <div>
            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">
                <span>{user.name}</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={() => setView('auth')} className="text-xs font-bold bg-teal-500 text-navy-900 px-3.5 py-1.5 rounded-lg">
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {view === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {view === 'auth' && (
          <AuthPage
            notify={notify}
            onAuthSuccess={(u) => {
              setUser(u);
              setView(u.accountType === 'ADMIN' ? 'admin' : 'borrower');
            }}
          />
        )}
        {view === 'borrower' && <BorrowerPortal user={user} notify={notify} />}
        {view === 'admin' && <AdminPanel notify={notify} />}
      </main>

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'error' ? 'bg-rose-700' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-navy-900 border-l-4 border-teal-500'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
