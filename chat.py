import re
from openai import OpenAI
from player import load_player, interpretar_e_atualizar_estado, get_inventory_text, save_player
from storage import load_json, save_json, delete_file
from dotenv import load_dotenv
import os
from bot import ASK_NAME

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def process_message(user_message: str, user_id: int) -> str:
    if user_message.strip().lower() == "!resetar":
        save_json(user_id, "history.json", [])
        save_player(user_id, {})
        save_json(user_id, "memory.json", "")
        delete_file(user_id, "memory.json")
        return "Histórico, personagem e memória resetados. Vamos começar uma nova aventura!"

    if user_message.lower() == "!inventario":
        return get_inventory_text(user_id)

    if user_message.lower() == "!comandos":
        return "Comandos disponíveis: !resetar, !inventario, !comandos"

    history = load_json(user_id, "history.json", [])
    player = load_player(user_id)
    memoria = load_json(user_id, "memory.json", "")

    if not history:
        prompt = (
            "Você é um narrador de RPG por texto (estilo Dungeon Master). Sua missão é iniciar uma aventura "
            "imersiva baseada no tema escolhido pelo jogador (ex: zumbi, fantasia, futurista, etc).\n\n"
            f"O nome do jogador é: {load_player(user_id).get('nome')}\n"
            "Na sua primeira resposta, você deve OBRIGATÓRIAMENTE:\n"
            "- Apresente o mundo de forma envolvente e resumida.\n"
            "- Apresente o jogador em um local interessante e ofereça uma escolha inicial.\n"
            "- Eliminar inimigos, completar missões, e tudo que for relacionado, ira dar uma certa quantidade de XP, defina sua quantidade se baseando na dificuldade do acontecido.\n"
            "- Defina atributos iniciais de forma temática e aleatória: vida, mana, ouro, atributos (força, destreza, etc), magias e itens coerentes com a classe.\n"
            "- Sempre finalize sua resposta com um bloco JSON completo com a estrutura abaixo sem comenatarios! (O USUARIO NAO IRA RECEBER ESSE JSON):\n"
            "```json\n"
            "{\n"
            "  \"vida\": 100,\n"
            "  \"vida_maxima\": 100,\n"
            "  \"mana\": 50,\n"
            "  \"mana_maxima\": 50,\n"
            "  \"ouro\": 30,\n"
            "  \"itens\": [\n"
            "    {\"item\": \"Poção de Cura\", \"quantidade\": 2},\n"
            "    {\"item\": \"Bastão de Carvalho\", \"quantidade\": 1}\n"
            "  ],\n"
            "  \"atributos\": {\n"
            "    \"forca\": 8,\n"
            "    \"destreza\": 10,\n"
            "    \"constituicao\": 10,\n"
            "    \"inteligencia\": 14,\n"
            "    \"sabedoria\": 12,\n"
            "    \"carisma\": 9\n"
            "  },\n"
            "  \"magias\": [\n"
            "    {\"nome\": \"Bola de Fogo\", \"custo_mana\": 10, \"descricao\": \"Lança uma explosão flamejante.\"}\n"
            "  ],\n"
            "  \"status\": []\n"
            "}\n"
            "```\n"
            "Este JSON só é obrigatório na PRIMEIRA RESPOSTA. Após isso:\n"
            "- Só envie o JSON novamente se algum valor mudar (vida, mana, ouro, itens, magias, XP, status ou atributos).\n"
            "- Caso nada mude, **NÃO envie o JSON** para economizar tokens.\n"
        )


        if player:
            prompt += f" O tema é '{player.get('tema')}', modo '{player.get('modo')}'."
        if memoria:
            prompt += f"\nResumo: {memoria}"
        history.append({"role": "system", "content": prompt})

    history.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=history[-20:]
    )

    assistant_message = response.choices[0].message.content
    history.append({"role": "assistant", "content": assistant_message})
    save_json(user_id, "history.json", history)
    print(assistant_message)

    interpretar_e_atualizar_estado(assistant_message, user_id)

    resposta_limpa = re.sub(r"```json.*?```", "", assistant_message, flags=re.DOTALL)
    return resposta_limpa.strip()
