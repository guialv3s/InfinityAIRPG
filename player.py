from storage import load_json, save_json
import re
import json
import math

def load_player(user_id: int):
    return load_json(user_id, "player.json", default=None)

def save_player(user_id: int, player_data):
    save_json(user_id, "player.json", player_data)

def xp_necessario_para_nivel(nivel_atual: int) -> int:
    # Nível 0 = 100, e cada nível seguinte +50 XP
    return 100 + nivel_atual * 50

def adicionar_experiencia(user_id: int, quantidade: int):
    player = load_player(user_id)
    if not player:
        return None

    experiencia_atual = player.get("experiencia", 0)
    nivel_atual = player.get("nivel", 0)

    experiencia_atual += quantidade
    mensagem_level_up = None

    # Loop para subir vários níveis caso XP alta
    while experiencia_atual >= xp_necessario_para_nivel(nivel_atual):
        xp_necessaria = xp_necessario_para_nivel(nivel_atual)
        experiencia_atual -= xp_necessaria
        nivel_atual += 1

        # Bonus de 10% em vida e mana máximos
        inventario = player.get("inventario", {})
        
        vida_maxima = inventario.get("vida_maxima", 100)
        mana_maxima = inventario.get("mana_maxima", 50)

        vida_maxima = math.ceil(vida_maxima * 1.10)
        mana_maxima = math.ceil(mana_maxima * 1.10)

        inventario["vida_maxima"] = vida_maxima
        inventario["mana_maxima"] = mana_maxima

        # Aumenta vida_atual e mana_atual proporcionalmente, sem ultrapassar máximos
        vida_atual = inventario.get("vida_atual", vida_maxima)
        mana_atual = inventario.get("mana_atual", mana_maxima)

        vida_atual = min(vida_atual + math.ceil(vida_maxima * 0.10), vida_maxima)
        mana_atual = min(mana_atual + math.ceil(mana_maxima * 0.10), mana_maxima)

        inventario["vida_atual"] = vida_atual
        inventario["mana_atual"] = mana_atual

        player["inventario"] = inventario

        mensagem_level_up = f"🎉 Parabéns! Você subiu para o nível {nivel_atual} e ganhou +10% de Vida e Mana máximas! Use !status para ver seu progresso."

    player["experiencia"] = experiencia_atual
    player["nivel"] = nivel_atual

    save_player(user_id, player)

    return mensagem_level_up

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
    mensagens = []
    json_matches = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", resposta, re.DOTALL)

    if json_matches:
        try:
            data = json.loads(json_matches[0])

            inventario.update({
                "vida_atual": data.get("vida", inventario.get("vida_atual", 10)),
                "vida_maxima": data.get("vida_maxima", inventario.get("vida_maxima", 10)),
                "mana_atual": data.get("mana", inventario.get("mana_atual", 10)),
                "mana_maxima": data.get("mana_maxima", inventario.get("mana_maxima", 10)),
                "ouro": data.get("ouro", inventario.get("ouro", 0)),
                "itens": data.get("itens", inventario.get("itens", []))
            })

            if "nivel" in data:
                player["nivel"] = data["nivel"]

            # Aqui atualiza a experiencia com o incremental e atualiza o player local!
            if "experiencia" in data:
                xp_recebida = data["experiencia"] - player.get("experiencia", 0)
                if xp_recebida > 0:
                    msg_nivel = adicionar_experiencia(user_id, xp_recebida)
                    if msg_nivel:
                        mensagens.append(msg_nivel)
                    # Atualiza o player local com o XP novo depois de adicionar
                    player["experiencia"] = player.get("experiencia", 0) + xp_recebida
            elif "xp" in data:
                xp_recebida = data["xp"] - player.get("experiencia", 0)
                if xp_recebida > 0:
                    msg_nivel = adicionar_experiencia(user_id, xp_recebida)
                    if msg_nivel:
                        mensagens.append(msg_nivel)
                    # Atualiza o player local com o XP novo depois de adicionar
                    player["experiencia"] = player.get("experiencia", 0) + xp_recebida

            if "atributos" in data:
                player["atributos"] = data["atributos"]

            if "magias" in data:
                player["magias"] = data["magias"]

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

    if mensagens:
        return "\n\n".join(mensagens)


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

    nivel = player.get("nivel", 0)
    xp_atual = player.get("experiencia", 0)
    xp_proximo = xp_necessario_para_nivel(nivel)


    texto = f"🧙 Personagem: {player.get('nome', 'Desconhecido')} (Classe: {player.get('classe', '-')})\n"
    texto += f"🎯 Tema: {player.get('tema', '-')}\n"
    texto += f"📊 Nível: {player.get('nivel', 0)} | XP: {xp_atual} / {xp_proximo}\n"
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
