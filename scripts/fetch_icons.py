import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load env variables from root directory
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / ".env")

CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    print("Error: Missing BLIZZARD_CLIENT_ID or BLIZZARD_CLIENT_SECRET in .env file.")
    sys.exit(1)

PUBLIC_ICONS_DIR = ROOT_DIR / "public" / "icons"
PUBLIC_ICONS_DIR.mkdir(parents=True, exist_ok=True)

TOKEN_URL = "https://oauth.battle.net/token"
API_BASE_URL = "https://us.api.blizzard.com"

def get_access_token():
    try:
        res = requests.post(
            TOKEN_URL,
            data={"grant_type": "client_credentials"},
            auth=(CLIENT_ID, CLIENT_SECRET),
            timeout=10
        )
        res.raise_for_status()
        return res.json()["access_token"]
    except Exception as e:
        print(f"Failed to obtain Blizzard access token: {e}")
        sys.exit(1)

def download_icon(spell_id, token):
    output_path = PUBLIC_ICONS_DIR / f"{spell_id}.jpg"
    if output_path.exists():
        return True

    headers = {
        "Authorization": f"Bearer {token}",
        "Battlenet-Namespace": "static-us"
    }

    try:
        # 1. Fetch spell details
        spell_url = f"{API_BASE_URL}/data/wow/spell/{spell_id}"
        res = requests.get(spell_url, headers=headers, params={"locale": "en_US"}, timeout=10)
        if res.status_code == 404:
            print(f"[!] Spell {spell_id} not found in Blizzard database.")
            return False
        res.raise_for_status()
        spell_data = res.json()

        # 2. Get media reference href
        media_href = spell_data.get("media", {}).get("key", {}).get("href")
        if not media_href:
            print(f"[!] No media assets reference found for spell {spell_id}.")
            return False

        # 3. Fetch media details (contains raw icon image URLs)
        media_res = requests.get(media_href, headers=headers, timeout=10)
        media_res.raise_for_status()
        media_data = media_res.json()

        assets = media_data.get("assets", [])
        icon_url = None
        for asset in assets:
            if asset.get("key") == "icon":
                icon_url = asset.get("value")
                break
        if not icon_url and assets:
            icon_url = assets[0].get("value")

        if not icon_url:
            print(f"[!] No icon URL found in media assets for spell {spell_id}.")
            return False

        # 4. Download and save the image
        img_res = requests.get(icon_url, timeout=15)
        img_res.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(img_res.content)
        print(f"[+] Downloaded icon for spell {spell_id} -> public/icons/{spell_id}.jpg")
        return True
    except Exception as e:
        print(f"[x] Error processing spell {spell_id}: {e}")
        return False

def main():
    token = get_access_token()
    
    # Scan all rotations JSONs for spell IDs
    spell_ids = set()
    rotations_dir = ROOT_DIR / "src" / "lib" / "rotations"
    if rotations_dir.exists():
        for path in rotations_dir.glob("*.json"):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                    # 1. Add coreSpells
                    for s in data.get("coreSpells", []):
                        spell_ids.add(s["id"])
                    
                    # 2. Add category IDs
                    for cat in ["cooldowns", "interrupts", "defensives", "healthRecovery"]:
                        for sid in data.get(cat, []):
                            spell_ids.add(sid)
                            
                    # 3. Add APL IDs
                    for step in data.get("apl", []):
                        if "spellId" in step:
                            spell_ids.add(step["spellId"])
            except Exception as e:
                print(f"Failed to parse {path.name}: {e}")
                
    # Also include standard icons for maps and alternates
    extra_ids = [263642, 203782, 5512, 191380]
    for eid in extra_ids:
        spell_ids.add(eid)

    spell_ids_list = sorted(list(spell_ids))
    print(f"Requesting access to Blizzard API to download {len(spell_ids_list)} spell icons...")
    success = 0
    for sid in spell_ids_list:
        if download_icon(sid, token):
            success += 1
            
    print(f"Download complete. Processed {success}/{len(spell_ids_list)} icons successfully.")

if __name__ == "__main__":
    main()
