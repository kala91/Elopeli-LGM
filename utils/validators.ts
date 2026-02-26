import { LANGUAGES, VALIDATION_LIMITS, ERROR_MESSAGES } from '../config/constants';

export function validatePlayerName(name: unknown): { valid: boolean; error: string | null } {
  if (!name || typeof name !== 'string') return { valid: false, error: ERROR_MESSAGES.PLAYER_NAME_REQUIRED };
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: ERROR_MESSAGES.PLAYER_NAME_REQUIRED };
  if (trimmed.length > VALIDATION_LIMITS.PLAYER_NAME_MAX_LENGTH) {
    return { valid: false, error: `Player name too long (max ${VALIDATION_LIMITS.PLAYER_NAME_MAX_LENGTH} characters)` };
  }
  if (!/^[\p{L}\p{N}\s._-]+$/u.test(trimmed)) return { valid: false, error: 'Player name contains invalid characters' };
  return { valid: true, error: null };
}

export function validateLanguage(lang: unknown): { valid: boolean; error: string | null } {
  if (!lang || typeof lang !== 'string') return { valid: false, error: 'Language code is required' };
  if (!LANGUAGES[lang]) return { valid: false, error: `Unsupported language: ${lang}` };
  return { valid: true, error: null };
}

export function validateCharacterId(charId: unknown): { valid: boolean; error: string | null } {
  if (!charId || typeof charId !== 'string') return { valid: false, error: 'Character ID is required' };
  if (!/^[a-z0-9_]+$/.test(charId)) return { valid: false, error: 'Invalid character ID format' };
  if (charId.length > VALIDATION_LIMITS.CHARACTER_ID_MAX_LENGTH) {
    return { valid: false, error: `Character ID too long (max ${VALIDATION_LIMITS.CHARACTER_ID_MAX_LENGTH} characters)` };
  }
  return { valid: true, error: null };
}

export function sanitizeText(text: unknown, maxLength = VALIDATION_LIMITS.TEXT_MEDIUM_MAX_LENGTH): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim().substring(0, maxLength);
}

export function validateGameSetting(setting: unknown): { valid: boolean; error: string | null } {
  if (!setting || typeof setting !== 'string') return { valid: false, error: 'Game setting is required' };
  const trimmed = setting.trim();
  if (trimmed.length < VALIDATION_LIMITS.GAME_SETTING_MIN_LENGTH) {
    return { valid: false, error: `Game setting too short (minimum ${VALIDATION_LIMITS.GAME_SETTING_MIN_LENGTH} characters)` };
  }
  if (trimmed.length > VALIDATION_LIMITS.TEXT_LONG_MAX_LENGTH) {
    return { valid: false, error: `Game setting too long (maximum ${VALIDATION_LIMITS.TEXT_LONG_MAX_LENGTH} characters)` };
  }
  return { valid: true, error: null };
}

export function validateConversationHistory(history: unknown): Array<{ role: 'player' | 'assistant'; content: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .filter((msg): msg is { role: string; content: string } => !!msg && typeof msg === 'object' && 'role' in msg && 'content' in msg)
    .map(msg => ({
      role: msg.role === 'player' || msg.role === 'user' ? 'player' : 'assistant',
      content: sanitizeText(msg.content, VALIDATION_LIMITS.TEXT_SHORT_MAX_LENGTH)
    }))
    .slice(-20);
}
