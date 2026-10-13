// Janela "+ Adicionar campo": sugestões prontas ou um nome livre, e se o campo é secreto.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Campo } from '../../dominio/tipos';
import { SUGESTOES_CAMPOS } from '../../dominio/itens';
import { Janela } from './Janela';

interface Props {
  /** Rótulos que o item já tem (as sugestões iguais somem). */
  existentes: string[];
  aoAdicionar: (rotulo: string, secreto: boolean) => void;
  aoFechar: () => void;
}

export function NovoCampo({ existentes, aoAdicionar, aoFechar }: Props) {
  const [rotulo, setRotulo] = useState('');
  const [secreto, setSecreto] = useState(false);
  const [erro, setErro] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const jaTem = new Set(existentes.map((x) => x.toLocaleLowerCase('pt-BR')));
  const sugestoes = SUGESTOES_CAMPOS.filter((s) => !jaTem.has(s.rotulo.toLocaleLowerCase('pt-BR')));

  useEffect(() => {
    setTimeout(() => campo.current?.focus(), 30);
  }, []);

  function usar(s: Campo) {
    aoAdicionar(s.rotulo, s.secreto);
    aoFechar();
  }

  function enviar(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (!rotulo.trim()) return setErro('Digite o nome do campo ou escolha uma sugestão.');
    aoAdicionar(rotulo, secreto);
    aoFechar();
  }

  return (
    <Janela titulo="Adicionar campo" aoFechar={aoFechar}>
      <form class="formulario" onSubmit={enviar}>
        {sugestoes.length > 0 && (
          <fieldset>
            <legend>Sugestões</legend>
            <div class="chips">
              {sugestoes.map((s) => (
                <button key={s.rotulo} type="button" class="chip" onClick={() => usar(s)}>
                  {s.secreto && '🔒 '}
                  {s.rotulo}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <label class="rotulo-campo">
          <span>Ou dê um nome</span>
          <input
            ref={campo}
            class="campo"
            placeholder="Ex.: Senha do aplicativo"
            value={rotulo}
            onInput={(e) => setRotulo(e.currentTarget.value)}
            maxLength={40}
            enterKeyHint="done"
          />
        </label>
        <label class="interruptor">
          <input type="checkbox" checked={secreto} onChange={(e) => setSecreto(e.currentTarget.checked)} />
          <span>
            Secreto <small>(fica escondido com ••••)</small>
          </span>
        </label>
        {erro && <p class="erros" role="alert">{erro}</p>}
        <div class="dialogo-opcoes">
          <button type="button" class="botao fantasma" onClick={aoFechar}>Cancelar</button>
          <button type="submit" class="botao primario">Adicionar</button>
        </div>
      </form>
    </Janela>
  );
}
