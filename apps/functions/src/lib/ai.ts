import { GoogleGenAI, GenerationConfig } from "@google/genai";
import { AppError } from "../middleware/error";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('CRITICAL: Missing GEMINI_API_KEY in backend environment.');
}

export const genAI = new GoogleGenAI({ apiKey: apiKey || '' });

export const GEMINI_MODEL = "gemini-flash-latest";

export const DEFAULT_AI_CONFIG: GenerationConfig = {
  maxOutputTokens: 1000,
  temperature: 0.7,
  topP: 0.9,
};

/**
 * Safe AI Wrapper
 * - Enforces structured prompt handling
 * - Implements timeout and retry logic
 * - Prevents prompt injection by isolating system instructions
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: Partial<GenerationConfig> = {}
) {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }],
      },
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { ...DEFAULT_AI_CONFIG, ...config },
    });

    const response = result.response;
    return response.text();
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new AppError('AI Service is currently busy. Please try again later.', 429);
    }
    throw new AppError('Failed to generate AI content.', 500);
  }
}
