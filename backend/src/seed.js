import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Application from './models/Application.js';
import CreditLine from './models/CreditLine.js';
import Policy from './models/Policy.js';
import CovenantAlert from './models/CovenantAlert.js';
import DlqJob from './models/DlqJob.js';
import AuditLog from './models/AuditLog.js';

export async function seedInitialData() {
  const existingPolicy = await Policy.findOne();
  if (existingPolicy) return;

  console.log('Seeding initial FlowLine AI sandbox data...');
  const hash = await bcrypt.hash('FlowLine123!', 10);

  const adminUser = await User.create({
    name: 'Sooraj Admin',
    email: 'admin@flowline.ai',
    passwordHash: hash,
    accountType: 'ADMIN',
    adminRole: 'SUPER_ADMIN',
    orgName: 'FlowLine AI Ops'
  });

  const borrowerUser = await User.create({
    name: 'Aarav Mehta',
    email: 'founder@cloudscale.io',
    passwordHash: hash,
    accountType: 'BORROWER',
    orgName: 'CloudScale Analytics Inc.'
  });

  await Policy.create({
    version: 4,
    status: 'ACTIVE',
    minMonthsOperating: 6,
    minMonthlyRevenue: 25000,
    maxNsf90d: 3,
    overrideThreshold: 250000,
    tierAMultiple: 2.8,
    tierBMultiple: 2.0,
    tierCMultiple: 1.2,
    createdBy: adminUser.name
  });

  const labels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  await Application.insertMany([
    {
      appCode: 'APP-8812',
      orgName: 'PulseGrid SaaS Corp',
      segment: 'SAAS',
      ein: '82-4419201',
      uboName: 'Elena Rostova (55%)',
      kybStatus: 'PASSED',
      connections: {
        stripe: { linked: true, skipped: false, records: 5120 },
        qbo: { linked: true, records: 1410 },
        plaid: { linked: true, records: 4100 }
      },
      verifiedMrr: 142000,
      requestedLimit: 320000,
      recommendedLimit: 310000,
      pdScore: 0.031,
      riskTier: 'A',
      aprPct: 12.5,
      reconciliationDiffPct: 3.2,
      status: 'MANUAL_REVIEW',
      slaHoursLeft: 4.5,
      cashFlow12m: {
        labels,
        stripe: [92, 96, 101, 108, 114, 118, 122, 128, 132, 136, 141, 146],
        qbo: [91, 95, 100, 107, 113, 117, 121, 127, 130, 135, 140, 145],
        plaid: [89, 93, 98, 105, 111, 115, 119, 124, 128, 132, 137, 142]
      },
      shap: [
        { feature: 'Verified Net MRR ($142k)', value: -0.42 },
        { feature: 'MoM MRR Growth (+4.1%)', value: -0.28 },
        { feature: 'Cash Runway (14.2 mo)', value: -0.21 },
        { feature: 'Requested > $250k Auto-Cap', value: 0.18 }
      ],
      notes: 'High-velocity B2B SaaS; routed to manual review because requested limit exceeds $250k auto-approve cap.'
    },
    {
      appCode: 'APP-8819',
      orgName: 'NorthStar Creative Agency LLC',
      segment: 'AGENCY',
      ein: '47-8821034',
      uboName: 'Marcus Vance (70%)',
      kybStatus: 'PASSED',
      connections: {
        stripe: { linked: false, skipped: true, records: 0 },
        qbo: { linked: true, records: 2180 },
        plaid: { linked: true, records: 3220 }
      },
      verifiedMrr: 78500,
      requestedLimit: 180000,
      recommendedLimit: 135000,
      pdScore: 0.068,
      riskTier: 'B',
      aprPct: 14.8,
      reconciliationDiffPct: 11.4,
      status: 'MANUAL_REVIEW',
      slaHoursLeft: 7.2,
      cashFlow12m: {
        labels,
        stripe: [12, 14, 10, 15, 12, 16, 14, 15, 18, 14, 16, 15],
        qbo: [75, 82, 79, 88, 84, 92, 86, 94, 91, 89, 95, 92],
        plaid: [68, 74, 71, 79, 75, 81, 77, 83, 80, 78, 82, 79]
      },
      shap: [
        { feature: 'Top-3 Client Conc (46%)', value: 0.34 },
        { feature: 'DSO Aging (54 days)', value: 0.22 },
        { feature: 'Retainer Renewal (89%)', value: -0.25 },
        { feature: 'Payroll Coverage (2.1x)', value: -0.19 }
      ],
      reasonCodes: ['RC-02: ELEVATED_CUSTOMER_CONC'],
      notes: 'Strong enterprise retainers in QBO; 11.4% diff due to Net-60 unpaid invoices excluded from verified cash flow.'
    },
    {
      appCode: 'APP-8825',
      orgName: 'VectorOps DevTools Inc.',
      segment: 'SAAS',
      ein: '91-3340912',
      uboName: 'Devon Lin (48%)',
      kybStatus: 'PASSED',
      connections: {
        stripe: { linked: true, skipped: false, records: 6400 },
        qbo: { linked: true, records: 1890 },
        plaid: { linked: true, records: 5100 }
      },
      verifiedMrr: 195000,
      requestedLimit: 400000,
      recommendedLimit: 380000,
      pdScore: 0.022,
      riskTier: 'A',
      aprPct: 12.5,
      reconciliationDiffPct: 1.8,
      status: 'PENDING_SECOND_APPROVAL',
      slaHoursLeft: 2.1,
      cashFlow12m: {
        labels,
        stripe: [130, 138, 145, 152, 158, 165, 171, 178, 184, 189, 194, 199],
        qbo: [129, 137, 144, 151, 157, 164, 170, 177, 183, 188, 193, 198],
        plaid: [127, 135, 142, 149, 155, 161, 168, 175, 180, 185, 191, 195]
      },
      shap: [
        { feature: 'Verified Net MRR ($195k)', value: -0.51 },
        { feature: 'Net Dollar Retention (118%)', value: -0.35 },
        { feature: 'Limit Override > $250k', value: 0.24 }
      ],
      makerUser: 'Priya Nair (Sr. Underwriter)',
      notes: 'Primary approval submitted for $380,000 (Tier A). Awaiting Super-Admin co-sign.'
    }
  ]);

  await CreditLine.insertMany([
    {
      lineCode: 'CL-4088',
      orgCode: 'ORG-105',
      userId: borrowerUser._id,
      orgName: 'CloudScale Analytics Inc.',
      segment: 'SAAS',
      limit: 240000,
      drawn: 65000,
      apr: 12.5,
      dpd: 0,
      status: 'ACTIVE',
      oauthHealth: 'HEALTHY',
      draws: [
        { drawCode: 'DRW-101', date: '2026-11-05', amount: 65000, fee: 975, purpose: 'Cloud & AI Infra Scaling', status: 'DISBURSED' }
      ],
      repayments: [
        { repaymentCode: 'REP-201', dueDate: '2026-12-15', principal: 10833, interest: 1017, status: 'SCHEDULED' },
        { repaymentCode: 'REP-202', dueDate: '2027-01-15', principal: 10833, interest: 890, status: 'SCHEDULED' }
      ]
    },
    { lineCode: 'CL-4012', orgCode: 'ORG-101', orgName: 'MetricFlow AI Inc.', segment: 'SAAS', limit: 300000, drawn: 210000, apr: 12.5, dpd: 0, status: 'ACTIVE', oauthHealth: 'HEALTHY' },
    { lineCode: 'CL-4024', orgCode: 'ORG-102', orgName: 'Craft & Pixel Studio', segment: 'AGENCY', limit: 150000, drawn: 112000, apr: 14.8, dpd: 0, status: 'ACTIVE', oauthHealth: 'HEALTHY' },
    { lineCode: 'CL-4039', orgCode: 'ORG-103', orgName: 'StackRelay Cloud', segment: 'SAAS', limit: 250000, drawn: 190000, apr: 13.2, dpd: 12, status: 'DELINQUENT', oauthHealth: 'HEALTHY' },
    { lineCode: 'CL-4051', orgCode: 'ORG-104', orgName: 'Apex Growth Partners', segment: 'AGENCY', limit: 120000, drawn: 45000, apr: 15.5, dpd: 0, status: 'FROZEN', oauthHealth: 'EXPIRED' }
  ]);

  await CovenantAlert.insertMany([
    { alertCode: 'COV-501', orgCode: 'ORG-103', orgName: 'StackRelay Cloud', type: 'NSF_DETECTED', severity: 'CRITICAL', detail: 'ACH Repayment R01 (Insufficient Funds) — 12 DPD', status: 'OPEN' },
    { alertCode: 'COV-502', orgCode: 'ORG-104', orgName: 'Apex Growth Partners', type: 'OAUTH_EXPIRED', severity: 'HIGH', detail: 'Plaid ITEM_LOGIN_REQUIRED > 72 hours (Auto-Frozen)', status: 'ACKNOWLEDGED' },
    { alertCode: 'COV-503', orgCode: 'ORG-102', orgName: 'Craft & Pixel Studio', type: 'MRR_DROP', severity: 'MEDIUM', detail: 'Verified retainer inflows declined 16.4% MoM', status: 'OPEN' }
  ]);

  await DlqJob.insertMany([
    { jobCode: 'JOB-7721', provider: 'QuickBooks Online', orgName: 'NorthStar Creative Agency', error: 'HTTP 429 Too Many Requests (Realm Throttle)', attempts: 5, status: 'FAILED' },
    { jobCode: 'JOB-7724', provider: 'Plaid', orgName: 'Apex Growth Partners', error: 'ITEM_LOGIN_REQUIRED (Bank MFA reset)', attempts: 3, status: 'FAILED' },
    { jobCode: 'JOB-7729', provider: 'Stripe', orgName: 'MetricFlow AI Inc.', error: 'Webhook timeout on invoice.paid sync', attempts: 5, status: 'FAILED' }
  ]);

  await AuditLog.insertMany([
    { actor: 'Priya Nair', role: 'SR_UNDERWRITER', action: 'PRIMARY_APPROVAL', target: 'APP-8825', detail: 'Approved $380,000 (Tier A) — routed for dual-approval.' },
    { actor: 'System Covenant Engine', role: 'SYSTEM', action: 'AUTO_FREEZE_LINE', target: 'ORG-104', detail: 'Froze credit line after Plaid token expired > 72h.' },
    { actor: 'Sooraj Admin', role: 'SUPER_ADMIN', action: 'POLICY_PUBLISHED', target: 'POLICY-v4', detail: 'Activated Credit Policy v4 (Min MRR $25k, Override Cap $250k).' }
  ]);
  console.log('Initial seed completed.');
}
