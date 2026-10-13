import { describe, expect, it } from 'vitest';
import { abrirCofre, cifrar, criarCofre, decifrar, validarSenhaMestra } from './cripto';

// Poucas rodadas nos testes (o app usa 600.000) só para rodar rápido.
const RODADAS = 1000;

describe('criptografia do cofre', () => {
  it('senha certa abre; senha errada não', async () => {
    const { cofre } = await criarCofre('minha senha mestra', new Date(), RODADAS);
    expect(await abrirCofre(cofre, 'minha senha mestra')).not.toBeNull();
    expect(await abrirCofre(cofre, 'minha senha mestrA')).toBeNull();
  });

  it('o cofre gravado não contém a senha', async () => {
    const { cofre } = await criarCofre('minha senha mestra', new Date(), RODADAS);
    expect(JSON.stringify(cofre)).not.toContain('minha senha');
  });

  it('cifrar e decifrar; o mesmo texto gera resultados diferentes', async () => {
    const { chave } = await criarCofre('minha senha mestra', new Date(), RODADAS);
    const a = await cifrar(chave, 'Olá, ção!');
    const b = await cifrar(chave, 'Olá, ção!');
    expect(a).not.toBe(b);
    expect(await decifrar(chave, a)).toBe('Olá, ção!');
  });

  it('recusa dado alterado ou chave de outro cofre', async () => {
    const { chave } = await criarCofre('minha senha mestra', new Date(), RODADAS);
    const { chave: outra } = await criarCofre('minha senha mestra', new Date(), RODADAS); // outro sal
    const x = await cifrar(chave, 'segredo');
    const adulterado = x.slice(0, -4) + (x.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await expect(decifrar(chave, adulterado)).rejects.toThrow();
    await expect(decifrar(outra, x)).rejects.toThrow();
  });

  it('validação da senha mestra', () => {
    expect(validarSenhaMestra('curta', 'curta')).toHaveLength(1);
    expect(validarSenhaMestra('uma senha longa', 'outra senha longa')).toHaveLength(1);
    expect(validarSenhaMestra('uma senha longa', 'uma senha longa')).toHaveLength(0);
  });
});
