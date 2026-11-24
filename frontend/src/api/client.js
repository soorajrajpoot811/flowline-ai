const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('flowline_token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('flowline_token', token);
  else localStorage.removeItem('flowline_token');
}

export async function apiRequest(path, { method = 'GET', body, demoRole } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (demoRole) headers['x-demo-role'] = demoRole;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.headers.get('content-type')?.includes('text/csv')) {
    if (!res.ok) throw new Error('CSV export failed');
    return res.text();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}
