import { describe, expect, it } from 'vitest';
import { localeFor, resolveLanguage, translate } from './i18n';

describe('Everstep localization', () => {
  it('translates interface text to every supported language', () => {
    expect(translate('en', 'Görevler')).toBe('Tasks');
    expect(translate('es', 'Görevler')).toBe('Tareas');
    expect(translate('ja', 'Görevler')).toBe('タスク');
    expect(translate('de', 'Görevler')).toBe('Aufgaben');
    expect(translate('it', 'Görevler')).toBe('Attività');
    expect(translate('az', 'Görevler')).toBe('Tapşırıqlar');
  });

  it('translates focus-sound labels in the new language packs', () => {
    expect(translate('ja', 'Gök Gürültülü Sağanak')).toBe('雷雨');
    expect(translate('de', 'Şömine ve Kamp Ateşi')).toBe('Kamin und Lagerfeuer');
    expect(translate('it', 'Okyanus Dalgaları')).toBe("Onde dell'oceano");
    expect(translate('az', 'Rüzgar ve Yapraklar')).toBe('Külək və yarpaqlar');
  });

  it('interpolates variables', () => {
    expect(translate('en', '{count} gün', { count: 3 })).toBe('3 days');
    expect(translate('es', 'Seviye {level}', { level: 2 })).toBe('Nivel 2');
    expect(translate('ja', 'Seviye {level}', { level: 4 })).toBe('レベル 4');
    expect(translate('de', 'Sonraki seviye için {duration}', { duration: '10 Min.' })).toBe('10 Min. bis zur nächsten Stufe');
    expect(translate('it', 'Yeni rozet: {title}', { title: 'Primo passo' })).toBe('Nuovo badge: Primo passo');
    expect(translate('az', '{count} görev', { count: 5 })).toBe('5 tapşırıq');
  });

  it('returns supported locales', () => {
    expect(localeFor('tr')).toBe('tr-TR');
    expect(localeFor('en')).toBe('en-US');
    expect(localeFor('es')).toBe('es-ES');
    expect(localeFor('ja')).toBe('ja-JP');
    expect(localeFor('de')).toBe('de-DE');
    expect(localeFor('it')).toBe('it-IT');
    expect(localeFor('az')).toBe('az-Latn-AZ');
  });

  it('keeps explicit language preferences', () => {
    expect(resolveLanguage('tr')).toBe('tr');
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('es')).toBe('es');
    expect(resolveLanguage('ja')).toBe('ja');
    expect(resolveLanguage('de')).toBe('de');
    expect(resolveLanguage('it')).toBe('it');
    expect(resolveLanguage('az')).toBe('az');
  });
});
