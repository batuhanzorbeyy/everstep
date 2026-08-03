import { describe, expect, it } from 'vitest';
import { csvEscape } from './utils';

describe('CSV dışa aktarma', () => {
  it('formül olarak yorumlanabilecek hücreleri metinleştirir', () => {
    for (const value of ['=SUM(A1:A2)', '+1+1', '-1+1', '@SUM(A1:A2)', '  =SUM(A1:A2)']) {
      expect(csvEscape(value)).toBe(`"'${value}"`);
    }
  });

  it('normal metni ve tırnak işaretlerini korur', () => {
    expect(csvEscape('Normal görev')).toBe('"Normal görev"');
    expect(csvEscape('"Alıntı"')).toBe('"""Alıntı"""');
  });
});
