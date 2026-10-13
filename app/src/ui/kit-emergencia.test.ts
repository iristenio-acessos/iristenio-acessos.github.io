import { describe, expect, it } from 'vitest';
import { htmlKit } from './kit-emergencia';

describe('kit de emergência', () => {
  it('tem o endereço, a planilha e o passo a passo; escapa o texto', () => {
    const html = htmlKit({ endereco: 'https://iristenio-acessos.github.io/', planilha: 'https://docs.google.com/x?a=1&b=<2>', hoje: new Date(2026, 9, 13) });
    expect(html).toContain('https://iristenio-acessos.github.io/');
    expect(html).toContain('a=1&amp;b=&lt;2&gt;');
    expect(html).toContain('Já tenho um cofre em outro aparelho');
    expect(html).toContain('Nunca escreva a senha');
    expect(html).toContain('13 de outubro de 2026');
  });
});
