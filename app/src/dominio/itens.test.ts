import { describe, expect, it } from 'vitest';
import { abrirItem, camposAtalho, ehEndereco, fecharItem, filtrarItens, limparConteudo, novoConteudo, novoItemAberto, ordenarItens, validarConteudo } from './itens';
import { criarCofre } from './cripto';
import type { ConteudoItem } from './tipos';

let seq = 0;
const item = (c: Partial<ConteudoItem> = {}, status: 'ativo' | 'excluido' = 'ativo') => ({
  ...novoItemAberto(`i${++seq}`, { ...novoConteudo('login'), nome: 'x', ...c }),
  status,
});

describe('itens', () => {
  it('modelo de login tem usuário, senha (secreta) e site', () => {
    const c = novoConteudo('login');
    expect(c.campos.map((x) => [x.rotulo, x.secreto])).toEqual([['Usuário', false], ['Senha', true], ['Site / app', false]]);
  });

  it('validação exige nome', () => {
    expect(validarConteudo({ nome: '  ' })).toHaveLength(1);
    expect(validarConteudo({ nome: 'Gmail' })).toHaveLength(0);
  });

  it('limpeza remove campos vazios e espaços', () => {
    const c = limparConteudo({ ...novoConteudo('login'), nome: ' Gmail ', campos: [{ rotulo: ' Usuário ', valor: 'eu', secreto: false }, { rotulo: '', valor: '', secreto: true }] });
    expect(c.nome).toBe('Gmail');
    expect(c.campos).toEqual([{ rotulo: 'Usuário', valor: 'eu', secreto: false }]);
  });

  it('ordenação: favoritos primeiro, depois alfabética; excluídos fora', () => {
    const b = item({ nome: 'banco' });
    const a = item({ nome: 'Água' });
    const fav = item({ nome: 'Zoom', favorito: true });
    const apagado = item({ nome: 'Abc' }, 'excluido');
    expect(ordenarItens([b, apagado, a, fav]).map((x) => x.conteudo.nome)).toEqual(['Zoom', 'Água', 'banco']);
  });

  it('busca ignora acentos e NÃO procura em campos secretos', () => {
    const caixa = item({ nome: 'Caixa Econômica', campos: [{ rotulo: 'Usuário', valor: 'iris', secreto: false }, { rotulo: 'Senha', valor: 'segredo', secreto: true }] });
    const gmail = item({ nome: 'Gmail' });
    expect(filtrarItens([caixa, gmail], 'economica')).toEqual([caixa]);
    expect(filtrarItens([caixa, gmail], 'iris')).toEqual([caixa]);
    expect(filtrarItens([caixa, gmail], 'segredo')).toEqual([]);
    expect(filtrarItens([caixa, gmail], '')).toHaveLength(2);
  });

  it('atalhos: até dois campos preenchidos, sem o site', () => {
    const c = { ...novoConteudo('login'), campos: [{ rotulo: 'Site', valor: 'bb.com.br', secreto: false }, { rotulo: 'Usuário', valor: 'eu', secreto: false }, { rotulo: 'Senha', valor: 's', secreto: true }, { rotulo: 'Extra', valor: 'x', secreto: false }] };
    expect(camposAtalho(c).map((x) => x.rotulo)).toEqual(['Usuário', 'Senha']);
    expect(ehEndereco({ rotulo: '', valor: 'https://caixa.gov.br/login', secreto: false })).toBe(true);
    expect(ehEndereco({ rotulo: '', valor: 'iristenio', secreto: false })).toBe(false);
    expect(ehEndereco({ rotulo: '', valor: '123.456.789-00', secreto: false })).toBe(false);
    expect(ehEndereco({ rotulo: '', valor: 'bb.com.br', secreto: false })).toBe(true);
  });

  it('fechar/abrir: o registro gravado não contém nada legível', async () => {
    const { chave } = await criarCofre('senha-mestra-longa', new Date(), 1000);
    const aberto = item({ nome: 'Caixa', campos: [{ rotulo: 'Senha', valor: 'minha-senha-123', secreto: true }] });
    const fechado = await fecharItem(chave, aberto);
    expect(JSON.stringify(fechado)).not.toMatch(/Caixa|minha-senha|Senha/);
    expect(await abrirItem(chave, fechado)).toEqual(aberto);
  });
});

describe('campos livres', () => {
  const base = [{ rotulo: 'A', valor: '1', secreto: false }, { rotulo: 'B', valor: '2', secreto: true }];
  it('adiciona no fim, move, altera e remove', async () => {
    const { adicionarCampo, moverCampo, removerCampo, alterarCampo } = await import('./itens');
    const com = adicionarCampo(base, ' Senha de transação ', true);
    expect(com[2]).toEqual({ rotulo: 'Senha de transação', valor: '', secreto: true });
    expect(moverCampo(com, 2, 0).map((x) => x.rotulo)).toEqual(['Senha de transação', 'A', 'B']);
    expect(moverCampo(com, 0, -1)).toBe(com);
    expect(alterarCampo(base, 0, { secreto: true })[0].secreto).toBe(true);
    expect(removerCampo(base, 0)).toEqual([base[1]]);
  });
});
