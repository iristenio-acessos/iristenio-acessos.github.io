// Conectar à planilha com segurança: confere o cofre da planilha ANTES de enviar qualquer coisa.
import { analisarConexao, conectarCofre, lerCofre } from '../../dados/sessao';
import { prepararConexao } from '../../sync/motor';
import type { OpcaoDialogo } from '../estado';

type Perguntar = <T extends string>(titulo: string, opcoes: OpcaoDialogo<T>[], mensagem?: string) => Promise<T | null>;

/** Devolve uma mensagem para mostrar ao usuário (ou lança erro se não conectou). */
export async function conectarComConferencia(codigo: string, perguntar: Perguntar): Promise<string | null> {
  const previa = await prepararConexao(codigo);
  const analise = await analisarConexao(previa);

  if (analise.situacao === 'cofres-diferentes') {
    const perda = analise.itensAqui
      ? `Os ${analise.itensAqui} ${analise.itensAqui === 1 ? 'item guardado' : 'itens guardados'} só neste aparelho serão APAGADOS.`
      : 'Este aparelho não tem itens guardados, então nada será perdido.';
    const r = await perguntar(
      'Este aparelho tem outro cofre',
      [{ valor: 'trocar', rotulo: 'Usar o cofre da planilha', estilo: analise.itensAqui ? 'perigo' : 'primario' }],
      `A planilha já tem um cofre (com ${analise.itensPlanilha} ${analise.itensPlanilha === 1 ? 'item' : 'itens'}), criado com outra senha mestra. ` +
        `Os dois não podem ser misturados. ${perda} Depois, o app pedirá a senha mestra do cofre da planilha.`,
    );
    if (!r) return null;
    await conectarCofre(previa, true);
    return 'Conectado. Digite a senha mestra do cofre da planilha.';
  }

  await conectarCofre(previa);
  switch (analise.situacao) {
    case 'baixar-cofre':
      return 'Cofre baixado da planilha. Digite a sua senha mestra.';
    case 'planilha-vazia':
      return (await lerCofre())
        ? 'Conectado! A planilha estava vazia: o cofre deste aparelho foi enviado (criptografado).'
        : 'Conectado. A planilha ainda não tem cofre: volte e crie o seu. Ele será enviado criptografado.';
    default:
      return 'Conectado ao Google! Tudo sincronizado.';
  }
}
