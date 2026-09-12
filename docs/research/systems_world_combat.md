# Age of Wonders 4 — World, Units, Combat, Heroes, Diplomacy & Turn Flow
## Research reference for the fan-made browser strategy game ("agelike")

**Scope:** Age of Wonders 4 (Triumph Studios, 2023) including all expansions through the 2026 content
(Dragon Dawn, Empires & Ashes, Primal Fury, Eldritch Realms, Ways of War, Giant Kings, Archon Prophecy,
Thrones of Blood, Rise from Ruin, Secrets of the Archmages).

**Sources and confidence.**
- **[DB]** — exact strings/numbers extracted from the community *aow4db* database (MinionsArt/aow4db, a
  direct export of the game's data files: `Units.json`, `Abilities.json`, `StructureUpgrades.json`,
  `SiegeProjects.json`, `WorldStructures.json`, `EmpireProgression.json`, `HeroItems.json`, and the full
  localisation table `all.json` which contains the in-game glossary/tooltip text). Treat these as
  authoritative for the current patch.
- **[WEB]** — numbers quoted from search summaries of the official wiki (aow4.paradoxwikis.com), Paradox dev
  diaries and community guides. The wiki itself was not reachable from this environment, so these are
  second-hand; they are marked so you can double-check edge cases.
- Where the two disagree I say so explicitly.

The file is organised in the six sections requested, plus an appendix of raw data tables
(all base-game city structures, special province improvements, siege projects, ancient wonders, magic
materials) generated straight from the DB.

---

# 1. WORLD MAP

## 1.1 Map structure: hexes, provinces, domains

| Concept | Rule | Src |
|---|---|---|
| Hex grid | The world map is a hex map with (up to) three layers: **Surface**, **Underground**, and DLC layers (**Umbral Abyss** — Eldritch Realms; **Shrouded Isles** — Secrets of the Archmages). | DB |
| Province | "An area on the World Map marked by borders." Provinces have **Province Features** (terrain) which determine which improvements can be built, and may contain a **Resource Node**, **Pickup**, or **Ancient Wonder**. A city site occupies the **7 city hexes** (a centre hex + ring of 6); a siege is started by attacking any of these 7 hexes. Provinces are the ~7-hex clusters the map is tiled with. | DB |
| Domain | "The collection of Provinces belonging to the city." The ruler has a **Claim** on provinces adjacent to their domain. Friendly units spend **2 fewer Move Points** per hex inside a friendly domain. | DB |
| Annexing | Expanding the domain by building a Province Improvement in an adjacent province. **A city can support one improvement for each Population it has after the first** (i.e. pop N → N-1 annexed provinces). Annex range is limited; each Town Hall tier (II, III, IV) gives **+1 Province Annex Range**; the empire skill *Expansive Reach* (250 Imperium) lets cities expand **2 provinces further**. Vassal provinces can be annexed for Imperium; ruined enemy provinces must be Pillaged first. | DB |
| Claims | Another ruler building on a province you have claimed generates a **Grievance** for you (unless a Province-Claiming Pact exists). | DB |
| Locations | Special sites on the map (watchtowers, gold veins, lairs). Guarded ones give rewards when cleared; ownership is taken by moving a unit onto them; many give resources when inside a domain. | DB |
| Pickups | One-time resource packs collected by moving an army onto them (Small / Large Pickup). | DB |

## 1.2 Terrain: climes, province features, movement

**Climes (region themes) [DB]:** Temperate, Arctic, Arid, Desert, Desolate, Tropical, Sub-Tropical, Highlands, Fungal, Ocean, Sea Lava, Underground, Desolate Underground, Arctic Underground.

**Province features / terrain overlays [DB]:** Grassland (Fertile Plains), Forest, Dead Forest, Mangrove Forest, Hills, Rocky, Temperate Rocky, Mountains, Swamp, Wetland, Moorland, Sand, Snow, Ice (Frozen Waste), Ashlands, Lava, Volcanic ("badland"), Chasm, River, Coast, Water, Ocean, Lakes, Water Rocky, Oyster Reefs, Ruins, Sunken Ruins, Cavern Floor, Fungus Fields, Mushroom Forest, Earth (diggable), Bedrock, Stalagmites, Cliff, Astral Void, Void; DLC overlays: Sunless, Gloom, Misty, Dungeon, Astral Barrens.

**What terrain does (design summary).** Terrain in AoW4 primarily decides (a) which *base improvement* a province can hold and (b) adjacency bonuses for *special* improvements; yields come from the improvement, not from the raw hex.

| Province feature | Base improvement it enables | Notes |
|---|---|---|
| Grassland / Fertile Plains, Fungus Fields | **Farm** (Food) | Bountiful Fields / Garden of Bliss scale with adjacent Grassland |
| Forest, Mushroom Forest, Mangrove (water forester) | **Forester** (Food + Production) | Wildlife Sanctuary / Sylvan Megalith scale with adjacent Forest |
| Rocky, Hills, Mountains, Stalagmites | **Quarry** (Production) | Glacial Megalith etc. scale with Snow |
| Iron Deposit / Gold Vein node | **Mine** (Gold) | Mines are node-gated, not terrain-gated |
| Mana Node / magic material node | **Conduit** (Mana) or **Research Post** (Knowledge) | player picks one |
| Coast / Water (Fishing Ground, Pearl Reef) | **Fishery** (Food) | Seafarers' Guild scales per Coast/Water province |
| Chasm, Lava | annexing gives a **City Stability penalty** (Crucible Battlements ignores it) | Lava provinces unlock Basalt Excavation, Obsidian Weaponsmith, Volcanologists' Guild |
| Void / Astral Void | blocks all movement, cannot be built on | |
| Earth (underground) | must be **Excavated** before use | Bedrock can never be dug |

Base yields (community-quoted) [WEB]: Farm **+5 Food**; Quarry **+5 Production**; Forester **+2 Food +3 Production**; Mine **+5 Gold**; Conduit **+5 Mana**; Research Post **+5 Knowledge**; Fishery ≈ Farm. Each base improvement costs **−5 City Stability** (see 1.6). Special improvements (see appendix) replace a base one and *count as* that type (e.g. Farmstead: +15 Food, +5 per adjacent Farm).

**World-map movement [DB]**
- Every unit has a **Move Point (MP)** pool: **40 MP** for essentially all units; **48 MP** for Scout-type units (DB `mp` field: T1–T5 median 40, scouts 48).
- "Normal terrain costs **6 Move Points** to traverse. Sometimes the cost can be reduced (e.g. moving through your Domain, −2), but **never below 2**." → a 40-MP unit moves ~6–7 hexes on open ground, 10 hexes on friendly roads/domain.
- Roads/rivers/rough terrain modify the cost (forest, hills, swamp, snow cost more; roads cost less) — exact per-terrain multipliers were not exposed in the extracted data. Older-game values sometimes quoted online (4 open / 6 forest-hills / 3 road) are **AoW3 numbers**; treat them as a reasonable default only.
- **Flying**: +2 Vision Range; moves over *any* terrain at cost **6**; needs Seafaring to cross Water; in combat can pass most units/obstacles.
- **Floating**: any terrain at cost **6**, Mountains **8**; needs Seafaring for water.
- **Water Movement** (boats/naval): water hexes cost **4**.
- **Amphibious**: enters water without penalty or embarking; faster over Rivers and Swamps.
- **Embarked** (land unit on water after the *Seafaring* empire skill): **−2 Defense, −2 Resistance** while embarked.
- Racial adaptations (Forestry-type traits): Arctic / Desert / Volcanic / Underground / Wetlands Adaptation remove the movement & stability penalties of that terrain for the race.
- **Forced March** (empire skill): +100% MP this turn, lose 30% current HP, *Exhausted* for 2 turns, costs **10 Mana per unit**.
- **Vision Range** and **Sensing Range** (detect units in fog) are separate stats; Farsight = +1 vision; Scouts have Farsight.
- **Ritual of Alacrity** (Barbarian cities/outposts): units on the centre restore 50% HP, 100% MP, remove Exhausted; 3-turn cooldown.
- Camouflage (Universal Camouflage) hides units unless the observer has **True Sight**.

## 1.3 Resource nodes & magic materials

**Resource nodes [DB]:** Fishing Ground, Gold Vein, Iron Deposit, Mana Node, Oasis, Pearl Reef, Pastures (food), and **Root Nodes** (magic-victory nodes; convertible to an Affinity by a world spell for extra income). Nodes "grant bonus income when the Province they are located in is annexed". **Ruined Nodes** give nothing but can be restored for Mana; the cost falls each turn to a minimum.

**Magic materials [DB]:** three categories — **Ores** (Arcanium Ore, Fireforge Stone, Focus Crystals, Blood Glass†), **Liquids** (Archon Blood, Astral Dew, Tranquility Pool), **Plants** (Haste Berries, Rainbow Clover, Silvertongue Fruit) plus **Void Stones**† (Eldritch Realms). Each grants a unique empire-wide effect once annexed *or obtained by trade*, plus city income; collecting **every material of one category** grants an extra empire bonus: *Imperial Essence* (ores), *Cosmicflux Elixir* (liquids), *Rings of Binding* (plants). Every material also imposes a combat property on battles fought in its province. Full table in Appendix A.5. A **Transmutation Circle** special mine can replicate one material's effect.

## 1.4 Cities: founding, outposts, tiers, caps

| Rule | Value | Src |
|---|---|---|
| Outpost | Built by a **Hero** standing on a province centre. Cost **50 Gold, 2 turns**; **10 Gold/turn upkeep**; claims its province, cannot be entered by enemies without trespassing, gathers Gold/Mana/Knowledge from nodes & materials in its province. Upgrades: Watch Tower (+4 vision/+4 sensing), Palisade Walls (+20 Fortification), Stone Walls (+20), Teleporter, **Work Camp** (annex 1 province; a city founded from it starts with +1 Population and that province attached). *Outpost Expertise* skill: −1 turn, −50% gold. | DB/WEB |
| Founding a city | Outpost → City costs **200 Imperium, 3 turns** (150 with *Adept Settlers* society trait; *Haste Berries*: −2 turns). Also cities can be gained by **Absorbing** (keeps race/culture) or **Migrating** (replaces with yours) conquered cities, or by **Pact of Integration** with a vassal. | WEB/DB |
| City Cap | Exceeding it: **−25% City Income to every city for each city above the cap**. Raised by empire skills *Rite of Expansive Growth* (+1, 250 Imperium, repeatable) and *Expanded Governance* (+1, 200 Imperium). Community note: repeat purchases escalate (≈200 first, +300 each). Vassals do **not** count; integrated cities do. | DB/WEB |
| City Tier | "Determined by its last completed Town Hall structure" (I–IV). Display name by population: **Village → Town → City → Metropolis**. | DB/WEB |
| Town Hall II | requires **3 Population** (boost −30% at 5 pop): **200 Gold / 200 Production**; +1 annex range, +10 Gold, unlocks Special Province Improvements, unlocks T2 units, allows the Wizard Tower (throne city). Culture variants: Castle, Atrium of Light, Bulwark, Communal Tent, Dread Spire, Mage's Plaza, etc. | DB |
| Town Hall III | boost at **10 Population**: **400 / 400**; +1 annex range, +10 Gold, unlocks Spell Jammer, T3 units, Stone Walls. (Citadel, Stronghold, Halls of War, Mystic Spire, Pantheon, Forge Tower…) | DB |
| Town Hall IV | boost at **15 Population**: **800 / 800**; +1 annex range, +10 Gold, **+2 City Stability per Population**, T4/T5 units. (Grand Estate, Black Palace, Solar Sanctum, Warlord's Pavilion, Wizard's Auditorium adds +10 combat & world casting points…) | DB |
| Max population | **30** (45 with the Nature T10 skill *Complete Harmony*). | DB |
| Guild Slot | A city normally has **one** Guild slot (Farmers'/Foresters'/Merchants'/Mages'/Scholars'/Smiths'/Workers'/Seafarers' Guild — the big 280g/750p "T4" economy buildings are mutually exclusive). | DB |
| Boost | Meeting a structure's boost requirement (e.g. "Build 2 Quarry") cuts its cost by **30%**, automatically. | DB |
| Dismantle | returns **50%** of resources spent. | DB |
| Razing | Armies raze an Outpost/City centre to remove the domain; leaves **City Ruins** rebuildable for Imperium. Province improvements cannot be razed, only **Pillaged** (→ Ruins; rebuild for Gold; enemy ruins can be annexed). | DB |
| Throne City | Capital; ruler is always its governor; only place for the **Wizard Tower**; losing it *and* the ruler ends the empire. | DB |

## 1.5 Economy: food, production, draft, gold, mana, knowledge, imperium

| Resource | Generation & use | Src |
|---|---|---|
| **Food** | Grows population. Each Population costs **3 Food + 5 City Stability** upkeep. Food to grow (normal speed): pop1→2 **35**, →3 41, →4 48, →5 56, →6 64, →7 74, →8 86, →9 99, →10 115, →11 132, →12 151 (≈ ×1.15 per step). Negative food → **Starvation**: population dies and a Province Improvement is lost every **3 turns**. Buy growth: **15 Imperium (+3 per city beyond the first) per remaining turn**. Game speed Fast/Slow changes growth & structure cost by ±AMOUNT%. | DB/WEB |
| **Production** | Builds City Structures (Structure Queue); surplus carries **one turn** to the next item. City income can also be *converted* (e.g. Production→Knowledge with Archon Observatory). | DB |
| **Draft** | Recruits units in the city queue; each unit has a fixed Draft cost paid over turns (e.g. 140 Draft/turn vs a 600-draft unit → 5 turns), Gold/Mana/Souls paid up-front; leftover Draft carries over. **Hurry Recruitment** costs Gold (Arcanium −25%; Luxury Markets: Buy Now 25% cheaper, 2×/turn). | WEB/DB |
| **Gold** | Base global income **25/turn** (`base_global_income_val`), plus city income (Mines, Markets…). Pays unit upkeep, structures, hurrying, treaties. Insufficient upkeep → **−50 Morale** on units and desertion chance. | DB |
| **Mana** | From Conduits, Shrines, Mana nodes; pays spell casting, spell upkeep, magic-origin unit upkeep, node restoration, Forced March. | DB |
| **Knowledge** | Research of Tomes/spells; surplus carries one turn. Research speed setting ±25%. | DB |
| **Imperium** | "Influence over the world": from the **Wizard Tower** (+5/floor), annexed **Ancient Wonders**, Focus Crystals (+5), Overlord's Tower (+5 +5/vassal), Baron's Palace, Bonds of Brotherhood (+5 per Defensive Pact, +15 per Alliance). Spent on **Empire Skills** (100–500), **founding cities**, **city cap**, **hero cap**, **buying population**, **boosting Free-City allegiance** (5 Imperium per Allegiance point), **integrating vassals** (scales with pop), **rebuilding ruins**. High-tier units also cost Imperium upkeep (T4 3, T5 7). Unjustified wars reduce Imperium income for several turns. | DB/WEB |
| **Casting Points** | **World Map Casting Points** refill every turn (multi-turn casting if a spell costs more); **Combat Casting Points** refill at the start of each battle. Grand/Tactical Casting Reserves +30 each; Wizard King +10; Channeling Chamber +10/+10 and +1 spell slot. | DB |
| **Souls / Thralls / War Spoils / Favors / Binding Essence / Astral Echoes** | DLC/culture-specific side resources (undead recruitment, vampire feeding, Reaver loot, Federate diplomacy, item forging, Mystic echo-casting). | DB |
| **Affinity** | Six affinities (Order, Chaos, Nature, Materium, Astral, Shadow) from faction creation + tomes; gate tome tiers (T3 needs 3 points, T4 6, T5 8) and Empire Development skills. | DB |

## 1.6 City Stability

"A city's Stability ranges from **−100 to 100**." It **drops as the domain grows** (each base improvement −5; each pop −5 upkeep) and is raised by structures (Tavern +20, Bathhouse +40, Tribunal +20, Temple of the Exalted +30…), Town Hall I (+10), Town Hall IV (+2/pop), governor traits and events.

| Range | State | Effect [DB] |
|---|---|---|
| 80 … 100 | **Harmony** | +Food/Draft/Production bonus (highest level; *Utopian Society* skill +10% income) |
| 40 … 79 | **Orderly** | + bonus |
| 10 … 39 | **Stable** | + bonus |
| −9 … 9 | **Neutral** | no effect |
| −39 … −10 | **Unstable** | − all city income |
| −79 … −40 | **Unrest** | − income, bad events |
| −100 … −80 | **Rioting** | **−50% City Income**; chance that provinces **defect** from the city |

Positive stability triggers good random events (choose a reward); negative triggers bad events (choose a penalty). Dark culture ignores low-stability penalties. Ruler in the Void: −20 in every city. Besieged cities lose income (Temple of the Pyre / Fortifying Governor L4 ignore it).

## 1.7 Free cities, whispering stones, vassals, integration

**Free Cities** are independent cities with a Free City Lord. 37 "upgrade sets" exist in the DB (Initiates/Followers/Masters of each affinity, Masters of Beasts/Flora/Frost/Demons/Necromancy/Creation/Ethereal, plus DLC sets — Alchemy, Constructs, Antimagic, Calamity, Prosperity, Sanguine/Dreadful Vampires, Fey, Storms, Cleansing Flame, Corruption, Dragon Followers) each with signature units and enchantments that a vassal contributes.

**Two-phase diplomacy [DB]:**
- *Negotiation phase* (any empire): **War → Neutral → Pact of Cooperation → Pact of Loyalty → Pact of Vassalage.**
  - Pact of Cooperation: opens borders, trading enabled (up to two resource trades; magic materials tradable).
  - Pact of Loyalty: shares vision, allows building on claimed provinces, contributes to the Rally.
  - Reaching Vassalage ends the competition; competitors with ≥ Cooperation get a **Grievance** against the winner.
- *Vassalage phase* (overlord only): **Vassalage → Bonded → Flourishing → Supreme**, then **Pact of Integration** (available from Flourishing).

| Vassal tier | Allegiance | Income shared | Rally of the Lieges points | Trade cost | Integration | Src |
|---|---|---|---|---|---|---|
| Vassalage (base) | 0–9 (after reset) | ~30% | 2 | — | no | WEB |
| Bonded | 10–40 | 40% | 3 | −10% | no | WEB |
| Flourishing | 40–80 | 45% | 4 | −15% | **yes** | WEB |
| Supreme | 80–100 | 50% (+40% with *Absolute Loyalty*) | 5 | −20% | yes | WEB/DB |

- Becoming a vassal happens at **≈45 Allegiance**, after which Allegiance resets to 0 [WEB].
- **Whispering Stones**: you start with **1**; *Diplomatic Focus* +1 (150 Imp.), *Diplomatic Expertise* +1 and stones give +1 Allegiance (125), *Court of Whispers* +1 and can target other empires' vassals (250). Silvertongue Fruit: stones +1 Allegiance. Realm traits can halve stone strength or subtract 3. Hostages (Cult of Tyranny) count as assigned stones.
- **Boost Allegiance**: instantly gain half the Allegiance missing to the next tier for **5 Imperium per point**.
- *Rite of Allegiance* (175 Imp.): +20 Allegiance with all non-hostile Free Cities.
- Vassals also give a culture **Boon** (Feudal: Food in all cities; High: Stability; Industrious: Production; Barbarian: Draft; Dark: Mana per kill; Mystic: +Mana from all sources) and free access to their magic materials.
- **Rally of the Lieges**: every **15 turns** you get Recruitment Points (from vassal tier + annexed wonders + skills) to hire their special units, which arrive at a chosen city in 2 turns; one boost per rally halves the remaining wait for Gold. *Call to Arms*: rally units −50% gold, +2 ranks. Integrated cities keep contributing **+3** points.
- **Integration** costs Imperium scaled by population; the city then counts against City Cap; the Free City Lord becomes recruitable as a hero.
- **Intimidate / conquest**: you may instead declare war; free cities send armies during war; conquered cities can be released as vassals (Benevolent Conquerors: −2 turns, no relations penalty). Conquering lowers alignment and Free-City relations.
- Relations with a Free City scale Allegiance gain; very low relations at Neutral can trigger war. Alignment matters: each alignment level maps to a relations modifier with good-aligned cities.

## 1.8 Ancient wonders

"An Ancient Wonder is a Location that contains adventure and rewards. It can only be explored by a **single Army led by a Hero**. When cleared, it can be annexed by a City… provides City Income and special Units in the Rally of the Lieges." Tiers **Bronze / Silver / Gold** by rarity, difficulty and value. Each wonder type has 2–6 randomised "encounters" (spawn pools + combat properties) and randomly generated proper names (e.g. Hidden Wellspring → Fayfount, Nixwell, Covert Court). Ways to clear without fighting exist via affinity checks in the event.

Summary (full table in Appendix A.4):

| Tier | Wonders (base + DLC) | Annexed as |
|---|---|---|
| Bronze | Hidden Wellspring (Farm +20 Food), Crystal Forest (Conduit +20 Mana), Castle Ruins (Research Post +20 Draft), Ancient Cave (Quarry +20 Prod), Crimson Fane†, Barren Wellspring†, Breached Arcanum† | +2 stability/farm&forester; +2 mana/conduit; +2 knowledge/quarry; +2 mana/quarry |
| Silver | Secret Temple (Conduit +25 Mana), Magma Forge (Mine +15 Draft +10 Gold; units −25% gold), Lost Tomb (RP +25 Knowledge; +2 mana/+2 knowledge per hero in crypt), Archon Observatory†, Lava Prison†, Forsaken Temple†, Shrouded Arcanum† (+5/+5 casting points) | |
| Gold | World Tree (Forester +15/+15), Lost Wizard Tower (Conduit +15 Mana +15 Knowledge; unlocks Wizard's Bombardment siege project), Golden Ziggurat (Mine +30 Gold; magic-origin upkeep −50% in domain), Giant's Throne† (+2 Imperium per adjacent province), Vaultsphere†, Rose Choked Palace†, Withered Tree†, Fractured Tower† | |

Bound Gold wonders are also required for the Magic Victory spell. "Wondrous Past" realm trait makes wonders common.

## 1.9 Infestations, marauders, roaming monsters

- **Infestation**: "Areas under the control of Marauders, who increase in numbers and over time take over adjacent Provinces. They periodically send raiding parties that can **start a Siege without needing a Hero**. Destroying the **Infestation Spawner** clears it and grants great rewards based on tier and size." When it grows into your province it pillages your improvements until destroyed.
- States (each takes several turns): **Deep Sleep / Sleeping / Awakening → Patrolling → Invasion → Recovering** (reinforces patrols). Invasion timers show as "N+ turns".
- Neutrality: infestations can be neutral to an empire (never attack/pillage/raid it, still grow; attacking them ends neutrality; ones you summon start neutral). Crusader Host is neutral to Good-aligned empires.
- **Spawner types [DB]:** Brigand Camp, Small Monster Den, Large Monster Den, Great Bird's Nest, Ritual Circle (cultists), Dragon's Lair, Haunted Graveyard, Astral Rift, Pirate Cove, Forsaken Cove (naval); DLC: Derelict Workshop, Lithorine Cradle, Umbral Nest, Crusader Host, Fractured / Fleeting Fractured / Great Worm Infestations, Mistwalker Camp.
- Spawn pools are terrain-aware (e.g. cold: Ice Spider, Polar Bear; desert: Inferno Hound, Pyremoth; underground: Caustic Worm, Beetles).
- Realm trait **Regenerating Infestations**: a new infestation emerges in an unoccupied province **every 10 turns**; *Subdued Infestations* starts with fewer. World Threat setting: Passive / Low / Normal / High. Community: letting one max out (~31 turns at max threat) can yield a mythic-unit spawn as reward; rewards include resources and hero items; *Pacification* skill: destroying one gives +20 stability to all cities for 10 turns.
- **Roaming/marauder armies** also spawn from encounter quests, Cosmic Happenings (e.g. *Ravenous Visitants*) and free cities at war.

## 1.10 Realm traits & realm generation

Realms are generated from **5 trait categories**: **Geography** (mandatory; landmasses/separation), **Clime** (which province features are common/rare/absent), **Inhabitant** (independent army composition), **Presence** (pre-built powerful empires), and up to **4 Miscellaneous** (environment, free-city, rule and unit modifiers). Realm types: Story, Challenge (preset traits), Custom, **Unknown** (traits hidden, revealed by scrying — "world_trait_revealed" notification).

Selected traits with exact effects [DB]:

| Category | Trait | Effect |
|---|---|---|
| Geography | Land / Coast / Pangea / Continents / Islands / Divide / Quartered / Great Lakes / Lava Divide / Lava Lakes / Void Divide / Void Pangea / Void Pockets / Barren Oceans / Barren Pangaea / Scarred Divide | landmass layout; Islands = each empire own landmass; Barren Oceans = uninhabitable deserts with **Sandstorms** (units: no regen, −2 vision, camouflage; 60% Blind chance per turn in combat) |
| Clime | Desert Realm, Frozen Realm, Overgrown Realm, Endless Fields, Tropical Realm, Scorched Climate, Highlands, Forming Realm (terraforms each round), Sunless Highlands†, Lava Islands†, Devastated Pangaea† | common/rare/absent features |
| Inhabitant | Megafauna, Peaceful Lands, Rampant Undeath, Rampant Flora, Demonic Realm, Immortal Spirits, Magic Origins, Lingering Creators, Wildlands, Dragon Territories, Frostling Influence, Gigantism, Curse of Undeath (marauders revive at 20% HP after 1 turn), Astral Invaders, Celestial Grounds† | who guards the map |
| Presence | Artisan Kings, Druidic Alliance, Iron Emperor, The Librarian, Demon Prince, Domain of the Frost Queen, Lich Queen, Archon Prophet, Pretender Kings, The Wizard King, Ashen War† | strong scripted AIs; defeating them = victory objective |
| Misc: environment | Arctic Blizzards (6 frost/turn, Wet→Frozen 90%), Thunderstorms (1–3 units take 20 lightning/turn, all Wet), Ocean Storms, Volcanic Eruptions, Scorching Heat, Heavy Fog (−1 vision), Massive / Small / Blocked / Uninhabitable Underground, Underground Start, Surface Start, Explorative Underground, Unearthed, Wondrous Past, Crystalline Abundance, Warping Wilds, Toll of Seasons†, Warped Seasons†, Umbral Abyss†, Shrouded Isles† | |
| Misc: free cities | City States (+5 pop, stones −50%), Hostile Houses (−10 Allegiance, −400 relations on meeting), Distrusting Locals (stones −3), Might Makes Right (+10 Allegiance with all on conquest; conquest vassals +2 levels; stones −50%), Bannerlords (rallies +25% more often, +5 RP), No Free Cities, Low Population, Ruined Realm | |
| Misc: rules | Eternal Battleground (everyone at permanent war), Unbound Tomes (no affinity requirements), Unlimited Power (multiple combat spells/turn, +200% mana), Dissonant Enchantments (+100% enchant cost/upkeep), High Maintenance (+100% upkeep, −50% recruit cost), Deathcasting (+10 combat casting points per death), Domain of Mayhem (30% Berserk every 2 turns), Immortals (units rout at 10% HP instead of dying), No Respite (−5 regen outside domain), Regenerating Infestations, Megacities (no new cities, +5 annex range), Timelocked Tomes, No Starting City†, Motivated Truce†, Chaotic Influence† | |

Map setup also exposes sliders for every terrain/clime frequency, player count/distance, victory toggles (Military, Expansion, Magic, Score, Seals†, Cataclysm†), Allied Victory, game speed, research speed, endless unit ranks, hero resurgence, AI takeover options.

## 1.11 Cosmic Happenings (Eldritch Realms)

Realm-wide timed events (Minor 5–8 turns, Major 12): e.g. **Astral Eclipse** (−30% Mana, world spells +50% cost), **Blightfall Conjunction** (−5 Food/pop; 15 blight dmg/turn in combat), **Colossus Moon** (provinces→Swamp; thunderstorms), **Rays of Winter** (→Arctic; blizzards), **Cosmic Winds** (→Desert; 60% Blind), **Sunstruck Eruptions** (→Desolate; eruptions), **Stirring Stone Conjunction** (+100% Production, all units Siege Breaker), **Starry-eyed Enlightenment** (+100% Knowledge; all wars Unjust; ending a war +200 Imperium), **Portent of Rousing** (upkeep −50%, +100% Draft), **Melenis's Kiss** (30% of kills become zombies), **Phase-shift Nixing** (teleports disabled), Signs of the Cleft Shield / Huntress / Vanguard / Lumbering Staff (role buffs/debuffs), Major: Dawn of the Lodestar, Eye of Fire, Drifting Ley Lines, Toll of Seasons.

## 1.12 Underground

Reached via **Underground Passages**; annexing a passage province lets the city expand to the other layer. Terrain: Cavern Floor, Fungus Fields, Mushroom Forest, Stalagmites, underground rivers/magma, **Earth** (diggable), **Bedrock** (never diggable), Dungeon†. The **Excavation** empire skill (General tree, 125 Imperium) unlocks digging: select army → shovel → earth vanishes at the start of next turn if the army is still there; may reveal treasure, tunnels or marauders. Races with *Underground Adaptation* thrive there; realm traits can start everyone underground or on the surface.

---

# 2. UNITS

## 2.1 Tiers and typical stats [DB — computed over all 513 units]

| Tier | HP (typ.) | Defense | Resistance | Status Res. | Gold cost | Draft cost | Gold upkeep | Imperium upkeep | Base attack dmg |
|---|---|---|---|---|---|---|---|---|---|
| **I** | 45–70 (mode 45; infantry 60–70) | 0–5 | 0–2 | 0 | **60** (scouts 50) | **80** (scouts 60) | **8** | 0 | 10–12 repeating / 16 charge |
| **II** | 70–80 | 1–6 | 1–3 | 0 | **100** | **120** | **12** | 0 | 12–14 / 21 charge |
| **III** | 85–100 (mythic 135) | 2–7 | 2–4 | **3** | **140** | **220** | **20** | 0 | 14–16 / 24 charge |
| **IV** | 110–125 (mythic 140) | 4–8 | 3–5 | **7** | **200** | **300** | **30** | **3** | 16–18 / 27 charge |
| **V** | 150 (115–190) | 6–8 | 5–7 | **11** | **300** | **400** | **60** | **7** | 22–30 |

Magic-origin (summoned/mythic) units cost Mana instead of Gold and pay Mana upkeep; the Golden Ziggurat halves it. Upkeep discounts can never go below 50%. "Heroes are treated as Tier 5". "Tier 3+ units gain Status Resistance which increases for higher tiers."

Damage scaling per tier (community rule of thumb, matches DB medians): **+2 per tier for repeating attacks, +3 for charge strikes, +4 for single-shot attacks** [WEB].

## 2.2 Unit roles (unit types) [DB descriptions]

| Role | What the game says it does | Built-in passives | Typical T1 stats | Champion medal |
|---|---|---|---|---|
| **Shield** | "Great at blocking enemies and protecting allies against physical attacks." | **Shield Defense** (+3 Def vs non-flanking), **Defense Mode: Shield Wall** (adjacent allies +3 Def) | 70 HP, 5 Def, 10 dmg repeating | Exalted Defense (DM gives adjacent Bolstered Defense) |
| **Polearm** | "Specialists in taking out large threats and cavalry; counter shock charges." | **First Strike, Charge Resistance, +40% dmg vs Cavalry & Large Target** | 70 HP, 2 Def, 12 dmg | Retaliation Damage (+40% on retaliation) |
| **Shock** | "Offensive unit specialised in disrupting the enemy line. Has a Charge attack, counters Shield, countered by Polearm." | Charge Strike (single-shot) | 75 HP, 3 Def, 16 dmg charge | Killing Momentum |
| **Fighter** | "Outright melee unit with no obvious specialisation or counters." | — | 60 HP, 1 Def, 12 dmg repeating | Brawler (+10 HP, +1 Def) |
| **Skirmisher** | "Cheap and swift; useful at flanking and targeting lone enemies." | **Swift, Slippery** | 60 HP, 2 Def, CS 5 | Sprint |
| **Ranged** | "Takes out targets from afar; somewhat vulnerable. Accuracy affected by Line of Sight; cannot fire main attack when Engaged in Melee." | — | 55 HP, 0 Def, 12 dmg, range 4 | Eagle Eye (+1 range) |
| **Battle Mage** | "Ranged magic offence and weakening enemies; LoS; cannot cast main attack while Engaged." | — | 45 HP, 0 Def, 2 Res, 10 magic dmg, range 4 | Arcanist (+10% dmg, +1 Res) / Evoker |
| **Support** | "Defensive specialist that supports friendly units from afar and protects them from magic." | **Defense Mode: Warding** (adjacent +3 Res, +3 Status Res) | 50 HP, 2 Res, heal/buff abilities | Exalted Resistance |
| **Magic Fighter** | "Melee attacker using Magic attacks to target low-Resistance enemies." | **Melee Mage** | 60 HP, 1/1 | Arcanist |
| **Scout** | "Weak in battle; swift; useful for exploring." | **Farsight**, faster world movement (48 MP), CS 6 | 45 HP, 8 dmg | Sprint |
| **Mythic** | "Powerful unit that doesn't conform to a fighting style." All have **Control Loss Immunity**. | varies | T3 135 HP … T5 150 HP | Critical (+20% crit) |
| **Siegecraft** | "Normally only accessible during siege battles; often requires construction." (Onager, Bolt Repeater, Devastator Sphere, Earthshatter Engine, Great Bombard, Magelock Cannon) | Immobile / Demolisher | — | — |
| **Tower** | Immobilized, immune to morale changes and flanking, acts automatically (Archer Post, Ballista/Catapult/Bolt Repeater Tower, Healing/Necrotic Spires, Arcane Amplifier). | — | — | — |
| **Hero / Ruler** | single-member units, not subject to Casualties, Tier 5 for rules. | — | — | — |

Other tags: **Cavalry** (mounted; vulnerable to polearms), **Large Target** (20% easier to hit with ranged/magic; immune to most displacement; has **Demolisher**), **Flying / Floating**, **Construct** (Reinforced, −4 lightning, +2 spirit protection, Heartless, immune to bleed/disease/poison), **Undead** (immune to Bleeding/Poison), **Ethereal**.

## 2.3 Ranks (experience) [DB medal_rewards]

Six ranks: **Recruit → Soldier → Veteran → Elite → Champion → Legend** (a 7th "Exalted"/endless ranks exist with the *Endless Unit Ranks* setting).

| Rank | Cumulative bonus | Extra |
|---|---|---|
| Recruit | — | starting rank (structures like Blacksmith/Armory/Smiths' Guild give +1–2 starting ranks) |
| Soldier | **+10 HP** | |
| Veteran | +20 HP | |
| Elite | +30 HP, **+1 Def, +1 Res** | |
| Champion | +40 HP, +1/+1, **Champion Medal** (role-specific, see 2.2) or an upgraded signature ability for supports/mages (e.g. Heal +30 temp HP) | |
| Legend | **+50 HP, +2 Def, +2 Res, +10% damage** | Evolving units transform; Feudal Training promotes to Knight |

(A minority of 14 small units get +5 HP per rank instead of +10.)

XP: "Units earn experience from **winning battles**; they also earn a small amount **each turn on the world map**." Thresholds scale with tier; community example for T1: 4 XP to Soldier then 12 per rank [WEB]. Focus Crystals +10% XP; Revels of Carnage +100%; garrisons in walled cities gain 5 (palisade) / 15 (stone walls) XP per turn; *Dutiful Watch* +5; Imperial Academy +15. Units can be **Promoted** by buying remaining XP.

## 2.4 Damage channels, defense, resistance, protections [DB/WEB]

- Channels: **Physical, Fire, Frost, Lightning, Blight, Spirit** (composites: Arcfire = fire+lightning, Cosmic = fire+lightning+frost, Radiant = fire+spirit, Death = frost+blight).
- **Defense** "reduces damage from Melee and Missile attacks"; **Resistance** "reduces damage from Magic attacks and Combat Spells". Per-channel **Protection** (+/−) is *added to* Defense or Resistance when computing that channel (e.g. Wet: −2 Lightning, −2 Frost, +2 Fire protection; Construct −4 Lightning).
- Formula (community-verified): **damage × 0.9^(Defense or Resistance + Protection)** — each point ≈ −10%, multiplicative.

| Points | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| Damage taken | 90% | 81% | 73% | 66% | 59% | 53% | 48% | 43% | 35% |

- "Unblockable" damage ignores Def/Res; some abilities "ignore X Defense/Resistance/Status Resistance".
- **Hit Points**: "most units take Casualties as HP drop" — each member lost lowers the unit's damage output and status-infliction chance proportionally; heroes and large monsters are single-member (no casualty penalty). *Heroic Stand* / *Virtuous Spirit* ignore casualties.
- **Temporary HP**: all in-combat healing grants temp HP, lost first, removed at combat end.
- **Status Resistance**: reduces the chance a negative status lands (T3 3, T4 7, T5 11; Fervor/Status Protection stacks +1/+2; Blizzard −3). Ability chances are quoted as "base X%" (some "base 120%") before status resistance.

## 2.5 Status effects [DB — exact text]

| Status | Effect | Counters |
|---|---|---|
| **Burning** | 4 Fire dmg each turn; stacks to 5 | counters Wet & Frozen |
| **Frozen** | cannot move or attack | countered by Burning |
| **Wet** | −2 Lightning Prot, −2 Frost Prot, +2 Fire Prot | counters Burning |
| **Electrified** | 4 Lightning dmg/turn; stacks to 5 | |
| **Poisoned** | 4 Blight dmg/turn; stacks to 5; not on Ethereal/Undead | counters Regeneration |
| **Bleeding** | 4 Physical dmg/turn; stacks to 5; not on Ethereal/Undead | |
| **Decaying** | 3 Blight dmg/turn, −25% healing received; stacks to 4 | counters Regeneration |
| **Diseased** | each turn: gains Weakened + Poisoned; 60% to spread to adjacent | |
| **Condemned** | −3 Status Resistance (Zeal +10% dmg vs Condemned) | |
| **Weakened** | −10% damage per stack (max 5) | counters Strengthened |
| **Strengthened** | +10% damage per stack (max 5) | counters Weakened |
| **Sundered Defense / Resistance** | −1 Def / −1 Res per stack (max 10) | Bolstered Def / Res |
| **Bolstered Defense / Resistance** | +1 per stack (max 5) | Sundered |
| **Marked** | −10% Evasion per stack (max 5) | counters Evasion & Clinging Mist |
| **Evasion** | ranged/magic attacks −10% accuracy per stack (max 5) | Marked |
| **Distracted** | all attacks vs this unit count as Flanking | counters Hyper-Awareness |
| **Blind** | −50% accuracy on missile/magic; cannot retaliate | counters True Strike |
| **Stunned** | cannot act or move | |
| **Immobilized** | cannot move / use movement abilities | |
| **Slowed** | −1 Combat Speed, one fewer Retaliation | Hastened |
| **Hastened** | +1 Combat Speed, +1 Retaliation | Slowed |
| **Regeneration** | +6 temp HP at end of turn per stack (max 5) | Poisoned/Decaying |
| **Fortune** | +10% Crit chance per stack (max 3) | Misfortune |
| **Misfortune** | +15% Fumble chance, 8 Physical dmg on fumble (max 3) | Fortune |
| **Rally / Remorse** | +2 / −2 Morale at end of turn per stack (max 5) | each other |
| **Encouraged / Demoralized** | +5 / −5 Morale per stack (max 5) | |
| **Berserk** | uncontrollable, attacks nearest enemy (allies if none), immune to morale, ignores casualty penalty | |
| **Insanity / Madness** | attacks nearest ally; Madness also 5 dmg/turn | |
| **Dominated / Mind-Controlled / Possessed** | controlled by opponent; may be kept for Mana if it lasts to end | Control Loss Immunity |
| **Gilded** | Stunned; on death winner gets 20 Gold × tier | |
| **Soulbound** | +2 Souls on death; 30% zombie | |
| **Steadfast** | cannot drop below 1 HP | |
| **Resurgence / Undying** | revive at end of combat (50% HP) if side wins / after 2 turns | |
| **Obscured** | 40% harder to hit with ranged | |
| **Exhausted** | (Forced March / Headlong Assault) reduced stats | |
| **Well Supplied** | +10 max HP, +20% healing in combat | |
| **Life Steal** | attacks heal 10 temp HP (5 for repeating) | |
| Hex effects (Fire/Frost/Necro Hex), Torment, Ghostfire, Constricted, Entwined, Doomed, Refuged, Pacified, Mana Drained | see DB list (294 effects total) | |

## 2.6 Healing

- **World map regeneration**: "Units recover HP each turn when not in combat; more inside your Domain near a City/Outpost; enemy domain or infestation territory reduces it." Community numbers: **≈5 HP/turn outside** your domain and **≈25 HP/turn inside** it [WEB]; modifiers from data: Herbalist +5, Warcamp +15, Healing Spires +12, Natural Recovery +15 (friendly domain), Dark Vigor +15 (hostile domain), Hidden Wellspring +30, Cascade Falls +25, Blood Glass +5, Natural Regeneration 10, Crimson Court +5 (T3+), No Respite −5.
- **In combat**: healing spells/abilities grant **Temporary HP** (Heal ability +30 etc.); Regeneration +6/turn/stack; Natural Regeneration heals 10% max HP per turn (not above start value).
- **Post-combat**: temp HP vanish; dead units are dead unless Resurgence/Undying/resurrection spells; captured units can be recruited for Gold; some cultures raise the dead.

## 2.7 Morale [DB]

| State | Morale value | Effect |
|---|---|---|
| **High** | ≥ +20 | +20% Critical Hit chance |
| **Neutral** | −19 … +19 | none |
| **Low** | −20 … −39 | 20% Fumble chance; desertion chance on world map |
| **Very Low** | −40 … −59 | Fumble chance 20% [DB text] (community: 40% [WEB]); routing risk |
| **Routing** | ≤ −60 | flees to nearest Retreat Point, ignores ZoC/opportunity attacks, 25% harder to hit with ranged; leaves battle |

Morale events logged by the game: ally killed, ally routed, allied hero killed, enemy died, enemy hero died, enemy routed, performed a critical, hit by a critical, hit by a flanking attack, fumbled an attack, "New turn: too many allies died", "New turn: cannot exceed cap". Modifiers: Heartless −50% to all changes; Brave −50% loss; Stalwart 100% loss resistance; Expendable (death doesn't affect allies); Inspiring Presence +25% positive gain; Terrifying/Intimidating Aura −5 to adjacent; Morale Drain 3 (repeating) / 6 (single); Tyrant 4 per attack; Increased/Lowered Morale (Minor ±10 / Major ±20 for 12 turns from events); Renown levels give army morale. Unpaid upkeep: **−50 Morale** and desertion. The old AoW3 names (spirited/shaken/wavering/broken) are **not used** in AoW4.

## 2.8 Armies, upkeep, stacking, movement

- **Army = max 6 units**. Heroes lead armies (silver banner; ruler = gold banner); only heroes can explore wonders, start sieges, and build outposts.
- **Reinforcement Rule**: up to **3 friendly armies within 3 hexes** of a world-map battle join a side → **up to 6 armies (36 units) in one battle, 3 per side (18 units)**. Ancient-wonder fights allow **1 army per side**. Armies inside an Infestation Spawner or a besieged city don't join fights outside it. "Catchment preview" shows which armies would join.
- Mixed-speed armies move at the slowest unit's pace.
- Upkeep per tier: **8 / 12 / 20 / 30 (+3 Imp.) / 60 (+7 Imp.) Gold** (or Mana for magic origin) [DB]; enchantments add their own upkeep; discounts cap at −50%.
- **Combat Speed** (hexes per turn in battle): 1 point per hex, slowing terrain 2; typical **4** (slow 3, fast 5, cavalry/scouts 6). Swift ignores slowing terrain.
- **Zone of Control**: "the **three hexes in front** of the unit"; blocks enemy movement; Defense Mode extends it to all 6 adjacent hexes. *Fleeting* units ignore ZoC; *Slippery* units don't trigger opportunity attacks.

---

# 3. TACTICAL COMBAT

## 3.1 Battle setup & turn structure [DB]

1. **Engagement**: attacking an army/city/wonder opens the **Combat Preview** (both sides' strength) → choose **Manual** or **Auto Combat**. Auto combat is simulated; against AI the *Restart Combat* setting lets you replay manually if you dislike the result. Combat happens on a separate hex map generated from the province terrain (water battles disable some spells; wonder maps are hand-crafted).
2. Sides alternate full turns ("turns during Combat are taken one player after another"); the attacker moves first. There is no hard round limit in the extracted data.
3. Each unit gets **3 Action Points (AP)** per turn and **can spend at most 2 AP on movement**. Ability AP models: *free* (0 AP), *single* (1 AP, ends turn), *full* (3 AP, ends turn), *full-continue* (needs 3, keeps 1), *leave-one* (0 AP, keeps 1), **repeating** (triggers once per remaining AP, ends turn — so a stationary unit makes 3 strikes, one that moved 1–2 hexes makes 2 or 1).
4. Rotation (facing) is free. Ending a turn in **Defense Mode** costs the remaining action.
5. Each side may cast **one combat spell per round** (Wizard King *Overchannel*, Combat Enchantment overcharge, or the *Unlimited Power* realm trait allow more), paying **Mana + Combat Casting Points**; casting points refill only at the start of each battle. The ruler must be alive (not in the Void) to cast; Spell Jammer domains double enemy spell CP cost.
6. Retreat points sit on the map edges; **Retreating**: a unit that reaches one leaves immediately; nearby allies lose morale; it loses its remaining MP after battle; retreating the last unit loses the battle; if the battle is lost the retreated unit either dies or scatters to reappear at one of your cities a few turns later. Attackers who retreat keep all retreating units; defenders have a <100% survival chance [WEB].
7. "The battle is won by the last combatant that has Units left." Routed units that leave count as survivors of a won battle.

## 3.2 Attacks & accuracy

- Attack types: **Melee** (resisted by Defense), **Missile** (bows, thrown; Defense), **Magic** (orbs, staves, breath; Resistance). Single-shot vs **Repeating** (three hits).
- **Accuracy**: "likelihood of attacks landing. If it does not land it misses or grazes. **Grazes deal half damage** (and apply no status/stagger); **misses deal no damage** and can hit random adjacent units." Community detail: any hit chance from 99–75% converts the shortfall into graze chance (max 25% graze); below 75% true misses appear [WEB].
- Penalties: **Obscured** (target behind obstacles/units, or shot from over walls) = 40% harder to hit; adjacent units never obscure; **max range** shots take an accuracy penalty; **Large Target** +20% easier; **Evasion** −10%/stack; **Clinging Mist** −15%/stack; **Blind** −50%; **Aimed** +80%; **Focused Aim** +30%; **True Strike** cannot miss; battlement positions ignore Obscured (high ground). Terrain "concealing" flora obscures.
- **Engaged in Melee**: inside an enemy ZoC a unit cannot use most ranged or magic attacks.
- **Critical Hit**: **+50% damage**; chance mainly from High Morale (+20%), Fortune (+10%/stack), medals; "can never be higher than the attack's chance to hit"; on repeating weapons a crit makes all three hits land [WEB].
- **Fumble**: hit → graze, graze → miss; from Low/Very Low morale (20%), Misfortune (+15% & 8 dmg), Visions of Woe (100%).

## 3.3 Positioning rules

| Rule | Text [DB] |
|---|---|
| **Flanking** | "Attacking a target from behind or from the side: **+25% damage**. Units in Defense Mode cannot be flanked. If a unit *starts its turn* in an enemy's ZoC it cannot flank that enemy this turn." Flanker passive: further +25%. Hyper-Awareness/All-round Awareness/Scrying Eye = immune; Distracted = always flanked; Honorable = cannot flank; Heavy Shield ignored by flanks. Being hit by a flank is a morale event. |
| **Retaliation** | "Melee units can Retaliate **once per turn** (by default). Attacking an enemy inside its ZoC triggers a Retaliation. An enemy moving out of the ZoC triggers an **Opportunity Attack**." +1 with Vigilant/Hastened/The Avenger; unlimited with Tireless Retaliation; none while Blind/Frozen/Stunned; Sentinel +20%, Opportunist +30%, Retaliation Damage medal +40%. Ranged units retaliate only in melee if they have a melee attack. |
| **First Strike** | "When attacked, a unit with First Strike uses its Retaliation Attack **first**." (all Polearms) |
| **Defense Mode** | Ends the turn: ZoC → all 6 adjacent hexes, **+2 Def, +2 Res, immune to Flanking**. Variants: Shield Wall (+3 Def to adjacent allies), Warding (+3 Res, +3 Status Res to adjacent), Hold your Ground (+1/+1 and Charge Resistance to adjacent), Protective Wall, Turn to Stone (Stone Skin, +15 temp HP). Bulwark: DM gives +2/+2 extra. Charges and Earthshatter Engines knock units out of DM. |
| **Charge** | "Gains extra damage per hex travelled (up to 3 hexes) [Heavy Charge Strike: **+30% per hex**], **cancels Defense Mode**, **removes the target's Retaliation**. Negated by **Charge Resistance** unless the attack is a Heavy Charge." Community: *Stand Together* +20% for a well-set-up charge. |
| **Spear/pike brace** | Represented by Polearm passives: First Strike + Charge Resistance + 40% vs Cavalry/Large; *Defensive Strike* ability (strike then enter DM); Rooted Resistance grants adjacent allies Charge Resistance. |
| **Line of Sight** | Needed by most ranged attacks; obstacles or units between attacker and target make it **Obscured**. Flying units can pass over most units/obstacles. |
| **Obstacles** | Flora (obscuring, flammable → *On Fire* hexes deal fire damage/Burning), rocks, walls/gates/battlements (Fortified: only Demolisher can damage), sarcophagi, hazards (fire, lightning, volcanic markers). Combat properties from provinces (magic materials, weather, wonders) add per-turn effects. |
| **Displacement** | knock-backs / teleports of N hexes exist; Large Targets immune. |

## 3.4 Sieges [DB]

- A city with a **Wall Structure** (Palisade / Stone / Eldritch / Lithorite / Sentry Nests) must be **besieged before it can be attacked**. "A Siege can be initiated by attacking any of the **7 city hexes** with at least 1 Army led by a **Hero**, which must remain adjacent to the city until the siege is completed or the siege is lifted."
- **Fortification Health** (city stat): Palisade **+20**, Stone Walls **+30** (needs Town Hall III), Eldritch/Lithorite **+30**, Bastion's Barricade +10, Workers' Guild +10, Satiated Abductor Towers +10, Volatile Runes +10, Town Hall II: Castle +10, Glyph Tower +1 per adjacent conduit/RP, Silent Barracks +1 per Dungeon province; outposts' walls +20 each. (Achievement: a city with ≥60 Fortification Health.)
- Each siege turn Fortification Health falls by the besiegers' **Fortification Damage** (every unit with **Siege Breaker** contributes +1; Book of Siegecraft/Army Siege Breakers give it to a whole army) plus **Siege Projects** (each slot holds one project; chosen only on the turn the siege starts; slot count raised by empire skills). Projects add fortification damage (0–5 each), remove defences, or grant combat advantages — full list of 31 in Appendix A.3 (e.g. *Construct Onagers* 200 mana, 2 Onagers; *Undermining the Walls* 100: walls damaged, 25% destroyed; *Create Earthshatter Engines* 200 gold 100 mana, +5; *Dragon Attack* +5; *Incite Rebellion*: 3 units mind-controlled after turn 1, −50 stability).
- **Breach**: when Fortification Health hits 0 ("Walls Breached!") the attacker may assault. Defenders can *Headlong Assault* out at the cost of 20 damage and Exhausted. While besieged the city suffers income penalties but can still recruit (Beacon of Valor +40 Draft under siege).
- **Siege battle map**: walls with breaches (more can be made with Demolisher attacks, siege engines, spells), gates, **Battlement** obstacles behind walls that buff occupants (Archer Posts, Archer Quivers, Arcane Amplifiers, Crucible Battlements: +4 fire, ignore Obscured, +1 range), **Tower units** (Ballista, Catapult, Bolt Repeater, Healing/Necrotic Spires ×4), **Support structures** as combat enchantments (Caltrop Stash, Beacon of Valor, Temple of the Pyre, Volatile Runes, Tendril Labyrinth), extra defenders (Bastion's Barricade: 2 Bastions; Sentry Nests: 2 Striders; Paragon Quarters). Walls count as cover (attackers over walls are Obscured; defenders on intact battlements ignore Obscured). Only the strongest wall / battlement / tower type appears; multiple support structures stack.
- Raiding/pillaging projects: *Raiding Party* (50 Gold × city tier on breach, −5 alignment), *Subjugating Raid* (−2 pop to target, +2 to your nearest city), *Soul Siphon Ritual*.
- Free-city and infestation raiding parties can besiege without a hero.

## 3.5 Casualties, death, capture, post-combat

- Losing HP = losing members → proportional damage loss (heroes/monsters exempt).
- **Units that die stay dead** unless Resurgence (revive at 50% if side wins), Undying (after 2 turns), Ascended Martyrdom, resurrection spells, or Immortals realm trait (rout at 10% HP instead).
- Winner may recruit **captured** units (Gold / War Spoils) and raise corpses (necromancy); *Chaos Brand* / *Infected* corpses spawn enemy units.
- **Heroes**: a defeated hero (on the losing side) is **randomly captured (Prison) or killed (Crypt)** by the victor. *Hero Resurgence* setting: Always / Auto-combat only / Never — resurrect a hero who fell while their side still won. Prison: release (relations up, good act), convert (needs Wizard Tower: Prison Cells), hold as hostage (Cult of Tyranny), execute (evil). Crypt: resurrect (Wizard Tower: Crypts) or sell remains for gear + gold; Lava Prison makes capture 100%. Free-city lords and marauder heroes never go to prison. Allies auto-return captured heroes.
- **Ruler**: "When a Ruler perishes they are cast into the **Astral Void**. If they still hold their Throne City they **materialise there in 3 turns**" (Room of Recall −1, Ruler's Statue −1). "If they have lost their Throne City, their **Empire is defeated**." While in the Void: **−20 City Stability everywhere, governor bonuses off, research paused, no spells, magic-victory spells cancelled**.
- After battle every unit's Temporary HP is removed; XP is awarded to winners; morale events persist (Increased/Lowered Morale effects last 12 turns).

## 3.6 Combat spells

Types: Buff, Combat Enchantment, Combat Summon, Damage, Debuff, Healing. Cost = Mana + Combat Casting Points; one per round per side. **Overcharge** (Mystic/skills): Damage +25%, Healing +25%, Buff +2 Bolstered Resistance, Debuff +2 Sundered Resistance, Enchantment lets another spell be cast, Summon +2 Strengthened. Spells can **Backfire** (chance shown). *Death Casting* +10 CP per death; *Astral Absorption* +15 CP & 60 Mana when the enemy casts; Amplifier Lens / Bolstering Matrix / Focus Crystal structures modify affinity spells (+10 dmg, +3 stacks, −10% cost). Magic-victory Hearts add +20 dmg.

---

# 4. HEROES

| Topic | Rule | Src |
|---|---|---|
| Levels | Heroes gain XP from combat/actions; each level = **1 skill point**. Max level **20** (the DB hero builder allots **24** points = 20 levels + 4 signature bonus points). | DB |
| Signature skills ("Ways of War" DLC re-work) | Chosen at **levels 4, 8, 12, 16**; each also grants a **bonus skill point** and **+1 Affinity point**. For Champion / Wizard King / Dragon Lord rulers these are **Affinity Dedications**: *Initiate* (1 affinity, L4) → *Adept* (4, L8) → *Master* (6, L12) → *Paragon* (8, L16). Eldritch Sovereigns/Giant Kings/Vampires have their own. | DB |
| Skill tree layout | **Class tree** (Novice → *Adept* needs 2 skills in category → *Expert* 4 → *Master* 6), **Origin tree** (Champion, Wizard King, Dragon Lord, Giant King (Fire/Frost/Rock/Storm), Eldritch Sovereign, Elder Vampire, primal subcultures), **Affinity trees** (Order/Chaos/Nature/Materium/Astral/Shadow), **Pantheon/Ascension** skills, *Training Camp* skills from merchants. Dormant skills give nothing. Skills can be reset. | DB |
| Classes (9) | **Warrior** (charge, damage, grows through fighting), **Defender** (protect allies, survivability, retaliation), **Ranger** (ranged, skirmishing, disruption), **Elementalist / Mage** (elemental burst; picks a discipline), **Ritualist** (healing & buffs), **Death Knight** (high melee damage + debuffs + undead summons), **Spellblade** (magic ranged + physical melee), **Warlock** (debuffs and undead empowerment; Pacts), **Battlesaint** (Archon Prophecy: builds *Fervor* for support/smite). | DB |
| Class weapons | Melee classes (Warrior/Defender/Death Knight/Spellblade): Great Weapon, One-Handed, Shield, Fist, Polearm, Skirmisher weapons (Defender: no great weapons). Ranger: Ranged & Skirmisher weapons. Mage/Ritualist/Warlock: Magic Orb, Magic Staff, Eldritch Relic. | DB |
| Item slots (8) | **Primary** (weapon, sets attack type; may carry a secondary ability + passive infusions), **Secondary** (shield/off-hand/dual), **Head, Torso, Legs, Ring, Mount, Miscellaneous** (trinket/wand). Mounts give Fast Movement and a little HP; some heavy weapons can't be used mounted; starting mount depends on race/form traits. | DB |
| Item tiers | **Tier I–IV** (the game uses tiers, not rarity words). Sell values 12 / 28 / 56 / 112 Gold. DB: 688 items (397 primaries). | DB/WEB |
| Item Forge | Needs *Wizard Tower: Item Forge* (200 Production, 100 Gold, 100 Mana) in the throne city. Build an item from **Infusion Points** (Damage / Ability / Passive infusions; max **5** points, 6 with a perk): **1–2 pts → Tier I, instant; 3 → Tier II, 1 turn; 4 → Tier III, 2 turns; 5 → Tier IV, 3 turns**, paid in **Binding Essence** (+ Binding Fragments; disenchanting loot returns essence). Custom names allowed. | DB/WEB |
| Hero cap | Limits recruitable heroes; rises over time; Imperium can raise it +1 instantly. Recruit offers ("wants to join for gold") come from your realm and met free cities (foreign race bonuses). | DB |
| Governors | A ruler/hero governing a city applies its **Governance trait** at **Renown level 1–4** (e.g. Agricultural: +5 Food/Farm → +5 stability/Farm → +1 gold/mana/knowledge per pop → −30% food for growth; Recruiting: +30 Draft → −20% unit gold → T1–2 +1 rank → T3–5 +1 rank; Fortifying L4: no siege/pillage penalties). Ruler always governs the throne city. | DB |
| Ambitions / Destinies & Renown | Each hero has a Destiny (Collector, Conqueror, Crusader, Defender, Delver, Dominator, Duelist, Elitist, Explorer, Fearmonger, Imperialist, Lawbringer, Martyr, Necromancer, Privateer, Prospector, Steward, Raider, Shepherd, Slayer, Instructor, Challenger, Gloryseeker) with a repeatable **Minor** and one-time **Major** ambition (e.g. Duelist: slay a Hero / slay a Ruler; Explorer: explore a Wonder / a Gold Wonder). Rewards: Renown (+ a unique property on the Major). Renown levels raise governor bonuses, army morale and reduce unit loss when routing. | DB |
| Death & imprisonment | See 3.5: Prison/Crypt random; ruler to Void 3 turns; Crypts/Prison Cells tower floors enable resurrect/convert; hero traits (Steeled, Lucky, Inspired…) can be gained/lost through events. | DB |
| Rulers | Origins: Champion, Wizard King (+10 casting points, Overchannel), Dragon Lord, Giant King, Eldritch Sovereign, Elder Vampire. Pantheon ascension after a won realm (Ascension Trait). | DB |

---

# 5. DIPLOMACY

## 5.1 States, treaties, alliances [DB]

| Item | Rule |
|---|---|
| Diplomatic states | **War**, **Peace** ("default state… path to war lies open"), **Alliance** ("strongest bond; allied victory possible; automatically called for aid in war"); plus **Vassal/Overlord** (a fixed alliance only the overlord can break; vassal joins overlord's wars and ends others; overlord gets income; vassals can't declare war). |
| Wizard's Bond | Prerequisite for advanced treaties: reveals both Throne Cities, enables Calls to War. Leads to Defensive Pact, Open Borders, Province-Claiming Pact (Good Neighbors), Teleporter Pact. |
| Defensive Pact | Auto Call to War when either is attacked; answering grants extra Grievance; declining breaks the pact. Leads to **Alliance** and Share Vision. +5 Imperium/turn with *Bonds of Brotherhood* (+15 for Alliance). |
| Alliance | Requires Defensive Pact; captured heroes auto-returned. |
| Other treaties | Open Borders, Share Vision, Research/Intelligence Sharing Pact, Teleporter Pact, Province-Claiming Pact, Truce (**10 turns**; declaring war during it = severe alignment penalty), resource trades (fixed-duration or per-turn), gifts, contact information, magic-material sharing, Return Captured Heroes. Treaties last indefinitely unless broken (evil act + Grievance) or war; unpaid treaties lapse. |
| Pronouncements | Declare **Friend / Rival** (changes value of new grievances; adds a growing relation modifier), **Denounce**, **Warn**, **Fabricate Grievance** (one per ruler, value 20, cannot be forgiven), **Call to War**, **Bounty** (needs Defensive Pact). |

## 5.2 Relations & opinion modifiers

- Numeric **Empire Relations**; needed for treaties, lowered relations raise war chance. Improved by high Alignment, pronouncements, gifts, trades; **+100 per shared Affinity**; realm traits can add −400 (Hostile Houses) or stacking negatives (Chaotic Influence).
- **Alignment** (Pure Good → Pure Evil, 7 levels) sets relations with good/evil rulers and free cities and skews random events; each level has a fixed relation value (data-driven placeholders).
- **AI personality traits** (hidden until discovered): *Never breaks Treaties*, *Favors Treaties*, *Wary of Treaties*, *War-driven* (provoked by minor grievances, never sells/forgives them), *Never Surrenders* (won't vassalise, eager to call/answer wars), plus preference modifiers (likes empires that keep treaties, dislikes those that break treaties or trade grievances, dislikes evil/expansionist rulers). Default personality is picked from the ruler's starting Affinity + Alignment. Map setting **AI passivity**: Passive / Low / Standard / Aggressive changes war willingness and starting dislike.
- Rankings shown: Economy, Expansion, Magic, Military, Overall.

## 5.3 Grievances & war justification [DB]

- **Grievances** = casus belli. Gained by: seeing a trespasser (per turn), a ruler building on your claimed province, being attacked, broken treaties, wars on your vassal/befriended city, vassalising a city you were negotiating with, capturing nearby wonders, building a nearby outpost, declining a call to war, declining trade, insults, first-meet hostility, unjustified wars, "taking over the world" (expansion), gathering many magic materials, obtaining a beacon, binding a gold wonder, attacking a shop/allied faction, false denouncements, evil alignment (Disdain for Evil). They can be **traded for resources**, forgiven, or sold (cooldown).
- **War Justification Balance** = your grievances against them **minus** theirs against you. Declare: *without justification* (alignment + relation penalties with everyone and an Imperium-income penalty for several turns), **minor (1–25)**, **moderate (26–50)**, **major (51+)** — higher tiers reduce/remove penalties and make others support you. A rivalry makes grievances count for more.
- Trespassing (armies in a domain without Open Borders) gives the owner a grievance each turn and lets them attack you without declaring war; a "diplomatic state change pending" turn prevents attacking the target on the turn a state changes.
- Wars end by defeat, truce/peace negotiation, or vassalisation; a defeated player's remaining cities become independent and may continue the war.

---

# 6. TURN / UI FLOW, DIFFICULTY

## 6.1 Turn structure

- World-map turns are **Classic** (sequential) or **Simultaneous** (multiplayer); combat turns alternate. Start of turn: income & upkeep applied, World Map Casting Points refilled, research/production/draft progress, spells "priming" advance, regeneration, siege damage applied, then the **notification feed** and Advisor messages; end of turn warns if armies still have Move Points.
- **Notification groups [DB]:** City, Combat, Diplomacy, Empire, Movement, Research, Siege, Spells, Victory.
- **Concrete event types [DB]:** city can annex its first/another province; city produced X / set new production / production cancelled (can't afford); set Arcane Research / chapter completed → pick a new tome; hero levelled up / unspent skill points / signature skill available / hero wants to join / governor not set; orders required (units with MP); units deserted / died / low morale / can be resurrected / captured / raised; domain invaded; infestation invasion sent; siege breach; spell cast on you; battle won/lost/drawn (yours and others'); treaty ended/expired/could not be afforded; trade proposal received/accepted/declined; war declared / peace / alliance / defensive pact / vassalage changes (yours and other rulers'); call to war / bounty updates; denouncements & warnings; claimed province taken; province rioting; city betraying you; race trait changed; realm trait revealed; personality trait discovered; Rally started; Whispering Stone returned; portal bound; city founded / lost.
- Advisor tips: first empire skill, low gold/food, hero cap, high Imperium, new province, low stability, nearby infestation.
- Victory conditions: **Military** (eliminate rulers), **Expansion** (own enough provinces → build 3 Beacons of Unity in different cities → light them and defend **15 turns**), **Magic** (Seed → Root → Heart affinity improvements, bound Gold wonders, then channel the victory spell), **Score** (turn limit), **Seals** and **Cataclysm** (DLC), Allied Victory toggle.

## 6.2 Difficulty & AI bonuses

- **AI difficulty tiers (UI strings):** Squire, Knight, King, Emperor (legacy naming); the launcher preset list is **Easy / Normal / Hard / Very Hard / Brutal**-style ("Casual, Standard, Hard, Brutal" in community guides). Higher tiers give the AI **economic bonuses (resource discounts, production/income, earlier outposts)** rather than smarter play; **Brutal defaults to a 15% AI combat advantage** (+15% damage dealt, −15% taken) [WEB]. All AIs get **−25% food cost for new population** at every difficulty [WEB].
- **Tactical AI profile** (separate setting for Lords / Free Cities / Marauders): *Forgiving* (careless positioning), *Challenging* (optimal positioning, focus fire), *Challenging+* (optimal **and deals 20% more damage, receives 20% less**). Plus an explicit **AI Combat Advantage %** slider.
- **World Threat**: Passive / Low / Normal / High (infestation strength and spawn rate).
- **Starting conditions**: Easy (+50% starting resources, larger army), Normal, Hard (fewer/weaker start).
- Other knobs: AI passivity, allied-unit takeover, observe combat, restart combat (never/AI only/always), hero resurgence, game speed, research speed, endless ranks, custom rulers, shops.

---

# APPENDIX A — Raw data tables (generated from aow4db)

A.1 City structures (base game) · A.2 Special province improvements (base game) · A.3 Siege projects · A.4 Ancient wonders · A.5 Magic materials

### CITY STRUCTURES (base game, non-DLC)

| Structure | Gold | Prod | Mana | Boost (−30% cost) | Effect |
|---|---|---|---|---|---|
| Teleporter | 280 | 750 | - | | |
| Academy | 170 | 450 | - | Build 1 Forester; Build 2 Quarry | [Req: Requires 1: Research Post] +20 Knowledge income |
| Academy of Potential | 170 | 450 | - | | +1 Starting Rank to every Battle Mage Unit.; +1 Starting Rank to every Support Unit.; +1 Starting Rank to every Magic Fighter Unit. — Contributes +1 Arcane Inspiration to a random spell each Turn. |
| Altar of the All-Seers | 170 | 450 | - | | +10 Astral Echoes income; Grants All-Seers Blessing to every Unit produced in this City. |
| Ancestral Seer Hall | 100 | 250 | - | Build 2 Quarry | +10 Draft income; +15 Mana income |
| Arcane Battlements | 50 | 130 | - | Build 1 Conduit; Build 1 Quarry | Unlock Arcane Amplifiers in combat — Battlement Structure |
| Arcane Institute | 100 | 250 | - | Build 1 Forester; Build 1 Quarry | +15 Knowledge income |
| Archer Battlements | 50 | 130 | - | Build 1 Forester; Build 1 Quarry | Unlock Archer Posts in combat — Battlement Structure |
| Armory | 170 | 450 | - | Build 3 Quarry | [Req: Requires 2: Foresters] +30 Draft income; +1 Starting Rank to every Tier I.; +1 Starting Rank to every Tier II. |
| Artisan Fortification | 170 | 450 | - | | Unlock Bolt Repeater Towers in Combat — A Tower Structure that grants the city Bolt Repeater Towers during siege combat. |
| Artisan Workshop | 60 | 130 | - | Build 1 Farm | +10 Production income; +5 Draft income; +5 City Stability income |
| Astral Amplifier Lens | 300 | 400 | 300 | | [Req: Only a single Amplifier Lens can be built in your Empire.] Astral Damage Spells deal +10 Lightning Damage and Astral Debuff Spells also inflict Sundered Resistance. |
| Astral Bolstering Matrix | 200 | 300 | 200 | | [Req: Only a single Bolstering Matrix can be built in your Empire.] Astral Buff and Healing Spells grant 3 Bolstered Resistance. |
| Astral Focus Crystal | 100 | 200 | 100 | | [Req: Only one Focus Crystal of your highest Affinity can be built.] +5 Imperium income — Astral Spells are 10% cheaper. |
| Astral Trade Relay | 170 | 450 | - | | +19 Gold income — +15 Gold income.; +4 Gold income for each Astral Trade Relay built in your empire. |
| Ballista Towers | 85 | 200 | - | Build 1 Forester; Build 2 Quarry | Unlock Ballista Towers — Tower Structure |
| Baron's Palace | 100 | 250 | - | | +20 Draft income; +10 City Stability income; +20 Food income; +20 Gold income; +5 Imperium income — This city gains:; +10 City Stability; +20 DraftYour Throne City gains:; +20 Gold; +20 Food; +5 ImperiumCan only be built in cities of another race. |
| Basalt Excavation | 100 | 250 | - | Build 1 Quarry | [Req: Requires 2 Lava improvement provinces to unlock.] +15 Production income |
| Bastion's Barricade | 170 | 450 | - | | +10 Fortification Health; +10 City Stability income — Grants 2 Bastions on the defender's side when fighting a defensive Siege. |
| Bathhouse | 170 | 450 | - | Build 1 Quarry; Build 2 Farm | +40 City Stability income; Grants Bathhouse: XP Bonus to every Unit produced in this City. |
| Battle Ritual Site | 60 | 130 | - | Build 1 Quarry | +5 Draft income; +10 Mana income |
| Beacon of Valor | 280 | 750 | - | Build 1 Conduit; Build 2 Quarry | Unlock Beacon of Valor — Support StructureCity gains +40 Draft additional income while under Siege. |
| Blacksmith | 100 | 250 | - | Build 2 Quarry | +20 Draft income; +1 Starting Rank to every Tier I. |
| Caltrop Stash | 100 | 250 | - | Build 1 Quarry; Build 1 Mine | Unlock Caltrop Stash — Support Structure |
| Catapult Towers | 140 | 300 | - | Build 1 Forester; Build 2 Quarry | Unlock Catapult Towers in combat — Tower Structure |
| Chaos Amplifier Lens | 300 | 400 | 300 | | [Req: Only a single Amplifier Lens can be built in your Empire.] Chaos Damage Spells deal +10 Fire Damage and Chaos Debuff Spells also inflict Misfortune. |
| Chaos Bolstering Matrix | 200 | 300 | 200 | | [Req: Only a single Bolstering Matrix can be built in your Empire.] Chaos Buff and Healing Spells grant 3 Strengthened. |
| Chaos Focus Crystal | 100 | 200 | 100 | | [Req: Only one Focus Crystal of your highest Affinity can be built.] +5 Imperium income — Chaos Spells are 10% cheaper. |
| Collector | 100 | 250 | - | Build 2 Farm | +30 Gold income; -10 City Stability income |
| Convent | 100 | 250 | - | | For each City Stability level above Unstable the city gains:; +5 Knowledge.; +5 Mana. |
| Crucible Battlements | 170 | 450 | - | | Unlock Crucible Battlements in Combat — Battlement Structure; Battlements grant Missile and Magic attacks:; Deals +4 Fire Damage.; Sets affected hexes On Fire.; Ignore Obscured on targets.; +1 Range; The City ignores negative City Stability penalties from anne |
| Crypt-Temple | - | 450 | - | Build 3 Quarry | +40 Mana income; +20 City Stability income |
| Eldritch Walls | 170 | 450 | - | | A Wall Structure in a City forces enemies to enter a siege when attacking the city.; +30 Fortification Health — Wall StructureCannot suffer additional breaches through Siege Project |
| Estate Hall | 170 | 450 | - | Build 3 Forester | [Req: Requires 2: Farms] +30 Food income |
| Evocator's Abode | 60 | 130 | - | Build 1 Farm | +10 Production income; +5 Draft income; +5 Mana income |
| Farmers' Guild | 280 | 750 | - | Build 4 Forester | [Req: Requires 4: Farms.] +10 Food income per Farm: — This city produces +30% Food income. |
| Fishmonger | 100 | 250 | - | Build 2 Forester | [Req: Requires 2: Water provinces to unlock] +15 Food income |
| Forager's Market | 60 | 130 | - | Build 3 Hut | [Req: Requires 1: Hut to unlock.] +5 Food income; +5 Gold income |
| Forester's Guild | 170 | 450 | - | Build 4 Forester | [Req: Requires 3: Forester to unlock.] +15 Food income; +5 Production income |
| Granary | 100 | 250 | - | Build 2 Forester | +20 Food income |
| Grand Mill | 100 | 250 | - | Build 2 Forester | +20 Food income; +10 Production income |
| Grand Wharf | 170 | 450 | - | Build 3 Forester | [Req: Requires 3: Water provinces to unlock] +20 Production income |
| Grave Obelisk | - | 250 | - | Build 2 Quarry | +30 Mana income; +10 City Stability income |
| Healing Spires | 85 | 200 | - | | Unlock ; +10 City Stability income; Grants Healing Spires to every Friendly Unit inside this Domain. — Tower Structure; Adds 4 Healing Spires in Combat during a Siege.; Friendly units in the domain heal +12 Hit Points per Turn.; +10 City Stability |
| Hero's Forum | 170 | 450 | - | Build 2 Forester | |
| Hero's Inn | 280 | 750 | - | Build 3 Forester | |
| Hero's Lodge | 100 | 250 | - | Build 1 Forester | |
| Hero's Quarters | 440 | 1300 | - | Build 4 Forester | |
| House Hunting Grounds | 60 | 130 | - | Build 1 Forester | +10 Food income; +5 Draft income |
| Library | 60 | 130 | - | Build 1 Forester | +10 Knowledge income |
| Lightforge | 100 | 250 | - | Build 2 Quarry | +20 Draft income; +10 Gold income; +1 Starting Rank to every Tier I. |
| Lord's Manor | 170 | 450 | - | | +10 Food income; +10 Draft income; +5 City Stability income — For each level of Renown the Governor has, the city gains:; +10 Food; +10 Draft; +5 City Stability |
| Luxury Markets | 170 | 450 | - | | +1 Hurry Production per Turn — Buy Now is 25% cheaper and can be used 2 times per World Map Turn. |
| Mages' Guild | 280 | 750 | - | Build 4 Quarry | [Req: Requires 2: Conduits] +10 Mana income per Conduit: |
| Mana Obelisk | 100 | 250 | - | Build 2 Quarry | +15 Mana income |
| Market | 100 | 250 | - | Build 2 Farm | +15 Gold income |
| Masonic Hall | 170 | 450 | - | Build 3 Farm | [Req: Requires 2: Quarries] +20 Production income |
| Materium Amplifier Lens | 300 | 400 | 300 | | [Req: Only a single Amplifier Lens can be built in your Empire.] Materium Damage Spells deal +10 Physical Damage and Materium Debuff Spells also inflict Sundered Defense. |
| Materium Bolstering Matrix | 200 | 300 | 200 | | [Req: Only a single Bolstering Matrix can be built in your Empire.] Materium Buff and Healing Spells grant 3 Bolstered Defense. |
| Materium Focus Crystal | 100 | 250 | - | | [Req: Only one Focus Crystal of your highest Affinity can be built.] +5 Imperium income — Materium Spells are 10% cheaper. |
| Merchants' Guild | 280 | 750 | - | Build 4 Farm | [Req: Requires 2: Mines] +10 Gold income per Mine: |
| Militia Barracks | 60 | 130 | - | Build 1 Farm | +10 Production income; +5 Draft income; +5 City Stability income |
| Mineral Extractor | 60 | 130 | - | Build 1 Quarry | [Req: Requires 1 Lava improvement provinces to unlock.] +5 Gold income; +5 Mana income |
| Mint | 170 | 450 | - | Build 3 Farm | [Req: Requires 1: Mine] +20 Gold income |
| Monolith | 170 | 450 | - | Build 3 Quarry | [Req: Requires 1: Conduit] +20 Mana income |
| Monument of Supremacy | 170 | 450 | - | | +30 Draft income; +5 City Stability income — +5 City Stability per Monument of Supremacy in your empire. |
| Nature Amplifier Lens | 300 | 400 | 300 | | [Req: Only a single Amplifier Lens can be built in your Empire.] Nature Damage Spells deal +10 Blight Damage and Nature Debuff Spells also inflict Weakened. |
| Nature Bolstering Matrix | 200 | 300 | 200 | | [Req: Only a single Bolstering Matrix can be built in your Empire.] Nature Buff and Healing Spells heal for +10 Temporary Hit Points. |
| Nature Focus Crystal | 100 | 200 | 100 | | [Req: Only one Focus Crystal of your highest Affinity can be built.] +5 Imperium income — Nature Spells are 10% cheaper. |
| Necrotic Spires | 85 | 200 | - | Build 2 Conduit | Unlock Necrotic Spires in Combat; Grants Necrotic Spires to every Friendly Unit inside this Domain. — Tower Structure; Adds 4 Necrotic Spires in Combat during a Siege.; Friendly Undead units in the domain heal +12 Hit Points per turn. |
| Obsidian Weaponsmith | 170 | 450 | - | Build 3 Quarry | [Req: Requires 3 Lava improvement provinces to unlock.] +20 Draft income |
| Order Amplifier Lens | 300 | 400 | 300 | | [Req: Only a single Amplifier Lens can be built in your Empire.] Order Damage Spells deal +10 Spirit Damage and Order Debuff Spells remove all Positive Status Effects from their targets. |
| Order Bolstering Matrix | 200 | 300 | 200 | | [Req: Only a single Bolstering Matrix can be built in your Empire.] Order Buff and Healing Spells grant 3 Fortune. |
| Order Focus Crystal | 100 | 200 | 100 | | [Req: Only one Focus Crystal of your highest Affinity can be built.] +5 Imperium income — Order Spells are 10% cheaper. |
| Overlord's Tower | 170 | 450 | - | | +5 Imperium income; +5 City Stability income — +5 Imperium income; +5 City Stability income per Vassal |
| Palisade Walls | 60 | 130 | - | Build 1 Forester | Units stationed in the city gain 5 Experience each Turn.; A Wall Structure in a City forces enemies to enter a siege when attacking the city.; +20 Fortification Health — Wall Structure |
| Reagent Refinery | 170 | 450 | - | | +10 Gold income; +10 Food income per Magic Material inside Domain:; +10 Draft income per Magic Material inside Domain: |
| Retainer's Estate | 170 | 450 | - | | +20 Food income; +10 Gold income; +10 City Stability income — While this city shares a border with the Throne City or is the Throne City gain:; +20 Food income; +10 Gold income; +10 City Stability income |
| Royal Smith | 100 | 250 | - | Build 2 Quarry | +20 Draft income; +10 City Stability income; +1 Starting Rank to every Tier I. |
| Satiated Abductor Towers | 100 | 250 | - | | Unlock Satiated Abductor Towers; +10 Fortification Health |
| Scholars Guild | 280 | 750 | - | Build 2 Forester; Build 2 Quarry | [Req: Requires 2: Research Posts] +10 Knowledge income per Research Post: |
| Seafarers' Guild | 280 | 750 | - | Build 4 Forester | [Req: Requires 4: Fisheries to unlock] +3 Food income per Coast:; +3 Production income per Coast:; +3 Draft income per Coast:; +3 Gold income per Coast:; +3 Food income per Water:; +3 Production income per Water:; +3 Draft income per Water:; +3 Gold income per |
| Serf Quarters | 100 | 250 | - | Build 2 Forester | +20 Food income; +10 Draft income |
| Shadow Amplifier Lens | 300 | 400 | 300 | | [Req: Only a single Amplifier Lens can be built in your Empire.] Shadow Damage Spells deal +10 Frost Damage and Shadow Debuff Spells also inflict Status Vulnerability. |
| Shadow Bolstering Matrix | 200 | 300 | 200 | | [Req: Only a single Bolstering Matrix can be built in your Empire.] Shadow Buff and Healing Spells grant 3 stacks of Evasion. |
| Shadow Focus Crystal | 100 | 200 | 100 | | [Req: Only one Focus Crystal of your highest Affinity can be built.] +5 Imperium income — Shadow Spells are 10% cheaper. |
| Shadowtrade Quarter | 170 | 450 | - | Build 3 Farm | +40 Gold income; -10 City Stability income |
| Shipyard | 60 | 130 | - | Build 1 Forester | [Req: Requires 1: Water provinces to unlock] +10 Gold income |
| Shrine | 60 | 130 | - | Build 1 Quarry | +10 Mana income |
| Shrine of the Wargod | 170 | 450 | - | | Grants Wargod's Spirit to every Friendly Unit inside this Domain.; Grants Wargod's Aggression to every Unit produced in this City. — Units built in this City gain +2 Physical Damage on base non-Magic attacks. This effect is increased for Single Shot attacks.; |
| Smiths' Guild | 280 | 750 | - | Build 4 Quarry | [Req: Requires 4: Foresters] +5 Food income per Forester:; +5 Draft income per Forester:; +1 Starting Rank to every Tier I.; +1 Starting Rank to every Tier II.; +1 Starting Rank to every Tier III. |
| Solar Nexus | 170 | 450 | - | | +5 City Stability income per Conduit:; +5 City Stability income per Research Post: |
| Soulvault | - | 450 | - | | +10 Knowledge income — This city's Governor gains Soulvault Meditation. |
| Stone Conjurer | 100 | 250 | - | Build 2 Farm | +15 Production income; +10 Mana income |
| Stone Walls | 85 | 200 | - | Build 3 Quarry | Units stationed in the city gain 15 Experience each Turn.; A Wall Structure in a City forces enemies to enter a siege when attacking the city.; +30 Fortification Health — Wall Structure |
| Stonemason | 100 | 250 | - | Build 2 Farm | +15 Production income |
| Store House | 60 | 130 | - | Build 1 Forester | +10 Food income |
| Summoners' Cistern | 170 | 450 | - | | +30 Mana income |
| Tavern | 100 | 250 | - | Build 2 Farm | +20 City Stability income |
| Temple of Fertility | 100 | 250 | - | | +10 Food income; +3 Food income per Population:; +2 Draft income per Population: |
| Temple of the Exalted | 280 | 750 | - | | +30 Mana income; +30 City Stability income |
| Throne of Mirrors | 170 | 450 | - | | When a fight occurs in the city's domain, the player gains an Astral Reflection of their Ruler if they are not present themselves.; Your Ruler gains 10 Experience per Turn per owned City with this city structure built. |
| Tower of True Sight | 100 | 250 | - | | +10 City Stability income; +10 Knowledge income; Grants True Sight; +6 Vision Range — +10 City Stability; +10 Knowledge; +6 Vision Range; True Sight making it possible to spot camouflaged enemies near the city. |
| Town Hall II: Atrium of Light | 200 | 200 | - | Have 5 Population | [Req: Requires 3 Population to unlock] +1 Province Annex Range; +10 Gold income — Unlocks Special Province Improvements. |
| Town Hall II: Bulwark | 160 | 160 | - | Have 5 Population | [Req: Requires 3 Population to unlock] +1 Province Annex Range; +10 Gold income — Unlocks Special Province Improvements. |
| Town Hall II: Castle | 200 | 200 | - | Have 5 Population | [Req: Requires 3 Population to unlock] +1 Province Annex Range; +10 Gold income — Unlocks Special Province Improvements. |
| Town Hall II: Communal Tent | 200 | 200 | - | Have 5 Population | [Req: Requires 3 Population to unlock] +1 Province Annex Range; +10 Gold income — Unlocks Special Province Improvements. |
| Town Hall II: Dread Spire | 200 | 200 | - | Have 5 Population | [Req: Requires 3 Population to unlock] +1 Province Annex Range; +10 Gold income — Unlocks Special Province Improvements. |
| Town Hall II: Mage's Plaza | 200 | 200 | - | Have 5 Population | [Req: Requires 3 Population to unlock] +1 Province Annex Range; +10 Gold income — Unlocks Special Province Improvements. |
| Town Hall III: Citadel | 400 | 400 | - | Have 10 Population | +1 Province Annex Range; +10 Gold income — Unlocks the Spell Jammer. |
| Town Hall III: Forge Tower | 320 | 320 | - | Have 10 Population | +1 Province Annex Range; +10 Gold income — Unlocks the Spell Jammer. |
| Town Hall III: Halls of War | 400 | 400 | - | Have 10 Population | +1 Province Annex Range; +10 Gold income — Unlocks the Spell Jammer. |
| Town Hall III: Mystic Spire | 400 | 400 | - | Have 10 Population | +1 Province Annex Range; +10 Gold income — Unlocks the Spell Jammer. |
| Town Hall III: Pantheon | 400 | 400 | - | Have 10 Population | +1 Province Annex Range; +10 Gold income — Unlocks the Spell Jammer. |
| Town Hall III: Stronghold | 400 | 400 | - | Have 10 Population | +1 Province Annex Range; +10 Gold income — Unlocks the Spell Jammer. |
| Town Hall IV: Black Palace | 800 | 800 | - | Have 15 Population | +1 Province Annex Range; +10 Gold income; +2 City Stability income per Population: |
| Town Hall IV: Grand Estate | 800 | 800 | - | Have 15 Population | +1 Province Annex Range; +10 Gold income; +2 City Stability income per Population: |
| Town Hall IV: Industry Compound | 660 | 660 | - | Have 15 Population | +1 Province Annex Range; +10 Gold income; +2 City Stability income per Population: — Production Conversions convert an additional 10%. |
| Town Hall IV: Solar Sanctum | 800 | 800 | - | Have 15 Population | +1 Province Annex Range; +10 Gold income; +2 City Stability income per Population: |
| Town Hall IV: Warlord's Pavilion | 800 | 800 | - | Have 15 Population | +1 Province Annex Range; +10 Gold income; +2 City Stability income per Population: |
| Town Hall IV: Wizard's Auditorium | 800 | 800 | - | Have 15 Population | +1 Province Annex Range; +10 Combat Casting Point; +10 World Map Casting Point; +10 Gold income; +2 City Stability income per Population: — 10 World Map Casting Points and Combat Casting Points. |
| Tribunal | 100 | 250 | - | | +20 City Stability income; +1 Knowledge income per Population: |
| Vendor | 60 | 130 | - | Build 1 Farm | +10 Gold income |
| Volcanologists' Guild | 280 | 750 | - | Build 4 Quarry | [Req: Requires 4 Lava improvement provinces to unlock.] +5 Production income per Lava:; +3 Knowledge income per Lava: — Per Lava province:; +5 Production; +3 Knowledge |
| Watch Tower | 100 | 250 | - | | +4 Vision Range — Builds a Watch Tower in this outpost, granting the outpost +4 Vision Range and +4 Sensing Range. |
| Wizard Tower: Apex | 450 | 800 | 450 | Have 16 Population | [Req: Can only be built in the Throne City.] +5 Imperium income; +3 Vision Range — +1 Starting Rank to every summoned Tier 1, Tier 2, and Tier 3 Magic Origin unit.; Unlocks Summoning Tier IV and V Units. |
| Wizard Tower: Arcane Observatory | 300 | 400 | 300 | | Grants True Sight; +6 Vision Range — +6 Vision Range and True Sight to this City. |
| Wizard Tower: Chambers | 150 | 300 | 150 | Have 5 Population | [Req: Can only be built in the Throne City.] +5 Imperium income; +3 Vision Range — +1 Starting Rank to every summoned Tier 1 Magic Origin unit.; Unlocks Summoning Tier II Units. |
| Wizard Tower: Channeling Chamber | 200 | 300 | 200 | | +1 Spell Slot; +10 Combat Casting Point; +10 World Map Casting Point |
| Wizard Tower: Crypts | 50 | 100 | 50 | | +2 Mana income per hero in the Crypt: — Heroes in the Crypt can be resurrected. |
| Wizard Tower: Foundation | 50 | 100 | 50 | | [Req: Can only be built in the Throne City.] +5 Imperium income; +3 Vision Range |
| Wizard Tower: High Halls | 250 | 400 | 250 | Have 10 Population | [Req: Can only be built in the Throne City.] +5 Imperium income; +3 Vision Range — +1 Starting Rank to every summoned Tier 1 and Tier 2 Magic Origin unit.; Unlocks Summoning Tier III Units. |
| Wizard Tower: Item Forge | 100 | 200 | 100 | | [Req: Can only be built in the Throne City.] Unlocks the Item Forge — Unlocks the Item Forge, allowing you to create custom Hero Items using Binding Essence. |
| Wizard Tower: Prison Cells | 50 | 100 | 50 | | +2 Knowledge income per hero in the Prison: — Heroes in the Prison can be converted. |
| Wizard Tower: Room of Recall | 100 | 200 | 100 | | -1 Turn(s) to respawn Ruler. — Gain access to the Recall Ruler spell, which allows your Ruler and their army to be teleported back to your Throne City. |
| Wizard Tower: Teleportation Circle | 300 | 400 | 300 | | Grants Teleportation Circle Spell, allowing friendly Armies to be teleported back to the Throne City. |
| Wood Conjurer | 100 | 250 | - | Build 3 Forester | [Req: Requires 2: Foresters] +10 Production income; +5 Mana income |
| Woodworker | 100 | 250 | - | Build 3 Forester | [Req: Requires 2: Foresters] +5 Food income; +10 Production income |
| Worker's Farmstead | 60 | 130 | - | Build 1 Forester | +10 Food income; +5 Production income |
| Workers' Guild | 280 | 750 | - | Build 4 Farm | [Req: Requires 4: Quarry to unlock.] +10 Fortification Health; +10 Production income per Quarry: |
| Workshop | 60 | 130 | - | Build 1 Farm | +10 Production income; +5 Draft income |

### SPECIAL PROVINCE IMPROVEMENTS (base game, non-DLC)

| Improvement | Counts as | Gold | Prod | Effect |
|---|---|---|---|---|
| Astral Manalith | conduit | 60 | 130 | +10 Mana income.; +5 Mana per adjacent Conduit or Research Post.; Counts as a Conduit. |
| Channeling Tower | conduit | 100 | 250 | +10 Mana.; +3 Mana per adjacent Conduit.; Counts as a Conduit. |
| Doomdepth Trench | conduit | 100 | 250 | -5 City Stability.; +10 Mana.; +10 Knowledge.; +3 Mana and Knowledge for each Alignment level below Neutral.; Counts as a Conduit. |
| Excavated Ley Line | conduit | 100 | 250 | +5 Production.; +5 Mana.; +5 World Map Casting Points.; +4 Mana per adjacent Quarry.; Counts as a Conduit. |
| Herbalist | conduit | 60 | 130 | +5 Food.; +5 Mana.; Per adjacent Province with Forest or Swamp:; +2 Food.; +2 Mana.; Friendly Armies in this City's Domain regenerate an additional +5 Hit Points per Turn.; Counts as a Conduit. |
| Mystic Abbey | conduit | 60 | 130 | +10 Mana income.; +3 Knowledge per adjacent Conduit or Research Post.; Counts as a Conduit. |
| Resonance Fields | conduit | 100 | 250 | +5 Mana.; +5 World Map Casting Points.; +5 Combat Casting Points.; Counts as a Conduit. |
| Ruler's Statue | conduit | 170 | 450 | Can only be built once in your Throne City.; Allied Empires and Free Cities with a Supreme Vassalage grant 3 Imperium.; Ruler respawns 1 Turn faster.; Spells can be cast even if the Ruler is in the void.; Counts as a Conduit. |
| Sanctuary | conduit | 170 | 450 | +15 Mana.; Pillaging Province Improvements in this domain takes +2 and yields -30% resources.; Counts as a Conduit. |
| Spell Jammer | conduit | 100 | 250 | Enemies cannot target World Map Spells in this Domain.; Enemy Spells cost +100% Combat Casting Points in Combat in Domain.; -10 Mana.; Counts as a Conduit. |
| Summoning Well | conduit | 100 | 250 | +10 Mana.; +2 Mana and +2 Knowledge per adjacent Conduit or Research Post.; Combat Summon Spells in the domain cost -50% less mana.; Counts as a Conduit. |
| Beacon of Unity | expansionvictory | 280 | 750 | A Special Province Improvement that is built as part of the Expansion Victory. Once three Beacons have been built, an option to Light the Beacons will appear. Lighting the Beacons will start a Turn timer counting down to victory. |
| Bountiful Fields | farm | 100 | 250 | +10 Food income.; Per adjacent Province with Grasslands or Fungal Fields:; +3 Food.; +3 Mana.; Counts as a Farm. |
| Farmstead | farm | 60 | 130 | +15 Food income.; +5 Food per adjacent Farm.; Counts as a Farm. |
| Garden of Bliss | farm | 170 | 450 | +15 City Stability.; +7 Food per adjacent Grasslands Province.; Convert 10% of Food income into Mana.; Counts as a Farm. |
| Sacred Meadow | farm | 100 | 250 | +10 Food.; +5 City Stability per adjacent Conduit.; Grants Encouraged at start of next Combat to friendly Units on this hex, 5 Turn cooldown.; Counts as a Farm. |
| Carnival of Flesh | farms | 100 | 250 | +7 Food.; +7 Draft.; Per adjacent Farm:; +3 Food.; +3 Draft.; Counts as a Farm. |
| Forest of Stakes | forester | 60 | 130 | +7 Food income.; +7 Production income.; +7 Draft per adjacent Forester.; Enemy Units in this Domain get Demoralized.; Counts as a Forester. |
| Mob Camp | forester | 60 | 130 | +7 Food.; +7 Draft.; Unit deployment location.; Tier I Units are cheaper by 20%.; Counts as a Forester. |
| Ritual Pyre | forester | 60 | 130 | +10 Mana income.; +3 Mana per adjacent Forester.; Allows the drafting of Inferno Puppies.; Counts as a Forester. |
| Wildlife Sanctuary | forester | 100 | 250 | +10 Food.; +5 Draft per adjacent Province with Forest.; Unlocks the production of various Animal Units.; Counts as a Forester. |
| Heart of Astral | magicvictory | 400 | 700 | +1 Astral Affinity.; Astral Damage Spells deal +20 Lightning Damage.; Astral Debuff Spells inflict 2 Sundered Resistance.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Heart of Chaos | magicvictory | 400 | 700 | +1 Chaos Affinity.; Chaos Damage Spells deal +20 Fire Damage.; Chaos Debuff Spells inflict 2 Misfortune.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Heart of Materium | magicvictory | 400 | 700 | +1 Materium Affinity.; Materium Damage Spells deal +20 Physical Damage.; Materium Debuff Spells inflict 2 Sundered Defense.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Heart of Nature | magicvictory | 400 | 700 | +1 Nature Affinity.; Nature Damage Spells deal +20 Blight Damage.; Nature Debuff Spells inflict 2 Weakened.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Heart of Order | magicvictory | 400 | 700 | +1 Order Affinity.; Order Damage Spells deal +20 Spirit Damage.; Order Debuff Spells also remove all Positive Status Effects.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Heart of Shadow | magicvictory | 400 | 700 | +1 Shadow Affinity.; Shadow Damage Spells deal +20 Frost Damage.; Shadow Debuff Spells inflict 2 Status Vulnerability.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Root of Astral | magicvictory | 300 | 500 | +1 Astral Affinity.; Astral Spells are 20% cheaper to cast.; Astral Buff and Healing Spells grant 2 Bolstered Resistance.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Root of Chaos | magicvictory | 300 | 500 | +1 Chaos Affinity.; Chaos Spells are 20% cheaper to cast.; Chaos Buff and Healing Spells grant 2 Strengthened.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Root of Materium | magicvictory | 300 | 500 | +1 Materium Affinity.; Materium Spells are 20% cheaper to cast.; Materium Buff and Healing Spells grant 2 Bolstered Defense.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Root of Nature | magicvictory | 300 | 500 | +1 Nature Affinity.; Nature Spells are 20% cheaper to cast.; Nature Buff and Healing Spells heal +10 Temporary Hit Points.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Root of Order | magicvictory | 300 | 500 | +1 Order Affinity; Order Spells are 20% cheaper to cast.; Order Buff and Healing Spells grant 2 Fortune.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Root of Shadow | magicvictory | 300 | 500 | +1 Shadow Affinity.; Shadow Spells are 20% cheaper to cast.; Shadow Buff and Healing Spells grant 3 Evasion.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Seed of Astral | magicvictory | 200 | 300 | +1 Astral Affinity; Astral research cost -20% Knowledge.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Seed of Chaos | magicvictory | 200 | 300 | +1 Chaos Affinity.; Chaos research cost -20% Knowledge.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Seed of Materium | magicvictory | 200 | 300 | +1 Materium Affinity.; Materium research cost -20% Knowledge.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Seed of Nature | magicvictory | 200 | 300 | +1 Nature Affinity; Nature research costs -20% Knowledge.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Seed of Order | magicvictory | 200 | 300 | +1 Order Affinity.; Order research costs -20% Knowledge.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Seed of Shadow | magicvictory | 200 | 300 | +1 Shadow Affinity.; Shadow research costs -20% Knowledge.; Required for the Magic Victory.; Once built, will reveal its location to all other Empires. |
| Bazaar of Wonders | mine | 170 | 450 | +10 Gold.; +5 Gold per unique adjacent Province Improvement.; Counts as a Mine. |
| Dark Forge | mine | 60 | 130 | +10 Gold.; +5 Production per adjacent Quarry, Mine, or Forester.; Counts as a Mine. |
| Golem Mine | mine | 100 | 250 | +10 Gold.; +5 Production per adjacent Quarry.; Spawns an Iron Golem on the owner's side for Combat in this Domain.; Counts as a Mine. |
| Great Foundry | mine | 170 | 450 | +10 Gold.; Per adjacent Mine:; +5 Draft.; +3 Gold.; Counts as a Mine.; Allows for the drafting of Magma Spirit. |
| Tithe Collector | mine | 100 | 250 | +10 Gold.; +2 Gold per adjacent Farm or Forester.; Counts as a Mine. |
| Transmutation Circle | mine | 100 | 250 | Once built, can replicate the effects and income of a Magic Material.; Counts as a Mine. |
| Builder's Quarters | quarry | 60 | 130 | +15 Production income.; +5 Production per adjacent Quarry.; Counts as a Quarry. |
| Central Quarry | quarry | 60 | 130 | +15 Production.; +5 Production per adjacent Quarry.; Counts as a Quarry. |
| Circle of Zealotry | quarry | 60 | 130 | +10 Draft per positive or negative level of alignment.; +2 City Stability per adjacent Province Improvement.; Unit deployment location.; Counts as a Quarry. |
| Runecarver's Camp | quarry | 60 | 130 | +15 Draft.; +3 Mana per adjacent Quarry.; Unit deployment location.; Counts as a Quarry. |
| Abbey | researchpost | 60 | 130 | +10 Knowledge; +3 Knowledge per adjacent Farm.; Grants Status Protection at the start of the next Combat to all friendly Units on this hex. 3 Turn cooldown.; Counts as a Research Post. |
| Frostspire | researchpost | 170 | 450 | +10 Knowledge.; +3 Knowledge per adjacent Snow or Ice Province.; Visiting units gain Icetouch until the end of the next battle, giving their physical attacks a base 30% chance of inflicting Frozen.; Counts as a Research Post. |
| Mausoleum | researchpost | - | 130 | +10 Knowledge income.; +3 Knowledge per adjacent Conduit.; Counts as a Research Post. |
| School of Cryomancy | researchpost | 100 | 250 | +10 Knowledge.; +3 Mana per adjacent Snow or Ice Province.; Counts as a Research Post. |
| Soulwell | researchpost | 100 | 250 | +5 Souls.; +3 Mana per adjacent Research Post or Conduit.; Counts as a Research Post. |
| Spell Arcanist Library | researchpost | 60 | 130 | +10 Knowledge income.; +3 Knowledge per adjacent Conduit or Research Post.; Counts as a Research Post. |
| Sunshrine | researchpost | 60 | 130 | +10 Knowledge income.; +3 Knowledge per adjacent Research Post.; Friendly Units in this Domain are Encouraged.; Counts as a Research Post. |
| Chrono Gate | teleporter | 170 | 450 | +3 Mana per adjacent Conduit or Research Post.; +3 Knowledge per adjacent Conduit or Research Post.; Grants Evasion to visiting Armies until their next combat.; Functions as a Teleporter. |
| Demon Gate | teleporter | 170 | 450 | Unlocks the production of various Infernal Fiend Units.; Unit deployment location.; Functions as a Teleporter. |
| Teleporter | teleporter | 100 | 250 | A Province Improvement which enables an Army to teleport from one teleporter to another.-10 Mana. |
| Beacon of Unity Ruins | - | 170 | 450 | Ruined Beacon of Unity |
| Magic Ruins | - | 170 | 450 | Ruins of a Magic Victory structure |

### SIEGE PROJECTS

| Project | Cost | Fortification dmg | Needs research | DLC | Effect |
|---|---|---|---|---|---|
| Arcane Accumulation | 100 mana | +0 | yes | base | At the start of combat, gain 50 Combat Casting Points.; During combat, all enemy Units suffer -1 Resistance. |
| Autumnstorm Evocation | 150 mana | +2 | yes | ELDRITCHREALMS | Every 2 turns in combat, a random enemy is hit by the Fulmination spell. |
| Burn Battlements | 100 gold | +0 | no | base | Battlement positions have 25% chance of being On Fire at the start of combat. |
| Captivating Mists | - | +3 | yes | ELDRITCHREALMS | While besieged, the city loses -1 Population each Turn. When it reaches 0 Population, the city will be razed. |
| Conqueror's Edict | 60 mana | +4 | yes | RISEFROMRUIN | At the start of combat random hexes are set On Fire.; During battle all friendly units gain +15% Critical Hit chance.; If victorious, Razing and Migrating this city requires 1 fewer Turns. |
| Construct Bolt Repeaters | 160 gold | +2 | yes | base | At the start of the battle, gain 2 Bolt Repeater units on the attacker's side until the end of battle.; Bolt Repeaters are immobile Siegecraft Units with long range area of effect attacks that are repeating, unlike Onagers.; Only one type of Siegecraft unit ca |
| Construct Devastator Spheres | 100 gold 100 mana | +3 | yes | base | At the start of battle, the attacker gains 2 Devastator Sphere until the end of battle.; Devastator Spheres are Siegecraft Units that can detonate themselves into target obstacles or Unit to deal massive damage and destroy obstacles.; Only one type of Siegecra |
| Construct Great Bombard | 150 gold | +3 | yes | EMPIRESANDASHES | At the start of the battle, gain Great Bombard on the attacker's side until the end of battle. ; Great Bombard is an immobile Siegecraft Unit.; Only one type of Siegecraft unit can be brought into Combat. |
| Construct Onagers | 200 gold | +0 | no | base | At the start of the battle, gain 2 Onagers on the attacker's side until the end of battle.; Onagers are immobile Siegecraft Units with long range, area of effect attacks that are great for destroying obstacles, but are inaccurate against Units.; Only one type |
| Construct Siege Guns | 200 gold | +2 | yes | EMPIRESANDASHES | At the start of the battle, gain 2 Magelock Cannon units on the attacker's side until the end of battle.; Only one type of Siegecraft unit can be brought into Combat. |
| Create Earthshatter Engines | 200 gold 100 mana | +5 | yes | base | At the start of the battle, all Wall obstacles are damaged.; At the start of the battle, gain 2 Earthshatter Engine units on the attacker's side until the end of battle.; Earthshatter Engines are Siegecraft Units with short range, area of effect attacks that c |
| Dragon Attack | 150 mana | +5 | yes | DRAGONLORDS | At the start of combat:; Units defending the city take 26 Fire Damage.; Units defending the city have a base 120% of suffering Burning.; Random positions are On Fire.; Most Battlement Structure obstacles are On Fire. |
| Foresee Downfall | 70 mana | +0 | yes | ARCHONPROPHECY | At the start of combat:; Friendly units gain:; Precognition; +10% Critical Hit Chance for the duration of combat.; Enemy units gain:; A 10% Fumble chance for the duration of combat. |
| Fumigation | 40 mana | +0 | yes | EMPIRESANDASHES | At the start of combat units defending the city:; Suffer 16 Blight Damage.; Suffer 2 Weakened. |
| Harass Defenders | 60 gold | +0 | no | base | Units defending the city take 20 Physical Damage at the start of combat. |
| Headlong Assault | - | +5 | no | base | Units besieging the city take 20 Physical Damage and suffer Exhausted at the start of combat. |
| Incite Rebellion | 150 gold 150 mana | +0 | yes | base | After 1 in battle, 3 enemy non-Hero units are Mind-Controlled until the end of combat.; The city suffers -50 City Stability while it is besieged. |
| Raiding Party | - | +0 | no | base | When the walls are breached, gain 50 Gold per tier of the besieged City.; When the walls are breached, you gain -5 Alignment. |
| Revels of Blood | 50 mana | +0 | yes | base | At the start of the battle, attacking units gain 10 Morale and defending units are inflicted with 2 Bleeding for 3 Turns |
| Ritual of Calamity | 100 gold 150 mana | +0 | yes | WAYSOFWAR | At the start of every Turn during the siege, a random Province Improvement of the besieged city is pillaged, granting you rewards.; At the start of combat:; All defenders gain a stack of Ghostfire for 3 Turns.; 2 Accursed Ogres appear on the attacker's side. |
| Soul Siphon Ritual | 150 mana | +0 | yes | base | When the walls are breached, you gain +40 Souls per Tier of the besieged City; At the start of the battle:; Gain 6 Decaying Zombie units.; All enemy units gain Soulbound. |
| Sow Confusion | 20 mana | +0 | yes | base | At the start of the battle, enemy units:; Are displaced by 4 hexes.; Suffer Misfortune for 3 Turns.; Suffer Slowed for 1 Turn. |
| Springvine Evocation | 150 mana | +2 | yes | ELDRITCHREALMS | Every 2 turns in combat, a random ally is healed by the Healing Roots spell. |
| Subjugating Raid | - | +0 | yes | base | When the walls are breached, the besieged City loses -2 Population.; Closest owned City gains +2 Population.; At the start of the battle, all enemy units have -10 Morale until the end of battle. |
| Summerburst Evocation | 150 mana | +2 | yes | ELDRITCHREALMS | Every 2 turns in combat, a random enemy is hit by the Ignite spell. |
| Tower Bombardment | 100 mana | +0 | no | base | At the start of combat, a random Tower Unit takes 20 Physical Damage, repeats 4 times. |
| Tremor Ritual | 100 gold 100 mana | +3 | yes | base | In battle, every 2 Turns a random enemy unit is struck by an earthquake:; Enemy non-flying, non-floating units within 2-hex radius take 10 Physical Damage.; Enemy non-flying, non-floating units within 2-hex radius have 90% chance of suffering Slowed for 3 Turn |
| Undermining the Walls | 100 gold | +0 | no | base | All Wall obstacles are damaged at the start of combat.; Wall obstacles have a 25% chance of being destroyed at the start of combat. |
| Unleash the War Hounds | 50 mana | +0 | yes | base | At the start of the battle, gain 6 War Hound units on the attacker's side until the end of battle. |
| Winterfreeze Evocation | 150 mana | +2 | yes | ELDRITCHREALMS | Every 2 turns in combat, a random enemy is hit by the Ice Coffin spell. |
| Wizard's Bombardment | 200 mana | +0 | yes | base | During combat, whenever you cast a Combat Spell, an astral comet strikes a random enemy unit:; Enemy units within a 1 hex radius suffer 5 Lightning Damage, 5 Frost Damage, and 5 Fire Damage.; Obstacles within a 1 hex radius are destroyed.Requires a captured Fa |

### ANCIENT WONDERS

| Wonder | Tier | Annexed as / extra income | Empire bonus when annexed | Rally of the Lieges units | DLC |
|---|---|---|---|---|---|
| World Tree | Gold | forester / +15 food +15 production | +2 Mana and +2 Knowledge per Forester in City Domain.; Adds Entwined thrall unit, Entwined protector unit, and Entwined scourge unit to the Rally of the Lieges. | entwined thrall, entwined protector, entwined scourge | base |
| Rose Choked Palace | Gold | farm / +15 mana +15 food | The City ignores the City Stability penalty of Sunless in its Domain.; Adds the Rose knight and various Rose Choked Skeleton units to the Rally of the Lieges. | rose knight, thorned skeleton militia, thorned skeleton mage, thorned skeleton warrior, thorned skeleton archer | THRONESOFBLOOD |
| Secret Temple | Silver | conduit / +25 mana | +2 Knowledge per Research Post in City Domain.; Adds the Blessed soul unit to the Rally of the Lieges. | blessed soul | base |
| Magma Forge | Silver | mine / +15 draft +10 gold | Units cost -25% Gold to recruit.; Adds the Fire giant unit to the Rally of the Lieges. | fire giant | base |
| Archon Observatory | Silver | research_post / +25 knowledge | The City gains the ability to convert Production into Knowledge in the Structure Queue.; Adds the Lesser light spirit and Light spirit to the Rally of the Lieges. | lesser light spirit, light spirit | ARCHONPROPHECY |
| Lost Wizard Tower | Gold | conduit / +15 mana +15 knowledge | Unlock the Wizard's Bombardment Siege Project.; Adds the Bone dragon unit to the Rally of the Lieges. | bone dragon | base |
| Lost Tomb | Silver | research_post / +25 knowledge | +2 Mana, +2 Knowledge, and +1 Soul (if obtainable) for each Hero in Crypt.; Adds the Corrupt soul unit to the Rally of the Lieges. | corrupt soul | base |
| Lava Prison | Silver | research_post / +20 knowledge | Gain income per Hero in your Prison.; Increases the chance of capturing defeated Heroes into your Prison to 100%.; Unlocks Free the Primordial Prisoner, a single-use action which grants you a uniquely powerful Unit based | primordial basilisk, primordial bloodback, primordial pyremoth | GIANTKINGS |
| Hidden Wellspring | Bronze | farm / +20 food | +2 City Stability per Farm and Forester in City Domain.; Friendly Unit in Domain are healed for 30 HP at the end of each strategic Turn.; Adds Spring fairy, Summer fairy, Autumn fairy, and Winter fairy to the Rally of th | spring fairy, summer fairy, autumn fairy, winter fairy | base |
| Crimson Fane | Bronze | research_post / +10 mana +10 knowledge | +2 Mana per Research Post in City Domain.; Adds the Shrieking bat unit to the Rally of the Lieges.; If Thrall are available, the Thrall Sacrifice action on this structure becomes available to permanently gain +10 World M | shrieking bat | THRONESOFBLOOD |
| Golden Ziggurat | Gold | mine / +30 gold | Magic origin Unit require -50% less Gold and Mana base Unit Upkeep in this City Domain.; Adds the Phoenix unit to the Rally of the Lieges. | phoenix | base |
| Giant's Throne | Gold | mine / +30 gold | All owned Province adjacent to this Ancient Wonder gain +2 Imperium additional income.; Adds the Rock giant and Storm giant to Rally of the Lieges. | rock giant, storm giant | GIANTKINGS |
| Crystal Forest | Bronze | conduit / +20 mana | +2 Mana per Conduit in City Domain.; Adds the Astral keeper unit unit to the Rally of the Lieges. | astral keeper | base |
| Castle Ruins | Bronze | research_post / +20 draft | +2 Knowledge per Quarry in City Domain.; Can be set as a Unit deploy location.; Adds the Brewer ogre and Butcher ogre units to the Rally of the Lieges. | brewer ogre, butcher ogre | base |
| Withered Tree | Gold | forester / +10 food +10 production | +1 Food and +1 Production per Province with Sand or Astral Barrens in the City Domain.; Adds the Carrion bird unit to the Rally of the Lieges.; Unlocks the Restore action which turns this Ancient Wonder into a World tree | carrion bird | RISEFROMRUIN |
| Fractured Tower | Gold | research_post / +30 knowledge | +5 Research per Conduit in City Domain.; Adds Fractured evoker to the Rally of the Lieges. | fractured evoker | RISEFROMRUIN |
| Forsaken Temple | Silver | conduit / +15 mana | +1 Production per Research Post in the City Domain.; Adds the Spirit hawk unit unit to the Rally of the Lieges.; Unlocks the Restore action which turns this Ancient Wonder into a Secret temple. | spirit hawk | RISEFROMRUIN |
| Barren Wellspring | Bronze | farm / +15 mana | +1 City Stability per Province with Sand or Astral Barrens in the City Domain.; Adds the Grimbeak crow unit to the Rally of the Lieges.; Unlocks the Restore action which turns this Ancient Wonder into a Hidden wellspring | grimbeak crow | RISEFROMRUIN |
| Ancient Cave | Bronze | quarry / +20 production | +2 Mana per Quarry in City Domain.; Adds the Stormscale serpent and Plague serpent units to the Rally of the Lieges. | stormscale serpent, plague serpent | base |
| Vaultsphere | Gold | research_post / +30 knowledge | Unlocks Crack the Vault, a single-use action which trades 500 Research for 500 Mana.; Unlocks the Summon Vault Guardian combat spell. | | EMPIRESANDASHES |
| Breached Arcanum | Bronze | research_post / +15 knowledge | Adds one or more unknown Unit to the Rally of the Lieges based on the Arcanum's surrounding environment.; Can be restored to a Shrouded arcanum. | | SECRETSOFTHEARCHMAGES |
| Shrouded Arcanum | Silver | research_post / +25 knowledge | +5 World Map Casting Point; +5 Combat Casting Point | | SECRETSOFTHEARCHMAGES |

### MAGIC MATERIALS

| Material | Category | Unique global effect (when owned/traded) | Combat property in its province |
|---|---|---|---|
| Rainbow Clover | plant | +100 relations with Free City and Ruler. | Oh So Lucky: Every 2 Turn, all defending units gain Rallying and Fortune. |
| Silvertongue Fruit | plant | Whispering Stones grant +1 Allegiance. | Distracting Whispers: Each 2 Turn, one of the attacking units has a 90% base chance of suffering Distracted until the end of combat. |
| Haste Berries | plant | Founding, migrating and absorbing City takes -2 turns. | Unnatural Speed: Defending Units have Hastened, Swift and Slippery until the end of combat. |
| Tranquility Pool | liquid | Researching Spell costs -10% less Knowledge. | Wave of Tranquility: Every 2 Turn, all Status Effects on all units are dispelled. |
| Astral Dew | liquid | +15 World Map Casting Point. | Displaced Reality: Every 2 turns, all units are teleported by 2 hexes. |
| Archon Blood | liquid | +15 Combat Casting Point. | Archon Martyrdom: When a defending unit dies, all adjacent hostile units suffer 15 Spirit Damage and have 90% base chance of suffering Condemned. |
| Fireforge Stone | ore | Unit cost 20% less Draft. | Rampant Fire: Several areas and flammable obstacles are On Fire. |
| Blood Glass | ore | Unit gain +5 HP regeneration per World Map Turn. | Parasitic Contamination: Every Turn, all enemy units with Bleeding have a 60% chance of suffering Blood parasite. |
| Focus Crystals | ore | Unit gain +10% experience from combat. | Focused Gaze: Base Missile and Magic attacks of all defending units gain +1 Range. |
| Arcanium Ore | ore | Hurry Recruitment for Unit is 25% cheaper. | Arcanium Tremors: Every 2 turns, all non-Floating movement and non-Flying movement attacking units suffer 20 Physical Damage. |
| Void Stones | void_stones | Gain +2Allegiance with discovered Umbral Dwelling per Turn.; Allows the forging of misc items that grant immunity to Shadow sickness in the Item Forge. | Umbral Ramblings: The attacking units find themselves speaking in an unknown, ancient tongue.After the first Turn:At the start of the attacker's turn, every attacking Unit adjacent to another attacking unit has 30% base chance of suffering Insanity. If resisted, the unit suffers -5 Morale instead. |
