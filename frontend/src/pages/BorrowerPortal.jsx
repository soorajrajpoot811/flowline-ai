import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

const fmtUSD = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

export default function BorrowerPortal({ user, notify }) {
  const [step, setStep] = useState(1);
  const [app, setApp] = useState(null);
  const [line, setLine] = useState(null);
  const [kyb, setKyb] = useState({ orgName: user?.orgName || 'CloudScale Analytics Inc.', segment: 'SAAS', ein: '84-2910482', uboName: user?.name || 'Founder', verifiedMrr: 94200 });
  const [selectedLimit, setSelectedLimit] = useState(240000);
  const [drawAmt, setDrawAmt] = useState(25000);
  const [drawPurpose, setDrawPurpose] = useState('Payroll Bridge');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const data = await apiRequest('/borrower/me');
      setApp(data.application);
      setLine(data.creditLine);
      if (data.creditLine) setStep(4);
      else if (data.application?.recommendedLimit > 0) {
        setSelectedLimit(data.application.recommendedLimit);
        setStep(3);
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleKyb(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest('/borrower/kyb', { method: 'POST', body: kyb });
      setApp(data.application);
      setStep(2);
      notify('KYB & OFAC verification passed!', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function handleLink(provider, skipped = false) {
    setLoading(true);
    try {
      const data = await apiRequest(`/borrower/integrations/${provider}/link`, { method: 'POST', body: { skipped } });
      setApp(data.application);
      notify(skipped ? 'Stripe marked N/A for agency.' : `Connected ${provider.toUpperCase()} via OAuth.`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function handleRunUnderwriting() {
    setLoading(true);
    try {
      const data = await apiRequest('/borrower/underwriting/run', { method: 'POST', body: {} });
      setApp(data.application);
      setSelectedLimit(data.application.recommendedLimit || 150000);
      setStep(3);
      notify(`AI Underwriting Complete — Tier ${data.application.riskTier}`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function handleActivate() {
    setLoading(true);
    try {
      const data = await apiRequest('/borrower/credit-lines/activate', { method: 'POST', body: { selectedLimit } });
      setLine(data.creditLine);
      setStep(4);
      notify(`Credit Line ${data.creditLine.lineCode} activated!`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function handleDraw(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest('/borrower/credit-lines/draws', { method: 'POST', body: { amount: Number(drawAmt), purpose: drawPurpose } });
      setLine(data.creditLine);
      notify(`Disbursed ${fmtUSD(drawAmt)} via ACH!`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function handleRepay() {
    setLoading(true);
    try {
      const data = await apiRequest('/borrower/credit-lines/repay', { method: 'POST', body: { amount: 10000 } });
      setLine(data.creditLine);
      notify('Applied $10,000 extra principal payment!', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setLoading(false); }
  }

  const conns = app?.connections || { stripe: {}, qbo: {}, plaid: {} };
  const canScore = conns.plaid?.linked && conns.qbo?.linked && (conns.stripe?.linked || conns.stripe?.skipped);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap gap-2">
        {['1. KYB Intake', '2. Financial OAuth', '3. AI Offer', '4. Credit Line'].map((label, idx) => (
          <button
            key={label}
            onClick={() => setStep(idx + 1)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${step === idx + 1 ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleKyb} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-bold text-navy-900">Step 1: Business &amp; KYB Verification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <input value={kyb.orgName} onChange={(e) => setKyb({ ...kyb, orgName: e.target.value })} required placeholder="Legal Name" className="px-3 py-2 rounded-lg border border-slate-300" />
            <select value={kyb.segment} onChange={(e) => setKyb({ ...kyb, segment: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="SAAS">B2B SaaS</option>
              <option value="AGENCY">Digital Agency</option>
            </select>
            <input value={kyb.ein} onChange={(e) => setKyb({ ...kyb, ein: e.target.value })} required placeholder="EIN / Tax ID" className="px-3 py-2 rounded-lg border border-slate-300" />
            <input type="number" value={kyb.verifiedMrr} onChange={(e) => setKyb({ ...kyb, verifiedMrr: Number(e.target.value) })} required placeholder="Monthly Recurring Revenue ($)" className="px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm">
            Verify KYB &amp; Continue →
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-navy-900">Step 2: Connect Financial Stack (Read-Only OAuth)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['stripe', 'qbo', 'plaid'].map((p) => (
              <div key={p} className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm uppercase text-navy-900">{p}</span>
                    {conns[p]?.linked ? <StatusBadge status="HEALTHY" /> : <StatusBadge status="PENDING" />}
                  </div>
                  {conns[p]?.linked && <div className="text-xs text-teal-700 font-semibold">Synced {conns[p].records} records</div>}
                </div>
                <div className="space-y-1.5">
                  <button onClick={() => handleLink(p)} disabled={loading} className="w-full py-2 rounded-lg bg-navy-900 text-white text-xs font-bold">
                    {conns[p]?.linked ? 'Re-Sync' : 'Connect OAuth'}
                  </button>
                  {p === 'stripe' && !conns.stripe?.linked && (
                    <button onClick={() => handleLink('stripe', true)} className="w-full py-1 text-[11px] text-slate-500 hover:underline">
                      Agency without Stripe? Mark N/A
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleRunUnderwriting} disabled={!canScore || loading} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${canScore ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            Run AI Underwriting →
          </button>
        </div>
      )}

      {step === 3 && app && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-navy-900">AI Credit Offer — Tier {app.riskTier}</h2>
            <StatusBadge status={app.status} />
          </div>
          <div className="text-3xl font-extrabold text-teal-700">{fmtUSD(selectedLimit)}</div>
          <input type="range" min="15000" max={Math.max(25000, app.recommendedLimit || 240000)} step="5000" value={selectedLimit} onChange={(e) => setSelectedLimit(Number(e.target.value))} className="w-full accent-teal-600" />
          <div className="text-xs text-slate-600">APR: <strong>{app.aprPct}%</strong> • Draw Fee: <strong>{app.drawFeePct}%</strong> • 12-mo PD: <strong>{(app.pdScore * 100).toFixed(1)}%</strong></div>
          <button onClick={handleActivate} disabled={loading || app.status === 'DECLINED'} className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm">
            E-Sign &amp; Activate {fmtUSD(selectedLimit)} Credit Line
          </button>
        </div>
      )}

      {step === 4 && line && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500">Available Credit</div>
              <div className="text-2xl font-extrabold text-teal-700">{fmtUSD(line.limit - line.drawn)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500">Drawn Principal</div>
              <div className="text-2xl font-extrabold text-navy-900">{fmtUSD(line.drawn)} / {fmtUSD(line.limit)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">Line Status</div>
                <StatusBadge status={line.status} />
              </div>
              <button onClick={handleRepay} disabled={loading || line.drawn <= 0} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold">
                Repay $10k
              </button>
            </div>
          </div>

          <form onSubmit={handleDraw} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Draw Amount ($)</label>
              <input type="number" min="5000" step="1000" value={drawAmt} onChange={(e) => setDrawAmt(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose</label>
              <select value={drawPurpose} onChange={(e) => setDrawPurpose(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                <option>Payroll Bridge</option>
                <option>Cloud &amp; AI Infra</option>
                <option>Paid Acquisition</option>
              </select>
            </div>
            <button type="submit" disabled={loading || line.status !== 'ACTIVE'} className="px-5 py-2 rounded-lg bg-navy-900 text-white font-bold text-sm">
              + Request ACH Draw
            </button>
          </form>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-navy-900 mb-3">Draw History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="border-b text-slate-500"><th className="pb-2">Draw ID</th><th className="pb-2">Date</th><th className="pb-2">Amount</th><th className="pb-2">Purpose</th><th className="pb-2">Status</th></tr></thead>
                <tbody className="divide-y">
                  {(line.draws || []).map((d, i) => (
                    <tr key={i}><td className="py-2 font-bold">{d.drawCode}</td><td className="py-2">{d.date}</td><td className="py-2 font-bold">{fmtUSD(d.amount)}</td><td className="py-2">{d.purpose}</td><td className="py-2"><StatusBadge status={d.status} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
