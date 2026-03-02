import axios from 'axios';
import fs from 'fs';
import { GAME, PATHS } from '../config/constants';
import { loadGameConfig } from '../utils/dataManager';

export const API_PROVIDER = process.env.API_PROVIDER || 'ollama';
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'ministral-3:latest';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
export const MOCKFILE_MODEL = 'mockfile-v1';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const WORLD_BUILDER_MODEL = process.env.WORLD_BUILDER_MODEL || 'google/gemini-2.0-flash-exp:free';
const ENGINE_RUNNER_CONFIG = {
  enabled: process.env.ENABLE_ENGINE_RUNNER === 'true',
  model: process.env.ENGINE_RUNNER_MODEL || 'functiongemma:latest',
  baseUrl: OLLAMA_BASE_URL
};

export const MODEL = API_PROVIDER === 'openrouter' ? OPENROUTER_MODEL : API_PROVIDER === 'mockfile' ? MOCKFILE_MODEL : OLLAMA_MODEL;
const PROMPT_DEBUG_FILE = PATHS.PROMPT_DEBUG;

type RuntimeLLMConfig = {
  provider: 'ollama' | 'openrouter' | 'mockfile';
  model: string;
  ollamaBaseUrl: string;
  openrouterApiKey: string;
  useStoredSecret: boolean;
};

function resolveRuntimeLLMConfig(): RuntimeLLMConfig {
  const gameConfig = loadGameConfig();
  const configured = (gameConfig.llm || {}) as Record<string, unknown>;

  const provider = configured.provider === 'openrouter' ? 'openrouter' : configured.provider === 'mockfile' ? 'mockfile' : 'ollama';
  const model = typeof configured.model === 'string' && configured.model.trim()
    ? configured.model.trim()
    : (provider === 'openrouter' ? OPENROUTER_MODEL : provider === 'mockfile' ? MOCKFILE_MODEL : OLLAMA_MODEL);
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


type MockState = { counters: Record<string, number> };

function loadMockState(): MockState {
  if (!fs.existsSync(PATHS.MOCK_LLM_STATE)) return { counters: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(PATHS.MOCK_LLM_STATE, 'utf8'));
    return { counters: parsed?.counters || {} };
  } catch {
    return { counters: {} };
  }
}

function saveMockState(state: MockState): void {
  fs.writeFileSync(PATHS.MOCK_LLM_STATE, JSON.stringify(state, null, 2), 'utf8');
}

function logPromptDebug(
  promptType: string,
  characterName: string,
  prompt: string,
  response: string,
  runtimeInfo: { model: string; provider: 'ollama' | 'openrouter' | 'mockfile' },
  metadata: Record<string, unknown> = {}
): void {
  try {
    const debugLog = readJSON(PROMPT_DEBUG_FILE);
    debugLog.push({
      timestamp: new Date().toISOString(),
      promptType,
      characterName,
      prompt,
      response,
      metadata: {
        model: runtimeInfo.model,
        provider: runtimeInfo.provider,
        promptLength: prompt.length,
        responseLength: response.length,
        ...metadata
      }
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


function callMockFile(prompt: string, promptType: string, model: string): string {
  const promptPayload = [
    `timestamp=${new Date().toISOString()}`,
    `promptType=${promptType}`,
    `model=${model}`,
    '',
    prompt
  ].join('\n');
  fs.writeFileSync(PATHS.MOCK_LLM_INPUT, promptPayload, 'utf8');

  if (!fs.existsSync(PATHS.MOCK_LLM_RESPONSES)) {
    throw new Error(`Mock response file missing: ${PATHS.MOCK_LLM_RESPONSES}`);
  }

  const raw = fs.readFileSync(PATHS.MOCK_LLM_RESPONSES, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  const byType = parsed?.byPromptType || {};
  const configured = byType[promptType] ?? parsed?.default;

  let response = configured;
  if (Array.isArray(configured)) {
    const state = loadMockState();
    const idx = state.counters[promptType] || 0;
    const safeIdx = Math.max(0, Math.min(idx, configured.length - 1));
    response = configured[safeIdx];
    state.counters[promptType] = idx + 1;
    saveMockState(state);
  }

  if (typeof response !== 'string' || !response.trim()) {
    throw new Error('Mock response missing for prompt type: ' + promptType);
  }
  return response;
}
export async function askLLM(
  prompt: string,
  promptType = 'unknown',
  characterName = 'N/A',
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const startedAt = Date.now();
  try {
    let responseText = '';
    const useBuilderModel = metadata.useAnalyzerModel === true;
    const runtime = resolveRuntimeLLMConfig();

    const moduleName = (metadata.module as string) || promptType || 'Unknown';
    const model = useBuilderModel ? WORLD_BUILDER_MODEL : runtime.model;

    if (runtime.provider === 'openrouter') {
      if (!runtime.openrouterApiKey) throw new Error('OpenRouter API key puuttuu! Lisää avain käyttöliittymässä tai aseta OPENROUTER_API_KEY ympäristömuuttuja.');
      console.log(`🌐 ${moduleName} [${requestId}]: OpenRouter/${model}`);
      responseText = await callOpenRouter(prompt, runtime.openrouterApiKey, model);
    } else if (runtime.provider === 'mockfile') {
      console.log(`🧪 ${moduleName} [${requestId}]: MockFile/${model}`);
      responseText = callMockFile(prompt, promptType, model);
    } else {
      console.log(`🤖 ${moduleName} [${requestId}]: Ollama/${model} @ ${runtime.ollamaBaseUrl}`);
      responseText = await callOllama(prompt, model, runtime.ollamaBaseUrl);
    }

    logPromptDebug(promptType, characterName, prompt, responseText, { model, provider: runtime.provider }, {
      requestId,
      module: moduleName,
      durationMs: Date.now() - startedAt,
      ...metadata
    });
    return responseText;
  } catch (error) {
    console.error(`❌ ${API_PROVIDER} error:`, (error as Error).message);
    const errorMsg = `Tekoäly vaikeni (Virhe yhteydessä: ${(error as Error).message}).`;
    const runtime = resolveRuntimeLLMConfig();
    logPromptDebug(promptType, characterName, prompt, errorMsg, { model: runtime.model, provider: runtime.provider }, {
      requestId,
      durationMs: Date.now() - startedAt,
      error: (error as Error).message,
      ...metadata
    });
    return errorMsg;
  }
}

export {
  WORLD_BUILDER_MODEL,
  ENGINE_RUNNER_CONFIG
};
