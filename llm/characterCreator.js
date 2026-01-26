/**
 * CHARACTER CREATOR AGENT (Oneshot agent)
 * Creates new player characters for the game
 * Role: Character generator based on game setting and themes
 */

/**
 * Create a new character with structured JSON data
 * @param {string} playerName - Player's chosen name
 * @param {Array} existingCharacters - List of existing characters (to avoid duplicates)
 * @param {Object} gameConfig - Game configuration (setting, themes)
 * @param {string} language - Player's language preference (fi, en, sv)
 * @param {Function} askLLM - LLM API function
 * @param {string} characterWishes - Player's wishes from tutorial conversation (optional)
 * @returns {Promise<Object>} - Generated character data {description, personality, goals, relationships}
 */
async function createCharacter(playerName, existingCharacters, gameConfig, language, askLLM, characterWishes = '') {
    
    // Build existing characters context
    let existingCharsContext = '';
    if (existingCharacters && existingCharacters.length > 0) {
        existingCharsContext = '\n\n## EXISTING CHARACTERS\n' + 
            existingCharacters.map(c => `- ${c.name}: ${c.description || 'character in game'}`).join('\n') +
            '\n\n(Create a character that fits with these existing characters. Create connections or contrasts.)';
    }
    
    // Add player wishes if available
    let wishesContext = '';
    if (characterWishes && characterWishes.trim()) {
        wishesContext = `\n\n## PLAYER'S WISHES FROM TUTORIAL\n${characterWishes}\n\n(CRITICAL: Incorporate these wishes! If they mention another character by name, use that EXACT name in relationships.)`;
    }
    
    const characterPrompt = `You are creating a character for a LARP game.

## GAME SETTING
${gameConfig.setting}

## THEMES
${gameConfig.themes.join(', ')}

## AVAILABLE RELATIONSHIP TYPES
${gameConfig.availableRelationships.join(', ')}
${existingCharsContext}
${wishesContext}

## PLAYER NAME
${playerName}

## YOUR TASK
Create a rich character with structured data.

**CRITICAL: Write ALL text fields in ${language === 'fi' ? 'Finnish (suomeksi)' : language === 'sv' ? 'Swedish (på svenska)' : language === 'de' ? 'German (auf Deutsch)' : language === 'fr' ? 'French (en français)' : 'English'}.**

Format your response as JSON:
\`\`\`json
{
  "description": "2-3 sentence character description (role, personality hint, secret)",
  "personality": ["trait1", "trait2", "trait3"],
  "goals": ["short-term goal", "long-term goal", "secret desire"],
  "relationships": [
    {
      "targetCharName": "exact name of another character (if mentioned in wishes)",
      "value": "one of the available relationship types",
      "intensity": 3,
      "reason": "why this relationship exists"
    }
  ]
}
\`\`\`

**RULES:**
- If player wishes mention a specific character name (e.g., "frank"), use that EXACT name in targetCharName
- Relationship value must be one of: ${gameConfig.availableRelationships.join(', ')}
- Intensity: 1-5 (1=weak, 5=very strong)
- If no specific relationships mentioned, relationships can be empty []

Return ONLY the JSON, no other text.`;

    try {
        const response = await askLLM(
            characterPrompt,
            'character_generation',
            playerName,
            { module: 'CharacterCreator' }
        );
        
        // Parse JSON response
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            console.warn('⚠️ CharacterCreator: Ei löytynyt JSON-muotoista vastausta, käytetään fallback');
            return {
                description: `A character in ${gameConfig.setting || 'this game'}.`,
                personality: [],
                goals: [],
                relationships: []
            };
        }

        const characterData = JSON.parse(jsonMatch[0].replace(/```json\n?/, '').replace(/\n?```/, ''));
        
        return characterData;

    } catch (error) {
        console.error('❌ CharacterCreator error:', error.message);
        // Fallback to simple description
        return {
            description: `A character in ${gameConfig.setting || 'this game'}.`,
            personality: [],
            goals: [],
            relationships: []
        };
    }
}

module.exports = {
    createCharacter
};
