import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTela, type Tela } from './rotas';
import { MenuLateral } from './layout/MenuLateral';
import { PainelLateral } from './layout/PainelLateral';
import { BotaoNovo, type OpcaoNovo } from './layout/BotaoNovo';
import { AvisoAtualizacao } from './layout/AvisoAtualizacao';
import { AvisoDesfazer } from './componentes/AvisoDesfazer';
import { Dialogo } from './componentes/Dialogo';
import { ProvedorEstado, useEstado, type Painel } from './estado';
import { TelaAcessos } from './telas/TelaAcessos';
import { TelaAjustes } from './telas/TelaAjustes';
import { TelaCriarCofre, TelaTrancado } from './telas/TelasCofre';
import { FormItem } from './paineis/FormItem';
import { useConfig, useConsulta, useDestrancado } from '../dados/ganchos';
import { lerCofre } from '../dados/sessao';
import { MODELOS } from '../dominio/itens';
import type { TipoItem } from '../dominio/tipos';
import { ICONE_TIPO } from './tipos-item';
import { useTravaAutomatica } from './trava';

/** ► Nova tela: acrescente aqui (e em TELAS/MENU, em rotas.ts). */
const TELA: Record<Tela, () => JSX.Element> = {
  acessos: TelaAcessos,
  config: TelaAjustes,
};

/** ► Novo painel: título e conteúdo de cada tipo declarado em estado.tsx. */
function tituloPainel(p: Painel): string {
  switch (p.tipo) {
    case 'item':
      return p.id ? 'Item' : `Novo: ${MODELOS[p.novo ?? 'login'].rotulo}`;
  }
}

function ConteudoPainel({ painel }: { painel: Painel }) {
  switch (painel.tipo) {
    case 'item':
      return <FormItem id={painel.id} novo={painel.novo} />;
  }
}

/** App destrancado. */
function Estrutura() {
  const tela = useTela();
  const config = useConfig();
  const { painel, abrirPainel, fecharPainel } = useEstado();
  const Conteudo = TELA[tela];
  useTravaAutomatica(config.minutos_trancar);

  /** ► Opções do botão "+" (com uma só, ele cria direto). */
  const opcoesNovo: OpcaoNovo[] = (Object.keys(MODELOS) as TipoItem[]).map((tipo) => ({
    rotulo: MODELOS[tipo].rotulo,
    Icone: ICONE_TIPO[tipo],
    acao: () => abrirPainel({ tipo: 'item', novo: tipo }),
  }));

  // Ao trancar, nada do cofre pode continuar na tela
  useEffect(() => fecharPainel, []);

  return (
    <div class="estrutura">
      <MenuLateral atual={tela} />
      <main class="principal">
        <Conteudo />
        {tela !== 'config' && <BotaoNovo opcoes={opcoesNovo} />}
      </main>
      {painel && (
        <PainelLateral titulo={tituloPainel(painel)} aoFechar={fecharPainel}>
          <ConteudoPainel key={painel.id ?? painel.novo} painel={painel} />
        </PainelLateral>
      )}
    </div>
  );
}

/** Decide o que mostrar: criar o cofre, cofre trancado ou o app. */
function Portao() {
  const destrancado = useDestrancado();
  const temCofre = useConsulta(async () => Boolean(await lerCofre()), null as boolean | null);
  if (temCofre === null) return null;
  if (!temCofre) return <TelaCriarCofre />;
  if (!destrancado) return <TelaTrancado />;
  return <Estrutura />;
}

export function App() {
  return (
    <ProvedorEstado>
      <Portao />
      {/* Fora do Portão: também servem às telas de entrada (criar cofre / conectar) */}
      <AvisoDesfazer />
      <AvisoAtualizacao />
      <Dialogo />
    </ProvedorEstado>
  );
}
