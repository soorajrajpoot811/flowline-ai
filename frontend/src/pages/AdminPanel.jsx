import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Sparkles, Send, Copy } from "lucide-react";
import { apiRequest } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";

const fmtUSD = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
const ROLES = [
  "SUPER_ADMIN",
  "SR_UNDERWRITER",
  "UNDERWRITER",
  "RISK_OPS",
  "COMPLIANCE",
  "AUDITOR",
];

export default function AdminPanel({ notify }) {
  const [tab, setTab] = useState("queue");
  const [demoRole, setDemoRole] = useState("SUPER_ADMIN");
  const [data, setData] = useState({
    applications: [],
    creditLines: [],
    policy: null,
    covenants: [],
    dlqJobs: [],
    auditLogs: [],
  });
  const [selectedId, setSelectedId] = useState(null);
  const [policyForm, setPolicyForm] = useState({
    minMonthsOperating: 6,
    minMonthlyRevenue: 25000,
    maxNsf90d: 3,
    overrideThreshold: 250000,
    tierAMultiple: 2.8,
    tierBMultiple: 2.0,
  });
  const [backtest, setBacktest] = useState(null);

  // AI Credit Memo Copilot & Stress-Test state
  const [memo, setMemo] = useState(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [revShock, setRevShock] = useState(-20);
  const [expSpike, setExpSpike] = useState(10);

  async function loadDashboard() {
    try {
      const res = await apiRequest("/admin/dashboard", { demoRole });
      setData(res);
      if (res.policy) setPolicyForm(res.policy);
      if (!selectedId && res.applications?.length)
        setSelectedId(res.applications[0]._id);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [demoRole]);

  const selected =
    data.applications.find((a) => a._id === selectedId) || data.applications[0];

  function handleSelectApp(id) {
    setSelectedId(id);
    setMemo(null);
    setChatHistory([]);
  }

  async function handleGenerateMemo() {
    if (!selected) return;
    setMemoLoading(true);
    try {
      const res = await apiRequest(
        `/admin/applications/${selected._id}/ai-memo`,
        { method: "POST", demoRole },
      );
      setMemo(res.memo);
      notify("AI Credit Committee Memo generated!", "success");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setMemoLoading(false);
    }
  }

  async function handleAskCopilot(e) {
    e.preventDefault();
    if (!selected || !chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput("");
    try {
      const res = await apiRequest(
        `/admin/applications/${selected._id}/ai-chat`,
        {
          method: "POST",
          demoRole,
          body: { question: q },
        },
      );
      setChatHistory((prev) => [...prev, { q, a: res.answer }]);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  function handleCopyMemo() {
    if (!memo) return;
    const text = `Verdict: ${memo.verdict}\nStrengths: ${memo.strengths.join("; ")}\nRisk Flags: ${memo.riskFlags.join("; ")}\nCovenants: ${memo.covenants.join("; ")}`;
    navigator.clipboard?.writeText(text);
    notify("Credit Memo copied to clipboard!", "info");
  }

  async function handleDecision(decision) {
    if (!selected) return;
    try {
      await apiRequest(`/admin/applications/${selected._id}/decision`, {
        method: "POST",
        demoRole,
        body: {
          decision,
          approvedLimit: selected.recommendedLimit,
          riskTier: selected.riskTier,
        },
      });
      notify(`Decision ${decision} applied to ${selected.orgName}`, "success");
      loadDashboard();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleFreeze(id) {
    try {
      await apiRequest(`/admin/credit-lines/${id}/toggle-freeze`, {
        method: "POST",
        demoRole,
      });
      notify("Credit line status updated.", "warning");
      loadDashboard();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleBacktest() {
    try {
      const res = await apiRequest("/admin/policies/simulate", {
        method: "POST",
        demoRole,
        body: policyForm,
      });
      setBacktest(res);
      notify("Shadow backtest completed across 500 historical apps.", "info");
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handlePublishPolicy() {
    try {
      await apiRequest("/admin/policies", {
        method: "POST",
        demoRole,
        body: policyForm,
      });
      notify("Published new Credit Policy version!", "success");
      loadDashboard();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleResolveCovenant(id) {
    try {
      await apiRequest(`/admin/covenants/${id}/resolve`, {
        method: "PATCH",
        demoRole,
      });
      notify("Covenant alert resolved.", "success");
      loadDashboard();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleReplayDlq(id) {
    try {
      await apiRequest(`/admin/dlq/${id}/replay`, { method: "POST", demoRole });
      notify("DLQ job replayed successfully.", "success");
      loadDashboard();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleExportAudit() {
    try {
      const csv = await apiRequest("/admin/audit-logs/export", { demoRole });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flowline_audit_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
      notify("Exported audit log CSV.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  }

  const cfData =
    selected?.cashFlow12m?.labels?.map((m, i) => ({
      month: m,
      Stripe: selected.cashFlow12m.stripe?.[i] || 0,
      QBO: selected.cashFlow12m.qbo?.[i] || 0,
      Plaid: selected.cashFlow12m.plaid?.[i] || 0,
    })) || [];

  // What-If Cash-Flow Stress Test calculations
  const baseMrr = selected?.verifiedMrr || 100000;
  const baseExpenses = baseMrr * 0.72;
  const startCash = baseMrr * 2.2;
  const monthlyEmi = Math.max(
    2500,
    ((selected?.recommendedLimit || 150000) / 12) * 1.07,
  );
  const stressedMrr = baseMrr * (1 + revShock / 100);
  const stressedExp = baseExpenses * (1 + expSpike / 100);
  const stressedNet = stressedMrr - stressedExp;
  const stressedDscr = Math.max(0, stressedNet / monthlyEmi);
  const runwayMonths =
    stressedNet >= monthlyEmi
      ? 18
      : Math.max(0.5, startCash / Math.max(1, monthlyEmi - stressedNet));
  const stressPass = stressedDscr >= 1.15 && runwayMonths >= 4;

  const stressChartData = ["M1", "M2", "M3", "M4", "M5", "M6"].map((m, idx) => {
    const step = idx + 1;
    const baseCash = Math.round(
      (startCash + (baseMrr - baseExpenses - monthlyEmi) * step) / 1000,
    );
    const stressedCash = Math.max(
      0,
      Math.round((startCash + (stressedNet - monthlyEmi) * step) / 1000),
    );
    return { month: m, Baseline: baseCash, Stressed: stressedCash };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            ["queue", "Underwriter Queue"],
            ["borrowers", "Borrowers & Lines"],
            ["policy", "Policy & Backtest"],
            ["portfolio", "Portfolio & Covenants"],
            ["integrations", "Integrations & DLQ"],
            ["audit", "Audit Logs"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === id ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">RBAC Role:</span>
          <select
            value={demoRole}
            onChange={(e) => setDemoRole(e.target.value)}
            className="px-2 py-1 rounded border border-slate-300 font-bold text-navy-900 bg-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tab === "queue" && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 divide-y self-start">
            {data.applications.map((a) => (
              <button
                key={a._id}
                onClick={() => handleSelectApp(a._id)}
                className={`w-full text-left p-4 ${selected._id === a._id ? "bg-teal-50 border-l-4 border-teal-600" : "hover:bg-slate-50"}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-navy-900">
                    {a.orgName}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-xs text-slate-600">
                  {a.segment} • MRR {fmtUSD(a.verifiedMrr)} • Tier {a.riskTier}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-extrabold text-navy-900">
                    {selected.orgName}
                  </h2>
                  <div className="text-xs text-slate-500">
                    {selected.appCode} • EIN {selected.ein} • PD{" "}
                    {(selected.pdScore * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">
                    Recommended Limit
                  </div>
                  <div className="text-xl font-extrabold text-teal-700">
                    {fmtUSD(selected.recommendedLimit)}
                  </div>
                </div>
              </div>
              <p className="text-xs bg-slate-50 p-3 rounded-lg border text-slate-700">
                {selected.notes}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.status === "PENDING_SECOND_APPROVAL" ? (
                  <button
                    onClick={() => handleDecision("COSIGN")}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                  >
                    Co-Sign Dual-Approval
                  </button>
                ) : (
                  <button
                    onClick={() => handleDecision("APPROVE")}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold"
                  >
                    Approve Offer
                  </button>
                )}
                <button
                  onClick={() => handleDecision("DECLINE")}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold"
                >
                  Decline
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 h-64">
                <div className="text-xs font-bold text-slate-500 mb-2">
                  12-Mo Cash-Flow Reconciliation ($k)
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={cfData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="Stripe"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="QBO"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Plaid"
                      stroke="#0F172A"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 h-64">
                <div className="text-xs font-bold text-slate-500 mb-2">
                  SHAP Risk Drivers (Green = Safer)
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={selected.shap || []} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      width={110}
                      tick={{ fontSize: 9 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value">
                      {(selected.shap || []).map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.value < 0 ? "#0D9488" : "#E11D48"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Credit Memo Copilot & What-If Cash-Flow Stress Test */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-navy-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      AI Credit Memo &amp; Copilot
                    </h3>
                    {memo && (
                      <button
                        onClick={handleCopyMemo}
                        className="text-[11px] font-semibold text-slate-500 hover:text-navy-900 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleGenerateMemo}
                    disabled={memoLoading}
                    className="w-full py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {memoLoading
                        ? "Analyzing Cash Flow..."
                        : "Generate Credit Memo"}
                    </span>
                  </button>

                  {memo ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="font-bold text-navy-900 mb-0.5">
                          Executive Verdict
                        </div>
                        <p className="text-slate-700">{memo.verdict}</p>
                      </div>
                      <div>
                        <div className="font-bold text-emerald-800 mb-0.5">
                          Key Strengths
                        </div>
                        <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                          {memo.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-bold text-rose-800 mb-0.5">
                          Risk Flags &amp; Covenants
                        </div>
                        <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                          {memo.riskFlags.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                          {memo.covenants.slice(0, 2).map((c, i) => (
                            <li key={`c${i}`} className="text-slate-500">
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Click Generate Credit Memo to draft an executive
                      underwriting summary for {selected.orgName}.
                    </p>
                  )}

                  {chatHistory.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto pt-2 border-t border-slate-100 text-xs">
                      {chatHistory.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="font-semibold text-navy-900">
                            Q: {item.q}
                          </div>
                          <div className="bg-teal-50 text-teal-950 p-2 rounded-lg">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleAskCopilot}
                  className="flex gap-1.5 pt-2 border-t border-slate-100"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask AI about limit, risk, or Stripe diff..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="font-bold text-sm text-navy-900">
                  What-If Cash-Flow Stress Test
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-slate-600">
                        Revenue Shock (Client Churn)
                      </span>
                      <span className="text-rose-700 font-bold">
                        {revShock}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="0"
                      step="5"
                      value={revShock}
                      onChange={(e) => setRevShock(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-slate-600">
                        Operating Expense Spike
                      </span>
                      <span className="text-amber-700 font-bold">
                        +{expSpike}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="5"
                      value={expSpike}
                      onChange={(e) => setExpSpike(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Stressed DSCR
                    </div>
                    <div className="text-sm font-extrabold text-navy-900">
                      {stressedDscr.toFixed(2)}x
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Runway
                    </div>
                    <div className="text-sm font-extrabold text-navy-900">
                      {runwayMonths >= 18
                        ? "18+ mo"
                        : `${runwayMonths.toFixed(1)} mo`}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl flex items-center justify-center font-extrabold text-xs text-white ${stressPass ? "bg-emerald-600" : "bg-rose-600"}`}
                  >
                    {stressPass ? "PASS" : "AT RISK"}
                  </div>
                </div>

                <div className="h-36">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">
                    6-Month Projected Cash ($k) — Baseline vs. Stressed
                  </div>
                  <ResponsiveContainer width="100%" height="88%">
                    <LineChart data={stressChartData}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="Baseline"
                        stroke="#0D9488"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Stressed"
                        stroke="#E11D48"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "borrowers" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="pb-2">Org</th>
                <th className="pb-2">Segment</th>
                <th className="pb-2">Drawn / Limit</th>
                <th className="pb-2">DPD</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.creditLines.map((cl) => (
                <tr key={cl._id}>
                  <td className="py-3 font-bold text-navy-900">{cl.orgName}</td>
                  <td className="py-3">{cl.segment}</td>
                  <td className="py-3 font-semibold">
                    {fmtUSD(cl.drawn)} / {fmtUSD(cl.limit)}
                  </td>
                  <td className="py-3 font-bold">{cl.dpd}d</td>
                  <td className="py-3">
                    <StatusBadge status={cl.status} />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleFreeze(cl._id)}
                      className="px-3 py-1 rounded bg-slate-100 hover:bg-rose-100 font-bold text-[11px]"
                    >
                      {cl.status === "FROZEN" ? "Unfreeze" : "Freeze Line"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "policy" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-navy-900">
              Credit Policy v{data.policy?.version || 4}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Min Revenue ($)
                <input
                  type="number"
                  value={policyForm.minMonthlyRevenue}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      minMonthlyRevenue: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </label>
              <label>
                Override Cap ($)
                <input
                  type="number"
                  value={policyForm.overrideThreshold}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      overrideThreshold: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </label>
              <label>
                Tier A Multiple
                <input
                  type="number"
                  step="0.1"
                  value={policyForm.tierAMultiple}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      tierAMultiple: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </label>
              <label>
                Max NSF (90d)
                <input
                  type="number"
                  value={policyForm.maxNsf90d}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      maxNsf90d: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBacktest}
                className="px-4 py-2 rounded-lg bg-navy-900 text-white font-bold"
              >
                Run Shadow Backtest
              </button>
              <button
                onClick={handlePublishPolicy}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-bold"
              >
                Publish Policy
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-sm text-navy-900 mb-3">
              Simulation Output
            </h3>
            {backtest ? (
              <div className="space-y-2 text-sm">
                <div>
                  Approval Rate: <strong>{backtest.approvalRate}%</strong> (
                  {backtest.approvalDelta}%)
                </div>
                <div>
                  Avg Limit: <strong>{fmtUSD(backtest.avgLimit)}</strong> (
                  {backtest.limitDeltaPct})
                </div>
                <div>
                  Projected 90d Loss Delta:{" "}
                  <strong>{backtest.lossBps} bps</strong>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Run a shadow backtest to preview impact on 500 historical
                applications.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h3 className="font-bold text-base text-navy-900">
            Automated Covenant Alerts
          </h3>
          {data.covenants.map((c) => (
            <div
              key={c._id}
              className="p-4 border rounded-xl flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">{c.orgName}</span>
                  <StatusBadge status={c.severity} />
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-xs text-slate-600 mt-1">{c.detail}</div>
              </div>
              {c.status !== "RESOLVED" && (
                <button
                  onClick={() => handleResolveCovenant(c._id)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold"
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "integrations" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h3 className="font-bold text-base text-navy-900">
            Dead-Letter Queue (DLQ) — Failed Sync Jobs
          </h3>
          {data.dlqJobs.map((j) => (
            <div
              key={j._id}
              className="p-4 border rounded-xl flex justify-between items-center text-xs"
            >
              <div>
                <div className="font-bold text-navy-900">
                  {j.jobCode} • {j.provider} ({j.orgName})
                </div>
                <div className="text-rose-700 font-mono">{j.error}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={j.status} />
                {j.status === "FAILED" && (
                  <button
                    onClick={() => handleReplayDlq(j._id)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold"
                  >
                    Replay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-navy-900">
              Immutable Compliance Audit Logs
            </h3>
            <button
              onClick={handleExportAudit}
              className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-bold"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Target</th>
                  <th className="pb-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.auditLogs.map((l) => (
                  <tr key={l._id}>
                    <td className="py-2 font-bold">{l.actor}</td>
                    <td className="py-2 font-mono">{l.role}</td>
                    <td className="py-2 font-mono text-teal-800 font-bold">
                      {l.action}
                    </td>
                    <td className="py-2 font-mono">{l.target}</td>
                    <td className="py-2 text-slate-600">{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
