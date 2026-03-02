export async function createCharacterAgent(
  playerName: string,
  existingCharacters: any[],
  gameConfig: any,
  language = 'fi',
  askLLM: (prompt: string, promptType?: string, characterName?: string, metadata?: Record<string, unknown>) => Promise<string>,
  characterWishes = '',
  tutorialConversation: Array<{ role: string; content: string }> = []
): Promise<any> {
  const existingCharsContext = existingCharacters?.length
    ? '\n\n## EXISTING CHARACTERS\n' + existingCharacters.map(c => `- ${c.name}: ${c.description || 'character in game'}`).join('\n')
    : '';
  const wishesContext = characterWishes?.trim()
    ? `\n\n## PLAYER WISHES\n${characterWishes}`
    : '';

  const tutorialConversationContext = tutorialConversation?.length
    ? '\n\n## TUTORIAL CONVERSATION (MOST IMPORTANT CONTEXT)\n' + tutorialConversation.map(msg => `- ${msg.role}: ${msg.content}`).join('\n')
    : '';

  const prompt = `Create character JSON for player ${playerName}.\nSetting: ${gameConfig.setting}\nThemes: ${(gameConfig.themes || []).join(', ')}\nRelationships: ${(gameConfig.availableRelationships || []).join(', ')}${existingCharsContext}${wishesContext}${tutorialConversationContext}\nLanguage: ${language}.\n\nRequirements:\n- Keep the character strictly consistent with PLAYER WISHES and TUTORIAL CONVERSATION.\n- Do not invent a contradictory archetype.\n- Return ONLY JSON with description, personality[], goals[], relationships[]. Description must be markdown-formatted with short paragraphs and bullet points (not one text block).`;

  try {
    const response = await askLLM(prompt, 'character_generation', playerName, { module: 'CharacterCreatorAgent' });
    const match = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/{[\s\S]*}/);
    if (!match) throw new Error('No JSON');
    return JSON.parse(match[0].replace(/```json\n?/, '').replace(/\n?```/, ''));
  } catch {
    return { description: `A character in ${gameConfig.setting || 'this game'}.`, personality: [], goals: [], relationships: [] };
  }
}
