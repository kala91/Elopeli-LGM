/**
 * PROMPT AGENT (Oneshot agent)
 * Generates action instructions for players
 * Role: Game Master / Dramaturg providing next action
 * 
 * Uses cognitive memory architecture:
 * - Character's key_moments (last 3) + relationships
 * - Recent story (circular buffer)
 * - Game config (setting, phase, themes)
 */

const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT_FILE = path.join(__dirname, '..', 'data', 'systemprompt.md');

/**
 * Load system prompt (contains taxonomy)
 */
function loadSystemPrompt() {
    try {
        if (fs.existsSync(SYSTEM_PROMPT_FILE)) {
            return fs.readFileSync(SYSTEM_PROMPT_FILE, 'utf8');
        }
    } catch (error) {
        console.error('Error loading system prompt:', error);
    }
    return `You are a game master for an improvisation LARP game.`;
}

/**
 * Build action prompt for character
 * @param {Object} character - Character data with memory
 * @param {Array} allCharacters - All characters in the game (for context)
 * @param {Object} gameConfig - Game configuration
 * @param {Array} recentStoryEntries - Recent story entries (from story_recent.json)
 * @param {string} systemPrompt - System prompt markdown
 * @param {Function} askLLM - LLM API function
 * @returns {Promise<string>} - Generated instruction
 */
async function buildActionPrompt(character, allCharacters, gameConfig, recentStoryEntries, systemPrompt, askLLM) {
    
    // Check if player's last input was a question or confusion signal
    const lastEntry = recentStoryEntries.slice(-1)[0];
    let playerNeedsClarity = false;
    
    if (lastEntry && lastEntry.playerSubmitted && lastEntry.targetId === character.id) {
        const playerText = lastEntry.instruction.replace('[PELAAJAN TOIMINTA] ', '').toLowerCase();
        const confusionSignals = ['mitä', 'miten', 'miksi', 'kuka', 'missä', '?', 'en tiedä', 'en ymmärrä', 'apua'];
        playerNeedsClarity = confusionSignals.some(signal => playerText.includes(signal));
    }
    
    // Build character context: description + key_moments (last 3) + relationships
    let charContext = character.description;
    
    // Add key_moments (cognitive memory - last 3)
    if (character.memory?.key_moments && character.memory.key_moments.length > 0) {
        const recentMoments = character.memory.key_moments
            .slice(-3)
            .map(m => `- ${m.content}`)
            .join('\n');
        charContext += `\n\n**Recent Experiences:**\n${recentMoments}`;
    }
    
    // Add relationships (Fiasco-style values)
    if (character.memory?.relationships && Object.keys(character.memory.relationships).length > 0) {
        const rels = Object.entries(character.memory.relationships)
            .map(([targetId, rel]) => `- ${targetId}: ${rel.value} (${rel.intensity}/5) - ${rel.notes}`)
            .join('\n');
        charContext += `\n\n**Relationships:**\n${rels}`;
    }
    
    // Build OTHER CHARACTERS context (so AI doesn't invent new characters)
    let otherCharsContext = '';
    const otherCharacters = allCharacters ? allCharacters.filter(c => c.id !== character.id) : [];
    
    if (otherCharacters.length > 0) {
        const otherChars = otherCharacters
            .map(c => `- ${c.name}: ${c.description.substring(0, 100)}...`)
            .join('\n');
        
        otherCharsContext = `\n\n**Other Characters in the Game:**\n${otherChars}\n\n(IMPORTANT: Only reference these existing characters. Do NOT invent new characters!)`;
    } else {
        otherCharsContext = `\n\n**⚠️ NO OTHER CHARACTERS IN GAME YET**\n\n(CRITICAL: You are the ONLY character! Use internal reflection, environment exploration, or discovering world elements. DO NOT reference or interact with non-existent characters!)`;
    }
    
    // Build recent story context (last 5-10 entries)
    const recentHistory = recentStoryEntries
        .slice(-10)
        .map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction.substring(0, 150)}...`)
        .join('\n');
    
    // Dramaturgy context
    const phaseContext = gameConfig.currentPhase 
        ? `${gameConfig.currentPhase.name}: ${gameConfig.currentPhase.description}`
        : 'Setup phase';
    
    // Timer context
    let timeContext = '';
    if (gameConfig.gameTimer?.mode === 'timed' && gameConfig.gameTimer.endTime) {
        const now = new Date();
        const end = new Date(gameConfig.gameTimer.endTime);
        const remainingMs = end - now;
        const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
        timeContext = `\nTime remaining: ${remainingMinutes} minutes`;
    }
    
    // Language preference
    const languageMap = { 'fi': 'suomeksi', 'en': 'in English', 'sv': 'på svenska' };
    const languageInstruction = languageMap[character.playerMeta?.language] || 'suomeksi';
    
    // Build full prompt
    const fullPrompt = `${systemPrompt}

---
GAME CONTEXT

Setting: ${gameConfig.setting}

Themes: ${gameConfig.themes.join(', ')}

Physical Props Guidance: ${gameConfig.physicalPropsGuidance}
${otherCharsContext}

---
CHARACTER CONTEXT

Name: ${character.name}
${charContext}

---
RECENT STORY
${recentHistory || 'Game just started.'}

---
DRAMATURGICAL CONTEXT

Phase: ${phaseContext}${timeContext}

---
YOUR TASK

Generate ONE concrete action instruction for ${character.name} ${languageInstruction}.

${playerNeedsClarity ? `
⚠️ **IMPORTANT: The player seems CONFUSED or asked a QUESTION.**
Give a VERY SIMPLE, CLEAR instruction. Break down the action into smallest possible step.
Use FORMAT: REFLECTION or STATEMENT. Keep it concrete and easy to follow.
` : ''}

**CRITICAL: Your response MUST follow this exact structure:**

1. **FIRST LINE:** Choose your dramaturgical approach in format:
   **[DYNAMIC: X | FORMAT: Y]**
   where X = one of: YHTEISTYÖ, KILPAILU, KONFLIKTI, NEUVOTTELU, LIITTOUMA/PETOS, LUOTTAMUS/EPÄLUOTTAMUS, SISÄINEN RISTIRIITA
   where Y = one of: STATEMENT, QUESTION, OFFER, THREAT, REVELATION, REFLECTION

2. **BLANK LINE**

3. **THE INSTRUCTION:** One concrete, imperative action instruction.
   - Use railroad principle: tell them what to do, no choices
   - Focus on dramatic interaction
   - ONLY reference existing characters from "Other Characters in the Game"
   - DO NOT invent new characters!
   - If player seems confused or asks for clarification, give a VERY clear, simple instruction

Example format:
**[DYNAMIC: KONFLIKTI | FORMAT: QUESTION]**

Mene Erkin luo ja kysy suoraan: "Missä olit kun murha tapahtui?"

---
Follow this structure EXACTLY!`;

    try {
        const response = await askLLM(
            fullPrompt,
            'scene_generation',
            character.name,
            { module: 'PromptAgent' }
        );

        return response.trim();

    } catch (error) {
        console.error('❌ PromptAgent error:', error.message);
        return `[ERROR] Ei voitu generoida promptia. Kokeile uudelleen.`;
    }
}

module.exports = {
    buildActionPrompt,
    loadSystemPrompt
};

