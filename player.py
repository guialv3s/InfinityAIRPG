from storage import load_json, save_json
import re
import json

def load_player(user_id: int):
    return load_json(user_id, "player.json", default=None)

def save_player(user_id: int, player_data):
    save_json(user_id, "player.json", player_data)

def interpretar_e_atualizar_estado(resposta, user_id):
    player = load_player(user_id) or {
        "nome": "",
        "classe": "",
        "tema": "",
        "modo": "",
        "nivel": 0,
        "experiencia": 0,
        "inventario": {
            "vida_atual": 100,
            "vida_maxima": 100,
            "mana_atual": 50,
            "mana_maxima": 50,
            "ouro": 0,
            "itens": []
        },
        "status": [],
        "atributos": {
            "forca": 10,
            "destreza": 10,
            "constituicao": 10,
            "inteligencia": 10,
            "sabedoria": 10,
            "carisma": 10
        },
        "magias": []
    }

    inventario = player["inventario"]
    json_matches = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", resposta, re.DOTALL)

    if json_matches:
        try:
            data = json.loads(json_matches[0])

            # Atualizar inventário
            inventario.update({
                "vida_atual": data.get("vida", inventario.get("vida_atual", 10)),
                "vida_maxima": data.get("vida_maxima", inventario.get("vida_maxima", 10)),
                "mana_atual": data.get("mana", inventario.get("mana_atual", 10)),
                "mana_maxima": data.get("mana_maxima", inventario.get("mana_maxima", 10)),
                "ouro": data.get("ouro", inventario.get("ouro", 0)),
                "itens": data.get("itens", inventario.get("itens", []))
            })

            # Atualizar nível e experiência
            if "nivel" in data:
                player["nivel"] = data["nivel"]
            if "experiencia" in data:
                player["experiencia"] = data["experiencia"]

            # Atualizar atributos
            if "atributos" in data:
                player["atributos"] = data["atributos"]

            # Atualizar magias
            if "magias" in data:
                player["magias"] = data["magias"]

            # Atualizar status
            if "status" in data:
                player["status"] = data["status"]

        except json.JSONDecodeError:
            print("Erro ao decodificar JSON do assistente.")
    else:
        texto = resposta.lower()
        if "perdeu" in texto and "vida" in texto:
            inventario["vida_atual"] = max(inventario.get("vida_atual", 10) - 1, 0)
        if "ganhou" in texto and "ouro" in texto:
            inventario["ouro"] = inventario.get("ouro", 0) + 10

    player["inventario"] = inventario
    save_player(user_id, player)


def get_inventory_text(user_id: int):
    player = load_player(user_id)
    if not player:
        return "Nenhum personagem criado."
    inv = player.get("inventario", {})
    resposta = f"Vida: {inv.get('vida_atual', 0)}/{inv.get('vida_maxima', 0)}\nOuro: {inv.get('ouro', 0)}\nItens:"
    for item in inv.get("itens", []):
        resposta += f"\n- {item['item']} (x{item['quantidade']})"
    return resposta or "Inventário vazio."

def get_full_status_text(user_id: int) -> str:
    player = load_player(user_id)
    if not player:
        return "Nenhum personagem criado ainda."

    inv = player.get("inventario", {})
    atributos = player.get("atributos", {})
    magias = player.get("magias", [])
    status = player.get("status", [])

    texto = f"🧙 Personagem: {player.get('nome', 'Desconhecido')} (Classe: {player.get('classe', '-')})\n"
    texto += f"🎯 Tema: {player.get('tema', '-')}\n"
    texto += f"📊 Nível: {player.get('nivel', 0)} | XP: {player.get('experiencia', 0)}\n"
    texto += f"❤️ Vida: {inv.get('vida_atual', 0)}/{inv.get('vida_maxima', 0)}\n"
    texto += f"🔵 Mana: {inv.get('mana_atual', 0)}/{inv.get('mana_maxima', 0)}\n"
    texto += f"💰 Ouro: {inv.get('ouro', 0)}\n\n"

    texto += "📌 Atributos:\n"
    for key, val in atributos.items():
        texto += f"- {key.capitalize()}: {val}\n"

    texto += "\n🧪 Status:\n"
    if status:
        for s in status:
            texto += f"- {s}\n"
    else:
        texto += "- Nenhum status ativo\n"

    if magias:
        texto += "\n📚 Magias:"
        for magia in magias:
            nome = magia.get("nome", "Desconhecida")
            custo = magia.get("custo_mana", "?")
            desc = magia.get("descricao", "Sem descrição.")
            texto += f"\n- {nome} (Custo de Mana: {custo})\n  → {desc}\n"

    else:
        texto += "- Nenhuma magia aprendida\n"

    texto += "\n🎒 Itens:\n"
    if inv.get("itens"):
        for item in inv["itens"]:
            texto += f"- {item['item']} (x{item['quantidade']})\n"
    else:
        texto += "- Nenhum item no inventário\n"

    return texto
