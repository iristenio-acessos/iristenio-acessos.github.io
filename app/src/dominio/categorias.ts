// Categorias: lista padrão + as criadas pelo usuário (guardadas criptografadas no registro do cofre).
import type { ItemAberto } from './tipos';
import { CATEGORIAS_PADRAO } from './itens';

/** Categoria que sempre existe (recebe os itens de uma categoria removida). */
export const CATEGORIA_RESERVA = 'Outros';

/** Preferências do cofre (sincronizadas, criptografadas em Cofre.cifrado). */
export interface PreferenciasCofre {
  categorias: string[];
}

const chave = (s: string) => s.trim().toLocaleLowerCase('pt-BR');
const mesma = (a: string, b: string) => chave(a) === chave(b);

export function preferenciasPadrao(): PreferenciasCofre {
  return { categorias: [...CATEGORIAS_PADRAO] };
}

/** Sem repetidas (ignorando maiúsculas), sem vazias, e "Outros" sempre por último. */
export function normalizarCategorias(lista: string[]): string[] {
  const vistas = new Set<string>();
  const final: string[] = [];
  for (const nome of lista.map((s) => s.trim().replace(/\s+/g, ' '))) {
    if (!nome || vistas.has(chave(nome)) || mesma(nome, CATEGORIA_RESERVA)) continue;
    vistas.add(chave(nome));
    final.push(nome);
  }
  return [...final, CATEGORIA_RESERVA];
}

/** Categorias para escolher: as guardadas + alguma usada por item e que não está na lista. */
export function categoriasEfetivas(guardadas: string[], itens: ItemAberto[]): string[] {
  const usadas = itens.filter((i) => i.status !== 'excluido').map((i) => i.conteudo.categoria);
  return normalizarCategorias([...guardadas.filter((c) => !mesma(c, CATEGORIA_RESERVA)), ...usadas]);
}

export function validarNovaCategoria(nome: string, existentes: string[]): string | null {
  const limpo = nome.trim();
  if (!limpo) return 'Digite o nome da categoria.';
  if (limpo.length > 30) return 'Use no máximo 30 letras.';
  if (existentes.some((c) => mesma(c, limpo))) return 'Já existe uma categoria com esse nome.';
  return null;
}

export function adicionarCategoria(lista: string[], nome: string): string[] {
  return normalizarCategorias([...lista, nome]);
}

export function renomearNaLista(lista: string[], de: string, para: string): string[] {
  return normalizarCategorias(lista.map((c) => (mesma(c, de) ? para.trim() : c)));
}

export function removerDaLista(lista: string[], nome: string): string[] {
  return normalizarCategorias(lista.filter((c) => !mesma(c, nome)));
}

/** Itens (ativos e excluídos) que precisam mudar de categoria ao renomear/remover. */
export function itensDaCategoria(itens: ItemAberto[], nome: string): ItemAberto[] {
  return itens.filter((i) => mesma(i.conteudo.categoria, nome));
}

/** Quantos itens ativos em cada categoria (para os filtros). */
export function contarPorCategoria(itens: ItemAberto[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const i of itens) if (i.status !== 'excluido') mapa.set(i.conteudo.categoria, (mapa.get(i.conteudo.categoria) ?? 0) + 1);
  return mapa;
}
