from .storage import load_json, save_json
import re
import json
import math

def load_player(user_id: int, campaign_id: str = None):
    return load_json(user_id, "player.json", default=None, campaign_id=campaign_id)

def save_player(user_id: int, player_data, campaign_id: str = None):
    save_json(user_id, "player.json", player_data, campaign_id=campaign_id)

def xp_necessario_para_nivel(nivel_atual: int) -> int:
    # Nível 0 = 100, e cada nível seguinte +50 XP
    return 100 + nivel_atual * 50

def adicionar_experiencia(user_id: int, quantidade: int, campaign_id: str = None):
    player = load_player(user_id, campaign_id)
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

    save_player(user_id, player, campaign_id)

    return mensagem_level_up

def interpretar_e_atualizar_estado(resposta: str, user_id: int, campaign_id: str = None) -> str:
    """extracts JSON from response and updates player.json"""
    player = load_player(user_id, campaign_id)
    if not player:
        # Initialize a default player if none exists
        player = {
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

    inventario = player.get("inventario", {})
    mensagens = []

    # Regex more permissive: optional "json" after backticks
    # Also capture content
    json_matches = re.findall(r"```(?:json)?(.*?)```", resposta, re.DOTALL)
    
    if json_matches:
        try:
            print(f"DEBUG: Encontrado bloco JSON na resposta de tamanho {len(json_matches[0])}")
            data = json.loads(json_matches[0].strip())

            # Determine source of inventory data (nested or flat)
            source_inv = data.get("inventario", data)
            
            inventario.update({
                "vida_atual": source_inv.get("vida_atual", source_inv.get("vida", inventario.get("vida_atual", 10))),
                "vida_maxima": source_inv.get("vida_maxima", inventario.get("vida_maxima", 10)),
                "mana_atual": source_inv.get("mana_atual", source_inv.get("mana", inventario.get("mana_atual", 10))),
                "mana_maxima": source_inv.get("mana_maxima", inventario.get("mana_maxima", 10)),
                "ouro": source_inv.get("ouro", inventario.get("ouro", 0)),
                "itens": source_inv.get("itens", inventario.get("itens", []))
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
    save_player(user_id, player, campaign_id)

    if mensagens:
        return "\n\n".join(mensagens)


def get_inventory_text(user_id: int, campaign_id: str = None):
    player = load_player(user_id, campaign_id)
    if not player:
        return "Nenhum personagem criado."
    inv = player.get("inventario", {})
    resposta = f"Vida: {inv.get('vida_atual', 0)}/{inv.get('vida_maxima', 0)}\nOuro: {inv.get('ouro', 0)}\nItens:"
    for item in inv.get("itens", []):
        resposta += f"\n- {item['item']} (x{item['quantidade']})"
    return resposta or "Inventário vazio."

def get_full_status_text(user_id: int, campaign_id: str = None):
    player = load_player(user_id, campaign_id)
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

def process_passive_effects(user_id: int, campaign_id: str = None) -> str:
    """Check and apply passive effects from status"""
    player = load_player(user_id, campaign_id)
    if not player: return None
    
    status_list = player.get("status", [])
    if not status_list: return None
    
    effects_applied = []
    inventory = player.get("inventario", {})
    
    # Logic for "Recuperação de Vida Extrema"
    if "Recuperação de Vida Extrema" in status_list:
        current_hp = inventory.get("vida_atual", 0)
        max_hp = inventory.get("vida_maxima", 100)
        
        if current_hp < max_hp:
            heal_amount = 15
            new_hp = min(current_hp + heal_amount, max_hp)
            inventory["vida_atual"] = new_hp
            effects_applied.append(f"❤️ Recuperação Extrema: +{new_hp - current_hp} PV")
            
    # Save if changes happened
    if effects_applied:
        player["inventario"] = inventory
        save_player(user_id, player, campaign_id)
        return "\n".join(effects_applied)
        
    return None

def generate_initial_stats(classe: str, raca: str, tema: str) -> dict:
    """Generate initial stats based on Class, Race and Theme"""
    import random
    
    # --- 1. Base Stats Randomization ---
    # Roll 3d6 for each stat (classic style) or 4d6 drop lowest? 
    # Let's go with standard array reshuffled + random noise for variety
    base_values = [15, 14, 13, 12, 10, 8]
    random.shuffle(base_values)
    
    stats_keys = ["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma"]
    stats = {k: v for k, v in zip(stats_keys, base_values)}

    # Add small random noise (-1 to +1) to make it less predictable
    for k in stats:
        stats[k] += random.randint(-1, 1)

    # --- 2. Race Modifiers ---
    raca_lower = raca.lower()
    if "humano" in raca_lower:
        for k in stats: stats[k] += 1
    elif "elfo" in raca_lower:
        stats["destreza"] += 2
        stats["inteligencia"] += 1
    elif "anão" in raca_lower or "anao" in raca_lower:
        stats["constituicao"] += 2
        stats["forca"] += 1
    elif "orc" in raca_lower or "meio-orc" in raca_lower:
        stats["forca"] += 2
        stats["constituicao"] += 1
    elif "tiefling" in raca_lower:
        stats["carisma"] += 2
        stats["inteligencia"] += 1
    elif "draconato" in raca_lower:
        stats["forca"] += 2
        stats["carisma"] += 1
    elif "halfling" in raca_lower:
        stats["destreza"] += 2
    elif "gnomo" in raca_lower:
        stats["inteligencia"] += 2
    else:
        # Generic bonus for custom races
        bonus_attrs = random.sample(list(stats.keys()), 2)
        for attr in bonus_attrs: stats[attr] += 1

    # --- 3. Class Configs (HP, MP, Items) ---
    classe_lower = classe.lower()
    items = [{"item": "Rações de Viagem (5 dias)", "quantidade": 1}]
    magias = []
    
    # Random Gold (Standard D&D starting gold approx.)
    gold = random.randint(10, 150)

    # HP/MP Calculations with random variance
    # HP = Base + Con Mod; MP = Base + Int/Wis Mod (Simplified)
    con_mod = (stats["constituicao"] - 10) // 2
    int_mod = (stats["inteligencia"] - 10) // 2
    wis_mod = (stats["sabedoria"] - 10) // 2
    
    hp_base = 10
    mp_base = 10
    
    if "mago" in classe_lower or "feiticeiro" in classe_lower:
        hp_base = 6
        mp_base = 20
        # Priotize Int if it wasn't assigned high
        if stats["inteligencia"] < 14: stats["inteligencia"] = 14
        
        items.append({"item": "Poção de Mana", "quantidade": random.randint(1, 3)})
        items.append({"item": "Grimório", "quantidade": 1})
        magias.append({"nome": "Mísseis Mágicos", "custo_mana": 10, "descricao": "Dispara 3 dardos de energia."})
        magias.append({"nome": "Escudo Arcano", "custo_mana": 15, "descricao": "+5 na CA temporariamente."})

    elif "guerreiro" in classe_lower or "barbaro" in classe_lower:
        hp_base = 12
        mp_base = 0 
        if "guerreiro" in classe_lower: mp_base = 5 # Eldritch Knight potential?
        if stats["forca"] < 14: stats["forca"] = 14
        
        items.append({"item": "Poção de Cura", "quantidade": random.randint(1, 3)})
        weapon = random.choice(["Espada Longa", "Machado de Batalha", "Espada Grande"])
        armor = random.choice(["Cota de Malha", "Couro Batido"])
        items.append({"item": weapon, "quantidade": 1})
        items.append({"item": armor, "quantidade": 1})

    elif "ladino" in classe_lower or "rogue" in classe_lower:
        hp_base = 8
        mp_base = 5
        if stats["destreza"] < 14: stats["destreza"] = 14
        
        items.append({"item": "Adaga", "quantidade": 2})
        items.append({"item": "Kit de Ladino", "quantidade": 1})
        items.append({"item": "Armadura de Couro", "quantidade": 1})

    elif "clérigo" in classe_lower or "clerigo" in classe_lower:
        hp_base = 8
        mp_base = 15
        if stats["sabedoria"] < 14: stats["sabedoria"] = 14
        
        items.append({"item": "Símbolo Sagrado", "quantidade": 1})
        items.append({"item": "Poção de Cura Maior", "quantidade": 1})
        items.append({"item": "Maça", "quantidade": 1})
        magias.append({"nome": "Curar Ferimentos", "custo_mana": 15, "descricao": "Recupera vida ao toque."})
        magias.append({"nome": "Chama Sagrada", "custo_mana": 0, "descricao": "Dano radiante em inimigo."})
    
    elif "bardo" in classe_lower:
        hp_base = 8
        mp_base = 15
        items.append({"item": "Instrumento Musical", "quantidade": 1})
        magias.append({"nome": "Inspiração Bárdica", "custo_mana": 10, "descricao": "Concede bônus a um aliado."})

    elif "paladino" in classe_lower:
        hp_base = 10
        mp_base = 10
        items.append({"item": "Espada Longa", "quantidade": 1})
        items.append({"item": "Escudo", "quantidade": 1})
        magias.append({"nome": "Impor as Mãos", "custo_mana": 5, "descricao": "Cura toques."})

    else:
        # Generic fallback
        hp_base = 8
        mp_base = 5
        items.append({"item": "Equipamento de Aventureiro", "quantidade": 1})
        items.append({"item": "Adaga", "quantidade": 1})

    # Final HP/MP Calc
    hp = hp_base + con_mod
    # Ensure min HP 5
    hp = max(5, hp * 10) # Scale up for this system (looks like 100 is standard base, so x10?)
    # Wait, previous code had 100 as base. Let's align with the system's scale.
    # Old system: 100 HP, 50 Mana. 
    # New system: 
    #   Warrior: 120 HP -> 12 base * 10
    #   Mage: 60 HP -> 6 base * 10 
    # Okay, multiply base D&D HP by 10 seems like a fair mapping for "Video Game Numbers".
    
    mp = mp_base * 5 # Scale MP. Mage 20 * 5 = 100. Warrior 0. Cleric 15*5 = 75. Looks good.
    mp = max(0, mp + (int_mod + wis_mod) * 5) # Add attribute bonuses to MP too

    # --- 4. Theme & Magic Logic ---
    tema_lower = tema.lower()
    magic_prohibited_themes = ["zumbi", "zombie", "apocalipse", "realista", "segunda guerra", "ww2", "velho oeste", "cyberpunk", "sci-fi"]
    
    # Check if theme prohibits magic (unless it's a specific "Cyberpunk Fantasy" e.g. Shadowrun, but let's be strict for now based on keywords)
    # Actually, verify if "magic" keywords are NOT present if prohibited keywords ARE present?
    # Simple logic: If theme looks realistic/sci-fi, nuking spells.
    
    is_magic_allowed = True
    for p_theme in magic_prohibited_themes:
        if p_theme in tema_lower:
            is_magic_allowed = False
            break
            
    # Exception: "zumbi + magia" (Necromancy theme)
    if "magia" in tema_lower or "rpg" in tema_lower or "d&d" in tema_lower or "fantasy" in tema_lower:
        is_magic_allowed = True

    if not is_magic_allowed:
        magias = [] 
        # Convert MP to "Energy" or "Stamina" maybe? Or just 0.
        # Let's keep MP as 0 for non-magic settings generally, or rename? 
        # The system expects "mana", so let's just set to 0 or low stamina.
        if mp > 20: mp = 20 # Low "stamina" cap

    return {
        "atributos": stats,
        "inventario": {
            "vida_atual": hp, "vida_maxima": hp,
            "mana_atual": mp, "mana_maxima": mp,
            "ouro": gold,
            "itens": items
        },
        "magias": magias
    }
