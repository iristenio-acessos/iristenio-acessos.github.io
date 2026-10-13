// Tela Ajustes: conexão com o Google, preferências e informações do aparelho.
import { useEffect, useState } from 'preact/hooks';
import type { Config, Tema } from '../../dominio/tipos';
import { salvarConfig } from '../../dados/repositorio';
import { useConfig } from '../../dados/ganchos';
import { baixarTudo, desconectar, sincronizar } from '../../sync/motor';
import { conectarComConferencia } from '../acoes/conexao';
import { APP } from '../../app.config';
import { descreverUltimaSync, ROTULO_STATUS, useSync } from '../../sync/ganchos';
import { useEstado } from '../estado';
import { aplicarTema } from '../tema';
import { trancarAgora } from '../trava';
import { OPCOES_MINUTOS_TRANCAR } from '../../dominio/trava';
import { IconeCadeado } from '../icones';
import { CartaoCategorias } from './CartaoCategorias';
import { CartaoCofre } from './CartaoCofre';
import { BlocoDigital } from './BlocoDigital';

export function TelaAjustes() {
  return (
    <>
      <header class="cabecalho">
        <h1>Ajustes</h1>
      </header>
      <div class="conteudo ajustes">
        <CartaoSeguranca />
        <CartaoCategorias />
        <CartaoPreferencias />
        <CartaoGoogle />
        <CartaoCofre />
        <CartaoAparelho />
      </div>
    </>
  );
}

/* ---------------- Segurança ---------------- */

function CartaoSeguranca() {
  const config = useConfig();
  return (
    <section class="cartao">
      <h2>Segurança</h2>
      <div class="preferencias">
        <label>
          <span>Trancar sozinho depois de</span>
          <div class="segmentado pequeno minutos" role="radiogroup" aria-label="Minutos para trancar">
            {OPCOES_MINUTOS_TRANCAR.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={config.minutos_trancar === m} onClick={() => salvarConfig({ minutos_trancar: m })}>
                {m} min
              </button>
            ))}
          </div>
        </label>
      </div>
      <p class="dica">
        Sem uso por esse tempo, o cofre tranca e pede a senha mestra de novo. Ele também tranca se você sair do app
        por mais de 1 minuto.
      </p>
      <div class="linha">
        <button class="botao primario" onClick={trancarAgora}>
          <IconeCadeado /> Trancar agora
        </button>
      </div>
      <BlocoDigital />
    </section>
  );
}

/* ---------------- Conexão com o Google ---------------- */

/** `naEntrada`: versão compacta usada na tela de primeiro uso ("Já tenho um cofre em outro aparelho"). */
export function CartaoGoogle({ naEntrada = false }: { naEntrada?: boolean }) {
  const sync = useSync();
  const { avisar, perguntar } = useEstado();
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [, forcarRelogio] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forcarRelogio((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function aoConectar(e: Event) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      const mensagem = await conectarComConferencia(codigo, perguntar);
      if (mensagem) {
        setCodigo('');
        avisar({ texto: mensagem });
      }
    } catch (x) {
      setErro(x instanceof Error ? x.message : 'Não foi possível conectar.');
    } finally {
      setOcupado(false);
    }
  }

  async function aoDesconectar() {
    const r = await perguntar(
      'Desconectar deste aparelho?',
      [{ valor: 'sim', rotulo: 'Desconectar', estilo: 'perigo' }],
      'O cofre continua neste aparelho e na planilha. Alterações feitas depois ficarão só neste aparelho até conectar de novo.',
    );
    if (r) await desconectar();
  }

  async function aoBaixarTudo() {
    setOcupado(true);
    await baixarTudo();
    setOcupado(false);
    avisar({ texto: 'Dados da planilha conferidos' });
  }

  const conectado = sync.status !== 'desconectado';

  return (
    <section class={naEntrada ? '' : 'cartao'}>
      {!naEntrada && <h2>Sincronização com o Google</h2>}
      {!conectado ? (
        <form class="formulario" onSubmit={aoConectar}>
          <p class="dica">
            {naEntrada
              ? 'Cole o código de conexão da sua planilha. O app baixa o cofre (criptografado) e pede a sua senha mestra.'
              : 'Conecte à sua planilha do Google para ter backup e usar o mesmo cofre no celular, tablet e PC. A planilha recebe só dados criptografados: sem a senha mestra, ninguém consegue ler.'}
          </p>
          <textarea
            class="campo codigo"
            rows={3}
            placeholder="Cole aqui o código de conexão (começa com APP1:)"
            value={codigo}
            onInput={(e) => setCodigo(e.currentTarget.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellcheck={false}
          />
          {erro && <p class="erros" role="alert">{erro}</p>}
          <div class="linha">
            <button type="submit" class="botao primario" disabled={ocupado || !codigo.trim()}>
              {ocupado ? 'Conferindo a planilha…' : 'Conectar'}
            </button>
          </div>
          {!naEntrada && (
            <p class="dica">
              Onde achar o código: no editor do Apps Script, execute <strong>configurar</strong> e copie a linha que começa
              com APP1: no registro de execução.
            </p>
          )}
        </form>
      ) : (
        <div class="sync-painel">
          <div class={`sync-status ${sync.status}`}>
            <span class={`status-ponto ${sync.status}`} />
            <strong>{ROTULO_STATUS[sync.status]}</strong>
            <span>
              {sync.pendentes > 0 ? `${sync.pendentes} alteraç${sync.pendentes > 1 ? 'ões' : 'ão'} a enviar · ` : ''}
              última sincronização: {descreverUltimaSync(sync.ultimaSync)}
            </span>
          </div>
          {sync.erro && <p class="erros" role="alert">{sync.erro}</p>}
          <div class="linha">
            <button class="botao primario" disabled={sync.status === 'sincronizando'} onClick={() => sincronizar()}>
              Sincronizar agora
            </button>
            {sync.planilha && (
              <a class="botao" href={sync.planilha} target="_blank" rel="noopener noreferrer">
                Abrir planilha
              </a>
            )}
            <button class="botao" disabled={ocupado} onClick={aoBaixarTudo}>
              Baixar tudo da planilha
            </button>
            <button class="botao perigo" onClick={aoDesconectar}>
              Desconectar
            </button>
          </div>
          <p class="dica">
            A sincronização acontece sozinha: ao abrir o app, alguns segundos após cada alteração, quando a internet
            volta e a cada 5 minutos.
          </p>
        </div>
      )}
    </section>
  );
}

/* ---------------- Preferências ---------------- */

const TEMAS: { valor: Tema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

function CartaoPreferencias() {
  const config = useConfig();
  const mudar = (parcial: Partial<Config>) => salvarConfig(parcial);
  const escolherTema = (tema: Tema) => {
    aplicarTema(tema);
    mudar({ tema });
  };

  return (
    <section class="cartao">
      <h2>Preferências</h2>
      <div class="preferencias">
        <label>
          <span>Tema</span>
          <div class="segmentado pequeno" role="radiogroup" aria-label="Tema">
            {TEMAS.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={config.tema === t.valor} onClick={() => escolherTema(t.valor)}>
                {t.rotulo}
              </button>
            ))}
          </div>
        </label>
      </div>
      <p class="dica">As preferências valem para este aparelho. “Sistema” acompanha o modo claro/escuro do aparelho.</p>
    </section>
  );
}

export function Numero(props: { rotulo: string; sufixo: string; valor: number; opcoes: number[]; aoMudar: (v: number) => void }) {
  return (
    <label>
      <span>{props.rotulo}</span>
      <span class="linha">
        <select class="campo" value={props.valor} onChange={(e) => props.aoMudar(Number(e.currentTarget.value))}>
          {props.opcoes.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {props.sufixo}
      </span>
    </label>
  );
}

/* ---------------- Este aparelho ---------------- */

function CartaoAparelho() {
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [uso, setUso] = useState<string>('');

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistente).catch(() => setPersistente(null));
    navigator.storage
      ?.estimate?.()
      .then((e) => setUso(e.usage ? `${(e.usage / 1024 / 1024).toFixed(1)} MB` : ''))
      .catch(() => undefined);
  }, []);

  return (
    <section class="cartao">
      <h2>Este aparelho</h2>
      <ul class="info-lista">
        <li>
          <span>Proteção dos dados locais</span>
          <strong>
            {persistente === null ? '—' : persistente ? '✔ Ativa' : '⚠ Inativa (instale o app na tela inicial)'}
          </strong>
        </li>
        {uso && (
          <li>
            <span>Espaço usado</span>
            <strong>{uso}</strong>
          </li>
        )}
        <li>
          <span>Pensado para</span>
          <strong>{APP.dispositivos.join(', ')}</strong>
        </li>
        <li>
          <span>Versão do app</span>
          <strong>{__VERSAO__}</strong>
        </li>
      </ul>
    </section>
  );
}
