import { describe, expect, it } from 'vitest';
import { lerBackup, montarBackup, nomeArquivoBackup } from './backup';
import type { Cofre, ItemCifrado } from './tipos';

const cofre: Cofre = { id: 'cofre', sal: 's', rodadas: 1000, verificador: 'v', cifrado: '', criado_em: 'x', atualizado_em: 'x' };
const item: ItemCifrado = { id: 'a', status: 'ativo', cifrado: 'zzz', criado_em: 'x', atualizado_em: 'x' };

describe('backup', () => {
  it('ida e volta', () => {
    const b = montarBackup(cofre, [item], new Date('2026-10-13T12:00:00Z'));
    expect(lerBackup(JSON.stringify(b))).toEqual(b);
  });

  it('nome do arquivo com a data', () => {
    expect(nomeArquivoBackup(new Date(2026, 9, 5))).toBe('meus-acessos-backup-2026-10-05.json');
  });

  it('recusa arquivos estranhos ou danificados', () => {
    expect(() => lerBackup('não é json')).toThrow('não é um backup');
    expect(() => lerBackup('{"formato":"outro"}')).toThrow('não é um backup');
    const b = montarBackup(cofre, [item]);
    expect(() => lerBackup(JSON.stringify({ ...b, versao: 99 }))).toThrow('versão mais nova');
    expect(() => lerBackup(JSON.stringify({ ...b, cofre: { ...cofre, sal: 1 } }))).toThrow('cofre');
    expect(() => lerBackup(JSON.stringify({ ...b, itens: [{ id: 'a' }] }))).toThrow('itens');
  });
});
