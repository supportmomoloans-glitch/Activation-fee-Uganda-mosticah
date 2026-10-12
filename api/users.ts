import fs from 'fs';
import path from 'path';

export interface RegisteredAccount {
  phone: string;
  country: string;
  countryCode: string;
  pin?: string;
  registeredAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __momo_registered_users: RegisteredAccount[] | undefined;
}

function cleanDigits(s?: string): string {
  return String(s || '').replace(/\D/g, '');
}

export function loadUsersFromDisk(): RegisteredAccount[] {
  if (globalThis.__momo_registered_users && Array.isArray(globalThis.__momo_registered_users)) {
    return globalThis.__momo_registered_users;
  }

  const possiblePaths = [
    path.join(process.cwd(), 'users.json'),
    path.join('/tmp', 'users.json'),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          globalThis.__momo_registered_users = parsed;
          return parsed;
        }
      }
    } catch {
      // try next path
    }
  }

  globalThis.__momo_registered_users = [];
  return [];
}

export function saveUserToDisk(newUser: RegisteredAccount): RegisteredAccount[] {
  const users = loadUsersFromDisk();
  const cleanPhone = cleanDigits(newUser.phone);
  
  // Update if exists, otherwise append
  const existingIdx = users.findIndex(
    (u) => cleanDigits(u.phone) === cleanPhone && (!newUser.countryCode || u.countryCode === newUser.countryCode)
  );

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...newUser };
  } else {
    users.push(newUser);
  }

  globalThis.__momo_registered_users = users;

  const targets = [
    path.join(process.cwd(), 'users.json'),
    path.join('/tmp', 'users.json'),
  ];

  for (const t of targets) {
    try {
      fs.writeFileSync(t, JSON.stringify(users, null, 2), 'utf-8');
    } catch {
      // fallback in read-only environments
    }
  }

  return users;
}

export function findRegisteredUser(phone: string, countryCode?: string): RegisteredAccount | null {
  const users = loadUsersFromDisk();
  const targetClean = cleanDigits(phone);
  if (!targetClean) return null;

  const found = users.find((u) => {
    const uClean = cleanDigits(u.phone);
    if (uClean === targetClean) return true;
    // Check if phone was saved with leading zero or without leading zero
    if (uClean.endsWith(targetClean) || targetClean.endsWith(uClean)) {
      return Math.abs(uClean.length - targetClean.length) <= 1;
    }
    return false;
  });

  return found || null;
}

// Serverless handler for Vercel
export default async function handler(req: any, res: any) {
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.status ? res.status(200).end() : res.end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const action = req.query?.action || body.action;

  if (action === 'register' || req.method === 'POST' && body.phone && body.isRegister) {
    const saved = saveUserToDisk({
      phone: body.phone,
      country: body.country || 'Uganda',
      countryCode: body.countryCode || '+256',
      pin: body.pin,
      registeredAt: new Date().toISOString(),
    });
    return res.status ? res.status(200).json({ ok: true, count: saved.length }) : res.end(JSON.stringify({ ok: true }));
  }

  // Check user existence
  if (action === 'check' || (body.phone && !body.isRegister)) {
    const user = findRegisteredUser(body.phone || req.query?.phone, body.countryCode || req.query?.countryCode);
    return res.status ? res.status(200).json({
      ok: true,
      exists: Boolean(user),
      user: user ? { phone: user.phone, country: user.country, countryCode: user.countryCode } : null,
    }) : res.end(JSON.stringify({
      ok: true,
      exists: Boolean(user),
      user: user ? { phone: user.phone, country: user.country, countryCode: user.countryCode } : null,
    }));
  }

  const users = loadUsersFromDisk().map((u) => ({
    phone: u.phone,
    country: u.country,
    countryCode: u.countryCode,
    registeredAt: u.registeredAt,
  }));
  return res.status ? res.status(200).json({ ok: true, users }) : res.end(JSON.stringify({ ok: true, users }));
}
