import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    appCode: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orgName: { type: String, required: true },
    segment: { type: String, enum: ['SAAS', 'AGENCY'], default: 'SAAS' },
    ein: { type: String, required: true },
    uboName: { type: String, default: '' },
    kybStatus: { type: String, enum: ['PENDING', 'PASSED', 'FAILED', 'OVERRIDDEN'], default: 'PENDING' },
    connections: {
      stripe: { linked: { type: Boolean, default: false }, skipped: { type: Boolean, default: false }, records: { type: Number, default: 0 } },
      qbo: { linked: { type: Boolean, default: false }, records: { type: Number, default: 0 } },
      plaid: { linked: { type: Boolean, default: false }, records: { type: Number, default: 0 } }
    },
    verifiedMrr: { type: Number, default: 0 },
    requestedLimit: { type: Number, default: 150000 },
    recommendedLimit: { type: Number, default: 0 },
    pdScore: { type: Number, default: 0.04 },
    riskTier: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'B' },
    aprPct: { type: Number, default: 14.5 },
    drawFeePct: { type: Number, default: 1.5 },
    reconciliationDiffPct: { type: Number, default: 2.5 },
    status: {
      type: String,
      enum: ['DRAFT', 'KYB_PENDING', 'DATA_SYNCING', 'MANUAL_REVIEW', 'PENDING_SECOND_APPROVAL', 'OFFER_ISSUED', 'ACTIVE_LINE', 'DECLINED'],
      default: 'DRAFT'
    },
    slaHoursLeft: { type: Number, default: 24 },
    cashFlow12m: {
      labels: [String],
      stripe: [Number],
      qbo: [Number],
      plaid: [Number]
    },
    features: { type: mongoose.Schema.Types.Mixed, default: {} },
    shap: [{ feature: String, value: Number }],
    reasonCodes: [String],
    makerUser: { type: String, default: null },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Application', applicationSchema);
