import { describe, expect, it } from 'vitest';
import { deveTrancar, esperaAposErros } from './trava';

const MIN = 60_000;

describe('trava', () => {
  it('tranca depois de N minutos sem uso', () => {
    expect(deveTrancar({ ultimaAtividade: 0, saiuEm: null }, 3 * MIN - 1, 3)).toBe(false);
    expect(deveTrancar({ ultimaAtividade: 0, saiuEm: null }, 3 * MIN, 3)).toBe(true);
  });
  it('tranca depois de 1 minuto em segundo plano', () => {
    expect(deveTrancar({ ultimaAtividade: 0, saiuEm: 0 }, 59_000, 15)).toBe(false);
    expect(deveTrancar({ ultimaAtividade: 0, saiuEm: 0 }, 60_000, 15)).toBe(true);
  });
  it('espera cresce depois de 5 erros', () => {
    expect(esperaAposErros(4)).toBe(0);
    expect(esperaAposErros(5)).toBe(30_000);
    expect(esperaAposErros(6)).toBe(60_000);
    expect(esperaAposErros(7)).toBe(120_000);
  });
});
