import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    detail: { type: String, required: true },
    ipAddress: { type: String, default: '0.0.0.0' }
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditLogSchema);
