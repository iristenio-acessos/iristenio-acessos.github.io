// Regras para conectar um aparelho à planilha sem misturar cofres diferentes (RN02).
//
// Cada cofre nasce com um "sal" aleatório. Mesmo sal = mesmo cofre (mesma senha mestra na origem).
// Sal diferente = outro cofre: os itens de um não abrem com a chave do outro.
import type { Cofre } from './tipos';

export type SituacaoConexao =
  /** Planilha sem cofre: este aparelho envia o seu (ou cria um depois). */
  | 'planilha-vazia'
  /** Aparelho sem cofre: baixa o da planilha e pede a senha mestra. */
  | 'baixar-cofre'
  /** O mesmo cofre dos dois lados: só sincroniza. */
  | 'mesmo-cofre'
  /** Cofres diferentes: é preciso escolher (nunca misturar). */
  | 'cofres-diferentes';

export function compararCofres(local: Cofre | undefined, remoto: Cofre | undefined): SituacaoConexao {
  if (!remoto) return 'planilha-vazia';
  if (!local) return 'baixar-cofre';
  return local.sal === remoto.sal ? 'mesmo-cofre' : 'cofres-diferentes';
}

/** O cofre mudou de forma que a chave atual não serve mais (ex.: senha mestra trocada em outro aparelho). */
export function cofreTrocou(aberto: Pick<Cofre, 'sal' | 'verificador'> | null, atual: Cofre | undefined): boolean {
  if (!aberto) return false;
  return !atual || atual.sal !== aberto.sal || atual.verificador !== aberto.verificador;
}
