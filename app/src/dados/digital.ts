// Desbloqueio com digital: conversa com o leitor biométrico do aparelho (WebAuthn + extensão PRF).
// Regras e criptografia em dominio/digital.ts. Tudo aqui fica SÓ neste aparelho (não sincroniza).
import { APP } from '../app.config';
import { deBase64, paraBase64 } from '../dominio/cripto';
import { destravarSenha, situacaoDigital, travarSenha, type ConfigDigital, type SituacaoDigital } from '../dominio/digital';
import { abrirCofre } from '../dominio/cripto';
import { lerInterno, salvarInterno } from './repositorio';
import { destrancar, lerCofre, type ResultadoDestrancar } from './sessao';

// Tipos da extensão PRF (ainda não estão em todas as versões do TypeScript)
interface ResultadoPrf {
  enabled?: boolean;
  results?: { first?: ArrayBuffer };
}
type ComPrf = { getClientExtensionResults(): { prf?: ResultadoPrf } };

const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export class ErroDigital extends Error {}

export async function lerConfigDigital(): Promise<ConfigDigital | undefined> {
  return lerInterno<ConfigDigital>('_digital');
}

export async function situacaoAtual(): Promise<SituacaoDigital> {
  return situacaoDigital(await lerConfigDigital(), await lerCofre(), await lerInterno<string>('_ultima_senha'));
}

/** O aparelho tem leitor biométrico (ou Windows Hello) disponível para o navegador? */
export async function aparelhoTemBiometria(): Promise<boolean> {
  try {
    return (
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

/** Pede ao leitor o segredo PRF da credencial (abre a janela da digital do sistema). */
async function obterSegredo(credencial: string, salPrf: string): Promise<ArrayBuffer> {
  const resposta = (await navigator.credentials.get({
    publicKey: {
      challenge: aleatorio(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: deBase64(credencial) }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: deBase64(salPrf) } } } as AuthenticationExtensionsClientInputs,
    },
  })) as (Credential & ComPrf) | null;
  const segredo = resposta?.getClientExtensionResults().prf?.results?.first;
  if (!segredo) throw new ErroDigital('O leitor não devolveu o segredo da digital.');
  return segredo;
}

/** Confere a senha mestra, cria a credencial (pede a digital) e guarda a senha travada. */
export async function ativarDigital(senhaMestra: string): Promise<void> {
  const cofre = await lerCofre();
  if (!cofre || !(await abrirCofre(cofre, senhaMestra))) throw new ErroDigital('A senha mestra está incorreta.');
  if (!(await aparelhoTemBiometria())) throw new ErroDigital('Este aparelho não tem leitor de digital disponível para o navegador.');

  const salPrf = paraBase64(aleatorio(32));
  let cred: (PublicKeyCredential & ComPrf) | null;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        challenge: aleatorio(32),
        rp: { name: APP.nome, id: location.hostname },
        user: { id: aleatorio(16), name: `${APP.nome} — desbloqueio`, displayName: `${APP.nome} (desbloqueio)` },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'required' },
        timeout: 60_000,
        extensions: { prf: { eval: { first: deBase64(salPrf) } } } as AuthenticationExtensionsClientInputs,
      },
    })) as (PublicKeyCredential & ComPrf) | null;
  } catch (e) {
    throw new ErroDigital(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Cancelado.' : `O aparelho recusou: ${String(e)}`);
  }
  if (!cred) throw new ErroDigital('Cancelado.');
  const prf = cred.getClientExtensionResults().prf;
  if (!prf?.enabled) {
    throw new ErroDigital(
      'Este aparelho ou navegador não oferece o desbloqueio seguro por digital (recurso PRF). Atualize o Chrome e o Google Play Services e tente de novo.',
    );
  }
  const credencial = paraBase64(new Uint8Array(cred.rawId));
  // Alguns aparelhos já devolvem o segredo na criação; os outros pedem a digital mais uma vez
  const segredo = prf.results?.first ?? (await obterSegredo(credencial, salPrf));

  const config: ConfigDigital = {
    credencial,
    salPrf,
    senhaTravada: await travarSenha(segredo, senhaMestra),
    cofreSal: cofre.sal,
    cofreVerificador: cofre.verificador,
    ativada_em: new Date().toISOString(),
  };
  await salvarInterno('_digital', config);
  await salvarInterno('_ultima_senha', config.ativada_em);
}

export async function desativarDigital() {
  await salvarInterno('_digital', undefined);
}

/** Destranca com a digital. Lança ErroDigital se não der (o usuário digita a senha mestra). */
export async function destrancarComDigital(): Promise<ResultadoDestrancar> {
  const cfg = await lerConfigDigital();
  if (!cfg || (await situacaoAtual()) !== 'pronta') throw new ErroDigital('Use a senha mestra.');
  let senha: string;
  try {
    senha = await destravarSenha(await obterSegredo(cfg.credencial, cfg.salPrf), cfg.senhaTravada);
  } catch (e) {
    if (e instanceof ErroDigital) throw e;
    throw new ErroDigital(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Cancelado.' : 'Não foi possível usar a digital. Digite a senha mestra.');
  }
  const r = await destrancar(senha, Date.now(), true);
  if (!r.ok) {
    // A senha guardada não abre mais o cofre (ex.: trocada em outro aparelho): desliga a digital
    await desativarDigital();
    throw new ErroDigital('A senha mestra mudou. Digite a senha nova e ative a digital de novo em Ajustes.');
  }
  return r;
}
