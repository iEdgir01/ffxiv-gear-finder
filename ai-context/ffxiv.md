# FFXIV Domain Context

## Level Cap
Current cap (Dawntrail): 100. Recipe levels go 1-100.

## Job Groups
- DoH (Disciples of the Hand) — crafting jobs, 8 total
- DoL (Disciples of the Land) — gathering jobs, 3 total
- DoW (Disciples of War) — 13 combat jobs (Tanks, Melee DPS, Physical Ranged)
- DoM (Disciples of Magic) — 9 combat jobs (Healers, Casters)
- COMBAT_JOB_IDS (deprecated) — union of DoW + DoM (22 combat jobs), kept for backward compatibility with ui.js/main.js until Tasks 5-6

## Job ID to Abbreviation Map (stable across patches)
| ID | Abbr | Name | Group |
|---|---|---|---|
| 8  | CRP | Carpenter     | DoH |
| 9  | BSM | Blacksmith    | DoH |
| 10 | ARM | Armorer       | DoH |
| 11 | GSM | Goldsmith     | DoH |
| 12 | LTW | Leatherworker | DoH |
| 13 | WVR | Weaver        | DoH |
| 14 | ALC | Alchemist     | DoH |
| 15 | CUL | Culinarian    | DoH |
| 16 | MIN | Miner         | DoL |
| 17 | BTN | Botanist      | DoL |
| 18 | FSH | Fisher        | DoL |
| 19 | PLD | Paladin       | DoW |
| 20 | MNK | Monk          | DoW |
| 21 | WAR | Warrior       | DoW |
| 22 | DRG | Dragoon       | DoW |
| 23 | BRD | Bard          | DoW |
| 24 | WHM | White Mage    | DoM |
| 25 | BLM | Black Mage    | DoM |
| 26 | SMN | Summoner      | DoM |
| 27 | SCH | Scholar       | DoM |
| 28 | NIN | Ninja         | DoW |
| 29 | MCH | Machinist     | DoW |
| 30 | DRK | Dark Knight   | DoW |
| 31 | AST | Astrologian   | DoM |
| 32 | SAM | Samurai       | DoW |
| 33 | RDM | Red Mage      | DoM |
| 34 | BLU | Blue Mage     | DoM |
| 35 | GNB | Gunbreaker    | DoW |
| 36 | DNC | Dancer        | DoW |
| 37 | RPR | Reaper        | DoW |
| 38 | SGE | Sage          | DoM |
| 39 | VPR | Viper         | DoW |
| 40 | PCT | Pictomancer   | DoM |

## Stats by Group
- DoH gear stats: CP, Craftsmanship, Control
- DoL gear stats: GP, Gathering, Perception
- Combat primary stats: Strength, Dexterity, Mind, Intelligence, Vitality
- Combat secondary stats: CriticalHit, DirectHitRate, Determination, SkillSpeed, SpellSpeed, Tenacity, Piety

PROVISIONAL: Confirm exact stat key names from a live XIVAPI item response.

## Gear Slot Types
Ring, Earring, Necklace, Bracelet, Head, Body, Hands, Legs, Feet, MainHand, OffHand

## Recipe Level vs Item Level
- Recipe level (lvl): the crafting job level required to craft the item — filter by this
- Item level (ilvl): the power level of the result — display on cards only
