import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from './audio';
import { defaultData, loadData, sanitizeData, saveData } from './storage';
import type { AmbientSound, AppData, FocusSession, LanguagePreference, Priority, Settings, Task, ThemeName, TimerMode } from './types';
import { localeFor, resolveLanguage, translate } from './i18n';
import {
  calculateFocusScore,
  contrastTextColor,
  calculateStreak,
  completedFocusSessions,
  csvEscape,
  dateKey,
  focusCountForDay,
  focusSecondsForDay,
  formatClock,
  formatDuration,
  lastNDays,
  modeLabel,
  themeSurfaceTone,
  uid
} from './utils';

type View = 'dashboard' | 'tasks' | 'statistics' | 'achievements' | 'sounds' | 'settings';
type Toast = { id: string; message: string; tone?: 'success' | 'warning' | 'info' };

type TaskDraft = {
  title: string;
  notes: string;
  category: string;
  priority: Priority;
  estimatedPomodoros: number;
};

type ThemePalette = Pick<Settings, 'themeBase' | 'themePrimary' | 'themeSecondary' | 'themeTertiary'>;
type BackgroundPalette = Pick<Settings, 'backgroundBase' | 'backgroundPrimary' | 'backgroundSecondary' | 'backgroundTertiary'>;
type ThemeOption = {
  id: ThemeName;
  name: string;
  description: string;
  accent: string;
  palette: ThemePalette;
  background: BackgroundPalette;
};

const themeOptions: ThemeOption[] = [
  {
    id: 'midnight', name: 'Midnight Blue', description: 'Koyu lacivert ve yumuşak mavi', accent: '#7c8cff',
    palette: { themeBase: '#080c17', themePrimary: '#7c8cff', themeSecondary: '#151f38', themeTertiary: '#4bd5b7' },
    background: { backgroundBase: '#101735', backgroundPrimary: '#385cff', backgroundSecondary: '#7657ff', backgroundTertiary: '#e45b91' }
  },
  {
    id: 'oled', name: 'OLED Black', description: 'Tam siyah, yüksek kontrast', accent: '#6f82ff',
    palette: { themeBase: '#000000', themePrimary: '#6478ff', themeSecondary: '#101010', themeTertiary: '#b6c1ff' },
    background: { backgroundBase: '#030307', backgroundPrimary: '#243d9c', backgroundSecondary: '#5c36a8', backgroundTertiary: '#b43f6a' }
  },
  {
    id: 'nord', name: 'Nord', description: 'Soğuk, sakin ve profesyonel', accent: '#88c0d0',
    palette: { themeBase: '#202733', themePrimary: '#88c0d0', themeSecondary: '#354153', themeTertiary: '#a3be8c' },
    background: { backgroundBase: '#283442', backgroundPrimary: '#5e81ac', backgroundSecondary: '#88c0d0', backgroundTertiary: '#a3be8c' }
  },
  {
    id: 'dracula', name: 'Dracula', description: 'Mor ve pembe vurgular', accent: '#bd93f9',
    palette: { themeBase: '#191a27', themePrimary: '#bd93f9', themeSecondary: '#31324a', themeTertiary: '#ff79c6' },
    background: { backgroundBase: '#24173d', backgroundPrimary: '#7650d6', backgroundSecondary: '#bd5bd6', backgroundTertiary: '#ff647f' }
  },
  {
    id: 'tokyo', name: 'Tokyo Night', description: 'Gece mavisi ve neon mor', accent: '#7aa2f7',
    palette: { themeBase: '#111424', themePrimary: '#7aa2f7', themeSecondary: '#242a48', themeTertiary: '#bb9af7' },
    background: { backgroundBase: '#141b3c', backgroundPrimary: '#3366d6', backgroundSecondary: '#7556cc', backgroundTertiary: '#bb5fa8' }
  },
  {
    id: 'forest', name: 'Forest', description: 'Doğal yeşil ve toprak tonları', accent: '#5dbe91',
    palette: { themeBase: '#0c1714', themePrimary: '#5dbe91', themeSecondary: '#1d3931', themeTertiary: '#c7ab6f' },
    background: { backgroundBase: '#10231d', backgroundPrimary: '#27755b', backgroundSecondary: '#5d9d78', backgroundTertiary: '#c08a63' }
  }
];


const dashboardPalettePresets = [
  { id: 'flocus', name: 'Flocus Glow', colors: { backgroundBase: '#1b1039', backgroundPrimary: '#5f3bff', backgroundSecondary: '#ff5a79', backgroundTertiary: '#ff3d4f' } },
  { id: 'midnight', name: 'Midnight Bloom', colors: { backgroundBase: '#0f1535', backgroundPrimary: '#2f6bff', backgroundSecondary: '#a445ff', backgroundTertiary: '#ff6b8a' } },
  { id: 'sunset', name: 'Sunset Coral', colors: { backgroundBase: '#22113d', backgroundPrimary: '#6d3df2', backgroundSecondary: '#ff7a7a', backgroundTertiary: '#ffb36a' } },
  { id: 'emerald', name: 'Emerald Mist', colors: { backgroundBase: '#0d1d24', backgroundPrimary: '#15803d', backgroundSecondary: '#14b8a6', backgroundTertiary: '#93c5fd' } }
];

const ambientOptions: { id: AmbientSound; name: string; description: string; icon: string }[] = [
  { id: 'none', name: 'Sessizlik', description: 'Arka plan sesi kapalı', icon: '◯' },
  { id: 'rain', name: 'Doğal Yağmur', description: 'Yumuşak damlalarla gerçekçi ve kesintisiz yağmur', icon: '☂' },
  { id: 'cafe', name: 'Kafe', description: 'Uzak sohbetler, fincanlar ve sıcak kafe ortamı', icon: '☕' },
  { id: 'thunderstorm', name: 'Gök Gürültülü Sağanak', description: 'Yoğun yağmur ve uzaktan gelen güçlü gök gürültüsü', icon: 'ϟ' },
  { id: 'windLeaves', name: 'Rüzgar ve Yapraklar', description: 'Rüzgar esintisi ve dinlendirici yaprak hışırtısı', icon: '♧' },
  { id: 'ocean', name: 'Okyanus Dalgaları', description: 'Yavaş kıyı dalgaları ve sakinleştirici deniz sesi', icon: '≋' },
  { id: 'forest', name: 'Orman ve Kuşlar', description: 'Kuş sesleri, hafif rüzgar ve ferah orman atmosferi', icon: '♬' },
  { id: 'fire', name: 'Şömine ve Kamp Ateşi', description: 'Çıtırdayan odunlarla sıcak ve konforlu atmosfer', icon: '♨' },
  { id: 'white', name: 'Beyaz Gürültü', description: 'Dikkat dağıtan sesleri örter', icon: '◫' },
  { id: 'pink', name: 'Pembe Gürültü', description: 'Daha yumuşak ve dengeli', icon: '≈' },
  { id: 'brown', name: 'Kahverengi Gürültü', description: 'Derin ve düşük frekanslı', icon: '▰' }
];

const achievementDefinitions = [
  { id: 'first', title: 'İlk Adım', icon: '🌱', description: 'İlk odak oturumunu tamamla', test: (data: AppData) => completedFocusSessions(data.sessions).length >= 1 },
  { id: 'ten', title: 'Ritim Bulundu', icon: '⚡', description: '10 Pomodoro tamamla', test: (data: AppData) => completedFocusSessions(data.sessions).length >= 10 },
  { id: 'hundred', title: 'Odak Ustası', icon: '🏆', description: '100 Pomodoro tamamla', test: (data: AppData) => completedFocusSessions(data.sessions).length >= 100 },
  { id: 'streak7', title: 'Ateşi Koru', icon: '🔥', description: '7 günlük seri yakala', test: (data: AppData) => calculateStreak(data.sessions) >= 7 },
  { id: 'tenHours', title: 'Derin Çalışma', icon: '💎', description: 'Toplam 10 saat odaklan', test: (data: AppData) => completedFocusSessions(data.sessions).reduce((sum, s) => sum + s.actualSeconds, 0) >= 36_000 },
  { id: 'tasks10', title: 'Tamamlayıcı', icon: '✅', description: '10 görevi tamamla', test: (data: AppData) => data.tasks.filter((task) => task.completed).length >= 10 }
];

function durationForMode(settings: Settings, mode: TimerMode): number {
  if (mode === 'focus') return settings.focusMinutes * 60;
  if (mode === 'shortBreak') return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}

function nextModeFor(data: AppData, completedCurrent: boolean): { mode: TimerMode; cycle: number } {
  if (data.timer.mode !== 'focus') return { mode: 'focus', cycle: data.timer.completedFocusInCycle };
  const cycle = data.timer.completedFocusInCycle + (completedCurrent ? 1 : 0);
  if (completedCurrent && cycle >= data.settings.longBreakEvery) return { mode: 'longBreak', cycle: 0 };
  return { mode: 'shortBreak', cycle };
}

function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [view, setView] = useState<View>('dashboard');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({ title: '', notes: '', category: 'Software', priority: 'medium', estimatedPomodoros: 1 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [focusMode, setFocusMode] = useState(false);
  const [appVersion, setAppVersion] = useState('1.3.0');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const complete = localStorage.getItem('everstep:onboarded') || localStorage.getItem('focusflow:onboarded');
    if (complete && !localStorage.getItem('everstep:onboarded')) localStorage.setItem('everstep:onboarded', '1');
    return !complete;
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => data.settings.sidebarWidth);
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const sidebarDragRef = useRef({ startX: 0, startWidth: data.settings.sidebarWidth });
  const sidebarWidthRef = useRef(data.settings.sidebarWidth);
  const finishingRef = useRef(false);
  const dataRef = useRef(data);
  const language = resolveLanguage(data.settings.language);
  const t = useCallback((source: string, variables: Record<string, string | number> = {}) => translate(language, source, variables), [language]);
  const durationText = useCallback((seconds: number) => formatDuration(seconds, language), [language]);
  const modeText = useCallback((mode: TimerMode) => modeLabel(mode, language), [language]);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    if (!sidebarResizing) {
      sidebarWidthRef.current = data.settings.sidebarWidth;
      setSidebarWidth(data.settings.sidebarWidth);
    }
  }, [data.settings.sidebarWidth, sidebarResizing]);
  useEffect(() => {
    if (window.everstepDesktop) void window.everstepDesktop.getVersion().then(setAppVersion).catch(() => undefined);
  }, []);
  useEffect(() => saveData(data), [data]);
  useEffect(() => {
    document.documentElement.lang = language;
    window.everstepDesktop?.setLanguage(language);
  }, [language]);


  useEffect(() => {
    if (!sidebarResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = Math.max(180, Math.min(380, sidebarDragRef.current.startWidth + event.clientX - sidebarDragRef.current.startX));
      sidebarWidthRef.current = nextWidth;
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      document.body.classList.remove('sidebar-is-resizing');
      setSidebarResizing(false);
      setData((current) => ({
        ...current,
        settings: { ...current.settings, sidebarWidth: Math.round(sidebarWidthRef.current) }
      }));
    };

    document.body.classList.add('sidebar-is-resizing');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      document.body.classList.remove('sidebar-is-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [sidebarResizing]);

  const pushToast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = uid();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const todayKey = dateKey();
  const todayFocusCount = useMemo(() => focusCountForDay(data.sessions, todayKey), [data.sessions, todayKey]);
  const todayFocusSeconds = useMemo(() => focusSecondsForDay(data.sessions, todayKey), [data.sessions, todayKey]);
  const totalFocusSeconds = useMemo(() => completedFocusSessions(data.sessions).reduce((sum, session) => sum + session.actualSeconds, 0), [data.sessions]);
  const totalPomodoros = useMemo(() => completedFocusSessions(data.sessions).length, [data.sessions]);
  const streak = useMemo(() => calculateStreak(data.sessions), [data.sessions]);
  const focusScore = useMemo(() => calculateFocusScore(data.sessions), [data.sessions]);
  const selectedTask = data.tasks.find((task) => task.id === data.selectedTaskId && !task.completed);
  const currentDuration = durationForMode(data.settings, data.timer.mode);
  const timerProgress = currentDuration > 0 ? 1 - data.timer.remainingSeconds / currentDuration : 0;
  const level = Math.max(1, Math.floor(totalFocusSeconds / 72_000) + 1);
  const levelProgress = ((totalFocusSeconds % 72_000) / 72_000) * 100;

  const notify = useCallback((title: string, body: string) => {
    if (!dataRef.current.settings.notifications) return;
    if (window.everstepDesktop) void window.everstepDesktop.notify(title, body);
    else if ('Notification' in window) {
      if (Notification.permission === 'granted') new Notification(title, { body });
      else if (Notification.permission === 'default') void Notification.requestPermission();
    }
  }, []);

  const recordInterrupted = (source: AppData): FocusSession[] => {
    if (!source.timer.sessionStartedAt || !source.timer.sessionPlannedSeconds) return source.sessions;
    const actualSeconds = Math.max(0, source.timer.sessionPlannedSeconds - source.timer.remainingSeconds);
    if (actualSeconds < 30) return source.sessions;
    return [...source.sessions, {
      id: uid(),
      mode: source.timer.mode,
      startedAt: source.timer.sessionStartedAt,
      endedAt: new Date().toISOString(),
      plannedSeconds: source.timer.sessionPlannedSeconds,
      actualSeconds,
      completed: false,
      taskId: source.timer.mode === 'focus' ? source.selectedTaskId : undefined
    }];
  };

  const completeTimer = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    let finishedMode: TimerMode = 'focus';
    let nextMode: TimerMode = 'shortBreak';
    let nextAutoStarts = false;
    let completedTaskTitle = '';

    setData((current) => {
      finishedMode = current.timer.mode;
      const plannedSeconds = current.timer.sessionPlannedSeconds ?? durationForMode(current.settings, current.timer.mode);
      const session: FocusSession = {
        id: uid(),
        mode: current.timer.mode,
        startedAt: current.timer.sessionStartedAt ?? new Date(Date.now() - plannedSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        plannedSeconds,
        actualSeconds: plannedSeconds,
        completed: true,
        taskId: current.timer.mode === 'focus' ? current.selectedTaskId : undefined
      };
      const tasks = current.tasks.map((task) => {
        if (current.timer.mode === 'focus' && task.id === current.selectedTaskId) {
          completedTaskTitle = task.title;
          return { ...task, completedPomodoros: task.completedPomodoros + 1 };
        }
        return task;
      });
      const next = nextModeFor(current, true);
      nextMode = next.mode;
      nextAutoStarts = current.timer.mode === 'focus' ? current.settings.autoStartBreaks : current.settings.autoStartFocus;
      const nextSeconds = durationForMode(current.settings, next.mode);
      return {
        ...current,
        tasks,
        sessions: [...current.sessions, session],
        timer: {
          mode: next.mode,
          remainingSeconds: nextSeconds,
          running: nextAutoStarts,
          targetEnd: nextAutoStarts ? Date.now() + nextSeconds * 1000 : undefined,
          sessionStartedAt: nextAutoStarts ? new Date().toISOString() : undefined,
          sessionPlannedSeconds: nextAutoStarts ? nextSeconds : undefined,
          completedFocusInCycle: next.cycle
        }
      };
    });

    window.setTimeout(() => {
      if (dataRef.current.settings.soundEnabled) audioEngine.playChime(dataRef.current.settings.volume, finishedMode === 'focus');
      if (finishedMode === 'focus') {
        notify(t('Odak oturumu tamamlandı'), nextMode === 'longBreak' ? t('Harika iş! Uzun mola zamanı.') : t('Kısa bir mola zamanı.'));
        pushToast(completedTaskTitle ? t('“{task}” için bir Pomodoro tamamlandı.', { task: completedTaskTitle }) : t('Pomodoro tamamlandı. Güzel iş!'), 'success');
      } else {
        notify(t('Mola tamamlandı'), t('Yeniden odaklanma zamanı.'));
        pushToast(t('Mola bitti. Yeni bir odak oturumuna hazırsın.'), 'success');
      }
      finishingRef.current = false;
    }, 100);
  }, [notify, pushToast, t]);

  useEffect(() => {
    if (!data.timer.running || !data.timer.targetEnd) return undefined;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((dataRef.current.timer.targetEnd! - Date.now()) / 1000));
      if (remaining <= 0) {
        setData((current) => ({ ...current, timer: { ...current.timer, remainingSeconds: 0, running: false, targetEnd: undefined } }));
        window.setTimeout(completeTimer, 0);
      } else {
        setData((current) => current.timer.remainingSeconds === remaining ? current : ({ ...current, timer: { ...current.timer, remainingSeconds: remaining } }));
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [data.timer.running, data.timer.targetEnd, completeTimer]);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    const surfaceTone = themeSurfaceTone(data.settings.themeBase, data.settings.themeSecondary);
    document.documentElement.dataset.surface = surfaceTone;
    document.documentElement.style.colorScheme = surfaceTone;
    document.documentElement.style.setProperty('--accent', data.settings.accent);
    document.documentElement.style.setProperty('--on-accent', contrastTextColor(data.settings.accent));
    document.documentElement.style.setProperty('--theme-base', data.settings.themeBase);
    document.documentElement.style.setProperty('--theme-primary', data.settings.themePrimary);
    document.documentElement.style.setProperty('--theme-secondary', data.settings.themeSecondary);
    document.documentElement.style.setProperty('--theme-tertiary', data.settings.themeTertiary);
    document.documentElement.style.setProperty('--hero-base', data.settings.backgroundBase);
    document.documentElement.style.setProperty('--hero-primary', data.settings.backgroundPrimary);
    document.documentElement.style.setProperty('--hero-secondary', data.settings.backgroundSecondary);
    document.documentElement.style.setProperty('--hero-tertiary', data.settings.backgroundTertiary);
    document.title = `${formatClock(data.timer.remainingSeconds)} • ${modeText(data.timer.mode)} | Everstep`;
    window.everstepDesktop?.setAlwaysOnTop(data.settings.alwaysOnTop);
  }, [data.settings.theme, data.settings.accent, data.settings.themeBase, data.settings.themePrimary, data.settings.themeSecondary, data.settings.themeTertiary, data.settings.backgroundBase, data.settings.backgroundPrimary, data.settings.backgroundSecondary, data.settings.backgroundTertiary, data.settings.alwaysOnTop, data.timer.remainingSeconds, data.timer.mode, modeText]);

  useEffect(() => {
    const progress = data.timer.running ? Math.max(0, Math.min(1, timerProgress)) : -1;
    window.everstepDesktop?.setProgress(progress);
    window.everstepDesktop?.updateTray(`${formatClock(data.timer.remainingSeconds)} • ${modeText(data.timer.mode)} — Everstep`);
  }, [data.timer.running, data.timer.remainingSeconds, data.timer.mode, timerProgress, modeText]);

  useEffect(() => {
    audioEngine.startAmbient(data.settings.ambient, data.settings.volume);
    return () => audioEngine.stopAmbient();
  }, [data.settings.ambient]);

  useEffect(() => audioEngine.setAmbientVolume(data.settings.volume), [data.settings.volume]);

  useEffect(() => {
    const unlocked = achievementDefinitions.filter((achievement) => achievement.test(data)).map((achievement) => achievement.id);
    const newOnes = unlocked.filter((id) => !data.achievementsSeen.includes(id));
    if (newOnes.length === 0) return;
    setData((current) => ({ ...current, achievementsSeen: [...new Set([...current.achievementsSeen, ...newOnes])] }));
    const achievement = achievementDefinitions.find((item) => item.id === newOnes[0]);
    if (achievement) pushToast(`${achievement.icon} ${t('Yeni rozet: {title}', { title: t(achievement.title) })}`, 'success');
  }, [data.sessions, data.tasks, data.achievementsSeen, pushToast, t]);

  const startTimer = useCallback(() => {
    setData((current) => {
      const duration = current.timer.remainingSeconds > 0 ? current.timer.remainingSeconds : durationForMode(current.settings, current.timer.mode);
      return {
        ...current,
        timer: {
          ...current.timer,
          remainingSeconds: duration,
          running: true,
          targetEnd: Date.now() + duration * 1000,
          sessionStartedAt: current.timer.sessionStartedAt ?? new Date().toISOString(),
          sessionPlannedSeconds: current.timer.sessionPlannedSeconds ?? durationForMode(current.settings, current.timer.mode)
        }
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setData((current) => {
      const remaining = current.timer.targetEnd ? Math.max(0, Math.ceil((current.timer.targetEnd - Date.now()) / 1000)) : current.timer.remainingSeconds;
      return { ...current, timer: { ...current.timer, running: false, targetEnd: undefined, remainingSeconds: remaining } };
    });
  }, []);

  const toggleTimer = useCallback(() => dataRef.current.timer.running ? pauseTimer() : startTimer(), [pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    setData((current) => ({
      ...current,
      sessions: recordInterrupted(current),
      timer: {
        ...current.timer,
        remainingSeconds: durationForMode(current.settings, current.timer.mode),
        running: false,
        targetEnd: undefined,
        sessionStartedAt: undefined,
        sessionPlannedSeconds: undefined
      }
    }));
    pushToast(t('Sayaç sıfırlandı.'), 'info');
  }, [pushToast, t]);

  const changeMode = useCallback((mode: TimerMode) => {
    setData((current) => ({
      ...current,
      sessions: recordInterrupted(current),
      timer: {
        ...current.timer,
        mode,
        remainingSeconds: durationForMode(current.settings, mode),
        running: false,
        targetEnd: undefined,
        sessionStartedAt: undefined,
        sessionPlannedSeconds: undefined
      }
    }));
  }, []);

  const skipTimer = useCallback(() => {
    setData((current) => {
      const next = nextModeFor(current, false);
      return {
        ...current,
        sessions: recordInterrupted(current),
        timer: {
          mode: next.mode,
          remainingSeconds: durationForMode(current.settings, next.mode),
          running: false,
          completedFocusInCycle: next.cycle
        }
      };
    });
    pushToast(t('Sonraki oturuma geçildi.'), 'info');
  }, [pushToast, t]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); toggleTimer(); }
      if (event.ctrlKey && event.key.toLowerCase() === 'r') { event.preventDefault(); resetTimer(); }
      if (event.ctrlKey && event.key.toLowerCase() === 'n') { event.preventDefault(); openNewTask(); }
      if (event.key.toLowerCase() === 'f') setFocusMode((current) => !current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleTimer, resetTimer]);

  function openNewTask() {
    setEditingTaskId(null);
    setTaskDraft({ title: '', notes: '', category: t('Yazılım'), priority: 'medium', estimatedPomodoros: 1 });
    setTaskModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTaskDraft({ title: task.title, notes: task.notes, category: task.category, priority: task.priority, estimatedPomodoros: task.estimatedPomodoros });
    setTaskModalOpen(true);
  }

  function saveTask() {
    const title = taskDraft.title.trim();
    if (!title) { pushToast(t('Görev başlığı boş bırakılamaz.'), 'warning'); return; }
    const estimatedPomodoros = Number.isFinite(taskDraft.estimatedPomodoros)
      ? Math.max(1, Math.min(30, Math.round(taskDraft.estimatedPomodoros)))
      : 1;
    const normalizedDraft = {
      ...taskDraft,
      title,
      notes: taskDraft.notes.trim(),
      category: taskDraft.category.trim() || t('Diğer'),
      estimatedPomodoros
    };
    setData((current) => {
      if (editingTaskId) {
        return { ...current, tasks: current.tasks.map((task) => task.id === editingTaskId ? { ...task, ...normalizedDraft } : task) };
      }
      const task: Task = {
        id: uid(),
        ...normalizedDraft,
        priority: taskDraft.priority,
        completedPomodoros: 0,
        completed: false,
        createdAt: new Date().toISOString()
      };
      return { ...current, tasks: [task, ...current.tasks], selectedTaskId: current.selectedTaskId ?? task.id };
    });
    setTaskModalOpen(false);
    pushToast(editingTaskId ? t('Görev güncellendi.') : t('Görev eklendi.'), 'success');
  }

  function toggleTask(taskId: string) {
    setData((current) => ({
      ...current,
      selectedTaskId: current.selectedTaskId === taskId ? undefined : current.selectedTaskId,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined } : task)
    }));
  }

  function deleteTask(taskId: string) {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!window.confirm(t('“{task}” silinsin mi?', { task: task?.title ?? t('Bu görev') }))) return;
    setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId), selectedTaskId: current.selectedTaskId === taskId ? undefined : current.selectedTaskId }));
    pushToast(t('Görev silindi.'), 'info');
  }

  function updateSettings(patch: Partial<Settings>) {
    setData((current) => {
      const settings = { ...current.settings, ...patch };
      const durationChanged = patch.focusMinutes !== undefined || patch.shortBreakMinutes !== undefined || patch.longBreakMinutes !== undefined;
      const timer = current.timer.running || !durationChanged ? current.timer : {
        ...current.timer,
        remainingSeconds: durationForMode(settings, current.timer.mode)
      };
      return { ...current, settings, timer };
    });
  }

  function beginSidebarResize(event: React.PointerEvent<HTMLDivElement>) {
    if (data.settings.sidebarCollapsed) return;
    event.preventDefault();
    sidebarDragRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    sidebarWidthRef.current = sidebarWidth;
    setSidebarResizing(true);
  }

  function toggleSidebarCollapsed() {
    updateSettings({ sidebarCollapsed: !data.settings.sidebarCollapsed });
  }

  function applyThemePreset(option: ThemeOption) {
    updateSettings({
      theme: option.id,
      accent: option.accent,
      ...option.palette,
      ...option.background
    });
  }

  function applyThemePalette(palette: ThemePalette) {
    updateSettings(palette);
  }

  function applyDashboardPalette(palette: BackgroundPalette) {
    updateSettings(palette);
  }

  async function exportJson() {
    const content = JSON.stringify(data, null, 2);
    if (window.everstepDesktop) {
      const result = await window.everstepDesktop.exportFile(`everstep-yedek-${dateKey()}.json`, content, [{ name: 'JSON', extensions: ['json'] }]);
      if (result.ok) pushToast(t('Yedek dosyası kaydedildi.'), 'success');
    } else downloadText(`everstep-yedek-${dateKey()}.json`, content, 'application/json');
  }

  async function exportCsv() {
    const header = [t('Tarih'), t('Tür'), t('Planlanan saniye'), t('Gerçek saniye'), t('Tamamlandı'), t('Görev')];
    const lines = data.sessions.map((session) => {
      const task = data.tasks.find((item) => item.id === session.taskId);
      return [session.endedAt, modeText(session.mode), session.plannedSeconds, session.actualSeconds, session.completed ? t('Evet') : t('Hayır'), task?.title ?? ''].map(csvEscape).join(',');
    });
    const content = `\uFEFF${header.map(csvEscape).join(',')}\n${lines.join('\n')}`;
    if (window.everstepDesktop) {
      const result = await window.everstepDesktop.exportFile(`everstep-oturumlar-${dateKey()}.csv`, content, [{ name: 'CSV', extensions: ['csv'] }]);
      if (result.ok) pushToast(t('CSV raporu kaydedildi.'), 'success');
    } else downloadText(`everstep-oturumlar-${dateKey()}.csv`, content, 'text/csv');
  }

  async function exportPdf() {
    if (!window.everstepDesktop) {
      pushToast(t('PDF raporu masaüstü sürümünde kullanılabilir.'), 'warning');
      return;
    }
    const html = buildPdfReport(data, language);
    const result = await window.everstepDesktop.exportPdf(`everstep-rapor-${dateKey()}.pdf`, html);
    if (result.ok) pushToast(t('PDF raporu kaydedildi.'), 'success');
  }

  async function importJson() {
    try {
      let content = '';
      if (window.everstepDesktop) {
        const result = await window.everstepDesktop.importJson();
        if (!result.ok || !result.content) return;
        content = result.content;
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        content = await new Promise<string>((resolve, reject) => {
          input.onchange = async () => {
            try {
              const file = input.files?.[0];
              if (!file || file.size > 25 * 1024 * 1024) throw new Error('Invalid JSON import file');
              resolve(await file.text());
            } catch (error) { reject(error); }
          };
          input.click();
        });
      }
      const imported = sanitizeData(JSON.parse(content));
      setData(imported);
      pushToast(t('Yedek başarıyla içe aktarıldı.'), 'success');
    } catch {
      pushToast(t('Yedek dosyası okunamadı.'), 'warning');
    }
  }

  function resetAllData() {
    if (!window.confirm(t('Tüm görevler, oturumlar ve ayarlar silinecek. Emin misin?'))) return;
    setData(structuredClone(defaultData));
    pushToast(t('Tüm veriler sıfırlandı.'), 'warning');
  }

  function downloadText(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const filteredTasks = data.tasks.filter((task) => taskFilter === 'all' || (taskFilter === 'completed' ? task.completed : !task.completed));
  const weekDays = lastNDays(7, language).map((day) => ({ ...day, seconds: focusSecondsForDay(data.sessions, day.key), count: focusCountForDay(data.sessions, day.key) }));
  const weekMax = Math.max(1, ...weekDays.map((day) => day.seconds));

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'dashboard', label: t('Bugün'), icon: '⌂' },
    { id: 'tasks', label: t('Görevler'), icon: '✓' },
    { id: 'statistics', label: t('İstatistik'), icon: '▥' },
    { id: 'achievements', label: t('Rozetler'), icon: '◇' },
    { id: 'sounds', label: t('Odak Sesleri'), icon: '♫' },
    { id: 'settings', label: t('Ayarlar'), icon: '⚙' }
  ];

  return (
    <div
      className={`app-shell ${focusMode ? 'focus-mode' : ''} ${data.settings.sidebarCollapsed ? 'sidebar-collapsed' : ''} ${sidebarResizing ? 'sidebar-resizing' : ''}`}
      style={{ '--sidebar-width': `${data.settings.sidebarCollapsed ? 76 : sidebarWidth}px` } as React.CSSProperties}
    >
      {!focusMode && (
        <aside className="sidebar">
          <button
            className="brand brand-button"
            type="button"
            onClick={toggleSidebarCollapsed}
            title={data.settings.sidebarCollapsed ? t('Sol paneli genişlet') : t('Sol paneli daralt')}
            aria-label={data.settings.sidebarCollapsed ? t('Sol paneli genişlet') : t('Sol paneli daralt')}
          >
            <img src="./assets/icon.png" alt="" />
            <div><strong>Everstep</strong><span>{t('Planla. Odaklan. İlerle.')}</span></div>
            <span className="collapse-glyph" aria-hidden="true">{data.settings.sidebarCollapsed ? '›' : '‹'}</span>
          </button>
          <nav aria-label={t('Ana menü')}>
            {navItems.map((item) => (
              <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)} title={data.settings.sidebarCollapsed ? item.label : undefined}>
                <span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>
                {item.id === 'tasks' && data.tasks.filter((task) => !task.completed).length > 0 && <em>{data.tasks.filter((task) => !task.completed).length}</em>}
              </button>
            ))}
          </nav>
          <div className="level-card">
            <div className="level-head"><span>{t('Seviye {level}', { level })}</span><b>{durationText(totalFocusSeconds)}</b></div>
            <div className="mini-progress"><i style={{ width: `${levelProgress}%` }} /></div>
            <small>{t('Sonraki seviye için {duration}', { duration: durationText(72_000 - (totalFocusSeconds % 72_000)) })}</small>
          </div>
          <div className="sidebar-footer"><span>{t('Çevrimdışı ve gizli')}</span><small>{t('Veriler yalnızca bu cihazda')}</small></div>
          {!data.settings.sidebarCollapsed && (
            <div
              className="sidebar-resizer"
              role="separator"
              aria-orientation="vertical"
              aria-label={t('Sol panel genişliğini ayarla')}
              aria-valuemin={180}
              aria-valuemax={380}
              aria-valuenow={Math.round(sidebarWidth)}
              onPointerDown={beginSidebarResize}
            ><span /></div>
          )}
        </aside>
      )}

      <main className="main-content">
        <header className="topbar">
          <div>
            <p>{new Intl.DateTimeFormat(localeFor(language), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
            <h1>{view === 'dashboard' ? t('Odaklanmaya hazır mısın?') : navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label={t('Odak modunu değiştir')} title={t('Odak modu (F)')} onClick={() => setFocusMode((current) => !current)}>{focusMode ? '↙' : '⛶'}</button>
            {!focusMode && <button className="primary small" onClick={openNewTask}>＋ {t('Yeni görev')}</button>}
          </div>
        </header>

        {view === 'dashboard' && (
          <section className={`today-shell ${focusMode ? 'focus-only' : ''}`}>
            <div className="today-hero glass">
              <div className="today-hero-overlay" aria-hidden="true" />
              {!focusMode && (
                <div className="today-summary-row">
                  <SummaryCard label={t('Bugünkü hedef')} value={`${todayFocusCount} / ${data.settings.dailyGoal}`} detail={t('Pomodoro')} progress={Math.min(100, todayFocusCount / data.settings.dailyGoal * 100)} />
                  <SummaryCard label={t('Odak süresi')} value={durationText(todayFocusSeconds)} detail={t('Bugün')} />
                  <SummaryCard label={t('Odak skoru')} value={`%${focusScore}`} detail={t('Son 7 gün')} />
                  <SummaryCard label={t('Güncel seri')} value={t('{count} gün', { count: streak })} detail={t('Devam et')} />
                </div>
              )}

              <div className="today-main-layout">
                <div className="today-focus-panel">
                  <div className="today-hero-copy">
                    <span>{t('BUGÜN')}</span>
                    <h2>{t('Bugün neye odaklanacaksın?')}</h2>
                    <p>{t('Pomodoro zamanlayıcısı, görevler, istatistikler ve odak sesleri tek bir yerde. Tüm verilerin yalnızca bilgisayarında kalır.')}</p>
                  </div>

                  <div className="timer-stage">
                    <div className="mode-tabs today-mode-tabs" role="tablist">
                      {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((mode) => (
                        <button key={mode} className={data.timer.mode === mode ? 'active' : ''} onClick={() => changeMode(mode)}>{modeText(mode)}</button>
                      ))}
                    </div>

                    <div className="timer-ring-wrap hero-ring-wrap">
                      <svg className="timer-ring" viewBox="0 0 260 260" aria-hidden="true">
                        <circle className="ring-track" cx="130" cy="130" r="112" />
                        <circle className="ring-progress" cx="130" cy="130" r="112" style={{ strokeDashoffset: 704 - 704 * Math.max(0, Math.min(1, timerProgress)) }} />
                      </svg>
                      <div className="timer-center hero-timer-center">
                        <span>{data.timer.running ? t('ŞU AN') : t('HAZIR')}</span>
                        <strong>{formatClock(data.timer.remainingSeconds)}</strong>
                        <p>{modeText(data.timer.mode)}</p>
                      </div>
                    </div>

                    <div className="timer-controls hero-controls">
                      <button className="secondary round" aria-label={t('Zamanlayıcıyı sıfırla')} title={t('Sıfırla (Ctrl+R)')} onClick={resetTimer}>↺</button>
                      <button className="primary timer-main hero-main-button" onClick={toggleTimer}>{data.timer.running ? `Ⅱ  ${t('Duraklat')}` : `▶  ${t('Başlat')}`}</button>
                      <button className="secondary round" aria-label={t('Sonraki oturuma geç')} title={t('Geç')} onClick={skipTimer}>↠</button>
                    </div>
                    <div className="shortcut-hint"><kbd>Space</kbd> {t('başlat/duraklat')} <span>•</span> <kbd>F</kbd> {t('odak modu')}</div>
                  </div>

                  <div className="today-bottom-row">
                    <div className="hero-info-card glass">
                      <small>{t('AKTİF GÖREV')}</small>
                      <strong>{selectedTask?.title ?? t('Bir görev seçilmedi')}</strong>
                      <span>{selectedTask ? t('{category} • {done}/{total} pomodoro', { category: selectedTask.category, done: selectedTask.completedPomodoros, total: selectedTask.estimatedPomodoros }) : t('Görev seç')}</span>
                      {!focusMode && <button className="text-button" onClick={() => setView('tasks')}>{selectedTask ? t('Değiştir') : t('Görev seç')} →</button>}
                    </div>

                    <div className="hero-info-card glass compact-insights">
                      <small>{t('Özet')}</small>
                      <div className="insight-inline"><b>{todayFocusCount}</b><span>{t('Pomodoro')}</span></div>
                      <div className="insight-inline"><b>{durationText(todayFocusSeconds)}</b><span>{t('Bugün')}</span></div>
                    </div>
                  </div>
                </div>

                {!focusMode && (
                  <div className="today-side-stack">
                    <div className="panel glass today-tasks hero-side-card">
                      <div className="panel-head"><div><span>{t('BUGÜN')}</span><h2>{t('Görevler')}</h2></div><button aria-label={t('Yeni görev ekle')} onClick={openNewTask}>＋</button></div>
                      <div className="compact-task-list">
                        {data.tasks.filter((task) => !task.completed).slice(0, 5).map((task) => (
                          <div key={task.id} className={`compact-task ${data.selectedTaskId === task.id ? 'selected' : ''}`}>
                            <button className="check" aria-label={t('“{task}” görevini tamamla', { task: task.title })} onClick={() => toggleTask(task.id)}>○</button>
                            <button className="task-select" onClick={() => setData((current) => ({ ...current, selectedTaskId: task.id }))}>
                              <strong>{task.title}</strong><span>{t('{category} • {done}/{total} pomodoro', { category: task.category, done: task.completedPomodoros, total: task.estimatedPomodoros })}</span>
                            </button>
                            <i className={`priority-dot ${task.priority}`} />
                          </div>
                        ))}
                        {data.tasks.filter((task) => !task.completed).length === 0 && <EmptyState icon="✓" title={t('Görev listen boş')} text={t('Bugün yapacağın ilk işi ekle.')} action={t('Görev ekle')} onAction={openNewTask} />}
                      </div>
                      {data.tasks.filter((task) => !task.completed).length > 5 && <button className="text-button" onClick={() => setView('tasks')}>{t('Tüm görevleri göster')} →</button>}
                    </div>

                    <div className="panel glass weekly-mini hero-side-card">
                      <div className="panel-head"><div><span>{t('SON 7 GÜN')}</span><h2>{t('Odak ritmi')}</h2></div><b>{durationText(weekDays.reduce((sum, day) => sum + day.seconds, 0))}</b></div>
                      <div className="bars compact">
                        {weekDays.map((day) => <Bar key={day.key} label={day.label} value={day.seconds} max={weekMax} tooltip={t('{count} pomodoro • {duration}', { count: day.count, duration: durationText(day.seconds) })} />)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'tasks' && (
          <section className="page-section">
            <div className="page-toolbar">
              <div className="segmented">
                {(['active', 'completed', 'all'] as const).map((filter) => <button key={filter} className={taskFilter === filter ? 'active' : ''} onClick={() => setTaskFilter(filter)}>{filter === 'active' ? t('Aktif') : filter === 'completed' ? t('Tamamlanan') : t('Tümü')}</button>)}
              </div>
              <span>{t('{count} görev', { count: filteredTasks.length })}</span>
            </div>
            <div className="task-grid">
              {filteredTasks.map((task) => (
                <article key={task.id} className={`task-card glass ${task.completed ? 'done' : ''} ${data.selectedTaskId === task.id ? 'selected' : ''}`}>
                  <div className="task-card-top"><button className="large-check" aria-label={task.completed ? t('“{task}” görevini yeniden aç', { task: task.title }) : t('“{task}” görevini tamamla', { task: task.title })} onClick={() => toggleTask(task.id)}>{task.completed ? '✓' : ''}</button><span className={`priority-pill ${task.priority}`}>{task.priority === 'high' ? t('Yüksek') : task.priority === 'medium' ? t('Orta') : t('Düşük')}</span></div>
                  <h3>{task.title}</h3>
                  <p>{task.notes || t('Bu görev için not eklenmemiş.')}</p>
                  <div className="task-meta"><span>{task.category}</span><span>{task.completedPomodoros} / {task.estimatedPomodoros} Pomodoro</span></div>
                  <div className="mini-progress"><i style={{ width: `${Math.min(100, task.completedPomodoros / task.estimatedPomodoros * 100)}%` }} /></div>
                  <div className="task-actions">
                    {!task.completed && <button className={data.selectedTaskId === task.id ? 'primary small' : 'secondary small'} onClick={() => setData((current) => ({ ...current, selectedTaskId: task.id }))}>{data.selectedTaskId === task.id ? t('Aktif görev') : t('Odaklan')}</button>}
                    <button className="icon-button" aria-label={t('“{task}” görevini düzenle', { task: task.title })} onClick={() => openEditTask(task)}>✎</button>
                    <button className="icon-button danger" aria-label={t('“{task}” görevini sil', { task: task.title })} onClick={() => deleteTask(task.id)}>⌫</button>
                  </div>
                </article>
              ))}
              {filteredTasks.length === 0 && <div className="wide-empty glass"><EmptyState icon="◎" title={t('Burada henüz görev yok')} text={t('Yeni bir görev ekleyerek odak planını oluşturmaya başla.')} action={t('Yeni görev')} onAction={openNewTask} /></div>}
            </div>
          </section>
        )}

        {view === 'statistics' && (
          <section className="page-section stats-page">
            <div className="summary-row four">
              <SummaryCard label={t('Toplam odak')} value={durationText(totalFocusSeconds)} detail={t('Tüm zamanlar')} />
              <SummaryCard label={t('Pomodoro')} value={String(totalPomodoros)} detail={t('Tamamlanan')} />
              <SummaryCard label={t('En uzun seri')} value={t('{count} gün', { count: streak })} detail={t('Güncel seri')} />
              <SummaryCard label={t('Odak skoru')} value={`%${focusScore}`} detail={t('Son 7 gün')} />
            </div>
            <div className="stats-layout">
              <div className="panel glass large-chart">
                <div className="panel-head"><div><span>{t('HAFTALIK')}</span><h2>{t('Odak süresi')}</h2></div><b>{durationText(weekDays.reduce((sum, day) => sum + day.seconds, 0))}</b></div>
                <div className="bars large">{weekDays.map((day) => <Bar key={day.key} label={day.label} value={day.seconds} max={weekMax} tooltip={durationText(day.seconds)} />)}</div>
              </div>
              <div className="panel glass insights">
                <div className="panel-head"><div><span>{t('İÇGÖRÜLER')}</span><h2>{t('Özet')}</h2></div></div>
                <Insight icon="◷" title={t('En verimli gün')} value={bestDayLabel(data.sessions, language)} />
                <Insight icon="◎" title={t('Ortalama oturum')} value={averageSessionLabel(data.sessions, language)} />
                <Insight icon="✓" title={t('Tamamlanan görev')} value={`${data.tasks.filter((task) => task.completed).length}`} />
                <Insight icon="↗" title={t('Günlük hedef')} value={`%${Math.round(Math.min(1, todayFocusCount / data.settings.dailyGoal) * 100)}`} />
              </div>
            </div>
            <div className="panel glass heatmap-panel">
              <div className="panel-head"><div><span>{t('SON 12 HAFTA')}</span><h2>{t('Odak takvimi')}</h2></div><div className="heat-legend"><span>{t('Az')}</span><i className="heat-0"/><i className="heat-1"/><i className="heat-2"/><i className="heat-3"/><i className="heat-4"/><span>{t('Çok')}</span></div></div>
              <Heatmap sessions={data.sessions} language={language} />
            </div>
          </section>
        )}

        {view === 'achievements' && (
          <section className="page-section">
            <div className="achievement-intro glass"><div><span>{t('Seviye {level}', { level }).toUpperCase()}</span><h2>{t('Odak yolculuğun')}</h2><p>{t('Her tamamlanan oturum seni bir sonraki seviyeye ve yeni rozetlere yaklaştırır.')}</p></div><div className="level-orb">{level}</div></div>
            <div className="achievement-grid">
              {achievementDefinitions.map((achievement) => {
                const unlocked = achievement.test(data);
                return <article key={achievement.id} className={`achievement-card glass ${unlocked ? 'unlocked' : 'locked'}`}><div className="achievement-icon">{achievement.icon}</div><span>{unlocked ? t('KAZANILDI') : t('KİLİTLİ')}</span><h3>{t(achievement.title)}</h3><p>{t(achievement.description)}</p></article>;
              })}
            </div>
          </section>
        )}

        {view === 'sounds' && (
          <section className="page-section">
            <div className="sound-hero glass"><div><span>{t('ODAK ATMOSFERİ')}</span><h2>{t('Dikkatini koruyan sesler')}</h2><p>{t('Doğal duyulan ses manzaraları Everstep ile birlikte gelir; internet bağlantısı gerekmez.')}</p></div><div className={`sound-wave ${data.settings.ambient !== 'none' ? 'playing' : ''}`}><i/><i/><i/><i/><i/></div></div>
            <div className="sound-grid">
              {ambientOptions.map((sound) => <button key={sound.id} className={`sound-card glass ${data.settings.ambient === sound.id ? 'active' : ''}`} onClick={() => updateSettings({ ambient: sound.id })}><span className="sound-icon">{sound.icon}</span><strong>{t(sound.name)}</strong><small>{t(sound.description)}</small><em>{data.settings.ambient === sound.id ? t('Çalıyor') : t('Seç')}</em></button>)}
            </div>
            <div className="panel glass volume-panel"><label><span>{t('Ses seviyesi')}</span><b>%{Math.round(data.settings.volume * 100)}</b></label><input type="range" min="0" max="1" step="0.01" value={data.settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })}/></div>
          </section>
        )}

        {view === 'settings' && (
          <section className="page-section settings-layout">
            <SettingsGroup title={t('Dil')} description={t('Uygulama dilini seç. Değişiklik anında uygulanır.')}>
              <div className="setting-row"><div><strong>{t('Dil')}</strong><span>{t('Windows diline göre otomatik seçilir')}</span></div><select className="language-select" value={data.settings.language} onChange={(event) => updateSettings({ language: event.target.value as LanguagePreference })}><option value="auto">{t('Sistem dili')}</option><option value="tr">Türkçe</option><option value="en">English</option><option value="es">Español</option><option value="ja">日本語</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="az">Azərbaycanca</option></select></div>
            </SettingsGroup>

            <SettingsGroup title={t('Zamanlayıcı')} description={t('Odak ve mola düzenini kişiselleştir.')}>
              <NumberSetting label={t('Odak süresi')} suffix={t('dakika')} value={data.settings.focusMinutes} min={1} max={180} onChange={(value) => updateSettings({ focusMinutes: value })} />
              <NumberSetting label={t('Kısa mola')} suffix={t('dakika')} value={data.settings.shortBreakMinutes} min={1} max={60} onChange={(value) => updateSettings({ shortBreakMinutes: value })} />
              <NumberSetting label={t('Uzun mola')} suffix={t('dakika')} value={data.settings.longBreakMinutes} min={1} max={90} onChange={(value) => updateSettings({ longBreakMinutes: value })} />
              <NumberSetting label={t('Uzun mola sıklığı')} suffix={t('oturum')} value={data.settings.longBreakEvery} min={2} max={12} onChange={(value) => updateSettings({ longBreakEvery: value })} />
              <NumberSetting label={t('Günlük hedef')} suffix={t('Pomodoro')} value={data.settings.dailyGoal} min={1} max={30} onChange={(value) => updateSettings({ dailyGoal: value })} />
              <ToggleSetting label={t('Molaları otomatik başlat')} value={data.settings.autoStartBreaks} onChange={(value) => updateSettings({ autoStartBreaks: value })} />
              <ToggleSetting label={t('Odak oturumlarını otomatik başlat')} value={data.settings.autoStartFocus} onChange={(value) => updateSettings({ autoStartFocus: value })} />
            </SettingsGroup>

            <SettingsGroup title={t('Görünüm')} description={t('Everstep’in nasıl görüneceğini belirle.')}>
              <div className="theme-grid">
                {themeOptions.map((theme) => (
                  <button key={theme.id} className={`theme-option theme-${theme.id} ${data.settings.theme === theme.id ? 'active' : ''}`} onClick={() => applyThemePreset(theme)}>
                    <i style={{ background: `linear-gradient(135deg, ${theme.palette.themeBase} 0 45%, ${theme.palette.themePrimary} 45% 72%, ${theme.palette.themeTertiary} 72%)` }} />
                    <strong>{theme.name}</strong><small>{t(theme.description)}</small>
                  </button>
                ))}
              </div>
              <div className="setting-row"><div><strong>{t('Vurgu rengi')}</strong><span>{t('Düğmeler ve ilerleme göstergeleri')}</span></div><div className="color-control"><input type="color" value={data.settings.accent} onChange={(event) => updateSettings({ accent: event.target.value })}/><code>{data.settings.accent}</code></div></div>

              <div className="setting-stack palette-section">
                <div className="settings-subtitle">
                  <strong>{t('Tema paleti')}</strong>
                  <span>{t('Uygulamanın panellerini, menüsünü ve ana zeminini kişiselleştir.')}</span>
                </div>
                <div className="palette-presets">
                  {themeOptions.map((preset) => (
                    <button key={`theme-palette-${preset.id}`} className="palette-preset" onClick={() => applyThemePalette(preset.palette)} title={preset.name}>
                      <i style={{ background: `linear-gradient(135deg, ${preset.palette.themePrimary}, ${preset.palette.themeSecondary} 55%, ${preset.palette.themeTertiary})` }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
                <div className="palette-preview glass theme-palette-preview">
                  <div className="theme-palette-preview-visual"><i/><i/><i/></div>
                  <div className="palette-grid">
                    <label><span>{t('Zemin')}</span><input type="color" value={data.settings.themeBase} onChange={(event) => updateSettings({ themeBase: event.target.value })} /><code>{data.settings.themeBase}</code></label>
                    <label><span>{t('Sol ışıma')}</span><input type="color" value={data.settings.themePrimary} onChange={(event) => updateSettings({ themePrimary: event.target.value })} /><code>{data.settings.themePrimary}</code></label>
                    <label><span>{t('Orta ton')}</span><input type="color" value={data.settings.themeSecondary} onChange={(event) => updateSettings({ themeSecondary: event.target.value })} /><code>{data.settings.themeSecondary}</code></label>
                    <label><span>{t('Sağ ışıma')}</span><input type="color" value={data.settings.themeTertiary} onChange={(event) => updateSettings({ themeTertiary: event.target.value })} /><code>{data.settings.themeTertiary}</code></label>
                  </div>
                </div>
              </div>

              <div className="setting-stack palette-section">
                <div className="settings-subtitle">
                  <strong>{t('Arka plan paleti')}</strong>
                  <span>{t('Bugün ekranındaki yumuşak gradyan arka planı kişiselleştir.')}</span>
                </div>
                <div className="palette-presets">
                  {dashboardPalettePresets.map((preset) => (
                    <button key={preset.id} className="palette-preset" onClick={() => applyDashboardPalette(preset.colors)} title={preset.name}>
                      <i style={{ background: `linear-gradient(135deg, ${preset.colors.backgroundPrimary}, ${preset.colors.backgroundSecondary} 55%, ${preset.colors.backgroundTertiary})` }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
                <div className="palette-preview glass">
                  <div className="palette-preview-visual" />
                  <div className="palette-grid">
                    <label><span>{t('Zemin')}</span><input type="color" value={data.settings.backgroundBase} onChange={(event) => updateSettings({ backgroundBase: event.target.value })} /><code>{data.settings.backgroundBase}</code></label>
                    <label><span>{t('Sol ışıma')}</span><input type="color" value={data.settings.backgroundPrimary} onChange={(event) => updateSettings({ backgroundPrimary: event.target.value })} /><code>{data.settings.backgroundPrimary}</code></label>
                    <label><span>{t('Orta ton')}</span><input type="color" value={data.settings.backgroundSecondary} onChange={(event) => updateSettings({ backgroundSecondary: event.target.value })} /><code>{data.settings.backgroundSecondary}</code></label>
                    <label><span>{t('Sağ ışıma')}</span><input type="color" value={data.settings.backgroundTertiary} onChange={(event) => updateSettings({ backgroundTertiary: event.target.value })} /><code>{data.settings.backgroundTertiary}</code></label>
                  </div>
                </div>
              </div>
              <ToggleSetting label={t('Pencereyi her zaman üstte tut')} value={data.settings.alwaysOnTop} onChange={(value) => updateSettings({ alwaysOnTop: value })} />
            </SettingsGroup>

            <SettingsGroup title={t('Bildirim ve ses')} description={t('Oturum geçişlerinde nasıl uyarılacağını seç.')}>
              <ToggleSetting label={t('Masaüstü bildirimleri')} value={data.settings.notifications} onChange={(value) => updateSettings({ notifications: value })} />
              <ToggleSetting label={t('Oturum bitiş sesi')} value={data.settings.soundEnabled} onChange={(value) => updateSettings({ soundEnabled: value })} />
              <ToggleSetting label={t('Motivasyon mesajları')} value={data.settings.showMotivation} onChange={(value) => updateSettings({ showMotivation: value })} />
            </SettingsGroup>

            <SettingsGroup title={t('Veriler')} description={t('Verilerini taşı, raporla veya sıfırla.')}>
              <div className="data-actions"><button className="secondary" onClick={exportJson}>{t('JSON yedekle')}</button><button className="secondary" onClick={importJson}>{t('Yedek içe aktar')}</button><button className="secondary" onClick={exportCsv}>{t('CSV raporu')}</button><button className="secondary" onClick={exportPdf}>{t('PDF raporu')}</button><button className="danger-button" onClick={resetAllData}>{t('Tüm verileri sil')}</button></div>
              <div className="privacy-note"><span>▣</span><div><strong>{t('Gizlilik öncelikli')}</strong><p>{t('Everstep hesap açmaz, reklam göstermez, kullanım verisi göndermez ve üretim sürümünde uzak ağ erişimini engeller.')}</p></div></div><div className="version-note">{t('Everstep sürüm {version} • Microsoft Store için MSIX hazır', { version: appVersion })}</div>
            </SettingsGroup>
          </section>
        )}
      </main>

      {taskModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setTaskModalOpen(false); }}>
          <div className="modal glass">
            <div className="modal-head"><div><span>{editingTaskId ? t('GÖREVİ DÜZENLE') : t('YENİ GÖREV')}</span><h2>{editingTaskId ? t('Görev ayrıntıları') : t('Bugün neye odaklanacaksın?')}</h2></div><button className="icon-button" aria-label={t('Görev penceresini kapat')} onClick={() => setTaskModalOpen(false)}>×</button></div>
            <label className="field"><span>{t('Görev başlığı')}</span><input autoFocus maxLength={100} placeholder={t('Örn. React dersinin 4. bölümünü bitir')} value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })}/></label>
            <label className="field"><span>{t('Notlar')}</span><textarea rows={3} maxLength={500} placeholder={t('Kısa notlar veya alt adımlar...')} value={taskDraft.notes} onChange={(event) => setTaskDraft({ ...taskDraft, notes: event.target.value })}/></label>
            <div className="field-row">
              <label className="field"><span>{t('Kategori')}</span><input list="categories" value={taskDraft.category} onChange={(event) => setTaskDraft({ ...taskDraft, category: event.target.value })}/><datalist id="categories"><option value={t('Yazılım')}/><option value={t('İngilizce')}/><option value={t('Okuma')}/><option value={t('Spor')}/><option value={t('İş')}/><option value={t('Diğer')}/></datalist></label>
              <label className="field"><span>{t('Öncelik')}</span><select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value as Priority })}><option value="low">{t('Düşük')}</option><option value="medium">{t('Orta')}</option><option value="high">{t('Yüksek')}</option></select></label>
              <label className="field"><span>{t('Tahmini Pomodoro')}</span><input type="number" min="1" max="30" value={taskDraft.estimatedPomodoros} onChange={(event) => { const value = Number(event.target.value); setTaskDraft({ ...taskDraft, estimatedPomodoros: Number.isFinite(value) ? Math.max(1, Math.min(30, value)) : 1 }); }}/></label>
            </div>
            <div className="modal-actions"><button className="secondary" onClick={() => setTaskModalOpen(false)}>{t('Vazgeç')}</button><button className="primary" onClick={saveTask}>{editingTaskId ? t('Değişiklikleri kaydet') : t('Görevi ekle')}</button></div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="modal-backdrop onboarding-backdrop">
          <div className="onboarding glass">
            <img src="./assets/icon.png" alt="Everstep" />
            <span>{t('EVERSTEP’A HOŞ GELDİN')}</span>
            <h2>{t('Odaklan. Tamamla. İlerle.')}</h2>
            <p>{t('Pomodoro zamanlayıcısı, görevler, istatistikler ve odak sesleri tek bir yerde. Tüm verilerin yalnızca bilgisayarında kalır.')}</p>
            <div className="onboarding-points"><div><b>25:00</b><span>{t('Akıllı zamanlayıcı')}</span></div><div><b>✓</b><span>{t('Görev takibi')}</span></div><div><b>▥</b><span>{t('Detaylı istatistik')}</span></div></div>
            <button className="primary" onClick={() => { localStorage.setItem('everstep:onboarded', '1'); setShowOnboarding(false); }}>{t('Başlayalım')}</button>
          </div>
        </div>
      )}

      <div className="toast-stack">{toasts.map((toast) => <div key={toast.id} className={`toast ${toast.tone ?? 'info'}`}>{toast.message}</div>)}</div>
    </div>
  );
}

function SummaryCard({ label, value, detail, progress }: { label: string; value: string; detail: string; progress?: number }) {
  return <div className="summary-card today-stat-card"><span>{label}</span><div><strong>{value}</strong><small>{detail}</small></div>{progress !== undefined && <div className="mini-progress"><i style={{ width: `${progress}%` }} /></div>}</div>;
}

function EmptyState({ icon, title, text, action, onAction }: { icon: string; title: string; text: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p><button className="text-button" onClick={onAction}>{action} →</button></div>;
}

function Bar({ label, value, max, tooltip }: { label: string; value: number; max: number; tooltip: string }) {
  const height = value === 0 ? 3 : Math.max(10, value / max * 100);
  return <div className="bar-item" title={tooltip}><div className="bar-track"><i style={{ height: `${height}%` }} /></div><span>{label}</span></div>;
}

function Insight({ icon, title, value }: { icon: string; title: string; value: string }) {
  return <div className="insight-row"><span>{icon}</span><div><small>{title}</small><strong>{value}</strong></div></div>;
}

function Heatmap({ sessions, language }: { sessions: FocusSession[]; language: ReturnType<typeof resolveLanguage> }) {
  const days: { key: string; count: number }[] = [];
  for (let offset = 83; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    days.push({ key, count: focusCountForDay(sessions, key) });
  }
  return <div className="heatmap">{days.map((day) => <i key={day.key} className={`heat-${Math.min(4, day.count)}`} title={`${day.key}: ${day.count} ${translate(language, 'Pomodoro')}`} />)}</div>;
}

function SettingsGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="settings-group glass"><div className="settings-title"><h2>{title}</h2><p>{description}</p></div><div className="settings-body">{children}</div></div>;
}

function NumberSetting({ label, suffix, value, min, max, onChange }: { label: string; suffix: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="setting-row"><div><strong>{label}</strong><span>{min}–{max} {suffix}</span></div><label className="number-control"><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value))))}/><span>{suffix}</span></label></div>;
}

function ToggleSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="setting-row"><div><strong>{label}</strong></div><button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} aria-pressed={value}><i /></button></div>;
}

function bestDayLabel(sessions: FocusSession[], language: ReturnType<typeof resolveLanguage>): string {
  const totals = new Map<number, number>();
  completedFocusSessions(sessions).forEach((session) => {
    const day = new Date(session.endedAt).getDay();
    totals.set(day, (totals.get(day) ?? 0) + session.actualSeconds);
  });
  if (totals.size === 0) return translate(language, 'Henüz veri yok');
  const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return translate(language, ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][best]);
}

function averageSessionLabel(sessions: FocusSession[], language: ReturnType<typeof resolveLanguage>): string {
  const focus = completedFocusSessions(sessions);
  if (focus.length === 0) return translate(language, 'Henüz veri yok');
  return formatDuration(focus.reduce((sum, session) => sum + session.actualSeconds, 0) / focus.length, language);
}


function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildPdfReport(data: AppData, language: ReturnType<typeof resolveLanguage>): string {
  const focus = completedFocusSessions(data.sessions);
  const totalSeconds = focus.reduce((sum, session) => sum + session.actualSeconds, 0);
  const completedTasks = data.tasks.filter((task) => task.completed).length;
  const recentRows = [...data.sessions]
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    .slice(0, 100)
    .map((session) => {
      const task = data.tasks.find((item) => item.id === session.taskId);
      return `<tr><td>${escapeHtml(new Date(session.endedAt).toLocaleString(localeFor(language)))}</td><td>${escapeHtml(modeLabel(session.mode, language))}</td><td>${escapeHtml(formatDuration(session.actualSeconds, language))}</td><td>${session.completed ? translate(language, 'Tamamlandı') : translate(language, 'Yarıda kaldı')}</td><td>${escapeHtml(task?.title ?? '—')}</td></tr>`;
    })
    .join('');

  const locale = localeFor(language);
  const tPdf = (source: string, variables: Record<string, string | number> = {}) => translate(language, source, variables);
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>${escapeHtml(tPdf('Odak Raporu'))}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#162033;margin:0;font-size:11px}h1{font-size:26px;margin:0}h2{font-size:16px;margin:28px 0 10px}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7c8cff;padding-bottom:14px}.brand{color:#5d6ee8;font-weight:800}.date{color:#6c768c}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.card{border:1px solid #dce1ee;border-radius:10px;padding:12px}.card span{display:block;color:#6c768c;font-size:9px;text-transform:uppercase;margin-bottom:7px}.card strong{font-size:16px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e5e8f0;vertical-align:top}th{background:#f3f5fa;color:#4f5b72;font-size:9px;text-transform:uppercase}footer{margin-top:22px;color:#7b8497;font-size:9px;text-align:center}
  </style></head><body><div class="head"><div><div class="brand">EVERSTEP</div><h1>${escapeHtml(tPdf('Odak Raporu'))}</h1></div><div class="date">${escapeHtml(new Date().toLocaleString(locale))}</div></div><div class="summary"><div class="card"><span>${escapeHtml(tPdf('Toplam odak'))}</span><strong>${escapeHtml(formatDuration(totalSeconds, language))}</strong></div><div class="card"><span>${escapeHtml(tPdf('Pomodoro'))}</span><strong>${focus.length}</strong></div><div class="card"><span>${escapeHtml(tPdf('Güncel seri'))}</span><strong>${escapeHtml(tPdf('{count} gün', { count: calculateStreak(data.sessions) }))}</strong></div><div class="card"><span>${escapeHtml(tPdf('Odak skoru'))}</span><strong>%${calculateFocusScore(data.sessions)}</strong></div><div class="card"><span>${escapeHtml(tPdf('Tamamlanan görev'))}</span><strong>${completedTasks}</strong></div><div class="card"><span>${escapeHtml(tPdf('Aktif görevler'))}</span><strong>${data.tasks.filter((task) => !task.completed).length}</strong></div><div class="card"><span>${escapeHtml(tPdf('En verimli gün'))}</span><strong>${escapeHtml(bestDayLabel(data.sessions, language))}</strong></div><div class="card"><span>${escapeHtml(tPdf('Ortalama oturum'))}</span><strong>${escapeHtml(averageSessionLabel(data.sessions, language))}</strong></div></div><h2>${escapeHtml(tPdf('Son oturumlar'))}</h2><table><thead><tr><th>${escapeHtml(tPdf('Tarih'))}</th><th>${escapeHtml(tPdf('Tür'))}</th><th>${escapeHtml(tPdf('Süre'))}</th><th>${escapeHtml(tPdf('Durum'))}</th><th>${escapeHtml(tPdf('Görev'))}</th></tr></thead><tbody>${recentRows || `<tr><td colspan="5">${escapeHtml(tPdf('Henüz oturum kaydı yok.'))}</td></tr>`}</tbody></table><footer>${escapeHtml(tPdf('Bu rapor Everstep tarafından cihaz üzerinde oluşturulmuştur.'))}</footer></body></html>`;
}

export default App;
