import requests
import json

url = "http://127.0.0.1:8000/api/smart-killer/learn"
payload = {
    "document_text": "Photosynthesis is a system where plants make food. They use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar."
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response Body:", json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error connecting to backend: {e}")
