// Ajustes → Categorias: criar, renomear e remover (os itens da removida vão para "Outros").
import { useState } from 'preact/hooks';
import { adicionarCategoria, CATEGORIA_RESERVA, contarPorCategoria, validarNovaCategoria } from '../../dominio/categorias';
import { removerCategoria, renomearCategoria, salvarCategorias } from '../../dados/sessao';
import { useCategorias, useItensAbertos } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { PedirTexto } from '../componentes/PedirTexto';
import { IconeLapis, IconeLixeira, IconeMais } from '../icones';

type Janela = null | { tipo: 'nova' } | { tipo: 'renomear'; nome: string };

export function CartaoCategorias() {
  const { avisar, perguntar } = useEstado();
  const { guardadas, todas } = useCategorias();
  const { itens } = useItensAbertos();
  const contagem = contarPorCategoria(itens);
  const [janela, setJanela] = useState<Janela>(null);

  async function remover(nome: string) {
    const qtd = contagem.get(nome) ?? 0;
    const r = await perguntar(
      `Remover a categoria “${nome}”?`,
      [{ valor: 'sim', rotulo: 'Remover', estilo: 'perigo' }],
      qtd ? `${qtd === 1 ? 'O item dela vai' : `Os ${qtd} itens dela vão`} para “${CATEGORIA_RESERVA}”.` : undefined,
    );
    if (!r) return;
    await removerCategoria(todas, nome);
    avisar({ texto: `Categoria “${nome}” removida` });
  }

  return (
    <section class="cartao">
      <h2>Categorias</h2>
      <ul class="lista-categorias">
        {todas.map((nome) => (
          <li key={nome}>
            <span>
              {nome} <small>{contagem.get(nome) ?? 0}</small>
            </span>
            {nome !== CATEGORIA_RESERVA && (
              <>
                <button class="botao-icone" aria-label={`Renomear ${nome}`} title="Renomear" onClick={() => setJanela({ tipo: 'renomear', nome })}>
                  <IconeLapis />
                </button>
                <button class="botao-icone perigo" aria-label={`Remover ${nome}`} title="Remover" onClick={() => remover(nome)}>
                  <IconeLixeira />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div class="linha">
        <button class="botao" onClick={() => setJanela({ tipo: 'nova' })}>
          <IconeMais /> Nova categoria
        </button>
      </div>
      <p class="dica">“{CATEGORIA_RESERVA}” não pode ser removida: ela recebe os itens das categorias removidas.</p>

      {janela?.tipo === 'nova' && (
        <PedirTexto
          titulo="Nova categoria"
          rotulo="Nome da categoria"
          confirmar="Criar"
          validar={(t) => validarNovaCategoria(t, todas)}
          aoConfirmar={async (t) => {
            await salvarCategorias(adicionarCategoria(guardadas, t));
            avisar({ texto: `Categoria “${t}” criada` });
          }}
          aoFechar={() => setJanela(null)}
        />
      )}
      {janela?.tipo === 'renomear' && (
        <PedirTexto
          titulo="Renomear categoria"
          rotulo="Novo nome"
          inicial={janela.nome}
          confirmar="Renomear"
          validar={(t) => (t.trim() === janela.nome ? 'Digite um nome diferente.' : validarNovaCategoria(t, todas.filter((c) => c !== janela.nome)))}
          aoConfirmar={async (t) => {
            await renomearCategoria(todas, janela.nome, t);
            avisar({ texto: 'Categoria renomeada' });
          }}
          aoFechar={() => setJanela(null)}
        />
      )}
    </section>
  );
}
