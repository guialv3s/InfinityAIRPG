from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import uvicorn
import json
import os

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

# === Arquivos ===
BASE_DIR = Path(__file__).resolve().parent
HISTORY_FILE = BASE_DIR / "history.json"
PLAYER_FILE = BASE_DIR / "player.json"

# Inicializa arquivos se não existirem
for file in [HISTORY_FILE, PLAYER_FILE]:
    if not file.exists():
        with open(file, "w") as f:
            json.dump({} if "player" in str(file) else [], f)

# Variáveis de controle
admin_mode = False

# Funções para carregar/salvar histórico
def load_history():
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)

def save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)

def reset_history():
    with open(HISTORY_FILE, "w") as f:
        json.dump([], f)

# Funções para carregar/salvar player
def load_player():
    with open(PLAYER_FILE, "r") as f:
        try:
            data = json.load(f)
            if not data:
                return None
            return data
        except json.JSONDecodeError:
            return None

def save_player(player_data):
    with open(PLAYER_FILE, "w") as f:
        json.dump(player_data, f, indent=4)

# Funções para manipular inventário dentro do player
def add_item_to_inventory(item_name, quantidade=1):
    player = load_player()
    if not player:
        return False
    inventario = player.get("inventario", {
        "ouro": 0,
        "vida_atual": 10,
        "vida_maxima": 10,
        "itens": []
    })
    itens = inventario.get("itens", [])
    for item in itens:
        if item["item"] == item_name:
            item["quantidade"] += quantidade
            break
    else:
        itens.append({"item": item_name, "quantidade": quantidade})
    inventario["itens"] = itens
    player["inventario"] = inventario
    save_player(player)
    return True

def remove_item_from_inventory(item_name, quantidade=1):
    player = load_player()
    if not player:
        return False
    inventario = player.get("inventario", {
        "ouro": 0,
        "vida_atual": 10,
        "vida_maxima": 10,
        "itens": []
    })
    itens = inventario.get("itens", [])
    for item in itens:
        if item["item"] == item_name:
            item["quantidade"] -= quantidade
            if item["quantidade"] <= 0:
                itens.remove(item)
            break
    inventario["itens"] = itens
    player["inventario"] = inventario
    save_player(player)
    return True

def get_inventory_text():
    player = load_player()
    if not player:
        return "Nenhum personagem criado."
    inventario = player.get("inventario", {})
    itens = inventario.get("itens", [])
    if not itens:
        return "Inventário vazio."
    return "\n".join([f"- {item['item']} (x{item['quantidade']})" for item in itens])

# Processa mensagens
def process_message(user_message: str) -> str:
    global admin_mode

    if not user_message.strip():
        return "Mensagem vazia."

    if user_message.lower() == "!resetar":
        reset_history()
        save_player({})
        return "Histórico e personagem resetados com sucesso. Vamos começar uma nova aventura!"

    if user_message.lower() == "!modo_admin":
        admin_mode = True
        return "Modo ADMIN ativado."

    if user_message.lower() == "!modo_rpg":
        admin_mode = False
        return "Modo RPG ativado."

    if user_message.lower() == "!inventario":
        return get_inventory_text()

    if user_message.lower() == "!comandos":
        return "Comandos disponíveis: !resetar, !inventario"

    history = load_history()

    if not admin_mode:
        if not history:
            player = load_player()
            tema = player.get("tema") if player else "um tema de fantasia"
            modo_jogo = player.get("modo_jogo") if player else "Narrativo"

            system_prompt = (
                f"Você é um Mestre de Jogo de RPG por texto. O tema é: {tema}. "
                f"O modo de jogo é: {modo_jogo}. "
                "Seja criativo, objetivo e claro. Não fale como IA. "
                "Descreva o mundo, ofereça escolhas, incentive a ação do jogador. "
                "Use emoteicons de forma moderada. Ignore perguntas fora do RPG. "
                "Não permita o jogador definir nível. O nível começa em 0. "
                "O jogador adquire itens e ouro jogando. "
                "Use as mensagens para registrar progressos."
            )

            history.append({
                "role": "system",
                "content": system_prompt
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

# API do chat
class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        resposta = process_message(request.message)
        return {"response": resposta}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Executa localmente
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
