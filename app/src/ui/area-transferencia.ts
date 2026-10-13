// Copiar para a área de transferência (RN05): o que foi copiado é apagado depois de 30 segundos.
export const SEGUNDOS_LIMPAR = 30;

let ultimoCopiado: string | null = null;
let timer: number | undefined;

/** Plano B (navegadores antigos ou sem permissão): copia por um campo de texto invisível. */
function copiarPorCampo(texto: string): boolean {
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(campo);
  const foco = document.activeElement as HTMLElement | null;
  campo.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  campo.remove();
  foco?.focus?.({ preventScroll: true });
  return ok;
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    if (!copiarPorCampo(texto)) return false;
  }
  ultimoCopiado = texto;
  clearTimeout(timer);
  timer = window.setTimeout(limparAreaTransferencia, SEGUNDOS_LIMPAR * 1000);
  return true;
}

/** Apaga a área de transferência, se o app copiou algo (quando o navegador permitir). */
export async function limparAreaTransferencia() {
  clearTimeout(timer);
  if (ultimoCopiado === null) return;
  try {
    // Não lemos a área de transferência antes (o navegador pediria permissão a cada vez).
    await navigator.clipboard.writeText('').catch(() => {
      if (!copiarPorCampo(' ')) throw new Error('sem permissão');
    });
    ultimoCopiado = null;
  } catch {
    // Sem foco na janela o navegador não deixa mexer: tenta de novo quando o app voltar a ter foco.
    window.addEventListener('focus', () => limparAreaTransferencia(), { once: true });
  }
}
