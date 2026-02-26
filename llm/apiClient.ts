import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { GAME, PATHS } from '../config/constants';
import { loadGameConfig } from '../utils/dataManager';

export const API_PROVIDER = process.env.API_PROVIDER || 'ollama';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'ministral-3:latest';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const WORLD_BUILDER_MODEL = process.env.WORLD_BUILDER_MODEL || 'google/gemini-2.0-flash-exp:free';
const ENGINE_RUNNER_CONFIG = {
  enabled: process.env.ENABLE_ENGINE_RUNNER === 'true',
  model: process.env.ENGINE_RUNNER_MODEL || 'functiongemma:latest',
  baseUrl: OLLAMA_BASE_URL
};

export const MODEL = API_PROVIDER === 'openrouter' ? OPENROUTER_MODEL : OLLAMA_MODEL;
const PROMPT_DEBUG_FILE = path.join(__dirname, '..', 'data', 'debug_prompts.json');

type RuntimeLLMConfig = {
  provider: 'ollama' | 'openrouter';
  model: string;
  ollamaBaseUrl: string;
  openrouterApiKey: string;
  useStoredSecret: boolean;
};

function resolveRuntimeLLMConfig(): RuntimeLLMConfig {
  const gameConfig = loadGameConfig();
  const configured = (gameConfig.llm || {}) as Record<string, unknown>;

  const provider = configured.provider === 'openrouter' ? 'openrouter' : 'ollama';
  const model = typeof configured.model === 'string' && configured.model.trim()
    ? configured.model.trim()
    : (provider === 'openrouter' ? OPENROUTER_MODEL : OLLAMA_MODEL);
  const ollamaBaseUrl = typeof configured.baseUrl === 'string' && configured.baseUrl.trim()
    ? configured.baseUrl.trim().replace(/\/$/, '')
    : OLLAMA_BASE_URL;

  const configuredApiKey = typeof configured.apiKey === 'string' ? configured.apiKey.trim() : '';
  const useStoredSecret = configured.useStoredSecret !== false;
  const openrouterApiKey = configuredApiKey || (useStoredSecret ? OPENROUTER_API_KEY : '');

  return { provider, model, ollamaBaseUrl, openrouterApiKey, useStoredSecret };
}

function readJSON(filePath: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function logPromptDebug(promptType: string, characterName: string, prompt: string, response: string, metadata: Record<string, unknown> = {}): void {
  try {
    const debugLog = readJSON(PROMPT_DEBUG_FILE);
    debugLog.push({
      timestamp: new Date().toISOString(),
      promptType,
      characterName,
      prompt,
      response,
      metadata: { model: MODEL, provider: API_PROVIDER, ...metadata }
    });
    if (debugLog.length > GAME.DEBUG_LOG_MAX_ENTRIES) debugLog.shift();
    writeJSON(PROMPT_DEBUG_FILE, debugLog);
  } catch (error) {
    console.error('❌ Error logging prompt debug:', (error as Error).message);
  }
}

async function callOllama(prompt: string, model: string, baseUrl: string): Promise<string> {
  const response = await axios.post(`${baseUrl}/api/generate`, { model, prompt, stream: false });
  return response.data.response;
}

async function callOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LARP Game Engine',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

export async function askLLM(
  prompt: string,
  promptType = 'unknown',
  characterName = 'N/A',
  metadata: Record<string, unknown> = {}
): Promise<string> {
  try {
    let responseText = '';
    const useBuilderModel = metadata.useAnalyzerModel === true;
    const runtime = resolveRuntimeLLMConfig();

    if (runtime.provider === 'openrouter') {
      if (!runtime.openrouterApiKey) throw new Error('OpenRouter API key puuttuu! Lisää avain käyttöliittymässä tai aseta OPENROUTER_API_KEY ympäristömuuttuja.');
      const model = useBuilderModel ? WORLD_BUILDER_MODEL : runtime.model;
      const moduleName = (metadata.module as string) || promptType || 'Unknown';
      console.log(`🌐 ${moduleName}: OpenRouter/${model}`);
      responseText = await callOpenRouter(prompt, runtime.openrouterApiKey, model);
    } else {
      const moduleName = (metadata.module as string) || promptType || 'Unknown';
      const model = runtime.model || OLLAMA_MODEL;
      console.log(`🤖 ${moduleName}: Ollama/${model} @ ${runtime.ollamaBaseUrl}`);
      responseText = await callOllama(prompt, model, runtime.ollamaBaseUrl);
    }

    logPromptDebug(promptType, characterName, prompt, responseText, metadata);
    return responseText;
  } catch (error) {
    console.error(`❌ ${API_PROVIDER} error:`, (error as Error).message);
    const errorMsg = `Tekoäly vaikeni (Virhe yhteydessä: ${(error as Error).message}).`;
    logPromptDebug(promptType, characterName, prompt, errorMsg, { error: (error as Error).message, ...metadata });
    return errorMsg;
  }
}

export {
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  OPENROUTER_MODEL,
  WORLD_BUILDER_MODEL,
  ENGINE_RUNNER_CONFIG
};
