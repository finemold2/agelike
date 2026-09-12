# Age of Wonders 4 — Cultures, Forms, Society Traits & Rulers (Content Bible)

Reference compiled for the *agelike* fan-made browser strategy game. Covers the base game (Triumph Studios / Paradox, May 2023) and every expansion / content pack up to **Rise from Ruin (March 2026)**.

> **How this document was built and how much to trust it.**
> Direct fetches of `aow4.paradoxwikis.com`, the community AoW4 database (`minionsart.github.io/aow4db`), the Paradox forums and all guide sites were blocked by the network egress proxy in this session; only web-search result snippets could be read. Every fact below that was **confirmed by a search snippet** of the official wiki, a Triumph dev diary, a Paradox press release or a reputable guide is written plainly. Anything that comes only from the author's prior knowledge of the game and could not be re-verified is marked **(verify)**. The section *Verification log* at the end lists exactly which items are unconfirmed so the team can spot-check them in-game or on the wiki. Numbers (HP / Defense / Resistance / damage) are the wiki's values as of roughly patch 1.011–1.014 and are meant as **balance reference points**, not gospel — Triumph rebalances often.

---

## 0. Release map (what added what)

| Release | Date | Type | Cultures | Forms | Ruler types | Other headline content |
|---|---|---|---|---|---|---|
| **Base game** | 2 May 2023 | — | Feudal, High, Barbarian, Industrious, Mystic, Dark | Human, Elf, Dwarf, Orc, Goblin, Halfling, Toadkin, Molekin, Ratkin, Tigran | Champion, Wizard King | 18 society traits, body/mind traits (later merged into "form traits") |
| **Dragon Dawn** (+ Watcher Update) | 20 Jun 2023 | Content pack | — | Lizardfolk | **Dragon Lord** | Tome of Dragons, Tome of Evolution, *Artifact Hoarders* society trait |
| **Empires & Ashes** (+ Golem Update) | 7 Nov 2023 | Expansion | **Reaver** | Avian | — | Form-trait point-buy system, Item Forge, new tomes (golem/construct, severing…) |
| **Primal Fury** (+ Wolf Update) | Feb 2024 | Content pack | **Primal** (7 animal kinships) | Lupine, Goatkin | — | Primal animal units, Stormbringer, new tomes |
| **Eldritch Realms** (+ Mystic Update) | 18 Jun 2024 | Expansion | Mystic reworked into 3 **schools** (Attunement / Potential / Summoning) | Syron, Insectoid | **Eldritch Sovereign** | Reachers, Umbral/Eldritch realm traits, Thralls |
| **Ways of War** (+ Tiger Update) | 5 Nov 2024 | Expansion (Pass 2) | **Oathsworn** (3 oaths) | — | — | **Hero class rework** (Warrior, Defender, Ranger, Mage/Elementalist, Ritualist, Death Knight, Spellblade, Warlock), Tome of Discipline (Monk), Tome of Shades (Assassin) |
| **Herald of Glory** | 5 Nov 2024 | Content pack (Pass 2) | — | Ogrekin, Simian | — | Winged Helm costume, Lance of Glory weapon, Regal Pegasus mount, *Swift Marchers* society trait |
| **Giant Kings** (+ Ogre Update) | 1 Apr 2025 | Expansion (Pass 2) | Feudal reworked into **Monarchy / Aristocracy** authorities | — | **Giant King** (Frost / Storm / Fire / Earth clans) | 5 Lithorine units, Crystal Dwelling, Primordial T5 beasts, Item Forge rework, underground rework, Tome of the Dungeon Depths, Tome of Geomancy, an underground-themed society trait |
| **Archon Prophecy** (+ Griffon Update) | 12 Aug 2025 | Expansion (Pass 2) | **Architects** | Elysian, Ancient | — | **Battlesaint** hero class, Wonderstone & Monuments, story realms, form-trait **Flaws**, Prophecy/Destiny traits |
| **Rise from Ruin** (+ Scorpion Update) | 9 Mar 2026 | Culture pack | **Nomad** (Conquerors / Scavengers) | Harefolk | — | Mobile (packable) cities, Withered Worlds terrain, essence harvesting; the Reaver **Federated** sub-culture arrived in a 2026 update around this time (verify exact patch) |

Rulers are collectively called **Godir** ("god-like" wizards who travel the Astral Sea between realms). There is no separate "Godir Ascendant" or "Archon" ruler type — Archons are the celestial beings of Archon Prophecy's story realms; every ruler is a Godir.

---

## 1. Shared systems every culture uses

### 1.1 Unit tiers and roles

| Tier | Typical cost | Notes |
|---|---|---|
| I | ~40–60 gold / draft | Scouts and basic line units |
| II | ~90–120 | Specialists, supports, cavalry |
| III | ~170–200 | Elite culture unit (one per culture; some cultures have two or oath-/school-specific ones) |
| IV | ~300+ | Only via tomes, promotions (Feudal Knight, Feudal Longbow/Liege Guard via *Aspirant* mechanic) or Nomad Warlord |
| V | very high | Tome capstones, Primordial beasts (Giant Kings), Dragons |

**Roles (unit classes)** — every unit has exactly one:

| Role | Job | Signature mechanic |
|---|---|---|
| **Shield** | Front line, holds ground | *Defense Mode: Shield Wall* (+Def, protects flank), often Taunt |
| **Polearm** | Anti-cavalry line | *First Strike* vs charging units, *Charge Resistance* |
| **Fighter** | Flexible melee | Solid stats, no big gimmick (rare: Reaver Breacher, Oathsworn Honor Blade) |
| **Shock** | Damage dealer / cavalry | *Charge Strike* (bonus damage after moving), high MP, low Def |
| **Skirmisher** | Mobile harasser | Ranged attack + melee, *Slippery* (no opportunity attacks), move-shoot-move |
| **Ranged** | Bows / crossbows / guns | Physical ranged, long range, weak in melee |
| **Battle Mage** | Magic ranged | Elemental bolts (never miss / ignore Defense, use Resistance), area spells |
| **Support** | Heals, buffs, debuffs | Low damage; e.g. *Warding* defense mode, standards, awakenings |
| **Scout** | Exploration | Cheap, +vision (*Farsight*), fast (MP 40), weak attack; every culture has one |
| **Siege / Construct / Animal / Mythic / Elemental / Undead / Dragon** | Origin/type tags on tome & special units | Interact with transformations, enchantments, upkeep type |

**Core stats** (world map / combat): **HP**, **Defense** (vs physical), **Resistance** (vs magic: fire, frost, lightning, blight, spirit), **Status Resistance**, **Movement Points** (32 standard infantry, 40 scouts, 48 cavalry / "Fast Movement"), **Combat Speed** (hexes per action point; 3 AP per turn), **Vision**. Units gain **Ranks**: Recruit → Trained → Veteran → Elite → Champion → Legend (+HP, +damage, sometimes new abilities; "Legendary rank" triggers Feudal promotions). Damage channels: Physical, Fire, Frost, Lightning, Blight, Spirit.

**Optional cavalry**: some culture units (Dark Pursuer, Oathsworn Honor Blade, Feudal Aspirant Knight etc.) are drawn on foot by default and become mounted if the faction takes the *Mount Masters* form trait or an exotic-mount trait (Spider, Pegasus, Warg …). Mounted units get +MP and *Charge* traits; the artist should plan a mounted and a foot version for those units.

### 1.2 What a culture gives

1. **Affinity points** (usually 2 of the 6: Order, Chaos, Nature, Shadow, Materium, Astral) — every faction starts with 6 affinity points: 2 from culture, 2 from society traits, 2 from the starting tome.
2. **Culture traits** (passives on all culture units / heroes, plus an economic passive).
3. **A unit roster** (scout + tier I–III culture units; some cultures also have promotions to tier IV).
4. **Unique city structures** (culture-flavoured versions of the Town Hall chain, 2–3 unique buildings, one **Special Province Improvement**).
5. **Culture-specific research** (a handful of culture "tome" items: unit enchantments, extra structures).
6. **Hero skills** in the ruler's Warfare/culture skill group.
7. A complete **visual set**: architecture, unit costumes, banner shapes, colour palette.

---

## 2. CULTURES

### 2.1 Feudal (base; reworked in the Ogre Update, April 2025 — Dev Diary #41)

* **Theme**: High Middle Ages with some Norse flourishes; knights, levies, banners, castles.
* **Sub-cultures ("Authorities")** — introduced by the rework:
  * **Monarchy** — absolute rule; the people rally to their Monarch and defend the kingdom. Affinity **+1 Order, +1 Materium** (confirmed). Recommended "classic kingdom" starter culture.
  * **Aristocracy** — rule through noble houses and vassals. Affinity **+1 Order + one other** (the second point could not be confirmed this session; verify).
* **Culture traits / mechanics**
  * **Loyal / Loyalty** — the rework's core mechanic: Feudal units are *Loyal* subjects; Monarchy units draw bonuses from fighting alongside or defending their Monarch (ruler) and throne city; Aristocracy draws bonuses from Vassals and noble retinues (Liege Guard). (verify exact numbers)
  * **Stand Together** (pre-rework: +20 % damage while adjacent to a friendly unit with the same trait) was **removed** in the rework.
  * **Aspirant promotion**: in Monarchies **Archers are Aspirants → Longbow**; in Aristocracies **Defenders are Aspirants → Liege Guard**; in both **Aspirant Knight → Knight (T4)**. Aspirants promote when they reach a high rank (Knights at Legendary) and the city has the required tier (Knight needs a Tier IV city).
  * Economy: growth, expansion and group prosperity — most culture structures give **Food**; **Retainer's Estate** (Town-Hall-III building: +20 Food, +10 Gold, +10 Stability if the city's domain borders the Throne City's domain).
* **Units** (per Authority: 4×T-I incl. scout, 2×T-II, 1×T-III, 1×T-IV)

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Scout | I | Scout (mounted) | ~45 | 0 | 0 | 40 | Farsight, light bow |
| Peasant Pikeman | I | Polearm | 65 | 2 | 1 | 32 | Melee Strike 11, Charge Resistance, First Strike, Feudal Training |
| Archer | I | Ranged | 50 | 0 | 0 | 32 | Shoot Bow 10; groups of 6; **Monarchy: Aspirant → Longbow** |
| Defender | I (was II) | Shield | 70 (was 80) | 6 vs non-flank | 1 | 32 | Shield Wall (heavy shield), Shield Defense; groups of 6; **Aristocracy: Aspirant → Liege Guard** |
| Bannerman | II | Support | 70 | 2 | 3 | 32 | Banner Smite 16, Bulwark Standard (+Def aura), Soothing Standard (heal/morale), Defense Mode: Warding |
| Aspirant Knight | II | Shock (cavalry) | ~80 | 3 | 2 | 48 | Charge Strike, *Slippery*; uses the old T3 Knight look; promotes to Knight |
| Longbow *(Monarchy)* | III | Ranged | — | — | — | 32 | Promoted Archer; long range volley (verify stats) |
| Liege Guard *(Aristocracy)* | III | Shield | — | — | — | 32 | Promoted Defender; elite bodyguard (verify stats) |
| Knight | IV | Shock (cavalry) | 90+ | 3 | 3 | 48 | Heavy Charge Strike 24, *Slippery*, **Giant Slayer**, **Graceful Charge** (can charge through engagements other shock units avoid), **Inspiring Killer** (morale on kill), Defense Mode |

* **Buildings**: Feudal Town Hall chain; food-chain replacements (manor farms, granaries); Retainer's Estate; special province improvement is a farmland/estate style improvement boosting food & gold from adjacent farms (verify name).

### 2.2 High (base)

* **Theme**: Lords and Ladies of a great, ancient, radiant civilisation; sun and light; knowledge.
* **Affinity**: **+2 Order**, and the faction starts with **+10 Good alignment**.
* **Culture traits / mechanics**
  * **Awakening**: High units start *Dormant*. A Sun Priest's **Awaken** (or Awakener's **Twin Awakening**) grants **Awakened**: +4 Spirit damage on base attacks and unlocks each unit's *Dormant* trait (e.g. Sun Priest's *Radiant Light*, Dawn Defender's *Shield of Light*). Design consequence: an army wants one Sun Priest.
  * **Righteous / Good-aligned**: bonuses to stability from good alignment; High structures primarily generate **Knowledge** (verify exact structure list).
* **Units**

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Lightseeker | I | Scout | ~45 | 0 | 0 | 40 | Farsight; light ranged attack (some guides list it as the T-I ranged unit) |
| Dawn Defender | I | Shield | 70 | 5 | 0 | 32 | Melee Strike 10, Shield Wall, Shield of Light (dormant → awakened) |
| *(T-I ranged unit)* | I | Ranged | — | — | — | 32 | A sixth High unit (T-I ranged) could not be confirmed this session; the base cultures were designed with two T-I units — **verify** on the wiki's *List of culture units* |
| Sun Priest | II | Support | 60 | 1 | 3 | 32 | Cosmic Blast 16, **Awaken**, Mending Awakening (heal + awaken), Defense Mode: Warding, Radiant Light (dormant) |
| Daylight Spear | II | Polearm | ~75 | 3 | 2 | 32 | Spear strike, First Strike, Charge Resistance (verify stats) |
| Awakener | III | Battle Mage / Support | 80 | 2 | 4 | 32 | Spirit Bolts 14, Exposing Light 22 (marks/exposes), **Twin Awakening**, Charge Resistance |

* **Buildings**: knowledge-focused structures (libraries / academies of light), a sun-shrine style special province improvement (verify names).

### 2.3 Barbarian (base)

* **Theme**: speed and aggression; tribes, furs, war paint, totems.
* **Affinity**: launched as **+2 Chaos**; current guides list **+1 Chaos, +1 Nature** (verify which is live).
* **Culture traits / mechanics**
  * **Savage Strike** — all culture units and heroes: on a **Critical Hit** deal **+4 Blight damage** (**+8** if it is a single-shot attack). (Earlier versions gave T-I units *Primal Strike*: +8 Blight on their first attack.)
  * **Frenzy** — Furies and Berserkers gain a stack of *Strengthened* every time they attack.
  * **Ravenous / War Frenzy** — economic side: Barbarian structures give **Draft and Food/Production**, pillaging and combat feed the war economy (verify exact trait names and numbers).
  * Units are cheap, fast (many have *Fast Movement*) and high-damage, low-defense.
* **Units** (wiki: "a T-I Skirmisher, a T-I Shield, a T-II Ranged, a T-II Support and a T-III Shock")

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Pathfinder | I | Scout (cavalry) | 45 | 0 | 0 | 40+ | Farsight (+1 vision), Fast Movement, javelins |
| Warrior | I | Shield | 70 | 5 (2 vs flank) | 1 | 32 | Shield Bash, axe-and-shield |
| Sunderer | I | Skirmisher | ~55 | 1 | 1 | 32 | Thrown axes that *Sunder Defense*; Slippery (verify) |
| Fury | II | Ranged | 60 | 1 | 1 | 32 | Bow; **Frenzy**; groups of 6 |
| War Shaman | II | Support | 60 | 1 | 3 (Status 2) | 32 | Removes debuffs, applies buffs (e.g. *Strengthen*, *Bloodlust*), light Blight bolt; groups of 4 |
| Berserker | III | Shock | 90 | 3 | 3 (Status 3) | 32 | Two-handed axe, **Frenzy**, **Steadfast** (cannot die for 1 turn when reduced below 33 % HP and becomes *Berserk*); groups of 3 |

* **Buildings**: war camps / hunting lodges granting Draft & Food; special province improvement is a hunting-ground / totem site (verify names).

### 2.4 Industrious (base)

* **Theme**: dwarven-style master builders and defenders; forges, stone, resource exploitation.
* **Affinity**: **+2 Materium**.
* **Culture traits / mechanics**
  * **Bolstering** — every culture unit gains **Bolstered Defense** (+Def stack) when it sustains damage, once per turn.
  * **Prospecting** — the Pioneer scout can *Prospect* a province to uncover Gold, Production or items.
  * **Ancestral Forge / production overflow** — Industrious cities convert surplus production and gain production from mines/quarries; their food buildings also yield production (verify exact name of the trait).
  * Armies "sacrifice mobility for defensive power and work best letting the enemy come to them".
* **Units**

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Pioneer | I | Scout | ~45 | 1 | 0 | 40 | **Prospecting**, Farsight |
| Anvil Guard | I | Shield | ~70 | 6 | 1 | 32 | Very high Def, **Taunt**, Bolstering |
| Arbalest | I | Ranged | ~55 | 2 | 1 | 32 | Heavy crossbow, Bolstering (verify stats) |
| Halberdier | II | Polearm | ~80 | 3 | 2 | 32 | Retaliation runes reflect damage to melee attackers; First Strike |
| Steelshaper | II | Support | ~60 | 2 | 3 | 32 | **Grant Defense** (adds Bolstered Defense stacks to an ally), **Strength from Steel** (converts stacks into healing + *Strengthened*) |
| Bastion | III | Shield | ~100 | 7 | 3 | 32 | Replaces Taunt with **Inspiring Defense** (adjacent allies +Def); two free Bastions garrison the Bastion's Barricade |

* **Buildings**: **Workers Farmstead** and **Grand Mill** replace the T-1/T-2 food buildings (less food, but +Production); **Builder's Quarters** (special province improvement: quarry giving more production per adjacent quarry); **Bastion's Barricade** (Town-Hall-III structure: +20 Fortification Health and two Bastion defenders).

### 2.5 Mystic (base; reworked into three Schools in the Eldritch Realms / Mystic Update, June 2024 — Dev Diary #33)

* **Theme**: magic incarnate; arcane academies, floating crystals, astral projections.
* **Affinity**: **+2 Astral**.
* **Schools (sub-cultures)** — pick one:
  * **School of Attunement** (default, closest to the original Mystic). Combat trait **Attunement: Star Blades** — every time you or an ally casts a tactical spell, units gain **+1 damage** (+2 for single-hit attacks) of the spell's affinity element; stacks up to 3 per damage type, lasts 3 rounds.
  * **School of Potential** — experimentation, heavy spellcasting. Every attack applies **Dissonance** (up to 5 stacks); casting an **Overcharged** spell detonates Dissonance into Lightning damage.
  * **School of Summoning** — relies on Magic-Origin (mana-upkeep) units. **Astral Resonance**: Magic-Origin units gain a *Strengthened* stack (+10 % damage) and 10 temporary HP whenever you or an ally casts a spell; **Astral Connection** improves summoned units further.
  * Economy: all schools' structures produce **Mana** (e.g. **Altar of the All-Seers**, whose income scales with Astral Echo-type improvements); Soothers make combat spells 20 % cheaper.
* **Units** (all schools: scout, T-I Battle Mage, T-I Polearm, T-II Shield, T-II Support, T-III; Attunement & Potential get a T-III Battle Mage, Summoning a T-III Support with a summon)

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Mystic Projection | I | Scout | 45 | 0 | 2 | 40 | Illusory projection; magic bolt; can pass terrain (verify) |
| Arcanist | I | Battle Mage | 45 | 0 | 2 | 32 | Arcane bolts (Astral/lightning); groups of 3; frailer than a T-I archer |
| Warder *(name: verify)* | I | Polearm | ~65 | 2 | 2 | 32 | Magic-tipped spear; First Strike; the wiki confirms all three schools have a T-I Polearm |
| Spellshield | II | Shield (cavalry) | 80 | 6 (3 vs flank) | 2 | 48 | Bladed mace & shield, Very Fast Movement, spell-absorbing shield |
| Soother | II | Support | ~55 | 0 | 3 | 32 | Pure healer; while present, combat spells cost −20 %; groups of 4 |
| Spellbreaker *(Attunement / Potential)* | III | Battle Mage | ~80 | 2 | 4 | 32 | **Star Purge**: splash damage that strips all buffs from enemies hit |
| Summoner *(Summoning)* | III | Support | ~70 | 1 | 4 | 32 | Summons a Magic-Origin creature in battle; buffs summons (verify stats) |

### 2.6 Dark (base)

* **Theme**: gothic tyranny; cruelty as policy; frost and shadow magic; prisons and crypts.
* **Affinity**: **+2 Shadow**.
* **Culture traits / mechanics**
  * **Cull the Weak** — base physical attacks have a high chance to inflict **Weakened** (each stack lowers the target's damage — guides quote −10 % per stack up to −50 %); Dark Knights and Pursuers deal bonus damage to Weakened targets.
  * **Sinister rule / evil-tolerant cities** — Dark cities suffer less from evil alignment and gain **Knowledge and extra income from prisons and crypts** (verify trait name).
  * Everything Dark uses **Frost** as its magic channel and stacks *Sundered Defense / Resistance*.
* **Units**

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Outrider | I | Scout | 45 | 0 | 0 | 40 | Shoot Bow 6, Farsight, **Infiltrate** (more vision in hostile land; undetectable in forest, mountain, swamp) |
| Pursuer | I | Ranged | 50 | 0 | 0 | 32 | Shoot Bow 10; Cull the Weak; *optional cavalry* |
| Dark Warrior | I | Shock | 60 | 1 | 1 | 32 | Charge Strike 18 |
| Warlock | II | Battle Mage | 60 | 1 | 3 | 32 | Weakening Bolts 8 (Frost, high chance Weakened); **Sundering Curse 24** (full action, cannot miss, always Weakened + Sundered Def & Res) |
| Night Guard | II | Polearm | 75 | 3 | 2 | 32 | Melee Strike 14; at end of turn adjacent enemies have a high chance of Sundered Def & Res |
| Dark Knight | III | Shock (cavalry) | 90 | 3 | 3 | 48 | Heavy Charge Strike 24 (extra vs Weakened); **Dark Surge 18** (Frost cone, cannot miss, double damage vs any negative status) |

* **Buildings**: prison / crypt / dungeon structures that convert misery into Knowledge and Gold; dark spires; a torture-pit / crypt style special province improvement (verify names).

### 2.7 Reaver (Empires & Ashes, Nov 2023; sub-cultures added 2026)

* **Theme**: steampunk infrastructure with Conquistador-styled soldiers; gunpowder "magelocks", slavers, mercenaries, war profiteering.
* **Affinity**: **+1 Materium, +1 Chaos**.
* **Culture traits / mechanics**
  * **War Spoils** — a Reaver-only resource gained by **killing units** (scales with the victim's tier) and from fighting players and free cities; spent on Reaver structures, mercenaries and bonuses. Design note: this pushes Reavers into constant war, so early alliances matter.
  * **Marked / Slippery** — Reaver attacks *Mark* targets; marked enemies take extra flanking damage; Harriers and Dragoons are *Slippery* (ignore opportunity attacks).
  * **Reaving / Levy / enslaved population** — Reavers pillage and conscript; the Federated sub-culture uses **Levies** as a secondary recruitment resource (the *Bannerlords* society trait speeds Levy recruitment) (verify details).
  * **Sub-cultures (2026 update)**: **Mercenary Companies** (the baseline Reaver experience; Dragoons available) and **Federated / Federation** Reavers (no Dragoons, alternative T-III, easier & more consistent access to the Magelock Cannon's special resource). A third company may exist (verify).
* **Units**

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Observer | I | Scout (flying) | ~40 | 0 | 1 | 40 | Flies; **cannot deal damage**; pure vision |
| Magelock | I | Ranged | 65 | 1 | 1 | 32 (speed 4) | **Magelock Rifle** — huge damage but needs all 3 AP; groups of 3; +20 % accuracy/damage buff in 2026 |
| Harrier | I–II | Skirmisher | ~60 | 1 | 1 | 32 | Long-range, very accurate **immobilise** that Marks; can retreat from melee; Slippery |
| Overseer | II | Support | ~65 | 2 | 2 | 32 | Whip / lash: forces allies into action, buffs damage, punishes Marked enemies (verify) |
| Breacher | II | Fighter (magic) | 90 | 3 | 3 (Status 3) | 32 (speed 4) | Only cultural *magic* fighter: magic axe + **Light-Spirit magic shotgun** |
| Dragoon *(Mercenary)* | III | Skirmisher (cavalry) | ~85 | 3 | 3 | 48 | Pistol-and-sabre rider: **move-shoot-move**, Slippery |
| Magelock Cannon | III | Ranged / Siege (construct) | ~90 | 4 | 2 | 24 | Construct (buffed by enchantments, not racial transformations); long-range siege shot; requires a special resource |
| Sapper *(Federated)* | II–III | Skirmisher / Siege | — | — | — | — | Explosive-charge unit that replaces the Dragoon for Federated Reavers (verify tier) |

* **Buildings**: industrial forges, slave pits / conscription yards, a mercenary hall; special province improvement is a fortified outpost or mining works fed by War Spoils (verify names).

### 2.8 Primal (Primal Fury, Feb 2024 — Dev Diary #26)

* **Theme**: nature-bound tribes with a **Primal Animal** totem; painted hides, feathers, bone; the animal fights with them.
* **Affinity**: **+2 Nature** at launch (some sources list Nature + Chaos; verify).
* **Culture traits / mechanics**
  * **Animal Kinship ("Ancient Kinship")** — choose one of **7 Primal Animals**. Each gives all culture units a **Favored Terrain** movement trait, extra province income of one type from that terrain, a magic channel, and an **animal Fury** effect that triggers when units "channel the fury of their animal spirit" (units build fury by attacking; heroes and Animists can trigger it).
  * The animals themselves are recruitable **Animal units** for the culture (Ash Sabertooth, Dune Serpent, Glacial Mammoth, Mire Crocodile, Storm Crow, Sylvan Wolf, Tunneling Spider).
  * **Primal Strike** — culture units' attacks add the kinship's element (verify).

| Kinship | Favored terrain | Province bonus | Fury / combat flavour |
|---|---|---|---|
| Ash Sabertooth | Desolate / ashlands | income from desolate provinces (verify type) | Attacks **ignite** nearby enemies; Fire |
| Dune Serpent | Desert / sand | +Gold per desert province (verify) | Poison / Blight bites, burrowing serpent |
| Glacial Mammoth | Arctic / snow | **+3 Production** per Arctic province | **Freezes** enemies in place; Frost |
| Mire Crocodile | Swamp | **+3 Food** per Swamp province | Swamp Walk, Disease immunity, attacks inflict **Diseased**; Blight |
| Storm Crow | Mountains / high ground (verify) | +Mana per province (verify) | Lightning strikes, flying crow; Lightning |
| Sylvan Wolf | Forest | **+3 Draft** per Forest province | Pack tactics, bleed, fast; Physical/Nature |
| Tunneling Spider | Fungus / mushroom forest (underground) | **+2 Knowledge** per mushroom-forest province | Webs / immobilise, poison; Blight |

* **Units** (all kinships share the roster: 3×T-I incl. scout, 2×T-II, 1×T-III; visuals recolour to the animal)

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Spirit Tracker | I | Scout (cavalry) | ~45 | 0 | 0 | 40+ | Standard cavalry scout fundamentals, rides the kin animal |
| Protector | I | Shield | ~70 | 5 | 1 | 32 | Hide shield, Shield Wall |
| Primal Darter | I | Ranged / skirmisher | ~50 | 0 | 1 | 32 | Blow-darts / javelins with kinship element |
| Primal Charger | II | Shock (on foot) | ~75 | 2 | 2 | 32 | Charge attack + **Charging Cleave** (frontal cleave hitting up to 3 units) |
| Animist | II | Support | ~60 | 1 | 3 | 32 | Heals, triggers/feeds animal Fury, summons spirit animal (verify) |
| Ancestral Warden | III | Polearm | ~90 | 4 | 3 | 32 | **Primal Lunge** — leaps into the middle of an enemy group instead of waiting for charges |
| *Animal unit* (e.g. Glacial Mammoth) | II–III | Animal | varies | — | — | — | The kin beast itself; Fury attacks |
| Stormbringer | IV | Skirmisher | — | — | — | — | Primal Fury tome unit (Tome of the … verify), storm-calling skirmisher with strong combos |

* **Buildings**: totem circles, spirit lodges; the special province improvement is a kin-animal sanctuary on favored terrain (verify names).

### 2.9 Oathsworn (Ways of War, Nov 2024)

* **Theme**: inspired by **East Asian mythology, fantasy and theatre** (Dev Diary #38 "The Art of Ways of War"); warrior-monks, honour blades, lacquered armour, banners.
* **Affinity**: base **+1 Order**, second point set by the chosen Oath (Righteousness → Order, Strife → Chaos, Harmony → Nature) (verify).
* **Culture traits / mechanics**
  * **The Oath** — a strict code of conduct. Acting according to your Oath raises your **Oath level**, which strengthens stability and unit bonuses; breaking it marks you an **Oathbreaker** with penalties.
  * **Oath of Righteousness** — vanquish evil; gather Good alignment; bonuses vs evil factions.
  * **Oath of Strife** — wage war against "the strong and worthy"; rewards fighting stronger foes.
  * **Oath of Harmony** — avoid war where possible; multicultural, vassal- and alliance-driven empire; Harmony units are all **mounted** (Honor Blade, Vowkeeper, Peacebringer, Wayfarer).
  * Culture units carry **Sunder** (Sworn Guard) and **Defensive Strike** (Honor Blade strikes then enters Defense Mode).
  * Related tomes: **Tome of Discipline** (T-I, unlocks the **Monk**), **Tome of Shades** (T-II, unlocks the **Assassin**).
* **Units**

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Wayfarer | I | Scout (mounted) | ~45 | 0 | 1 | 40 | Farsight |
| Sworn Guard | I | Polearm | ~65 | 3 | 1 | 32 | **Sunder Defense** on hit; a sunder-flavoured cousin of the Mystic T-I polearm |
| Honor Blade | I | Fighter (optional cavalry) | ~70 | 3 | 1 | 32/48 | **Defensive Strike** — a charge-class hit that also puts the unit into Defense Mode |
| Vowkeeper | II | Support | ~65 | 2 | 3 | 32 | **AoE heal**, strips positive effects from enemies, buffs status resistance |
| Oath Caster *(name: verify)* | II | Battle Mage | ~60 | 1 | 3 | 32 | AoE damage spell (spirit/fire per oath) |
| Avenger *(Righteousness)* | III | Shock / Fighter | ~90 | 3 | 3 | 32 | Swordsman; **Helmsplitter** ignores half of the target's Defense |
| Warbound *(Strife)* | III | Shock | ~95 | 3 | 3 | 32 | Club-wielding brute that bulldozes through enemies |
| Peacebringer *(Harmony)* | III | Ranged (cavalry) support | ~80 | 2 | 3 | 48 | Mounted archer-support hybrid |

* **Buildings**: shrines of the oath, dojo/training halls, a monastery-style special province improvement (verify names).

### 2.10 Architects (Archon Prophecy, Aug 2025 — Dev Diaries #43/#44)

* **Theme**: **Greco-Roman** monument builders; marble, bronze, colonnades; a culture that literally builds its power.
* **Affinity**: no fixed pair — the culture **adapts to the empire's Dominant Affinity**; Monuments add affinity points (verify starting values).
* **Culture traits / mechanics**
  * **Wonderstone** — unique resource obtained from **Magic Materials** (Surveyors *Survey* provinces, like Industrious Prospecting).
  * **Monuments** — vast magical city structures **dedicated to an affinity of your choice**; each gives its city bonuses, gives the empire **Affinity points**, and grants stacks of **Affinity Incarnate**.
  * **Affinity Incarnate** — Architect units gain **+1 damage per stack**; their **damage type and visuals change with the Dominant Affinity** (Chaos → fire bolts, Materium → steel bolts, etc.), keeping them relevant into the late game.
  * Every unit has an "off-role" utility twist.
* **Units**

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Surveyor | I | Scout (on foot, speed-greaves) | ~45 | 0 | 1 | 40 | **Survey Materials**; throws battle-mage-style **bolts** of the dominant affinity's element instead of arrows |
| Cultivator | I | Support | ~55 | 1 | 2 | 32 | **Link** to a friendly unit: weak steady heal each turn + dispels one negative status each turn |
| Earthbreaker | I | Polearm / Fighter | ~65 | 3 | 1 | 32 | Hammer/pick line unit; can break terrain/fortifications (verify) |
| Guardian | II | Shield | ~80 | 5 | 3 | 32 | Colossal bronze-shield defender; scales hard with Materium Incarnate |
| Shademaker | II | Battle Mage / Ranged | ~60 | 1 | 3 | 32 | Casts affinity-typed bolts and shade/blind debuffs (verify) |
| Architect | III | Support / Battle Mage | ~80 | 2 | 4 | 32 | Builds or empowers Monument effects in battle; strongest Incarnate scaling (verify) |

* **Buildings**: **Monuments** (one per affinity type, expensive in Wonderstone), marble civic buildings; special province improvement is a quarry/wonderstone works (verify).

### 2.11 Nomad (Rise from Ruin, 9 Mar 2026 — Dev Diary #55)

* **Theme**: survivors of the **Withered Worlds**; desert caravans and packed-up cities; the **Harefolk** are its signature form.
* **Affinity**: offers **Chaos and Materium** options (Conquerors lean Chaos, Scavengers lean Materium — verify exact split).
* **Culture traits / mechanics**
  * **Mobile cities** — a Nomad city can **pack up into a unit**, travel, and unpack elsewhere keeping all upgrades and population.
  * **Essence harvesting** — Nomads drain the land for potent essences before moving on, leaving desolation behind.
  * **Conquerors** — fast aggressive raids that seize enemy territory; bonuses to military units and their production; a near-permanent **Momentum** buff.
  * **Scavengers** — harvest ancient wonders and battlefield **loot**; Looters and Dustweavers grab loot and pass it to allies.
* **Units** (sub-culture-specific T-I/T-II variants; roster 4×T-I incl. scout, 2×T-II, T-III, T-IV)

| Unit | Tier | Role | HP | Def | Res | MP | Key abilities / notes |
|---|---|---|---|---|---|---|---|
| Dunerider | I | Scout (cavalry) | ~45 | 0 | 0 | 40+ | **Warfare Training** — deals T-I-ranged-level damage, doubling as an archer |
| Wind Warrior | I | Fighter / Shield | ~65 | 3 | 1 | 32 | Wind-blessed melee line unit |
| Raider *(Conquerors)* | I | Skirmisher / Shock | ~60 | 1 | 1 | 32 | Raiding melee, Momentum synergy |
| Looter *(Scavengers)* | I | Skirmisher | ~55 | 1 | 1 | 32 | Weaves through the battlefield to grab **loot** and pass it to friendly units |
| Strider | II | Ranged | ~60 | 1 | 2 | 32 | T-II archer |
| Dustweaver *(Scavengers)* | II | Support / Battle Mage | ~60 | 1 | 3 | 32 | **Distributing Wind** — ranged ability that pulls hard-to-reach loot to the nearest unit |
| Conqueror T-II *(name: verify)* | II | Support / Shock | — | — | — | — | Conqueror-specific second T-II unit |
| Champion | III | Shock / Fighter | ~90 | 3 | 3 | 32 | Elite duelist |
| Warlord | IV | Shock + Polearm + Defender + Support hybrid | ~110 | 4 | 4 | 32 | Widely rated the best T-IV unit in the game; combines four roles |

### 2.12 "Giant Kings" is not a culture

The Giant Kings expansion adds the **Giant King ruler type** (see §5), Lithorine units for the Crystal Dwelling, Primordial T-V beasts and tomes — it does **not** add a playable culture. Any of the eleven cultures above can be led by a Giant King.

---

## 3. FORMS (physical races)

Forms are cosmetic body types **plus a budget of form traits**. Since the Golem Update (Nov 2023) the old "one Body + one Mind trait" rule is gone: each faction has **5 trait points**, traits cost **1–3 points**, and since the Griffon Update (Aug 2025) **Flaws** *add* points instead of costing them. Forms themselves carry no hidden stats; premade forms just come with a suggested trait loadout.

### 3.1 Form list

| Form | Source | Visual identity (short) |
|---|---|---|
| Human | Base | Medium build, any skin tone, versatile clothing |
| Elf | Base | Tall, slender, pointed ears; fair "high" or dusky "dark" elf variants |
| Dwarf | Base | Short, stocky, broad; large beards/braids |
| Orc | Base | Tall, muscular, green/grey/red-brown skin, tusks, heavy brow |
| Goblin | Base | Small, wiry, big ears and noses, sharp teeth, green/yellow skin |
| Halfling | Base | Small, round-faced, curly hair, big bare feet |
| Toadkin | Base | Amphibian; wide mouths, bulging eyes, mottled moist skin, webbed hands |
| Molekin | Base | Mole-faced, tiny eyes, big digging claws, velvet fur, pink snouts |
| Ratkin | Base | Rat heads, whiskers, long tails, hunched wiry frames |
| Tigran | Base | Big-cat heads (tiger/lion/leopard), fur patterns, tails, feline eyes |
| Lizardfolk | Dragon Dawn | Reptilian scales, crests/frills, tails, bright colour morphs |
| Avian | Empires & Ashes | Bird heads (eagle/owl/raven), beaks, feathered arms, taloned feet |
| Lupine | Primal Fury | Wolf heads, muzzles, pointed ears, thick fur |
| Goatkin | Primal Fury | Goat heads with horns, rectangular pupils, hooves, shaggy coats |
| Syron | Eldritch Realms | Reimagined AoW1 Syrons: blue/violet luminous skin, star-like markings, elegant astral humanoids |
| Insectoid | Eldritch Realms | Chitin plates, mandibles, compound eyes, antennae, beetle/mantis shells |
| Ogrekin | Herald of Glory (Nov 2024) | Hulking, broad-shouldered, thick limbs, underbite/tusks, taller than humans |
| Simian | Herald of Glory (Nov 2024) | Ape/monkey features, expressive faces, fur, long powerful arms |
| Elysian | Archon Prophecy | Ascended heavenly beings: luminous skin, halos/light motifs, serene divine faces |
| Ancient | Archon Prophecy | Withered, bent, elongated beings "from the depths of history and more sinister places": grey wrinkled skin, sunken eyes |
| Harefolk | Rise from Ruin | Hare heads with long ears, twitching noses, lean fast bodies; desert-adapted |

### 3.2 Form traits (point-buy, 5 points; costs are the author's best recollection — verify)

**Physical ("body") traits**

| Trait | Effect | Cost |
|---|---|---|
| Tough | +2 Defense on all units | 2 |
| Resistant | +2 Resistance on all units | 2 |
| Hearty | +10 HP on all units | 2 (some builds list 1 — verify) |
| Bulwark | Defense Mode gives an extra +2 Defense and +2 Resistance | 1 |
| Quick Reflexes | 30 % harder to hit with ranged attacks (evasion) | 2 |
| Keen-Sighted | +20 % accuracy for physical ranged and magic attacks | 2 |
| Fast Recuperation | +5 HP regeneration per turn on the world map | 1 |
| Resolute | Negative status effects last 1 turn less | 1 |
| Strong | Bonus melee damage (+1/+2 physical on melee) | 1–2 (verify) |
| Fleet-Footed / Swift | Extra world-map movement | 1–2 (verify) |
| Elemental adaptation (e.g. Cold-Blooded, Fire-Blooded) | Resistance/immunity to one element and its statuses | 1 (verify names) |
| Underground Adaptation | No underground penalties, better vision below ground | 1 (verify) |
| Mount Masters | Every *optional cavalry* unit is mounted (standard horse look) | 1 |
| Exotic mounts (Warg/Wolf, Spider, Lizard/Raptor, Boar, Elk, Bear, **Regal Pegasus** (Herald of Glory), Griffon …) | Optional cavalry mounted on that creature with its bonus (e.g. spider webs, pegasus flight) | 2–3 |

**Mental ("mind") traits**

| Trait | Effect | Cost |
|---|---|---|
| Adaptable | +30 % XP gain | 1 |
| Elusive | +6 Defense and Resistance against retaliation and opportunity attacks | 1 |
| Tenacious | Casualty (morale) penalty −50 % | 1 |
| Sneaky | Flanking attacks deal 25 % more damage | 2 |
| Ferocious | Retaliation and opportunity attacks deal +40 % damage | 2 |
| Arcane Focus | Magic attacks deal +25 % damage (later patches: flat bonus — verify) | 2 |
| Defensive Tactics | Adjacent friendly units get +1 Defense and +1 Resistance | 2 |
| Overwhelm Tactics | Bonus damage when attacking a unit that is already engaged / outnumbered | 2 (verify) |
| Fearless | Immune to Fear/morale shock effects | 1 (verify) |

**Flaws** (Griffon Update, Aug 2025) — negative form traits that *refund* points (e.g. reduced HP, reduced accuracy, weaker morale, slower world movement). The exact names could not be confirmed this session; treat them as mirrors of the positive traits with a +1/+2 refund (verify list).

---

## 4. SOCIETY TRAITS

Each faction picks **two**. The 18 base traits are grouped **three per affinity** (each grants +1 of that affinity); later traits add to the pool. Effects below are as confirmed in guides/wiki snippets unless flagged.

| Trait | Affinity | Effect | Source |
|---|---|---|---|
| **Chosen Uniters** | Order | +10 Good alignment; better relations with non-evil factions; bonus income from Vassals | Base |
| **Devotees of Good** | Order | +10 Stability per Good alignment level (max +30); +5…+15 Imperium likewise; starts with +10 Good alignment; Support and Polearm units +1 Rank; start with an extra Support/Polearm unit | Base |
| **Imperialists** | Order | +20 Stability and +Gold in every city bordering the Capital; Capital starts with +1 Population | Base |
| **Chosen Destroyers** | Chaos | Captured cities can only be razed, but each razing gives permanent income (+40 Gold, +20 Mana, +20 Knowledge) | Base |
| **Ruthless Raiders** | Chaos | Nearest city gains Gold and Draft for every unit killed in battle; aggressive military expansion | Base |
| **Cult of Personality** | Chaos (verify) | Ruler-centred empire: stability/Imperium scaling with the ruler's presence and level (verify exact effect) | Base |
| **Fabled Hunters** | Nature | Food trade deals (for Gold or Mana) are always available with Free Cities; hunting-themed unit bonuses (verify) | Base |
| **Prolific Swarmers** | Nature | Cities need −10 % Food per new population; Tier-I units +1 Rank; non-Magic-Origin units −20 % upkeep; start with an extra Tier-I unit | Base |
| **Druidic Terraformers** | Nature | +20 % Food from Grassland/Fungus core provinces, +20 % Production from Forest/Rocky/Mountain, +10 % Gold on Ashlands, +10 % Mana on Snow/Ice/Sand; terraforming spells −25 % Mana and casting points; Elemental units −20 % upkeep; start with an Elemental unit | Base |
| **Scions of Evil** | Shadow | Draft and Imperium scale with Evil alignment; all units +1 Rank at Pure Evil; Shock and Shield units +1 Rank; start with an extra Shock/Shield unit | Base |
| **Silver Tongued** | Shadow (verify; may be Order) | Extra Scout; free Whispering Stone via Diplomatic Focus; Pronouncements cost half; trade deals with Free Cities cost nothing | Base |
| **Talented Collectors** | Shadow / Materium (verify) | Capital counts as having a random Magic Material; bonuses from magic materials | Base |
| **Great Builders** | Materium | Free Workshop and Stone Walls in the Capital; more Gold from quarries; faster special province improvements | Base |
| **Perfectionist Artisans** | Materium | Structures take double Production but each gives +1 Stability and +5 Gold; Tier-III units +1 Rank; start with a Tier-III unit (requires Pantheon level 9 to unlock) | Base |
| **Runesmiths** | Materium | Unit-enchantment research −30 % Knowledge; enchantment upkeep −30 %; Shield and Polearm units +1 Rank; start with an extra Shield/Polearm unit | Base |
| **Ancient Wise Ones** | Astral | Whenever a Tome is unlocked, one random skill in it costs −60 % Knowledge; start with one random research already unlocked | Base |
| **Mana Channelers** | Astral | Summoning spells cost −50 % Mana; Magic-Origin units +1 Rank; start with an extra Magic-Origin unit | Base |
| **Powerful Evokers** | Astral | Battle Mage and Support units +1 Rank; +5 Combat Casting Points per Battle Mage/Support at the start of battle | Base |
| **Adept Settlers** | none / neutral (verify) | +1 City capacity, cheaper city founding, founded cities get bonus Population; Capital +1 Population | Base |
| **Experienced Seafarers** | Nature (verify) | More income from coastal provinces; embarked units gain damage and XP; starts with *Basic Seafaring* unlocked | Naval update / base (verify) |
| **Artifact Hoarders** | Materium | Mana income for every unequipped hero item in the inventory | Dragon Dawn |
| **Bannerlords** | Order (verify) | Faster Levy / conscript recruitment; synergises with Feudal and Federated Reavers | Ways of War / Ogre Update (verify) |
| **Swift Marchers** | Chaos / Order (verify) | *Forced March* available from turn 1 | Herald of Glory |
| **Deep-dwelling / underground trait** (name: verify) | Materium (verify) | Bonuses for starting and building underground | Giant Kings |
| **Prophecy / Destiny traits** | varies | A new faction-creation category from Archon Prophecy that can also shift affinity (verify list) | Archon Prophecy |

---

## 5. RULERS & HEROES

### 5.1 Ruler types (all are Godir)

| Ruler type | Source | Body / equipment | Classes allowed | Economy | Signature powers |
|---|---|---|---|---|---|
| **Champion** | Base | A mortal hero of the chosen Form; full hero equipment incl. mount | Any class | +10 % Gold (verify), **+20 Stability in all cities**, **+100 relations with Free Cities** (fast vassalisation), bonus hero XP | Origin skills that boost armies: e.g. rally that lets a unit **act twice**, morale and rank boosts |
| **Wizard King** | Base | Mortal of the chosen Form; full equipment | Any class | +10 % Mana; **+5 strategic and +5 tactical Casting Points per ruler level** (+50 at lvl 10, +100 at lvl 20); Conduits give extra mana | **Overchannel**, can **cast two combat spells per turn**, more casting potential regardless of culture |
| **Dragon Lord** | Dragon Dawn | Must be a four-limbed two-winged **dragon**; only **Dragon Claw** primary weapons; no mount | Any except **Ranger** (some class limits) | **Gold upkeep**; unequipped items generate Gold; governor traits boost the Throne City's wealth | Starts with **Lesser Dragon Breath**; Origin tree of 10 skills (6 obtainable — mutually exclusive branches) upgrading breath size/shape, a **Roar** to inspire, **Devour** foes, an affinity **Aura** later. Breath element follows affinity: Chaos fire, Nature poison, Astral lightning, Shadow frost/necrotic, Materium stone/steel, Order holy spirit (last three: verify) |
| **Eldritch Sovereign** | Eldritch Realms | A Lost Wizard returned from the Astral Void, tentacled/warped; **no Leg items or Mounts**; only **Relic** weapons (Sovereign-exclusive) | **Mage/Elementalist, Ritualist, Warlock, Battlesaint** only | **Thralls** resource (captured/manipulated enemies, sacrificed for power); starts with **Clairvoyance Ritual** and **Enthrall Population** spells | **Eldritch Mind Control** (full action, 90 % base chance to mind-control an enemy for 1 turn; on failure sets its AP to 1; 4-hex range, 3-turn cooldown, not usable inside enemy ZoC); an *Eldritch Sovereign* skill group replaces the Warfare group; unique signature skills |
| **Giant King** | Giant Kings | A colossal giant of one of four clans; heavy weapons (Warhammer start unlocks **Hurl Projectile**) | Any except **Ranger** | **Mana upkeep**; starts with **Wizard Tower: Item Forge** in the Throne City; unlocks **Runes** to forge unique gear | **Terraforming**: raise mountains, flatten peaks, mold lava, freeze the land; four sub-origins with different passives — **Frost**, **Storm**, **Fire**, **Earth** |

Notes: rulers cannot permanently die — a slain ruler returns to the Throne City after a delay (Astral Void / resurrection, costlier each time). Ruler *Origin* skill trees differ per type; Champions and Wizard Kings share the **Warfare** group.

### 5.2 Hero classes (Tiger Update rework, Nov 2024; Battlesaint added Aug 2025)

There is **no Rogue class** in AoW4 (that was AoW3); the current nine classes are:

| Class | Archetype | Primary weapons | Notes |
|---|---|---|---|
| **Warrior** | Aggressive melee | Melee weapons (1H+shield or 2H) | Charge attacks, self-buffs from fighting |
| **Defender** | Defensive melee | Melee + shield | High Def/HP, retaliation, guards allies; no ranged, low damage |
| **Ranger** | Ranged / skirmisher | Ranged and Skirmisher weapons | Only class denied to Dragon Lords and Giant Kings; animal companion skills |
| **Mage** (a.k.a. Elementalist) | Elemental caster | Magic Orb, Magic Staff (Eldritch Relic for Sovereigns) | Evocation damage, area spells |
| **Ritualist** | Support caster | Magic Orb, Magic Staff (Relic for Sovereigns) | Heals/buffs; can be built as druid or cleric |
| **Death Knight** | Dark melee | Melee weapons | Warrior + Ritualist hybrid: high damage, debuffs, raises Undead (free zombie at lvl 3, wyvern at lvl 4 in guides) |
| **Spellblade** | Magic melee / skirmisher | Melee + magic | Ranged magic attacks and melee physical; fills Skirmisher or Battle Mage role; *Empowered Evocation* early |
| **Warlock** | Debuff / undeath caster | Magic Orb, Magic Staff | Powerful debuffs; empowers summoned undead |
| **Battlesaint** | Paladin | Melee + holy magic | Gains **Fervor** through actions, spends it on support abilities or smites (Archon Prophecy) |

### 5.3 Levelling and skill trees

* Heroes gain **1 hero skill per level**; at levels **4, 8, 12 and 16** they also get an extra skill point and an **Affinity Dedication**.
* **Three skill groups**: **Class** tree (the bulk; which skills depends on class, and class fixes which primary/secondary equipment is usable), **Origin** tree (ruler type / hero origin), and **Affinity Dedications** — these replaced the old *Signature Skills*: at 4/8/12/16 a hero may take an **Initiate / Adept / Master / Paragon** dedication to one of the empire's affinities, provided the empire has **1 / 4 / 6 / 8** points in that affinity; each unlocks a set of affinity-flavoured skills.
* Level cap is 20 (verify); rulers additionally gain casting points and governor traits.
* Heroes can be **governors** of cities (governor traits) and lead armies (up to 6 units incl. hero per stack; 3 stacks per battle side).

### 5.4 Equipment slots

| Slot | Contents |
|---|---|
| **Primary** | Main weapon: melee (sword, axe, mace, 2H, lance), ranged (bow, crossbow, gun), skirmisher (javelins), magic (orb, staff), Dragon Claw (Dragon Lord), Eldritch Relic (Sovereign) |
| **Secondary** | Shield (blocked by two-handed primaries) or off-hand |
| **Head** | Armour + magical defence (e.g. Winged Helm costume) |
| **Torso** | Armour + magical defence, sometimes attack boosts |
| **Legs** | Armour + magical defence, sometimes movement (not usable by Eldritch Sovereigns) |
| **Misc ×3** | Trinkets, rings, amulets: passive buffs or new actives |
| **Mount** | Horse, spider, wyvern, pegasus, etc. (not Dragon Lords / Sovereigns) |

Items come from loot, shops, the **Item Forge** (Wizard Tower; Giant Kings start with it; requires fragments/runes for higher tiers) and events.

---

## 6. VISUAL BIBLE — how to draw it

The game's art is painterly high-fantasy with strong silhouettes and saturated colours. Each culture recolours its **units, architecture and banner** with a chosen primary/secondary faction colour; the notes below describe the *default* palette and the fixed design language.

### 6.1 Cultures

**Feudal** — Late-medieval Europe with Norse overtones. Architecture: grey stone keeps and curtain walls, timber-framed houses with steep shingled or thatched roofs, longhouse-style halls with carved gable ends, wooden palisades in young towns. Units: chainmail and gambesons under coloured surcoats, kettle helms and great helms, kite/heater shields with heraldic charges, long spears, longbows, caparisoned warhorses for knights. Banners: tall swallow-tailed pennons and square heraldic standards. Default colours: royal blue and red with steel; Monarchy leans regal gold-and-crimson, Aristocracy heraldic quartered fields.

**High** — Radiant, elven-classical grandeur. Architecture: white marble and pale gold, tall slender spires, crystalline domes, sun-disc motifs, hanging gardens and glowing lanterns; everything looks lit from within. Units: fluted golden plate over white or sky-blue cloth, winged helmets, tall shields shaped like sun rays, halberds with crescent blades, priests in layered robes carrying sun-staffs; awakened units glow with a pale golden aura. Banners: long vertical white banners with a gold sun. Default colours: white, gold, sky blue.

**Barbarian** — Tribal war-hosts. Architecture: hide tents, timber longhouses, palisades of sharpened logs, totem poles, bone and antler trophies, smoke from open fires. Units: bare arms, furs, leather and bronze, war paint, braided hair, round wooden shields, two-handed axes, javelins; shamans in bone masks with feathered staffs. Banners: hide standards on crossbars hung with skulls and feathers. Default colours: earthy browns and red ochre with bone white.

**Industrious** — Dwarven-flavoured industry. Architecture: massive squared stone blocks, brass and iron fittings, gears, chimneys, forges glowing orange, deep-cut geometric runes, mountain halls with pillars. Units: full heavy plate with angular pauldrons, faceplate helms, tower shields, heavy crossbows, halberds, runic hammers; Steelshapers with brass gauntlets and floating metal shards. Banners: rigid metal standards with riveted plates. Default colours: iron grey, bronze, ember orange.

**Mystic** — Living arcana. Architecture: floating crystals, spiralling towers, observatories, glowing glyph circles, ethereal bridges, purple-blue light. Units: layered robes with star patterns, hovering orbs, crystalline shields and bladed maces, Projections are translucent blue figures; Attunement uses starry blues, Potential crackling violet-lightning, Summoning teal with summoned astral beasts. Banners: floating crystal-shard standards. Default colours: deep blue, violet, silver.

**Dark** — Gothic tyranny. Architecture: black stone, jagged spires, iron spikes, chains, gargoyles, crypts, prison towers, purple-black torchlight. Units: black plate with spiked edges and horned helms, dark-purple cloth, frost-blue glow on weapons and eyes, Warlocks with clawed gauntlets and skull staffs, Dark Knights on armoured black horses. Banners: ragged black banners with a purple sigil. Default colours: black, deep purple, ice blue.

**Reaver** — Steampunk empire, Conquistador army. Architecture: iron and brick factories, smokestacks, pipes, gantries, slave pens, cannon emplacements, soot and rust. Units: morion and burgonet helmets, cuirasses over slashed doublets and ruffs, magelock rifles with glowing runic barrels, sabres and pistols, whips for Overseers, brass-bound cannons; the Observer is a floating brass eye/balloon. Banners: military guidons on halberd-topped poles. Default colours: black and rust red with brass.

**Primal** — Animal-totem tribes. Architecture: wood and hide lodges, standing stones, giant carved totems of the kin animal, bone arches, fire pits; buildings take the animal's colour (white/blue Mammoth, red/orange Sabertooth, green Wolf, black/violet Crow, brown/green Crocodile, sand Serpent, purple Spider). Units: hides, feathers, claw necklaces, painted faces and bodies in the animal's markings, spirit-animal companions, javelins and bone-tipped spears; Chargers wear beast-skull helms. Banners: animal-skull totems. Default colours: follow the kinship.

**Oathsworn** — East-Asian mythic theatre. Architecture: tiered pagoda roofs with upturned eaves, red lacquered pillars, paper lanterns, moon gates, stone gardens, shrine torii-like gates. Units: lamellar and lacquered armour with silk sashes, wide-brimmed helmets, tasselled spears, curved and straight jian-style blades, monks in wrapped robes, mounted archers with composite bows; masks and face-paint drawn from opera. Oath colours: Righteousness white and gold, Strife red and black, Harmony jade green and teal. Banners: tall narrow vertical banners with calligraphy, and war fans.

**Architects** — Greco-Roman monumentalism. Architecture: marble colonnades, domes, triumphal arches, colossal statues, aqueducts, geometric mosaics; Monuments are enormous affinity-coloured wonders (a fire-lit Chaos obelisk, a crystalline Astral spire, a verdant Nature grove-temple, etc.). Units: bronze muscle cuirasses, crested helmets, togas and pleated tunics, hoplite shields, picks and hammers for Earthbreakers; their weapon glow and accent colour switch to the dominant affinity. Banners: vexillum-style hanging square standards. Default colours: white marble, bronze, one affinity accent.

**Nomad** — Withered-world caravans. Architecture: tents and yurts of patched cloth, sand-coloured wagons and howdahs, scaffolds of scavenged metal and bone, the whole city on wheels/sledges when packed. Units: layered desert wraps, turbans and scarves, goggles, light lamellar of scavenged plates, curved blades, short bows, sand-skimming mounts; Scavengers hung with loot bags and trinkets, Conquerors with red war-banners and captured standards. Banners: wind-torn streamers on tall poles. Default colours: sand, terracotta, turquoise accents.

**Giant King rulers** — colossal (two to three times a human), clan-coloured: Frost (ice-blue skin, rime beard), Storm (slate skin, violet lightning veins), Fire (magma-cracked skin, ember hair), Earth (stony mossy hide). They wield whole tree-trunk hammers and hurl boulders.

**Eldritch Sovereign rulers** — robed wizards warped by the Void: tentacles, extra eyes, floating fragments, sickly teal-and-magenta glow, relic weapons like eyes-in-orbs.

**Dragon Lord rulers** — classic western dragons whose scale colour follows affinity (red/black Chaos, green Nature, blue-white Astral, purple Shadow, bronze Materium, gold Order).

### 6.2 Forms (art notes)

* **Human** — the baseline; clothing fully driven by culture.
* **Elf** — long faces, high cheekbones, pointed ears; hair often long; "dark elf" skin variants (grey/violet) use the same body.
* **Dwarf** — stout, wide hands, elaborate beards and braids; armour looks heavier on them.
* **Orc** — heavy jaws and tusks, thick necks; skin green, grey or brick-red; scars and tribal bands.
* **Goblin** — knobbly limbs, oversized ears, hooked noses, wide toothy grins; move in crouched poses.
* **Halfling** — child-sized adults with adult faces, curly hair, bare hairy feet; cheerful rounded silhouettes.
* **Toadkin** — squat amphibians, broad lipless mouths, throat sacs, spotted green/brown/orange skins.
* **Molekin** — velvet-furred snouts, star-nosed or pink-nosed, squinting eyes, huge spade claws.
* **Ratkin** — narrow rodent skulls, pink ears and tails, hunched shoulders, twitchy poses.
* **Tigran** — feline heads on athletic humanoid frames, striped/spotted/maned variants, tails.
* **Lizardfolk** — sleek scaled bodies, head crests, dewlaps, long tails; vivid greens, blues, reds.
* **Avian** — raptor or owl heads, feather "hair", feathered forearms, digitigrade taloned legs.
* **Lupine** — wolf heads, thick neck ruffs, clawed hands, grey/black/white coats.
* **Goatkin** — curling or straight horns, beards, horizontal pupils, hooved digitigrade legs.
* **Syron** — tall, graceful, blue-to-violet skin with faint constellations, glowing pupil-less eyes, elongated ears.
* **Insectoid** — segmented chitin in bronze/green/black, four-fingered claws, mandibles, faceted eyes, sometimes wing-cases.
* **Ogrekin** — massive brows and shoulders, small eyes, thick necks; clothing strains at the seams; brutish but not monstrous.
* **Simian** — chimpanzee/gorilla/baboon-like faces, expressive mouths, long arms, knuckle-walking idle poses.
* **Elysian** — flawless luminous skin (white-gold or pale blue), radiant eyes, halo rings or light-wing motifs, serene expressions.
* **Ancient** — gaunt, stooped, overlong fingers, deeply lined grey skin, sunken glowing eyes; an air of forgotten ages or sinister origin.
* **Harefolk** — long upright ears, split lips, large dark eyes, lean bodies built for sprinting; fur in sand, grey and white.

---

## 7. Design takeaways for the fan game

1. **Culture = affinity pair + one combat gimmick + one economy gimmick + 6–8 units + a visual set.** Every AoW4 culture fits this template; sub-cultures (Feudal authorities, Mystic schools, Oathsworn oaths, Primal kinships, Reaver companies, Nomad Conquerors/Scavengers) swap one or two units and the gimmick's flavour.
2. **Roles matter more than tiers**: shield/polearm/shock/skirmisher/ranged/battle-mage/support each have one signature mechanic (Shield Wall, First Strike, Charge, Slippery, etc.). Design the browser game's units around those verbs.
3. **Forms are cosmetic + a 5-point trait budget**; keep race and culture orthogonal so any body can wear any culture's kit.
4. **Rulers are hero units with an Origin tree**; the five types differ by body constraints, upkeep resource and a single signature power.
5. **Visual language per culture is architecture + costume + banner + palette**; the tables in §6 are enough for concept sheets.

---

## Verification log (items flagged "verify")

* Feudal Aristocracy's second affinity point; exact Loyalty numbers; Longbow / Liege Guard stats; Feudal building names.
* Whether High has a sixth (T-I ranged) culture unit and its name; Daylight Spear tier (II per gamepressure); High building names.
* Barbarian live affinity (+2 Chaos vs +1 Chaos/+1 Nature); Sunderer role/stats; economic trait name ("Ravenous" / "War Frenzy").
* Industrious "Ancestral Forge" trait name; Arbalest stats.
* Mystic T-I polearm name ("Warder"), Summoner stats; Altar of the All-Seers scaling.
* Dark economic trait name and building names.
* Reaver Overseer abilities, Sapper tier, existence of a third company; Levy/Bannerlords specifics.
* Primal affinity; Dune Serpent / Storm Crow bonuses; Animist abilities; Stormbringer's tome.
* Oathsworn per-oath affinity; T-II caster name; building names.
* Architects starting affinity; Earthbreaker/Shademaker/Architect abilities.
* Nomad affinity split; Conqueror T-II unit name.
* All form-trait point costs; names of Flaws; Strong/Fleet-Footed/adaptation trait names.
* Society traits: affinities of Cult of Personality, Silver Tongued, Talented Collectors, Adept Settlers, Experienced Seafarers, Bannerlords, Swift Marchers; the Giant Kings underground trait's name; Prophecy trait list.
* Hero level cap (20); Dragon breath element for Shadow/Materium/Order.
