export async function buildDramaturgyPrompt(
  gameConfig: any,
  recentStoryEntries: any[],
  askLLM: (prompt: string, promptType?: string, characterName?: string, metadata?: Record<string, unknown>) => Promise<string>
): Promise<string> {
  const recentHistory = recentStoryEntries.slice(-30).map(e => `[${e.timestamp}] ${e.targetChar}: ${e.instruction}`).join('\n');
  let timeContext = '';
  if (gameConfig.gameTimer?.mode === 'timed' && gameConfig.gameTimer.endTime) {
    const now = new Date();
    const start = new Date(gameConfig.gameTimer.startTime);
    const end = new Date(gameConfig.gameTimer.endTime);
    const percentComplete = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    const remainingMinutes = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
    timeContext = `Remaining: ${remainingMinutes} min (${percentComplete.toFixed(0)}% complete)`;
  }

  const prompt = `Analyze LARP dramaturgy. Setting: ${gameConfig.setting}\nThemes: ${(gameConfig.themes || []).join(', ')}\nPhase: ${gameConfig.currentPhase?.name}\n${timeContext}\nRecent:\n${recentHistory || 'No activity yet.'}\nReturn concise analysis.`;
  try {
    const response = await askLLM(prompt, 'dramaturgy_analysis', 'DramaturgAgent', { module: 'DramaturgAgent' });
    return response.trim();
  } catch {
    return '[ERROR] Could not analyze game state.';
  }
}
