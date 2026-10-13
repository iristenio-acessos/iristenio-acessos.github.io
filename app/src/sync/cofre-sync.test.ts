// Cenários de vários aparelhos com a MESMA planilha (simulada em memória com o núcleo real do backend).
import 'fake-indexeddb/auto';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fecharBanco, NOME_BANCO } from '../dados/db';
import {
  analisarConexao,
  conectarCofre,
  criarNovoCofre,
  destrancado,
  destrancar,
  gravarItem,
  lerCofre,
  listarAbertos,
  trancar,
} from '../dados/sessao';
import { salvar, salvarInterno } from '../dados/repositorio';
import { novoConteudo, novoItemAberto } from '../dominio/itens';
import { prepararConexao, sincronizar } from './motor';

const require = createRequire(import.meta.url);
const nucleo = require('../../../backend/nucleo.js');

const TOKEN = 'segredo';
const CODIGO = 'APP1:' + btoa(JSON.stringify({ u: 'https://exemplo/exec', t: TOKEN }));
const SENHA = 'senha mestra do cofre';
let tabelas: Record<string, ReturnType<typeof nucleo.tabelaEmMemoria>>;
let relogio = 0;

/** "Troca de aparelho": apaga o banco local e esquece a chave. A planilha continua. */
async function novoAparelho() {
  trancar();
  await fecharBanco();
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(NOME_BANCO);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
}

beforeEach(async () => {
  await novoAparelho();
  tabelas = Object.fromEntries(Object.keys(nucleo.ESQUEMA).map((e) => [e, nucleo.tabelaEmMemoria()]));
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const req = JSON.parse(String(init.body));
    const agora = new Date(Date.UTC(2026, 9, 1, 12, 0, relogio++)).toISOString();
    const corpo = req.token !== TOKEN ? { ok: false, erro: 'Token inválido', codigo: 401 } : nucleo.processar(tabelas, req, agora);
    return { ok: true, status: 200, json: async () => corpo } as Response;
  });
});

const caixa = novoItemAberto('caixa', {
  ...novoConteudo('login'),
  nome: 'Caixa Econômica',
  campos: [{ rotulo: 'Senha de transação', valor: '445566', secreto: true }],
});

async function aparelhoPrincipalComUmItem() {
  await criarNovoCofre(SENHA);
  await gravarItem(caixa);
  await conectarCofre(await prepararConexao(CODIGO));
}

describe('sincronização do cofre', () => {
  it('o aparelho principal envia só dados criptografados para a planilha', async () => {
    await aparelhoPrincipalComUmItem();
    expect(tabelas.itens.linhas()).toHaveLength(1);
    expect(tabelas.cofre.linhas()).toHaveLength(1);
    const planilha = JSON.stringify([tabelas.itens.linhas(), tabelas.cofre.linhas()]);
    expect(planilha).not.toMatch(/Caixa|445566|transação|senha mestra/);
  });

  it('um aparelho novo baixa o cofre e abre com a mesma senha mestra', async () => {
    await aparelhoPrincipalComUmItem();
    await novoAparelho();

    const previa = await prepararConexao(CODIGO);
    expect((await analisarConexao(previa)).situacao).toBe('baixar-cofre');
    await conectarCofre(previa);
    expect(await lerCofre()).toBeDefined();
    expect(destrancado()).toBe(false);

    expect((await destrancar('senha errada!!', 0)).ok).toBe(false);
    expect((await destrancar(SENHA, 0)).ok).toBe(true);
    expect((await listarAbertos()).itens[0].conteudo.campos[0].valor).toBe('445566');
  });

  it('nunca mistura cofres diferentes: sem confirmação não conecta; com confirmação troca pelo da planilha', async () => {
    await aparelhoPrincipalComUmItem();
    await novoAparelho();
    await criarNovoCofre('outra senha mestra qualquer'); // cofre criado por engano neste aparelho

    const previa = await prepararConexao(CODIGO);
    expect(await analisarConexao(previa)).toEqual({ situacao: 'cofres-diferentes', itensAqui: 0, itensPlanilha: 1 });
    await expect(conectarCofre(previa)).rejects.toThrow();
    expect(tabelas.cofre.linhas()).toHaveLength(1); // nada foi enviado

    await conectarCofre(previa, true);
    expect(destrancado()).toBe(false);
    expect((await destrancar(SENHA, 0)).ok).toBe(true);
    expect((await listarAbertos()).itens).toHaveLength(1);
    expect(tabelas.cofre.linhas()).toHaveLength(1);
  });

  it('alterações de um aparelho chegam ao outro', async () => {
    await aparelhoPrincipalComUmItem();
    await novoAparelho();
    await conectarCofre(await prepararConexao(CODIGO));
    await destrancar(SENHA, 0);
    await gravarItem(novoItemAberto('gmail', { ...novoConteudo('login'), nome: 'Gmail' }));
    await sincronizar();
    expect(tabelas.itens.linhas()).toHaveLength(2);
  });

  it('se o cofre aberto for trocado pela sincronização, o app tranca', async () => {
    await aparelhoPrincipalComUmItem();
    expect(destrancado()).toBe(true);
    const atual = (await lerCofre())!;
    // Simula outro aparelho que trocou a senha mestra (verificador novo, mais recente)
    await salvar('cofre', { ...atual, verificador: 'novo' });
    await new Promise((ok) => setTimeout(ok, 10));
    expect(destrancado()).toBe(false);
  });

  it('código errado não conecta', async () => {
    await salvarInterno('_conexao', undefined);
    const errado = 'APP1:' + btoa(JSON.stringify({ u: 'https://exemplo/exec', t: 'outro' }));
    await expect(prepararConexao(errado)).rejects.toThrow('Token inválido');
  });
});
