import requests
import json

url = "http://localhost:8000/chat"
payload = {
    "message": "Olá, eu sou um teste de debug.",
    "user_id": 2,
    "campaign_id": "e742e6ee" 
}
headers = {"Content-Type": "application/json"}

try:
    print(f"Enviando POST para {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro: {e}")
