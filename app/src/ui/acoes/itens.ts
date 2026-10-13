// Ações da interface sobre itens: criptografam, gravam e devolvem a função "Desfazer".
import type { ItemAberto } from '../../dominio/tipos';
import { gravarItem, restaurarItem } from '../../dados/sessao';

type Desfazer = () => Promise<void>;

export async function salvarItem(item: ItemAberto): Promise<Desfazer> {
  const anterior = await gravarItem(item);
  return () => restaurarItem(anterior, item.id);
}

/** Exclusão lógica (o registro continua salvo, criptografado, com status "excluido"). */
export async function excluirItem(item: ItemAberto): Promise<Desfazer> {
  const anterior = await gravarItem({ ...item, status: 'excluido' }, 'excluir');
  return () => restaurarItem(anterior, item.id);
}

export async function alternarFavorito(item: ItemAberto): Promise<Desfazer> {
  return salvarItem({ ...item, conteudo: { ...item.conteudo, favorito: !item.conteudo.favorito } });
}
