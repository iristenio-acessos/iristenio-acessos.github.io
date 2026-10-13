// Entidades do app.
// Datas: ISO completo (carimbos de data-hora).
//
// ► Para criar uma entidade nova, siga o roteiro em ARQUITETURA.md ("Adicionar uma entidade").
//
// SEGURANÇA: o que é gravado no aparelho e enviado à planilha são só os registros abaixo
// (ItemCifrado e Cofre). O conteúdo legível (ConteudoItem) existe apenas na memória, com o cofre
// destrancado — ver dominio/cripto.ts.

export type Id = string;

/** Campos que TODA entidade sincronizada precisa ter. */
export interface Registro {
  id: Id;
  criado_em: string;
  atualizado_em: string;
}

/* ---------------- Item do cofre ---------------- */

export type StatusItem = 'ativo' | 'excluido';

/** Como o item fica gravado: tudo o que importa está em `cifrado`. */
export interface ItemCifrado extends Registro {
  status: StatusItem;
  /** ConteudoItem em JSON, criptografado (base64 de vetor inicial + dados). */
  cifrado: string;
}

export type TipoItem = 'login' | 'cartao' | 'wifi' | 'documento' | 'veiculo' | 'anotacao';

export interface Campo {
  rotulo: string;
  valor: string;
  /** Fica escondido (••••) e fora da busca. */
  secreto: boolean;
}

/** O que o usuário vê e edita (só existe na memória, com o cofre destrancado). */
export interface ConteudoItem {
  tipo: TipoItem;
  nome: string;
  categoria: string;
  favorito: boolean;
  campos: Campo[];
  observacoes: string;
}

/** Item aberto: registro + conteúdo legível. */
export interface ItemAberto {
  id: Id;
  status: StatusItem;
  criado_em: string;
  atualizado_em: string;
  conteudo: ConteudoItem;
}

/* ---------------- Cofre (um único registro) ---------------- */

export const ID_COFRE = 'cofre';

export interface Cofre extends Registro {
  /** Sal aleatório (base64) usado para derivar a chave a partir da senha mestra. */
  sal: string;
  /** Rodadas do PBKDF2. */
  rodadas: number;
  /** Texto conhecido criptografado: confere se a senha mestra está certa. */
  verificador: string;
  /** Preferências do cofre criptografadas (ex.: categorias personalizadas). Vazio = nenhuma. */
  cifrado: string;
}

/** Nomes das entidades sincronizadas (cada uma vira uma loja local e uma aba na planilha). */
export const ENTIDADES = ['itens', 'cofre'] as const;
export type Entidade = (typeof ENTIDADES)[number];

/* ---------------- Infraestrutura ---------------- */

export interface ItemFila {
  id: Id;
  entidade: Entidade;
  registro_id: Id;
  operacao: 'criar' | 'alterar' | 'excluir';
  payload: Registro;
  tentativas: number;
  ultimo_erro: string | null;
  criado_em: string;
}

/** Aparência: seguir o sistema do aparelho ou fixar claro/escuro. */
export type Tema = 'sistema' | 'claro' | 'escuro';

/** Preferências do usuário (valem por aparelho). */
export interface Config {
  tema: Tema;
  /** Minutos sem uso até o cofre trancar sozinho. */
  minutos_trancar: number;
}

export const CONFIG_PADRAO: Config = {
  tema: 'sistema',
  minutos_trancar: 3,
};
