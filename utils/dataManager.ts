import fs from 'fs';
import path from 'path';
import { PATHS, GAME } from '../config/constants';

export type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface StoryEntry {
  id?: number;
  timestamp: string;
  targetChar?: string;
  targetId?: string;
  instruction?: string;
  playerJoined?: boolean;
  playerSubmitted?: boolean;
  [key: string]: unknown;
}

export interface StoryData {
  maxSize: number;
  entries: StoryEntry[];
}

export interface GameConfig {
  setting: string;
  currentPhase: { name: string; description: string; lastUpdate?: string };
  availableRelationships: string[];
  physicalPropsGuidance: string;
  themes: string[];
  gameTimer: { mode: string; totalMinutes: number | null; startTime: string | null; endTime: string | null };
  autoPhaseCheck: { enabled: boolean; intervalMinutes: number; lastCheck: string | null };
  gmNotes?: Array<{ content: string; timestamp: string }>;
  [key: string]: unknown;
}

export interface CharacterData {
  id: string;
  name: string;
  description?: string;
  personality?: string[];
  goals?: string[];
  memory?: {
    key_moments?: Array<Record<string, unknown>>;
    relationships?: Record<string, { value: string; intensity: number; notes?: string }>;
  };
  playerMeta?: { language?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    console.error(`❌ Error reading JSON file ${filePath}:`, (error as Error).message);
    return defaultValue;
  }
}

export function writeJSONFile(filePath: string, data: unknown): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error writing JSON file ${filePath}:`, (error as Error).message);
    return false;
  }
}

export function loadCharacter(charId: string): CharacterData | null {
  return readJSONFile<CharacterData | null>(path.join(PATHS.CHARACTERS_DIR, `${charId}.json`), null);
}

export function saveCharacter(charId: string, data: CharacterData): boolean {
  return writeJSONFile(path.join(PATHS.CHARACTERS_DIR, `${charId}.json`), data);
}

export function getAllCharacterIds(): string[] {
  try {
    if (!fs.existsSync(PATHS.CHARACTERS_DIR)) return [];
    return fs.readdirSync(PATHS.CHARACTERS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } catch (error) {
    console.error('❌ Error reading characters directory:', (error as Error).message);
    return [];
  }
}

export function getAllCharacters(): CharacterData[] {
  return getAllCharacterIds().map(loadCharacter).filter((c): c is CharacterData => c !== null);
}

export function loadGameConfig(): GameConfig {
  const defaultConfig: GameConfig = {
    setting: '',
    currentPhase: { name: 'Alku', description: '' },
    availableRelationships: GAME.DEFAULT_RELATIONSHIPS,
    physicalPropsGuidance: '',
    themes: [],
    gameTimer: { mode: 'infinite', totalMinutes: null, startTime: null, endTime: null },
    autoPhaseCheck: { enabled: false, intervalMinutes: 15, lastCheck: null }
  };
  return readJSONFile(PATHS.GAME_CONFIG, defaultConfig);
}

export function saveGameConfig(config: GameConfig): boolean {
  return writeJSONFile(PATHS.GAME_CONFIG, config);
}

export function loadRecentStory(): StoryData {
  return readJSONFile<StoryData>(PATHS.STORY_RECENT, { maxSize: GAME.STORY_RECENT_MAX_SIZE, entries: [] });
}

export function appendToRecentStory(entry: StoryEntry): StoryData {
  const story = loadRecentStory();
  story.entries.push(entry);
  if (story.entries.length > story.maxSize) story.entries.splice(0, story.entries.length - story.maxSize);
  writeJSONFile(PATHS.STORY_RECENT, story);
  return story;
}

export function initializeStory(): boolean {
  return writeJSONFile(PATHS.STORY_RECENT, { maxSize: GAME.STORY_RECENT_MAX_SIZE, entries: [] });
}

export function loadDebugPrompts(): Array<Record<string, unknown>> {
  return readJSONFile<Array<Record<string, unknown>>>(PATHS.PROMPT_DEBUG, []);
}

export function saveDebugPrompts(debugLog: Array<Record<string, unknown>>): boolean {
  return writeJSONFile(PATHS.PROMPT_DEBUG, debugLog);
}

export function initializeDebugLog(): boolean {
  return writeJSONFile(PATHS.PROMPT_DEBUG, []);
}

export function clearAllCharacters(): boolean {
  try {
    if (fs.existsSync(PATHS.CHARACTERS_DIR)) {
      fs.readdirSync(PATHS.CHARACTERS_DIR).forEach(f => fs.unlinkSync(path.join(PATHS.CHARACTERS_DIR, f)));
    } else {
      fs.mkdirSync(PATHS.CHARACTERS_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('❌ Error clearing characters:', (error as Error).message);
    return false;
  }
}
