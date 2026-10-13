// Criptografia do cofre — usa apenas o Web Crypto do navegador (sem bibliotecas de terceiros).
//
//   senha mestra ──PBKDF2-SHA256 (600.000 rodadas + sal)──► chave AES-256-GCM (não exportável)
//   texto ──AES-GCM (vetor inicial aleatório de 12 bytes)──► base64(vetor + dados cifrados)
//
// A senha mestra e a chave NUNCA são gravadas. O "verificador" (um texto conhecido criptografado)
// permite saber se a senha digitada está certa sem guardar a senha.
import type { Cofre } from './tipos';
import { ID_COFRE } from './tipos';

export const RODADAS_PADRAO = 600_000;
export const TAMANHO_MINIMO_SENHA = 12;
const TEXTO_VERIFICADOR = 'meus-acessos:cofre:v1';

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

export function paraBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const s = atob(texto);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export function gerarSal(): string {
  return paraBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function derivarChave(senha: string, sal: string, rodadas: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', codificador.encode(senha.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deBase64(sal), iterations: rodadas },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function cifrar(chave: CryptoKey, texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, codificador.encode(texto)));
  const tudo = new Uint8Array(iv.length + dados.length);
  tudo.set(iv);
  tudo.set(dados, iv.length);
  return paraBase64(tudo);
}

/** Lança erro se a chave estiver errada ou se o dado tiver sido alterado. */
export async function decifrar(chave: CryptoKey, cifrado: string): Promise<string> {
  const tudo = deBase64(cifrado);
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tudo.slice(0, 12) }, chave, tudo.slice(12));
  return decodificador.decode(claro);
}

/** Erros da senha mestra na criação (vazia = válida). */
export function validarSenhaMestra(senha: string, confirmacao: string): string[] {
  const erros: string[] = [];
  if (senha.length < TAMANHO_MINIMO_SENHA) erros.push(`A senha mestra precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  if (senha !== confirmacao) erros.push('As duas senhas digitadas não são iguais.');
  return erros;
}

/** Cria o registro do cofre e já devolve a chave (cofre destrancado). */
export async function criarCofre(senha: string, agora = new Date(), rodadas = RODADAS_PADRAO): Promise<{ cofre: Cofre; chave: CryptoKey }> {
  const sal = gerarSal();
  const chave = await derivarChave(senha, sal, rodadas);
  const carimbo = agora.toISOString();
  const cofre: Cofre = {
    id: ID_COFRE,
    sal,
    rodadas,
    verificador: await cifrar(chave, TEXTO_VERIFICADOR),
    cifrado: '',
    criado_em: carimbo,
    atualizado_em: carimbo,
  };
  return { cofre, chave };
}

/** Devolve a chave se a senha estiver certa; senão, null. */
export async function abrirCofre(cofre: Cofre, senha: string): Promise<CryptoKey | null> {
  const chave = await derivarChave(senha, cofre.sal, cofre.rodadas);
  try {
    return (await decifrar(chave, cofre.verificador)) === TEXTO_VERIFICADOR ? chave : null;
  } catch {
    return null;
  }
}
