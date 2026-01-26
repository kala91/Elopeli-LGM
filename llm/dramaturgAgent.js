/**
 * DRAMATURG AGENT (Oneshot agent)
 * Analyzes game state and evaluates dramaturgical phase
 * Role: Observer assessing game dynamics and tension
 * 
 * Uses cognitive memory architecture:
 * - Recent story entries
 * - Game config (themes, phase)
 * - Timer context
 */

/**
 * Build dramaturgy analysis prompt and execute
 * @param {Object} gameConfig - Game configuration
 * @param {Array} recentStoryEntries - Recent story entries
 * @param {Function} askLLM - LLM API function
 * @returns {Promise<string>} - Analysis text
 */
async function buildDramaturgyPrompt(gameConfig, recentStoryEntries, askLLM) {
    
    // Build recent history context (last 20-30 entries)
    const recentHistory = recentStoryEntries
        .slice(-30)
        .map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction}`)
        .join('\n');
    
    // Timer context
    let timeContext = '';
    if (gameConfig.gameTimer?.mode === 'timed' && gameConfig.gameTimer.endTime) {
        const now = new Date();
        const start = new Date(gameConfig.gameTimer.startTime);
        const end = new Date(gameConfig.gameTimer.endTime);
        const totalMs = end - start;
        const elapsedMs = now - start;
        const remainingMs = end - now;
        
        const percentComplete = (elapsedMs / totalMs) * 100;
        const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
        
        timeContext = `\n## TIME CONTEXT\nRemaining: ${remainingMinutes} min (${percentComplete.toFixed(0)}% complete).\n${
            percentComplete < 30 ? 'Early game - build tension' : 
            percentComplete < 70 ? 'Mid game - escalate conflicts' : 
            'End game - drive to climax'
        }`;
    }
    
    const prompt = `## DRAMATURGICAL ANALYSIS

You are a drama expert analyzing a LARP game.

## SETTING
${gameConfig.setting}

## THEMES
${gameConfig.themes.join(', ')}

## CURRENT PHASE
${gameConfig.currentPhase.name}: ${gameConfig.currentPhase.description}
${timeContext}

## RECENT ACTIVITY
${recentHistory || 'No activity yet.'}

## TASK
Analyze in this format:

Current phase: [Name the current dramatic phase]
State analysis: [Should we transition? Why?]
Next phase suggestion: [3-5 words, if transitioning]
Atmosphere: [Brief mood description]
Next plot twist: [One concrete suggestion based on themes]

Keep concise, answer in English.`;

    try {
        const response = await askLLM(
            prompt,
            'dramaturgy_analysis',
            'DramaturgAgent',
            { module: 'DramaturgAgent' }
        );

        return response.trim();

    } catch (error) {
        console.error('❌ DramaturgAgent error:', error.message);
        return `[ERROR] Could not analyze game state.`;
    }
}

module.exports = {
    buildDramaturgyPrompt
};

module.exports = {
    buildDramaturgyPrompt
};
