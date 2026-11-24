import { Account, LoanPackage, SkillType, SkinId, WinEffectId } from '../types/game';

const API_BASE = import.meta.env.VITE_API_URL || '';
const AUTH_TOKEN_STORAGE_KEY = 'the_poker_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage quota issues
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function authHeaders(withJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (withJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function registerAccountApi(
  username: string,
  password: string,
  displayName?: string
): Promise<{ account: Account; token: string }> {
  const res = await fetch(`${API_BASE}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể đăng ký tài khoản.');
  }
  if (typeof data.token === 'string') {
    setAuthToken(data.token);
  }
  return { account: data.account as Account, token: data.token as string };
}

export async function loginAccountApi(
  username: string,
  password: string
): Promise<{ account: Account; token: string }> {
  const res = await fetch(`${API_BASE}/api/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Sai tên đăng nhập hoặc mật khẩu.');
  }
  if (typeof data.token === 'string') {
    setAuthToken(data.token);
  }
  return { account: data.account as Account, token: data.token as string };
}

export async function fetchAccountByIdApi(id: string): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}`, {
    headers: authHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không tìm thấy tài khoản.');
  }
  return data.account as Account;
}

export async function takeAccountLoanApi(
  id: string,
  packageType: LoanPackage
): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/take-loan`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ packageType }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể vay thêm chip.');
  }
  return data.account as Account;
}

export async function repayAccountLoanApi(id: string): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/repay-loan`, {
    method: 'POST',
    headers: authHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể trả khoản vay.');
  }
  return data.account as Account;
}

export async function buySkillApi(
  id: string,
  skillType: SkillType,
  quantity = 1
): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/shop/buy-skill`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ skillType, quantity }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể mua tuyệt kỹ.');
  }
  return data.account as Account;
}

export async function updateLoadoutApi(
  id: string,
  equippedSkills: SkillType[]
): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/loadout`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ equippedSkills }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể cập nhật bộ kỹ năng mang vào bàn.');
  }
  return data.account as Account;
}

export async function buySkinApi(id: string, skinId: SkinId): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/shop/buy-skin`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ skinId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể mua skin.');
  }
  return data.account as Account;
}

export async function equipSkinApi(id: string, skinId: SkinId): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/shop/equip-skin`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ skinId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể trang bị skin.');
  }
  return data.account as Account;
}

export async function buyWinEffectApi(id: string, effectId: WinEffectId): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/shop/buy-win-effect`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ effectId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể mua hiệu ứng thắng.');
  }
  return data.account as Account;
}

export async function equipWinEffectApi(id: string, effectId: WinEffectId): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/shop/equip-win-effect`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ effectId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể trang bị hiệu ứng thắng.');
  }
  return data.account as Account;
}
