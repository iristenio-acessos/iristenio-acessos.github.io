// Sessão do cofre: guarda a chave SÓ NA MEMÓRIA enquanto o cofre está destrancado.
// Trancar = esquecer a chave (e a tela deixa de mostrar qualquer dado aberto).
import type { Cofre, ItemAberto, ItemCifrado } from '../dominio/tipos';
import { ID_COFRE } from '../dominio/tipos';
import { abrirCofre, cifrar, criarCofre, decifrar, validarSenhaMestra } from '../dominio/cripto';
import { lerBackup, montarBackup } from '../dominio/backup';
import { CATEGORIA_RESERVA, itensDaCategoria, normalizarCategorias, preferenciasPadrao, removerDaLista, renomearNaLista, type PreferenciasCofre } from '../dominio/categorias';
import { abrirItem, fecharItem } from '../dominio/itens';
import { esperaAposErros } from '../dominio/trava';
import { aoMudarDados, apagarCofreLocal, buscar, gravar, importarRegistros, lerInterno, listarTodos, salvar, salvarInterno, type Alteracao } from './repositorio';
import { cofreTrocou, compararCofres, type SituacaoConexao } from '../dominio/conexao';
import { confirmarConexao, type PreviaConexao } from '../sync/motor';

let chave: CryptoKey | null = null;
/** Sal e verificador do cofre que foi destrancado (para perceber se ele foi trocado por outro aparelho). */
let cofreAberto: Pick<Cofre, 'sal' | 'verificador'> | null = null;
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
  cofreAberto = novo.cofre;
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

/** `porDigital`: a senha veio do desbloqueio por digital (não conta como "senha digitada"). */
export async function destrancar(senha: string, agora = Date.now(), porDigital = false): Promise<ResultadoDestrancar> {
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
  if (!porDigital) await salvarInterno('_ultima_senha', new Date(agora).toISOString());
  chave = k;
  cofreAberto = cofre!;
  avisar();
  return { ok: true };
}

export function trancar() {
  if (!chave) return;
  chave = null;
  cofreAberto = null;
  avisar();
}

// Se a sincronização trouxer um cofre diferente do que está aberto (ex.: senha mestra trocada em
// outro aparelho), tranca: a chave atual não abriria os itens novos.
aoMudarDados(async () => {
  if (cofreAberto && cofreTrocou(cofreAberto, await lerCofre())) trancar();
});

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

/* ---------------- Conexão com a planilha (RN02) ---------------- */

export interface AnaliseConexao {
  situacao: SituacaoConexao;
  /** Itens ativos deste aparelho (perdidos se ele trocar de cofre). */
  itensAqui: number;
  /** Itens ativos na planilha. */
  itensPlanilha: number;
}

export async function analisarConexao(previa: PreviaConexao): Promise<AnaliseConexao> {
  const remoto = (previa.dados.cofre ?? [])[0] as Cofre | undefined;
  const ativos = (lista: ItemCifrado[]) => lista.filter((i) => i.status !== 'excluido').length;
  return {
    situacao: compararCofres(await lerCofre(), remoto),
    itensAqui: ativos(await listarTodos('itens')),
    itensPlanilha: ativos((previa.dados.itens ?? []) as ItemCifrado[]),
  };
}

/**
 * Conecta. Com cofres diferentes, só conecta se `trocarCofreDesteAparelho` for true: apaga o cofre
 * deste aparelho e passa a usar o da planilha (pedirá a senha mestra dele).
 */
export async function conectarCofre(previa: PreviaConexao, trocarCofreDesteAparelho = false) {
  const { situacao } = await analisarConexao(previa);
  if (situacao === 'cofres-diferentes') {
    if (!trocarCofreDesteAparelho) throw new Error('Este aparelho tem um cofre diferente do que está na planilha.');
    trancar();
    await apagarCofreLocal();
  }
  await confirmarConexao(previa);
}

/* ---------------- Trocar a senha mestra (RN11) ---------------- */

/**
 * Cria um cofre novo (sal e chave novos) e criptografa de novo TODOS os itens (inclusive os excluídos)
 * e as preferências, numa única gravação. Os outros aparelhos trancam ao receber o cofre novo.
 */
export async function trocarSenhaMestra(atual: string, nova: string, confirmacao: string): Promise<string[]> {
  const erros = validarSenhaMestra(nova, confirmacao);
  if (nova && nova === atual) erros.push('A senha nova precisa ser diferente da atual.');
  if (erros.length) return erros;
  const cofre = await lerCofre();
  const chaveAtual = cofre ? await abrirCofre(cofre, atual) : null;
  if (!cofre || !chaveAtual) return ['A senha mestra atual está incorreta.'];

  const [cifrados, prefs] = [await listarTodos('itens'), await lerPreferencias()];
  const abertos = await Promise.all(cifrados.map((i) => abrirItem(chaveAtual, i).catch(() => null)));
  if (abertos.some((i) => i === null)) {
    return ['Há itens que não abrem com a senha atual. Sincronize e tente de novo (nada foi alterado).'];
  }
  const novo = await criarCofre(nova);
  const cofreNovo: Cofre = {
    ...novo.cofre,
    criado_em: cofre.criado_em,
    cifrado: await cifrar(novo.chave, JSON.stringify(prefs)),
  };
  const itens = await Promise.all((abertos as ItemAberto[]).map((i) => fecharItem(novo.chave, i)));

  // Atualiza a sessão ANTES de gravar, para a vigilância de "cofre trocado" não trancar este aparelho
  const antes = { chave, cofreAberto };
  chave = novo.chave;
  cofreAberto = cofreNovo;
  try {
    await gravar([
      ...itens.map((registro) => ({ entidade: 'itens' as const, registro })),
      { entidade: 'cofre', registro: cofreNovo },
    ]);
  } catch (e) {
    ({ chave, cofreAberto } = antes);
    throw e;
  }
  // O cofre gravado ganhou novo atualizado_em: guarda o registro final
  cofreAberto = (await lerCofre()) ?? cofreNovo;
  avisar();
  return [];
}

/* ---------------- Backup (RN13) ---------------- */

/** Conteúdo do arquivo de backup (registros já criptografados). */
export async function exportarBackup(): Promise<string> {
  const cofre = await lerCofre();
  if (!cofre) throw new Error('Não há cofre neste aparelho.');
  return JSON.stringify(montarBackup(cofre, await listarTodos('itens')), null, 1);
}

export type ResultadoRestauracao =
  | { ok: true; cofreNovo: boolean; itens: number }
  | { ok: false; erro: string };

/**
 * Restaura um backup:
 *  - aparelho sem cofre → passa a usar o cofre do backup (depois pede a senha mestra dele);
 *  - mesmo cofre → acrescenta/recupera os itens (versões mais novas do aparelho são mantidas);
 *  - cofre diferente → recusa (nunca mistura cofres).
 */
export async function restaurarBackup(conteudo: string): Promise<ResultadoRestauracao> {
  let backup;
  try {
    backup = lerBackup(conteudo);
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
  const situacao = compararCofres(await lerCofre(), backup.cofre);
  if (situacao === 'cofres-diferentes') {
    return {
      ok: false,
      erro:
        'Este backup é de outro cofre (ou de antes de uma troca da senha mestra). Para usá-lo, restaure-o num aparelho sem cofre.',
    };
  }
  if (situacao === 'baixar-cofre' && (await lerInterno('_conexao'))) {
    return {
      ok: false,
      erro: 'Este aparelho está conectado à planilha. Para restaurar um cofre inteiro, desconecte primeiro (Ajustes → Sincronização).',
    };
  }
  const alteracoes: Alteracao[] = backup.itens.map((registro) => ({ entidade: 'itens', registro }));
  if (situacao === 'baixar-cofre') alteracoes.unshift({ entidade: 'cofre', registro: backup.cofre });
  const entraram = await importarRegistros(alteracoes);
  return { ok: true, cofreNovo: situacao === 'baixar-cofre', itens: Math.max(0, entraram - (situacao === 'baixar-cofre' ? 1 : 0)) };
}
