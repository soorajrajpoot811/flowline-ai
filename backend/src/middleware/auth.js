import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const RBAC_PERMISSIONS = {
  SUPER_ADMIN:    { approve: true,  cosign: true,  policy: true,  freeze: true,  dlq: true,  exportAudit: true },
  SR_UNDERWRITER: { approve: true,  cosign: true,  policy: false, freeze: true,  dlq: false, exportAudit: false },
  UNDERWRITER:    { approve: true,  cosign: false, policy: false, freeze: false, dlq: false, exportAudit: false },
  RISK_OPS:       { approve: false, cosign: false, policy: true,  freeze: true,  dlq: true,  exportAudit: true },
  COMPLIANCE:     { approve: false, cosign: false, policy: false, freeze: true,  dlq: false, exportAudit: true },
  AUDITOR:        { approve: false, cosign: false, policy: false, freeze: false, dlq: false, exportAudit: true }
};

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: { code: 'ERR_UNAUTHENTICATED', message: 'Missing bearer token.' } });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_fallback_secret');
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: { code: 'ERR_UNAUTHENTICATED', message: 'Invalid session.' } });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'ERR_UNAUTHENTICATED', message: 'Expired or invalid token.' } });
  }
}

export function requireAdminPermission(permKey = null) {
  return (req, res, next) => {
    if (!req.user || req.user.accountType !== 'ADMIN') {
      return res.status(403).json({ error: { code: 'ERR_RBAC_FORBIDDEN', message: 'Admin access required.' } });
    }
    // Allow header role override in sandbox/demo for testing RBAC matrix as Super-Admin
    const effectiveRole =
      req.user.adminRole === 'SUPER_ADMIN' && req.headers['x-demo-role'] && RBAC_PERMISSIONS[req.headers['x-demo-role']]
        ? req.headers['x-demo-role']
        : req.user.adminRole;
    req.effectiveRole = effectiveRole;
    if (permKey && !RBAC_PERMISSIONS[effectiveRole]?.[permKey]) {
      return res.status(403).json({
        error: {
          code: 'ERR_RBAC_FORBIDDEN',
          message: `Role ${effectiveRole} lacks '${permKey}' permission.`
        }
      });
    }
    next();
  };
}
