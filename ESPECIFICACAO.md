# Meus Acessos — Especificação

Cofre pessoal de senhas, acessos e informações importantes (cartões, Wi-Fi, documentos, veículos).
Funciona no **celular, tablet e PC**, sem internet, e sincroniza com uma planilha da conta Google
**pessoal**, que guarda **somente dados criptografados**.

Objetivo principal: achar uma informação em segundos e **copiar com um toque**, sem deixar nada
exposto se o aparelho for perdido ou se alguém abrir a planilha.

---

## 1. Como a segurança funciona

```
Senha mestra (só na sua cabeça)
      │  PBKDF2-SHA256, 600.000 rodadas + "sal" aleatório
      ▼
Chave do cofre (só na memória, enquanto o app está aberto e destrancado)
      │  AES-256-GCM
      ▼
Itens criptografados ──► IndexedDB do aparelho ──► Planilha do Google
(ninguém lê sem a senha mestra: nem o Google, nem quem pegar o aparelho)
```

- A **senha mestra nunca é gravada** em lugar nenhum: nem no aparelho, nem na planilha.
- **Tudo** do item é criptografado (nome, tipo, categoria e campos). Na planilha aparecem só o `id`,
  as datas, o status e um bloco ilegível.
- A criptografia usa o próprio navegador (Web Crypto), sem bibliotecas de terceiros.
- Ao trancar o app, a chave e os dados abertos são apagados da memória.

## 2. Como os dados são organizados

### Ideia central: item com campos livres
Cada **item** tem um nome, um tipo, uma categoria e uma **lista de campos**. Cada campo tem
**rótulo**, **valor** e a marcação **secreto** (fica escondido com ••••). **Todo campo tem um botão
Copiar.** Qualquer item pode ganhar campos a mais com **+ Adicionar campo**.

Exemplo (o caso da Caixa):
```
Caixa Econômica           [Bancos]  ★
  Usuário ............ 123.456.789-00     [Copiar]
  Senha de acesso .... ••••••••      [👁] [Copiar]
  Senha de transação . ••••••        [👁] [Copiar]
  Senha do cartão .... ••••          [👁] [Copiar]
  Site / app ......... caixa.gov.br       [Abrir]
  Observações ........ ...
```

### Tipos (cada tipo só define os campos iniciais e o ícone)
| Tipo | Campos iniciais (secretos marcados com 🔒) |
|---|---|
| **Login** | Usuário · Senha 🔒 · Site / app |
| **Cartão** | Número 🔒 · Nome impresso · Validade · CVV 🔒 · Senha 🔒 |
| **Wi-Fi** | Nome da rede · Senha 🔒 |
| **Documento** | Número · Órgão emissor · Emissão · Validade |
| **Veículo** | Placa · Modelo · Ano · Cor · Chassi · Renavam |
| **Anotação** | (só observações) |

Todos os tipos têm **Observações**. Os campos iniciais podem ser renomeados ou removidos.

### Categorias
Padrão: Bancos · E-mail · Redes sociais · Trabalho · Compras · Governo · Streaming · Veículos ·
Documentos · Outros. **Você pode criar categorias novas** (ao escolher a categoria, opção
"+ Nova categoria"), além de renomear ou ocultar as existentes em Ajustes.

### O que vai para a planilha
| Aba | Campos visíveis | Criptografado |
|---|---|---|
| ITENS | id, status, criado_em, atualizado_em | `cifrado`: nome, tipo, categoria, favorito, campos, observações |
| COFRE | id, criado_em, atualizado_em | `sal`, `rodadas` e `verificador` (não são secretos, mas só servem com a senha) + `cifrado`: lista de categorias personalizadas |

## 3. Regras de negócio

1. **Primeiro uso:** se não houver cofre (nem local nem na planilha), o app pede para criar a senha
   mestra (mínimo de 12 caracteres, digitada duas vezes) e mostra o **aviso de que ela não pode ser
   recuperada**.
2. **Novo aparelho:** depois de conectar a planilha, o app baixa o cofre e pede a senha mestra
   existente. Não cria um cofre novo.
3. **Destrancar:** com a senha mestra certa, o app abre. Depois de 5 erros seguidos, ele espera
   30 segundos antes de deixar tentar de novo, e o tempo dobra a cada novo erro.
4. **Trancar automaticamente:** depois de **3 minutos sem uso** (ajustável em Ajustes: 1, 3, 5,
   10 ou 15 min) e sempre que o app fica mais de 1 minuto em segundo plano. Há também o botão
   **Trancar agora**.
5. **Copiar:** cada campo tem um botão Copiar. A área de transferência é **limpa depois de
   30 segundos** (quando o navegador permitir).
6. **Campos secretos** aparecem escondidos (••••); o ícone de olho mostra o valor por 10 segundos.
7. **Gerador de senha** em qualquer campo secreto: tamanho (padrão 16), com letras, números e
   símbolos.
8. **Busca** instantânea por nome, categoria e valores dos campos **não secretos** (feita na
   memória, depois de destrancar).
9. **Lista:** cada linha mostra o nome, a categoria e **atalhos para copiar os dois primeiros
   campos** (ex.: Usuário e Senha). Os demais ficam no detalhe.
10. **Excluir:** exclusão lógica, com **Desfazer**.
11. **Trocar a senha mestra:** recriptografa todos os itens e sincroniza. Os outros aparelhos passam
    a pedir a senha nova.
12. **Kit de emergência:** página para imprimir com o passo a passo de recuperação num aparelho
    novo e um espaço para você anotar à mão uma dica da senha mestra.
13. **Exportar backup:** um arquivo criptografado (só abre com a senha mestra).

## 4. Telas

- **Trancado:** campo da senha mestra + Destrancar (no PC, Enter destranca).
- **Itens (tela inicial):** busca no topo, filtro por categoria (chips), favoritos primeiro. No
  tablet/PC, o detalhe abre no painel lateral; no celular, em tela cheia.
- **Painel do item:** ver/copiar campos; editar: tipo, nome, categoria, favorito, campos (adicionar,
  renomear, marcar secreto, reordenar, remover), observações, excluir.
- **Botão "+":** escolher o tipo (Login, Cartão, Wi-Fi, Documento, Veículo, Anotação).
- **Ajustes:** sincronização (base), tempo para trancar, categorias, trocar a senha mestra, importar,
  exportar backup, kit de emergência, tema.

## 5. Decisões tomadas

- Digital/rosto para destrancar: **fica para uma segunda fase**.
- Categorias padrão aprovadas, **com possibilidade de criar outras**.
- Trancar em **3 minutos**, ajustável.
- Guardar **tudo** (logins, cartões, Wi-Fi, documentos, veículos, anotações) com **campos livres**.
- **Sem importação** da planilha antiga: os itens serão cadastrados à mão, um a um. Depois de tudo
  cadastrado, apagar a planilha antiga (inclusive da lixeira do Drive).

## 6. Limites (sendo honesto)

- **Esqueceu a senha mestra = perdeu o cofre.** Não existe "esqueci minha senha".
- O app protege contra celular perdido e contra quem abrir a planilha. Ele **não protege** contra
  um aparelho com vírus enquanto o cofre está destrancado; nesse caso, nenhum cofre protege.
- Ferramentas como o Bitwarden passam por auditoria profissional, e este app não passa. O ganho
  aqui é a simplicidade, e ele é muito mais seguro que a planilha atual.
