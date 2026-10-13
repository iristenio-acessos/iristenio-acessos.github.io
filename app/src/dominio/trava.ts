// Regras da trava do cofre (funções puras, testadas em trava.test.ts).

export const OPCOES_MINUTOS_TRANCAR = [1, 3, 5, 10, 15];
/** Tempo máximo fora do app (em segundo plano) antes de trancar. */
export const SEGUNDO_PLANO_MS = 60_000;
/** Erros seguidos de senha permitidos antes de começar a esperar. */
export const ERROS_LIVRES = 5;

/** RN04 — tranca por inatividade ou por ter ficado tempo demais em segundo plano. */
export function deveTrancar(
  estado: { ultimaAtividade: number; saiuEm: number | null },
  agora: number,
  minutos: number,
): boolean {
  if (agora - estado.ultimaAtividade >= minutos * 60_000) return true;
  return estado.saiuEm !== null && agora - estado.saiuEm >= SEGUNDO_PLANO_MS;
}

/** RN03 — espera (ms) depois de N erros seguidos: 30 s no 5º, dobrando a cada novo erro. */
export function esperaAposErros(erros: number): number {
  if (erros < ERROS_LIVRES) return 0;
  return 30_000 * 2 ** Math.min(erros - ERROS_LIVRES, 10);
}
