import os
import sys
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
        print(f"[-] Icon for spell {spell_id} already exists. Skipping.")
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
    
    # List of Havoc + Vengeance Demon Hunter spell IDs
    spell_ids = [
        # Havoc Spells
        162794, 188499, 198013, 191427,
        # Vengeance Spells
        187827, 212084, 228477, 227084, 225919, 204596, 247454, 204021,
        217832, 183752, 202137, 207684, 202138, 203720, 189110,
        # Canonical spell IDs for API resolution (Fracture & Shear)
        263642, 203782,
        # Soul Carver & Torment
        207407, 185245
    ]
    
    print(f"Requesting access to Blizzard API to download {len(spell_ids)} spell icons...")
    success = 0
    for sid in spell_ids:
        if download_icon(sid, token):
            success += 1
            
    print(f"Download complete. Processed {success}/{len(spell_ids)} icons successfully.")

if __name__ == "__main__":
    main()
