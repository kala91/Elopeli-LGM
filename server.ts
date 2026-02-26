import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PATHS, GAME, SERVER, ERROR_MESSAGES } from './config/constants';
import {
  loadCharacter,
  saveCharacter,
  loadGameConfig,
  saveGameConfig,
  loadRecentStory,
  appendToRecentStory,
  getAllCharacterIds,
  initializeStory,
  loadDebugPrompts,
  initializeDebugLog,
  clearAllCharacters
} from './utils/dataManager';
import { validatePlayerName, validateLanguage } from './utils/validators';
import { askLLM, API_PROVIDER, MODEL } from './llm/apiClient';
import { buildActionPrompt } from './llm/promptAgent';
import { extractMemories } from './llm/memoryExtractor';
import { buildDramaturgyPrompt } from './llm/dramaturgAgent';
import { createCharacter } from './llm/characterCreator';
import { handleTutorial } from './llm/tutorialAgent';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server);
const GAME_LIBRARY_DIR = PATHS.GAME_LIBRARY;
const EXTRACTION_INTERVAL = GAME.EXTRACTION_INTERVAL;
const EXTRACTION_ON_PLAYER_INPUT = GAME.EXTRACTION_ON_PLAYER_INPUT;
let storyEntryCount = 0;

app.use(express.static('public'));
app.use(express.json());

async function processMemoryExtraction(entry: any): Promise<void> {
  try {
    const shouldExtract = (storyEntryCount % EXTRACTION_INTERVAL === 0) || (EXTRACTION_ON_PLAYER_INPUT && entry.playerSubmitted);
    if (!shouldExtract) return;

    const gameConfig = loadGameConfig();
    const recentStory = loadRecentStory();
    const entriesToAnalyze = recentStory.entries.slice(-15);
    const participantIds = [...new Set(entriesToAnalyze.filter((e: any) => e.targetId && !e.playerJoined).map((e: any) => e.targetId))] as string[];
    if (participantIds.length === 0) return;

    const participantLanguages: Record<string, string> = {};
    for (const charId of participantIds) {
      const char = loadCharacter(charId);
      participantLanguages[charId] = char?.playerMeta?.language || GAME.DEFAULT_LANGUAGE;
    }

    const memories = await extractMemories(entriesToAnalyze, participantIds, gameConfig.availableRelationships, askLLM, participantLanguages);

    for (const [charId, charMemories] of Object.entries(memories)) {
      const character = loadCharacter(charId);
      if (!character) continue;
      if (charMemories.key_moments?.length) {
        character.memory = character.memory || {};
        character.memory.key_moments = character.memory.key_moments || [];
        character.memory.key_moments.push(...charMemories.key_moments);
      }
      if (charMemories.relationshipChanges?.length) {
        character.memory = character.memory || {};
        character.memory.relationships = character.memory.relationships || {};
        for (const relChange of charMemories.relationshipChanges) {
          character.memory.relationships[relChange.targetCharId] = {
            value: relChange.value,
            intensity: relChange.intensity,
            notes: relChange.reason
          };
        }
      }
      saveCharacter(charId, character as any);
      io.emit('character_updated', { charId, character });
    }
  } catch (error) {
    console.error('❌ Memory extraction error:', (error as Error).message);
  }
}

app.get('/api/debug-prompts', (_req, res) => {
  try { res.json(loadDebugPrompts()); } 
  catch { res.status(500).json({ error: ERROR_MESSAGES.ERROR_LOADING_DEBUG_DATA }); }
});

app.get('/api/game-templates', (_req, res) => {
  try {
    if (!fs.existsSync(GAME_LIBRARY_DIR)) fs.mkdirSync(GAME_LIBRARY_DIR, { recursive: true });
    const files = fs.readdirSync(GAME_LIBRARY_DIR).filter(file => file.endsWith('.md') && file !== 'README.md');
    const templates = files.map(file => {
      const content = fs.readFileSync(path.join(GAME_LIBRARY_DIR, file), 'utf8');
      const nameLine = content.split('\n').find(l => l.startsWith('# '));
      return { id: file.replace('.md', ''), name: nameLine ? nameLine.replace('# ', '').trim() : file.replace('.md', ''), format: 'markdown' };
    });
    res.json(templates);
  } catch {
    res.status(500).json({ error: ERROR_MESSAGES.ERROR_LOADING_TEMPLATES });
  }
});

app.get('/api/game-templates/:id', (req, res) => {
  try {
    const filePath = path.join(GAME_LIBRARY_DIR, `${req.params.id}.md`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND });
    res.json({ id: req.params.id, content: fs.readFileSync(filePath, 'utf8') });
  } catch {
    res.status(500).json({ error: ERROR_MESSAGES.ERROR_LOADING_TEMPLATE });
  }
});

app.get('/api/characters', (_req, res) => {
  try { res.json(getAllCharacterIds().map(loadCharacter).filter(Boolean)); }
  catch { res.status(500).json({ error: ERROR_MESSAGES.ERROR_LOADING_CHARACTERS }); }
});

app.get('/api/characters/:id', (req, res) => {
  try {
    const character = loadCharacter(req.params.id);
    if (!character) return res.status(404).json({ error: ERROR_MESSAGES.CHARACTER_NOT_FOUND });
    res.json(character);
  } catch {
    res.status(500).json({ error: ERROR_MESSAGES.ERROR_LOADING_CHARACTER });
  }
});

io.on('connection', socket => {
  socket.on('gm_initialize', async (config: any) => {
    try {
      let setting = config.setting || '';
      let availableRelationships = [...GAME.DEFAULT_RELATIONSHIPS];
      let themes: string[] = [];
      let physicalPropsGuidance = '';
      const templateFiles = fs.existsSync(GAME_LIBRARY_DIR) ? fs.readdirSync(GAME_LIBRARY_DIR).filter(f => f.endsWith('.md') && f !== 'README.md') : [];
      const shouldLoadTemplate = !config.setting || config.setting.trim() === '' || config.templateId;
      const templateToLoad = config.templateId || (templateFiles.length > 0 ? templateFiles[0] : null);
      if (templateToLoad && shouldLoadTemplate) {
        const templateFile = path.join(GAME_LIBRARY_DIR, templateToLoad.endsWith('.md') ? templateToLoad : `${templateToLoad}.md`);
        const templateContent = fs.readFileSync(templateFile, 'utf8');
        setting = templateContent.match(/## Setting\s+([^#]+)/)?.[1]?.trim() || setting;
        const rel = templateContent.match(/## Available Relationships\s+([^\n#]+)/)?.[1];
        if (rel) availableRelationships = rel.split(',').map(r => r.trim());
        const tm = templateContent.match(/## Themes\s+([^\n#]+)/)?.[1];
        if (tm) themes = tm.split(',').map(t => t.trim());
        physicalPropsGuidance = templateContent.match(/## Physical Props Guidance\s+([^#]+)/)?.[1]?.trim() || physicalPropsGuidance;
      }

      const gameConfig: any = {
        setting: setting || config.setting || '',
        currentPhase: { name: 'Alku', description: 'Peli alkaa' },
        availableRelationships,
        physicalPropsGuidance,
        themes,
        gameTimer: {
          mode: config.timedMode ? 'timed' : 'infinite',
          totalMinutes: config.totalMinutes || null,
          startTime: config.timedMode ? new Date().toISOString() : null,
          endTime: config.timedMode && config.totalMinutes ? new Date(Date.now() + config.totalMinutes * 60000).toISOString() : null
        },
        autoPhaseCheck: { enabled: config.autoPhaseCheck || false, intervalMinutes: 15, lastCheck: null }
      };
      saveGameConfig(gameConfig);
      initializeStory();
      if (config.clearWorld || config.clearWorld === undefined) initializeDebugLog();
      clearAllCharacters();
      storyEntryCount = 0;
      io.emit('sync_state', { gameConfig, story: { maxSize: GAME.STORY_RECENT_MAX_SIZE, entries: [] }, characters: [] });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.GAME_INITIALIZATION_FAILED });
    }
  });

  socket.on('join_game', async (data: any) => {
    try {
      const playerName = data.playerName || data.name;
      const nameValidation = validatePlayerName(playerName);
      if (!nameValidation.valid) return socket.emit('error', { message: nameValidation.error });
      const language = data.language || GAME.DEFAULT_LANGUAGE;
      const languageValidation = validateLanguage(language);
      if (!languageValidation.valid) return socket.emit('error', { message: languageValidation.error });
      const gameConfig = loadGameConfig();
      if (!gameConfig.setting) return socket.emit('error', { message: ERROR_MESSAGES.GAME_NOT_INITIALIZED });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.FAILED_TO_JOIN_GAME });
    }
  });

  socket.on('trigger_scene', async (data: any) => {
    try {
      const character = loadCharacter(data.charId);
      if (!character) return socket.emit('error', { message: ERROR_MESSAGES.CHARACTER_NOT_FOUND });
      const instruction = await buildActionPrompt(character, getAllCharacterIds().map(loadCharacter).filter(Boolean), loadGameConfig(), loadRecentStory().entries, askLLM);
      const newEntry: any = { id: Date.now(), timestamp: new Date().toLocaleTimeString('fi-FI'), targetChar: character.name, targetId: character.id, instruction, playerJoined: false, playerSubmitted: false };
      appendToRecentStory(newEntry); storyEntryCount++; io.emit('story_update', newEntry);
      setImmediate(() => processMemoryExtraction(newEntry));
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.FAILED_TO_GENERATE_PROMPT });
    }
  });

  socket.on('player_tutorial', async (data: any) => {
    try {
      const result = await handleTutorial(data.playerName, data.message, loadGameConfig(), getAllCharacterIds().map(loadCharacter).filter(Boolean), loadRecentStory().entries || [], data.language || 'fi', data.conversationHistory || [], askLLM);
      socket.emit('tutorial_response', { response: result.response, createCharacter: result.toolCall?.tool === 'createCharacter' });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.TUTORIAL_FAILED });
    }
  });

  socket.on('create_character', async (data: any) => {
    try {
      const { playerName, language, tutorialHistory } = data;
      const charId = playerName.toLowerCase().replace(/\s+/g, '_');
      if (loadCharacter(charId)) return socket.emit('error', { message: 'Character already exists' });
      const gameConfig = loadGameConfig();
      const existingCharacters = getAllCharacterIds().map(loadCharacter).filter(Boolean);
      const characterWishes = tutorialHistory?.filter((msg: any) => msg.role === 'player').map((msg: any) => msg.content).join(' | ') || '';
      const generated = await createCharacter(playerName, existingCharacters, gameConfig, language || 'fi', askLLM, characterWishes);
      const character: any = { id: charId, name: playerName, ...generated, status: 'active', memory: { key_moments: [], relationships: {} }, playerMeta: { language: language || 'fi', joinedAt: new Date().toISOString(), sessionCount: 1 } };
      saveCharacter(charId, character); io.emit('character_created', { character });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.CHARACTER_CREATION_FAILED });
    }
  });

  socket.on('player_action', async (data: any) => {
    try {
      const character = loadCharacter(data.charId);
      if (!character) return socket.emit('error', { message: ERROR_MESSAGES.CHARACTER_NOT_FOUND });
      const newEntry = { id: Date.now(), timestamp: new Date().toLocaleTimeString('fi-FI'), targetChar: character.name, targetId: character.id, instruction: `[PELAAJAN TOIMINTA] ${data.action}`, playerJoined: false, playerSubmitted: true };
      appendToRecentStory(newEntry); storyEntryCount++; io.emit('story_update', newEntry); setImmediate(() => processMemoryExtraction(newEntry)); socket.emit('action_received', { success: true });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.FAILED_TO_SUBMIT_ACTION });
    }
  });

  socket.on('update_setting', (data: any) => {
    const gameConfig = loadGameConfig(); gameConfig.setting = data.setting; saveGameConfig(gameConfig); io.emit('game_config_updated', gameConfig);
  });
  socket.on('update_game_phase', (data: any) => {
    const gameConfig = loadGameConfig(); gameConfig.currentPhase = { name: data.phase, description: data.description || '', lastUpdate: new Date().toISOString() }; saveGameConfig(gameConfig); io.emit('game_config_updated', gameConfig);
  });
  socket.on('analyze_game_state', async () => {
    try {
      const gameConfig = loadGameConfig();
      const analysis = await buildDramaturgyPrompt(gameConfig, loadRecentStory().entries, askLLM);
      gameConfig.currentPhase.description = analysis.substring(0, 500);
      gameConfig.currentPhase.lastUpdate = new Date().toISOString();
      saveGameConfig(gameConfig);
      io.emit('game_analysis_result', { analysis, timestamp: new Date().toISOString() });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.ANALYSIS_FAILED });
    }
  });
});

const PORT = SERVER.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Digital LARP Engine running on port ${PORT}`);
  console.log(`📊 API Provider: ${API_PROVIDER}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🧠 Memory Extraction: Every ${EXTRACTION_INTERVAL} prompts + player inputs`);
});
