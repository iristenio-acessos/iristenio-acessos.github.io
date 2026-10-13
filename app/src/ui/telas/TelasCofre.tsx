// Telas de entrada: criar a senha mestra (primeiro uso) e destrancar o cofre.
import { useEffect, useRef, useState } from 'preact/hooks';
import { APP } from '../../app.config';
import { TAMANHO_MINIMO_SENHA, validarSenhaMestra } from '../../dominio/cripto';
import { criarNovoCofre, destrancar, lerTentativas } from '../../dados/sessao';
import { IconeCadeado, IconeOlho, IconeOlhoFechado } from '../icones';

function CampoSenha(props: {
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

/* ---------------- Primeiro uso ---------------- */

export function TelaCriarCofre() {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [entendi, setEntendi] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  async function criar(e: Event) {
    e.preventDefault();
    const problemas = validarSenhaMestra(senha, confirmacao);
    if (!entendi) problemas.push('Confirme que entendeu o aviso sobre a senha mestra.');
    setErros(problemas);
    if (problemas.length) return;
    setOcupado(true);
    try {
      await criarNovoCofre(senha);
    } catch (x) {
      setErros([x instanceof Error ? x.message : 'Não foi possível criar o cofre.']);
      setOcupado(false);
    }
  }

  return (
    <div class="tela-cofre">
      <form class="cartao cartao-cofre formulario" onSubmit={criar}>
        <div class="cofre-topo">
          <IconeCadeado />
          <h1>{APP.nome}</h1>
          <p class="dica">Crie a sua senha mestra. Ela é a única senha que você vai precisar lembrar.</p>
        </div>

        <CampoSenha rotulo={`Senha mestra (mínimo ${TAMANHO_MINIMO_SENHA} caracteres)`} valor={senha} aoMudar={setSenha} autoFocus novaSenha />
        <CampoSenha rotulo="Digite de novo" valor={confirmacao} aoMudar={setConfirmacao} novaSenha />
        <p class="dica">Dica: use uma frase fácil de lembrar, como “Meu gato Tom come 3 sardinhas!”.</p>

        <div class="alerta">
          <strong>Importante:</strong> a senha mestra não fica guardada em lugar nenhum. Se você esquecê-la,{' '}
          <strong>ninguém consegue recuperar</strong> os dados do cofre.
        </div>
        <label class="interruptor">
          <input type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.currentTarget.checked)} />
          <span>Entendi e vou guardar a senha mestra num lugar seguro</span>
        </label>

        {erros.length > 0 && (
          <ul class="erros" role="alert">
            {erros.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}

        <button type="submit" class="botao primario" disabled={ocupado}>
          {ocupado ? 'Criando o cofre…' : 'Criar meu cofre'}
        </button>
      </form>
    </div>
  );
}

/* ---------------- Cofre trancado ---------------- */

export function TelaTrancado() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [esperarAte, setEsperarAte] = useState(0);
  const [agora, setAgora] = useState(Date.now());

  useEffect(() => {
    lerTentativas().then((t) => setEsperarAte(t.ate));
  }, []);

  // Contagem regressiva enquanto precisa esperar
  const restante = Math.ceil((esperarAte - agora) / 1000);
  useEffect(() => {
    if (esperarAte <= Date.now()) return;
    const id = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(id);
  }, [esperarAte]);

  async function entrar(e: Event) {
    e.preventDefault();
    if (!senha || restante > 0) return;
    setOcupado(true);
    setErro('');
    const r = await destrancar(senha);
    if (r.ok) return; // a tela troca sozinha
    setOcupado(false);
    setSenha('');
    setAgora(Date.now());
    setEsperarAte(r.esperarAte);
    setErro(r.esperarAte > Date.now() ? `Senha incorreta (${r.erros} erros seguidos).` : 'Senha incorreta.');
  }

  return (
    <div class="tela-cofre">
      <form class="cartao cartao-cofre formulario" onSubmit={entrar}>
        <div class="cofre-topo">
          <IconeCadeado />
          <h1>{APP.nome}</h1>
          <p class="dica">O cofre está trancado.</p>
        </div>
        <CampoSenha rotulo="Senha mestra" valor={senha} aoMudar={setSenha} autoFocus disabled={ocupado} />
        {erro && <p class="erros" role="alert">{erro}</p>}
        {restante > 0 && <p class="alerta">Por segurança, aguarde {restante} s para tentar de novo.</p>}
        <button type="submit" class="botao primario" disabled={ocupado || !senha || restante > 0}>
          {ocupado ? 'Abrindo…' : 'Destrancar'}
        </button>
      </form>
    </div>
  );
}
