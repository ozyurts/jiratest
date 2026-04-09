"""
Confluence Weekly Agenda Summarizer — Claude Agent SDK versiyonu
Anthropic API key gerekmez, Claude Code CLI oturumu kullanilir.

Kurulum:
  pip install claude-agent-sdk requests python-dotenv

Calistirma:
  python confluence_agent_sdk.py
"""

import os
import re
import sys
import json
import anyio
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Windows terminal Turkce/emoji encoding sorunu
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from claude_agent_sdk import (
    tool,
    create_sdk_mcp_server,
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Agent SDK kendi Claude Code oturumunu kullanir, ANTHROPIC_API_KEY'e gerek yok.
# Yanlis bir key varsa CLI'i karmastirir, temizliyoruz.
os.environ.pop("ANTHROPIC_API_KEY", None)

CONFLUENCE_BASE_URL = os.environ["CONFLUENCE_BASE_URL"].rstrip("/")
CONFLUENCE_API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]
CONFLUENCE_USERNAME = os.getenv("CONFLUENCE_USERNAME", "")
CONFLUENCE_SPACE_KEY = os.getenv("CONFLUENCE_SPACE_KEY", "")
TEAMS_WEBHOOK_URL = os.getenv("TEAMS_WEBHOOK_URL", "")

# Auth: PAT ise Bearer, degilse Basic
if CONFLUENCE_USERNAME:
    from requests.auth import HTTPBasicAuth
    _auth = HTTPBasicAuth(CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN)
    _headers = {"Accept": "application/json"}
else:
    _auth = None
    _headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {CONFLUENCE_API_TOKEN}",
    }


# ---------------------------------------------------------------------------
# Yardimci
# ---------------------------------------------------------------------------

def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    for ent, ch in [("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"),
                    ("&gt;", ">"), ("&#39;", "'"), ("&quot;", '"')]:
        text = text.replace(ent, ch)
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------------------
# Confluence araclari (Agent SDK @tool decorator)
# ---------------------------------------------------------------------------

@tool(
    "search_confluence",
    "Confluence'ta anahtar kelimeyle sayfa arar. Son 14 gunun sayfalarini dondurur.",
    {
        "query": str,
        "limit": int,
        "space_key": str,
    },
)
async def search_confluence(args):
    query = args["query"]
    limit = args.get("limit", 10)
    space_key = args.get("space_key", CONFLUENCE_SPACE_KEY)

    since = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d")
    cql = f'text ~ "{query}" AND type = "page" AND lastModified >= "{since}"'
    if space_key:
        cql += f' AND space.key = "{space_key}"'
    cql += " ORDER BY lastModified DESC"

    try:
        resp = requests.get(
            f"{CONFLUENCE_BASE_URL}/rest/api/content/search",
            params={"cql": cql, "limit": limit, "expand": "version,space"},
            auth=_auth, headers=_headers, timeout=15,
        )
        resp.raise_for_status()
        results = []
        for p in resp.json().get("results", []):
            results.append({
                "id": p["id"],
                "title": p["title"],
                "space": p.get("space", {}).get("key", ""),
                "last_modified": p.get("version", {}).get("when", "")[:10],
                "url": f"{CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId={p['id']}",
            })
        return {"content": [{"type": "text", "text": json.dumps({"total": len(results), "pages": results}, ensure_ascii=False)}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}


@tool(
    "get_page_content",
    "Bir Confluence sayfasinin tam icerigini getirir.",
    {"page_id": str},
)
async def get_page_content(args):
    page_id = args["page_id"]
    try:
        resp = requests.get(
            f"{CONFLUENCE_BASE_URL}/rest/api/content/{page_id}",
            params={"expand": "body.storage,version,space"},
            auth=_auth, headers=_headers, timeout=15,
        )
        resp.raise_for_status()
        p = resp.json()
        content = _strip_html(p.get("body", {}).get("storage", {}).get("value", ""))
        result = {
            "id": p["id"],
            "title": p["title"],
            "space": p.get("space", {}).get("key", ""),
            "last_modified": p.get("version", {}).get("when", "")[:10],
            "url": f"{CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId={p['id']}",
            "content": content[:6000],
        }
        return {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}


@tool(
    "list_space_pages",
    "Belirli bir Confluence space'indeki en son guncellenen sayfalari listeler.",
    {"space_key": str, "limit": int},
)
async def list_space_pages(args):
    space_key = args["space_key"]
    limit = args.get("limit", 15)
    try:
        cql = f'space.key = "{space_key}" AND type = "page" ORDER BY lastModified DESC'
        resp = requests.get(
            f"{CONFLUENCE_BASE_URL}/rest/api/content/search",
            params={"cql": cql, "limit": limit, "expand": "version"},
            auth=_auth, headers=_headers, timeout=15,
        )
        resp.raise_for_status()
        pages = []
        for p in resp.json().get("results", []):
            pages.append({
                "id": p["id"],
                "title": p["title"],
                "last_modified": p.get("version", {}).get("when", "")[:10],
                "url": f"{CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId={p['id']}",
            })
        return {"content": [{"type": "text", "text": json.dumps({"space": space_key, "pages": pages}, ensure_ascii=False)}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}


# ---------------------------------------------------------------------------
# Ana agent
# ---------------------------------------------------------------------------

def send_to_teams(summary: str):
    """Ozeti Teams kanalina Power Automate webhook ile gonderir."""
    if not TEAMS_WEBHOOK_URL:
        return

    today = datetime.now().strftime("%d.%m.%Y")

    payload = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": f"Haftalik Gundem Ozeti — {today}",
                            "weight": "Bolder",
                            "size": "Large",
                            "wrap": True,
                        },
                        {
                            "type": "TextBlock",
                            "text": summary,
                            "wrap": True,
                            "spacing": "Medium",
                        },
                    ],
                },
            }
        ],
    }

    try:
        resp = requests.post(
            TEAMS_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        if resp.status_code in (200, 202):
            print("\n[Teams] Ozet basariyla kanala gonderildi.")
        else:
            # Bazi Power Automate webhook'lari adaptive card kabul etmez, sade metin dene
            fallback = {"text": f"**Haftalik Gundem Ozeti — {today}**\n\n{summary}"}
            resp2 = requests.post(
                TEAMS_WEBHOOK_URL,
                json=fallback,
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
            if resp2.status_code in (200, 202):
                print("\n[Teams] Ozet basariyla kanala gonderildi (fallback).")
            else:
                print(f"\n[Teams] Gonderilemedi: HTTP {resp2.status_code} — {resp2.text[:200]}")
    except Exception as e:
        print(f"\n[Teams] Hata: {e}")


SYSTEM_PROMPT = """Sen Pegasus BT ekibinin kurumsal asistanisin.
Gorev: Confluence'taki haftalik kritik gundemleri bul ve Turkce ozetle.

Adimlar:
1. "haftalik gundem", "weekly", "highlight", "lowlight" gibi terimlerle ara.
2. OVKC ve BTS space'lerindeki son sayfalari listele ve iceriklerini oku.
3. Ilgisiz sayfalari filtrele.
4. Asagidaki formatta ozetle:

## Haftalik Gundem Ozeti — {tarih}

### One Cikan Konular
- ...

### Tamamlanan Isler
- ...

### Devam Eden Projeler
| Proje | Durum | Sorumlu |
|-------|-------|---------|

### Aksiyon Kalemleri
- [ ] Aksiyon — Sorumlu — Deadline

### Riskler / Engeller
- ...

Yalnizca Confluence'tan edinilen gercek bilgileri yaz."""


async def main():
    today = datetime.now().strftime("%d %B %Y")
    prompt = (
        f"Bugun {today}. Confluence'ta bu haftaya ait haftalik gundem sayfalarini bul "
        "(ozellikle OVKC ve BTS space'lerinde). Iceriklerini oku ve ozetle."
    )

    server = create_sdk_mcp_server(
        "confluence-tools",
        tools=[search_confluence, get_page_content, list_space_pages],
    )

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        mcp_servers={"confluence": server},
        permission_mode="bypassPermissions",
        max_turns=20,
    )

    print(f"\n[Agent baslatiliyor — {datetime.now().strftime('%H:%M:%S')}]")
    print("=" * 70)

    summary_parts = []

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock) and block.text.strip():
                        print(block.text, end="", flush=True)
                        summary_parts.append(block.text)

    full_summary = "".join(summary_parts)
    print("\n" + "=" * 70)

    # Teams'e gonder
    if TEAMS_WEBHOOK_URL and full_summary:
        send_to_teams(full_summary)


if __name__ == "__main__":
    anyio.run(main)
