// Botão "Copiar" com confirmação visual ("Copiado!") e aviso de que será apagado em 30 s.
import { useEffect, useState } from 'preact/hooks';
import { copiar, SEGUNDOS_LIMPAR } from '../area-transferencia';
import { useEstado } from '../estado';
import { IconeCopiar } from '../icones';

interface Props {
  valor: string;
  /** Texto do botão (ex.: "Senha"). Sem rótulo, vira só o ícone. */
  rotulo?: string;
  /** Para leitores de tela / dica do mouse (ex.: "Copiar senha"). */
  descricao: string;
  secreto?: boolean;
  class?: string;
}

export function BotaoCopiar({ valor, rotulo, descricao, secreto, class: classe = '' }: Props) {
  const { avisar } = useEstado();
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(id);
  }, [copiado]);

  async function aoClicar(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (!(await copiar(valor))) return avisar({ texto: 'O navegador não deixou copiar. Tente de novo.' });
    setCopiado(true);
    avisar({ texto: secreto ? `Copiado · será apagado em ${SEGUNDOS_LIMPAR} s` : 'Copiado' });
  }

  return (
    <button
      type="button"
      class={`${rotulo ? 'botao-copiar' : 'botao-icone'} ${classe}${copiado ? ' copiado' : ''}`}
      onClick={aoClicar}
      aria-label={descricao}
      title={descricao}
      disabled={!valor}
    >
      <IconeCopiar />
      {rotulo && <span>{copiado ? 'Copiado!' : rotulo}</span>}
    </button>
  );
}
