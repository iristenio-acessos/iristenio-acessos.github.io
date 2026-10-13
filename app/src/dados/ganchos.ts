// Ganchos (hooks) da interface para ler dados e se atualizar quando eles mudam.
import { useEffect, useState } from 'preact/hooks';
import { aoMudarDados, lerConfig, listarTodos, type MapaEntidades } from './repositorio';
import { aoMudarSessao, destrancado, listarAbertos } from './sessao';
import type { Config, Entidade, ItemAberto } from '../dominio/tipos';
import { CONFIG_PADRAO } from '../dominio/tipos';

/** Executa a consulta e repete sempre que qualquer dado local (ou a sessão do cofre) mudar. */
export function useConsulta<T>(consulta: () => Promise<T>, inicial: T, deps: unknown[] = []): T {
  const [valor, setValor] = useState<T>(inicial);
  useEffect(() => {
    let ativo = true;
    const executar = () => consulta().then((v) => ativo && setValor(v));
    executar();
    const cancelarDados = aoMudarDados(executar);
    const cancelarSessao = aoMudarSessao(executar);
    return () => {
      ativo = false;
      cancelarDados();
      cancelarSessao();
    };
  }, deps);
  return valor;
}

export function useEntidade<E extends Entidade>(entidade: E): MapaEntidades[E][] {
  return useConsulta(() => listarTodos(entidade), [] as MapaEntidades[E][], [entidade]);
}

export function useConfig(): Config {
  return useConsulta(lerConfig, CONFIG_PADRAO);
}

/** true enquanto o cofre estiver destrancado. */
export function useDestrancado(): boolean {
  const [aberto, setAberto] = useState(destrancado);
  useEffect(() => aoMudarSessao(() => setAberto(destrancado())), []);
  return aberto;
}

/** Itens abertos (vazio com o cofre trancado). `carregado` evita mostrar "vazio" antes da hora. */
type ItensAbertos = { itens: ItemAberto[]; ilegiveis: number; carregado: boolean };

export function useItensAbertos(): ItensAbertos {
  return useConsulta<ItensAbertos>(async () => ({ ...(await listarAbertos()), carregado: true }), { itens: [], ilegiveis: 0, carregado: false });
}
