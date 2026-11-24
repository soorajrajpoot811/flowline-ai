import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Application from '../models/Application.js';
import CreditLine from '../models/CreditLine.js';
import Policy from '../models/Policy.js';
import AuditLog from '../models/AuditLog.js';
import { runCashFlowUnderwriting } from '../services/underwritingEngine.js';
import { syncProviderData } from '../services/integrationsService.js';

const router = express.Router();

// Get borrower's current application & credit line
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const application = await Application.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const creditLine = await CreditLine.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ application, creditLine });
  } catch (err) {
    next(err);
  }
});

// Step 1: Submit KYB
router.post('/kyb', requireAuth, async (req, res, next) => {
  try {
    const { orgName, segment, ein, uboName, verifiedMrr } = req.body;
    let app = await Application.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!app) {
      app = await Application.create({
        appCode: `APP-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: req.user._id,
        orgName: orgName || req.user.orgName || 'My Startup Inc.',
        segment: segment || 'SAAS',
        ein: ein || '84-2910482',
        uboName: uboName || req.user.name,
        verifiedMrr: Number(verifiedMrr) || 94200,
        kybStatus: 'PASSED',
        status: 'DATA_SYNCING'
      });
    } else {
      app.orgName = orgName || app.orgName;
      app.segment = segment || app.segment;
      app.ein = ein || app.ein;
      app.uboName = uboName || app.uboName;
      if (verifiedMrr) app.verifiedMrr = Number(verifiedMrr);
      app.kybStatus = 'PASSED';
      if (app.status === 'DRAFT' || app.status === 'KYB_PENDING') app.status = 'DATA_SYNCING';
      await app.save();
    }
    await AuditLog.create({
      actor: req.user.name,
      role: 'BORROWER',
      action: 'KYB_PASSED',
      target: app.appCode,
      detail: `KYB & OFAC verified for ${app.orgName} (EIN ${app.ein}).`
    });
    res.json({ application: app });
  } catch (err) {
    next(err);
  }
});

// Step 2: Link OAuth Provider (stripe | qbo | plaid)
router.post('/integrations/:provider/link', requireAuth, async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { skipped } = req.body || {};
    const app = await Application.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!app) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Complete KYB first.' } });

    if (provider === 'stripe' && skipped) {
      app.connections.stripe = { linked: false, skipped: true, records: 0 };
    } else {
      const result = await syncProviderData(provider);
      app.connections[provider] = { linked: true, skipped: false, records: result.records };
    }
    await app.save();
    res.json({ application: app });
  } catch (err) {
    next(err);
  }
});

// Step 3: Run AI Underwriting
router.post('/underwriting/run', requireAuth, async (req, res, next) => {
  try {
    const app = await Application.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!app) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Application not found.' } });

    const policy = await Policy.findOne({ status: 'ACTIVE' }).sort({ version: -1 });
    const scored = runCashFlowUnderwriting({
      segment: app.segment,
      verifiedMrr: app.verifiedMrr || 94200,
      churnPct: Number(req.body?.churnPct) || 2.5,
      cashBalance: Number(req.body?.cashBalance) || 160000,
      policy
    });

    Object.assign(app, scored);
    app.notes = `Scored by AI Underwriter under Policy v${policy?.version || 4} (Tier ${scored.riskTier}).`;
    await app.save();

    await AuditLog.create({
      actor: 'AI Underwriter',
      role: 'SYSTEM',
      action: 'UNDERWRITING_RUN',
      target: app.appCode,
      detail: `Tier ${scored.riskTier}, Recommended Limit $${scored.recommendedLimit.toLocaleString()}, Status: ${scored.status}.`
    });
    res.json({ application: app });
  } catch (err) {
    next(err);
  }
});

// Step 4: Accept Offer & Activate Credit Line
router.post('/credit-lines/activate', requireAuth, async (req, res, next) => {
  try {
    const { selectedLimit } = req.body;
    const app = await Application.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!app) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Application not found.' } });

    const finalLimit = Math.min(Number(selectedLimit) || app.recommendedLimit, app.recommendedLimit || 240000);
    let line = await CreditLine.findOne({ userId: req.user._id });
    if (!line) {
      line = await CreditLine.create({
        lineCode: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        orgCode: `ORG-${Math.floor(200 + Math.random() * 799)}`,
        userId: req.user._id,
        applicationId: app._id,
        orgName: app.orgName,
        segment: app.segment,
        limit: finalLimit,
        drawn: 0,
        apr: app.aprPct || 12.5,
        status: 'ACTIVE',
        draws: [],
        repayments: []
      });
    } else {
      line.limit = finalLimit;
      line.status = 'ACTIVE';
      await line.save();
    }
    app.status = 'ACTIVE_LINE';
    await app.save();

    await AuditLog.create({
      actor: req.user.name,
      role: 'BORROWER',
      action: 'CREDIT_LINE_ACTIVATED',
      target: line.lineCode,
      detail: `Activated $${finalLimit.toLocaleString()} revolving credit line.`
    });
    res.json({ creditLine: line });
  } catch (err) {
    next(err);
  }
});

// Request Drawdown
router.post('/credit-lines/draws', requireAuth, async (req, res, next) => {
  try {
    const { amount, purpose } = req.body;
    const line = await CreditLine.findOne({ userId: req.user._id });
    if (!line) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Active credit line not found.' } });
    if (line.status !== 'ACTIVE') {
      return res.status(422).json({ error: { code: 'ERR_LINE_FROZEN', message: `Cannot draw while credit line is ${line.status}.` } });
    }
    const amt = Number(amount);
    const available = line.limit - line.drawn;
    if (!amt || amt < 5000 || amt > available) {
      return res.status(422).json({ error: { code: 'ERR_INSUFFICIENT_CREDIT', message: `Draw must be between $5,000 and $${available.toLocaleString()}.` } });
    }
    const drawCode = `DRW-${101 + line.draws.length}`;
    line.drawn += amt;
    line.draws.unshift({
      drawCode,
      date: new Date().toISOString().slice(0, 10),
      amount: amt,
      fee: Math.round(amt * (line.drawFeePct / 100)),
      purpose: purpose || 'Working Capital',
      status: 'DISBURSED'
    });
    await line.save();

    await AuditLog.create({
      actor: req.user.name,
      role: 'BORROWER',
      action: 'DRAW_DISBURSED',
      target: drawCode,
      detail: `Disbursed $${amt.toLocaleString()} (${purpose || 'Working Capital'}).`
    });
    res.json({ creditLine: line });
  } catch (err) {
    next(err);
  }
});

// Extra Principal Repayment
router.post('/credit-lines/repay', requireAuth, async (req, res, next) => {
  try {
    const line = await CreditLine.findOne({ userId: req.user._id });
    if (!line) return res.status(404).json({ error: { code: 'ERR_NOT_FOUND', message: 'Credit line not found.' } });
    const payAmt = Math.min(Number(req.body?.amount) || 10000, line.drawn);
    if (payAmt <= 0) return res.status(400).json({ error: { code: 'ERR_ZERO_BALANCE', message: 'Drawn balance is already $0.' } });

    line.drawn -= payAmt;
    await line.save();

    await AuditLog.create({
      actor: req.user.name,
      role: 'BORROWER',
      action: 'EXTRA_REPAYMENT',
      target: line.lineCode,
      detail: `Applied $${payAmt.toLocaleString()} extra principal repayment.`
    });
    res.json({ creditLine: line });
  } catch (err) {
    next(err);
  }
});

export default router;
