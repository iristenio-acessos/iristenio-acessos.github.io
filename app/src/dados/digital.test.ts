// Fluxo da digital com um leitor biométrico FALSO (simula WebAuthn + PRF: segredo = HMAC(credencial, sal)).
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { abrirBanco, fecharBanco, NOME_BANCO } from './db';
import { criarNovoCofre, destrancado, trancar, trocarSenhaMestra } from './sessao';
import { ativarDigital, destrancarComDigital, situacaoAtual } from './digital';
import { salvarInterno } from './repositorio';

const SENHA = 'senha mestra do teste';
let usuarioCancela = false;
let devolvePrfNaCriacao = true;
let temPrf = true;
const credenciais = new Map<string, CryptoKey>();

async function segredoPrf(id: Uint8Array, sal: BufferSource): Promise<ArrayBuffer> {
  const chave = credenciais.get(String(id))!;
  return crypto.subtle.sign('HMAC', chave, sal);
}

function instalarLeitorFalso() {
  vi.stubGlobal('location', { hostname: 'localhost' });
  vi.stubGlobal('PublicKeyCredential', { isUserVerifyingPlatformAuthenticatorAvailable: async () => true });
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    credentials: {
      async create({ publicKey }: CredentialCreationOptions) {
        if (usuarioCancela) throw new DOMException('cancelou', 'NotAllowedError');
        const id = crypto.getRandomValues(new Uint8Array(16));
        credenciais.set(String(id), await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']));
        const sal = (publicKey!.extensions as { prf: { eval: { first: BufferSource } } }).prf.eval.first;
        const first = devolvePrfNaCriacao ? await segredoPrf(id, sal) : undefined;
        return { rawId: id.buffer, getClientExtensionResults: () => ({ prf: { enabled: temPrf, results: first ? { first } : undefined } }) };
      },
      async get({ publicKey }: CredentialRequestOptions) {
        if (usuarioCancela) throw new DOMException('cancelou', 'NotAllowedError');
        const id = new Uint8Array(publicKey!.allowCredentials![0].id as ArrayBuffer);
        const sal = (publicKey!.extensions as { prf: { eval: { first: BufferSource } } }).prf.eval.first;
        const first = await segredoPrf(id, sal);
        return { getClientExtensionResults: () => ({ prf: { results: { first } } }) };
      },
    },
  });
}

beforeEach(async () => {
  trancar();
  await fecharBanco();
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(NOME_BANCO);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
  usuarioCancela = false;
  devolvePrfNaCriacao = true;
  temPrf = true;
  instalarLeitorFalso();
  await criarNovoCofre(SENHA);
});

describe('desbloqueio com digital', () => {
  it('ativa e destranca com a digital; a senha mestra não fica legível no aparelho', async () => {
    expect(await situacaoAtual()).toBe('desligada');
    await ativarDigital(SENHA);
    expect(await situacaoAtual()).toBe('pronta');
    trancar();
    expect((await destrancarComDigital()).ok).toBe(true);
    expect(destrancado()).toBe(true);
    const db = await abrirBanco();
    expect(JSON.stringify(await db.getAll('config'))).not.toContain(SENHA);
  });

  it('funciona também quando o leitor só devolve o segredo num segundo toque', async () => {
    devolvePrfNaCriacao = false;
    await ativarDigital(SENHA);
    trancar();
    expect((await destrancarComDigital()).ok).toBe(true);
  });

  it('não ativa com a senha errada, sem PRF ou se o usuário cancelar', async () => {
    await expect(ativarDigital('senha errada qualquer')).rejects.toThrow('incorreta');
    temPrf = false;
    await expect(ativarDigital(SENHA)).rejects.toThrow('PRF');
    temPrf = true;
    usuarioCancela = true;
    await expect(ativarDigital(SENHA)).rejects.toThrow('Cancelado');
    expect(await situacaoAtual()).toBe('desligada');
  });

  it('depois de 7 dias sem digitar a senha mestra, pede a senha', async () => {
    await ativarDigital(SENHA);
    await salvarInterno('_ultima_senha', new Date(Date.now() - 8 * 86_400_000).toISOString());
    expect(await situacaoAtual()).toBe('pedir-senha');
    trancar();
    await expect(destrancarComDigital()).rejects.toThrow('senha mestra');
  });

  it('trocar a senha mestra invalida a digital', async () => {
    await ativarDigital(SENHA);
    expect(await trocarSenhaMestra(SENHA, 'outra senha mestra boa', 'outra senha mestra boa')).toEqual([]);
    expect(await situacaoAtual()).toBe('invalida');
    trancar();
    await expect(destrancarComDigital()).rejects.toThrow();
    expect(destrancado()).toBe(false);
  });
});
