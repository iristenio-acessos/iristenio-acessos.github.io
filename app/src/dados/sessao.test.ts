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

describe('categorias do cofre', () => {
  it('ficam criptografadas no cofre; renomear e remover movem os itens', async () => {
    const { lerPreferencias, salvarCategorias, renomearCategoria, removerCategoria } = await import('./sessao');
    await criarNovoCofre(SENHA);
    await gravarItem({ ...caixa(), conteudo: { ...caixa().conteudo, categoria: 'Bancos' } });
    await salvarCategorias([...(await lerPreferencias()).categorias, 'Clube do Livro']);
    const db = await abrirBanco();
    expect(JSON.stringify(await db.getAll('cofre'))).not.toContain('Clube');
    expect((await lerPreferencias()).categorias).toContain('Clube do Livro');

    await renomearCategoria((await lerPreferencias()).categorias, 'Bancos', 'Meus bancos');
    expect((await listarAbertos()).itens[0].conteudo.categoria).toBe('Meus bancos');
    expect((await lerPreferencias()).categorias).toContain('Meus bancos');

    expect(await removerCategoria((await lerPreferencias()).categorias, 'Meus bancos')).toBe(1);
    expect((await listarAbertos()).itens[0].conteudo.categoria).toBe('Outros');
    expect((await lerPreferencias()).categorias).not.toContain('Meus bancos');
  });
});

describe('trocar a senha mestra', () => {
  it('a senha nova abre tudo; a antiga não abre mais; nada legível é gravado', async () => {
    const { trocarSenhaMestra } = await import('./sessao');
    await criarNovoCofre(SENHA);
    await gravarItem(caixa());
    expect(await trocarSenhaMestra('errada errada', 'nova senha mestra boa', 'nova senha mestra boa')).toEqual(['A senha mestra atual está incorreta.']);
    expect(await trocarSenhaMestra(SENHA, 'curta', 'curta')).toHaveLength(1);
    expect(await trocarSenhaMestra(SENHA, 'nova senha mestra boa', 'nova senha mestra boa')).toEqual([]);
    expect(destrancado()).toBe(true); // este aparelho continua aberto
    expect((await listarAbertos()).itens[0].conteudo.nome).toBe('Caixa Econômica');

    trancar();
    expect((await destrancar(SENHA, 0)).ok).toBe(false);
    expect((await destrancar('nova senha mestra boa', 0)).ok).toBe(true);
    expect((await listarAbertos()).itens[0].conteudo.campos[0].valor).toBe('998877');
    const db = await abrirBanco();
    expect(JSON.stringify(await db.getAll('fila_sync'))).not.toMatch(/Caixa|998877|nova senha/);
  });
});

describe('backup', () => {
  it('restaura num aparelho vazio (pede a senha) e recupera itens no mesmo cofre', async () => {
    const { exportarBackup, restaurarBackup } = await import('./sessao');
    const { excluirItem } = await import('../ui/acoes/itens');
    await criarNovoCofre(SENHA);
    await gravarItem(caixa());
    const arquivo = await exportarBackup();
    expect(arquivo).not.toMatch(/Caixa|998877/);

    // Mesmo cofre: item excluído depois do backup NÃO volta (a exclusão é mais nova)
    await excluirItem((await listarAbertos()).itens[0]);
    expect(await restaurarBackup(arquivo)).toEqual({ ok: true, cofreNovo: false, itens: 0 });

    // Aparelho vazio
    trancar();
    await fecharBanco();
    await new Promise<void>((ok) => {
      const req = indexedDB.deleteDatabase(NOME_BANCO);
      req.onsuccess = req.onerror = req.onblocked = () => ok();
    });
    expect(await restaurarBackup(arquivo)).toEqual({ ok: true, cofreNovo: true, itens: 1 });
    expect(destrancado()).toBe(false);
    expect((await destrancar(SENHA, 0)).ok).toBe(true);
    expect((await listarAbertos()).itens[0].conteudo.nome).toBe('Caixa Econômica');
  });

  it('recusa backup de outro cofre e arquivo inválido', async () => {
    const { exportarBackup, restaurarBackup } = await import('./sessao');
    await criarNovoCofre(SENHA);
    const arquivo = await exportarBackup();
    trancar();
    await fecharBanco();
    await new Promise<void>((ok) => {
      const req = indexedDB.deleteDatabase(NOME_BANCO);
      req.onsuccess = req.onerror = req.onblocked = () => ok();
    });
    await criarNovoCofre('outra senha mestra');
    expect((await restaurarBackup(arquivo)).ok).toBe(false);
    expect((await restaurarBackup('lixo')).ok).toBe(false);
  });
});
