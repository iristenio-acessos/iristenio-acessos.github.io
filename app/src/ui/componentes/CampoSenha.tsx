// Campo de senha com o botão de mostrar/esconder (senha mestra).
import { useEffect, useRef, useState } from 'preact/hooks';
import { IconeOlho, IconeOlhoFechado } from '../icones';

export function CampoSenha(props: {
  valor: string;
  aoMudar: (v: string) => void;
  rotulo: string;
  autoFocus?: boolean;
  novaSenha?: boolean;
  disabled?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (props.autoFocus) campo.current?.focus();
  }, []);
  return (
    <label class="rotulo-campo">
      <span>{props.rotulo}</span>
      <div class="campo-com-botoes">
        <input
          ref={campo}
          class="campo secreto"
          type={visivel ? 'text' : 'password'}
          value={props.valor}
          onInput={(e) => props.aoMudar(e.currentTarget.value)}
          autoComplete={props.novaSenha ? 'new-password' : 'current-password'}
          autoCapitalize="off"
          autoCorrect="off"
          spellcheck={false}
          disabled={props.disabled}
        />
        <button type="button" class="botao-icone" aria-label={visivel ? 'Esconder' : 'Mostrar'} onClick={() => setVisivel(!visivel)}>
          {visivel ? <IconeOlhoFechado /> : <IconeOlho />}
        </button>
      </div>
    </label>
  );
}
