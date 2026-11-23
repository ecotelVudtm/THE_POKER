import { Account, SkillType, SkinId, WinEffectId } from '../types/game';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function registerAccountApi(
  username: string,
  password: string,
  displayName?: string
): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể đăng ký tài khoản.');
  }
  return data.account as Account;
}

export async function loginAccountApi(
  username: string,
  password: string
): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Sai tên đăng nhập hoặc mật khẩu.');
  }
  return data.account as Account;
}

export async function fetchAccountByIdApi(id: string): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không tìm thấy tài khoản.');
  }
  return data.account as Account;
}

export async function repayAccountLoanApi(id: string): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/repay-loan`, {
    method: 'POST',
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ effectId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể trang bị hiệu ứng thắng.');
  }
  return data.account as Account;
}
