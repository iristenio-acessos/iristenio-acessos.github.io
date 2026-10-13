// Regras de negócio dos itens do cofre.
// Padrão: funções PURAS (sem tela, sem banco) — fáceis de testar em itens.test.ts.
import type { Campo, ConteudoItem, Id, ItemAberto, ItemCifrado, TipoItem } from './tipos';
import { cifrar, decifrar } from './cripto';

export const CATEGORIAS_PADRAO = [
  'Bancos',
  'E-mail',
  'Redes sociais',
  'Trabalho',
  'Compras',
  'Governo',
  'Streaming',
  'Veículos',
  'Documentos',
  'Outros',
];

const c = (rotulo: string, secreto = false): Campo => ({ rotulo, valor: '', secreto });

/** Campos iniciais e categoria sugerida de cada tipo (o usuário pode mudar tudo depois). */
export const MODELOS: Record<TipoItem, { rotulo: string; categoria: string; campos: () => Campo[] }> = {
  login: { rotulo: 'Login', categoria: 'Outros', campos: () => [c('Usuário'), c('Senha', true), c('Site / app')] },
  cartao: {
    rotulo: 'Cartão',
    categoria: 'Bancos',
    campos: () => [c('Número', true), c('Nome impresso'), c('Validade'), c('CVV', true), c('Senha', true)],
  },
  wifi: { rotulo: 'Wi-Fi', categoria: 'Outros', campos: () => [c('Nome da rede'), c('Senha', true)] },
  documento: { rotulo: 'Documento', categoria: 'Documentos', campos: () => [c('Número'), c('Órgão emissor'), c('Emissão'), c('Validade')] },
  veiculo: {
    rotulo: 'Veículo',
    categoria: 'Veículos',
    campos: () => [c('Placa'), c('Modelo'), c('Ano'), c('Cor'), c('Chassi'), c('Renavam')],
  },
  anotacao: { rotulo: 'Anotação', categoria: 'Outros', campos: () => [] },
};

export function novoConteudo(tipo: TipoItem = 'login'): ConteudoItem {
  const m = MODELOS[tipo];
  return { tipo, nome: '', categoria: m.categoria, favorito: false, campos: m.campos(), observacoes: '' };
}

/** Lista de erros (vazia = válido). */
export function validarConteudo(c: Pick<ConteudoItem, 'nome'>): string[] {
  return c.nome.trim() ? [] : ['Informe o nome (ex.: Banco do Brasil, Gmail).'];
}

/** Tira espaços do nome/rótulos e campos sem rótulo e sem valor. */
export function limparConteudo(c: ConteudoItem): ConteudoItem {
  return {
    ...c,
    nome: c.nome.trim(),
    categoria: c.categoria.trim() || 'Outros',
    campos: c.campos.map((x) => ({ ...x, rotulo: x.rotulo.trim() })).filter((x) => x.rotulo || x.valor),
  };
}

/** Ativos, favoritos primeiro, depois por nome (ordem alfabética do português). */
export function ordenarItens(lista: ItemAberto[]): ItemAberto[] {
  return lista
    .filter((i) => i.status !== 'excluido')
    .sort(
      (a, b) =>
        Number(b.conteudo.favorito) - Number(a.conteudo.favorito) ||
        a.conteudo.nome.localeCompare(b.conteudo.nome, 'pt-BR', { sensitivity: 'base' }),
    );
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca por nome, categoria, observações e campos NÃO secretos (sem diferenciar acentos/maiúsculas). */
export function filtrarItens(lista: ItemAberto[], busca: string): ItemAberto[] {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return lista;
  return lista.filter((i) => {
    const c = i.conteudo;
    const texto = semAcento([c.nome, c.categoria, c.observacoes, ...c.campos.filter((x) => !x.secreto).map((x) => x.valor)].join(' '));
    return termos.every((t) => texto.includes(t));
  });
}

/** Até dois campos com valor, para os atalhos de copiar na lista. */
export function camposAtalho(c: ConteudoItem): Campo[] {
  return c.campos.filter((x) => x.valor && !ehEndereco(x)).slice(0, 2);
}

/** Campo que parece um site (para mostrar o botão Abrir). */
export function ehEndereco(campo: Campo): boolean {
  return !campo.secreto && /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(campo.valor.trim());
}

export function urlDe(valor: string): string {
  const v = valor.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/* ---------------- Criptografia do item ---------------- */

export async function fecharItem(
  chave: CryptoKey,
  aberto: ItemAberto,
): Promise<ItemCifrado> {
  return {
    id: aberto.id,
    status: aberto.status,
    criado_em: aberto.criado_em,
    atualizado_em: aberto.atualizado_em,
    cifrado: await cifrar(chave, JSON.stringify(aberto.conteudo)),
  };
}

export async function abrirItem(chave: CryptoKey, item: ItemCifrado): Promise<ItemAberto> {
  const salvo = JSON.parse(await decifrar(chave, item.cifrado)) as Partial<ConteudoItem>;
  return {
    id: item.id,
    status: item.status,
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
    conteudo: { ...novoConteudo(salvo.tipo ?? 'login'), ...salvo },
  };
}

export function novoItemAberto(id: Id, conteudo: ConteudoItem, agora = new Date()): ItemAberto {
  const carimbo = agora.toISOString();
  return { id, status: 'ativo', criado_em: carimbo, atualizado_em: carimbo, conteudo };
}
