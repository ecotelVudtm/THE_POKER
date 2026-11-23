import { Account } from '../types/game';

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
