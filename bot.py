import os
import requests
from dotenv import load_dotenv
from telegram import Update, ForceReply
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    ContextTypes, filters, ConversationHandler,
    PicklePersistence
)
from player import save_player, load_player, get_inventory_text, get_full_status_text, interpretar_e_atualizar_estado
from storage import reset_history

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
API_URL = "http://localhost:8000/chat"

ASK_NAME, ASK_CLASS, ASK_THEME, ASK_MODE, GAME = range(5)

# /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    existing_player = load_player(user_id)
    if existing_player:
        await update.message.reply_text(
            "Seu personagem já foi criado. Envie /continuar para continuar sua aventura, ou /resetar para reiniciar."
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "Bem vindo ao Infinity AI - RPG! Qual será o nome do seu personagem?", reply_markup=ForceReply()
    )
    return ASK_NAME

# /continuar
async def continuar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    existing_player = load_player(user_id)

    if existing_player:
        context.user_data["nome"] = existing_player.get("nome")

        # CORREÇÃO: Define explicitamente o estado da conversa persistente
        if "rpg_conversation" not in context._conversation_data:
            context._conversation_data["rpg_conversation"] = {}
        context._conversation_data["rpg_conversation"][chat_id] = GAME

        await update.message.reply_text(
            f"Bem-vindo de volta, {existing_player['nome']}!\n"
            f"Envie qualquer mensagem para continuar sua aventura."
        )
        return GAME
    else:
        await update.message.reply_text(
            "Nenhum personagem encontrado. Envie /start para criar um novo personagem."
        )
        return ConversationHandler.END


# /resetar
async def resetar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    # Apaga dados do jogador salvo
    reset_history(user_id)
    save_player(user_id, {})
    return "Histórico e personagem resetados. Vamos começar uma nova aventura!"

    # Limpa user_data e estado de conversa específico
    context.user_data.clear()

    if "rpg_conversation" in context._conversation_data:
        context._conversation_data["rpg_conversation"].pop(chat_id, None)

    await update.message.reply_text("Seu progresso foi resetado. Envie /start para começar novamente.")
    return ConversationHandler.END

# Etapas de criação
async def ask_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["nome"] = update.message.text.strip()
    await update.message.reply_text("Agora, qual será a classe do seu personagem?", reply_markup=ForceReply())
    return ASK_CLASS

async def ask_class(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["classe"] = update.message.text.strip()
    await update.message.reply_text("Qual será o tema do RPG?", reply_markup=ForceReply())
    return ASK_THEME

async def ask_theme(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["tema"] = update.message.text.strip()
    await update.message.reply_text("Por fim, o modo será 'Rolagem de dados' ou 'Narrativo'?", reply_markup=ForceReply())
    return ASK_MODE

async def ask_mode(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    context.user_data["modo"] = update.message.text.strip()

    player = {
        "nome": context.user_data["nome"],
        "classe": context.user_data["classe"].capitalize(),
        "tema": context.user_data["tema"],
        "modo": context.user_data["modo"].lower(),
        "nivel": 0,
        "experiencia": 0,
        "inventario": {
            "ouro": 0,
            "vida_atual": 10,
            "vida_maxima": 10,
            "itens": [],
        },
    }

    save_player(user_id, player)

    await update.message.reply_text(
        f"✅ Personagem {player['nome']} ({player['classe']}) criado!\n"
        f"Tema: {player['tema']}\nModo: {player['modo'].capitalize()}\n"
        "Envie qualquer mensagem para começar sua aventura!\n"
        "Use !comandos para ver todos os comandos disponíveis."
    )
    return GAME

# Durante o jogo
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_message = update.message.text.strip()
    player = load_player(user_id)

    if not player:
        await update.message.reply_text(
            "Você ainda não criou um personagem. Envie /start para começar ou /continuar se já criou."
        )
        return
    
    if user_message.lower() in ("!status", "/status"):
        status_text = get_full_status_text(user_id)
        await update.message.reply_text(status_text)
        return

    if user_message.lower() in ("!resetar", "/resetar"):
        await resetar(update, context)
        await update.message.reply_text(
            "Seu progresso foi resetado. Qual será o nome do seu novo personagem?."
        )
        return ASK_NAME

    if user_message.lower() in ("!comandos", "/comandos"):
        await update.message.reply_text("Comandos disponíveis:\n!resetar\n!inventario\n!comandos")
        return

    if user_message.lower() in ("!inventario", "/inventario"):
        texto = get_inventory_text(user_id)
        await update.message.reply_text(f"👜 Seu inventário:\n{texto}")
        return

    try:
        response = requests.post(API_URL, json={"message": user_message, "user_id": user_id})
        if response.ok:
            reply = response.json()["response"]
            
            # Envia a resposta normal da API
            await update.message.reply_text(reply)

            # Atualiza estado e captura mensagem de level-up
            msg_levelup = interpretar_e_atualizar_estado(reply, user_id)
            if msg_levelup:
                await update.message.reply_text(msg_levelup)
                
        else:
            await update.message.reply_text(f"Erro na API: {response.text}")
    except Exception as e:
        await update.message.reply_text(f"Erro: {str(e)}")


# Mensagens fora do fluxo
async def fallback_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    player = load_player(user_id)

    if player:
        await update.message.reply_text(
            "Devido a uma ATUALIZAÇÃO/MANUTENÇÃO do nosso sistema, será necessário enviar /continuar para continuar sua aventura, ou /resetar para reiniciar seu personagem."
        )
    else:
        await update.message.reply_text(
            "Bem Vindo ao Infinity AI - RPG! Para começar sua aventura, envie o comando /start."
        )

# MAIN
def main():
    # Ativa persistência em disco
    persistence = PicklePersistence(filepath="bot_data.pkl")

    # Inicializa o app com persistência
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).persistence(persistence).build()

    # Conversa principal com persistência
    conv_handler = ConversationHandler(
        name="rpg_conversation",
        persistent=True,
        entry_points=[CommandHandler("start", start)],
        states={
            ASK_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_name)],
            ASK_CLASS: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_class)],
            ASK_THEME: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_theme)],
            ASK_MODE: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_mode)],
            GAME: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message),
                CommandHandler("resetar", resetar),
                CommandHandler("continuar", continuar),
            ],
        },
        fallbacks=[
            CommandHandler("continuar", continuar),
            CommandHandler("resetar", resetar),
        ],
        allow_reentry=True,
    )

    # Handlers adicionados globalmente (garantem funcionamento fora do fluxo)
    app.add_handler(conv_handler)
    app.add_handler(CommandHandler("continuar", continuar))
    app.add_handler(CommandHandler("resetar", resetar))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, fallback_message))

    print("🤖 Bot do Telegram iniciado com persistência!")
    app.run_polling()

if __name__ == "__main__":
    main()
