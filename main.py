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

BASE_DIR = Path(__file__).resolve().parent
(BASE_DIR / "histories").mkdir(exist_ok=True)
(BASE_DIR / "players").mkdir(exist_ok=True)

def get_history_file(user_id):
    return BASE_DIR / "histories" / f"history_{user_id}.json"

def get_player_file(user_id):
    return BASE_DIR / "players" / f"player_{user_id}.json"

def load_history(user_id):
    file = get_history_file(user_id)
    if file.exists():
        with open(file, "r") as f:
            return json.load(f)
    return []

def save_history(user_id, history):
    with open(get_history_file(user_id), "w") as f:
        json.dump(history, f, indent=4)

def reset_history(user_id):
    with open(get_history_file(user_id), "w") as f:
        json.dump([], f)

def load_player(user_id):
    file = get_player_file(user_id)
    if file.exists():
        with open(file, "r") as f:
            try:
                data = json.load(f)
                return data if data else None
            except json.JSONDecodeError:
                return None
    return None

def save_player(user_id, player_data):
    with open(get_player_file(user_id), "w") as f:
        json.dump(player_data, f, indent=4)

def get_inventory_text(user_id):
    player = load_player(user_id)
    if not player:
        return "Nenhum personagem criado."
    inventario = player.get("inventario", {})
    itens = inventario.get("itens", [])
    if not itens:
        return "Inventário vazio."
    return "\n".join([f"- {item['item']} (x{item['quantidade']})" for item in itens])

def process_message(user_message: str, user_id: int) -> str:
    if not user_message.strip():
        return "Mensagem vazia."

    if user_message.lower() == "!resetar":
        reset_history(user_id)
        save_player(user_id, {})
        return "Histórico e personagem resetados. Vamos começar uma nova aventura!"

    if user_message.lower() == "!inventario":
        return get_inventory_text(user_id)
    
    if user_message.lower() == "!comandos":
        return "Comandos disponíveis: !resetar, !inventario, !comandos"

    history = load_history(user_id)
    player = load_player(user_id)

    if not history:
        system_prompt = (
            "Você é um Mestre de Jogo de RPG por texto. Seja criativo, objetivo e claro. "
            "Não fale como IA. Descreva o mundo, ofereça escolhas, incentive a ação do jogador. "
            "Use emoteicons de forma moderada. Ignore perguntas fora do RPG. "
            "Não permita o jogador definir nível. O nível começa em 0. "
            "O jogador adquire itens e ouro jogando. "
        )
        if player:
            system_prompt += f"O tema escolhido foi '{player.get('tema')}' e o modo de jogo é '{player.get('modo')}'."

        history.append({
            "role": "system",
            "content": system_prompt
        })

    history.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=history
    )

    assistant_message = response.choices[0].message.content
    history.append({"role": "assistant", "content": assistant_message})
    save_history(user_id, history)

    return assistant_message

class ChatRequest(BaseModel):
    message: str
    user_id: int

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        resposta = process_message(request.message, request.user_id)
        return {"response": resposta}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
