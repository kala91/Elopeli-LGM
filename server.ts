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
import { askLLM, API_PROVIDER, MODEL, OLLAMA_BASE_URL, OLLAMA_MODEL, OPENROUTER_MODEL } from './llm/apiClient';
import { buildActionPrompt } from './llm/promptAgent';
import { extractMemoriesAgent } from './llm/memoryExtractorAgent';
import { buildDramaturgyPrompt } from './llm/dramaturgAgent';
import { createCharacterAgent } from './llm/characterCreatorAgent';
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

    const memories = await extractMemoriesAgent(entriesToAnalyze, participantIds, gameConfig.availableRelationships, askLLM, participantLanguages);

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


app.get('/api/default-config', (_req, res) => {
  try {
    const gameConfig = loadGameConfig();
    res.json({
      setting: gameConfig.setting || '',
      charPromptTemplate: '',
      scenePromptTemplate: '',
      llm: gameConfig.llm || {
        provider: API_PROVIDER === 'openrouter' ? 'openrouter' : 'ollama',
        model: MODEL,
        baseUrl: OLLAMA_BASE_URL,
        apiKey: '',
        useStoredSecret: true
      },
      defaults: {
        ollamaBaseUrl: OLLAMA_BASE_URL,
        ollamaModel: OLLAMA_MODEL,
        openrouterModel: OPENROUTER_MODEL
      }
    });
  } catch {
    res.status(500).json({ error: 'Virhe ladattaessa oletuskonfiguraatiota' });
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
  const eventCounters: Record<string, number> = {
    trigger_scene: 0,
    player_action: 0,
    player_tutorial: 0,
    create_character: 0
  };

  function bumpEventCounter(eventName: keyof typeof eventCounters, context: Record<string, unknown> = {}): void {
    eventCounters[eventName] += 1;
    console.log(`📡 socket:${socket.id} ${eventName}#${eventCounters[eventName]}`, context);
  }

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

      const provider = config.llm?.provider === 'openrouter' ? 'openrouter' : 'ollama';
      const defaultLlmModel = provider === 'openrouter' ? OPENROUTER_MODEL : OLLAMA_MODEL;

      const gameConfig: any = {
        setting: setting || config.setting || '',
        currentPhase: { name: 'Alku', description: 'Peli alkaa' },
        availableRelationships,
        physicalPropsGuidance,
        themes,
        llm: {
          provider,
          model: (config.llm?.model || defaultLlmModel).trim(),
          baseUrl: (config.llm?.baseUrl || OLLAMA_BASE_URL).trim().replace(/\/$/, ''),
          apiKey: (config.llm?.apiKey || '').trim(),
          useStoredSecret: config.llm?.useStoredSecret !== false
        },
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

      socket.emit('join_ack', { success: true, playerName, language });
      io.emit('player_joined', {
        playerName,
        language,
        joinedAt: new Date().toISOString()
      });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.FAILED_TO_JOIN_GAME });
    }
  });

  socket.on('trigger_scene', async (data: any) => {
    try {
      bumpEventCounter('trigger_scene', { charId: data?.charId, hasPlayerInput: Boolean(data?.playerInput) });
      const character = loadCharacter(data.charId);
      if (!character) return socket.emit('error', { message: ERROR_MESSAGES.CHARACTER_NOT_FOUND });
      const allCharacters = getAllCharacterIds().map(loadCharacter).filter(Boolean);
      const recentEntries = loadRecentStory().entries;
      console.log('🧩 trigger_scene context', {
        targetCharId: character.id,
        targetCharName: character.name,
        totalCharacters: allCharacters.length,
        recentEntriesCount: recentEntries.length,
        recentEntriesForPrompt: Math.min(recentEntries.length, 10)
      });
      const instruction = await buildActionPrompt(character, allCharacters, loadGameConfig(), recentEntries, askLLM);
      const newEntry: any = { id: Date.now(), timestamp: new Date().toLocaleTimeString('fi-FI'), targetChar: character.name, targetId: character.id, instruction, playerJoined: false, playerSubmitted: false };
      appendToRecentStory(newEntry); storyEntryCount++; io.emit('story_update', newEntry);
      setImmediate(() => processMemoryExtraction(newEntry));
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.FAILED_TO_GENERATE_PROMPT });
    }
  });

  socket.on('player_tutorial', async (data: any) => {
    try {
      bumpEventCounter('player_tutorial', {
        playerName: data?.playerName,
        language: data?.language,
        messageLength: (data?.message || '').length,
        historyCount: data?.conversationHistory?.length || 0
      });
      const result = await handleTutorial(data.playerName, data.message, loadGameConfig(), getAllCharacterIds().map(loadCharacter).filter(Boolean), loadRecentStory().entries || [], data.language || 'fi', data.conversationHistory || [], askLLM);
      socket.emit('tutorial_response', { response: result.response, createCharacter: result.toolCall?.tool === 'createCharacter' });
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.TUTORIAL_FAILED });
    }
  });

  socket.on('create_character', async (data: any) => {
    try {
      bumpEventCounter('create_character', {
        playerName: data?.playerName,
        language: data?.language,
        tutorialHistoryCount: data?.tutorialHistory?.length || 0
      });
      const { playerName, language, tutorialHistory } = data;
      const charId = playerName.toLowerCase().replace(/\s+/g, '_');
      if (loadCharacter(charId)) return socket.emit('error', { message: 'Character already exists' });
      const gameConfig = loadGameConfig();
      const existingCharacters = getAllCharacterIds().map(loadCharacter).filter(Boolean);
      const characterWishes = tutorialHistory?.filter((msg: any) => msg.role === 'player').map((msg: any) => msg.content).join(' | ') || '';
      const generated = await createCharacterAgent(playerName, existingCharacters, gameConfig, language || 'fi', askLLM, characterWishes);
      const character: any = { id: charId, name: playerName, ...generated, status: 'active', memory: { key_moments: [], relationships: {} }, playerMeta: { language: language || 'fi', joinedAt: new Date().toISOString(), sessionCount: 1 } };
      saveCharacter(charId, character);
      socket.emit('character_created', { character });
      io.emit('character_created', { character });
      io.emit('character_joined', character);
    } catch {
      socket.emit('error', { message: ERROR_MESSAGES.CHARACTER_CREATION_FAILED });
    }
  });

  socket.on('player_action', async (data: any) => {
    try {
      bumpEventCounter('player_action', { charId: data?.charId, actionLength: (data?.action || '').length });
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
  socket.on('update_player_meta', (data: any) => {
    try {
      const character = loadCharacter(data.charId);
      if (!character) return socket.emit('error', { message: ERROR_MESSAGES.CHARACTER_NOT_FOUND });
      character.playerMeta = { ...(character.playerMeta || {}), ...(data.meta || {}) };
      saveCharacter(data.charId, character as any);
      socket.emit('meta_updated', { charId: data.charId, meta: character.playerMeta });
      io.emit('character_updated', { charId: data.charId, character });
    } catch {
      socket.emit('error', { message: 'Failed to update player metadata' });
    }
  });
  socket.on('update_game_timer', (data: any) => {
    try {
      const gameConfig = loadGameConfig();
      const mode = data?.timer?.mode === 'timed' ? 'timed' : 'infinite';
      const totalMinutesRaw = Number(data?.timer?.totalMinutes);
      const totalMinutes = Number.isFinite(totalMinutesRaw) && totalMinutesRaw > 0 ? totalMinutesRaw : null;
      gameConfig.gameTimer = {
        mode,
        totalMinutes,
        startTime: mode === 'timed' ? new Date().toISOString() : null,
        endTime: mode === 'timed' && totalMinutes ? new Date(Date.now() + totalMinutes * 60000).toISOString() : null
      };
      saveGameConfig(gameConfig);
      io.emit('timer_updated', gameConfig.gameTimer);
      io.emit('game_config_updated', gameConfig);
    } catch {
      socket.emit('error', { message: 'Failed to update timer' });
    }
  });
  socket.on('update_game_phase', (data: any) => {
    const phaseName = (data?.phaseName || data?.phase || '').trim();
    if (!phaseName) return socket.emit('error', { message: 'Phase name is required' });
    const gameConfig = loadGameConfig();
    gameConfig.currentPhase = { name: phaseName, description: data.description || gameConfig.currentPhase?.description || '', lastUpdate: new Date().toISOString() };
    saveGameConfig(gameConfig);
    io.emit('phase_updated', { phase: phaseName, description: gameConfig.currentPhase.description });
    io.emit('game_config_updated', gameConfig);
  });
  socket.on('toggle_auto_phase_check', (data: any) => {
    try {
      const gameConfig = loadGameConfig();
      gameConfig.autoPhaseCheck = {
        enabled: Boolean(data?.enabled),
        intervalMinutes: Number(data?.intervalMinutes) || 15,
        lastCheck: gameConfig.autoPhaseCheck?.lastCheck || null
      };
      saveGameConfig(gameConfig);
      io.emit('game_config_updated', gameConfig);
    } catch {
      socket.emit('error', { message: 'Failed to update auto phase check' });
    }
  });
  socket.on('gm_notes', (data: any) => {
    try {
      const content = (data?.notes || '').trim();
      if (!content) return;
      const gameConfig = loadGameConfig();
      const gmNotes = Array.isArray(gameConfig.gmNotes) ? gameConfig.gmNotes : [];
      gmNotes.push({ content, timestamp: data?.timestamp || new Date().toISOString() });
      if (gmNotes.length > 200) gmNotes.splice(0, gmNotes.length - 200);
      gameConfig.gmNotes = gmNotes;
      saveGameConfig(gameConfig);
      io.emit('game_config_updated', gameConfig);
    } catch {
      socket.emit('error', { message: 'Failed to save GM notes' });
    }
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
