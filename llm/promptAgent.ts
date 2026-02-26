const SYSTEM_PROMPT = `You are a digital dramaturg for railroaded live roleplay. Generate one concrete action.`;

export async function buildActionPrompt(
  character: any,
  allCharacters: any[],
  gameConfig: any,
  recentStoryEntries: any[],
  askLLM: (prompt: string, promptType?: string, characterName?: string, metadata?: Record<string, unknown>) => Promise<string>
): Promise<string> {
  const recentHistory = recentStoryEntries.slice(-10).map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction}`).join('\n');
  const others = allCharacters.filter(c => c.id !== character.id).map(c => `- ${c.name}: ${c.description || ''}`).join('\n');
  const prompt = `${SYSTEM_PROMPT}\nSetting: ${gameConfig.setting}\nPhase: ${gameConfig.currentPhase?.name}\nOther characters:\n${others}\nRecent:\n${recentHistory || 'Game just started.'}\nGenerate for ${character.name}.`;
  try {
    const response = await askLLM(prompt, 'scene_generation', character.name, { module: 'PromptAgent' });
    return response.trim();
  } catch {
    return '[ERROR] Ei voitu generoida promptia. Kokeile uudelleen.';
  }
}
