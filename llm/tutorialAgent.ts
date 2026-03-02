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
  let existingCharsInfo = '';
  if (existingCharacters?.length > 0) {
    existingCharsInfo = '\n\nOLEMASSA OLEVAT HAHMOT:\n' + existingCharacters.map(c => `- ${c.name}: ${c.description}`).join('\n');
  } else {
    existingCharsInfo = '\n\nEi vielä hahmoja pelissä. Olet ensimmäinen!';
  }

  let storyInfo = '';
  if (recentStory?.length > 0) {
    const recentEvents = recentStory.slice(-5).map(e => `[${e.timestamp}] ${e.targetChar || 'Unknown'}: ${e.instruction}`).join('\n');
    storyInfo = `\n\nVIIMEISIMMÄT TAPAHTUMAT:\n${recentEvents}`;
  }

  const responseLanguage = language === 'fi' ? 'in Finnish (suomeksi)' : language === 'sv' ? 'in Swedish (på svenska)' : 'in English';
  const conversationContext = conversationHistory.length > 0
    ? '\n\nCONVERSATION HISTORY:\n' + conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
    : '';

  const tutorialPrompt = `You are the CHARACTER CREATION assistant for a railroaded Digital LARP game.
GAME SETTING: ${setting}
THEMES: ${themes}${existingCharsInfo}${storyInfo}${conversationContext}
Player: ${playerName}
Latest message: ${playerQuestion}

Rules:
- Your job in this mode is ONLY character creation.
- Ask at most one short open question at a time, only if required details are missing.
- NEVER use multiple-choice formatting unless player explicitly requests options.
- As soon as you have enough to create a playable character (name + concept + one motivation), call tool immediately with <TOOL_CALL>{"tool":"createCharacter","playerWishes":"..."}</TOOL_CALL>.
- After tool call, keep any additional text brief and supportive.

Respond ${responseLanguage}.`;

  try {
    const response = await askLLM(tutorialPrompt, 'tutorial', playerName, { module: 'TutorialAgent' });
    const toolCallMatch = response.match(/<TOOL_CALL>\s*(\{[^}]+\})\s*<\/TOOL_CALL>/s);
    if (toolCallMatch) {
      try {
        const toolCall = JSON.parse(toolCallMatch[1]);
        const textResponse = response.replace(/<TOOL_CALL>[\s\S]*<\/TOOL_CALL>/, '').trim();
        return { response: textResponse || null, toolCall };
      } catch {
        return { response: response.trim(), toolCall: null };
      }
    }
    return { response: response.trim(), toolCall: null };
  } catch {
    const fallbacks: Record<string, string> = {
      fi: `Tervetuloa peliin, ${playerName}! Tämä on improvisaatio-LARP-peli.`,
      en: `Welcome to the game, ${playerName}! This is an improvisation LARP game.`,
      sv: `Välkommen till spelet, ${playerName}! Detta är ett improvisations-LARP-spel.`
    };
    return { response: fallbacks[language] || fallbacks.fi, toolCall: null };
  }
}
