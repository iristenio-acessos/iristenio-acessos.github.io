import { describe, expect, it } from 'vitest';
import { destravarSenha, situacaoDigital, travarSenha, type ConfigDigital } from './digital';

const segredo = new Uint8Array(32).fill(7);
const outro = new Uint8Array(32).fill(8);
const cofre = { sal: 's', verificador: 'v' };
const cfg = (ativada_em = '2026-10-01T00:00:00Z'): ConfigDigital => ({
  credencial: 'c',
  salPrf: 'p',
  senhaTravada: 'x',
  cofreSal: 's',
  cofreVerificador: 'v',
  ativada_em,
});

describe('desbloqueio com digital', () => {
  it('trava e destrava a senha só com o mesmo segredo da digital', async () => {
    const travada = await travarSenha(segredo, 'minha senha mestra');
    expect(travada).not.toContain('minha');
    expect(await destravarSenha(segredo, travada)).toBe('minha senha mestra');
    await expect(destravarSenha(outro, travada)).rejects.toThrow();
  });

  it('situação: desligada, pronta, pedir a senha após 7 dias, inválida se o cofre mudar', () => {
    const agora = new Date('2026-10-05T00:00:00Z');
    expect(situacaoDigital(undefined, cofre, undefined, agora)).toBe('desligada');
    expect(situacaoDigital(cfg(), cofre, undefined, agora)).toBe('pronta');
    expect(situacaoDigital(cfg(), cofre, '2026-09-20T00:00:00Z', agora)).toBe('pedir-senha');
    expect(situacaoDigital(cfg('2026-09-01T00:00:00Z'), cofre, '2026-10-04T00:00:00Z', agora)).toBe('pronta');
    expect(situacaoDigital(cfg(), { sal: 's', verificador: 'novo' }, undefined, agora)).toBe('invalida');
    expect(situacaoDigital(cfg(), undefined, undefined, agora)).toBe('invalida');
  });
});
