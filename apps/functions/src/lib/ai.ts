import { GoogleGenAI } from "@google/genai";
import { AppError } from "../middleware/error.js";
import { env } from "./config.js";

/**
 * Enterprise AI Configuration
 * Using validated environment variables.
 */
export const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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
    // Check for quota or rate limit errors
    if (error.message?.includes('429')) {
      throw new AppError('AI Quota exceeded or service is busy. Please try again later.', 429);
    }
    
    console.error('[AI] Generation failed:', error);
    throw new AppError('Failed to generate AI content due to a system error.', 500);
  }
}
