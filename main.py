from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional
from src.core.chat import process_message
from src.core.player import load_player, save_player
from src.core.auth import create_user, authenticate_user, get_user_by_id
from src.core.sessions import create_session, validate_session, delete_session
from src.core.campaigns import get_campaigns, create_campaign, get_campaign_details
from src.core.chat import get_chat_history

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    user_id: int
    campaign_id: str

class PlayerCreateRequest(BaseModel):
    user_id: int
    nome: str
    raca: str
    classe: str
    tema: str
    modo: str
    historia: str
    atributos: dict

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    confirm_password: str
    confirm_email: EmailStr

class LoginRequest(BaseModel):
    username: str
    password: str

@app.middleware("http")
async def add_process_time_header(request, call_next):
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/player/exists/{user_id}")
async def check_player_exists(user_id: int):
    player = load_player(user_id)
    return {"exists": bool(player and player.get("nome"))}

@app.get("/player/{user_id}/{campaign_id}")
async def get_player_data(user_id: int, campaign_id: str, authorization: Optional[str] = Header(None)):
    """Get complete player data for a campaign"""
    if not authorization: return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    
    token = authorization.replace("Bearer ", "")
    session_user_id = validate_session(token)
    
    if not session_user_id: 
        return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
    from src.core.player import load_player
    player = load_player(user_id, campaign_id)
    return player


@app.post("/player/create")
async def create_player(request: PlayerCreateRequest):
    try:
        # Legacy Support: Create a default campaign for this "Single Player" request
        campaign_name = f"{request.nome} - {request.tema}"
        campaign_id = create_campaign(request.user_id, campaign_name, request.tema, request.classe, request.modo)
        
        player = {
            "nome": request.nome,
            "classe": request.classe.capitalize(),
            "tema": request.tema,
            "modo": request.modo.lower(),
            "nivel": 0,
            "experiencia": 0,
            "inventario": {
                "ouro": 0,
                "vida_atual": 100,
                "vida_maxima": 100,
                "mana_atual": 50,
                "mana_maxima": 50,
                "itens": [],
            },
            "atributos": {
                "forca": 10, "destreza": 10, "constituicao": 10,
                "inteligencia": 10, "sabedoria": 10, "carisma": 10
            },
            "magias": [],
            "status": []
        }
        
        save_player(request.user_id, player, campaign_id=campaign_id)
        
        primeira_resposta = process_message("Quero começar minha aventura agora.", request.user_id, campaign_id=campaign_id)
        
        # Return response compatible with what legacy might expect, plus campaign_id
        return {"response": primeira_resposta, "campaign_id": campaign_id}
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Campaign Endpoints
@app.get("/campaigns")
async def list_campaigns(authorization: Optional[str] = Header(None)):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"error": "No token provided"})
        
        token = authorization.replace("Bearer ", "")
        user_id = validate_session(token)
        if not user_id:
            return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
        campaigns = get_campaigns(int(user_id))
        return {"campaigns": campaigns}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/campaigns")
async def create_new_campaign(request: PlayerCreateRequest, authorization: Optional[str] = Header(None)):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"error": "No token provided"})
        
        token = authorization.replace("Bearer ", "")
        user_id = validate_session(token)
        if not user_id:
            return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
        user_id_int = int(user_id)
        
        # 1. Create Campaign Metadata
        campaign_name = f"{request.nome} - {request.tema}"
        campaign_id = create_campaign(user_id_int, campaign_name, request.tema, request.classe, request.modo)
        
        # 2. Setup Player Data (Initial)
        # We start with what the user gave us, but empty inventory/status
        player = {
            "nome": request.nome,
            "raca": request.raca,
            "classe": request.classe.capitalize(),
            "tema": request.tema,
            "modo": request.modo.lower(),
            "historia": request.historia,
            "nivel": 1,
            "experiencia": 0,
            "atributos": request.atributos, # Use provided attributes
            "inventario": { "ouro": 0, "vida_atual": 0, "vida_maxima": 0, "mana_atual": 0, "mana_maxima": 0, "itens": [] },
            "magias": [],
            "status": []
        }
        
        save_player(user_id_int, player, campaign_id=campaign_id)
        
        # 3. AI Generation (The Magic Step)
        # We ask the AI to generate the starting condition via a hidden prompt
        print("🤖 Solicitando geração de personagem para a IA...")
        system_prompt = f"""
        AJA COMO UM MESTRE DE RPG. O jogador criou um personagem:
        Nome: {request.nome}
        Raça: {request.raca}
        Classe: {request.classe}
        História: {request.historia}
        Atributos: {request.atributos}
        Tema: {request.tema}

        GERE UM OBJETO JSON contendo:
        1. 'inventario': com 'vida_maxima', 'vida_atual' (iguais), 'mana_maxima', 'mana_atual' (iguais), 'ouro' e lista de 'itens' inicias adequados à história e classe.
        2. 'magias': lista de magias iniciais (se aplicável, senão vazio).
        
        Sua resposta deve ser APENAS O JSON dentro de blocos de código ```json ... ```.
        Calcule VIDA e MANA baseados nos atributos (Ex: Alta CON = Mais vida).
        Dê itens criativos baseados no background dele.
        """
        
        # Run hidden setup (User won't see this)
        from src.core.chat import generate_character_setup
        generate_character_setup(user_id_int, campaign_id, system_prompt)
        
        # After generation, we send the introductory message
        intro_prompt = "Descreva onde meu personagem está e como a aventura começa, baseado na minha história."
        primeira_resposta = process_message(intro_prompt, user_id_int, campaign_id)
        
        return {"campaign_id": campaign_id, "response": primeira_resposta, "name": campaign_name}
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/campaigns/{campaign_id}/history")
async def get_history(campaign_id: str, authorization: Optional[str] = Header(None)):
    try:
        if not authorization: return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        token = authorization.replace("Bearer ", "")
        user_id = validate_session(token)
        if not user_id: return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
        history = get_chat_history(int(user_id), campaign_id)
        return {"history": history}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/campaigns/{campaign_id}")
async def remove_campaign(campaign_id: str, authorization: Optional[str] = Header(None)):
    try:
        if not authorization: return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        token = authorization.replace("Bearer ", "")
        user_id = validate_session(token)
        if not user_id: return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
        from src.core.campaigns import delete_campaign
        success = delete_campaign(int(user_id), campaign_id)
        
        if success:
            return {"message": "Campanha deletada."}
        else:
            return JSONResponse(status_code=404, content={"error": "Campanha não encontrada."})
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Authentication endpoints
@app.post("/auth/register")
async def register(request: RegisterRequest):
    try:
        # Validate matching passwords
        if request.password != request.confirm_password:
            return JSONResponse(status_code=400, content={"error": "As senhas não coincidem."})
        
        # Validate matching emails
        if request.email != request.confirm_email:
            return JSONResponse(status_code=400, content={"error": "Os emails não coincidem."})
        
        # Create user
        user = create_user(request.username, request.email, request.password)
        
        # Create session
        token = create_session(user['user_id'])
        
        return {"token": token, "user": user}
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/auth/login")
async def login(request: LoginRequest):
    try:
        # Authenticate user
        user = authenticate_user(request.username, request.password)
        
        # Create session
        token = create_session(user['user_id'])
        
        return {"token": token, "user": user}
    except ValueError as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"error": "No token provided"})
        
        token = authorization.replace("Bearer ", "")
        delete_session(token)
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"error": "No token provided"})
        
        token = authorization.replace("Bearer ", "")
        user_id = validate_session(token)
        
        if not user_id:
            return JSONResponse(status_code=401, content={"error": "Invalid or expired token"})
        
        user = get_user_by_id(user_id)
        return {"user": user}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"DEBUG: Endpoint /chat chamado por User {request.user_id} na Campaign {request.campaign_id}")
    print(f"DEBUG: Mensagem: {request.message}")
    try:
        resposta = process_message(request.message, request.user_id, request.campaign_id)
        return {"response": resposta}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)