# Infinity AI RPG - Telegram Bot

Este projeto consiste em uma API Backend e um Bot do Telegram clientes.

## Instalação

1. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure o arquivo `.env`:
   ```env
   OPENAI_API_KEY=sk-...
   TELEGRAM_TOKEN=123456:ABC-DEF...
   ```

## Como Rodar

Para que o bot funcione, **você precisa rodar DOIS terminais simultaneamente**:

### Terminal 1 - API Backend
Este serviço processa a lógica do RPG e mantém o estado do jogador.
```bash
python main.py
```
*Aguarde aparecer "Uvicorn running on http://0.0.0.0:8000"*

### Terminal 2 - Telegram Bot
Este serviço conecta ao Telegram e conversa com a API.
```bash
python bot.py
```

## Comandos do Bot
- `/start` - Inicia ou reinicia a criação de personagem.
- `/continuar` - Retoma o jogo se você já tem um personagem.
- `/resetar` - Apaga todo o progresso e começa do zero.
- `/status` (ou `!status`) - Mostra ficha completa.
- `/inventario` (ou `!inventario`) - Mostra itens.
