import { describe, expect, it } from 'vitest';
import { CONJUNTOS, descreverForca, forcaBits, gerarSenha, OPCOES_PADRAO, sorteioSeguro } from './gerador';

describe('gerador de senha', () => {
  it('tem o tamanho pedido e um caractere de cada conjunto', () => {
    for (let n = 0; n < 50; n++) {
      const s = gerarSenha({ ...OPCOES_PADRAO, tamanho: 12 });
      expect(s).toHaveLength(12);
      for (const c of Object.values(CONJUNTOS)) expect([...s].some((x) => c.includes(x))).toBe(true);
    }
  });

  it('respeita os conjuntos desligados', () => {
    const s = gerarSenha({ tamanho: 30, maiusculas: false, minusculas: false, numeros: true, simbolos: false });
    expect(s).toMatch(/^[0-9]{30}$/);
  });

  it('nada escolhido vira só letras minúsculas; tamanho fica entre 4 e 40', () => {
    expect(gerarSenha({ tamanho: 3, maiusculas: false, minusculas: false, numeros: false, simbolos: false })).toMatch(/^[a-z]{4}$/);
    expect(gerarSenha({ tamanho: 6, maiusculas: false, minusculas: false, numeros: true, simbolos: false })).toMatch(/^[0-9]{6}$/);
    expect(gerarSenha({ ...OPCOES_PADRAO, tamanho: 99 })).toHaveLength(40);
  });

  it('senhas diferentes a cada vez; sorteio dentro do limite', () => {
    expect(new Set(Array.from({ length: 20 }, () => gerarSenha())).size).toBe(20);
    for (let n = 0; n < 200; n++) expect(sorteioSeguro(7)).toBeLessThan(7);
  });

  it('força', () => {
    expect(descreverForca(forcaBits(OPCOES_PADRAO)).nivel).toBe('forte');
    expect(descreverForca(forcaBits({ tamanho: 8, maiusculas: false, minusculas: false, numeros: true, simbolos: false })).nivel).toBe('fraca');
  });
});
