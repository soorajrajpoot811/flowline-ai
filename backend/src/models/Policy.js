import mongoose from 'mongoose';

const policySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, unique: true },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    minMonthsOperating: { type: Number, default: 6 },
    minMonthlyRevenue: { type: Number, default: 25000 },
    maxNsf90d: { type: Number, default: 3 },
    overrideThreshold: { type: Number, default: 250000 },
    tierAMultiple: { type: Number, default: 2.8 },
    tierBMultiple: { type: Number, default: 2.0 },
    tierCMultiple: { type: Number, default: 1.2 },
    createdBy: { type: String, default: 'System' }
  },
  { timestamps: true }
);

export default mongoose.model('Policy', policySchema);
