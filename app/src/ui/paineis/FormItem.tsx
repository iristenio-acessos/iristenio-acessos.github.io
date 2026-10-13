// Painel do item: ver, copiar e editar. Abre no painel lateral (tela cheia no celular).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Campo, ItemAberto, TipoItem } from '../../dominio/tipos';
import { CATEGORIAS_PADRAO, ehEndereco, limparConteudo, novoConteudo, novoItemAberto, urlDe, validarConteudo } from '../../dominio/itens';
import { novoId } from '../../dados/repositorio';
import { buscarAberto } from '../../dados/sessao';
import { alternarFavorito, excluirItem, salvarItem } from '../acoes/itens';
import { useEstado } from '../estado';
import { BotaoCopiar } from '../componentes/BotaoCopiar';
import { IconeAbrir, IconeEstrela, IconeOlho, IconeOlhoFechado } from '../icones';

/** RN06 — tempo que um campo secreto fica visível depois de tocar no olho. */
const SEGUNDOS_MOSTRAR = 10;

export function FormItem({ id, novo }: { id?: string; novo?: TipoItem }) {
  const { fecharPainel, avisar, perguntar } = useEstado();
  const [item, setItem] = useState<ItemAberto | null>(null);
  const [original, setOriginal] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const nome = useRef<HTMLInputElement>(null);
  const criando = !id;

  useEffect(() => {
    (async () => {
      const existente = id ? await buscarAberto(id) : undefined;
      const atual = existente ?? novoItemAberto(novoId(), novoConteudo(novo ?? 'login'));
      setItem(atual);
      setOriginal(JSON.stringify(atual.conteudo));
      setErros([]);
      if (!existente) setTimeout(() => nome.current?.focus(), 50);
    })();
  }, [id, novo]);

  if (!item) return null;
  const c = item.conteudo;
  const mudou = criando || JSON.stringify(c) !== original;
  const mudar = (parcial: Partial<typeof c>) => setItem({ ...item, conteudo: { ...c, ...parcial } });
  const mudarCampo = (n: number, valor: string) => mudar({ campos: c.campos.map((x, i) => (i === n ? { ...x, valor } : x)) });
  const categorias = CATEGORIAS_PADRAO.includes(c.categoria) ? CATEGORIAS_PADRAO : [...CATEGORIAS_PADRAO, c.categoria];

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
        <select class="campo" value={c.categoria} onChange={(e) => mudar({ categoria: e.currentTarget.value })}>
          {categorias.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </label>

      {c.campos.map((campo, n) => (
        <LinhaCampo key={n} campo={campo} aoMudar={(v) => mudarCampo(n, v)} />
      ))}

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
    </form>
  );
}

function LinhaCampo({ campo, aoMudar }: { campo: Campo; aoMudar: (valor: string) => void }) {
  const [visivel, setVisivel] = useState(false);
  const endereco = ehEndereco(campo);

  useEffect(() => {
    if (!visivel) return;
    const id = setTimeout(() => setVisivel(false), SEGUNDOS_MOSTRAR * 1000);
    return () => clearTimeout(id);
  }, [visivel]);

  const escondido = campo.secreto && !visivel;
  return (
    <label class="rotulo-campo">
      <span>{campo.rotulo}</span>
      <div class="campo-com-botoes">
        <input
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
        {endereco && (
          <a class="botao-icone" href={urlDe(campo.valor)} target="_blank" rel="noopener noreferrer" aria-label="Abrir site" title="Abrir site">
            <IconeAbrir />
          </a>
        )}
        <BotaoCopiar valor={campo.valor} descricao={`Copiar ${campo.rotulo.toLowerCase()}`} secreto={campo.secreto} />
      </div>
    </label>
  );
}
