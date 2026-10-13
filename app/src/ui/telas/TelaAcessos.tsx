// Tela principal: busca + lista de itens, com atalhos para copiar (ex.: usuário e senha).
import { useState } from 'preact/hooks';
import { camposAtalho, filtrarItens, ordenarItens } from '../../dominio/itens';
import { useItensAbertos } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { trancarAgora } from '../trava';
import { BotaoCopiar } from '../componentes/BotaoCopiar';
import { ICONE_TIPO } from '../tipos-item';
import { IconeBusca, IconeCadeado, IconeChave, IconeEstrela, IconeFechar } from '../icones';

export function TelaAcessos() {
  const { abrirPainel, painel } = useEstado();
  const { itens, ilegiveis, carregado } = useItensAbertos();
  const [busca, setBusca] = useState('');
  const ativos = ordenarItens(itens);
  const lista = filtrarItens(ativos, busca);

  return (
    <>
      <header class="cabecalho cabecalho-acoes">
        <h1>Acessos</h1>
        <span class="sub">{ativos.length ? `${ativos.length} ${ativos.length === 1 ? 'item' : 'itens'}` : ''}</span>
        <button class="botao trancar" onClick={trancarAgora} title="Trancar o cofre agora">
          <IconeCadeado /> Trancar
        </button>
      </header>
      <div class="conteudo">
        {ativos.length > 0 && (
          <div class="busca">
            <IconeBusca />
            <input
              class="campo"
              type="search"
              placeholder="Buscar por nome, usuário, site…"
              value={busca}
              onInput={(e) => setBusca(e.currentTarget.value)}
              autoComplete="off"
              autoCorrect="off"
              spellcheck={false}
              enterKeyHint="search"
            />
            {busca && (
              <button class="botao-icone" onClick={() => setBusca('')} aria-label="Limpar busca">
                <IconeFechar />
              </button>
            )}
          </div>
        )}

        {ilegiveis > 0 && (
          <p class="alerta" role="alert">
            {ilegiveis} {ilegiveis === 1 ? 'item não pôde ser aberto' : 'itens não puderam ser abertos'} com esta senha mestra.
          </p>
        )}

        {!carregado ? null : ativos.length === 0 ? (
          <div class="vazio grande">
            <IconeChave />
            <strong>Seu cofre está vazio</strong>
            Toque no + para guardar o primeiro acesso.
          </div>
        ) : lista.length === 0 ? (
          <div class="vazio">
            <IconeBusca />
            <strong>Nada encontrado</strong>
            Nenhum item com “{busca}”.
          </div>
        ) : (
          <ul class="lista-acessos">
            {lista.map((i) => {
              const c = i.conteudo;
              const Icone = ICONE_TIPO[c.tipo];
              const atalhos = camposAtalho(c);
              const usuario = c.campos.find((x) => !x.secreto && x.valor);
              const selecionado = painel?.id === i.id;
              return (
                <li key={i.id}>
                  <div
                    class={`linha-acesso${selecionado ? ' selecionada' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirPainel({ tipo: 'item', id: i.id })}
                    onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && abrirPainel({ tipo: 'item', id: i.id })}
                  >
                    <span class="acesso-icone">
                      <Icone />
                    </span>
                    <span class="linha-item-texto">
                      <strong>
                        {c.nome}
                        {c.favorito && <IconeEstrela class="estrela" aria-label="Favorito" />}
                      </strong>
                      <small>
                        {c.categoria}
                        {usuario && ` · ${usuario.valor}`}
                      </small>
                    </span>
                    {atalhos.length > 0 && (
                      <span class="atalhos">
                        {atalhos.map((x) => (
                          <BotaoCopiar
                            key={x.rotulo}
                            valor={x.valor}
                            rotulo={x.rotulo}
                            descricao={`Copiar ${x.rotulo.toLowerCase()}`}
                            secreto={x.secreto}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
