import React, { useState } from 'react';
import { apiRequest, setToken } from '../api/client.js';

export default function AuthPage({ onAuthSuccess, notify }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('founder@cloudscale.io');
  const [password, setPassword] = useState('FlowLine123!');
  const [loading, setLoading] = useState(false);

  async function submitAuth(e, overrideEmail, overridePass) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const path = isRegister && !overrideEmail ? '/auth/register' : '/auth/login';
      const body = isRegister && !overrideEmail
        ? { name, orgName, email, password }
        : { email: overrideEmail || email, password: overridePass || password };
      const data = await apiRequest(path, { method: 'POST', body });
      setToken(data.token);
      notify(`Signed in as ${data.user.name} (${data.user.accountType})`, 'success');
      onAuthSuccess(data.user);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{isRegister ? 'Create Borrower Account' : 'Sign In to FlowLine AI'}</h2>
          <p className="text-xs text-slate-500 mt-1">Use 1-click demo credentials or register your own organization.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => submitAuth(null, 'founder@cloudscale.io', 'FlowLine123!')}
            className="py-2 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-bold transition"
          >
            Demo Borrower
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => submitAuth(null, 'admin@flowline.ai', 'FlowLine123!')}
            className="py-2 px-3 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition"
          >
            Demo Super-Admin
          </button>
        </div>

        <form onSubmit={submitAuth} className="space-y-3.5 text-sm">
          {isRegister && (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full Name" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Company Legal Name" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </>
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Work Email" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition">
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-center text-xs font-semibold text-teal-700 hover:underline">
          {isRegister ? 'Already have an account? Sign in' : 'New SaaS or Agency? Register here'}
        </button>
      </div>
    </div>
  );
}
