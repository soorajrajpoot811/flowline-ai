import mongoose from 'mongoose';

const covenantAlertSchema = new mongoose.Schema(
  {
    alertCode: { type: String, required: true, unique: true },
    orgCode: String,
    orgName: String,
    type: { type: String, enum: ['MRR_DROP', 'CHURN_SPIKE', 'LOW_RUNWAY', 'OAUTH_EXPIRED', 'NSF_DETECTED'] },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    detail: String,
    status: { type: String, enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'], default: 'OPEN' }
  },
  { timestamps: true }
);

export default mongoose.model('CovenantAlert', covenantAlertSchema);
