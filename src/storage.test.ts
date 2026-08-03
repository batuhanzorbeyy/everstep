import { describe, expect, it } from 'vitest';
import {
  defaultData,
  MAX_IMPORTED_ACHIEVEMENTS,
  MAX_IMPORTED_SESSIONS,
  MAX_IMPORTED_TASKS,
  sanitizeData
} from './storage';

describe('Everstep veri doğrulama', () => {
  it('geçersiz kök veriyi varsayılan yapıya dönüştürür', () => {
    expect(sanitizeData(null)).toEqual(defaultData);
  });

  it('ayarları güvenli sınırlara çeker', () => {
    const data = sanitizeData({
      settings: {
        focusMinutes: 999,
        shortBreakMinutes: -5,
        volume: 4,
        theme: 'unknown',
        accent: 'javascript:alert(1)',
        language: 'unsupported'
      }
    });
    expect(data.settings.focusMinutes).toBe(180);
    expect(data.settings.shortBreakMinutes).toBe(1);
    expect(data.settings.volume).toBe(1);
    expect(data.settings.theme).toBe('midnight');
    expect(data.settings.accent).toBe('#7c8cff');
    expect(data.settings.language).toBe('auto');
  });


  it('yeni dil tercihlerini güvenli biçimde korur', () => {
    for (const language of ['ja', 'de', 'it', 'az'] as const) {
      const data = sanitizeData({ settings: { language } });
      expect(data.settings.language).toBe(language);
    }
  });

  it('yeni çevrimdışı ortam seslerini korur', () => {
    const data = sanitizeData({ settings: { ambient: 'thunderstorm' } });
    expect(data.settings.ambient).toBe('thunderstorm');
  });

  it('başlıksız görevleri ve geçersiz oturumları ayıklar', () => {
    const data = sanitizeData({
      tasks: [{ id: 'bad', title: '' }, { id: 'ok', title: 'Çalış', estimatedPomodoros: 3 }],
      sessions: [{ id: 'bad' }]
    });
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe('Çalış');
    expect(data.sessions).toHaveLength(0);
  });

  it('içe aktarılan koleksiyonları güvenli sınırlarda tutar', () => {
    const tasks = Array.from({ length: MAX_IMPORTED_TASKS + 1 }, (_, index) => ({
      id: `task-${index}`,
      title: `Görev ${index}`
    }));
    const sessions = Array.from({ length: MAX_IMPORTED_SESSIONS + 1 }, (_, index) => ({
      id: `session-${index}`,
      startedAt: '2026-01-01T09:00:00.000Z',
      endedAt: '2026-01-01T09:25:00.000Z'
    }));
    const achievementsSeen = Array.from({ length: MAX_IMPORTED_ACHIEVEMENTS + 1 }, (_, index) => `achievement-${index}`);

    const data = sanitizeData({ tasks, sessions, achievementsSeen });

    expect(data.tasks).toHaveLength(MAX_IMPORTED_TASKS);
    expect(data.sessions).toHaveLength(MAX_IMPORTED_SESSIONS);
    expect(data.achievementsSeen).toHaveLength(MAX_IMPORTED_ACHIEVEMENTS);
  });
});
