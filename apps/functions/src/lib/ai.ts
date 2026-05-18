import { env } from './config.js';
import { AiProvider, AiGenerationConfig } from './ai-providers/base.provider.js';
import { OpenRouterAiProvider } from './ai-providers/openrouter.provider.js';
import { OfflineAiProvider } from './ai-providers/offline.provider.js';

/**
 * Prioritized list of approved free OpenRouter models for fallback.
 */
export const FREE_MODEL_PRIORITY = [
  'google/gemma-3-4b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
];

export const FREE_OPENROUTER_MODELS = new Set([...FREE_MODEL_PRIORITY, 'openrouter/auto']);

const DEFAULT_FREE_MODEL = FREE_MODEL_PRIORITY[0];

const providers: AiProvider[] = [
    new OpenRouterAiProvider(),
    new OfflineAiProvider()
];

export function isAiEnabled() {
  return providers.some(p => p.name !== 'offline' && p.isEnabled());
}

export function getAiRuntimeStatus() {
  const openRouter = providers.find(p => p.name === 'openrouter') as OpenRouterAiProvider;
  const hasOpenRouterKey = openRouter?.isEnabled() || false;

  return {
    enabled: hasOpenRouterKey,
    provider: 'openrouter',
    mode: hasOpenRouterKey ? 'live' : 'offline-fallback',
    hasOpenRouterKey,
    freeModelEnforced: true,
    allowedFreeModels: Array.from(FREE_OPENROUTER_MODELS),
    runtime: process.env.VERCEL_URL ? 'vercel' : 'local',
    checkedAt: new Date().toISOString(),
  };
}

export function getOpenRouterModel() {
    return process.env.OPENROUTER_MODEL || env.OPENROUTER_MODEL || DEFAULT_FREE_MODEL;
}

/**
 * Strategy-based AI Content Generation
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: AiGenerationConfig = {}
): Promise<string> {
  const normalizedPrompt = userPrompt.toLowerCase();
  const premiumKeywords = ['gpt-4', 'gpt4', 'claude-3', 'claude 3', 'gemini pro', 'premium model'];
  if (premiumKeywords.some((k) => normalizedPrompt.includes(k))) {
    return 'Only free models are enabled on this platform. Please use your own API key for premium access.';
  }

  // Find the first enabled live provider
  const liveProvider = providers.find(p => p.name !== 'offline' && p.isEnabled());

  if (liveProvider) {
      try {
          return await liveProvider.generateContent(systemInstruction, userPrompt, config);
      } catch (error) {
          console.error(`[AI] Provider ${liveProvider.name} failed:`, error);
          // Fallback to offline
      }
  }

  const offlineProvider = providers.find(p => p.name === 'offline')!;
  return await offlineProvider.generateContent(systemInstruction, userPrompt, config);
}
