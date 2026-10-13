import { GoogleGenAI } from '@google/genai';

export interface VerifyScreenshotRequest {
  image: string; // base64 data URL
  expectedFee: number; // e.g. 25000, 35000, etc.
  formattedFee?: string; // e.g. "UGX 25,000"
}

export interface VerifyScreenshotResponse {
  valid: boolean;
  message?: string;
  detectedAmount?: string;
  reason?: string;
}

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

  // If Gemini API is available, analyze the screenshot
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `You are a strict automated mobile money transaction verification system.
A user has submitted a screenshot of their activation fee payment confirmation or SMS.
The EXACT REQUIRED activation fee amount that MUST be clearly visible in this screenshot is:
- Numerical: ${expectedFee}
- Formatted: "${expectedFormatted}" or "${expectedFee.toLocaleString()}" or "UGX ${expectedFee}"

Rules:
1. Look for payment amounts, transferred amounts, or transaction values in the screenshot.
2. If this payment confirmation screenshot visibly displays the payment or transfer of ${expectedFee} UGX (or ${expectedFee.toLocaleString()} UGX), set "matches" to true.
3. If the screenshot displays a DIFFERENT amount, or does NOT contain ${expectedFee} / ${expectedFee.toLocaleString()}, or is an irrelevant image (blank, selfie, random document, different payment), set "matches" to false.

Return JSON ONLY (no other text):
{
  "matches": true,
  "detectedAmount": "${expectedFee}",
  "reason": "Found matching amount of ${expectedFormatted}"
}
or
{
  "matches": false,
  "detectedAmount": "amount found or none",
  "reason": "Amount did not match required ${expectedFormatted}"
}`;

      const response = await ai.models.generateContent({
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
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJson);
        if (parsed.matches === true) {
          return {
            valid: true,
            detectedAmount: parsed.detectedAmount,
            reason: parsed.reason,
          };
        } else {
          return {
            valid: false,
            message: 'Please upload the correct screenshot of the payment',
            detectedAmount: parsed.detectedAmount,
            reason: parsed.reason || 'Activation fee amount does not match',
          };
        }
      } catch (e) {
        console.warn('[VerifyScreenshot] JSON parse error from model response:', responseText);
        // Fallback: check if model text affirmed the match
        if (
          responseText.toLowerCase().includes('"matches": true') ||
          responseText.toLowerCase().includes('"matches":true')
        ) {
          return { valid: true };
        }
      }
    } catch (err: any) {
      console.error('[VerifyScreenshot] Gemini verification error:', err);
    }
  }

  // Strict OCR Scanning via Tesseract
  try {
    const TesseractModule = await import('tesseract.js');
    const tesseract = TesseractModule.default || TesseractModule;
    const imgBuffer = Buffer.from(base64Data, 'base64');
    
    const ocrResult = await tesseract.recognize(imgBuffer, 'eng');
    const text = ocrResult?.data?.text || '';
    
    if (matchesFeeInText(text, expectedFee)) {
      return {
        valid: true,
        detectedAmount: String(expectedFee),
        reason: 'Activation fee amount verified in payment confirmation screenshot',
      };
    } else {
      console.warn('[VerifyScreenshot] OCR extracted text did not contain required fee:', {
        expectedFee,
        extractedTextSnippet: text.slice(0, 100).replace(/\n/g, ' '),
      });
      return {
        valid: false,
        message: 'Please upload the correct screenshot of the payment',
        reason: `Could not find required activation fee (${expectedFormatted}) in the uploaded image`,
      };
    }
  } catch (ocrErr) {
    console.error('[VerifyScreenshot] OCR processing error:', ocrErr);
  }

  // Strict default: If neither Gemini nor OCR verified the activation fee, REJECT!
  return {
    valid: false,
    message: 'Please upload the correct screenshot of the payment',
    reason: 'Activation fee amount was not found in the uploaded image',
  };
}

export function matchesFeeInText(extractedText: string, expectedFee: number): boolean {
  if (!extractedText || !expectedFee) return false;
  const lower = extractedText.toLowerCase().replace(/[\r\n\t]+/g, ' ');

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
