import os
import re
import json
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / ".env")

OUTPUT_DIR = ROOT_DIR / "src" / "lib" / "rotations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CACHE_FILE = ROOT_DIR / "data" / "spell_cache.json"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")

# Predefined Spell Name to ID Map for major active class abilities (Dragonflight & Midnight)
SPELL_NAME_TO_ID = {
    # Death Knight
    "marrowrend": 195182, "death_strike": 49998, "heart_strike": 206930, "blood_boil": 50842, "death_and_decay": 43265,
    "obliterate": 49020, "howling_blast": 49184, "frost_strike": 49143, "remorseless_winter": 196770, "pillar_of_frost": 51271,
    "festering_strike": 85948, "scourge_strike": 55090, "death_coil": 47541, "outbreak": 77575, "apocalypse": 275699,
    "dark_transformation": 63560, "mind_freeze": 47528, "asphyxiate": 108194, "icebound_fortitude": 48792, "anti_magic_shell": 48707,
    # Demon Hunter
    "metamorphosis": 191427, "eye_beam": 198013, "blade_dance": 188499, "death_sweep": 188499, "chaos_strike": 162794,
    "annihilation": 162794, "fel_devastation": 212084, "soul_cleave": 228477, "spirit_bomb": 247454, "soul_carver": 207407,
    "demon_spikes": 203720, "fiery_brand": 204021, "fracture": 227084, "shear": 225919, "disrupt": 183752, "sigil_of_silence": 202137,
    "blur": 198529, "sigil_of_flame": 204596,
    # Druid
    "starsurge": 78674, "starfire": 190984, "wrath": 5176, "sunfire": 93402, "moonfire": 8921, "celestial_alignment": 194223,
    "incarnation_chosen_of_elune": 102560, "shred": 5221, "rake": 1822, "rip": 1079, "ferocious_bite": 22568, "berserk": 106951,
    "mangle": 33917, "thrash": 106832, "ironfur": 192081, "frenzied_regeneration": 22842, "barkskin": 22812, "survival_instincts": 61336,
    "rejuvenation": 774, "regrowth": 8936, "wild_growth": 48438, "lifebloom": 33763, "swiftmend": 18562, "skull_bash": 106839,
    # Evoker
    "living_flame": 361469, "disintegrate": 356995, "pyre": 357211, "fire_breath": 357208, "dragonrage": 375087,
    "ebon_might": 395152, "upheaval": 396286, "breath_of_eons": 403631, "echo": 364343, "reversion": 366155,
    "dream_breath": 355936, "spiritbloom": 367222, "quell": 351338, "obsidian_scales": 363916,
    # Hunter
    "barbed_shot": 217200, "cobra_shot": 193455, "kill_command": 34026, "bestial_wrath": 19574, "multi_shot": 2643,
    "aimed_shot": 19434, "rapid_fire": 257044, "arcane_shot": 185358, "trueshot": 193526, "raptor_strike": 186270,
    "mongoose_bite": 259387, "wildfire_bomb": 259489, "serpent_sting": 271788, "coordinated_assault": 266779,
    "counter_shot": 147362, "muzzle": 187707, "exhilaration": 109304, "aspect_of_the_turtle": 186265,
    # Mage
    "arcane_blast": 30451, "arcane_barrage": 44425, "arcane_missiles": 5143, "evocation": 12051, "arcane_surge": 365350,
    "fireball": 133, "pyroblast": 11366, "fire_blast": 108853, "phoenix_flames": 257541, "combustion": 11129, "scorch": 2948,
    "frostbolt": 116, "ice_lance": 30455, "flurry": 44614, "frozen_orb": 84714, "icy_veins": 12472, "counterspell": 2139,
    "ice_block": 45438, "mirror_image": 55342,
    # Monk
    "keg_smash": 121253, "tiger_palm": 100780, "blackout_kick": 100784, "breath_of_fire": 115181, "purifying_brew": 119582,
    "celestial_brew": 322507, "rising_sun_kick": 107428, "fists_of_fury": 113656, "spinning_crane_kick": 101546,
    "whirling_dragon_punch": 152175, "renewing_mist": 115151, "vivify": 116670, "enveloping_mist": 124682,
    "spear_hand_strike": 116705, "fortifying_brew": 115203, "diffuse_magic": 122783,
    # Paladin
    "judgment": 20271, "crusader_strike": 35395, "hammer_of_wrath": 24275, "blade_of_justice": 184575, "templars_verdict": 85256,
    "final_verdict": 383328, "divine_storm": 53385, "wake_of_ashes": 255937, "avenging_wrath": 31884, "final_reckoning": 343721,
    "shield_of_the_righteous": 53600, "consecration": 26573, "avengers_shield": 31935, "hammer_of_the_righteous": 53595,
    "holy_shock": 20473, "flash_of_light": 19750, "holy_light": 82326, "word_of_glory": 85673, "light_of_dawn": 85222,
    "rebuke": 96231, "divine_shield": 642, "ardent_defender": 31850, "guardian_of_ancient_kings": 86659,
    # Priest
    "mind_blast": 8092, "shadow_word_pain": 589, "vampiric_touch": 34914, "devouring_plague": 32379, "void_torrent": 263165,
    "dark_ascension": 391109, "void_eruption": 228260, "penance": 47540, "smite": 585, "power_word_shield": 17,
    "shadow_word_death": 32379, "flash_heal": 2061, "heal": 2060, "prayer_of_mending": 33076, "silence": 15487,
    "desperate_prayer": 19236, "dispersion": 47585, "power_word_radiance": 194509,
    # Rogue
    "mutilate": 1329, "envenom": 32645, "rupture": 1943, "garrote": 703, "shiv": 5938, "deathmark": 385627,
    "sinister_strike": 193315, "pistol_shot": 185763, "dispatch": 2098, "roll_the_bones": 193356, "adrenaline_rush": 13750,
    "between_the_eyes": 199804, "shadowstrike": 185438, "backstab": 53, "eviscerate": 196819, "shadow_dance": 185313,
    "symbols_of_death": 212283, "kick": 1766, "cloak_of_shadows": 31224, "feint": 1966, "evasion": 5277,
    # Shaman
    "lightning_bolt": 188196, "lava_burst": 51505, "earth_shock": 8042, "earthquake": 61882, "stormstrike": 17364,
    "windstrike": 115356, "lava_lash": 60103, "crash_lightning": 187874, "ice_strike": 342240, "feral_spirit": 51533,
    "riptide": 61295, "healing_wave": 77472, "healing_rain": 73920, "chain_heal": 1064, "unleash_life": 73103,
    "flame_shock": 188389, "wind_shear": 57994, "astral_shift": 108271, "primordial_wave": 375982,
    # Warlock
    "agony": 980, "corruption": 172, "unstable_affliction": 30108, "seed_of_corruption": 27243, "malefic_rapture": 319830,
    "shadow_bolt": 686, "drain_soul": 198590, "summon_demonic_tyrant": 265187, "hand_of_guldan": 105174, "call_dreadstalkers": 104316,
    "implosion": 196277, "incinerate": 29722, "immolate": 348, "conflagrate": 17962, "chaos_bolt": 116858, "rain_of_fire": 5740,
    "spell_lock": 19647, "unending_resolve": 104773, "dark_pact": 108416,
    # Warrior
    "charge": 100, "mortal_strike": 12294, "overpower": 7384, "colossus_smash": 167105, "execute": 5308, "slam": 1464,
    "bladestorm": 227847, "bloodthirst": 23881, "raging_blow": 85288, "rampage": 184367, "odyns_fury": 385059,
    "ravager": 228287, "recklessness": 1719, "avatar": 107574, "shield_slam": 23922, "thunder_clap": 6343,
    "revenge": 6572, "devastate": 20243, "shield_block": 2565, "ignore_pain": 190456, "pummel": 6552,
    "shield_wall": 871, "spell_reflection": 23920
}

# Dynamic list of spec JSONs to generate from SimC
BASE_SPECS = [
    # Death Knight
    ("Death Knight", "Blood", "MID1_Death_Knight_Blood.simc"),
    ("Death Knight", "Frost", "MID1_Death_Knight_Frost.simc"),
    ("Death Knight", "Unholy", "MID1_Death_Knight_Unholy.simc"),
    # Demon Hunter
    ("Demon Hunter", "Havoc", "MID1_Demon_Hunter_Havoc.simc"),
    ("Demon Hunter", "Vengeance", "MID1_Demon_Hunter_Vengeance.simc"),
    # Druid
    ("Druid", "Balance", "MID1_Druid_Balance.simc"),
    ("Druid", "Feral", "MID1_Druid_Feral.simc"),
    ("Druid", "Guardian", "MID1_Druid_Guardian.simc"),
    # Evoker
    ("Evoker", "Devastation", "MID1_Evoker_Devastation.simc"),
    # Hunter
    ("Hunter", "Beast Mastery", "MID1_Hunter_Beast_Mastery.simc"),
    ("Hunter", "Marksmanship", "MID1_Hunter_Marksmanship.simc"),
    ("Hunter", "Survival", "MID1_Hunter_Survival.simc"),
    # Mage
    ("Mage", "Arcane", "MID1_Mage_Arcane.simc"),
    ("Mage", "Fire", "MID1_Mage_Fire.simc"),
    ("Mage", "Frost", "MID1_Mage_Frost.simc"),
    # Monk
    ("Monk", "Brewmaster", "MID1_Monk_Brewmaster.simc"),
    ("Monk", "Windwalker", "MID1_Monk_Windwalker.simc"),
    # Paladin
    ("Paladin", "Protection", "MID1_Paladin_Protection.simc"),
    ("Paladin", "Retribution", "MID1_Paladin_Retribution.simc"),
    # Priest
    ("Priest", "Shadow", "MID1_Priest_Shadow.simc"),
    # Rogue
    ("Rogue", "Assassination", "MID1_Rogue_Assassination.simc"),
    ("Rogue", "Outlaw", "MID1_Rogue_Outlaw.simc"),
    ("Rogue", "Subtlety", "MID1_Rogue_Subtlety.simc"),
    # Shaman
    ("Shaman", "Elemental", "MID1_Shaman_Elemental.simc"),
    ("Shaman", "Enhancement", "MID1_Shaman_Enhancement.simc"),
    # Warlock
    ("Warlock", "Affliction", "MID1_Warlock_Affliction.simc"),
    ("Warlock", "Demonology", "MID1_Warlock_Demonology.simc"),
    ("Warlock", "Destruction", "MID1_Warlock_Destruction.simc"),
    # Warrior
    ("Warrior", "Arms", "MID1_Warrior_Arms.simc"),
    ("Warrior", "Fury", "MID1_Warrior_Fury.simc"),
    ("Warrior", "Protection", "MID1_Warrior_Protection.simc"),
]

# High-quality fallback presets for Healer and Support specs not in SimC MID1
HEALER_AND_SUPPORT_PRESETS = {
    "druid_restoration": {
        "class": "Druid",
        "spec": "Restoration",
        "coreSpells": [
            { "id": 774, "name": "Rejuvenation" },
            { "id": 8936, "name": "Regrowth" },
            { "id": 48438, "name": "Wild Growth" },
            { "id": 33763, "name": "Lifebloom" },
            { "id": 18562, "name": "Swiftmend" },
            { "id": 106839, "name": "Skull Bash" },
            { "id": 22812, "name": "Barkskin" }
        ],
        "cooldowns": [48438, 18562],
        "interrupts": [106839],
        "defensives": [22812],
        "healthRecovery": [8936, 18562],
        "apl": [
            { "spellId": 33763, "name": "Lifebloom", "condition": "always" },
            { "spellId": 774, "name": "Rejuvenation", "condition": "always" },
            { "spellId": 18562, "name": "Swiftmend", "condition": "off_cooldown" },
            { "spellId": 48438, "name": "Wild Growth", "condition": "off_cooldown" },
            { "spellId": 8936, "name": "Regrowth", "condition": "always" }
        ]
    },
    "evoker_preservation": {
        "class": "Evoker",
        "spec": "Preservation",
        "coreSpells": [
            { "id": 364343, "name": "Echo" },
            { "id": 366155, "name": "Reversion" },
            { "id": 355936, "name": "Dream Breath" },
            { "id": 367222, "name": "Spiritbloom" },
            { "id": 361469, "name": "Living Flame" },
            { "id": 351338, "name": "Quell" },
            { "id": 363916, "name": "Obsidian Scales" }
        ],
        "cooldowns": [355936, 367222],
        "interrupts": [351338],
        "defensives": [363916],
        "healthRecovery": [367222, 361469],
        "apl": [
            { "spellId": 366155, "name": "Reversion", "condition": "always" },
            { "spellId": 364343, "name": "Echo", "condition": "always" },
            { "spellId": 355936, "name": "Dream Breath", "condition": "off_cooldown" },
            { "spellId": 367222, "name": "Spiritbloom", "condition": "off_cooldown" },
            { "spellId": 361469, "name": "Living Flame", "condition": "always" }
        ]
    },
    "evoker_augmentation": {
        "class": "Evoker",
        "spec": "Augmentation",
        "coreSpells": [
            { "id": 395152, "name": "Ebon Might" },
            { "id": 396286, "name": "Upheaval" },
            { "id": 403631, "name": "Breath of Eons" },
            { "id": 357208, "name": "Fire Breath" },
            { "id": 361469, "name": "Living Flame" },
            { "id": 351338, "name": "Quell" },
            { "id": 363916, "name": "Obsidian Scales" }
        ],
        "cooldowns": [395152, 403631],
        "interrupts": [351338],
        "defensives": [363916],
        "healthRecovery": [361469],
        "apl": [
            { "spellId": 403631, "name": "Breath of Eons", "condition": "off_cooldown" },
            { "spellId": 395152, "name": "Ebon Might", "condition": "off_cooldown" },
            { "spellId": 396286, "name": "Upheaval", "condition": "off_cooldown" },
            { "spellId": 357208, "name": "Fire Breath", "condition": "off_cooldown" },
            { "spellId": 361469, "name": "Living Flame", "condition": "always" }
        ]
    },
    "monk_mistweaver": {
        "class": "Monk",
        "spec": "Mistweaver",
        "coreSpells": [
            { "id": 115151, "name": "Renewing Mist" },
            { "id": 116670, "name": "Vivify" },
            { "id": 124682, "name": "Enveloping Mist" },
            { "id": 107428, "name": "Rising Sun Kick" },
            { "id": 100780, "name": "Tiger Palm" },
            { "id": 116705, "name": "Spear Hand Strike" },
            { "id": 115203, "name": "Fortifying Brew" }
        ],
        "cooldowns": [107428],
        "interrupts": [116705],
        "defensives": [115203],
        "healthRecovery": [116670, 124682],
        "apl": [
            { "spellId": 115151, "name": "Renewing Mist", "condition": "always" },
            { "spellId": 107428, "name": "Rising Sun Kick", "condition": "off_cooldown" },
            { "spellId": 100780, "name": "Tiger Palm", "condition": "always" },
            { "spellId": 124682, "name": "Enveloping Mist", "condition": "always" },
            { "spellId": 116670, "name": "Vivify", "condition": "always" }
        ]
    },
    "paladin_holy": {
        "class": "Paladin",
        "spec": "Holy",
        "coreSpells": [
            { "id": 20473, "name": "Holy Shock" },
            { "id": 19750, "name": "Flash of Light" },
            { "id": 85222, "name": "Light of Dawn" },
            { "id": 85673, "name": "Word of Glory" },
            { "id": 20271, "name": "Judgment" },
            { "id": 35395, "name": "Crusader Strike" },
            { "id": 96231, "name": "Rebuke" },
            { "id": 642, "name": "Divine Shield" }
        ],
        "cooldowns": [20473],
        "interrupts": [96231],
        "defensives": [642],
        "healthRecovery": [19750, 85673],
        "apl": [
            { "spellId": 20473, "name": "Holy Shock", "condition": "off_cooldown" },
            { "spellId": 20271, "name": "Judgment", "condition": "off_cooldown" },
            { "spellId": 35395, "name": "Crusader Strike", "condition": "always" },
            { "spellId": 85222, "name": "Light of Dawn", "condition": "always" },
            { "spellId": 85673, "name": "Word of Glory", "condition": "always" }
        ]
    },
    "priest_discipline": {
        "class": "Priest",
        "spec": "Discipline",
        "coreSpells": [
            { "id": 17, "name": "Power Word: Shield" },
            { "id": 47540, "name": "Penance" },
            { "id": 585, "name": "Smite" },
            { "id": 589, "name": "Shadow Word: Pain" },
            { "id": 8092, "name": "Mind Blast" },
            { "id": 15487, "name": "Silence" },
            { "id": 19236, "name": "Desperate Prayer" },
            { "id": 194509, "name": "Power Word: Radiance" }
        ],
        "cooldowns": [47540, 194509],
        "interrupts": [15487],
        "defensives": [19236],
        "healthRecovery": [47540],
        "apl": [
            { "spellId": 17, "name": "Power Word: Shield", "condition": "always" },
            { "spellId": 589, "name": "Shadow Word: Pain", "condition": "always" },
            { "spellId": 194509, "name": "Power Word: Radiance", "condition": "off_cooldown" },
            { "spellId": 47540, "name": "Penance", "condition": "off_cooldown" },
            { "spellId": 8092, "name": "Mind Blast", "condition": "off_cooldown" },
            { "spellId": 585, "name": "Smite", "condition": "always" }
        ]
    },
    "priest_holy": {
        "class": "Priest",
        "spec": "Holy",
        "coreSpells": [
            { "id": 2061, "name": "Flash Heal" },
            { "id": 2060, "name": "Heal" },
            { "id": 33076, "name": "Prayer of Mending" },
            { "id": 585, "name": "Smite" },
            { "id": 15487, "name": "Silence" },
            { "id": 19236, "name": "Desperate Prayer" }
        ],
        "cooldowns": [33076],
        "interrupts": [15487],
        "defensives": [19236],
        "healthRecovery": [2061, 2060],
        "apl": [
            { "spellId": 33076, "name": "Prayer of Mending", "condition": "off_cooldown" },
            { "spellId": 2061, "name": "Flash Heal", "condition": "always" },
            { "spellId": 2060, "name": "Heal", "condition": "always" },
            { "spellId": 585, "name": "Smite", "condition": "always" }
        ]
    },
    "shaman_restoration": {
        "class": "Shaman",
        "spec": "Restoration",
        "coreSpells": [
            { "id": 61295, "name": "Riptide" },
            { "id": 77472, "name": "Healing Wave" },
            { "id": 73920, "name": "Healing Rain" },
            { "id": 1064, "name": "Chain Heal" },
            { "id": 73103, "name": "Unleash Life" },
            { "id": 188389, "name": "Flame Shock" },
            { "id": 57994, "name": "Wind Shear" },
            { "id": 108271, "name": "Astral Shift" }
        ],
        "cooldowns": [61295, 73920],
        "interrupts": [57994],
        "defensives": [108271],
        "healthRecovery": [77472, 1064],
        "apl": [
            { "spellId": 61295, "name": "Riptide", "condition": "off_cooldown" },
            { "spellId": 73103, "name": "Unleash Life", "condition": "off_cooldown" },
            { "spellId": 73920, "name": "Healing Rain", "condition": "off_cooldown" },
            { "spellId": 188389, "name": "Flame Shock", "condition": "always" },
            { "spellId": 77472, "name": "Healing Wave", "condition": "always" }
        ]
    }
}

def load_cache():
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)

def get_access_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("[!] Missing Blizzard API Credentials. Skipping API spell searches.")
        return None
    try:
        res = requests.post(
            "https://oauth.battle.net/token",
            data={"grant_type": "client_credentials"},
            auth=(CLIENT_ID, CLIENT_SECRET),
            timeout=10
        )
        res.raise_for_status()
        return res.json()["access_token"]
    except Exception as e:
        print(f"[!] Failed to get Blizzard access token: {e}")
        return None

def search_spell_id(spell_name, token, cache):
    normalized_name = spell_name.lower().replace("_", " ").strip()
    if normalized_name in cache:
        return cache[normalized_name]

    # Search local dictionary first
    dict_key = spell_name.lower().replace("_", "")
    for k, v in SPELL_NAME_TO_ID.items():
        if k.replace("_", "") == dict_key:
            cache[normalized_name] = v
            return v

    if not token:
        return None

    print(f"Searching Blizzard API for spell: '{normalized_name}'...")
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Battlenet-Namespace": "static-us"
        }
        res = requests.get(
            "https://us.api.blizzard.com/data/wow/search/spell",
            headers=headers,
            params={
                "locale": "en_US",
                "name.en_US": normalized_name,
                "orderby": "id",
                "_page": 1
            },
            timeout=10
        )
        if res.status_code == 200:
            results = res.json().get("results", [])
            # Find exact match or falls back to first
            exact_id = None
            first_id = None
            for r in results:
                data = r.get("data", {})
                sid = data.get("id")
                name_en = data.get("name", {}).get("en_US", "").lower()
                if not first_id:
                    first_id = sid
                if name_en == normalized_name:
                    exact_id = sid
                    break
            
            resolved_id = exact_id or first_id
            if resolved_id:
                cache[normalized_name] = resolved_id
                print(f"[+] Resolved '{normalized_name}' -> ID {resolved_id}")
                return resolved_id
    except Exception as e:
        print(f"[!] API Search failed for '{normalized_name}': {e}")
    
    return None

def parse_simc_profile_active_spells(content):
    """Extracts all spell names cast inside a SimC profile."""
    spells = []
    # Match strings like actions+=/spell_name or actions.rotation+=/spell_name
    pattern = re.compile(r"actions(?:\.\w+)?\+?=/([\w_]+)")
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = pattern.search(line)
        if match:
            spell_name = match.group(1)
            # Skip non-spell actions
            if spell_name in ["auto_attack", "variable", "potion", "flask", "use_item", "wait", "snapshot_stats", "target_die"]:
                continue
            if spell_name not in spells:
                spells.append(spell_name)
    return spells

def main():
    print("Starting sync of all WoW class/spec rotations...")
    cache = load_cache()
    token = get_access_token()

    generated_specs = []

    # 1. Process base specs from SimC Midnight branch
    for class_name, spec_name, filename in BASE_SPECS:
        local_key = f"{class_name.lower().replace(' ', '')}_{spec_name.lower().replace(' ', '')}"
        print(f"\nProcessing {class_name} - {spec_name} ({filename})...")
        
        # Raw file from midnight branch
        url = f"https://raw.githubusercontent.com/simulationcraft/simc/midnight/profiles/MID1/{filename}"
        try:
            res = requests.get(url, timeout=10)
            if res.status_code != 200:
                print(f"[!] Failed to fetch SimC profile from {url} (HTTP {res.status_code})")
                continue
            
            raw_content = res.text
            spell_names = parse_simc_profile_active_spells(raw_content)
            
            core_spells = []
            cooldowns = []
            interrupts = []
            defensives = []
            health_recovery = [5512, 191380] # default health potion/stone

            apl_list = []

            # Map spell names to IDs
            for name in spell_names:
                sid = search_spell_id(name, token, cache)
                if not sid:
                    continue
                
                name_pretty = name.replace("_", " ").title()
                
                # Deduplicate core spells
                if not any(s["id"] == sid for s in core_spells):
                    core_spells.append({
                        "id": sid,
                        "name": name_pretty
                    })

                # Categorize
                name_lower = name.lower()
                is_cooldown = any(x in name_lower for x in ["cooldown", "avatar", "recklessness", "combustion", "metamorphosis", "crusade", "ascension", "veins", "wrath", "adrenaline", "empower"])
                is_interrupt = any(x in name_lower for x in ["pummel", "kick", "disrupt", "shear", "silence", "rebuke", "quell", "counterspell"])
                is_defensive = any(x in name_lower for x in ["shield", "fortitude", "scales", "blur", "defensive", "barkskin", "shift", "evasion", "cloak", "feint", "wall", "reflection"])
                
                if is_cooldown and sid not in cooldowns:
                    cooldowns.append(sid)
                if is_interrupt and sid not in interrupts:
                    interrupts.append(sid)
                if is_defensive and sid not in defensives:
                    defensives.append(sid)

                apl_list.append({
                    "spellId": sid,
                    "name": name_pretty,
                    "condition": "always"
                })

            # Check if we have at least some core spells
            if not core_spells:
                print(f"[!] No core spells could be resolved for {class_name} {spec_name}.")
                continue

            # Generate high-quality simulated opener rotation sequence (13 steps paced at 1.5s GCD)
            # Standard order: cooldowns first, then alternate generator/spender
            cd_spells = [s for s in core_spells if s["id"] in cooldowns]
            filler_spells = [s for s in core_spells if s["id"] not in cooldowns and s["id"] not in interrupts and s["id"] not in defensives]
            
            if not filler_spells:
                filler_spells = core_spells

            sequence = []
            # Start with cooldowns if available
            sequence.extend(cd_spells)
            
            # Fill the rest of the 13 steps alternating between fillers
            step_idx = len(sequence)
            while len(sequence) < 13:
                f_spell = filler_spells[step_idx % len(filler_spells)]
                sequence.append(f_spell)
                step_idx += 1

            steps = []
            for i, spell in enumerate(sequence):
                steps.append({
                    "time": 0.5 + i * 1.5,
                    "spellId": spell["id"]
                })

            profile_json = {
                "class": class_name,
                "spec": spec_name,
                "coreSpells": core_spells,
                "cooldowns": cooldowns,
                "interrupts": interrupts,
                "defensives": defensives,
                "healthRecovery": health_recovery,
                "apl": apl_list
            }

            # Write JSON file
            output_path = OUTPUT_DIR / f"{local_key}.json"
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(profile_json, f, indent=2)
            
            # Register in generated list
            generated_specs.append((local_key, class_name, spec_name, steps))
            print(f"[+] Wrote SimC profile JSON: {output_path.name}")

        except Exception as e:
            print(f"[!] Error processing {class_name} {spec_name}: {e}")

    # 2. Merge in custom healer and support specs
    for local_key, data in HEALER_AND_SUPPORT_PRESETS.items():
        print(f"\nAdding custom healer/support preset: {data['class']} - {data['spec']}...")
        output_path = OUTPUT_DIR / f"{local_key}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        # Generate a rotation steps sequence for the fallback
        sequence = []
        cd_spells = [s for s in data["coreSpells"] if s["id"] in data["cooldowns"]]
        filler_spells = [s for s in data["coreSpells"] if s["id"] not in data["cooldowns"] and s["id"] not in data["interrupts"] and s["id"] not in data["defensives"]]
        
        sequence.extend(cd_spells)
        step_idx = len(sequence)
        while len(sequence) < 13:
            f_spell = filler_spells[step_idx % len(filler_spells)]
            sequence.append(f_spell)
            step_idx += 1

        steps = []
        for i, spell in enumerate(sequence):
            steps.append({
                "time": 0.5 + i * 1.5,
                "spellId": spell["id"]
            })

        generated_specs.append((local_key, data["class"], data["spec"], steps))
        print(f"[+] Wrote healer preset JSON: {output_path.name}")

    save_cache(cache)

    # 3. Re-generate src/lib/trainingEngine.ts imports and ROTATIONS_DB map
    print("\nUpdating src/lib/trainingEngine.ts with all generated spec profiles...")
    training_engine_path = ROOT_DIR / "src" / "lib" / "trainingEngine.ts"
    
    with open(training_engine_path, "r", encoding="utf-8") as f:
        te_content = f.read()

    # Create dynamic import lines
    import_lines = []
    db_mapping_lines = []
    
    for local_key, class_name, spec_name, _ in sorted(generated_specs):
        import_var = f"{local_key}_rotation"
        import_lines.append(f'import {import_var} from "./rotations/{local_key}.json";')
        db_mapping_lines.append(f'  "{local_key}": {import_var},')

    # Replace import statements block at the top
    # The block starts with imports from "./rotations/..."
    import_pattern = re.compile(r'import \w+_rotation from "\./rotations/\w+\.json";\n?')
    te_clean_imports = import_pattern.sub("", te_content)
    
    # Prepend new imports to the very top
    te_clean_imports = "\n".join(import_lines) + "\n\n" + te_clean_imports.lstrip()

    # Replace ROTATIONS_DB declaration
    db_pattern = re.compile(r'export const ROTATIONS_DB: Record<string, any> = \{[\s\S]*?\};')
    new_db_decl = "export const ROTATIONS_DB: Record<string, any> = {\n" + "\n".join(db_mapping_lines) + "\n};"
    te_clean_db = db_pattern.sub(new_db_decl, te_clean_imports)

    # Replace getScenariosForSpec implementation
    scen_pattern = re.compile(r'export function getScenariosForSpec\(specName: string \| undefined\): Scenario\[\] \{[\s\S]*?\}', re.MULTILINE)
    
    # Generate the dynamic getScenariosForSpec function
    scenarios_generator_code = """export function getScenariosForSpec(specName: string | undefined): Scenario[] {
  if (!specName) {
    return TRAINING_SCENARIOS;
  }
  const specKey = specName.toLowerCase().replace(/ /g, "");
  
  // Find matching profile in our registered rotations db
  const matchedKey = Object.keys(ROTATIONS_DB).find(k => k.endsWith(`_${specKey}`));
  if (!matchedKey) {
    return TRAINING_SCENARIOS;
  }

  const rotationData = ROTATIONS_DB[matchedKey];
  const className = rotationData.class;
  const specDisplayName = rotationData.spec;

  // Generate steps sequence dynamically from coreSpells (excluding cooldowns/interrupts/defensives from active gcd filler loop)
  const cds = new Set(rotationData.cooldowns || []);
  const interrupts = new Set(rotationData.interrupts || []);
  const defensives = new Set(rotationData.defensives || []);
  const coreSpells = rotationData.coreSpells || [];

  const cdSpells = coreSpells.filter((s: any) => cds.has(s.id));
  const fillerSpells = coreSpells.filter((s: any) => !cds.has(s.id) && !interrupts.has(s.id) && !defensives.has(s.id));
  
  const rotationFiller = fillerSpells.length > 0 ? fillerSpells : coreSpells;

  const sequence = [];
  sequence.push(...cdSpells);
  
  let fillerIdx = 0;
  while (sequence.length < 13) {
    sequence.push(rotationFiller[fillerIdx % rotationFiller.length]);
    fillerIdx++;
  }

  const steps = sequence.map((spell: any, idx: number) => ({
    time: 0.5 + idx * 1.5,
    spellId: spell.id
  }));

  return [
    {
      id: `${matchedKey}-rotation`,
      name: `${className} (${specDisplayName}) Practice Drill`,
      description: `Practice the core rotational priority and muscle memory for ${specDisplayName} ${className}.`,
      duration: 20,
      steps
    },
    {
      id: "proc-reaction",
      name: "Proc Reaction Speed Drill",
      description: "React to randomized, rapid spell procs. Hit the highlighted button as fast as you can.",
      duration: 20,
      isProcReaction: true,
      steps: []
    }
  ];
}"""

    te_final = te_pattern_replace = te_clean_db.replace(
        te_clean_db[te_clean_db.find("export function getScenariosForSpec"):],
        scenarios_generator_code + "\n"
    )

    with open(training_engine_path, "w", encoding="utf-8") as f:
        f.write(te_final)

    print("[+] Successfully updated src/lib/trainingEngine.ts with all specs and dyn scenario generator!")
    print(f"Generated a total of {len(generated_specs)} specialization profiles.")

if __name__ == "__main__":
    main()
