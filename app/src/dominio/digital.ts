// Desbloqueio com digital (Fase 2) — regras puras.
//
// Como funciona:
//   leitor biométrico (WebAuthn + extensão PRF) ──► segredo de 32 bytes, só sai com a digital
//   segredo ──HKDF-SHA256──► chave AES-GCM ──► "senha mestra travada" (guardada SÓ neste aparelho)
// Ao destrancar com a digital: a digital libera o segredo → abre a senha mestra → destranca normalmente.
// Nada disso vai para a planilha. Trocar a senha mestra (ou o cofre) invalida a digital.
import type { Cofre } from './tipos';
import { cifrar, decifrar } from './cripto';

/** A cada N dias o app pede a senha mestra mesmo com a digital ligada (para ela não ser esquecida). */
export const DIAS_PEDIR_SENHA = 7;

/** Guardado só neste aparelho (loja "config", chave interna). */
export interface ConfigDigital {
  /** Id da credencial (passkey) criada para o desbloqueio, em base64. */
  credencial: string;
  /** Sal enviado ao leitor para obter o segredo PRF, em base64. */
  salPrf: string;
  /** Senha mestra criptografada com a chave que vem da digital. */
  senhaTravada: string;
  /** Cofre para o qual a digital foi ativada (se ele mudar, a digital deixa de valer). */
  cofreSal: string;
  cofreVerificador: string;
  ativada_em: string;
}

const INFO_HKDF = new TextEncoder().encode('meus-acessos:digital:v1');

/** Segredo PRF (32 bytes) → chave AES-GCM para travar/destravar a senha mestra. */
export async function chaveDaDigital(segredo: BufferSource): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', segredo, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO_HKDF },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function travarSenha(segredo: BufferSource, senha: string): Promise<string> {
  return cifrar(await chaveDaDigital(segredo), senha);
}

/** Lança erro se o segredo não for o mesmo usado para travar. */
export async function destravarSenha(segredo: BufferSource, senhaTravada: string): Promise<string> {
  return decifrar(await chaveDaDigital(segredo), senhaTravada);
}

export type SituacaoDigital =
  /** Não ativada neste aparelho. */
  | 'desligada'
  /** Pode destrancar com a digital. */
  | 'pronta'
  /** Ativada, mas já passou o prazo: pedir a senha mestra desta vez. */
  | 'pedir-senha'
  /** O cofre mudou (senha mestra trocada): precisa ativar de novo. */
  | 'invalida';

export function situacaoDigital(
  cfg: ConfigDigital | undefined,
  cofre: Pick<Cofre, 'sal' | 'verificador'> | undefined,
  ultimaSenha: string | undefined,
  agora = new Date(),
): SituacaoDigital {
  if (!cfg) return 'desligada';
  if (!cofre || cofre.sal !== cfg.cofreSal || cofre.verificador !== cfg.cofreVerificador) return 'invalida';
  const desde = new Date(ultimaSenha ?? cfg.ativada_em).getTime();
  if (!(agora.getTime() - desde < DIAS_PEDIR_SENHA * 86_400_000)) return 'pedir-senha';
  return 'pronta';
}
