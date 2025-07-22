from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import uvicorn
import json
import os
import sys

#from . import models, database

# ==== Configuração inicial ====
# models.Base.metadata.create_all(bind=database.engine)
load_dotenv(dotenv_path='.env')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==== Caminhos e arquivos ====
BASE_DIR = Path(__file__).resolve().parent
HISTORY_FILE = BASE_DIR / "history.json"
CHATADMIN_FILE = BASE_DIR / "chatadmin.json"

if not HISTORY_FILE.exists():
    with open(HISTORY_FILE, "w") as f:
        json.dump([], f)

# ==== Variáveis de controle ====
admin_mode = False  # Inicia no modo RPG

# ==== Funções utilitárias ====
def load_history():
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)

def save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)

def reset_history():
    with open(HISTORY_FILE, "w") as f:
        json.dump([], f)

# ==== Função principal de processamento ====
def process_message(user_message: str) -> str:
    global admin_mode

    if not user_message.strip():
        return "Mensagem vazia."

    if user_message.lower() == "!resetar":
        reset_history()
        return "Histórico resetado com sucesso. Vamos começar uma nova aventura!"

    if user_message.lower() == "!modo_admin":
        admin_mode = True
        return "Modo ADMIN ativado. Você agora pode conversar livremente com a IA."

    if user_message.lower() == "!modo_rpg":
        admin_mode = False
        return "Modo RPG ativado novamente. Retornando ao papel de Mestre do Jogo!"

    history = load_history()

    if not admin_mode:
        if not history:
            history.append({
                "role": "system",
                "content": (
                    "Você é um Mestre de Jogo de RPG por texto. "
                    "Seja criativo, objetivo e claro. "
                    "Não fale como IA. "
                    "Descreva o mundo, ofereça escolhas, e incentive a ação do jogador. "
                    "Use emoteicons de forma controlada, porém que melhore a interpretação da história. "
                    "Ignore perguntas fora do RPG, diga que só é um mestre de jogo. "
                    "Comece perguntando o tema do RPG. "
                    "Depois, pergunte se o modo será Rolagem de dados (você rola) ou Narrativo. "
                    "Depois, me retorne uma ficha de criação de personagem com opções relacionadas ao tema. "
                    "Jogador só adquire itens/habilidades jogando, nunca direto. "
                    "Caso o jogador peça um resumo, envie um resumo de toda a história ou de momentos recentes, dependendo do que ele solicitar."
                )
            })

        history.append({"role": "user", "content": user_message})
        messages = history
    else:
        messages = [{"role": "user", "content": user_message}]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )

    assistant_message = response.choices[0].message.content

    if not admin_mode:
        history.append({"role": "assistant", "content": assistant_message})
        save_history(history)

    return assistant_message

# ==== Estrutura da requisição ====
class ChatRequest(BaseModel):
    message: str

# ==== Rota principal ====
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        resposta = process_message(request.message)
        return {"response": resposta}
    except Exception as e:
        print(f"Erro na rota /chat: {str(e)}")  # Substitui o logger
        return JSONResponse(status_code=500, content={"error": f"Erro interno: {str(e)}"})

# ==== Execução local (opcional) ====
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
