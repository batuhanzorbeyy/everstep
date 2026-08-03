import type { FocusSession, TimerMode } from './types';
import type { ResolvedLanguage } from './i18n';
import { localeFor, translate } from './i18n';

export const uid = (): string => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export type SurfaceTone = 'light' | 'dark';

function parseHexColor(color: string): [number, number, number] | null {
  const normalized = color.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

export function relativeLuminance(color: string): number {
  const rgb = parseHexColor(color);
  if (!rgb) return 0;
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function themeSurfaceTone(base: string, secondary: string): SurfaceTone {
  const weightedLuminance = relativeLuminance(base) * 0.72 + relativeLuminance(secondary) * 0.28;
  return weightedLuminance >= 0.56 ? 'light' : 'dark';
}

export function contrastTextColor(background: string): '#111827' | '#ffffff' {
  return relativeLuminance(background) >= 0.45 ? '#111827' : '#ffffff';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function dateKey(input: Date | string = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number, language: ResolvedLanguage = 'tr'): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (language === 'tr') return hours === 0 ? `${minutes} dk` : `${hours} sa ${minutes} dk`;
  if (language === 'es' || language === 'it') return hours === 0 ? `${minutes} min` : `${hours} h ${minutes} min`;
  if (language === 'de') return hours === 0 ? `${minutes} Min.` : `${hours} Std. ${minutes} Min.`;
  if (language === 'ja') return hours === 0 ? `${minutes}分` : `${hours}時間 ${minutes}分`;
  if (language === 'az') return hours === 0 ? `${minutes} dəq` : `${hours} saat ${minutes} dəq`;
  return hours === 0 ? `${minutes} min` : `${hours} hr ${minutes} min`;
}

export function modeLabel(mode: TimerMode, language: ResolvedLanguage = 'tr'): string {
  if (mode === 'focus') return translate(language, 'Odak');
  if (mode === 'shortBreak') return translate(language, 'Kısa Mola');
  return translate(language, 'Uzun Mola');
}

export function completedFocusSessions(sessions: FocusSession[]): FocusSession[] {
  return sessions.filter((session) => session.mode === 'focus' && session.completed);
}

export function focusSecondsForDay(sessions: FocusSession[], key: string): number {
  return completedFocusSessions(sessions)
    .filter((session) => dateKey(session.endedAt) === key)
    .reduce((sum, session) => sum + session.actualSeconds, 0);
}

export function focusCountForDay(sessions: FocusSession[], key: string): number {
  return completedFocusSessions(sessions).filter((session) => dateKey(session.endedAt) === key).length;
}

export function lastNDays(days: number, language: ResolvedLanguage = 'tr'): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const formatter = new Intl.DateTimeFormat(localeFor(language), { weekday: 'short' });
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    result.push({ key: dateKey(date), label: formatter.format(date).replace('.', '') });
  }
  return result;
}

export function calculateStreak(sessions: FocusSession[]): number {
  const activeDays = new Set(completedFocusSessions(sessions).map((session) => dateKey(session.endedAt)));
  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateFocusScore(sessions: FocusSession[], periodDays = 7): number {
  const from = Date.now() - periodDays * 86_400_000;
  const relevant = sessions.filter((session) => new Date(session.startedAt).getTime() >= from && session.mode === 'focus');
  if (relevant.length === 0) return 0;
  const planned = relevant.reduce((sum, session) => sum + session.plannedSeconds, 0);
  const actual = relevant.reduce((sum, session) => sum + Math.min(session.actualSeconds, session.plannedSeconds), 0);
  const completionRate = relevant.filter((session) => session.completed).length / relevant.length;
  const timeRate = planned ? actual / planned : 0;
  return Math.round(clamp((completionRate * 0.65 + timeRate * 0.35) * 100, 0, 100));
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  const safeText = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}
