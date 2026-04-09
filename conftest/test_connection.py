"""Confluence bağlantı testi"""
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

url   = os.getenv("CONFLUENCE_BASE_URL", "").rstrip("/")
token = os.getenv("CONFLUENCE_API_TOKEN", "")
user  = os.getenv("CONFLUENCE_USERNAME", "")

print(f"CONFLUENCE_BASE_URL : {'OK: ' + url if url else 'EKSIK'}")
print(f"CONFLUENCE_API_TOKEN: {'OK (' + str(len(token)) + ' karakter)' if token else 'EKSIK'}")
print(f"CONFLUENCE_USERNAME : {'OK: ' + user if user else '(PAT modu, Bearer auth)'}")
print(f"ANTHROPIC_API_KEY   : {'OK' if os.getenv('ANTHROPIC_API_KEY') else 'EKSIK'}")

if not url or not token:
    print("\n⚠ Eksik değişken var, test durduruluyor.")
    sys.exit(1)

def try_auth(label, auth_obj, hdrs):
    print(f"\n[{label}] {url}/rest/api/space?limit=3")
    try:
        resp = requests.get(
            f"{url}/rest/api/space",
            params={"limit": 3},
            auth=auth_obj,
            headers=hdrs,
            timeout=10,
        )
        if resp.status_code == 200:
            spaces = resp.json().get("results", [])
            print(f"  BASARILI! {len(spaces)} space:")
            for s in spaces:
                print(f"    - [{s['key']}] {s['name']}")
            return True
        else:
            print(f"  HATA HTTP {resp.status_code}: {resp.text[:150]}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"  HATA: Sunucuya ulasilamadi")
        return False
    except requests.exceptions.Timeout:
        print("  HATA: Zaman asimi")
        return False

from requests.auth import HTTPBasicAuth

success = False

# 1. Deneme: PAT Bearer auth (username yok)
if not success:
    success = try_auth(
        "Deneme 1 - Bearer (PAT)",
        None,
        {"Accept": "application/json", "Authorization": f"Bearer {token}"},
    )

# 2. Deneme: Basic Auth (username + token)
if not success and user:
    success = try_auth(
        "Deneme 2 - Basic Auth (username + token)",
        HTTPBasicAuth(user, token),
        {"Accept": "application/json"},
    )

if success:
    print("\n--- Calisma yontemi .env dosyasina geri yaziliyor ---")
    # Hangi mod calisiyorsa confluence_agent.py bunu zaten destekliyor
    print("Konfigurasyonunuz dogru. 'python confluence_agent.py' calistirabilirsiniz.")
else:
    print("\nHic bir yontem calismadi. Kontrol edin:")
    print("  - Token suresi dolmamis mi?")
    print("  - Confluence URL dogru mu? (VPN gerekebilir)")
    print("  - Token'in okuma yetkisi var mi?")
