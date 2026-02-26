import { LANGUAGES, GAME } from '../config/constants';

export async function extractMemoriesAgent(
  recentEntries: any[],
  participantCharIds: string[],
  availableRelationships: string[],
  askLLM: (prompt: string, promptType?: string, characterName?: string, metadata?: Record<string, unknown>) => Promise<string>,
  participantLanguages: Record<string, string> = {}
): Promise<Record<string, any>> {
  if (!askLLM || recentEntries.length === 0 || participantCharIds.length === 0) return {};

  const storyContext = recentEntries.map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction}`).join('\n');
  const relationshipTypes = availableRelationships.join(', ');
  const participantsWithLanguages = participantCharIds.map(charId => {
    const lang = participantLanguages[charId] || GAME.DEFAULT_LANGUAGE;
    return `${charId} (${LANGUAGES[lang] || LANGUAGES[GAME.DEFAULT_LANGUAGE]})`;
  }).join(', ');

  const prompt = `Extract dramatic memory moments from entries. Participants: ${participantsWithLanguages}. Allowed relationships: ${relationshipTypes}. Entries:\n${storyContext}\nReturn ONLY JSON by charId with key_moments[] and relationshipChanges[].`;

  try {
    const response = await askLLM(prompt, 'memory_extraction', 'MemoryExtractorAgent', { useAnalyzerModel: true, module: 'MemoryExtractorAgent' });
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/{[\s\S]*}/);
    if (!jsonMatch) return {};
    const cleanJson = jsonMatch[0].replace(/```json\n?/, '').replace(/\n?```/, '');
    const memories = JSON.parse(cleanJson);
    for (const charId of Object.keys(memories)) {
      memories[charId].key_moments = (memories[charId].key_moments || []).map((moment: any) => ({ ...moment, timestamp: new Date().toISOString() }));
      memories[charId].relationshipChanges = memories[charId].relationshipChanges || [];
    }
    return memories;
  } catch {
    return {};
  }
}
