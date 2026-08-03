import type {
  AmbientSound,
  AppData,
  FocusSession,
  LanguagePreference,
  Priority,
  Settings,
  Task,
  ThemeName,
  TimerMode
} from './types';

export const STORAGE_KEY = 'everstep:data:v1';
const LEGACY_STORAGE_KEYS = ['focusflow:data:v1'];

export const defaultSettings: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  dailyGoal: 8,
  autoStartBreaks: false,
  autoStartFocus: false,
  notifications: true,
  soundEnabled: true,
  volume: 0.55,
  theme: 'midnight',
  accent: '#7c8cff',
  themeBase: '#080c17',
  themePrimary: '#7c8cff',
  themeSecondary: '#151f38',
  themeTertiary: '#4bd5b7',
  backgroundBase: '#1b1039',
  backgroundPrimary: '#5f3bff',
  backgroundSecondary: '#ff5a79',
  backgroundTertiary: '#ff3d4f',
  alwaysOnTop: false,
  showMotivation: true,
  ambient: 'none',
  language: 'auto',
  sidebarWidth: 244,
  sidebarCollapsed: false
};

export const defaultData: AppData = {
  schemaVersion: 2,
  tasks: [],
  sessions: [],
  settings: defaultSettings,
  timer: {
    mode: 'focus',
    remainingSeconds: defaultSettings.focusMinutes * 60,
    running: false,
    completedFocusInCycle: 0
  },
  achievementsSeen: []
};

const themes = new Set<ThemeName>(['midnight', 'oled', 'nord', 'dracula', 'tokyo', 'forest']);
const ambientSounds = new Set<AmbientSound>(['none', 'white', 'pink', 'brown', 'rain', 'cafe', 'thunderstorm', 'windLeaves', 'ocean', 'forest', 'fire']);
const priorities = new Set<Priority>(['low', 'medium', 'high']);
const timerModes = new Set<TimerMode>(['focus', 'shortBreak', 'longBreak']);
const languages = new Set<LanguagePreference>(['auto', 'tr', 'en', 'es', 'ja', 'de', 'it', 'az']);
export const MAX_IMPORTED_TASKS = 5_000;
export const MAX_IMPORTED_SESSIONS = 25_000;
export const MAX_IMPORTED_ACHIEVEMENTS = 100;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(boundedNumber(value, fallback, min, max));
}

function safeString(value: unknown, fallback = '', maxLength = 500): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function safeDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function safeId(value: unknown, prefix: string, index: number): string {
  const text = safeString(value, '', 100).trim();
  return text || `${prefix}-${Date.now()}-${index}`;
}

function safeColor(value: unknown, fallback: string): string {
  const candidate = safeString(value, fallback, 9);
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : fallback;
}

function sanitizeSettings(value: unknown): Settings {
  const source = record(value) ?? {};
  const theme = themes.has(source.theme as ThemeName) ? source.theme as ThemeName : defaultSettings.theme;
  const ambient = ambientSounds.has(source.ambient as AmbientSound) ? source.ambient as AmbientSound : defaultSettings.ambient;
  const accent = safeColor(source.accent, defaultSettings.accent);
  const themeBase = safeColor(source.themeBase, defaultSettings.themeBase);
  const themePrimary = safeColor(source.themePrimary, defaultSettings.themePrimary);
  const themeSecondary = safeColor(source.themeSecondary, defaultSettings.themeSecondary);
  const themeTertiary = safeColor(source.themeTertiary, defaultSettings.themeTertiary);
  const backgroundBase = safeColor(source.backgroundBase, defaultSettings.backgroundBase);
  const backgroundPrimary = safeColor(source.backgroundPrimary, defaultSettings.backgroundPrimary);
  const backgroundSecondary = safeColor(source.backgroundSecondary, defaultSettings.backgroundSecondary);
  const backgroundTertiary = safeColor(source.backgroundTertiary, defaultSettings.backgroundTertiary);
  const language = languages.has(source.language as LanguagePreference) ? source.language as LanguagePreference : defaultSettings.language;

  return {
    focusMinutes: boundedInteger(source.focusMinutes, defaultSettings.focusMinutes, 1, 180),
    shortBreakMinutes: boundedInteger(source.shortBreakMinutes, defaultSettings.shortBreakMinutes, 1, 60),
    longBreakMinutes: boundedInteger(source.longBreakMinutes, defaultSettings.longBreakMinutes, 1, 120),
    longBreakEvery: boundedInteger(source.longBreakEvery, defaultSettings.longBreakEvery, 2, 12),
    dailyGoal: boundedInteger(source.dailyGoal, defaultSettings.dailyGoal, 1, 30),
    autoStartBreaks: safeBoolean(source.autoStartBreaks, defaultSettings.autoStartBreaks),
    autoStartFocus: safeBoolean(source.autoStartFocus, defaultSettings.autoStartFocus),
    notifications: safeBoolean(source.notifications, defaultSettings.notifications),
    soundEnabled: safeBoolean(source.soundEnabled, defaultSettings.soundEnabled),
    volume: boundedNumber(source.volume, defaultSettings.volume, 0, 1),
    theme,
    accent,
    themeBase,
    themePrimary,
    themeSecondary,
    themeTertiary,
    backgroundBase,
    backgroundPrimary,
    backgroundSecondary,
    backgroundTertiary,
    alwaysOnTop: safeBoolean(source.alwaysOnTop, defaultSettings.alwaysOnTop),
    showMotivation: safeBoolean(source.showMotivation, defaultSettings.showMotivation),
    ambient,
    language,
    sidebarWidth: boundedInteger(source.sidebarWidth, defaultSettings.sidebarWidth, 180, 380),
    sidebarCollapsed: safeBoolean(source.sidebarCollapsed, defaultSettings.sidebarCollapsed)
  };
}

function sanitizeTask(value: unknown, index: number): Task | null {
  const source = record(value);
  if (!source) return null;
  const title = safeString(source.title, '', 100).trim();
  if (!title) return null;
  const createdAt = safeDate(source.createdAt) ?? new Date().toISOString();
  const completed = safeBoolean(source.completed, false);
  const completedAt = completed ? safeDate(source.completedAt) : undefined;
  const priority = priorities.has(source.priority as Priority) ? source.priority as Priority : 'medium';

  return {
    id: safeId(source.id, 'task', index),
    title,
    notes: safeString(source.notes, '', 500),
    category: safeString(source.category, 'Other', 50).trim() || 'Other',
    priority,
    estimatedPomodoros: boundedInteger(source.estimatedPomodoros, 1, 1, 30),
    completedPomodoros: boundedInteger(source.completedPomodoros, 0, 0, 100_000),
    completed,
    createdAt,
    completedAt
  };
}

function sanitizeSession(value: unknown, index: number): FocusSession | null {
  const source = record(value);
  if (!source) return null;
  const startedAt = safeDate(source.startedAt);
  const endedAt = safeDate(source.endedAt);
  if (!startedAt || !endedAt) return null;
  const mode = timerModes.has(source.mode as TimerMode) ? source.mode as TimerMode : 'focus';
  const taskId = safeString(source.taskId, '', 100).trim() || undefined;

  return {
    id: safeId(source.id, 'session', index),
    mode,
    startedAt,
    endedAt,
    plannedSeconds: boundedInteger(source.plannedSeconds, 1500, 1, 86_400),
    actualSeconds: boundedInteger(source.actualSeconds, 0, 0, 86_400),
    completed: safeBoolean(source.completed, false),
    taskId
  };
}

export function sanitizeData(candidate: unknown): AppData {
  const source = record(candidate);
  if (!source) return structuredClone(defaultData);

  const settings = sanitizeSettings(source.settings);
  const tasks = Array.isArray(source.tasks)
    ? source.tasks.slice(0, MAX_IMPORTED_TASKS).map(sanitizeTask).filter((task): task is Task => task !== null)
    : [];
  const taskIds = new Set(tasks.map((task) => task.id));
  const sessions = Array.isArray(source.sessions)
    ? source.sessions.slice(0, MAX_IMPORTED_SESSIONS).map(sanitizeSession).filter((session): session is FocusSession => session !== null)
      .map((session) => session.taskId && !taskIds.has(session.taskId) ? { ...session, taskId: undefined } : session)
    : [];

  const timerSource = record(source.timer) ?? {};
  const mode = timerModes.has(timerSource.mode as TimerMode) ? timerSource.mode as TimerMode : 'focus';
  const selectedCandidate = safeString(source.selectedTaskId, '', 100).trim();
  const selectedTaskId = selectedCandidate && taskIds.has(selectedCandidate) ? selectedCandidate : undefined;
  const targetEnd = boundedNumber(timerSource.targetEnd, 0, 0, Number.MAX_SAFE_INTEGER) || undefined;
  const sessionStartedAt = safeDate(timerSource.sessionStartedAt);
  const sessionPlannedSeconds = boundedInteger(timerSource.sessionPlannedSeconds, 0, 0, 86_400) || undefined;
  const running = safeBoolean(timerSource.running, false) && Boolean(targetEnd);

  return {
    schemaVersion: 2,
    tasks,
    sessions,
    settings,
    selectedTaskId,
    timer: {
      mode,
      remainingSeconds: boundedInteger(
        timerSource.remainingSeconds,
        mode === 'focus' ? settings.focusMinutes * 60 : mode === 'shortBreak' ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60,
        0,
        86_400
      ),
      running,
      targetEnd: running ? targetEnd : undefined,
      sessionStartedAt: running ? sessionStartedAt : undefined,
      sessionPlannedSeconds: running ? sessionPlannedSeconds : undefined,
      completedFocusInCycle: boundedInteger(timerSource.completedFocusInCycle, 0, 0, settings.longBreakEvery - 1)
    },
    achievementsSeen: Array.isArray(source.achievementsSeen)
      ? [...new Set(source.achievementsSeen.slice(0, MAX_IMPORTED_ACHIEVEMENTS).filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, 50)))]
      : []
  };
}

export function loadData(): AppData {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let migratedFrom: string | undefined;
    if (!raw) {
      migratedFrom = LEGACY_STORAGE_KEYS.find((key) => localStorage.getItem(key) !== null);
      raw = migratedFrom ? localStorage.getItem(migratedFrom) : null;
    }
    if (!raw) return structuredClone(defaultData);
    const sanitized = sanitizeData(JSON.parse(raw));
    if (migratedFrom) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      localStorage.removeItem(migratedFrom);
    }
    return sanitized;
  } catch {
    return structuredClone(defaultData);
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Everstep verileri kaydedilemedi.', error);
  }
}
