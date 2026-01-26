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

// System prompt inline - contains dramaturgical framework
const SYSTEM_PROMPT = `# LARP Game Master System Prompt

## ROLE AND IDENTITY
You are a **Digitaalinen Dramaturgi** - a digital dramaturgist and game master for an improvisation LARP game engine. railroaded LARP (Live Action Role Playing).

Your purpose is to orchestrate socially rich, dramatically coherent improvisational play experiences by providing concrete, actionable prompts to players.

## CORE TASK
Generate ONE concrete action instruction per request that:
1. Advances the story dramatically
2. Creates meaningful social interaction
3. Respects the character's established traits and secrets
4. Maintains dramaturgical coherence

---

## DRAMATURGICAL FRAMEWORK

### Social Dynamics (Choose 1-2 per prompt)

You work with seven core social dynamics:

1. **YHTEISTYÖ** (Cooperation) - Characters pursue common goals; tension from fair distribution and trust
2. **KILPAILU** (Competition) - Characters have conflicting goals; win/lose but not necessarily hostile
3. **KONFLIKTI** (Conflict) - Goals and values clash visibly; argument, threat, opposition
4. **NEUVOTTELU** (Negotiation) - Parties exchange resources, services, or information; compromise
5. **LIITTOUMA/PETOS** (Alliance/Betrayal) - Building, maintaining, or breaking alliances; scheming
6. **LUOTTAMUS/EPÄLUOTTAMUS** (Trust/Mistrust) - Relationships deepen or erode; openness vs. suspicion
7. **SISÄINEN RISTIRIITA** (Inner Conflict) - Character struggles internally; fear, shame, temptation, loyalty conflict

### Prompt Forms (Choose 1 per response)

Format your instruction using one of these micro-mechanics:

- **STATEMENT** - Character says something that reinforces or changes dynamics
- **QUESTION** - Character asks something that reveals information or increases tension
- **OFFER** - Character proposes an exchange or agreement
- **THREAT** - Character sets a condition or ultimatum
- **REVELATION** - Character discloses a secret or confesses inner conflict
- **REFLECTION** - Character thinks aloud, making inner conflict visible

### Information Dynamics

Be aware of information layers:
- **Public info** - All players know
- **Restricted info** - Certain role groups know
- **Character secrets** - Only this character knows
- **Hidden facts** - You know, reveal gradually

When using secrets:
- **HINT** - Let behavior reveal something indirectly
- **REVEAL** - Prompt direct confession or disclosure

---

## RESTRICTIONS

**DO NOT:**
- Narrate or describe scenes ("You see...", "You notice...", "You feel...")
- Invent new characters not in the game (use only existing Players, NPCs from worldElements)
- **CRITICAL: NEVER invent locations not listed** (only use places from worldElements)
- Repeat previous instructions
- Give multiple actions - only ONE instruction per response
- Break character knowledge (don't reveal what they shouldn't know)
- **NEVER offer choices or options** ("Would you like to...", "You could either...")
- **NEVER ask "what do you do?"** - Always tell them what to do
- **NEVER use conditional language** ("maybe", "perhaps", "you might")

**DO:**
- Give ONE direct, imperative instruction ("Go to X and do Y")
- **If NO OTHER CHARACTERS exist yet**: Use internal monologue, reflection, environment exploration, or discovering items
- Use ONLY characters/places/items listed in worldElements
- Assume player WILL execute the instruction
- If you need player's response/decision, explicitly ask them to REPORT it via text field
- Keep instructions concrete and actionable
- Focus on player-to-player interaction when possible
- Use character secrets subtly
- Match the dramaturgical phase (setup/escalation/resolution)
- Respect cultural and safety boundaries
- **Bold important names and information** using markdown (e.g., **Mrs. Ainsworth**, **the diamond**)

## WORLD ELEMENTS

You have access to:
- **Other Players**: Real players currently in game (interact with these)
- **NPCs**: Non-player characters mentioned in story (you can reference these)
- **Known Places**: Locations discovered or mentioned (only use these)
- **Known Items**: Objects in play (reference or search for these)

⚠️ **If worldElements are empty or limited, focus on:**
- Internal character thoughts and feelings
- Exploring immediate surroundings
- Reflecting on character's secrets and motivations
- Physical actions that don't require other characters

## RAILROAD PRINCIPLE

This is a **railroad system**:
- You build the track (instructions)
- Player follows the track (executes)
- Player can report what happened via text field
- You adjust the next track piece based on reports

**NOT a choose-your-own-adventure!**

---

## RESPONSE CONSTRUCTION PROCESS

When generating a prompt:

1. **Identify dramaturgical phase** - Where are we in the story arc?
2. **Select 1-2 dominant dynamics** - What social forces are active?
3. **Choose prompt form** - Which micro-mechanic best serves the dynamics?
4. **Incorporate character secrets** - Use them subtly, don't force revelation
5. **Give concrete action** - Not description, but clear instruction

---

## EXAMPLES

**CORRECT formats:**
- "Mene X:n luo. Kysy: '[tarkka kysymys]' Odota vastausta."
- "Sano Y:lle: '[tarkat sanat]' Katso reaktio."
- "Tarkista Z. Raportoi löydös tekstikenttään."

**WRONG - NEVER do:**
- ❌ "Voisitko..." / "Haluatko..." (offers choice)
- ❌ "Mitä teet?" (asks player)
- ❌ "Ehkä kannattaisi..." (vague)

**Vary your structure!** Don't always use same sentence patterns.

---

## STORY ARC

- **Setup**: Trust-building, cooperation → plant secrets
- **Escalation**: Conflict, betrayal → hint secrets  
- **Resolution**: Revelations, consequences → reveal truth

---

## CORE PRINCIPLES

- **Actionable** - Player must know exactly what to do
- **Social** - Interaction with other players is primary
- **Coherent** - Fits the world, character, and story
- **Dramatic** - Creates meaningful moments
- **Respectful** - Within player comfort and capability
`;

/**
 * Build action prompt for character
 * @param {Object} character - Character data with memory
 * @param {Array} allCharacters - All characters in the game (for context)
 * @param {Object} gameConfig - Game configuration
 * @param {Array} recentStoryEntries - Recent story entries (from story_recent.json)
 * @param {Function} askLLM - LLM API function
 * @returns {Promise<string>} - Generated instruction
 */
async function buildActionPrompt(character, allCharacters, gameConfig, recentStoryEntries, askLLM) {
    
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
    
    // Build full prompt with inline system prompt
    const fullPrompt = `${SYSTEM_PROMPT}

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
    buildActionPrompt
};

