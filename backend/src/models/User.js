import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    accountType: { type: String, enum: ['BORROWER', 'ADMIN'], default: 'BORROWER' },
    adminRole: {
      type: String,
      enum: ['SUPER_ADMIN', 'SR_UNDERWRITER', 'UNDERWRITER', 'RISK_OPS', 'COMPLIANCE', 'AUDITOR', null],
      default: null
    },
    orgName: { type: String, default: '' }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);
