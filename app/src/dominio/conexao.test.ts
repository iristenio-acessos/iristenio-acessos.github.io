import { describe, expect, it } from 'vitest';
import { cofreTrocou, compararCofres } from './conexao';
import type { Cofre } from './tipos';

const cofre = (sal: string, verificador = 'v'): Cofre => ({ id: 'cofre', sal, rodadas: 1, verificador, cifrado: '', criado_em: '', atualizado_em: '' });

describe('conexão com a planilha', () => {
  it('compara os cofres pelo sal', () => {
    expect(compararCofres(cofre('a'), undefined)).toBe('planilha-vazia');
    expect(compararCofres(undefined, undefined)).toBe('planilha-vazia');
    expect(compararCofres(undefined, cofre('a'))).toBe('baixar-cofre');
    expect(compararCofres(cofre('a'), cofre('a', 'outro'))).toBe('mesmo-cofre');
    expect(compararCofres(cofre('a'), cofre('b'))).toBe('cofres-diferentes');
  });

  it('percebe quando o cofre aberto foi trocado', () => {
    expect(cofreTrocou(null, cofre('a'))).toBe(false);
    expect(cofreTrocou(cofre('a'), cofre('a'))).toBe(false);
    expect(cofreTrocou(cofre('a'), cofre('a', 'novo'))).toBe(true);
    expect(cofreTrocou(cofre('a'), cofre('b'))).toBe(true);
    expect(cofreTrocou(cofre('a'), undefined)).toBe(true);
  });
});
