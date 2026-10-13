// Sessão do cofre: guarda a chave SÓ NA MEMÓRIA enquanto o cofre está destrancado.
// Trancar = esquecer a chave (e a tela deixa de mostrar qualquer dado aberto).
import type { Cofre, ItemAberto, ItemCifrado } from '../dominio/tipos';
import { ID_COFRE } from '../dominio/tipos';
import { abrirCofre, cifrar, criarCofre, decifrar } from '../dominio/cripto';
import { CATEGORIA_RESERVA, itensDaCategoria, normalizarCategorias, preferenciasPadrao, removerDaLista, renomearNaLista, type PreferenciasCofre } from '../dominio/categorias';
import { abrirItem, fecharItem } from '../dominio/itens';
import { esperaAposErros } from '../dominio/trava';
import { buscar, gravar, lerInterno, listarTodos, salvar, salvarInterno } from './repositorio';

let chave: CryptoKey | null = null;
const ouvintes = new Set<() => void>();

export function aoMudarSessao(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function avisar() {
  ouvintes.forEach((fn) => fn());
}

export const destrancado = () => chave !== null;

export const lerCofre = (): Promise<Cofre | undefined> => buscar('cofre', ID_COFRE);

/** RN01 — cria o cofre com a senha mestra e já o deixa destrancado. */
export async function criarNovoCofre(senha: string) {
  if (await lerCofre()) throw new Error('Este aparelho já tem um cofre.');
  const novo = await criarCofre(senha);
  await salvar('cofre', novo.cofre);
  chave = novo.chave;
  avisar();
}

/* ---------------- Destrancar (RN03: espera crescente após erros) ---------------- */

interface Tentativas {
  erros: number;
  /** Carimbo (ms) até quando é preciso esperar. */
  ate: number;
}

export async function lerTentativas(): Promise<Tentativas> {
  return (await lerInterno<Tentativas>('_tentativas')) ?? { erros: 0, ate: 0 };
}

export type ResultadoDestrancar = { ok: true } | { ok: false; esperarAte: number; erros: number };

export async function destrancar(senha: string, agora = Date.now()): Promise<ResultadoDestrancar> {
  const tentativas = await lerTentativas();
  if (tentativas.ate > agora) return { ok: false, esperarAte: tentativas.ate, erros: tentativas.erros };
  const cofre = await lerCofre();
  const k = cofre ? await abrirCofre(cofre, senha) : null;
  if (!k) {
    const erros = tentativas.erros + 1;
    const ate = agora + esperaAposErros(erros);
    await salvarInterno('_tentativas', { erros, ate });
    return { ok: false, esperarAte: ate, erros };
  }
  await salvarInterno('_tentativas', undefined);
  chave = k;
  avisar();
  return { ok: true };
}

export function trancar() {
  if (!chave) return;
  chave = null;
  avisar();
}

function chaveAtual(): CryptoKey {
  if (!chave) throw new Error('O cofre está trancado.');
  return chave;
}

/* ---------------- Itens ---------------- */

/** Todos os itens abertos. Itens que não abrem com esta chave são ignorados (contados em `ilegiveis`). */
export async function listarAbertos(): Promise<{ itens: ItemAberto[]; ilegiveis: number }> {
  const k = chave;
  if (!k) return { itens: [], ilegiveis: 0 };
  const cifrados = await listarTodos('itens');
  const abertos = await Promise.all(cifrados.map((i) => abrirItem(k, i).catch(() => null)));
  const itens = abertos.filter((i): i is ItemAberto => i !== null);
  return { itens, ilegiveis: abertos.length - itens.length };
}

export async function buscarAberto(id: string): Promise<ItemAberto | undefined> {
  const item = await buscar('itens', id);
  return item ? abrirItem(chaveAtual(), item) : undefined;
}

/** Criptografa e grava. Devolve a versão anterior (cifrada), para "Desfazer". */
export async function gravarItem(item: ItemAberto, operacao?: 'excluir'): Promise<ItemCifrado | undefined> {
  const cifrado = await fecharItem(chaveAtual(), item);
  const [anterior] = await gravar([{ entidade: 'itens', registro: cifrado, operacao }]);
  return anterior as ItemCifrado | undefined;
}

/** Desfaz uma gravação: volta à versão anterior ou exclui o item criado. */
export async function restaurarItem(anterior: ItemCifrado | undefined, id: string) {
  if (anterior) await salvar('itens', anterior);
  else {
    const atual = await buscar('itens', id);
    if (atual) await gravar([{ entidade: 'itens', registro: { ...atual, status: 'excluido' }, operacao: 'excluir' }]);
  }
}

/* ---------------- Preferências do cofre (categorias) — criptografadas no registro do cofre ---------------- */

export async function lerPreferencias(): Promise<PreferenciasCofre> {
  const k = chave;
  const cofre = await lerCofre();
  if (!k || !cofre?.cifrado) return preferenciasPadrao();
  try {
    const salvo = JSON.parse(await decifrar(k, cofre.cifrado)) as Partial<PreferenciasCofre>;
    return { ...preferenciasPadrao(), ...salvo, categorias: normalizarCategorias(salvo.categorias ?? preferenciasPadrao().categorias) };
  } catch {
    return preferenciasPadrao();
  }
}

export async function salvarCategorias(categorias: string[]) {
  const cofre = await lerCofre();
  if (!cofre) throw new Error('Cofre não encontrado.');
  const prefs = { ...(await lerPreferencias()), categorias: normalizarCategorias(categorias) };
  await salvar('cofre', { ...cofre, cifrado: await cifrar(chaveAtual(), JSON.stringify(prefs)) });
}

/** Troca a categoria de todos os itens (inclusive excluídos, para o "Desfazer" não ressuscitar a antiga). */
export async function moverItensDeCategoria(de: string, para: string): Promise<number> {
  const k = chaveAtual();
  const { itens } = await listarAbertos();
  const afetados = itensDaCategoria(itens, de);
  if (!afetados.length) return 0;
  const cifrados = await Promise.all(
    afetados.map((i) => fecharItem(k, { ...i, conteudo: { ...i.conteudo, categoria: para } })),
  );
  await gravar(cifrados.map((registro) => ({ entidade: 'itens' as const, registro })));
  return afetados.filter((i) => i.status !== 'excluido').length;
}

export async function renomearCategoria(lista: string[], de: string, para: string) {
  await moverItensDeCategoria(de, para.trim());
  await salvarCategorias(renomearNaLista(lista, de, para));
}

export async function removerCategoria(lista: string[], nome: string): Promise<number> {
  const movidos = await moverItensDeCategoria(nome, CATEGORIA_RESERVA);
  await salvarCategorias(removerDaLista(lista, nome));
  return movidos;
}
