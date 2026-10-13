// Janela do gerador de senha (RN07).
import { useState } from 'preact/hooks';
import { descreverForca, forcaBits, gerarSenha, OPCOES_PADRAO, TAMANHO_MAX, TAMANHO_MIN, type OpcoesSenha } from '../../dominio/gerador';
import { Janela } from './Janela';
import { BotaoCopiar } from './BotaoCopiar';
import { IconeDado } from '../icones';

const CONJUNTOS: { chave: Exclude<keyof OpcoesSenha, 'tamanho'>; rotulo: string }[] = [
  { chave: 'maiusculas', rotulo: 'ABC' },
  { chave: 'minusculas', rotulo: 'abc' },
  { chave: 'numeros', rotulo: '123' },
  { chave: 'simbolos', rotulo: '!@#' },
];

interface Props {
  /** Já existe uma senha no campo? (mostra o lembrete de trocar no site também) */
  substituindo: boolean;
  aoUsar: (senha: string) => void;
  aoFechar: () => void;
}

export function GeradorSenha({ substituindo, aoUsar, aoFechar }: Props) {
  // Sempre começa no padrão forte (uma senha numérica de banco não vira o padrão das próximas)
  const [opcoes, setOpcoes] = useState(OPCOES_PADRAO);
  const [senha, setSenha] = useState(() => gerarSenha(OPCOES_PADRAO));
  const forca = descreverForca(forcaBits(opcoes));
  const soNumeros = opcoes.numeros && !opcoes.maiusculas && !opcoes.minusculas && !opcoes.simbolos;

  function mudar(parcial: Partial<OpcoesSenha>) {
    const novas = { ...opcoes, ...parcial };
    // Pelo menos um tipo de caractere ligado
    if (!novas.maiusculas && !novas.minusculas && !novas.numeros && !novas.simbolos) return;
    setOpcoes(novas);
    setSenha(gerarSenha(novas));
  }

  return (
    <Janela titulo="Gerar senha" aoFechar={aoFechar}>
      <div class="formulario gerador">
        <div class="senha-gerada">
          <output aria-live="polite">{senha}</output>
          <button type="button" class="botao-icone" onClick={() => setSenha(gerarSenha(opcoes))} aria-label="Gerar outra" title="Gerar outra">
            <IconeDado />
          </button>
          <BotaoCopiar valor={senha} descricao="Copiar senha gerada" secreto />
        </div>
        <p class={`forca ${forca.nivel}`}>
          Força: {forca.rotulo}
          {soNumeros && <small> · só números: use quando o banco ou o cartão exigir</small>}
        </p>

        <label class="rotulo-campo">
          <span>Tamanho: {opcoes.tamanho} caracteres</span>
          <input
            class="tamanho"
            type="range"
            min={TAMANHO_MIN}
            max={TAMANHO_MAX}
            value={opcoes.tamanho}
            onInput={(e) => mudar({ tamanho: Number(e.currentTarget.value) })}
          />
        </label>
        <div class="chips" role="group" aria-label="Tipos de caractere">
          {CONJUNTOS.map((c) => (
            <button key={c.chave} type="button" class="chip" aria-pressed={opcoes[c.chave]} onClick={() => mudar({ [c.chave]: !opcoes[c.chave] })}>
              {c.rotulo}
            </button>
          ))}
        </div>

        {substituindo && (
          <p class="alerta">A senha atual será substituída. Lembre-se de trocar a senha também no site ou aplicativo.</p>
        )}
        <div class="dialogo-opcoes">
          <button type="button" class="botao fantasma" onClick={aoFechar}>Cancelar</button>
          <button
            type="button"
            class="botao primario"
            onClick={() => {
              aoUsar(senha);
              aoFechar();
            }}
          >
            Usar esta senha
          </button>
        </div>
      </div>
    </Janela>
  );
}
