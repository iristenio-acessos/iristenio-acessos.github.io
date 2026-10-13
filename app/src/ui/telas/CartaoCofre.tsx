// Ajustes → Cofre e backup: exportar/restaurar backup, trocar a senha mestra e kit de emergência.
import { useState } from 'preact/hooks';
import { nomeArquivoBackup } from '../../dominio/backup';
import { exportarBackup, restaurarBackup, trocarSenhaMestra } from '../../dados/sessao';
import { lerInterno, salvarInterno } from '../../dados/repositorio';
import { useConsulta } from '../../dados/ganchos';
import { useSync } from '../../sync/ganchos';
import { useEstado } from '../estado';
import { baixarArquivo, escolherArquivo } from '../arquivo';
import { imprimirKit } from '../kit-emergencia';
import { Janela } from '../componentes/Janela';
import { CampoSenha } from '../componentes/CampoSenha';

const fmtData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export async function fazerBackup() {
  baixarArquivo(nomeArquivoBackup(), await exportarBackup());
  await salvarInterno('_ultimo_backup', new Date().toISOString());
}

/** Restaura e devolve a mensagem para o aviso (ou lança erro). */
export async function restaurarDeArquivo(): Promise<string | null> {
  const conteudo = await escolherArquivo();
  if (conteudo === null) return null;
  const r = await restaurarBackup(conteudo);
  if (!r.ok) throw new Error(r.erro);
  if (r.cofreNovo) return 'Cofre restaurado. Digite a senha mestra que valia quando o backup foi feito.';
  return r.itens ? `${r.itens} ${r.itens === 1 ? 'item recuperado' : 'itens recuperados'} do backup` : 'Nada a recuperar: o cofre já está igual ou mais novo que o backup.';
}

export function CartaoCofre() {
  const { avisar } = useEstado();
  const sync = useSync();
  const ultimoBackup = useConsulta(() => lerInterno<string>('_ultimo_backup'), undefined as string | undefined);
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState('');

  async function aoRestaurar() {
    setErro('');
    try {
      const msg = await restaurarDeArquivo();
      if (msg) avisar({ texto: msg });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section class="cartao">
      <h2>Cofre e backup</h2>

      <h3 class="subtitulo">Arquivo de backup</h3>
      <p class="dica">
        Um arquivo com o cofre criptografado, para guardar fora do Google (pen drive, e-mail para você mesmo…). Só abre
        com a senha mestra atual.
        {ultimoBackup ? ` Último backup neste aparelho: ${fmtData.format(new Date(ultimoBackup))}.` : ' Nenhum backup feito neste aparelho.'}
      </p>
      <div class="linha">
        <button class="botao primario" onClick={() => fazerBackup().catch((e) => setErro(String(e?.message ?? e)))}>
          Baixar backup
        </button>
        <button class="botao" onClick={aoRestaurar}>Recuperar itens de um backup</button>
      </div>
      {erro && <p class="erros" role="alert">{erro}</p>}

      <h3 class="subtitulo">Senha mestra</h3>
      <p class="dica">
        Troque se achar que alguém descobriu a senha. Os outros aparelhos vão trancar e pedir a senha nova. Backups antigos
        continuam abrindo só com a senha antiga.
      </p>
      <div class="linha">
        <button class="botao" onClick={() => setTrocando(true)}>Trocar a senha mestra</button>
      </div>

      <h3 class="subtitulo">Kit de emergência</h3>
      <p class="dica">Uma folha para imprimir e guardar em casa, com o passo a passo para recuperar o cofre. Não contém senhas.</p>
      <div class="linha">
        <button class="botao" onClick={() => imprimirKit(sync.planilha)}>Imprimir o kit</button>
      </div>

      {trocando && (
        <TrocarSenha
          aoFechar={() => setTrocando(false)}
          aoConcluir={() => {
            setTrocando(false);
            avisar({ texto: 'Senha mestra trocada! Baixe um backup novo: os antigos só abrem com a senha antiga.' });
          }}
        />
      )}
    </section>
  );
}

function TrocarSenha({ aoFechar, aoConcluir }: { aoFechar: () => void; aoConcluir: () => void }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    setOcupado(true);
    try {
      const problemas = await trocarSenhaMestra(atual, nova, confirmacao);
      setErros(problemas);
      if (!problemas.length) aoConcluir();
    } catch (x) {
      setErros([x instanceof Error ? x.message : 'Não foi possível trocar a senha.']);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Janela titulo="Trocar a senha mestra" aoFechar={aoFechar}>
      <form class="formulario" onSubmit={enviar} autoComplete="off">
        <CampoSenha rotulo="Senha mestra atual" valor={atual} aoMudar={setAtual} autoFocus />
        <CampoSenha rotulo="Senha nova (mínimo 12 caracteres)" valor={nova} aoMudar={setNova} novaSenha />
        <CampoSenha rotulo="Senha nova, de novo" valor={confirmacao} aoMudar={setConfirmacao} novaSenha />
        <p class="alerta">
          Faça isso com a internet ligada. Depois, nos outros aparelhos, use a senha nova. Guarde-a num lugar seguro:
          ela também não pode ser recuperada.
        </p>
        {erros.length > 0 && (
          <ul class="erros" role="alert">
            {erros.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
        <div class="dialogo-opcoes">
          <button type="button" class="botao fantasma" onClick={aoFechar}>Cancelar</button>
          <button type="submit" class="botao primario" disabled={ocupado || !atual || !nova}>
            {ocupado ? 'Criptografando de novo…' : 'Trocar senha'}
          </button>
        </div>
      </form>
    </Janela>
  );
}
