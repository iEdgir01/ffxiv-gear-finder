# FFXIV Domain Context

## Level Cap
Current cap (Dawntrail): 100. Recipe levels go 1–100.

## Job Groups
- DoH (Disciples of the Hand) — 8 crafting jobs
- DoL (Disciples of the Land) — 3 gathering jobs
- DoW (Disciples of War) — 13 combat jobs (Tanks, Melee DPS, Physical Ranged)
- DoM (Disciples of Magic) — 9 combat jobs (Healers, Casters)

## Job ID to Abbreviation Map
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
Keys are PascalCase as returned by XIVAPI and used throughout the codebase.

- **DoH**: CP, Craftsmanship, Control
- **DoL**: GP, Gathering, Perception
- **DoW**: Strength, Dexterity, Vitality, CriticalHit, DirectHitRate, Determination, SkillSpeed, Tenacity
- **DoM**: Mind, Intelligence, Vitality, CriticalHit, DirectHitRate, Determination, SpellSpeed, Piety

## Stat Name Normalization
xivapi/ffxiv-datamining CSVs (BaseParam.csv) use human-readable names with spaces:
- "Critical Hit" → `CriticalHit`
- "Direct Hit Rate" → `DirectHitRate`
- "Skill Speed" → `SkillSpeed`
- "Spell Speed" → `SpellSpeed`

This normalization is applied in `scripts/build-gc-data.mjs` when generating `js/gcData.js`. XIVAPI runtime responses already return PascalCase keys, no conversion needed there.

## Grand Company Items
GC gear is **combat-only** in FFXIV — no GC items have crafter (DoH) or gatherer (DoL) stats. This is correct game behavior. GC gear appears only under DoW/DoM jobs that can equip it.

GC items have a seal cost, a GC affiliation (Maelstrom/Twin Adder/Immortal Flames), and a minimum rank requirement. The game has three GCs; all sell the same items at the same costs — rank is the only constraint.

## Gear Slot Types
Ring, Earring, Necklace, Bracelet, Head, Body, Hands, Legs, Feet, MainHand, OffHand

## Recipe Level vs Item Level
- **Recipe level (lvl)**: crafting job level required to make the item — used for level-band filtering
- **Item level (ilvl)**: power level of the result — displayed on cards, used as tiebreaker in sort

## ClassJobCategory
XIVAPI `ClassJobCategory` is a string describing which jobs can equip an item (e.g. "Disciple of War or Magic", "Carpenter"). `CLASSJOB_CATEGORY_TO_JOBS` in `constants.js` maps these strings to job abbreviation arrays.

The recipe crafter job (`craftJobAbbr` from Teamcraft) is separate and display-only — a BSM-made weapon still appears for all jobs that can equip it.
