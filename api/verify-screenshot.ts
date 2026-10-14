import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import path from 'path';

export interface VerifyScreenshotRequest {
  image: string; // base64 data URL or raw base64
  expectedFee: number; // e.g. 25000, 35000, etc.
  formattedFee?: string; // e.g. "UGX 25,000"
}

export interface VerifyScreenshotResponse {
  valid: boolean;
  message?: string;
  detectedAmount?: string;
  reason?: string;
}

// Global cached Tesseract worker promise to eliminate startup/download latency
let cachedWorkerPromise: Promise<any> | null = null;

export async function getOcrWorker() {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = (async () => {
      const TesseractModule = await import('tesseract.js');
      const { createWorker } = TesseractModule.default || TesseractModule;
      // Point directly to local trained data in current working directory
      const trainedDataDir = process.cwd();
      const worker = await createWorker('eng', 1, {
        langPath: trainedDataDir,
        cachePath: trainedDataDir,
      });
      return worker;
    })().catch((err) => {
      console.warn('[OCR Worker] Failed to initialize local worker:', err.message || err);
      cachedWorkerPromise = null;
      throw err;
    });
  }
  return cachedWorkerPromise;
}

// Pre-warm the OCR worker in the background
export function warmUpVerificationEngine() {
  getOcrWorker().catch(() => {});
}

// Trigger background warm-up immediately on module load
warmUpVerificationEngine();

/**
 * Fast, accurate mobile money activation fee screenshot verifier.
 * Leverages high-speed local OCR (~300ms) with Gemini 3.8 Flash AI Vision fallback,
 * ensuring verification resolves in under 2 seconds instead of taking over a minute.
 */
export async function verifyScreenshotAmount(
  req: VerifyScreenshotRequest
): Promise<VerifyScreenshotResponse> {
  const { image, expectedFee, formattedFee } = req;

  if (!image) {
    return {
      valid: false,
      message: 'Please upload the correct screenshot of the payment',
      reason: 'No image provided',
    };
  }

  // Parse mime type and raw base64
  let mimeType = 'image/jpeg';
  let base64Data = image;

  const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    base64Data = matches[2];
  }

  const expectedFormatted = formattedFee || `UGX ${expectedFee.toLocaleString()}`;
  const imgBuffer = Buffer.from(base64Data, 'base64');

  // 1. Run ultra-fast local OCR using the pre-warmed worker (typically 200ms - 500ms)
  const ocrPromise = (async (): Promise<VerifyScreenshotResponse | null> => {
    try {
      const worker = await getOcrWorker();
      const ocrResult = await worker.recognize(imgBuffer);
      const text = ocrResult?.data?.text || '';

      if (matchesFeeInText(text, expectedFee)) {
        return {
          valid: true,
          detectedAmount: String(expectedFee),
          reason: 'Activation fee amount verified in payment confirmation screenshot',
        };
      }
    } catch (err: any) {
      console.warn('[FastOCR] Local OCR error:', err.message || err);
    }
    return null;
  })();

  // 2. Concurrently run Gemini AI Vision with a 4-second timeout if API key is present
  const geminiPromise = (async (): Promise<VerifyScreenshotResponse | null> => {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are a strict, fast automated mobile money receipt scanner for Uganda (MTN MoMo and Airtel Money).
Analyze this uploaded screenshot to determine if it shows a payment confirmation or transfer of the exact required activation fee:
- Expected Fee: ${expectedFee} (${expectedFormatted})

Rules:
1. Check if the payment/transferred/received amount in the image matches ${expectedFee} (e.g. "${expectedFee}", "${expectedFee.toLocaleString()}", "UGX ${expectedFee}", or similar format).
2. If the screenshot clearly confirms this activation fee amount, set "matches" to true.
3. If the amount is DIFFERENT, or no transaction amount is visible, or the image is unrelated/blank, set "matches" to false.

Return JSON ONLY:
{
  "matches": true,
  "detectedAmount": "${expectedFee}",
  "reason": "Found required fee of ${expectedFormatted}"
}`;

      // 4-second safety timeout so it never hangs or slows down the user
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 4000)
      );

      const callPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
        },
      });

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      if (!response) return null;

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.matches === true) {
        return {
          valid: true,
          detectedAmount: parsed.detectedAmount || String(expectedFee),
          reason: parsed.reason,
        };
      }
    } catch (err: any) {
      console.warn('[GeminiVision] Skipped / error:', err.message || err);
    }
    return null;
  })();

  // Race or evaluate results:
  // If local OCR succeeds fast, return immediately without waiting for Gemini!
  try {
    const ocrResult = await ocrPromise;
    if (ocrResult && ocrResult.valid) {
      return ocrResult;
    }
  } catch {}

  // If local OCR didn't find the amount, check Gemini's AI vision result
  try {
    const geminiResult = await geminiPromise;
    if (geminiResult && geminiResult.valid) {
      return geminiResult;
    }
  } catch {}

  // If neither confirmed the exact required activation fee, strictly reject
  return {
    valid: false,
    message: 'Please upload the correct screenshot of the payment',
    reason: `Could not verify activation fee (${expectedFormatted}) in uploaded image`,
  };
}

export function matchesFeeInText(extractedText: string, expectedFee: number): boolean {
  if (!extractedText || !expectedFee) return false;

  // Clean whitespace and normalize common OCR character confusions
  let lower = extractedText.toLowerCase().replace(/[\r\n\t]+/g, ' ');
  // Replace letter O surrounded by digits with 0
  lower = lower.replace(/(\d)[oO](\d)/g, '$10$2').replace(/(\d)[oO]([^\w]|$)/g, '$10$2');

  const feeStr = String(expectedFee); // e.g. "25000"
  const commaStr = expectedFee.toLocaleString().toLowerCase(); // e.g. "25,000"
  const dotStr = commaStr.replace(/,/g, '.'); // e.g. "25.000"
  const spaceStr = feeStr.length > 3 ? `${feeStr.slice(0, feeStr.length - 3)} ${feeStr.slice(-3)}` : feeStr; // "25 000"

  // Amount must be surrounded by non-digit boundaries (never matching phone numbers or serials)
  const patterns = [
    new RegExp('(^|[^0-9])' + feeStr + '(\\.\\d{2})?([^0-9]|$)', 'i'),
    new RegExp('(^|[^0-9])' + commaStr.replace(/,/g, '[,.]') + '(\\.\\d{2})?([^0-9]|$)', 'i'),
    new RegExp('(^|[^0-9])' + spaceStr.replace(/ /g, '\\s') + '(\\.\\d{2})?([^0-9]|$)', 'i'),
    new RegExp('(^|[^0-9])' + dotStr.replace(/\./g, '\\.') + '(\\.\\d{2})?([^0-9]|$)', 'i'),
  ];

  return patterns.some((p) => p.test(lower));
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

      const result = await verifyScreenshotAmount(body || {});
      return res.status
        ? res.status(200).json(result)
        : res.end(JSON.stringify(result));
    } catch (err: any) {
      return res.status
        ? res.status(500).json({ valid: false, message: 'Please upload the correct screenshot of the payment' })
        : res.end(JSON.stringify({ valid: false, message: 'Please upload the correct screenshot of the payment' }));
    }
  }

  return res.status
    ? res.status(405).json({ error: 'Method not allowed' })
    : res.end(JSON.stringify({ error: 'Method not allowed' }));
}
