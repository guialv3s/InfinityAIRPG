import os
from dotenv import load_dotenv
from telegram import Update, ForceReply
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
    ConversationHandler,
)
from main import process_message, save_player, load_player, reset_history, get_inventory_text

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

ASK_NAME, ASK_CLASS, ASK_THEME, ASK_MODE, GAME = range(5)

# /start inicia cadastro
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Olá! Vamos criar seu personagem. Qual será o nome dele?", reply_markup=ForceReply()
    )
    return ASK_NAME

async def ask_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.message.text.strip()
    context.user_data["nome"] = name
    await update.message.reply_text(
        f"Nome definido como {name}. Agora, diga qual será a classe do personagem.",
        reply_markup=ForceReply(),
    )
    return ASK_CLASS

async def ask_class(update: Update, context: ContextTypes.DEFAULT_TYPE):
    classe = update.message.text.strip()
    context.user_data["classe"] = classe.capitalize()
    await update.message.reply_text(
        "Agora, qual será o tema do RPG? (ex: Apocalipse zumbi, Fantasia medieval, etc)",
        reply_markup=ForceReply(),
    )
    return ASK_THEME

async def ask_theme(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tema = update.message.text.strip()
    context.user_data["tema"] = tema
    await update.message.reply_text(
        "Qual será o modo de jogo? Responda com 'Rolagem' para rolagem de dados ou 'Narrativa' para modo narrativo.",
        reply_markup=ForceReply(),
    )
    return ASK_MODE

async def ask_mode(update: Update, context: ContextTypes.DEFAULT_TYPE):
    modo = update.message.text.strip().lower()
    if modo not in ["rolagem", "narrativa"]:
        await update.message.reply_text(
            "Modo inválido. Por favor, responda com 'Rolagem' ou 'Narrativa'.",
            reply_markup=ForceReply(),
        )
        return ASK_MODE

    nome = context.user_data.get("nome")
    classe = context.user_data.get("classe")
    tema = context.user_data.get("tema")
    modo_jogo = modo.capitalize()

    player = {
        "nome": nome,
        "classe": classe,
        "tema": tema,
        "modo_jogo": modo_jogo,
        "nivel": 0,
        "experiencia": 0,
        "inventario": {
            "ouro": 0,
            "vida_atual": 10,
            "vida_maxima": 10,
            "itens": [],
        },
    }

    save_player(player)
    await update.message.reply_text(
        f"✅ Personagem {nome} criado!\nClasse: {classe}\nTema: {tema}\nModo de jogo: {modo_jogo}\n\nEnvie uma mensagem para começar sua aventura."
    )
    return GAME

# Manipulador de mensagens no estado de jogo
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_message = update.message.text.strip()
    player = load_player()

    # Se personagem NÃO existe, avise para mandar /start
    if not player:
        await update.message.reply_text(
            "Bem vindo ao Infinity AI - RPG!, por favor envie o comando /start para criar seu personagem."
        )
        return

    # Se mensagem é o comando resetar, execute reset e force nova criação
    if user_message.lower() == "!resetar":
        reset_history()
        save_player({})
        context.user_data.clear()  # Limpa dados da conversa para reiniciar fluxo

        await update.message.reply_text(
            "Histórico e personagem resetados. Vamos começar uma nova aventura!"
        )
        await update.message.reply_text(
            "Por favor, diga o nome do seu personagem.", reply_markup=ForceReply()
        )
        return ASK_NAME

    try:
        # Comando para mostrar inventário
        if user_message.lower() == "/inventario":
            texto = get_inventory_text()
            await update.message.reply_text(f"👜 Seu inventário:\n{texto}")
            return

        reply = process_message(user_message)
        await update.message.reply_text(reply)
    except Exception as e:
        await update.message.reply_text(f"Erro: {str(e)}")

# Handler para mensagens fora de contexto ou estados
async def unknown_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    player = load_player()
    if not player:
        await update.message.reply_text(
            "Bem vindo ao Infinity AI - RPG!, por favor envie o comando /start para criar seu personagem."
        )
    else:
        # Caso queira, pode responder algo padrão aqui ou ignorar
        await update.message.reply_text(
            "Bem vindo ao Infinity AI - RPG!, por favor envie o comando /start para criar seu personagem."
        )

def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            ASK_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_name)],
            ASK_CLASS: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_class)],
            ASK_THEME: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_theme)],
            ASK_MODE: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_mode)],
            GAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)],
        },
        fallbacks=[],
        allow_reentry=True,
    )

    app.add_handler(conv_handler)
    app.add_handler(CommandHandler("inventario", handle_message))

    # Handler para mensagens fora do ConversationHandler (fora do fluxo)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, unknown_message))

    print("🤖 Bot do Telegram iniciado!")
    app.run_polling()

if __name__ == "__main__":
    main()
