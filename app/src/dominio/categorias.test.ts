import { describe, expect, it } from 'vitest';
import { adicionarCategoria, categoriasEfetivas, contarPorCategoria, normalizarCategorias, removerDaLista, renomearNaLista, validarNovaCategoria } from './categorias';
import { novoConteudo, novoItemAberto } from './itens';

const item = (categoria: string, status: 'ativo' | 'excluido' = 'ativo') => ({
  ...novoItemAberto(categoria + Math.random(), { ...novoConteudo('login'), nome: 'x', categoria }),
  status,
});

describe('categorias', () => {
  it('normaliza: sem repetidas/vazias e "Outros" por último', () => {
    expect(normalizarCategorias(['Outros', 'Bancos', ' bancos ', '', 'Pets  da  casa'])).toEqual(['Bancos', 'Pets da casa', 'Outros']);
  });

  it('adiciona, renomeia e remove', () => {
    let l = normalizarCategorias(['Bancos']);
    l = adicionarCategoria(l, 'Saúde');
    expect(l).toEqual(['Bancos', 'Saúde', 'Outros']);
    expect(renomearNaLista(l, 'saúde', 'Saúde e plano')).toEqual(['Bancos', 'Saúde e plano', 'Outros']);
    expect(removerDaLista(l, 'Bancos')).toEqual(['Saúde', 'Outros']);
    expect(removerDaLista(l, 'Outros')).toEqual(l); // "Outros" não sai
  });

  it('validação de nome novo', () => {
    expect(validarNovaCategoria(' ', ['Bancos'])).not.toBeNull();
    expect(validarNovaCategoria('BANCOS', ['Bancos'])).not.toBeNull();
    expect(validarNovaCategoria('Saúde', ['Bancos'])).toBeNull();
  });

  it('efetivas incluem categorias usadas por itens ativos', () => {
    expect(categoriasEfetivas(['Bancos', 'Outros'], [item('Clube'), item('Antiga', 'excluido')])).toEqual(['Bancos', 'Clube', 'Outros']);
  });

  it('conta só itens ativos', () => {
    const m = contarPorCategoria([item('Bancos'), item('Bancos'), item('Bancos', 'excluido'), item('Outros')]);
    expect([...m]).toEqual([['Bancos', 2], ['Outros', 1]]);
  });
});
