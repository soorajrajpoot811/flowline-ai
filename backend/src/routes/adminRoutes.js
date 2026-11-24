import express from 'express';
import { requireAuth, requireAdminPermission } from '../middleware/auth.js';
import Application from '../models/Application.js';
import CreditLine from '../models/CreditLine.js';
import Policy from '../models/Policy.js';
import CovenantAlert from '../models/CovenantAlert.js';
import DlqJob from '../models/DlqJob.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Overview bundle for Admin Panel
router.get('/dashboard', requireAuth, requireAdminPermission(), async (req, res, next) => {
  try {
    const [applications, creditLines, policy, covenants, dlqJobs, auditLogs] = await Promise.all([
      Application.find().sort({ createdAt: -1 }),
      CreditLine.find().sort({ createdAt: -1 }),
      Policy.findOne({ status: 'ACTIVE' }).sort({ version: -1 }),
      CovenantAlert.find().sort({ createdAt: -1 }),
      DlqJob.find().sort({ createdAt: -1 }),
      AuditLog.find().sort({ createdAt: -1 }).limit(100)
    ]);
    res.json({ applications, creditLines, policy, covenants, dlqJobs, auditLogs });
  } catch (err) {
    next(err);
  }
});
// NEW: Generate AI Credit Committee Memo
router.post('/applications/:id/ai-memo', requireAuth, requireAdminPermission(), async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Application not found.' } });

    const strengths = (app.shap || []).filter((s) => s.value < 0).map((s) => s.feature);
    const risks = (app.shap || []).filter((s) => s.value >= 0).map((s) => s.feature);

    const memo = {
      generatedAt: new Date().toISOString(),
      verdict:
        app.riskTier === 'D'
          ? `Recommend DECLINE for ${app.orgName} (12-mo PD ${(app.pdScore * 100).toFixed(1)}% exceeds policy ceiling).`
          : `Recommend ${app.status === 'PENDING_SECOND_APPROVAL' ? 'DUAL-APPROVAL CO-SIGN' : 'APPROVAL'} of $${(app.recommendedLimit || 0).toLocaleString()} revolving line (Tier ${app.riskTier}, ${app.aprPct || 12.5}% APR) backed by $${(app.verifiedMrr || 0).toLocaleString()}/mo verified cash flow.`,
      strengths: strengths.length
        ? strengths
        : [`Verified recurring cash inflow of $${(app.verifiedMrr || 0).toLocaleString()}/mo`, `KYB & OFAC status: ${app.kybStatus}`],
      riskFlags: risks.length
        ? risks
        : [`Cross-source reconciliation variance: ${app.reconciliationDiffPct || 0}%`],
      covenants: [
        `Auto-freeze draws if verified monthly cash inflows drop > 20% MoM`,
        app.segment === 'AGENCY'
          ? `Monitor QuickBooks AR aging; alert Risk Ops if DSO exceeds 60 days`
          : `Monitor Stripe churn webhook; alert if monthly dollar churn exceeds 5%`,
        `Require continuous read-only Plaid & accounting OAuth connectivity (< 72h grace)`
      ]
    };

    res.json({ memo });
  } catch (err) {
    next(err);
  }
});

// NEW: Interactive AI Underwriter Copilot Q&A
router.post('/applications/:id/ai-chat', requireAuth, requireAdminPermission(), async (req, res, next) => {
  try {
    const { question } = req.body || {};
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Application not found.' } });

    const q = (question || '').toLowerCase();
    let answer = '';

    if (q.includes('limit') || q.includes('amount') || q.includes('how much')) {
      answer = `${app.orgName} is sized at $${(app.recommendedLimit || 0).toLocaleString()} based on $${(app.verifiedMrr || 0).toLocaleString()}/mo verified recurring cash flow, Risk Tier ${app.riskTier}, and our active multi-constraint capacity cap.`;
    } else if (q.includes('risk') || q.includes('flag') || q.includes('safe') || q.includes('pd')) {
      const topRisks = (app.shap || []).filter((s) => s.value >= 0).map((s) => s.feature).join(', ') || 'No major negative SHAP drivers';
      answer = `12-month Probability of Default is ${(app.pdScore * 100).toFixed(1)}% (Tier ${app.riskTier}). Primary risk factors: ${topRisks}.`;
    } else if (q.includes('reconcil') || q.includes('stripe') || q.includes('plaid') || q.includes('diff')) {
      answer = `Cross-source reconciliation variance between billing/accounting and settled Plaid bank deposits is ${app.reconciliationDiffPct || 0}%. ${app.reconciliationDiffPct > 10 ? 'This is elevated (>10%), typically due to unpaid B2B invoices.' : 'This is within healthy tolerance (<10%).'}`;
    } else {
      answer = `${app.orgName} (${app.segment}) has $${(app.verifiedMrr || 0).toLocaleString()}/mo verified cash flow, Tier ${app.riskTier} risk rating (${(app.pdScore * 100).toFixed(1)}% PD), and a recommended limit of $${(app.recommendedLimit || 0).toLocaleString()}. Note: ${app.notes || 'All baseline KYB checks passed.'}`;
    }

    res.json({ answer });
  } catch (err) {
    next(err);
  }
});

// Underwriter Decision (Approve, Counter-Offer, Co-Sign, Decline)
router.post('/applications/:id/decision', requireAuth, requireAdminPermission('approve'), async (req, res, next) => {
  try {
    const { decision, approvedLimit, riskTier, rationale } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Application not found.' } });

    const policy = await Policy.findOne({ status: 'ACTIVE' }).sort({ version: -1 });
    const cap = policy?.overrideThreshold || 250000;

    if (decision === 'COSIGN') {
      if (!['SUPER_ADMIN', 'SR_UNDERWRITER'].includes(req.effectiveRole)) {
        return res.status(403).json({ error: { code: 'ERR_RBAC_FORBIDDEN', message: 'Dual-approval co-sign requires Senior Underwriter or Super-Admin.' } });
      }
      app.status = 'OFFER_ISSUED';
      app.slaHoursLeft = 0;
      await app.save();
      await AuditLog.create({
        actor: req.user.name,
        role: req.effectiveRole,
        action: 'DUAL_APPROVAL_COSIGNED',
        target: app.appCode,
        detail: `Co-signed $${app.recommendedLimit.toLocaleString()} offer.`
      });
      return res.json({ application: app });
    }

    if (decision === 'DECLINE') {
      app.status = 'DECLINED';
      app.slaHoursLeft = 0;
      if (rationale) app.notes = rationale;
      await app.save();
      await AuditLog.create({
        actor: req.user.name,
        role: req.effectiveRole,
        action: 'APPLICATION_DECLINED',
        target: app.appCode,
        detail: `Declined ${app.orgName}. ${rationale || 'Adverse Action Notice archived.'}`
      });
      return res.json({ application: app });
    }

    // APPROVE or COUNTER_OFFER
    const newLimit = Number(approvedLimit) || app.recommendedLimit;
    app.recommendedLimit = newLimit;
    if (riskTier) app.riskTier = riskTier;
    if (rationale) app.notes = rationale;

    if (newLimit > cap && req.effectiveRole === 'UNDERWRITER') {
      app.status = 'PENDING_SECOND_APPROVAL';
      app.makerUser = `${req.user.name} (${req.effectiveRole})`;
    } else {
      app.status = 'OFFER_ISSUED';
      app.slaHoursLeft = 0;
    }
    await app.save();

    await AuditLog.create({
      actor: req.user.name,
      role: req.effectiveRole,
      action: app.status === 'PENDING_SECOND_APPROVAL' ? 'PRIMARY_APPROVAL' : 'OFFER_APPROVED',
      target: app.appCode,
      detail: `Set limit $${newLimit.toLocaleString()} (Tier ${app.riskTier}). Status: ${app.status}.`
    });
    res.json({ application: app });
  } catch (err) {
    next(err);
  }
});

// Freeze / Unfreeze Credit Line
router.post('/credit-lines/:id/toggle-freeze', requireAuth, requireAdminPermission('freeze'), async (req, res, next) => {
  try {
    const line = await CreditLine.findById(req.params.id);
    if (!line) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Credit line not found.' } });
    const prev = line.status;
    line.status = line.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    await line.save();

    await AuditLog.create({
      actor: req.user.name,
      role: req.effectiveRole,
      action: line.status === 'FROZEN' ? 'LINE_FROZEN' : 'LINE_UNFROZEN',
      target: line.orgCode,
      detail: `Changed ${line.orgName} from ${prev} to ${line.status}.`
    });
    res.json({ creditLine: line });
  } catch (err) {
    next(err);
  }
});

// Shadow Backtest Simulation
router.post('/policies/simulate', requireAuth, requireAdminPermission(), (req, res) => {
  const minRev = Number(req.body?.minMonthlyRevenue) || 25000;
  const tierA = Number(req.body?.tierAMultiple) || 2.8;
  const revDelta = Math.round(((25000 - minRev) / 5000) * 2.1 * 10) / 10;
  const multDeltaPct = Math.round(((tierA - 2.8) / 2.8) * 100);
  res.json({
    sampleSize: 500,
    approvalRate: Math.max(35, Math.min(88, 64.2 + revDelta)).toFixed(1),
    approvalDelta: revDelta,
    avgLimit: Math.round(185000 * (tierA / 2.8)),
    limitDeltaPct: `${multDeltaPct >= 0 ? '+' : ''}${multDeltaPct}%`,
    lossBps: Math.round(revDelta * 4 + multDeltaPct * 0.8)
  });
});

// Publish New Policy Version
router.post('/policies', requireAuth, requireAdminPermission('policy'), async (req, res, next) => {
  try {
    const current = await Policy.findOne({ status: 'ACTIVE' }).sort({ version: -1 });
    const nextVersion = (current?.version || 0) + 1;
    if (current) {
      current.status = 'ARCHIVED';
      await current.save();
    }
    const created = await Policy.create({
      version: nextVersion,
      status: 'ACTIVE',
      minMonthsOperating: Number(req.body.minMonthsOperating) || 6,
      minMonthlyRevenue: Number(req.body.minMonthlyRevenue) || 25000,
      maxNsf90d: Number(req.body.maxNsf90d) || 3,
      overrideThreshold: Number(req.body.overrideThreshold) || 250000,
      tierAMultiple: Number(req.body.tierAMultiple) || 2.8,
      tierBMultiple: Number(req.body.tierBMultiple) || 2.0,
      tierCMultiple: Number(req.body.tierCMultiple) || 1.2,
      createdBy: req.user.name
    });
    await AuditLog.create({
      actor: req.user.name,
      role: req.effectiveRole,
      action: 'POLICY_PUBLISHED',
      target: `POLICY-v${nextVersion}`,
      detail: `Published Policy v${nextVersion} (Min MRR $${created.minMonthlyRevenue.toLocaleString()}, Override Cap $${created.overrideThreshold.toLocaleString()}).`
    });
    res.status(201).json({ policy: created });
  } catch (err) {
    next(err);
  }
});

// Resolve Covenant Alert
router.patch('/covenants/:id/resolve', requireAuth, requireAdminPermission('freeze'), async (req, res, next) => {
  try {
    const cov = await CovenantAlert.findByIdAndUpdate(req.params.id, { status: 'RESOLVED' }, { new: true });
    if (!cov) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Alert not found.' } });
    await AuditLog.create({
      actor: req.user.name,
      role: req.effectiveRole,
      action: 'COVENANT_RESOLVED',
      target: cov.alertCode,
      detail: `Resolved ${cov.type} alert for ${cov.orgName}.`
    });
    res.json({ covenant: cov });
  } catch (err) {
    next(err);
  }
});

// Replay DLQ Job
router.post('/dlq/:id/replay', requireAuth, requireAdminPermission('dlq'), async (req, res, next) => {
  try {
    const job = await DlqJob.findByIdAndUpdate(req.params.id, { status: 'REPLAYED' }, { new: true });
    if (!job) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'DLQ job not found.' } });
    await AuditLog.create({
      actor: req.user.name,
      role: req.effectiveRole,
      action: 'DLQ_JOB_REPLAYED',
      target: job.jobCode,
      detail: `Replayed ${job.provider} sync job for ${job.orgName}.`
    });
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// Export Audit Logs CSV
router.get('/audit-logs/export', requireAuth, requireAdminPermission('exportAudit'), async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500);
    const header = 'timestamp,actor,role,action,target,detail';
    const rows = logs.map(l => `"${l.createdAt.toISOString()}","${l.actor}","${l.role}","${l.action}","${l.target}","${(l.detail || '').replace(/"/g, '""')}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flowline_audit_logs.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

export default router;
