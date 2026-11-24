import React from 'react';

const STYLES = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PASSED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  OFFER_ISSUED: 'bg-teal-100 text-teal-800 border-teal-200',
  ACTIVE_LINE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DISBURSED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REPLAYED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MANUAL_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  PENDING_SECOND_APPROVAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  FROZEN: 'bg-sky-100 text-sky-800 border-sky-200',
  DELINQUENT: 'bg-rose-100 text-rose-800 border-rose-200',
  DECLINED: 'bg-rose-100 text-rose-800 border-rose-200',
  EXPIRED: 'bg-rose-100 text-rose-800 border-rose-200',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
  OPEN: 'bg-rose-100 text-rose-800 border-rose-200',
  CRITICAL: 'bg-rose-600 text-white border-rose-700',
  HIGH: 'bg-amber-500 text-white border-amber-600'
};

export default function StatusBadge({ status }) {
  const s = status || 'PENDING';
  const cls = STYLES[s] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}
