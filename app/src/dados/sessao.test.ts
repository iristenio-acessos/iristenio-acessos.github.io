import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { abrirBanco, fecharBanco, NOME_BANCO } from './db';
import { criarNovoCofre, destrancado, destrancar, gravarItem, listarAbertos, restaurarItem, trancar } from './sessao';
import { novoConteudo, novoItemAberto } from '../dominio/itens';

const SENHA = 'uma senha mestra boa';

beforeEach(async () => {
  trancar();
  await fecharBanco();
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(NOME_BANCO);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
});

const caixa = () =>
  novoItemAberto('caixa', {
    ...novoConteudo('login'),
    nome: 'Caixa Econômica',
    campos: [{ rotulo: 'Senha de transação', valor: '998877', secreto: true }],
  });

describe('sessão do cofre', () => {
  it('cria destrancado; tranca; só destranca com a senha certa', async () => {
    await criarNovoCofre(SENHA);
    expect(destrancado()).toBe(true);
    trancar();
    expect((await destrancar('errada', 0)).ok).toBe(false);
    expect(destrancado()).toBe(false);
    expect((await destrancar(SENHA, 0)).ok).toBe(true);
    expect(destrancado()).toBe(true);
  });

  it('não cria um segundo cofre por cima do primeiro', async () => {
    await criarNovoCofre(SENHA);
    await expect(criarNovoCofre('outra senha qualquer')).rejects.toThrow();
  });

  it('nada legível é gravado no aparelho (nem na fila de sincronização)', async () => {
    await criarNovoCofre(SENHA);
    await gravarItem(caixa());
    const db = await abrirBanco();
    const gravado = JSON.stringify([await db.getAll('itens'), await db.getAll('fila_sync'), await db.getAll('cofre')]);
    expect(gravado).not.toMatch(/Caixa|998877|transação|uma senha mestra/);
  });

  it('trancado não lista nada; destrancado lista os itens abertos', async () => {
    await criarNovoCofre(SENHA);
    await gravarItem(caixa());
    trancar();
    expect((await listarAbertos()).itens).toEqual([]);
    await destrancar(SENHA, 0);
    expect((await listarAbertos()).itens[0].conteudo.nome).toBe('Caixa Econômica');
  });

  it('depois de 5 erros é preciso esperar, mesmo com a senha certa', async () => {
    await criarNovoCofre(SENHA);
    trancar();
    for (let n = 0; n < 5; n++) await destrancar('errada', 1000);
    const r = await destrancar(SENHA, 2000);
    expect(r).toMatchObject({ ok: false, esperarAte: 31_000 });
    expect((await destrancar(SENHA, 31_000)).ok).toBe(true);
  });

  it('desfazer a criação exclui o item', async () => {
    await criarNovoCofre(SENHA);
    const anterior = await gravarItem(caixa());
    await restaurarItem(anterior, 'caixa');
    expect((await listarAbertos()).itens[0].status).toBe('excluido');
  });
});
