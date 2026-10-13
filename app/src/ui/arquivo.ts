// Salvar e abrir arquivos no aparelho (backup).

export function baixarArquivo(nome: string, conteudo: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Abre o seletor de arquivos e devolve o texto do arquivo escolhido (ou null se cancelou). */
export function escolherArquivo(aceitar = '.json,application/json'): Promise<string | null> {
  return new Promise((ok) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = aceitar;
    input.onchange = async () => ok(input.files?.[0] ? await input.files[0].text() : null);
    input.oncancel = () => ok(null);
    input.click();
  });
}
