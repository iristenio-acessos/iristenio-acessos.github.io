// Ícone de cada tipo de item (os campos iniciais ficam em dominio/itens.ts → MODELOS).
import type { ComponentType, JSX } from 'preact';
import type { TipoItem } from '../dominio/tipos';
import { IconeCarro, IconeCartao, IconeChave, IconeDocumento, IconeNota, IconeWifi } from './icones';

export const ICONE_TIPO: Record<TipoItem, ComponentType<JSX.SVGAttributes<SVGSVGElement>>> = {
  login: IconeChave,
  cartao: IconeCartao,
  wifi: IconeWifi,
  documento: IconeDocumento,
  veiculo: IconeCarro,
  anotacao: IconeNota,
};
