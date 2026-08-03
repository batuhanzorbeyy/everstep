export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type Priority = 'low' | 'medium' | 'high';
export type ThemeName = 'midnight' | 'oled' | 'nord' | 'dracula' | 'tokyo' | 'forest';
export type AmbientSound = 'none' | 'white' | 'pink' | 'brown' | 'rain' | 'cafe' | 'thunderstorm' | 'windLeaves' | 'ocean' | 'forest' | 'fire';
export type LanguagePreference = 'auto' | 'tr' | 'en' | 'es' | 'ja' | 'de' | 'it' | 'az';

export interface Task {
  id: string;
  title: string;
  notes: string;
  category: string;
  priority: Priority;
  estimatedPomodoros: number;
  completedPomodoros: number;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface FocusSession {
  id: string;
  mode: TimerMode;
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  actualSeconds: number;
  completed: boolean;
  taskId?: string;
}

export interface Settings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  dailyGoal: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  volume: number;
  theme: ThemeName;
  accent: string;
  themeBase: string;
  themePrimary: string;
  themeSecondary: string;
  themeTertiary: string;
  backgroundBase: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  alwaysOnTop: boolean;
  showMotivation: boolean;
  ambient: AmbientSound;
  language: LanguagePreference;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
}

export interface PersistedTimer {
  mode: TimerMode;
  remainingSeconds: number;
  running: boolean;
  targetEnd?: number;
  sessionStartedAt?: string;
  sessionPlannedSeconds?: number;
  completedFocusInCycle: number;
}

export interface AppData {
  schemaVersion: 2;
  tasks: Task[];
  sessions: FocusSession[];
  settings: Settings;
  selectedTaskId?: string;
  timer: PersistedTimer;
  achievementsSeen: string[];
}

export interface DesktopBridge {
  isDesktop: boolean;
  getVersion: () => Promise<string>;
  notify: (title: string, body: string) => Promise<void>;
  exportFile: (defaultPath: string, content: string, filters?: { name: string; extensions: string[] }[]) => Promise<{ ok: boolean; filePath?: string }>;
  importJson: () => Promise<{ ok: boolean; content?: string; filePath?: string }>;
  exportPdf: (defaultPath: string, html: string) => Promise<{ ok: boolean; filePath?: string }>;
  setAlwaysOnTop: (value: boolean) => void;
  setProgress: (value: number) => void;
  updateTray: (text: string) => void;
  setLanguage: (language: Exclude<LanguagePreference, 'auto'>) => void;
  minimize: () => void;
  quit: () => void;
}

declare global {
  interface Window {
    everstepDesktop?: DesktopBridge;
  }
}
