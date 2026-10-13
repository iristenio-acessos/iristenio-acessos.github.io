# Meus Acessos — Plano em etapas

Cada etapa termina com algo **usável no aparelho**. Primeiro o app funcionando offline; a planilha do
Google entra depois.

## Etapa 1 — Cofre básico (só no aparelho) ✅ concluída
- `dominio/cripto.ts`: gerar sal, derivar a chave (PBKDF2), criptografar e abrir (AES-GCM), com
  verificador + **testes** (senha certa abre; senha errada falha; dado alterado é recusado).
- Entidades `cofre` e `itens` (no lugar do "itens" de exemplo da base).
- Telas: **Criar senha mestra** → **Trancado** → **Itens**.
- Criar/editar/excluir itens (todos os tipos, com os campos iniciais de cada um).
- Botões **Copiar** + limpeza da área de transferência em 30 s; olho para mostrar.
- Trancar automaticamente (3 min) e botão Trancar agora.
- Também entraram: busca, favoritos, todos os tipos de item, tempo para trancar ajustável e espera
  crescente depois de 5 senhas erradas.
- **Resultado:** você já guarda e copia senhas no PC/celular (ainda sem sincronizar).

## Etapa 2 — Campos livres, tipos e categorias
- **+ Adicionar campo**, marcar como secreto, renomear, reordenar, remover (caso da Caixa).
- Categorias padrão + criar novas; filtro por categoria. (Favoritos e busca já vieram na Etapa 1.)
- Gerador de senha.
- **Resultado:** o cofre completo num aparelho.

## Etapa 3 — Publicar e instalar
- Criar a organização e o repositório no GitHub (você faz no navegador, com as instruções).
- Publicar e **instalar no celular, tablet e PC**.
- **Resultado:** o app instalado nos aparelhos (cada um com dados separados por enquanto).

## Etapa 4 — Sincronização com a planilha do Google
- Backend (Apps Script) com as abas ITENS e COFRE, guardando só os dados criptografados.
- Fluxo de "novo aparelho": conectar a planilha → baixar o cofre → pedir a senha mestra.
- **Resultado:** os mesmos dados no celular, tablet e PC; perder o celular não perde nada.

## Etapa 5 — Segurança extra
- Exportar backup criptografado.
- Trocar a senha mestra.
- Kit de emergência para imprimir.
- **Resultado:** cofre completo. Cadastrar tudo à mão e apagar a planilha antiga.

## Fase 2 (depois)
- Desbloqueio por digital/rosto no celular.
