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
import re

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
(BASE_DIR / "memory").mkdir(exist_ok=True)  # nova pasta para memória externa

def get_history_file(user_id):
    return BASE_DIR / "histories" / f"history_{user_id}.json"

def get_player_file(user_id):
    return BASE_DIR / "players" / f"player_{user_id}.json"

def get_memory_file(user_id):
    return BASE_DIR / "memory" / f"memory_{user_id}.json"

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

def delete_memory_file(user_id):
    file = get_memory_file(user_id)
    if file.exists():
        file.unlink()

def save_memory(user_id, summary):
    with open(get_memory_file(user_id), "w") as f:
        json.dump({"resumo": summary}, f, indent=4)

def load_memory(user_id):
    file = get_memory_file(user_id)
    if file.exists():
        with open(file, "r") as f:
            try:
                data = json.load(f)
                return data.get("resumo", "")
            except:
                return ""
    return ""

def get_inventory_text(user_id):
    player = load_player(user_id)
    if not player:
        return "Nenhum personagem criado."
    inventario = player.get("inventario", {})
    itens = inventario.get("itens", [])
    ouro = inventario.get("ouro", 0)
    vida_atual = inventario.get("vida_atual", 10)
    vida_maxima = inventario.get("vida_maxima", 10)

    resposta = f"Vida: {vida_atual}/{vida_maxima}\nOuro: {ouro}\nItens:"
    if not itens:
        resposta += "\n- Inventário vazio."
    else:
        for item in itens:
            resposta += f"\n- {item['item']} (x{item['quantidade']})"
    return resposta

def interpretar_e_atualizar_estado(resposta, user_id):
    player = load_player(user_id) or {
        "vida": 10,
        "vida_maxima": 10,
        "ouro": 0,
        "inventario": {"itens": [], "vida_atual": 10, "vida_maxima": 10, "ouro": 0}
    }

    json_matches = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", resposta, re.DOTALL)

    if json_matches:
        json_text = json_matches[0]
        try:
            data = json.loads(json_text)

            inventario = player.setdefault("inventario", {})
            if "vida" in data:
                inventario["vida_atual"] = data["vida"]
                inventario["vida_maxima"] = data.get("vida_maxima", data["vida"])
            elif "vida_maxima" in data:
                inventario["vida_maxima"] = data["vida_maxima"]
                inventario.setdefault("vida_atual", inventario["vida_maxima"])

            if "ouro" in data:
                inventario["ouro"] = data["ouro"]

            if "itens" in data:
                inventario["itens"] = data["itens"]

            player["inventario"] = inventario
            save_player(user_id, player)
            return
        except json.JSONDecodeError:
            print("Erro ao decodificar JSON do assistente:", json_text)

    inventario = player.setdefault("inventario", {})
    inventario.setdefault("vida_atual", 10)
    inventario.setdefault("vida_maxima", 10)
    inventario.setdefault("ouro", 0)
    inventario.setdefault("itens", [])

    texto_minusculo = resposta.lower()

    if "perdeu" in texto_minusculo and "vida" in texto_minusculo:
        inventario["vida_atual"] = max(inventario["vida_atual"] - 1, 0)
    elif "se curou" in texto_minusculo or "recuperou" in texto_minusculo:
        inventario["vida_atual"] = min(inventario["vida_atual"] + 1, inventario["vida_maxima"])

    if "ganhou" in texto_minusculo and "ouro" in texto_minusculo:
        inventario["ouro"] += 10
    elif "perdeu" in texto_minusculo and "ouro" in texto_minusculo:
        inventario["ouro"] = max(inventario["ouro"] - 10, 0)

    if "você recebeu" in texto_minusculo:
        inventario["itens"].append({"item": "Item Misterioso", "quantidade": 1})
    elif "usou" in texto_minusculo and "item" in texto_minusculo:
        itens = inventario["itens"]
        if itens:
            itens[0]["quantidade"] -= 1
            if itens[0]["quantidade"] <= 0:
                itens.pop(0)

    player["inventario"] = inventario
    save_player(user_id, player)

def process_message(user_message: str, user_id: int) -> str:
    if not user_message.strip():
        return "Mensagem vazia."

    if user_message.lower() == "!resetar":
        reset_history(user_id)
        save_player(user_id, {})
        save_memory(user_id, "")
        delete_memory_file(user_id)
        return "Histórico, personagem e memória resetados. Vamos começar uma nova aventura!"

    if user_message.lower() == "!inventario":
        return get_inventory_text(user_id)

    if user_message.lower() == "!comandos":
        return "Comandos disponíveis: !resetar, !inventario, !comandos"

    history = load_history(user_id)
    player = load_player(user_id)

    if not history:
        resumo_memoria = load_memory(user_id)
        system_prompt = (
            "Você é um narrador de RPG por texto (estilo Dungeon Master). Sua missão é iniciar uma aventura "
            "imersiva baseada no tema escolhido pelo jogador (ex: zumbi, fantasia, futurista, etc).\n\n"
            "Na sua primeira resposta:\n"
            "- Apresente o mundo de forma envolvente e resumida.\n"
            "- Apresente o jogador em um local interessante e ofereça uma escolha inicial.\n"
            "- Defina os atributos iniciais de forma **temática e aleatória**, incluindo: vida, vida máxima, ouro e itens iniciais coerentes com o tema.\n"
            "- Sempre finalize sua resposta com um bloco de código JSON **neste formato exato**, SEM COMENTÁRIOS:\n"
            "```json\n"
            "{\"vida\": 10, \"vida_maxima\": 10, \"ouro\": 30, \"itens\": [{\"item\": \"Arco Curto\", \"quantidade\": 1}, {\"item\": \"Poção\", \"quantidade\": 2}]}\n"
            "```\n"
            "O conteúdo do JSON deve refletir o cenário escolhido. Ex: Se for um mundo zumbi, inclua itens como 'kit médico', 'lanterna', 'arma improvisada'. Se for fantasia, use 'espada', 'poção de mana', etc.\n"
            "- Sempre que o jogador adquirir, perder ou usar itens, atualize o inventário ao final da resposta com um novo bloco de código JSON neste formato exato:"
            "```json\n"
            "{\"vida\": 10, \"vida_maxima\": 10, \"ouro\": 30, \"itens\": [{\"item\": \"Arco Curto\", \"quantidade\": 1}, {\"item\": \"Poção\", \"quantidade\": 2}]}\n"
            "```\n"
            "**NÃO ESQUEÇA** de incluir o JSON ao final da resposta, pois ele será usado para configurar o jogador no sistema."
)
        if resumo_memoria:
            system_prompt += f"Resumo dos eventos anteriores: {resumo_memoria}\n"

        if player:
            system_prompt += f" O tema é '{player.get('tema')}', modo '{player.get('modo')}'."

        history.append({"role": "system", "content": system_prompt})

    history.append({"role": "user", "content": user_message})

    compact_history = []
    for msg in history:
        if msg["role"] == "system":
            compact_history.append(msg)
            break

    last_messages = [m for m in history if m["role"] in ("user", "assistant")]
    compact_history.extend(last_messages[-20:])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=compact_history
    )

    assistant_message = response.choices[0].message.content
    print("Resposta da IA:", assistant_message)

    history.append({"role": "assistant", "content": assistant_message})
    save_history(user_id, history)

    interpretar_e_atualizar_estado(assistant_message, user_id)

    print("Histórico atual tem", len(history), "mensagens")
    if len(history) > 20:
        mensagens_para_resumir = [h["content"] for h in history if h["role"] == "assistant"][-10:]
        resumo_input = "\n".join(mensagens_para_resumir)
        resumo_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Resuma os principais eventos do RPG, de forma curta e objetiva, em até 5 linhas."},
                {"role": "user", "content": resumo_input}
            ]
        )
        resumo_final = resumo_response.choices[0].message.content.strip()
        save_memory(user_id, resumo_final)

    resposta_limpa = re.sub(r"```json.*?```", "", assistant_message, flags=re.DOTALL)
    return resposta_limpa.strip()

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
