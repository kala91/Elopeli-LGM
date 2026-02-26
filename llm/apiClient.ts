import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { GAME, PATHS } from '../config/constants';

export const API_PROVIDER = process.env.API_PROVIDER || 'ollama';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
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

async function callOllama(prompt: string): Promise<string> {
  const response = await axios.post(OLLAMA_URL, { model: OLLAMA_MODEL, prompt, stream: false });
  return response.data.response;
}

async function callOpenRouter(prompt: string, model: string | null = null): Promise<string> {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: model || OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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

    if (API_PROVIDER === 'openrouter') {
      if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key puuttuu! Aseta OPENROUTER_API_KEY ympäristömuuttuja.');
      const model = useBuilderModel ? WORLD_BUILDER_MODEL : OPENROUTER_MODEL;
      const moduleName = (metadata.module as string) || promptType || 'Unknown';
      console.log(`🌐 ${moduleName}: OpenRouter/${model}`);
      responseText = await callOpenRouter(prompt, model);
    } else {
      const moduleName = (metadata.module as string) || promptType || 'Unknown';
      console.log(`🤖 ${moduleName}: Ollama/${OLLAMA_MODEL}`);
      responseText = await callOllama(prompt);
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
