// Gerador de senhas (RN07) — usa o sorteio criptográfico do navegador, sem viés.
// Os conjuntos evitam caracteres que se confundem ao ler/digitar (I, l, 1, O, 0).

export interface OpcoesSenha {
  tamanho: number;
  maiusculas: boolean;
  minusculas: boolean;
  numeros: boolean;
  simbolos: boolean;
}

export const OPCOES_PADRAO: OpcoesSenha = { tamanho: 16, maiusculas: true, minusculas: true, numeros: true, simbolos: true };
/** 4 permite gerar senhas numéricas de cartão/transação (4 a 6 números). */
export const TAMANHO_MIN = 4;
export const TAMANHO_MAX = 40;

export const CONJUNTOS: Record<Exclude<keyof OpcoesSenha, 'tamanho'>, string> = {
  maiusculas: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  minusculas: 'abcdefghijkmnopqrstuvwxyz',
  numeros: '23456789',
  simbolos: '!@#$%&*-_=+?',
};

/** Número aleatório em [0, limite), sem viés (descarta sorteios que favoreceriam alguns valores). */
export type Sorteio = (limite: number) => number;

export const sorteioSeguro: Sorteio = (limite) => {
  const maximo = Math.floor(0x1_0000_0000 / limite) * limite;
  const caixa = new Uint32Array(1);
  do crypto.getRandomValues(caixa);
  while (caixa[0] >= maximo);
  return caixa[0] % limite;
};

function conjuntosEscolhidos(o: OpcoesSenha): string[] {
  // Sem letras não há como confundir 0/O e 1/l: senha só de números usa todos os dígitos
  if (o.numeros && !o.maiusculas && !o.minusculas) return ['0123456789', ...(o.simbolos ? [CONJUNTOS.simbolos] : [])];
  const escolhidos = (Object.keys(CONJUNTOS) as (keyof typeof CONJUNTOS)[]).filter((k) => o[k]).map((k) => CONJUNTOS[k]);
  return escolhidos.length ? escolhidos : [CONJUNTOS.minusculas];
}

/** Gera a senha com pelo menos um caractere de cada conjunto escolhido. */
export function gerarSenha(opcoes: OpcoesSenha = OPCOES_PADRAO, sorteio: Sorteio = sorteioSeguro): string {
  const conjuntos = conjuntosEscolhidos(opcoes);
  const tamanho = Math.min(TAMANHO_MAX, Math.max(TAMANHO_MIN, Math.round(opcoes.tamanho), conjuntos.length));
  const todos = conjuntos.join('');
  const letras = conjuntos.map((c) => c[sorteio(c.length)]);
  while (letras.length < tamanho) letras.push(todos[sorteio(todos.length)]);
  // Embaralha (Fisher–Yates) para os obrigatórios não ficarem sempre no início
  for (let i = letras.length - 1; i > 0; i--) {
    const j = sorteio(i + 1);
    [letras[i], letras[j]] = [letras[j], letras[i]];
  }
  return letras.join('');
}

/** Força aproximada em bits (tamanho × log2 do alfabeto). */
export function forcaBits(opcoes: OpcoesSenha): number {
  const alfabeto = conjuntosEscolhidos(opcoes).join('').length;
  return Math.round(opcoes.tamanho * Math.log2(alfabeto));
}

export function descreverForca(bits: number): { rotulo: string; nivel: 'fraca' | 'media' | 'forte' } {
  if (bits < 50) return { rotulo: 'Fraca', nivel: 'fraca' };
  if (bits < 75) return { rotulo: 'Razoável', nivel: 'media' };
  return { rotulo: bits < 100 ? 'Forte' : 'Muito forte', nivel: 'forte' };
}
