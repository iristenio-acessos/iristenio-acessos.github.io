// Janela com um campo de texto (ex.: nome de uma categoria nova).
import { useEffect, useRef, useState } from 'preact/hooks';
import { Janela } from './Janela';

interface Props {
  titulo: string;
  rotulo: string;
  inicial?: string;
  confirmar: string;
  /** Devolve uma mensagem de erro, ou null se o texto serve. */
  validar: (texto: string) => string | null;
  aoConfirmar: (texto: string) => void | Promise<void>;
  aoFechar: () => void;
}

export function PedirTexto({ titulo, rotulo, inicial = '', confirmar, validar, aoConfirmar, aoFechar }: Props) {
  const [texto, setTexto] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => campo.current?.select(), 30);
  }, []);

  async function enviar(e: Event) {
    e.preventDefault();
    e.stopPropagation(); // não envia o formulário do painel que está por baixo
    const problema = validar(texto);
    setErro(problema);
    if (problema) return;
    setOcupado(true);
    await aoConfirmar(texto.trim());
    aoFechar();
  }

  return (
    <Janela titulo={titulo} aoFechar={aoFechar}>
      <form class="formulario" onSubmit={enviar}>
        <label class="rotulo-campo">
          <span>{rotulo}</span>
          <input ref={campo} class="campo" value={texto} onInput={(e) => setTexto(e.currentTarget.value)} enterKeyHint="done" maxLength={40} />
        </label>
        {erro && <p class="erros" role="alert">{erro}</p>}
        <div class="dialogo-opcoes">
          <button type="button" class="botao fantasma" onClick={aoFechar}>Cancelar</button>
          <button type="submit" class="botao primario" disabled={ocupado}>{confirmar}</button>
        </div>
      </form>
    </Janela>
  );
}
