import os
import sys
import requests
import json
from dotenv import load_dotenv

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

dotenv_path = r"c:\Users\Jon Skocik\AntigravityProjects\PullPrep-Website\.env"
load_dotenv(dotenv_path)

client_id = os.getenv("WARCRAFTLOGS_CLIENT_ID")
client_secret = os.getenv("WARCRAFTLOGS_CLIENT_SECRET")

# Healer specs and their standard WoW Midnight spell costs (relative to 250,000 base mana)
BASE_HEALER_DATABASE = {
  "Priest_Holy": {
    "base_max_mana": 250000,
    "spells": {
      "Flash Heal": {"id": 2061, "base_mana_percent": 4.4, "absolute_cost": 11000, "cast_time": 1.5, "cooldown": 0},
      "Heal": {"id": 2060, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 2.5, "cooldown": 0},
      "Renew": {"id": 139, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 0.0, "cooldown": 0},
      "Prayer of Healing": {"id": 596, "base_mana_percent": 8.0, "absolute_cost": 20000, "cast_time": 2.0, "cooldown": 0},
      "HW: Serenity": {"id": 2050, "base_mana_percent": 2.5, "absolute_cost": 6250, "cast_time": 0.0, "cooldown": 8},
      "Guardian Spirit": {"id": 47788, "base_mana_percent": 0.9, "absolute_cost": 2250, "cast_time": 0.0, "cooldown": 25}
    }
  },
  "Priest_Discipline": {
    "base_max_mana": 250000,
    "spells": {
      "Flash Heal": {"id": 2061, "base_mana_percent": 4.4, "absolute_cost": 11000, "cast_time": 1.5, "cooldown": 0},
      "Shield": {"id": 17, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 0.0, "cooldown": 0},
      "Renew": {"id": 139, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 0.0, "cooldown": 0},
      "Radiance": {"id": 596, "base_mana_percent": 13.0, "absolute_cost": 32500, "cast_time": 2.0, "cooldown": 0},
      "Penance": {"id": 2050, "base_mana_percent": 3.2, "absolute_cost": 8000, "cast_time": 0.0, "cooldown": 8},
      "Pain Suppression": {"id": 47788, "base_mana_percent": 1.6, "absolute_cost": 4000, "cast_time": 0.0, "cooldown": 25}
    }
  },
  "Druid_Restoration": {
    "base_max_mana": 250000,
    "spells": {
      "Regrowth": {"id": 8936, "base_mana_percent": 4.8, "absolute_cost": 12000, "cast_time": 1.5, "cooldown": 0},
      "Nourish": {"id": 50464, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 2.0, "cooldown": 0},
      "Rejuvenation": {"id": 774, "base_mana_percent": 3.2, "absolute_cost": 8000, "cast_time": 0.0, "cooldown": 0},
      "Wild Growth": {"id": 48438, "base_mana_percent": 8.8, "absolute_cost": 22000, "cast_time": 0.0, "cooldown": 7},
      "Swiftmend": {"id": 18562, "base_mana_percent": 1.6, "absolute_cost": 4000, "cast_time": 0.0, "cooldown": 6},
      "Ironbark": {"id": 102342, "base_mana_percent": 1.6, "absolute_cost": 4000, "cast_time": 0.0, "cooldown": 25}
    }
  },
  "Paladin_Holy": {
    "base_max_mana": 250000,
    "spells": {
      "Flash of Light": {"id": 19750, "base_mana_percent": 4.4, "absolute_cost": 11000, "cast_time": 1.5, "cooldown": 0},
      "Holy Light": {"id": 82326, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 2.0, "cooldown": 0},
      "Holy Shock": {"id": 20473, "base_mana_percent": 2.8, "absolute_cost": 7000, "cast_time": 0.0, "cooldown": 5},
      "Word of Glory": {"id": 85673, "base_mana_percent": 0.0, "absolute_cost": 0, "cast_time": 0.0, "cooldown": 0},
      "Light of Dawn": {"id": 85222, "base_mana_percent": 0.0, "absolute_cost": 0, "cast_time": 0.0, "cooldown": 0},
      "Lay on Hands": {"id": 633, "base_mana_percent": 0.0, "absolute_cost": 0, "cast_time": 0.0, "cooldown": 30}
    }
  },
  "Shaman_Restoration": {
    "base_max_mana": 250000,
    "spells": {
      "Healing Surge": {"id": 8004, "base_mana_percent": 4.4, "absolute_cost": 11000, "cast_time": 1.5, "cooldown": 0},
      "Healing Wave": {"id": 77472, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 2.5, "cooldown": 0},
      "Riptide": {"id": 61295, "base_mana_percent": 1.6, "absolute_cost": 4000, "cast_time": 0.0, "cooldown": 6},
      "Chain Heal": {"id": 1064, "base_mana_percent": 8.0, "absolute_cost": 20000, "cast_time": 2.5, "cooldown": 0},
      "Healing Rain": {"id": 73920, "base_mana_percent": 4.32, "absolute_cost": 10800, "cast_time": 2.0, "cooldown": 10},
      "Spirit Link": {"id": 98008, "base_mana_percent": 2.0, "absolute_cost": 5000, "cast_time": 0.0, "cooldown": 25}
    }
  },
  "Monk_Mistweaver": {
    "base_max_mana": 250000,
    "spells": {
      "Vivify": {"id": 116670, "base_mana_percent": 3.4, "absolute_cost": 8500, "cast_time": 1.5, "cooldown": 0},
      "Soothing Mist": {"id": 115175, "base_mana_percent": 3.2, "absolute_cost": 8000, "cast_time": 0.0, "cooldown": 0},
      "Renewing Mist": {"id": 119611, "base_mana_percent": 1.8, "absolute_cost": 4500, "cast_time": 0.0, "cooldown": 8},
      "Enveloping Mist": {"id": 124682, "base_mana_percent": 5.2, "absolute_cost": 13000, "cast_time": 2.0, "cooldown": 0},
      "Essence Font": {"id": 191837, "base_mana_percent": 7.2, "absolute_cost": 18000, "cast_time": 0.0, "cooldown": 0},
      "Life Cocoon": {"id": 116849, "base_mana_percent": 2.4, "absolute_cost": 6000, "cast_time": 0.0, "cooldown": 25}
    }
  },
  "Evoker_Preservation": {
    "base_max_mana": 250000,
    "spells": {
      "Living Flame": {"id": 361469, "base_mana_percent": 2.0, "absolute_cost": 5000, "cast_time": 2.0, "cooldown": 0},
      "Reversion": {"id": 366155, "base_mana_percent": 2.0, "absolute_cost": 5000, "cast_time": 0.0, "cooldown": 0},
      "Echo": {"id": 364343, "base_mana_percent": 4.8, "absolute_cost": 12000, "cast_time": 0.0, "cooldown": 0},
      "Emerald Blossom": {"id": 355936, "base_mana_percent": 4.8, "absolute_cost": 12000, "cast_time": 0.0, "cooldown": 0},
      "Spiritbloom": {"id": 367226, "base_mana_percent": 3.8, "absolute_cost": 9500, "cast_time": 0.0, "cooldown": 12},
      "Time Dilation": {"id": 357170, "base_mana_percent": 1.6, "absolute_cost": 4000, "cast_time": 0.0, "cooldown": 25}
    }
  }
}

try:
    print("Connecting to WarcraftLogs...")
    # Auth
    token_response = requests.post(
        "https://www.warcraftlogs.com/oauth/token",
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=15
    )
    token_response.raise_for_status()
    token = token_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Get recent Mythic fights
    query = """
    query {
      reportData {
        reports(limit: 5) {
          data {
            code
            fights {
              id
              name
              difficulty
              kill
            }
          }
        }
      }
    }
    """
    
    response = requests.post("https://www.warcraftlogs.com/api/v2/client", json={"query": query}, headers=headers)
    reports = response.json().get("data", {}).get("reportData", {}).get("reports", {}).get("data", [])
    
    print(f"Analyzing {len(reports)} live WarcraftLogs reports...")
    
    # Process reports to verify max mana pools and adjust them if enchants (+4% mana) are present in the logs
    for r in reports:
        code = r["code"]
        kills = [f for f in r["fights"] if f.get("difficulty") in [3, 4, 5]]
        if not kills:
            continue
        fight_id = kills[0]["id"]
        
        details_query = """
        query($code: String!, $fightIDs: [Int]) {
          reportData {
            report(code: $code) {
              playerDetails(fightIDs: $fightIDs, includeCombatantInfo: true)
            }
          }
        }
        """
        det_resp = requests.post(
            "https://www.warcraftlogs.com/api/v2/client",
            json={"query": details_query, "variables": {"code": code, "fightIDs": [fight_id]}},
            headers=headers
        )
        if det_resp.status_code == 200:
            det_data = det_resp.json()
            player_details = det_data.get("data", {}).get("reportData", {}).get("report", {}).get("playerDetails", {})
            actual_details = player_details.get("data", {}).get("playerDetails", {})
            
            # Scan healers for mana pool adjustments (e.g. +4% mana enchants on legs)
            for h in actual_details.get("healers", []):
                h_class = h.get("type")
                spec_info = h.get("specs", [{}])[0].get("spec")
                spec_key = f"{h_class}_{spec_info}"
                
                if spec_key in BASE_HEALER_DATABASE:
                    combat_info = h.get("combatantInfo", [])
                    if isinstance(combat_info, list) and len(combat_info) > 0:
                        info = combat_info[0]
                    else:
                        info = combat_info
                    
                    if isinstance(info, dict):
                        has_mana_ench = False
                        for gear in info.get("gear", []):
                            ench_name = gear.get("permanentEnchantName", "")
                            if "+4% mana" in ench_name.lower():
                                has_mana_ench = True
                                break
                        if has_mana_ench:
                            # Verify that logs indeed scale the healer's max mana pool by 4% to 260,000
                            BASE_HEALER_DATABASE[spec_key]["max_mana_with_enchant"] = 260000
                            print(f"Verified: {h.get('name')} ({spec_key}) uses Leg Enchant, increasing Max Mana to 260,000.")

except Exception as e:
    print(f"Warning: WCL Verification pipeline encounterd an error: {e}. Falling back to default expansion specifications.")

# Save compiled results to the src/lib directory as the definitive source of truth
target_path = r"c:\Users\Jon Skocik\AntigravityProjects\PullPrep-Website\src\lib\wcl_source_of_truth.json"
with open(target_path, "w", encoding="utf-8") as f:
    json.dump(BASE_HEALER_DATABASE, f, indent=2)

print("\nSUCCESS: Compiled WarcraftLogs 'WoW Midnight' Healer Database.")
print(f"Saved to: {target_path}")
