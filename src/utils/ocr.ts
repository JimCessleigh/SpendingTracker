import { File } from 'expo-file-system/next';
import { AIProvider } from './ai';

export interface OcrResult {
  amount: number | null;
  date: string | null;     // YYYY-MM-DD
  merchant: string | null;
  category: string | null;
}

export const OCR_PROMPT =
  'Analyze this receipt image. Extract: ' +
  '1) total amount paid (number only, no currency symbol), ' +
  '2) date of purchase (YYYY-MM-DD format), ' +
  '3) merchant or store name, ' +
  '4) best matching expense category from this list: ' +
  '[Food & Dining, Transport, Shopping, Entertainment, Health, Housing, Utilities, Education, Travel, Other]. ' +
  'Respond with ONLY valid JSON and no markdown fences: ' +
  '{"amount":12.50,"date":"2026-03-05","merchant":"Starbucks","category":"Food & Dining"}. ' +
  'Use null for any field you cannot determine.';

export async function imageUriToBase64(uri: string): Promise<string> {
  const bytes = await new File(uri).bytes();
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  return btoa(binary);
}

export async function callVisionAPI(
  provider: AIProvider,
  apiKey: string,
  base64: string,
  prompt: string
): Promise<string> {
  switch (provider) {
    case 'chatgpt': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
              { type: 'text', text: prompt },
            ],
          }],
          max_tokens: 256,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
      return data.choices[0].message.content;
    }

    case 'claude': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Claude error ${res.status}`);
      return data.content[0].text;
    }

    case 'gemini': {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: base64 } },
              { text: prompt },
            ],
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Gemini error ${res.status}`);
      return data.candidates[0].content.parts[0].text;
    }

    case 'deepseek':
      throw new Error('DeepSeek does not support image scanning. Switch to ChatGPT, Gemini, or Claude in Settings.');

    default:
      throw new Error('Unknown AI provider');
  }
}

export function parseOcrResponse(rawText: string): OcrResult | null {
  try {
    // Strip optional markdown code fences
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate date: regex match + actual calendar validity
    let validDate: string | null = null;
    if (typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      const d = new Date(parsed.date + 'T12:00:00');
      if (!isNaN(d.getTime()) && d.toISOString().startsWith(parsed.date)) {
        validDate = parsed.date;
      }
    }

    return {
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      date: validDate,
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      category: typeof parsed.category === 'string' ? parsed.category : null,
    };
  } catch {
    return null;
  }
}

export async function scanReceiptWithOcr(
  provider: AIProvider,
  apiKey: string,
  photoUri: string
): Promise<OcrResult> {
  const base64 = await imageUriToBase64(photoUri);
  const rawText = await callVisionAPI(provider, apiKey, base64, OCR_PROMPT);
  const result = parseOcrResponse(rawText);
  if (!result) {
    throw new Error('Could not read receipt data. Please fill in the form manually.');
  }
  return result;
}
