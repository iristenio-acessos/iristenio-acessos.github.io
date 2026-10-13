// Kit de emergência (RN12): página para imprimir e guardar em casa. NÃO contém senhas.
import { APP } from '../app.config';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function htmlKit(dados: { endereco: string; planilha: string | null; hoje: Date }): string {
  const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dados.hoje);
  return `
  <h1>${esc(APP.nome)} — Kit de emergência</h1>
  <p class="kit-sub">Impresso em ${esc(data)}. Guarde esta folha num lugar seguro, em casa. <strong>Ela não contém nenhuma senha.</strong></p>

  <h2>Onde estão os seus dados</h2>
  <ul>
    <li><strong>App:</strong> ${esc(dados.endereco)}</li>
    <li><strong>Backup na nuvem:</strong> planilha <em>“${esc(APP.nome)} - dados”</em> no Google Drive da sua conta pessoal${
      dados.planilha ? ` (${esc(dados.planilha)})` : ''
    }. Ela guarda só dados criptografados.</li>
    <li><strong>Servidor:</strong> script <em>“${esc(APP.nome)} API”</em> em script.google.com, na mesma conta.</li>
  </ul>

  <h2>Perdi ou troquei o aparelho</h2>
  <ol>
    <li>No aparelho novo, abra o endereço do app e instale (menu ⋮ → Instalar app).</li>
    <li>Na primeira tela, toque em <strong>“Já tenho um cofre em outro aparelho”</strong>.</li>
    <li>Pegue o código de conexão: em script.google.com abra <em>“${esc(APP.nome)} API”</em>, escolha a função
      <strong>configurar</strong> e clique em <strong>Executar</strong>. Copie a linha que começa com <strong>APP1:</strong>.</li>
    <li>Cole o código no app, toque em <strong>Conectar</strong> e digite a sua senha mestra.</li>
    <li>Se achar que alguém pegou o aparelho perdido, execute também <strong>trocarToken</strong> no script
      (os outros aparelhos precisarão do código novo) e troque a senha mestra em Ajustes.</li>
  </ol>

  <h2>Sem internet ou sem a planilha</h2>
  <p>Use o arquivo de backup (<em>meus-acessos-backup-AAAA-MM-DD.json</em>): na primeira tela do app, toque em
  <strong>“Restaurar de um arquivo de backup”</strong>. Ele abre com a senha mestra que valia quando foi feito.</p>

  <h2>Dica da senha mestra</h2>
  <p class="kit-sub">Escreva à mão uma dica que só você entenda. <strong>Nunca escreva a senha.</strong></p>
  <div class="kit-linhas"><span></span><span></span><span></span></div>

  <p class="kit-alerta">Se a senha mestra for esquecida, ninguém consegue recuperar o cofre — nem o Google, nem quem fez o app.</p>`;
}

/** Monta a página na tela só para a impressão e abre a janela de imprimir do sistema. */
export function imprimirKit(planilha: string | null) {
  const div = document.createElement('div');
  div.className = 'kit-impressao';
  div.innerHTML = htmlKit({ endereco: location.origin + location.pathname.replace(/index\.html$/, ''), planilha, hoje: new Date() });
  document.body.appendChild(div);
  document.documentElement.classList.add('imprimindo');
  const limpar = () => {
    document.documentElement.classList.remove('imprimindo');
    div.remove();
  };
  window.addEventListener('afterprint', limpar, { once: true });
  setTimeout(() => window.print(), 50);
}
