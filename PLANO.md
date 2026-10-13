# Meus Acessos — Plano em etapas

Cada etapa termina com algo **usável no aparelho**. Primeiro o app funcionando offline; a planilha do
Google entra depois.

## Etapa 1 — Cofre básico (só no aparelho)
- `dominio/cripto.ts`: gerar sal, derivar a chave (PBKDF2), criptografar e abrir (AES-GCM), com
  verificador + **testes** (senha certa abre; senha errada falha; dado alterado é recusado).
- Entidades `cofre` e `itens` (no lugar do "itens" de exemplo da base).
- Telas: **Criar senha mestra** → **Trancado** → **Itens**.
- Criar/editar/excluir item do tipo **Login** (campos fixos: usuário, senha, site, observações).
- Botões **Copiar** + limpeza da área de transferência em 30 s; olho para mostrar.
- Trancar automaticamente (3 min) e botão Trancar agora.
- **Resultado:** você já guarda e copia senhas no PC/celular (ainda sem sincronizar).

## Etapa 2 — Campos livres, tipos e categorias
- Todos os tipos (Cartão, Wi-Fi, Documento, Veículo, Anotação) com campos iniciais.
- **+ Adicionar campo**, marcar como secreto, renomear, reordenar, remover (caso da Caixa).
- Categorias padrão + criar novas; filtro por categoria; favoritos; busca.
- Gerador de senha.
- Ajuste do tempo para trancar.
- **Resultado:** o cofre completo num aparelho.

## Etapa 3 — Publicar e instalar
- Criar a organização e o repositório no GitHub (você faz no navegador, com as instruções).
- Publicar e **instalar no celular, tablet e PC**.
- **Resultado:** o app instalado nos aparelhos (cada um com dados separados por enquanto).

## Etapa 4 — Sincronização com a planilha do Google
- Backend (Apps Script) com as abas ITENS e COFRE, guardando só os dados criptografados.
- Fluxo de "novo aparelho": conectar a planilha → baixar o cofre → pedir a senha mestra.
- **Resultado:** os mesmos dados no celular, tablet e PC; perder o celular não perde nada.

## Etapa 5 — Migração e segurança extra
- **Importar** da planilha antiga (logins + aba de veículo), com prévia.
- Exportar backup criptografado.
- Trocar a senha mestra.
- Kit de emergência para imprimir.
- Bloqueio progressivo após erros.
- **Resultado:** tudo migrado; planilha antiga apagada.

## Fase 2 (depois)
- Desbloqueio por digital/rosto no celular.
