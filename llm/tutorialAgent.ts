function extractFirstJsonObject(raw: string): string | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] || raw).trim();
  if (candidate.startsWith('{') && candidate.endsWith('}')) return candidate;

  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  return objectMatch ? objectMatch[0] : null;
}

export async function handleTutorial(
  playerName: string,
  playerQuestion: string,
  gameConfig: any,
  existingCharacters: any[],
  recentStory: any[] = [],
  language = 'fi',
  conversationHistory: Array<{ role: string; content: string }> = [],
  askLLM: (prompt: string, promptType?: string, characterName?: string, metadata?: Record<string, unknown>) => Promise<string>
): Promise<{ response: string | null; toolCall: Record<string, unknown> | null }> {
  const setting = gameConfig.setting || 'Peli on juuri alkanut';
  const themes = gameConfig.themes?.join(', ') || 'Ei teemoja';
  const phase = gameConfig.currentPhase?.name || 'Alku';
  const relationships = (gameConfig.availableRelationships || []).join(', ') || 'Ei määritelty';
  const propsGuidance = gameConfig.physicalPropsGuidance || 'Ei erillistä ohjetta';
  const gameConfigSnapshot = JSON.stringify({
    setting: gameConfig.setting || '',
    currentPhase: gameConfig.currentPhase || null,
    themes: gameConfig.themes || [],
    availableRelationships: gameConfig.availableRelationships || [],
    physicalPropsGuidance: gameConfig.physicalPropsGuidance || ''
  }, null, 2);
  const existingCharsInfo = existingCharacters?.length > 0
    ? '\n\nOLEMASSA OLEVAT HAHMOT:\n' + existingCharacters.map(c => `- ${c.name}: ${c.description}`).join('\n')
    : '\n\nEi vielä hahmoja pelissä. Olet ensimmäinen!';

  const storyInfo = recentStory?.length > 0
    ? `\n\nVIIMEISIMMÄT TAPAHTUMAT:\n${recentStory.slice(-5).map(e => `[${e.timestamp}] ${e.targetChar || 'Unknown'}: ${e.instruction}`).join('\n')}`
    : '';

  const responseLanguage = language === 'fi' ? 'in Finnish (suomeksi)' : language === 'sv' ? 'in Swedish (på svenska)' : 'in English';
  const conversationContext = conversationHistory.length > 0
    ? '\n\nCONVERSATION HISTORY:\n' + conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
    : '';

  const tutorialPrompt = `You are the tutorial assistant for Digital LARP character onboarding.
GAME SETTING (FULL): ${setting}
PHASE: ${phase}
THEMES: ${themes}
AVAILABLE RELATIONSHIPS: ${relationships}
PHYSICAL PROPS GUIDANCE: ${propsGuidance}
GAME CONFIG JSON SNAPSHOT:
${gameConfigSnapshot}${existingCharsInfo}${storyInfo}${conversationContext}
Player: ${playerName}
Latest message: ${playerQuestion}

You must ALWAYS return ONLY valid JSON using this exact schema:
{
  "message": "string",
  "continueToCharacterCreation": true,
  "playerWishes": "string"
}

Rules:
- continueToCharacterCreation must be true ONLY when enough info exists to generate a playable character.
- If continueToCharacterCreation is false, playerWishes must be an empty string.
- If continueToCharacterCreation is true, playerWishes must summarize player wishes concretely for character generator.
- message is always player-facing tutorial text.
- Do not output markdown, tags, or any extra text outside JSON.

Respond ${responseLanguage}.`;

  try {
    const response = await askLLM(tutorialPrompt, 'tutorial', playerName, { module: 'TutorialAgent' });
    const jsonRaw = extractFirstJsonObject(response);
    if (!jsonRaw) throw new Error('Tutorial JSON missing');

    const parsed = JSON.parse(jsonRaw);
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
    const continueToCharacterCreation = parsed.continueToCharacterCreation === true;
    const playerWishes = continueToCharacterCreation && typeof parsed.playerWishes === 'string'
      ? parsed.playerWishes.trim()
      : '';

    return {
      response: message || null,
      toolCall: continueToCharacterCreation ? { tool: 'createCharacter', playerWishes } : null
    };
  } catch {
    const fallbackMessage: Record<string, string> = {
      fi: `Tervetuloa peliin, ${playerName}! Kerro yksi lause hahmostasi ja miksi hän on tässä tilanteessa.`,
      en: `Welcome to the game, ${playerName}! Give one sentence about your character and their motivation.`,
      sv: `Välkommen till spelet, ${playerName}! Beskriv din roll och motivation i en mening.`
    };
    return { response: fallbackMessage[language] || fallbackMessage.fi, toolCall: null };
  }
}
