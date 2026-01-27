/**
 * MEMORY EXTRACTOR AGENT
 * 
 * Oneshot agent that extracts dramatically significant moments from recent story entries.
 * Runs in background (non-blocking) when triggered by:
 * - Every 5th story entry OR
 * - Player input (playerSubmitted: true)
 * 
 * Returns memories and relationship changes for ALL participants in one LLM call.
 */

const { LANGUAGES, GAME } = require('../config/constants');

/**
 * Extract memories from recent story entries
 * @param {Array} recentEntries - Recent story entries to analyze (5-10 entries)
 * @param {Array} participantCharIds - Character IDs involved in these entries
 * @param {Array} availableRelationships - Allowed relationship types from game config
 * @param {Function} askLLM - LLM API function from server.js
 * @param {Object} participantLanguages - Object mapping charId to language {charId: 'fi', ...}
 * @returns {Object} - {charId: {key_moments: [], relationshipChanges: []}}
 */
async function extractMemories(recentEntries, participantCharIds, availableRelationships, askLLM, participantLanguages = {}) {
    if (!askLLM || recentEntries.length === 0 || participantCharIds.length === 0) {
        console.log('ℹ️ MemoryExtractor: Ei ekstraktoitavaa (tyhjä input)');
        return {};
    }

    // Build context from recent entries
    const storyContext = recentEntries
        .map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction}`)
        .join('\n');

    const relationshipTypes = availableRelationships.join(', ');

    // Build participant list with their individual languages
    const participantsWithLanguages = participantCharIds.map(charId => {
        const lang = participantLanguages[charId] || GAME.DEFAULT_LANGUAGE;
        const langName = LANGUAGES[lang] || LANGUAGES[GAME.DEFAULT_LANGUAGE];
        return `${charId} (${langName})`;
    }).join(', ');

    const prompt = `## MEMORY EXTRACTION TASK

You are analyzing a LARP game session to extract ONLY dramatically significant moments.

## PARTICIPANTS (with their preferred languages)
${participantsWithLanguages}

## ALLOWED RELATIONSHIP TYPES
${relationshipTypes}

## RECENT STORY
${storyContext}

## YOUR TASK

Extract:
1. **key_moments** - Dramatically significant events (confessions, discoveries, betrayals, emotional breakthroughs)
2. **relationshipChanges** - How relationships between characters changed

**Rules:**
- Extract ONLY explicitly mentioned significant moments (ignore small talk)
- If a moment involves multiple characters, include it in ALL their memories (from their perspective)
- Relationship changes must use ONLY the allowed types listed above
- If nothing significant happened, return empty arrays
- Intensity: 1 (weak) to 5 (very strong)
- **CRITICAL: Write each character's content and reason fields in THEIR OWN language (see participant list above)**

Format your response as JSON:
\`\`\`json
{
  "jesse": {
    "key_moments": [
      {
        "content": "Confessed romantic feelings to Jee in the library",
        "emotionalWeight": 5,
        "participants": ["jesse", "jee"]
      }
    ],
    "relationshipChanges": [
      {
        "targetCharId": "jee",
        "value": "romantic",
        "intensity": 4,
        "reason": "Confessed feelings, awaiting response"
      }
    ]
  },
  "jee": {
    "key_moments": [
      {
        "content": "Jesse confessed romantic feelings to me",
        "emotionalWeight": 4,
        "participants": ["jesse", "jee"]
      }
    ],
    "relationshipChanges": [
      {
        "targetCharId": "jesse",
        "value": "romantic",
        "intensity": 2,
        "reason": "Received unexpected confession, processing feelings"
      }
    ]
  }
}
\`\`\`

Return ONLY the JSON, no other text.`;

    try {
        console.log(`🧠 MemoryExtractor: Analysoidaan ${recentEntries.length} merkintää (${participantCharIds.length} hahmoa)`);
        
        const response = await askLLM(
            prompt,
            'memory_extraction',
            'MemoryExtractor',
            { 
                useAnalyzerModel: true,
                module: 'MemoryExtractor'
            }
        );

        // Parse JSON response
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            console.warn('⚠️ MemoryExtractor: Ei löytynyt JSON-muotoista vastausta');
            return {};
        }

        const cleanJson = jsonMatch[0].replace(/```json\n?/, '').replace(/\n?```/, '');
        const memories = JSON.parse(cleanJson);

        // Validate structure
        for (const charId of Object.keys(memories)) {
            if (!memories[charId].key_moments) memories[charId].key_moments = [];
            if (!memories[charId].relationshipChanges) memories[charId].relationshipChanges = [];

            // Add timestamp to each key_moment
            memories[charId].key_moments = memories[charId].key_moments.map(moment => ({
                ...moment,
                timestamp: new Date().toISOString()
            }));
        }

        // Log summary
        const totalMoments = Object.values(memories).reduce((sum, m) => sum + m.key_moments.length, 0);
        const totalRelChanges = Object.values(memories).reduce((sum, m) => sum + m.relationshipChanges.length, 0);
        console.log(`✅ MemoryExtractor: +${totalMoments} key_moments, +${totalRelChanges} relationship changes`);

        return memories;

    } catch (error) {
        console.error('❌ MemoryExtractor virhe:', error.message);
        return {};
    }
}

module.exports = {
    extractMemories
};
