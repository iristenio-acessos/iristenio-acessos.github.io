// Backup do cofre (RN13): um arquivo com os registros JÁ CRIPTOGRAFADOS (cofre + itens).
// Sem a senha mestra (a que valia quando o backup foi feito), o arquivo não serve para nada.
import type { Cofre, ItemCifrado } from './tipos';
import { ID_COFRE } from './tipos';

export const FORMATO_BACKUP = 'meus-acessos-backup';
export const VERSAO_BACKUP = 1;

export interface Backup {
  formato: typeof FORMATO_BACKUP;
  versao: number;
  exportado_em: string;
  aviso: string;
  cofre: Cofre;
  itens: ItemCifrado[];
}

export function montarBackup(cofre: Cofre, itens: ItemCifrado[], agora = new Date()): Backup {
  return {
    formato: FORMATO_BACKUP,
    versao: VERSAO_BACKUP,
    exportado_em: agora.toISOString(),
    aviso: 'Backup criptografado do app Meus Acessos. Só abre com a senha mestra usada quando ele foi feito.',
    cofre,
    itens,
  };
}

export function nomeArquivoBackup(agora = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `meus-acessos-backup-${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}.json`;
}

const texto = (v: unknown): v is string => typeof v === 'string';

/** Lê o arquivo e confere a estrutura. Lança erro com mensagem amigável. */
export function lerBackup(conteudo: string): Backup {
  let b: Partial<Backup>;
  try {
    b = JSON.parse(conteudo);
  } catch {
    throw new Error('Este arquivo não é um backup do Meus Acessos.');
  }
  if (b?.formato !== FORMATO_BACKUP) throw new Error('Este arquivo não é um backup do Meus Acessos.');
  if (typeof b.versao !== 'number' || b.versao > VERSAO_BACKUP) throw new Error('Backup feito numa versão mais nova do app. Atualize o app e tente de novo.');
  const c = b.cofre;
  if (!c || c.id !== ID_COFRE || !texto(c.sal) || !texto(c.verificador) || typeof c.rodadas !== 'number') {
    throw new Error('O backup está incompleto ou danificado (cofre).');
  }
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.every((i) => i && texto(i.id) && texto(i.cifrado) && texto(i.atualizado_em) && (i.status === 'ativo' || i.status === 'excluido'))) {
    throw new Error('O backup está incompleto ou danificado (itens).');
  }
  return b as Backup;
}
