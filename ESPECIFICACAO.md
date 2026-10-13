# Meus Acessos — Especificação

Cofre pessoal de senhas e acessos. Funciona no **celular, tablet e PC**, sem internet, e sincroniza
com uma planilha da conta Google **pessoal**, que guarda **somente dados criptografados**.

Objetivo principal: achar um acesso em segundos e **copiar a senha com um toque**, sem deixar as
senhas expostas se o aparelho for perdido ou se alguém abrir a planilha.

---

## 1. Como a segurança funciona

```
Senha mestra (só na sua cabeça)
      │  PBKDF2-SHA256, 600.000 rodadas + "sal" aleatório
      ▼
Chave do cofre (só na memória, enquanto o app está aberto e destrancado)
      │  AES-256-GCM
      ▼
Acessos criptografados ──► IndexedDB do aparelho ──► Planilha do Google
(ninguém lê sem a senha mestra: nem o Google, nem quem pegar o aparelho)
```

- A **senha mestra nunca é gravada** em lugar nenhum: nem no aparelho, nem na planilha.
- **Tudo** do acesso é criptografado (nome do serviço, usuário, senha, site e observações). Na
  planilha aparecem só o `id`, as datas e um bloco ilegível.
- A criptografia usa o próprio navegador (Web Crypto), sem bibliotecas de terceiros.
- Ao trancar o app, a chave é apagada da memória.

## 2. Entidades

### Acesso (`acessos`), o que vai para a planilha
| Campo | Tipo | Observação |
|---|---|---|
| id, criado_em, atualizado_em | padrão | visíveis (necessários para sincronizar) |
| status | `ativo` / `excluido` | visível (exclusão lógica) |
| cifrado | texto | conteúdo criptografado (base64: vetor inicial + dados) |

### Conteúdo do acesso (só existe destrancado, na memória)
| Campo | Obrigatório | Exemplo |
|---|---|---|
| nome | sim | "Banco do Brasil" |
| usuario | não | "iristenio" / e-mail / CPF |
| senha | não | — |
| site | não | "bb.com.br" (abre com um toque) |
| categoria | sim | Bancos · E-mail · Redes sociais · Trabalho · Compras · Governo · Streaming · Outros |
| observacoes | não | perguntas de segurança, PIN, etc. |
| favorito | não | aparece no topo |

### Cofre (`cofre`, um único registro, sincronizado)
| Campo | Observação |
|---|---|
| sal | aleatório, criado uma vez |
| rodadas | 600000 |
| verificador | texto conhecido criptografado; serve para saber se a senha mestra digitada está certa |

## 3. Regras de negócio

1. **Primeiro uso:** se não houver cofre (nem local nem na planilha), o app pede para criar a senha
   mestra (mínimo de 12 caracteres, digitada duas vezes) e mostra o **aviso de que ela não pode ser
   recuperada**.
2. **Novo aparelho:** depois de conectar a planilha, o app baixa o cofre e pede a senha mestra
   existente. Não cria um cofre novo.
3. **Destrancar:** com a senha mestra certa, o app abre. Depois de 5 erros seguidos, ele espera
   30 segundos antes de deixar tentar de novo, e o tempo dobra a cada novo erro.
4. **Trancar automaticamente:** depois de **N minutos sem uso** (padrão: 5) e sempre que o app vai
   para segundo plano por mais de 1 minuto. Também há um botão **Trancar agora**.
5. **Copiar:** os botões copiam usuário ou senha. A área de transferência é **limpa depois de
   30 segundos** (quando o navegador permitir).
6. **Senha escondida** (••••) por padrão; o ícone de olho mostra por 10 segundos.
7. **Gerador de senha:** tamanho (padrão 16), com letras, números e símbolos.
8. **Busca** instantânea por nome, usuário e site (feita na memória, depois de destrancar).
9. **Excluir:** exclusão lógica, com **Desfazer**.
10. **Trocar a senha mestra:** recriptografa todos os acessos e sincroniza. Os outros aparelhos
    passam a pedir a senha nova.
11. **Importar da planilha antiga:** o usuário cola um CSV (Nome, Usuário, Senha, Site, Obs). Tudo
    é criptografado no aparelho, e depois o app orienta a **apagar a planilha antiga**.
12. **Kit de emergência:** página para imprimir com dicas para lembrar da senha mestra (sem
    mostrá-la) e com o passo a passo de recuperação num aparelho novo.
13. **Exportar backup:** um arquivo criptografado (só abre com a senha mestra).

## 4. Telas

- **Trancado:** campo da senha mestra + Destrancar (no PC, Enter destranca).
- **Acessos (tela inicial):** busca no topo, favoritos, lista por categoria. Cada linha mostra nome,
  usuário e os botões **[Copiar usuário] [Copiar senha]**. Um toque na linha abre o painel de
  detalhes/edição.
- **Painel do acesso:** campos, olho, gerador de senha, abrir o site, excluir.
- **Ajustes:** sincronização (base), tempo para trancar, trocar a senha mestra, importar CSV,
  exportar backup, kit de emergência, tema.

## 5. Perguntas em aberto

1. **Desbloqueio por digital/rosto** no celular: fica mais prático, mas é mais complexo e menos
   seguro. Sugestão: **deixar para depois** e começar só com a senha mestra.
2. As **categorias** acima servem? Quer acrescentar ou tirar alguma?
3. **Tempo para trancar:** 5 minutos está bom?
4. A planilha antiga tem quais **colunas**? (Não precisa mandar as senhas; só os títulos das colunas.)
5. Quer guardar também **outros tipos** de acesso (cartões, Wi-Fi, documentos) ou **só logins** por
   enquanto?

## 6. Limites (sendo honesto)

- **Esqueceu a senha mestra = perdeu o cofre.** Não existe "esqueci minha senha".
- O app protege contra celular perdido e contra quem abrir a planilha. Ele **não protege** contra
  um aparelho com vírus enquanto o cofre está destrancado; nesse caso, nenhum cofre protege.
- Ferramentas como o Bitwarden passam por auditoria profissional, e este app não passa. O ganho
  aqui é a simplicidade, e ele é muito mais seguro que a planilha atual.
