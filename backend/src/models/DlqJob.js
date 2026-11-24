import mongoose from 'mongoose';

const dlqJobSchema = new mongoose.Schema(
  {
    jobCode: { type: String, required: true, unique: true },
    provider: { type: String, enum: ['Stripe', 'QuickBooks Online', 'Plaid'] },
    orgName: String,
    error: String,
    attempts: { type: Number, default: 3 },
    status: { type: String, enum: ['FAILED', 'REPLAYED'], default: 'FAILED' }
  },
  { timestamps: true }
);

export default mongoose.model('DlqJob', dlqJobSchema);
