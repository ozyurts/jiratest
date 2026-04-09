"""
Confluence Weekly Agenda Summarizer Agent
Confluence sunucusuna bağlanır, haftalık kritik gündemleri okur ve özetler.

Kullanım:
  pip install anthropic requests
  .env dosyasına değişkenleri girin, sonra:
  python confluence_agent.py
"""

import os
import json
import anthropic
import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# --- Confluence bağlantı ayarları ---
CONFLUENCE_BASE_URL = os.environ["CONFLUENCE_BASE_URL"].rstrip("/")
CONFLUENCE_API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]
CONFLUENCE_USERNAME = os.getenv("CONFLUENCE_USERNAME", "")  # PAT kullanıyorsan boş bırak
CONFLUENCE_SPACE_KEY = os.getenv("CONFLUENCE_SPACE_KEY", "")

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# PAT varsa Bearer, yoksa Basic Auth
if CONFLUENCE_USERNAME:
    auth = HTTPBasicAuth(CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
else:
    auth = None
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CONFLUENCE_API_TOKEN}",
    }


# ===========================================================================
# Confluence Araçları (Tools)
# ===========================================================================

def search_confluence_pages(query: str, limit: int = 10, space_key: str = "") -> dict:
    """CQL ile Confluence'ta sayfa arar."""
    cql = f'text ~ "{query}" AND type = "page"'
    if space_key:
        cql += f' AND space.key = "{space_key}"'

    # Son 14 günü kapsayan tarih filtresi
    since = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d")
    cql += f' AND lastModified >= "{since}"'
    cql += " ORDER BY lastModified DESC"

    params = {"cql": cql, "limit": limit, "expand": "version,space"}
    resp = requests.get(
        f"{CONFLUENCE_BASE_URL}/rest/api/content/search",
        params=params,
        auth=auth,
        headers=headers,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for page in data.get("results", []):
        results.append({
            "id": page["id"],
            "title": page["title"],
            "space": page.get("space", {}).get("key", ""),
            "last_modified": page.get("version", {}).get("when", ""),
            "url": f"{CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId={page['id']}",
        })
    return {"total": data.get("size", 0), "pages": results}


def get_page_content(page_id: str) -> dict:
    """Bir Confluence sayfasının içeriğini getirir (saf metin olarak)."""
    resp = requests.get(
        f"{CONFLUENCE_BASE_URL}/rest/api/content/{page_id}",
        params={"expand": "body.storage,version,space,ancestors"},
        auth=auth,
        headers=headers,
        timeout=15,
    )
    resp.raise_for_status()
    page = resp.json()

    # HTML içeriği ham metne dönüştür (basit strip)
    raw_html = page.get("body", {}).get("storage", {}).get("value", "")
    text = _strip_html(raw_html)

    return {
        "id": page["id"],
        "title": page["title"],
        "space": page.get("space", {}).get("key", ""),
        "last_modified": page.get("version", {}).get("when", ""),
        "url": f"{CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId={page['id']}",
        "content": text[:8000],  # token limitini aşmamak için kırp
    }


def list_space_pages(space_key: str, title_contains: str = "", limit: int = 20) -> dict:
    """Belirli bir space içindeki sayfaları listeler."""
    params = {
        "spaceKey": space_key,
        "limit": limit,
        "expand": "version",
        "orderby": "modified desc",
    }
    if title_contains:
        params["title"] = title_contains

    resp = requests.get(
        f"{CONFLUENCE_BASE_URL}/rest/api/content",
        params=params,
        auth=auth,
        headers=headers,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    pages = []
    for page in data.get("results", []):
        pages.append({
            "id": page["id"],
            "title": page["title"],
            "last_modified": page.get("version", {}).get("when", ""),
            "url": f"{CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId={page['id']}",
        })
    return {"space": space_key, "total": len(pages), "pages": pages}


def _strip_html(html: str) -> str:
    """HTML etiketlerini kaldırır, okunabilir metin döndürür."""
    import re
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ===========================================================================
# Tool tanımları (Claude için JSON schema)
# ===========================================================================

TOOLS = [
    {
        "name": "search_confluence_pages",
        "description": (
            "Confluence'ta anahtar kelimeyle sayfa arar. "
            "Haftalık gündem, toplantı notları, kritik konular gibi içerikleri bulmak için kullan. "
            "Son 14 günün sayfalarını döndürür."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Arama sorgusu (Türkçe veya İngilizce anahtar kelimeler)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maksimum sonuç sayısı (varsayılan 10)",
                    "default": 10,
                },
                "space_key": {
                    "type": "string",
                    "description": "Aramayı belirli bir Confluence space ile sınırla (opsiyonel)",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_page_content",
        "description": "Bir Confluence sayfasının tam içeriğini getirir. page_id ile çağır.",
        "input_schema": {
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "Confluence sayfa ID'si",
                },
            },
            "required": ["page_id"],
        },
    },
    {
        "name": "list_space_pages",
        "description": "Belirli bir Confluence space'indeki son sayfaları listeler.",
        "input_schema": {
            "type": "object",
            "properties": {
                "space_key": {
                    "type": "string",
                    "description": "Space anahtarı (örn: 'HR', 'TECH', 'MGMT')",
                },
                "title_contains": {
                    "type": "string",
                    "description": "Başlıkta aranacak kelime (opsiyonel)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maksimum sayfa sayısı (varsayılan 20)",
                    "default": 20,
                },
            },
            "required": ["space_key"],
        },
    },
]


# ===========================================================================
# Tool çalıştırıcı
# ===========================================================================

def execute_tool(name: str, tool_input: dict) -> str:
    try:
        if name == "search_confluence_pages":
            result = search_confluence_pages(
                query=tool_input["query"],
                limit=tool_input.get("limit", 10),
                space_key=tool_input.get("space_key", CONFLUENCE_SPACE_KEY),
            )
        elif name == "get_page_content":
            result = get_page_content(page_id=tool_input["page_id"])
        elif name == "list_space_pages":
            result = list_space_pages(
                space_key=tool_input["space_key"],
                title_contains=tool_input.get("title_contains", ""),
                limit=tool_input.get("limit", 20),
            )
        else:
            result = {"error": f"Bilinmeyen araç: {name}"}
        return json.dumps(result, ensure_ascii=False)
    except requests.HTTPError as e:
        return json.dumps({"error": f"HTTP {e.response.status_code}: {e.response.text[:300]}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ===========================================================================
# Ana Agent döngüsü
# ===========================================================================

SYSTEM_PROMPT = """Sen bir kurumsal asistansın. Görevin Confluence sunucusundaki haftalık kritik gündemleri bulup özetlemek.

Adımların:
1. "haftalık gündem", "weekly agenda", "toplantı", "meeting", "kritik", "action item" gibi terimlerle Confluence'ta ara.
2. Bulunan sayfaların içeriklerini oku.
3. Önemsiz veya ilgisiz sayfaları filtrele.
4. Bulguları şu formatta Türkçe özetle:

## Haftalık Kritik Gündem Özeti — {tarih}

### Öne Çıkan Konular
- ...

### Departman / Proje Bazlı Gündemler
| Alan | Konu | Sayfa |
|------|------|-------|
| ...  | ...  | ...   |

### Aksiyon Kalemleri
- [ ] ...

### Notlar
- ...

Eksik bilgi varsa kullanıcıya belirt. Yalnızca Confluence'tan edindiğin gerçek bilgileri yaz."""


def run_agent(user_prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    messages = [{"role": "user", "content": user_prompt}]

    print(f"\n[Agent başlatılıyor — {datetime.now().strftime('%H:%M:%S')}]\n")

    while True:
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=8192,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        ) as stream:
            response = stream.get_final_message()

        # Araç çağrısı yoksa bitti
        if response.stop_reason == "end_turn":
            final_text = next(
                (b.text for b in response.content if b.type == "text"), ""
            )
            return final_text

        # Araçları çalıştır
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  → {block.name}({json.dumps(block.input, ensure_ascii=False)[:120]})")
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        # Mesaj geçmişini güncelle
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})


# ===========================================================================
# Giriş noktası
# ===========================================================================

if __name__ == "__main__":
    today = datetime.now().strftime("%d %B %Y")
    prompt = (
        f"Bugün {today}. Confluence sunucusunda bu haftaya ait kritik gündemleri, "
        "toplantı notlarını ve aksiyon kalemlerini bul. Hepsini özetle."
    )

    summary = run_agent(prompt)
    print("\n" + "=" * 70)
    print(summary)
    print("=" * 70)
