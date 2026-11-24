import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, CreditCard, BookOpen, Landmark } from 'lucide-react';

const fmtUSD = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

export default function LandingPage({ onNavigate }) {
  const [segment, setSegment] = useState('SAAS');
  const [mrr, setMrr] = useState(85000);
  const [churnPct, setChurnPct] = useState(2.5);
  const [cashBalance, setCashBalance] = useState(160000);

  const baseMult = segment === 'SAAS' ? 2.6 : 1.9;
  const churnPenalty = Math.max(0.5, 1 - churnPct / 15);
  const rawLimit = mrr * baseMult * churnPenalty;
  const limit = Math.max(15000, Math.min(500000, Math.round(Math.min(rawLimit, cashBalance * 2.5) / 1000) * 1000));
  const tier = churnPct <= 3 && cashBalance >= mrr * 1.5 ? 'A' : churnPct <= 6 ? 'B' : 'C';
  const apr = tier === 'A' ? 12.5 : tier === 'B' ? 14.8 : 17.5;

  return (
    <div>
      <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-slate-900 text-white py-14 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Non-Dilutive Credit Lines • Zero FICO Impact
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Instant Credit Lines Underwritten by <span className="text-teal-400">Real-Time Cash Flow</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              Built for B2B SaaS companies and digital agencies. Connect Stripe, QuickBooks Online, and bank feeds via read-only OAuth to unlock revolving capital based on verified recurring monthly revenue.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onNavigate('borrower')}
                className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-900 font-bold text-sm shadow-lg transition flex items-center gap-2"
              >
                <span>Launch Borrower Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-teal-300" />
                <span>Open Admin Panel</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-navy-900">Live Credit-Line Estimator</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">Tier {tier} Preview</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                {['SAAS', 'AGENCY'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSegment(s)}
                    className={`py-2 rounded-lg text-xs font-bold transition ${segment === s ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    {s === 'SAAS' ? 'B2B SaaS (MRR)' : 'Digital Agency'}
                  </button>
                ))}
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Verified Monthly Recurring Cash Flow</span>
                    <span className="text-navy-900">{fmtUSD(mrr)}/mo</span>
                  </div>
                  <input type="range" min="25000" max="250000" step="5000" value={mrr} onChange={(e) => setMrr(Number(e.target.value))} className="w-full accent-teal-600" />
                </div>
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Monthly Revenue Churn</span>
                    <span className="text-navy-900">{churnPct.toFixed(1)}%</span>
                  </div>
                  <input type="range" min="0.5" max="10" step="0.5" value={churnPct} onChange={(e) => setChurnPct(Number(e.target.value))} className="w-full accent-teal-600" />
                </div>
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Operating Bank Cash Balance</span>
                    <span className="text-navy-900">{fmtUSD(cashBalance)}</span>
                  </div>
                  <input type="range" min="20000" max="500000" step="10000" value={cashBalance} onChange={(e) => setCashBalance(Number(e.target.value))} className="w-full accent-teal-600" />
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Estimated Revolving Line</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-teal-400">{fmtUSD(limit)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Indicative APR</div>
                  <div className="text-lg font-bold">{apr}%</div>
                </div>
              </div>

              <button onClick={() => onNavigate('borrower')} className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-semibold text-sm transition">
                Apply with These Metrics →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <CreditCard className="w-6 h-6 text-indigo-600 mb-3" />
          <h3 className="font-bold text-navy-900 mb-1">Stripe Billing &amp; Revenue</h3>
          <p className="text-sm text-slate-600">Ingests subscriptions, invoices, refunds, and payouts to verify net MRR and dollar churn.</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <BookOpen className="w-6 h-6 text-emerald-600 mb-3" />
          <h3 className="font-bold text-navy-900 mb-1">QuickBooks Online</h3>
          <p className="text-sm text-slate-600">Extracts P&amp;L statements, AR/AP aging, DSO, and top-3 client concentration for agencies.</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <Landmark className="w-6 h-6 text-teal-700 mb-3" />
          <h3 className="font-bold text-navy-900 mb-1">Plaid Bank Feeds</h3>
          <p className="text-sm text-slate-600">Reconciles up to 24 months of settled cash deposits, 90-day balances, and NSF events.</p>
        </div>
      </section>
    </div>
  );
}
