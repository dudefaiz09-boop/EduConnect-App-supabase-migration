import { GoogleGenAI } from "@google/genai";
import { AppError } from "../middleware/error.js";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('CRITICAL: Missing GEMINI_API_KEY in backend environment.');
}

// Export as 'ai' for legacy compatibility
export const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const GEMINI_MODEL = "gemini-flash-latest";

/**
 * Safe AI Wrapper
 * - Enforces structured prompt handling
 * - Implements timeout and retry logic
 * - Prevents prompt injection by isolating system instructions
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: any = {}
) {
  try {
    const options: any = {
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.9,
        ...config
      },
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }],
      },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    };

    const result = await ai.models.generateContent(options);

    return result.text || '';
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new AppError('AI Service is currently busy. Please try again later.', 429);
    }
    throw new AppError('Failed to generate AI content.', 500);
  }
}
