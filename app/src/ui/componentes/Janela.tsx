// Janela por cima de tudo (véu + caixa), com conteúdo livre. Fecha com Esc ou tocando fora.
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import { IconeFechar } from '../icones';

interface Props {
  titulo: string;
  aoFechar: () => void;
  children: ComponentChildren;
}

export function Janela({ titulo, aoFechar, children }: Props) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // não fecha o painel lateral junto
      aoFechar();
    };
    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [aoFechar]);

  return createPortal(
    <div class="dialogo-veu" onClick={aoFechar}>
      <div class="dialogo janela" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div class="dialogo-topo">
          <h2>{titulo}</h2>
          <button type="button" class="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
