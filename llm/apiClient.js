/**
 * LLM API Client
 * 
 * Keskitetty LLM-yhteyskohta joka tukee useita API-providereitä.
 * Käsittelee kaikki LLM-kutsut ja debug-loggauksen.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================================================
// KONFIGURAATIO
// ============================================================================

// API Provider: 'ollama' tai 'openrouter'
const API_PROVIDER = process.env.API_PROVIDER || 'ollama';

// Ollama konfiguraatio
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'ministral-3:latest';

// OpenRouter konfiguraatio
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Moduulikohtaiset mallit
const WORLD_BUILDER_MODEL = process.env.WORLD_BUILDER_MODEL || 'google/gemini-2.0-flash-exp:free';
const ENGINE_RUNNER_CONFIG = {
    enabled: process.env.ENABLE_ENGINE_RUNNER === 'true',
    model: process.env.ENGINE_RUNNER_MODEL || 'functiongemma:latest',
    baseUrl: OLLAMA_BASE_URL
};

// Käytössä oleva päämalli (näytetään debugissa)
const MODEL = API_PROVIDER === 'openrouter' ? OPENROUTER_MODEL : OLLAMA_MODEL;

const PROMPT_DEBUG_FILE = path.join(__dirname, '..', 'data', 'debug_prompts.json');

// ============================================================================
// HELPER: JSON-tiedostojen käsittely
// ============================================================================

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================================
// DEBUG LOGGING
// ============================================================================

/**
 * Logittaa promptit ja vastaukset debug-tiedostoon
 */
function logPromptDebug(promptType, characterName, prompt, response, metadata = {}) {
    try {
        const debugLog = readJSON(PROMPT_DEBUG_FILE);
        
        debugLog.push({
            timestamp: new Date().toISOString(),
            promptType,
            characterName,
            prompt,
            response,
            metadata: {
                model: MODEL,
                provider: API_PROVIDER,
                ...metadata
            }
        });
        
        // Säilytä max 100 viimeisintä
        if (debugLog.length > 100) {
            debugLog.shift();
        }
        
        writeJSON(PROMPT_DEBUG_FILE, debugLog);
    } catch (error) {
        console.error("❌ Error logging prompt debug:", error.message);
    }
}

// ============================================================================
// LLM API CALLS
// ============================================================================

/**
 * Kutsu Ollama API:ta
 */
async function callOllama(prompt) {
    const response = await axios.post(OLLAMA_URL, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false
    });
    return response.data.response;
}

/**
 * Kutsu OpenRouter API:ta
 */
async function callOpenRouter(prompt, model = null) {
    const response = await axios.post(
        OPENROUTER_URL,
        {
            model: model || OPENROUTER_MODEL,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'LARP Game Engine',
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data.choices[0].message.content;
}

/**
 * Yhtenäinen LLM-kutsu - valitsee automaattisesti oikean API:n
 * 
 * @param {string} prompt - Täydellinen prompti LLM:lle
 * @param {string} promptType - Promptin tyyppi (scene_generation, character_generation, world_analysis, dramaturg_analysis)
 * @param {string} characterName - Hahmon nimi (jos relevantti)
 * @param {Object} metadata - Lisätietoja debuggia varten
 * @returns {Promise<string>} LLM:n vastaus
 */
async function askLLM(prompt, promptType = 'unknown', characterName = 'N/A', metadata = {}) {
    try {
        let responseText;
        
        // Tarkista käytetäänkö WorldBuilder-mallia (kevyt analyysimalli)
        const useBuilderModel = metadata.useAnalyzerModel === true;
        
        if (API_PROVIDER === 'openrouter') {
            if (!OPENROUTER_API_KEY) {
                throw new Error('OpenRouter API key puuttuu! Aseta OPENROUTER_API_KEY ympäristömuuttuja.');
            }
            const model = useBuilderModel ? WORLD_BUILDER_MODEL : OPENROUTER_MODEL;
            const moduleName = metadata.module || promptType || 'Unknown';
            console.log(`🌐 ${moduleName}: OpenRouter/${model}`);
            responseText = await callOpenRouter(prompt, model);
        } else {
            // Ollama: käytä samaa mallia molempiin (ei erillistä analyysimallia)
            const moduleName = metadata.module || promptType || 'Unknown';
            console.log(`🤖 ${moduleName}: Ollama/${OLLAMA_MODEL}`);
            responseText = await callOllama(prompt);
        }
        
        logPromptDebug(promptType, characterName, prompt, responseText, metadata);
        return responseText;
        
    } catch (error) {
        console.error(`❌ ${API_PROVIDER} error:`, error.message);
        const errorMsg = `Tekoäly vaikeni (Virhe yhteydessä: ${error.message}).`;
        logPromptDebug(promptType, characterName, prompt, errorMsg, { error: error.message, ...metadata });
        return errorMsg;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    askLLM,
    // Konfiguraatiot (voidaan käyttää muualla jos tarvitaan)
    API_PROVIDER,
    MODEL,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OPENROUTER_MODEL,
    WORLD_BUILDER_MODEL,
    ENGINE_RUNNER_CONFIG
};
