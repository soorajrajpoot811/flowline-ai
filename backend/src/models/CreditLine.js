import mongoose from 'mongoose';

const drawSchema = new mongoose.Schema({
  drawCode: String,
  date: String,
  amount: Number,
  fee: Number,
  purpose: String,
  bank: { type: String, default: 'Operating Checking •••• 4821' },
  status: { type: String, enum: ['PENDING', 'DISBURSED', 'FAILED'], default: 'DISBURSED' }
});

const repaymentSchema = new mongoose.Schema({
  repaymentCode: String,
  dueDate: String,
  principal: Number,
  interest: Number,
  status: { type: String, enum: ['SCHEDULED', 'PROCESSING', 'SETTLED', 'RETURNED'], default: 'SCHEDULED' },
  achReturnCode: { type: String, default: null }
});

const creditLineSchema = new mongoose.Schema(
  {
    lineCode: { type: String, required: true, unique: true },
    orgCode: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    orgName: { type: String, required: true },
    segment: { type: String, enum: ['SAAS', 'AGENCY'], default: 'SAAS' },
    limit: { type: Number, required: true },
    drawn: { type: Number, default: 0 },
    apr: { type: Number, default: 12.5 },
    drawFeePct: { type: Number, default: 1.5 },
    dpd: { type: Number, default: 0 },
    oauthHealth: { type: String, enum: ['HEALTHY', 'EXPIRED'], default: 'HEALTHY' },
    status: { type: String, enum: ['ACTIVE', 'FROZEN', 'DELINQUENT', 'DEFAULTED', 'CLOSED'], default: 'ACTIVE' },
    nextPaymentDate: { type: String, default: '2026-12-15' },
    draws: [drawSchema],
    repayments: [repaymentSchema]
  },
  { timestamps: true }
);

export default mongoose.model('CreditLine', creditLineSchema);
