// Painel do item: ver, copiar e editar. Abre no painel lateral (tela cheia no celular).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Campo, ItemAberto, TipoItem } from '../../dominio/tipos';
import {
  adicionarCampo,
  alterarCampo,
  ehEndereco,
  limparConteudo,
  moverCampo,
  novoConteudo,
  novoItemAberto,
  removerCampo,
  urlDe,
  validarConteudo,
} from '../../dominio/itens';
import { adicionarCategoria, validarNovaCategoria } from '../../dominio/categorias';
import { novoId } from '../../dados/repositorio';
import { buscarAberto, salvarCategorias } from '../../dados/sessao';
import { useCategorias } from '../../dados/ganchos';
import { alternarFavorito, excluirItem, salvarItem } from '../acoes/itens';
import { useEstado } from '../estado';
import { BotaoCopiar } from '../componentes/BotaoCopiar';
import { GeradorSenha } from '../componentes/GeradorSenha';
import { NovoCampo } from '../componentes/NovoCampo';
import { PedirTexto } from '../componentes/PedirTexto';
import { IconeAbrir, IconeCadeado, IconeDado, IconeEstrela, IconeLixeira, IconeMais, IconeOlho, IconeOlhoFechado, IconeSetaBaixo, IconeSetaCima } from '../icones';

/** RN06 — tempo que um campo secreto fica visível depois de tocar no olho. */
const SEGUNDOS_MOSTRAR = 10;
const NOVA_CATEGORIA = '__nova__';

type Janela = null | { tipo: 'campo' } | { tipo: 'categoria' } | { tipo: 'gerador'; campo: number };

export function FormItem({ id, novo }: { id?: string; novo?: TipoItem }) {
  const { fecharPainel, avisar, perguntar } = useEstado();
  const categorias = useCategorias();
  const [item, setItem] = useState<ItemAberto | null>(null);
  const [original, setOriginal] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [organizando, setOrganizando] = useState(false);
  const [janela, setJanela] = useState<Janela>(null);
  const [focarCampo, setFocarCampo] = useState<number | null>(null);
  const nome = useRef<HTMLInputElement>(null);
  const criando = !id;

  useEffect(() => {
    (async () => {
      const existente = id ? await buscarAberto(id) : undefined;
      const atual = existente ?? novoItemAberto(novoId(), novoConteudo(novo ?? 'login'));
      setItem(atual);
      setOriginal(JSON.stringify(atual.conteudo));
      setErros([]);
      setOrganizando(false);
      if (!existente) setTimeout(() => nome.current?.focus(), 50);
    })();
  }, [id, novo]);

  if (!item) return null;
  const c = item.conteudo;
  const mudou = criando || JSON.stringify(c) !== original;
  const mudar = (parcial: Partial<typeof c>) => setItem({ ...item, conteudo: { ...c, ...parcial } });
  const mudarCampo = (n: number, parcial: Partial<Campo>) => mudar({ campos: alterarCampo(c.campos, n, parcial) });
  const listaCategorias = categorias.todas.includes(c.categoria) ? categorias.todas : [...categorias.todas, c.categoria];

  async function salvar(e: Event) {
    e.preventDefault();
    const conteudo = limparConteudo(item!.conteudo);
    const problemas = validarConteudo(conteudo);
    setErros(problemas);
    if (problemas.length) return;
    const desfazer = await salvarItem({ ...item!, conteudo });
    fecharPainel();
    avisar({ texto: criando ? 'Item guardado no cofre' : 'Alterações salvas', desfazer });
  }

  async function excluir() {
    const r = await perguntar(`Excluir “${c.nome}”?`, [{ valor: 'sim', rotulo: 'Excluir', estilo: 'perigo' }]);
    if (!r) return;
    const desfazer = await excluirItem(item!);
    fecharPainel();
    avisar({ texto: 'Item excluído', desfazer });
  }

  async function favoritar() {
    if (criando || mudou) return mudar({ favorito: !c.favorito });
    // Item sem outras alterações: grava na hora
    const desfazer = await alternarFavorito(item!);
    const atualizado = { ...item!, conteudo: { ...c, favorito: !c.favorito } };
    setItem(atualizado);
    setOriginal(JSON.stringify(atualizado.conteudo));
    avisar({ texto: c.favorito ? 'Tirado dos favoritos' : 'Marcado como favorito', desfazer });
  }

  async function removerComConfirmacao(n: number) {
    const campo = c.campos[n];
    if (campo.valor) {
      const r = await perguntar(`Remover o campo “${campo.rotulo || 'sem nome'}”?`, [{ valor: 'sim', rotulo: 'Remover', estilo: 'perigo' }], 'O valor guardado nele será perdido ao salvar.');
      if (!r) return;
    }
    mudar({ campos: removerCampo(c.campos, n) });
  }

  return (
    <form class="formulario form-item" onSubmit={salvar} autoComplete="off">
      <div class="linha-nome">
        <input
          ref={nome}
          class="campo campo-titulo"
          placeholder="Nome (ex.: Banco do Brasil)"
          aria-label="Nome"
          value={c.nome}
          onInput={(e) => mudar({ nome: e.currentTarget.value })}
          autoComplete="off"
          enterKeyHint="next"
        />
        <button
          type="button"
          class={`botao-icone favorito${c.favorito ? ' ativo' : ''}`}
          aria-pressed={c.favorito}
          aria-label="Favorito"
          title={c.favorito ? 'Tirar dos favoritos' : 'Marcar como favorito'}
          onClick={favoritar}
        >
          <IconeEstrela />
        </button>
      </div>

      <label class="rotulo-campo">
        <span>Categoria</span>
        <select
          class="campo"
          value={c.categoria}
          onChange={(e) => {
            if (e.currentTarget.value === NOVA_CATEGORIA) {
              e.currentTarget.value = c.categoria;
              setJanela({ tipo: 'categoria' });
            } else mudar({ categoria: e.currentTarget.value });
          }}
        >
          {listaCategorias.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
          <option value={NOVA_CATEGORIA}>+ Nova categoria…</option>
        </select>
      </label>

      {organizando ? (
        <fieldset class="organizar">
          <legend>Organizar campos</legend>
          {c.campos.length === 0 && <p class="dica">Nenhum campo. Toque em “Adicionar campo”.</p>}
          {c.campos.map((campo, n) => (
            <div class="linha-organizar" key={n}>
              <input
                class="campo"
                aria-label={`Nome do campo ${n + 1}`}
                placeholder="Nome do campo"
                value={campo.rotulo}
                onInput={(e) => mudarCampo(n, { rotulo: e.currentTarget.value })}
                maxLength={40}
              />
              <button
                type="button"
                class={`botao-icone${campo.secreto ? ' ativo' : ''}`}
                aria-pressed={campo.secreto}
                aria-label="Secreto"
                title={campo.secreto ? 'Secreto (escondido). Toque para deixar visível' : 'Visível. Toque para deixar secreto'}
                onClick={() => mudarCampo(n, { secreto: !campo.secreto })}
              >
                <IconeCadeado />
              </button>
              <button type="button" class="botao-icone" aria-label="Subir" disabled={n === 0} onClick={() => mudar({ campos: moverCampo(c.campos, n, n - 1) })}>
                <IconeSetaCima />
              </button>
              <button type="button" class="botao-icone" aria-label="Descer" disabled={n === c.campos.length - 1} onClick={() => mudar({ campos: moverCampo(c.campos, n, n + 1) })}>
                <IconeSetaBaixo />
              </button>
              <button type="button" class="botao-icone perigo" aria-label="Remover campo" onClick={() => removerComConfirmacao(n)}>
                <IconeLixeira />
              </button>
            </div>
          ))}
          <p class="dica">O cadeado marca o campo como secreto: ele fica escondido (••••) e fora da busca.</p>
        </fieldset>
      ) : (
        c.campos.map((campo, n) => (
          <LinhaCampo
            key={`${n}-${campo.rotulo}`}
            campo={campo}
            focar={focarCampo === n}
            aoMudar={(valor) => mudarCampo(n, { valor })}
            aoGerar={() => setJanela({ tipo: 'gerador', campo: n })}
          />
        ))
      )}

      <div class="linha botoes-campos">
        <button type="button" class="botao" onClick={() => setJanela({ tipo: 'campo' })}>
          <IconeMais /> Adicionar campo
        </button>
        {c.campos.length > 0 && (
          <button type="button" class="botao fantasma" aria-pressed={organizando} onClick={() => setOrganizando(!organizando)}>
            {organizando ? 'Pronto' : 'Organizar campos'}
          </button>
        )}
      </div>

      <label class="rotulo-campo">
        <span>Observações</span>
        <textarea class="campo" rows={3} value={c.observacoes} onInput={(e) => mudar({ observacoes: e.currentTarget.value })} />
      </label>

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}

      <div class="acoes-form">
        <button type="submit" class="botao primario" disabled={!mudou}>
          {criando ? 'Guardar' : mudou ? 'Salvar' : 'Sem alterações'}
        </button>
        {!criando && (
          <button type="button" class="botao perigo" onClick={excluir}>Excluir</button>
        )}
      </div>

      {janela?.tipo === 'campo' && (
        <NovoCampo
          existentes={c.campos.map((x) => x.rotulo)}
          aoAdicionar={(rotulo, secreto) => {
            mudar({ campos: adicionarCampo(c.campos, rotulo, secreto) });
            setOrganizando(false);
            setFocarCampo(c.campos.length);
          }}
          aoFechar={() => setJanela(null)}
        />
      )}
      {janela?.tipo === 'categoria' && (
        <PedirTexto
          titulo="Nova categoria"
          rotulo="Nome da categoria"
          confirmar="Criar"
          validar={(t) => validarNovaCategoria(t, categorias.todas)}
          aoConfirmar={async (t) => {
            await salvarCategorias(adicionarCategoria(categorias.guardadas, t));
            mudar({ categoria: t });
          }}
          aoFechar={() => setJanela(null)}
        />
      )}
      {janela?.tipo === 'gerador' && (
        <GeradorSenha
          substituindo={Boolean(c.campos[janela.campo]?.valor)}
          aoUsar={(senha) => mudarCampo(janela.campo, { valor: senha })}
          aoFechar={() => setJanela(null)}
        />
      )}
    </form>
  );
}

function LinhaCampo(props: { campo: Campo; focar: boolean; aoMudar: (valor: string) => void; aoGerar: () => void }) {
  const { campo, aoMudar } = props;
  const [visivel, setVisivel] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const endereco = ehEndereco(campo);

  useEffect(() => {
    if (props.focar) setTimeout(() => entrada.current?.focus(), 50);
  }, [props.focar]);

  useEffect(() => {
    if (!visivel) return;
    const id = setTimeout(() => setVisivel(false), SEGUNDOS_MOSTRAR * 1000);
    return () => clearTimeout(id);
  }, [visivel]);

  const escondido = campo.secreto && !visivel;
  return (
    <label class="rotulo-campo">
      <span>{campo.rotulo || 'Campo sem nome'}</span>
      <div class="campo-com-botoes">
        <input
          ref={entrada}
          class={`campo${campo.secreto ? ' secreto' : ''}`}
          type={escondido ? 'password' : 'text'}
          aria-label={campo.rotulo}
          value={campo.valor}
          onInput={(e) => aoMudar(e.currentTarget.value)}
          autoComplete={campo.secreto ? 'new-password' : 'off'}
          autoCapitalize="off"
          autoCorrect="off"
          spellcheck={false}
          data-1p-ignore
          data-lpignore="true"
        />
        {campo.secreto && (
          <button
            type="button"
            class="botao-icone"
            aria-label={visivel ? 'Esconder' : 'Mostrar'}
            title={visivel ? 'Esconder' : `Mostrar por ${SEGUNDOS_MOSTRAR} segundos`}
            onClick={() => setVisivel(!visivel)}
          >
            {visivel ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        )}
        {campo.secreto && (
          <button type="button" class="botao-icone" aria-label="Gerar senha" title="Gerar senha" onClick={props.aoGerar}>
            <IconeDado />
          </button>
        )}
        {endereco && (
          <a class="botao-icone" href={urlDe(campo.valor)} target="_blank" rel="noopener noreferrer" aria-label="Abrir site" title="Abrir site">
            <IconeAbrir />
          </a>
        )}
        <BotaoCopiar valor={campo.valor} descricao={`Copiar ${(campo.rotulo || 'campo').toLowerCase()}`} secreto={campo.secreto} />
      </div>
    </label>
  );
}
