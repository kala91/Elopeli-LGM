function safeJsonParse(raw: string): any | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] || raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

export type SceneCharacterUpdate = {
  charIdOrName: string;
  keyMoments?: string[];
  relationshipChanges?: Array<{
    targetCharIdOrName: string;
    value: string;
    intensity: number;
    notes?: string;
  }>;
};

export type SceneGenerationResult = {
  instruction: string;
  characterUpdates: SceneCharacterUpdate[];
};

const SYSTEM_PROMPT = `You are a digital dramaturg for railroaded live roleplay.
Generate exactly one concrete instruction for this player.
Do NOT ask the player what they do next.
Do NOT output multiple-choice alternatives.
The player acts in real life with other humans.
If you introduce a new concrete physical item not explicitly in the setting context, mark it clearly with prefix [UUSI REKVISIITTA].`;

export async function buildActionPrompt(
  character: any,
  allCharacters: any[],
  gameConfig: any,
  recentStoryEntries: any[],
  askLLM: (prompt: string, promptType?: string, characterName?: string, metadata?: Record<string, unknown>) => Promise<string>
): Promise<SceneGenerationResult> {
  const recentHistory = recentStoryEntries
    .slice(-10)
    .map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction}`)
    .join('\n');
  const others = allCharacters
    .filter(c => c.id !== character.id)
    .map(c => `- ${c.name} (${c.id}): ${c.description || ''}`)
    .join('\n');

  const memoryContext = JSON.stringify(character.memory || { key_moments: [], relationships: {} }, null, 2);

  const prompt = `${SYSTEM_PROMPT}
Setting: ${gameConfig.setting}
Phase: ${gameConfig.currentPhase?.name}
Character: ${character.name} (${character.id})
Character memory:
${memoryContext}
Other characters:
${others || '- none yet'}
Physical props guidance: ${gameConfig.physicalPropsGuidance || 'No special guidance'}
Recent:
${recentHistory || 'Game just started.'}

Important constraints:
- Do not assume non-existing real-world props as already present.
- If a new physical item is dramaturgically needed, format it as [UUSI REKVISIITTA] Item name: brief creation/use hint.

Return ONLY JSON in this exact shape:
{
  "instruction": "Markdown-formatted actionable instruction in second person (2-5 short paragraphs, no question at end)",
  "characterUpdates": [
    {
      "charIdOrName": "character id or name",
      "keyMoments": ["new memory sentence"],
      "relationshipChanges": [
        {
          "targetCharIdOrName": "id or name",
          "value": "trust|suspect|romantic|alliance|rivalry|fear",
          "intensity": 1,
          "notes": "short reason"
        }
      ]
    }
  ]
}`;

  try {
    const response = await askLLM(prompt, 'scene_generation', character.name, { module: 'PromptAgent' });
    const parsed = safeJsonParse(response);
    if (!parsed || typeof parsed.instruction !== 'string') {
      return { instruction: response.trim(), characterUpdates: [] };
    }

    const characterUpdates = Array.isArray(parsed.characterUpdates) ? parsed.characterUpdates : [];
    return { instruction: parsed.instruction.trim(), characterUpdates };
  } catch {
    return {
      instruction: '[ERROR] Ei voitu generoida promptia. Kokeile uudelleen.',
      characterUpdates: []
    };
  }
}
