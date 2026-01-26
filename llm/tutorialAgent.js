/**
 * TUTORIAL AGENT (Oneshot agent)
 * Opastaa uusia pelaajia ennen hahmon luontia
 * Kertoo pelin settingin, olemassa olevat hahmot, tarinan tilan
 */

/**
 * Handle tutorial conversation with new player
 * @param {string} playerName - Player's name
 * @param {string} playerQuestion - Player's question or message
 * @param {Object} gameConfig - Game configuration
 * @param {Array} existingCharacters - List of existing characters
 * @param {Array} recentStory - Recent story entries
 * @param {string} language - Player's language (fi, en, sv)
 * @param {Array} conversationHistory - Previous messages in tutorial [{role, content}]
 * @param {Function} askLLM - LLM API function
 * @returns {Promise<string>} - Tutorial response
 */
async function handleTutorial(playerName, playerQuestion, gameConfig, existingCharacters, recentStory, language, conversationHistory, askLLM) {
    
    // Build context about the game
    const setting = gameConfig.setting || 'Peli on juuri alkanut';
    const themes = gameConfig.themes?.join(', ') || 'Ei teemoja';
    
    // List existing characters (if any)
    // NOTE: Don't truncate - new players need to understand existing characters
    let existingCharsInfo = '';
    if (existingCharacters && existingCharacters.length > 0) {
        existingCharsInfo = '\n\nOLEMASSA OLEVAT HAHMOT:\n' +
            existingCharacters.map(c => `- ${c.name}: ${c.description}`).join('\n');
    } else {
        existingCharsInfo = '\n\nEi vielä hahmoja pelissä. Olet ensimmäinen!';
    }
    
    // Recent story summary (if game has started)
    // NOTE: Don't truncate - new players need full context to understand what's happening
    let storyInfo = '';
    if (recentStory && recentStory.length > 0) {
        const recentEvents = recentStory.slice(-5).map(e => {
            const charName = e.targetChar || 'Unknown';
            const instruction = e.instruction;
            return `${charName}: ${instruction}`;
        }).join('\n- ');
        storyInfo = `\n\nVIIMEISIMMÄT TAPAHTUMAT (Who did what):\n- ${recentEvents}`;
    }
    
    const languageMap = {
        'fi': 'suomeksi',
        'en': 'in English',
        'sv': 'på svenska',
        'de': 'auf Deutsch',
        'fr': 'en français'
    };
    const responseLanguage = languageMap[language] || 'suomeksi';
    
    // Format conversation history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
        conversationContext = '\n\n## CONVERSATION HISTORY (with current player only)\n' +
            conversationHistory.map(msg => {
                const speaker = msg.role === 'player' ? 'Player' : 'You (Tutorial Guide)';
                return `${speaker}: ${msg.content}`;
            }).join('\n');
    } else {
        conversationContext = '\n\n## CONVERSATION HISTORY\n(This is the first message - no previous conversation)';
    }
    
    const tutorialPrompt = `You are a TUTORIAL GUIDE for a railroaded LARP game.

## YOUR ROLE
Help player "${playerName}" understand the game and guide them to character creation.
You answer questions conversationally through a chat interface.

---

## GAME INFO

**Setting:** ${setting}

**Themes:** ${themes}
${existingCharsInfo}
${storyInfo}

---

## CONVERSATION WITH ${playerName}
${conversationContext}

**Current message:** "${playerQuestion}"

---

## YOUR TASK

Answer ${playerName}'s message ${responseLanguage}.

**If this is the first message (empty history):**
Welcome them:
"Hei ja tervetuloa pelaamaan! 🎭 Voit:
1. Pyytää pelihahmon ja aloittaa pelin
2. Kysyä pelistä mitä tahansa
3. Udella ELOPELI-moottorin ideasta

Mitä haluaisit tietää?"

**Otherwise:**
- Continue the conversation naturally
- If they ask about game mechanics → Explain it's an improvisation LARP with AI-generated instructions
- If they ask about setting/characters/story → Answer based on GAME INFO
- If they describe character wishes → Listen and remember

**CRITICAL: When player is ready to create character:**

When player says:
- "luo hahmo" / "create character"
- "olen valmis" / "I'm ready" / "aloitetaan" / "let's start"
- "haluan hahmon" / "I want a character"

→ Call the character creation tool:

<TOOL_CALL>
{
  "tool": "createCharacter",
  "playerWishes": "Brief summary of player's character wishes from conversation"
}
</TOOL_CALL>

**IMPORTANT:**
- DO NOT write character descriptions yourself!
- DO NOT pretend character is created!
- Only say character is ready AFTER you called the tool
- Include a short message before tool call: "Loistavaa! Luon sinulle hahmon..."

---

Respond ${responseLanguage} naturally and conversationally.`;



    try {
        const response = await askLLM(
            tutorialPrompt,
            'tutorial',
            playerName,
            { module: 'TutorialAgent' }
        );
        
        // Parse tool call if present
        const toolCallMatch = response.match(/<TOOL_CALL>\s*(\{[^}]+\})\s*<\/TOOL_CALL>/s);
        
        if (toolCallMatch) {
            try {
                const toolCall = JSON.parse(toolCallMatch[1]);
                
                // Extract text response (everything before tool call)
                const textResponse = response.replace(/<TOOL_CALL>[\s\S]*<\/TOOL_CALL>/, '').trim();
                
                return {
                    response: textResponse || null,
                    toolCall: toolCall
                };
            } catch (parseError) {
                console.error('❌ Failed to parse tool call:', parseError);
                return { response: response.trim(), toolCall: null };
            }
        }
        
        // No tool call, just return text
        return { response: response.trim(), toolCall: null };

    } catch (error) {
        console.error('❌ TutorialAgent error:', error.message);
        
        // Fallback response
        const fallbacks = {
            'fi': `Tervetuloa peliin, ${playerName}! Tämä on improvisaatio-LARP-peli. Saat toimintaohjeita tekoäly-pelinjohtajalta. Voit valita olemassa olevan hahmon tai luoda uuden. Kysy rohkeasti jos haluat tietää lisää!`,
            'en': `Welcome to the game, ${playerName}! This is an improvisation LARP game. You'll receive action instructions from an AI game master. Choose an existing character or create a new one. Feel free to ask questions!`,
            'sv': `Välkommen till spelet, ${playerName}! Detta är ett improvisations-LARP-spel. Du får handlingsinstruktioner från en AI-spelledare. Välj en befintlig karaktär eller skapa en ny. Fråga gärna!`
        };
        
        return { response: fallbacks[language] || fallbacks['fi'], toolCall: null };
    }
}

module.exports = {
    handleTutorial
};
