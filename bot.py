import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
from main import process_message  # Importa a lógica centralizada do main.py

# Carrega variáveis de ambiente
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

# Início do chat
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Olá! Sou um Mestre de Jogo de RPG. Envie uma mensagem para começar.")

# Processa mensagens via Telegram
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_message = update.message.text.strip()
    try:
        reply = process_message(user_message)
        await update.message.reply_text(reply)
    except Exception as e:
        await update.message.reply_text(f"Erro: {str(e)}")

# Executa o bot
def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("🤖 Bot do Telegram iniciado!")
    app.run_polling()

if __name__ == "__main__":
    main()
