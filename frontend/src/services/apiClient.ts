import { Account } from '../types/game';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function authenticateAccountApi(
  username: string,
  displayName?: string
): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/accounts/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, displayName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể đăng nhập tài khoản.');
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
