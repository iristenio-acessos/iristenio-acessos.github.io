// Ajustes → Segurança → Desbloqueio com digital (só neste aparelho).
import { useState } from 'preact/hooks';
import { aparelhoTemBiometria, ativarDigital, desativarDigital, ErroDigital, situacaoAtual } from '../../dados/digital';
import { useConsulta } from '../../dados/ganchos';
import { DIAS_PEDIR_SENHA } from '../../dominio/digital';
import { useEstado } from '../estado';
import { Janela } from '../componentes/Janela';
import { CampoSenha } from '../componentes/CampoSenha';
import { IconeDigital } from '../icones';

const TEXTO_SITUACAO = {
  desligada: 'Desligado neste aparelho.',
  pronta: 'Ligado: o cofre pode ser aberto com a digital neste aparelho.',
  'pedir-senha': `Ligado. Na próxima vez será pedida a senha mestra (a cada ${DIAS_PEDIR_SENHA} dias).`,
  invalida: 'A senha mestra mudou: ative de novo.',
};

export function BlocoDigital() {
  const { avisar, perguntar } = useEstado();
  const [ativando, setAtivando] = useState(false);
  const info = useConsulta(async () => ({ temLeitor: await aparelhoTemBiometria(), situacao: await situacaoAtual() }), null);
  if (!info) return null;
  const ligada = info.situacao !== 'desligada';

  async function desligar() {
    const r = await perguntar('Desligar a digital neste aparelho?', [{ valor: 'sim', rotulo: 'Desligar', estilo: 'perigo' }], 'Para entrar, será preciso digitar a senha mestra.');
    if (!r) return;
    await desativarDigital();
    avisar({ texto: 'Desbloqueio com digital desligado' });
  }

  return (
    <>
      <h3 class="subtitulo">Desbloqueio com digital</h3>
      {!info.temLeitor && !ligada ? (
        <p class="dica">Este aparelho (ou navegador) não tem leitor de digital disponível para o app.</p>
      ) : (
        <>
          <p class="dica">
            {TEXTO_SITUACAO[info.situacao]} Vale só para este aparelho; a senha mestra continua funcionando sempre.
          </p>
          <div class="linha">
            {info.situacao === 'desligada' || info.situacao === 'invalida' ? (
              <button class="botao primario" onClick={() => setAtivando(true)}>
                <IconeDigital /> Ativar a digital
              </button>
            ) : (
              <button class="botao" onClick={desligar}>Desligar a digital</button>
            )}
          </div>
        </>
      )}
      {ativando && (
        <AtivarDigital
          aoFechar={() => setAtivando(false)}
          aoConcluir={() => {
            setAtivando(false);
            avisar({ texto: 'Digital ativada! Na próxima vez, é só encostar o dedo.' });
          }}
        />
      )}
    </>
  );
}

function AtivarDigital({ aoFechar, aoConcluir }: { aoFechar: () => void; aoConcluir: () => void }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    setOcupado(true);
    setErro('');
    try {
      await ativarDigital(senha);
      aoConcluir();
    } catch (x) {
      setErro(x instanceof ErroDigital ? x.message : 'Não foi possível ativar a digital.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Janela titulo="Ativar a digital" aoFechar={aoFechar}>
      <form class="formulario" onSubmit={enviar} autoComplete="off">
        <p class="dica">
          Confirme a senha mestra. Depois, o aparelho pede a sua digital (pode pedir duas vezes). O app vai criar uma
          “chave de acesso” chamada “Meus Acessos (desbloqueio)” — ela fica no seu aparelho/conta Google e não dá acesso
          a nada sem a sua digital.
        </p>
        <CampoSenha rotulo="Senha mestra" valor={senha} aoMudar={setSenha} autoFocus />
        {erro && <p class="erros" role="alert">{erro}</p>}
        <div class="dialogo-opcoes">
          <button type="button" class="botao fantasma" onClick={aoFechar}>Cancelar</button>
          <button type="submit" class="botao primario" disabled={ocupado || !senha}>
            {ocupado ? 'Aguardando a digital…' : 'Continuar'}
          </button>
        </div>
      </form>
    </Janela>
  );
}
