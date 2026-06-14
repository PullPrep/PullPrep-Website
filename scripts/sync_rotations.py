import os
import re
import json
import requests
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "src" / "lib" / "rotations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Predefined fallback profiles in case GitHub requests fail or are blocked
FALLBACK_PROFILES = {
    "demonhunter_havoc": {
        "class": "DemonHunter",
        "spec": "Havoc",
        "coreSpells": [
            { "id": 191427, "name": "Metamorphosis" },
            { "id": 198013, "name": "Eye Beam" },
            { "id": 188499, "name": "Blade Dance" },
            { "id": 162794, "name": "Chaos Strike" }
        ],
        "cooldowns": [191427],
        "interrupts": [183752],
        "defensives": [198529, 191427],
        "healthRecovery": [5512, 191380],
        "apl": [
            { "spellId": 191427, "name": "Metamorphosis", "condition": "is_opener" },
            { "spellId": 198013, "name": "Eye Beam", "condition": "off_cooldown" },
            { "spellId": 188499, "name": "Blade Dance", "condition": "off_cooldown" },
            { "spellId": 162794, "name": "Chaos Strike", "condition": "always" }
        ]
    },
    "demonhunter_vengeance": {
        "class": "DemonHunter",
        "spec": "Vengeance",
        "coreSpells": [
            { "id": 187827, "name": "Metamorphosis" },
            { "id": 212084, "name": "Fel Devastation" },
            { "id": 228477, "name": "Soul Cleave" },
            { "id": 247454, "name": "Spirit Bomb" },
            { "id": 207407, "name": "Soul Carver" },
            { "id": 203720, "name": "Demon Spikes" },
            { "id": 204021, "name": "Fiery Brand" },
            { "id": 227084, "name": "Fracture" },
            { "id": 225919, "name": "Shear" }
        ],
        "cooldowns": [187827, 212084, 204021],
        "interrupts": [202137, 183752],
        "defensives": [187827, 203720, 204021],
        "healthRecovery": [5512, 191380, 228477],
        "apl": [
            { "spellId": 204021, "name": "Fiery Brand", "condition": "off_cooldown" },
            { "spellId": 187827, "name": "Metamorphosis", "condition": "off_cooldown" },
            { "spellId": 212084, "name": "Fel Devastation", "condition": "off_cooldown" },
            { "spellId": 247454, "name": "Spirit Bomb", "condition": "off_cooldown" },
            { "spellId": 207407, "name": "Soul Carver", "condition": "off_cooldown" },
            { "spellId": 228477, "name": "Soul Cleave", "condition": "off_cooldown" },
            { "spellId": 227084, "name": "Fracture", "condition": "always" },
            { "spellId": 225919, "name": "Shear", "condition": "always" }
        ]
    }
}

# Spell name to ID map to parse raw text SimC profiles
SPELL_NAME_TO_ID = {
    "metamorphosis": 191427,
    "eye_beam": 198013,
    "blade_dance": 188499,
    "death_sweep": 188499,
    "annihilation": 162794,
    "chaos_strike": 162794,
    "fel_devastation": 212084,
    "soul_cleave": 228477,
    "spirit_bomb": 247454,
    "soul_carver": 207407,
    "demon_spikes": 203720,
    "fiery_brand": 204021,
    "fracture": 227084,
    "shear": 225919,
    "disrupt": 183752,
    "sigil_of_silence": 202137,
    "blur": 198529
}

def parse_simc_profile(content):
    """Parses raw simc profile text into simplified APL JSON."""
    apl = []
    core_spells = set()
    
    # Extract action lines: actions+=/action_name,if=condition
    # or actions.rotation+=/action_name
    pattern = re.compile(r"actions(?:\.\w+)?\+?=/([\w_]+)(?:,if=(.+))?")
    
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
            
        match = pattern.search(line)
        if match:
            spell_name = match.group(1)
            condition = match.group(2) or "always"
            
            # Map spell name to ID
            norm_name = spell_name.lower()
            spell_id = SPELL_NAME_TO_ID.get(norm_name)
            
            if spell_id:
                core_spells.add(spell_id)
                apl.append({
                    "spellId": spell_id,
                    "name": spell_name.replace("_", " ").title(),
                    "condition": condition
                })
                
    return apl, list(core_spells)

def sync_spec(class_name, spec_name, tier="Tier30"):
    """Fetches a profile from GitHub and builds the local JSON."""
    filename = f"{tier}_{class_name.replace(' ', '')}_{spec_name.replace(' ', '')}.simc"
    url = f"https://raw.githubusercontent.com/simulationcraft/simc/major/profiles/{tier}/{filename}"
    
    local_key = f"{class_name.lower().replace(' ', '')}_{spec_name.lower().replace(' ', '')}"
    output_path = OUTPUT_DIR / f"{local_key}.json"
    
    print(f"Fetching {class_name} {spec_name} rotation from SimC GitHub...")
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        
        apl, core_ids = parse_simc_profile(res.text)
        
        # Build coreSpells list from names
        core_spells_list = []
        for sid in core_ids:
            name = next((k for k, v in SPELL_NAME_TO_ID.items() if v == sid), "Unknown")
            core_spells_list.append({
                "id": sid,
                "name": name.replace("_", " ").title()
            })
            
        profile_json = {
            "class": class_name,
            "spec": spec_name,
            "coreSpells": core_spells_list,
            "cooldowns": [sid for sid in core_ids if sid in [191427, 212084, 204021]],
            "interrupts": [sid for sid in core_ids if sid in [183752, 202137]],
            "defensives": [sid for sid in core_ids if sid in [198529, 191427, 203720]],
            "healthRecovery": [5512, 191380],
            "apl": apl
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(profile_json, f, indent=2)
        print(f"[+] Successfully synced and wrote {output_path}")
        return True
        
    except Exception as e:
        print(f"[!] Network sync failed or profile not found: {e}")
        # Fallback to local high-quality preset
        if local_key in FALLBACK_PROFILES:
            print(f"[-] Applying local high-quality fallback for {local_key}...")
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(FALLBACK_PROFILES[local_key], f, indent=2)
            print(f"[+] Wrote fallback profile to {output_path}")
            return True
        else:
            print(f"[x] Error: No fallback profile config for {local_key}")
            return False

def main():
    specs = [
        ("Demon Hunter", "Havoc"),
        ("Demon Hunter", "Vengeance")
    ]
    
    success = 0
    for class_name, spec_name in specs:
        if sync_spec(class_name, spec_name):
            success += 1
            
    print(f"Sync complete. Generated {success}/{len(specs)} spec rotations.")

if __name__ == "__main__":
    main()
