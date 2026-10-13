// Telas de entrada: criar a senha mestra (primeiro uso) e destrancar o cofre.
import { useEffect, useState } from 'preact/hooks';
import { APP } from '../../app.config';
import { TAMANHO_MINIMO_SENHA, validarSenhaMestra } from '../../dominio/cripto';
import { criarNovoCofre, destrancar, lerTentativas } from '../../dados/sessao';
import { IconeCadeado, IconeDigital } from '../icones';
import { destrancarComDigital, ErroDigital, situacaoAtual } from '../../dados/digital';
import type { SituacaoDigital } from '../../dominio/digital';
import { CampoSenha } from '../componentes/CampoSenha';
import { restaurarDeArquivo } from './CartaoCofre';
import { useEstado } from '../estado';
import { CartaoGoogle } from './TelaAjustes';

/* ---------------- Primeiro uso ---------------- */

export function TelaCriarCofre() {
  const [modo, setModo] = useState<'criar' | 'conectar'>('criar');
  if (modo === 'conectar') {
    return (
      <div class="tela-cofre">
        <div class="cartao cartao-cofre">
          <div class="cofre-topo">
            <IconeCadeado />
            <h1>{APP.nome}</h1>
            <p class="dica">Usar o cofre que já existe em outro aparelho.</p>
          </div>
          <CartaoGoogle naEntrada />
          <button type="button" class="link" onClick={() => setModo('criar')}>
            ← Voltar e criar um cofre novo
          </button>
        </div>
      </div>
    );
  }
  return <FormCriarCofre aoConectar={() => setModo('conectar')} />;
}

function FormCriarCofre({ aoConectar }: { aoConectar: () => void }) {
  const { avisar } = useEstado();
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
        <button type="button" class="link centro" onClick={aoConectar}>
          Já tenho um cofre em outro aparelho
        </button>
        <button
          type="button"
          class="link centro"
          onClick={async () => {
            try {
              const msg = await restaurarDeArquivo();
              if (msg) avisar({ texto: msg });
            } catch (x) {
              setErros([x instanceof Error ? x.message : String(x)]);
            }
          }}
        >
          Restaurar de um arquivo de backup
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

  const [digital, setDigital] = useState<SituacaoDigital>('desligada');

  useEffect(() => {
    lerTentativas().then((t) => setEsperarAte(t.ate));
    situacaoAtual().then((sit) => {
      setDigital(sit);
      // Abre a digital sozinho ao chegar na tela (se o usuário cancelar, fica o botão)
      if (sit === 'pronta' && document.visibilityState === 'visible') usarDigital(true);
    });
  }, []);

  async function usarDigital(automatico = false) {
    setOcupado(true);
    setErro('');
    try {
      await destrancarComDigital(); // a tela troca sozinha
    } catch (x) {
      setOcupado(false);
      const msg = x instanceof ErroDigital ? x.message : 'Não foi possível usar a digital.';
      if (!(automatico && msg === 'Cancelado.')) setErro(msg === 'Cancelado.' ? '' : msg);
      setDigital(await situacaoAtual());
    }
  }

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
        {digital === 'pronta' && (
          <button type="button" class="botao botao-digital" disabled={ocupado || restante > 0} onClick={() => usarDigital()}>
            <IconeDigital /> Usar a digital
          </button>
        )}
        {digital === 'pedir-senha' && (
          <p class="dica centro">Por segurança, a cada 7 dias o app pede a senha mestra — assim você não a esquece.</p>
        )}
        {digital === 'invalida' && (
          <p class="dica centro">A senha mestra mudou. Depois de entrar, ative a digital de novo em Ajustes.</p>
        )}
      </form>
    </div>
  );
}
