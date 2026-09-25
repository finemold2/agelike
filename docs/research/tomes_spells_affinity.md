# Age of Wonders 4 — Content Bible: Tomes, Spells, Affinity, Empire Development & Victory

*Research reference for a fan-made browser strategy game. Covers the base game (Triumph Studios / Paradox, 2 May 2023) and every expansion released through June 2026: Dragon Dawn, Empires & Ashes, Primal Fury, Eldritch Realms, Ways of War, Herald of Glory, Giant Kings, Archon Prophecy, Thrones of Blood, Rise from Ruin and Secrets of the Archmages.*

Compiled 2026-09-12.

## 0. Sources, method and caveats

| Source | What it supplied | Reliability |
|---|---|---|
| **MinionsArt "Age of Wonders 4 Database"** (`minionsart.github.io/aow4db`, repo `MinionsArt/aow4db`, data last updated July 2026 — a direct extraction of the game's localisation/data tables) | Every tome, tome skill, spell (cost, casting points, upkeep, exact effect text), unit (stats, abilities), province improvement, hero skill and the full Empire Development tree in Parts 1, 2, 5 and Appendix A | Highest — this is game data, not paraphrase |
| **AoW4 Paradox wiki** (`aow4.paradoxwikis.com` — Tomes, Spells, Affinity, Empire development, Victory pages, reached via search excerpts) | Tome tier/affinity unlock thresholds, knowledge-cost scaling table, casting-point rules, victory rules | High for rules; the wiki lags DLC content |
| Paradox dev diaries (#15 Victory Conditions, #21 Watcher Update: Research & Magic Victory, #24 Seals & Tomes, #45/#46 Archon Prophecy tomes, #52 Thrones of Blood tomes, #61 Secrets of the Archmages tomes, #64 Empire Tree Update) and Paradox store/news pages | DLC contents and dates, design intent of the victory/research systems | High |
| Community guides (TheGamer, GameRant, Common Sense Gamer, Steam discussions) | Cross-checks of victory timers, casting-point sources | Medium — used only where consistent with the above |

**Caveats.** (1) Numbers are *base* values as they appear in the game data; in play they are modified by Spell Amplification, empire skills, ruler type, difficulty, etc. (2) The direct wiki HTML could not be fetched from this environment; wiki-derived rules come from search excerpts of the wiki and dev diaries and are marked "(wiki)". Where a value could not be confirmed it is flagged **[verify]**. (3) A handful of localisation strings in the source data have missing numbers (they read e.g. "for Turns"); those rows keep the game text as-is. (4) Tome skill descriptions in Part 1 are taken from the *spell* record (which carries the numbers) rather than the abbreviated tome-panel text.

### 0.1 Expansion timeline and what each adds to the magic system

| Release | Date | Magic-system additions (see §0.2 for the exact tome list) |
|---|---|---|
| Base game | 2 May 2023 | 54 tomes — for each of the six affinities exactly 2×T1, 2×T2, 2×T3, 2×T4 and 1×T5 (all dual-affinity tomes come from DLC); six affinities; empire tree; Magic/Expansion/Military/Score victories |
| Dragon Dawn (content pack) | 20 Jun 2023 | Dragon Lord ruler type; Tome of Evolution (T1), Tome of Dragons (T3) |
| Empires & Ashes (expansion) | 7 Nov 2023 | Reaver culture (Imperial / Federated trees); 4 tomes (T1–T4, §0.2); **Seals of Power victory**; Avatar-of-War rework |
| Primal Fury (content pack) | 27 Feb 2024 | Primal culture with 7 animal sub-cultures (each a mini research tree); 2 tomes (T2, T4) |
| Eldritch Realms (expansion) | 18 Jun 2024 | Eldritch Sovereign ruler; Umbral Abyss layer; 3 tomes (T1, T3, T3); Eldritch Pact research tree; seasonal/aftermath world spells |
| Herald of Glory (pass-2 exclusive) | Oct 2024 | Cosmetic ruler/hero set — no tomes |
| Ways of War (expansion) | 5 Nov 2024 | Oathsworn culture (Strife / Righteousness / Harmony oath trees); 4 tomes (T1, T2, T4, T4); Calamity Dragon |
| Giant Kings (expansion) | 1 Apr 2025 | Giant King ruler; 2 tomes (T2, T3); Crystal Pact research tree; magic materials |
| Archon Prophecy (expansion) | 12 Aug 2025 | Architect culture; 4 tomes (T2, T3, T4, T4); Pantheon hero ascensions |
| Thrones of Blood (Expansion Pass 3) | 11 Nov 2025 | Vampire (Elder Vampire) ruler; Thralls resource; 3 tomes (T1, T3, T4) |
| Rise from Ruin (Expansion Pass 3) | 9 Mar 2026 | Nomad culture (Scavengers / Conquerors trees); Withered Worlds; 3 tomes (T1, T2, T3) |
| Secrets of the Archmages (story pack, Expansion Pass 3) | 16 Jun 2026 | Six Wizard-King tomes (3×T1, T2, T3 and the all-affinity **Tome of the Cosmos, T5**); story realms |

Exact tome names per DLC are generated from the game data in §0.2 below.

### 0.2 Tomes by expansion (from game data)

| Expansion | Tomes (tier, affinity granted) |
|---|---|
| Base game (54) | Tome of Beasts (TI, +2 Nature); Tome of Cryomancy (TI, +2 Shadow); Tome of Enchantment (TI, +2 Materium); Tome of Evocation (TI, +2 Astral); Tome of Faith (TI, +2 Order); Tome of Necromancy (TI, +2 Shadow); Tome of Pyromancy (TI, +2 Chaos); Tome of Rock (TI, +2 Materium); Tome of Roots (TI, +2 Nature); Tome of Warding (TI, +2 Astral); Tome of Zeal (TI, +2 Order); Tome of the Horde (TI, +2 Chaos); Tome of Artificing (TII, +2 Materium); Tome of Fertility (TII, +2 Nature); Tome of Glades (TII, +2 Nature); Tome of Mayhem (TII, +2 Chaos); Tome of Revelry (TII, +2 Chaos); Tome of Scrying (TII, +2 Astral); Tome of Souls (TII, +2 Shadow); Tome of Summoning (TII, +2 Astral); Tome of Winds (TII, +2 Materium); Tome of the Beacon (TII, +2 Order); Tome of the Doomherald (TII, +2 Shadow); Tome of the Inquisition (TII, +2 Order); Tome of Amplification (TIII, +2 Astral); Tome of Cycles (TIII, +2 Nature); Tome of Devastation (TIII, +2 Chaos); Tome of Pandemonium (TIII, +2 Chaos); Tome of Sanctuary (TIII, +2 Order); Tome of Subjugation (TIII, +2 Order); Tome of Teleportation (TIII, +2 Astral); Tome of Terramancy (TIII, +2 Materium); Tome of Transmutation (TIII, +2 Materium); Tome of Vigor (TIII, +2 Nature); Tome of the Cold Dark (TIII, +2 Shadow); Tome of the Great Transformation (TIII, +2 Shadow); Tome of Astral Convergence (TIV, +2 Astral); Tome of Chaos Channeling (TIV, +2 Chaos); Tome of Exaltation (TIV, +2 Order); Tome of Nature's Wrath (TIV, +2 Nature); Tome of Oblivion (TIV, +2 Shadow); Tome of Paradise (TIV, +2 Nature); Tome of Supremacy (TIV, +2 Order); Tome of the Astral Mirror (TIV, +2 Astral); Tome of the Crucible (TIV, +2 Materium); Tome of the Demon Gate (TIV, +2 Chaos); Tome of the Golden Realm (TIV, +2 Materium); Tome of the Reaper (TIV, +2 Shadow); Tome of the Archmage (TV, +2 Astral); Tome of the Chaos Lord (TV, +2 Chaos); Tome of the Creator (TV, +2 Materium); Tome of the Eternal Lord (TV, +2 Shadow); Tome of the God Emperor (TV, +2 Order); Tome of the Goddess of Nature (TV, +2 Nature) |
| Dragon Dawn (2) | Tome of Evolution (TI, +1 Nature, +1 Chaos); Tome of Dragons (TIII, +1 Nature, +1 Chaos) |
| Empires & Ashes (4) | Tome of Alchemy (TI, +1 Materium, +1 Nature); Tome of the Construct (TII, +1 Materium, +1 Order); Tome of the Dreadnought (TIII, +1 Materium, +1 Chaos); Tome of Severing (TIV, +1 Materium, +1 Shadow) |
| Primal Fury (2) | Tome of Fey Mists (TII, +1 Nature, +1 Astral); Tome of the Stormborne (TIV, +1 Nature, +1 Astral) |
| Eldritch Realms (3) | Tome of the Tentacle (TI, +1 Shadow, +1 Astral); Tome of Corruption (TIII, +1 Shadow, +1 Astral); Tome of the Cleansing Flame (TIII, +1 Order, +1 Chaos) |
| Ways of War (4) | Tome of Discipline (TI, +1 Materium, +1 Order); Tome of Shades (TII, +1 Materium, +1 Shadow); Tome of Calamity (TIV, +1 Chaos, +1 Shadow); Tome of Prosperity (TIV, +1 Order, +1 Nature) |
| Giant Kings (2) | Tome of the Dungeon Depths (TII, +2 Materium); Tome of Geomancy (TIII, +1 Materium, +1 Astral) |
| Archon Prophecy (4) | Tome of Virtue (TII, +2 Order); Tome of Prophecies (TIII, +1 Order, +1 Astral); Tome of the Archon (TIV, +2 Order); Tome of the Revenant (TIV, +1 Order, +1 Shadow) |
| Thrones of Blood (3) | Tome of the Blood Rite (TI, +1 Chaos, +1 Shadow); Tome of Torment (TIII, +2 Shadow); Tome of the Crimson Reign (TIV, +1 Chaos, +1 Shadow) |
| Rise from Ruin (3) | Tome of the Warband (TI, +1 Chaos, +1 Materium); Tome of the Sand Stalkers (TII, +1 Materium, +1 Nature); Tome of the Warlord (TIII, +2 Chaos) |
| Secrets of the Archmages (6) | Tome of Abjuration (TI, +1 Order, +1 Astral); Tome of Gluttony (TI, +2 Chaos); Tome of the Sprite (TI, +1 Astral, +1 Nature); Tome of Burning Passion (TII, +2 Chaos); Tome of the Weaver (TIII, +1 Nature, +1 Shadow); Tome of the Cosmos (TV, +1 Astral, +1 Alignment, +1 Shadow, +1 Chaos, +1 Nature, +1 Materium, +1 Order) |

Culture / sub-culture research trees added by DLC (not tomes; see Part 1.8): Architect (Archon Prophecy); Crystal Pact (Giant Kings); Eldritch Pact (Eldritch Realms); Nomad - Conquerors (Rise from Ruin); Nomad - Scavengers (Rise from Ruin); Oathsworn - Harmony (Ways of War); Oathsworn - Righteousness (Ways of War); Oathsworn - Strife (Ways of War); Primal - Ash Sabertooth (Primal Fury); Primal - Dune Serpent (Primal Fury); Primal - Glacial Mammoth (Primal Fury); Primal - Mire Crocodile (Primal Fury); Primal - Storm Crow (Primal Fury); Primal - Sylvan Wolf (Primal Fury); Primal - Tunneling Spider (Primal Fury); Reaver - Federated (Empires & Ashes); Reaver - Imperial (Empires & Ashes).

## Contents

- Part 0 — Sources, expansion timeline, tomes by expansion
- Part 1 — Tomes: index by tier (1.1), by affinity (1.2), full contents Tier I–V (1.3–1.7), culture research trees (1.8)
- Part 2 — Affinity sources (2.0) and the complete Empire Development tree (skills and rites for General, Order, Chaos, Nature, Materium, Astral, Shadow)
- Part 3 — Spell system rules: casting points, upkeep, research/knowledge scaling, tome tier rules, spell types
- Part 4 — Victory conditions: Magic, Expansion, Military, Score, Seals of Power, story/crisis endings
- Part 5 — Curated iconic spells with exact numbers
- Appendix A — Complete spell index (every spell in the game, by type)
- Appendix B — Affinity-gated hero skills

## PART 1 — TOMES (complete list, all DLC through Secrets of the Archmages, June 2026)

Total tomes of magic in the dataset: **87** (base game 54, DLC 33). Plus 28 culture / sub-culture / general research trees (Part 1.8).

### 1.1 Tome index by tier

#### Tier I tomes

| Tome | Affinity granted | DLC | Theme |
|---|---|---|---|
| Tome of Faith | +2 Order | Base game | Heal and support your units through the power of the Faithful. |
| Tome of Zeal | +2 Order | Base game | Rile up your fanatic population for a common goal. Use units with Zeal and inflict Condemned on enemies. |
| Tome of Gluttony | +2 Chaos | Secrets of the Archmages | Gain control over the infernal domain of Gluttony, making your units harder to kill and stronger as they feed on mortal essences. |
| Tome of Pyromancy | +2 Chaos | Base game | Specialize in high Fire Damage by inflicting and exploiting Burning. |
| Tome of the Horde | +2 Chaos | Base game | Turn your cheapest units into large, deadly armies. Specialize in summoning and buffing low tier units. |
| Tome of Beasts | +2 Nature | Base game | Walk beside the Animals of nature. Specialize in summoning and buffing Animals and become stronger when standing next to them. |
| Tome of Roots | +2 Nature | Base game | Discover the power of the natural world and specialize in immobilizing enemies and healing allies. |
| Tome of Enchantment | +2 Materium | Base game | Improve your units with Unit Enchantments and specialize in Physical Damage. |
| Tome of Rock | +2 Materium | Base game | Smash your enemies with the force of stone. Specialize in increasing your defenses and dealing Physical Damage. |
| Tome of Evocation | +2 Astral | Base game | Grants excellent and cheap attack spells to any aspiring wizard. |
| Tome of Warding | +2 Astral | Base game | Specialize in magic that protects your units from damage and retaliates against enemies that attack you. |
| Tome of Cryomancy | +2 Shadow | Base game | Specialize in dealing Frost Damage and inflicting Frozen. |
| Tome of Necromancy | +2 Shadow | Base game | Harvest Souls from your enemies and create Undead creatures. Specialize in expendable units and starting your Soul economy. |
| Tome of the Sprite | +1 Astral, +1 Nature | Secrets of the Archmages | Use the powers of small Fey to support your units and befuddle your enemies. |
| Tome of the Warband | +1 Chaos, +1 Materium | Rise from Ruin | Build strong martial armies and mentor your units through the ranks. |
| Tome of the Blood Rite | +1 Chaos, +1 Shadow | Thrones of Blood | Perform forbidden and dangerous rites on your units to bleed your enemies and strengthen your allies. |
| Tome of Alchemy | +1 Materium, +1 Nature | Empires & Ashes | Inflict your enemies with Negative Status Effects and mitigate them on your own units. Tinctures and a powerful ranged unit will help you manipulate the tides of battle. |
| Tome of Discipline | +1 Materium, +1 Order | Ways of War | Channel your inner strength to empower your attacks and cleanse your body. |
| Tome of Evolution | +1 Nature, +1 Chaos | Dragon Dawn | Take young primal forces and nurture them into formidable allies. |
| Tome of Abjuration | +1 Order, +1 Astral | Secrets of the Archmages | Create wards and protections to preserve your units. |
| Tome of the Tentacle | +1 Shadow, +1 Astral | Eldritch Realms | Conjure tentacled mutations and creatures from the depths to restrain and constrict your enemies, keeping them right where you want them. |

#### Tier II tomes

| Tome | Affinity granted | DLC | Theme |
|---|---|---|---|
| Tome of Virtue | +2 Order | Archon Prophecy | Create a virtuous army and make them fight strong until the end. |
| Tome of the Beacon | +2 Order | Base game | Brings out the inner radiance of the Faithful to smite enemies and bolster allies. |
| Tome of the Inquisition | +2 Order | Base game | Hunt down those who do not agree with your authority. Inflict Condemned on enemies and restrict their Movement. |
| Tome of Burning Passion | +2 Chaos | Secrets of the Archmages | Strengthen your units with Demonic wrath, seduce your enemies with fiendish lust, and engulf both in infernal flames. |
| Tome of Mayhem | +2 Chaos | Base game | Cause chaos on the battlefield by randomly displacing enemies and inflicting Misfortune. |
| Tome of Revelry | +2 Chaos | Base game | Follow the path of debauchery that rewards those who take chances and specialize in gaining Morale and Experience. |
| Tome of Fertility | +2 Nature | Base game | Thrive on the bountiful spoils of nature. Provide your empire with ample Food and heal your units in battle. |
| Tome of Glades | +2 Nature | Base game | Create and protect forests. Specialize in healing and making use of forests. |
| Tome of Artificing | +2 Materium | Base game | Specialize in siegecraft, expertly crafted weapons, and Golems. |
| Tome of Winds | +2 Materium | Base game | Harness the powers of the wind to gain boosts of speed and disrupt enemies. |
| Tome of the Dungeon Depths | +2 Materium | Giant Kings | Build a grand Dungeon Underground, fill it with structures that will enrich you, and protect it with eternal clay soldiers and traps. |
| Tome of Scrying | +2 Astral | Base game | Keep an eye on your enemies and let nothing pass you by. Specialize in gaining more vision and Truesight and inflicting Marked. |
| Tome of Summoning | +2 Astral | Base game | Call forth, control, and enhance Magic Origin units. |
| Tome of Souls | +2 Shadow | Base game | Create advanced Undead creatures and gain ways to collect more Souls. Specialize in buffs and healing for Undead units. |
| Tome of the Doomherald | +2 Shadow | Base game | Torment your enemies with a Morale-reducing effect and by exploiting enemies with Low Morale. |
| Tome of the Sand Stalkers | +1 Materium, +1 Nature | Rise from Ruin | Spread deserts, stalk and blind your enemies, and summon a Guardian of the Desert to protect you. |
| Tome of the Construct | +1 Materium, +1 Order | Empires & Ashes | Master legions of constructs, fighting in uncannily synchronized formations, commanding them perfectly and crushing your foes beneath the march of their boots. |
| Tome of Shades | +1 Materium, +1 Shadow | Ways of War | Strike from the shadows, blind your foes and find their weak points to deliver the perfect, fatal blow. |
| Tome of Fey Mists | +1 Nature, +1 Astral | Primal Fury | Conjure otherworldly mists to protect and strengthen your units. |

#### Tier III tomes

| Tome | Affinity granted | DLC | Theme |
|---|---|---|---|
| Tome of Sanctuary | +2 Order | Base game | Create a safe haven for all believers. Specialize in healing and buffing defenses. |
| Tome of Subjugation | +2 Order | Base game | Expands and subjugates cities from other races. Specializes in lowering enemy Morale and conquering cities. |
| Tome of Devastation | +2 Chaos | Base game | Gain the means to take cities with overwhelming force. Specialize in Sieges and dealing damage. |
| Tome of Pandemonium | +2 Chaos | Base game | Thrive in the chaos of battle and specialize in inflicting random Negative Status Effects on your enemies and dealing more damage to enemies that are already inflicted. |
| Tome of the Warlord | +2 Chaos | Rise from Ruin | Conquer the world with powerful warriors and infernal allies. |
| Tome of Cycles | +2 Nature | Base game | Master the natural cycles of life and death and specialize in debuffing enemies and healing allies. |
| Tome of Vigor | +2 Nature | Base game | Strengthen your units and armies with the brute power of wild beasts. Specialize in buffing Animals and increasing Hit Points. |
| Tome of Terramancy | +2 Materium | Base game | Manipulate the earth at will. Specialize in dealing Physical Damage and hindering enemy Movement. |
| Tome of Transmutation | +2 Materium | Base game | Change physical substances using vast amounts of mana. Specialize in debuffing enemies, buffing allies, and changing your economy. |
| Tome of Amplification | +2 Astral | Base game | Enhance your mages and your spellcasting with more advanced arcane magic. |
| Tome of Teleportation | +2 Astral | Base game | Exploit spatial magic to its full potential. Strategically reposition your units in battle in a mere instant. |
| Tome of Torment | +2 Shadow | Thrones of Blood | Torment your enemies by turning their very actions against them and make your units empowered by pain. |
| Tome of the Cold Dark | +2 Shadow | Base game | Spread Arctic terrain throughout the world and envelop your units with its power, so they may be empowered by its presence. |
| Tome of the Great Transformation | +2 Shadow | Base game | Turn your people into the Undead and transform your empire into a paradise for them to thrive in. |
| Tome of Geomancy | +1 Materium, +1 Astral | Giant Kings | Become attuned to the Ley energies beneath you and use them to change the damage and resistances of your armies based on where they stand. |
| Tome of the Dreadnought | +1 Materium, +1 Chaos | Empires & Ashes | Call upon the power of mighty machines and obliterate your enemies with powerful barrages. |
| Tome of Dragons | +1 Nature, +1 Chaos | Dragon Dawn | Revel in the power of Dragons and let their flames empower your people. |
| Tome of the Weaver | +1 Nature, +1 Shadow | Secrets of the Archmages | Inflict and exploit the Immobilized status effect and strike fear into your enemies. |
| Tome of Prophecies | +1 Order, +1 Astral | Archon Prophecy | Prevent enemy attacks and foresee the downfall of your enemies. |
| Tome of the Cleansing Flame | +1 Order, +1 Chaos | Eldritch Realms | Utilize the zeal of your troops to bathe the battlefield in cleansing flame that punishes the condemned and blesses the faithful. |
| Tome of Corruption | +1 Shadow, +1 Astral | Eldritch Realms | Become closer to the umbral demons, and punish your enemies with their own strengths. |

#### Tier IV tomes

| Tome | Affinity granted | DLC | Theme |
|---|---|---|---|
| Tome of Exaltation | +2 Order | Base game | Convert your people to Celestials and use their faith to smite your enemies. |
| Tome of Supremacy | +2 Order | Base game | Lead your people to glorious victory. Specialize in increasing Morale and managing a big empire. |
| Tome of the Archon | +2 Order | Archon Prophecy | Summon Celestial allies and ascend your units to the ranks of the Archons. |
| Tome of Chaos Channeling | +2 Chaos | Base game | Become the master of chaos by exploiting your accumulated chaotic powers from previous Chaos Affinity Tomes. |
| Tome of the Demon Gate | +2 Chaos | Base game | Open rifts to summon Fiends and burn the world in your wake. |
| Tome of Nature's Wrath | +2 Nature | Base game | Grants powerful spells that unleash the uncontrollable power of nature. |
| Tome of Paradise | +2 Nature | Base game | Create a lush green paradise for your people. Focus on economy, healing, and buffs. |
| Tome of the Crucible | +2 Materium | Base game | Bury your enemies in lava and shape the land using the destructive forces of both earth and fire. |
| Tome of the Golden Realm | +2 Materium | Base game | Become a prosperous empire and gain large amounts of gold with new infrastructure and by turning your very enemies into gold. |
| Tome of Astral Convergence | +2 Astral | Base game | Become stronger the more spells you cast and summon creatures from the Astral Sea. |
| Tome of the Astral Mirror | +2 Astral | Base game | Create Astral Reflections of your units and leader and reflect damage back onto attackers. |
| Tome of Oblivion | +2 Shadow | Base game | Use powerful magic capable of sending your enemies to the nothingness of oblivion. Specialize in inflicting Insanity and making parts of the world and the battlefield inhospitable. |
| Tome of the Reaper | +2 Shadow | Base game | Extract Souls in brutal fashion and use them to bring Undead terrors into the world. Use instant kill effects and ultimate Undead synergy. |
| Tome of Calamity | +1 Chaos, +1 Shadow | Ways of War | Bring calamity to the realm and burn your enemies in cold Ghostfire. |
| Tome of the Crimson Reign | +1 Chaos, +1 Shadow | Thrones of Blood | Embrace a forgotten and corrupt magic that empowers your high tier units and has your faction embrace an ancient form of undeath, gaining the power to spread Blood Parasites onto your enemies. |
| Tome of Severing | +1 Materium, +1 Shadow | Empires & Ashes | Wield powerful nullification magic to sever the very essence of summoned creatures. |
| Tome of the Stormborne | +1 Nature, +1 Astral | Primal Fury | Control the storms to do your bidding and turn your people into powerful Naga. |
| Tome of Prosperity | +1 Order, +1 Nature | Ways of War | Bring forth prosperity to your empire and grant your units healing Grace. |
| Tome of the Revenant | +1 Order, +1 Shadow | Archon Prophecy | Raise an army of corrupted and undead Archons and use their knowledge to make your undead come back again and again, while protecting them from those who would use the powers of light and fire. |

#### Tier V tomes

| Tome | Affinity granted | DLC | Theme |
|---|---|---|---|
| Tome of the God Emperor | +2 Order | Base game | Become a god to be worshiped. Your mere presence inspires your troops and your cities. Specialize in buffing your units. |
| Tome of the Chaos Lord | +2 Chaos | Base game | Unleash chaos forces upon the world. Specialize in offensive buffs. |
| Tome of the Goddess of Nature | +2 Nature | Base game | Become the ultimate embodiment of nature. Excel at buffs and healing, especially for Plants and Animals. |
| Tome of the Creator | +2 Materium | Base game | Shape the world, summon slumbering titans, and become the master of the earth. |
| Tome of the Archmage | +2 Astral | Base game | Reach the pinnacle of the arcane arts by bending space and time to your will. |
| Tome of the Eternal Lord | +2 Shadow | Base game | Become the leader of an eternal realm and command unending armies. |
| Tome of the Cosmos | +1 Astral, +1 Alignment, +1 Shadow, +1 Chaos, +1 Nature, +1 Materium, +1 Order | Secrets of the Archmages | Use your mastery over the magic of the universe to empower your units and your economy, and summon a mighty Avatar of the Cosmos itself. |

### 1.2 Tome index by affinity

#### Order tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Faith | +2 Order | Base game |
| I | Tome of Zeal | +2 Order | Base game |
| II | Tome of Virtue | +2 Order | Archon Prophecy |
| II | Tome of the Beacon | +2 Order | Base game |
| II | Tome of the Inquisition | +2 Order | Base game |
| III | Tome of Sanctuary | +2 Order | Base game |
| III | Tome of Subjugation | +2 Order | Base game |
| IV | Tome of Exaltation | +2 Order | Base game |
| IV | Tome of Supremacy | +2 Order | Base game |
| IV | Tome of the Archon | +2 Order | Archon Prophecy |
| V | Tome of the God Emperor | +2 Order | Base game |

#### Chaos tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Gluttony | +2 Chaos | Secrets of the Archmages |
| I | Tome of Pyromancy | +2 Chaos | Base game |
| I | Tome of the Horde | +2 Chaos | Base game |
| II | Tome of Burning Passion | +2 Chaos | Secrets of the Archmages |
| II | Tome of Mayhem | +2 Chaos | Base game |
| II | Tome of Revelry | +2 Chaos | Base game |
| III | Tome of Devastation | +2 Chaos | Base game |
| III | Tome of Pandemonium | +2 Chaos | Base game |
| III | Tome of the Warlord | +2 Chaos | Rise from Ruin |
| IV | Tome of Chaos Channeling | +2 Chaos | Base game |
| IV | Tome of the Demon Gate | +2 Chaos | Base game |
| V | Tome of the Chaos Lord | +2 Chaos | Base game |

#### Nature tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Beasts | +2 Nature | Base game |
| I | Tome of Roots | +2 Nature | Base game |
| II | Tome of Fertility | +2 Nature | Base game |
| II | Tome of Glades | +2 Nature | Base game |
| III | Tome of Cycles | +2 Nature | Base game |
| III | Tome of Vigor | +2 Nature | Base game |
| IV | Tome of Nature's Wrath | +2 Nature | Base game |
| IV | Tome of Paradise | +2 Nature | Base game |
| V | Tome of the Goddess of Nature | +2 Nature | Base game |

#### Materium tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Enchantment | +2 Materium | Base game |
| I | Tome of Rock | +2 Materium | Base game |
| II | Tome of Artificing | +2 Materium | Base game |
| II | Tome of Winds | +2 Materium | Base game |
| II | Tome of the Dungeon Depths | +2 Materium | Giant Kings |
| III | Tome of Terramancy | +2 Materium | Base game |
| III | Tome of Transmutation | +2 Materium | Base game |
| IV | Tome of the Crucible | +2 Materium | Base game |
| IV | Tome of the Golden Realm | +2 Materium | Base game |
| V | Tome of the Creator | +2 Materium | Base game |

#### Astral tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Evocation | +2 Astral | Base game |
| I | Tome of Warding | +2 Astral | Base game |
| II | Tome of Scrying | +2 Astral | Base game |
| II | Tome of Summoning | +2 Astral | Base game |
| III | Tome of Amplification | +2 Astral | Base game |
| III | Tome of Teleportation | +2 Astral | Base game |
| IV | Tome of Astral Convergence | +2 Astral | Base game |
| IV | Tome of the Astral Mirror | +2 Astral | Base game |
| V | Tome of the Archmage | +2 Astral | Base game |

#### Shadow tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Cryomancy | +2 Shadow | Base game |
| I | Tome of Necromancy | +2 Shadow | Base game |
| II | Tome of Souls | +2 Shadow | Base game |
| II | Tome of the Doomherald | +2 Shadow | Base game |
| III | Tome of Torment | +2 Shadow | Thrones of Blood |
| III | Tome of the Cold Dark | +2 Shadow | Base game |
| III | Tome of the Great Transformation | +2 Shadow | Base game |
| IV | Tome of Oblivion | +2 Shadow | Base game |
| IV | Tome of the Reaper | +2 Shadow | Base game |
| V | Tome of the Eternal Lord | +2 Shadow | Base game |

#### Dual: Astral / Nature tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of the Sprite | +1 Astral, +1 Nature | Secrets of the Archmages |

#### Dual: Chaos / Materium tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of the Warband | +1 Chaos, +1 Materium | Rise from Ruin |

#### Dual: Chaos / Shadow tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of the Blood Rite | +1 Chaos, +1 Shadow | Thrones of Blood |
| IV | Tome of Calamity | +1 Chaos, +1 Shadow | Ways of War |
| IV | Tome of the Crimson Reign | +1 Chaos, +1 Shadow | Thrones of Blood |

#### Dual: Materium / Astral tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| III | Tome of Geomancy | +1 Materium, +1 Astral | Giant Kings |

#### Dual: Materium / Chaos tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| III | Tome of the Dreadnought | +1 Materium, +1 Chaos | Empires & Ashes |

#### Dual: Materium / Nature tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Alchemy | +1 Materium, +1 Nature | Empires & Ashes |
| II | Tome of the Sand Stalkers | +1 Materium, +1 Nature | Rise from Ruin |

#### Dual: Materium / Order tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Discipline | +1 Materium, +1 Order | Ways of War |
| II | Tome of the Construct | +1 Materium, +1 Order | Empires & Ashes |

#### Dual: Materium / Shadow tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| II | Tome of Shades | +1 Materium, +1 Shadow | Ways of War |
| IV | Tome of Severing | +1 Materium, +1 Shadow | Empires & Ashes |

#### Dual: Nature / Astral tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| II | Tome of Fey Mists | +1 Nature, +1 Astral | Primal Fury |
| IV | Tome of the Stormborne | +1 Nature, +1 Astral | Primal Fury |

#### Dual: Nature / Chaos tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Evolution | +1 Nature, +1 Chaos | Dragon Dawn |
| III | Tome of Dragons | +1 Nature, +1 Chaos | Dragon Dawn |

#### Dual: Nature / Shadow tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| III | Tome of the Weaver | +1 Nature, +1 Shadow | Secrets of the Archmages |

#### Dual: Order / Astral tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of Abjuration | +1 Order, +1 Astral | Secrets of the Archmages |
| III | Tome of Prophecies | +1 Order, +1 Astral | Archon Prophecy |

#### Dual: Order / Chaos tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| III | Tome of the Cleansing Flame | +1 Order, +1 Chaos | Eldritch Realms |

#### Dual: Order / Nature tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| IV | Tome of Prosperity | +1 Order, +1 Nature | Ways of War |

#### Dual: Order / Shadow tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| IV | Tome of the Revenant | +1 Order, +1 Shadow | Archon Prophecy |

#### Dual: Shadow / Astral tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| I | Tome of the Tentacle | +1 Shadow, +1 Astral | Eldritch Realms |
| III | Tome of Corruption | +1 Shadow, +1 Astral | Eldritch Realms |

#### All affinities tomes

| Tier | Tome | Affinity granted | DLC |
|---|---|---|---|
| V | Tome of the Cosmos | +1 Astral, +1 Alignment, +1 Shadow, +1 Chaos, +1 Nature, +1 Materium, +1 Order | Secrets of the Archmages |

### 1.3–1.7 Full tome contents (by tier, then affinity)

Column notes: *Skill tier* is the in-tome research tier shown in the game database (higher = researched later, costlier). *Cost / casting points* = mana (or souls/thralls) cost plus World Map Casting Points (WCP) for strategic spells or Combat Casting Points (CCP) for tactical spells. Unit rows show draft/mana cost, upkeep, HP/Def/Res/Status-resistance/Move Points, then abilities and primary passives. Numbers are the base values from the game data (before Spell Amplification, empire skills, etc.).

### 1.3 Tier I tomes — full contents

#### Tome of Faith  

- **Tier:** I | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_faith`
- **Theme:** Heal and support your units through the power of the Faithful.
- **Lore attribution:** Anon, Archon Wizard of Life
- **Unlocked on selection (Special Province Improvement) — Abbey** (60 Gold 130 Production): • +10 Knowledge • +3 Knowledge per adjacent Farm. • Grants Status Protection at the start of the next Combat to all friendly Units on this hex. 3 Turn cooldown. • Counts as a Research Post. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Faithful Whispers | I | Sustained City Spell | 45 Mana / 45 WCP | - | Allegiance with target Free City increases 30% faster. |
| Army Heal | II | Friendly Army Spell | 80 Mana / 80 WCP | - | Units in target army heal 25 Hit Points. |
| Convent | II | City Structure | 100 Gold 250 Production | - | For each City Stability level above Unstable the city gains: • +5 Knowledge. • +5 Mana. |
| Staves of Mending | II | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • Faithful, which reduces base Unit Upkeep. • Mending Touch, a healing ability for use in battle. Applies to: Support Unit. |
| Summon Lesser Light Spirit | II | Summon Spell | 60 Mana / 60 WCP | - | Summons a Lesser Light Spirit Support Unit. Summons: Lesser Light Spirit (Tier I Support, HP 50, Def 0, Res 2) |
| Wrath of the Faithful | II | Damage Spell | 10 Mana / 15 CCP | - | Target enemy unit sustains 10 Spirit Damage plus 5 Spirit Damage per each friendly Faithful unit in battle (up to 8). |

#### Tome of Zeal  

- **Tier:** I | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_zeal`
- **Theme:** Rile up your fanatic population for a common goal. Use units with Zeal and inflict Condemned on enemies.
- **Lore attribution:** Sola the Pure, Exalted Human
- **Unlocked on selection (Special Province Improvement) — Quarry Circle of Zealotry** (60 Gold 130 Production): • +10 Draft per positive or negative level of alignment. • +2 City Stability per adjacent Province Improvement. • Unit deployment location. • Counts as a Quarry. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Condemnation | I | Damage/Debuff Spell | 5 Mana / 10 CCP | - | Target enemy unit: • Sustains 15 Spirit Damage. • Becomes Condemned until the end of battle. |
| Summon Zealot | I | Summon Spell | 60 Mana / 60 WCP | - | Summons a Zealot onto the target world hex. A Zealot is a reckless Fighter Unit that is advantageous against Condemned units. Summons: Zealot (Tier I Magic Fighter, HP 60, Def 2, Res 2) |
| Fanatical Workforce | II | City Spell | 45 Mana / 45 WCP | - | For 3 Turns, target owned city: • Gains +60 Production income. • Loses -20 Food income. |
| Inspiring Chant | II | Buff Spell | 30 Mana / 25 CCP | - | Friendly units in a 2-hex radius: • Gain +10 Morale. • Become 2 Strengthened if they have Zeal. |
| Legion of Zeal | II | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • Zeal, which makes attacks deal extra Spirit Damage. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit. |

#### Tome of Gluttony  

- **Tier:** I | **Affinity granted:** +2 Chaos | **DLC:** Secrets of the Archmages | id `tome_of_gluttony`
- **Theme:** Gain control over the infernal domain of Gluttony, making your units harder to kill and stronger as they feed on mortal essences.
- **Lore attribution:** Istarnech Gold-Curser, the Traitor King.
- **Unlocked on selection (Special Province Improvement) — Farm Hungering Maw** (60 Gold 130 Production): • 10% of Food is converted to Mana. • When victorious in battle, this city gains 25 Food. • Counts as a Farm. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Illusory Feast | I | Debuff Spell | 10 Mana / 15 CCP | - | Target enemy unit: • Becomes Distracted for 1 Turn. • Has a base 90% chance of becoming Stunned for 1 Turn. |
| Summon Gluttonous Imp | I | Summon Spell | 60 Mana / 60 WCP | - | Summon a Gluttonous Imp on target hex. Summons: Gluttonous Imp (Tier I Magic Fighter, HP 65, Def 2, Res 2) |
| Corrupt Pact | II | Sustained City Spell | 60 Mana / 60 WCP | - | Target Free City: • Has its Relations to other rulers reduced by 200. • 80% of its Food income is given to your cities. |
| Demonic Hunger | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Target race is charged with infernal forces of gluttony, gaining: • When killing a non-Combat Summon enemy unit, gain a permanent stack of Gorged which: • At 10 stacks turns into a permanent stack of Demonic Satiation. • Cannot be gained when Demonic Satiation is at 10 stacks. • When pillaging a province, heal for 25% of their maximum Hit Points. |
| Infernal Jaws | II | Damage Spell | 10 Mana / 15 CCP | - | Target enemy sustains: • 15 Physical Damage. • 15 Fire Damage. If the enemy dies, adjacent friendly units: • Heal 20 Temporary Hit Points. • If they have Demonic Hunger or Imp's Hunger, gain Gorged. |

#### Tome of Pyromancy  

- **Tier:** I | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_pyromancy`
- **Theme:** Specialize in high Fire Damage by inflicting and exploiting Burning.
- **Lore attribution:** Yaka, self-proclaimed God of Fire
- **Unlocked on selection (Special Province Improvement) — Forester Ritual Pyre** (60 Gold 130 Production): • +10 Mana income. • +3 Mana per adjacent Forester. • Allows the drafting of Inferno Puppies. • Counts as a Forester. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ignite | I | Damage/Debuff Spell | 10 Mana / 15 CCP | - | Target enemy unit: • Sustains 25 Fire Damage. • Is inflicted with Burning. • The ground is set On Fire. |
| Summon Lesser Magma Spirit | I | Summon Spell | 60 Mana / 60 WCP | - | Summons a Lesser Magma Spirit on target hex. Summons: Lesser Magma Spirit (Tier I Battle Mage, HP 50, Def 0, Res 2) |
| Fiery Imbuement | II | Unit Enchantment | 80 Mana / 80 WCP | - | Attacks of enchanted units gain: • +1 Fire Damage. • A base 60% chance of inflicting Burning. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Immolate | II | Damage Spell | 15 Mana / 20 CCP | - | Enemy units in a 1-hex radius: • Sustain 10 Fire Damage. • Sustain an extra 15 Fire Damage if they are Burning. |
| Pyromancer | II | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Pyromancer** (Tier II Battle Mage; 120 Draft 100 Gold; upkeep 12 Gold; HP 55, Def 0, Res 2, Status res 0, MP 40) — Abilities: Fire Bolts, Flamestrike, Defense Mode. Passives: Status Effect Immunity: Burning. A Battle Mage Unit that spreads fire and inflicts Burning. |
| Searing Blades | II | Unit Enchantment | 80 Mana / 80 WCP | - | Makes attacks of enchanted units deal: • +2 Fire Damage. • +10% damage against targets that are Burning. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |

#### Tome of the Horde  

- **Tier:** I | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_the_horde`
- **Theme:** Turn your cheapest units into large, deadly armies. Specialize in summoning and buffing low tier units.
- **Lore attribution:** Swarmcaller Trass, Ratkin War-chief
- **Unlocked on selection (Special Province Improvement) — Forester Mob Camp** (60 Gold 130 Production): • +7 Food. • +7 Draft. • Unit deployment location. • Tier I Units are cheaper by 20%. • Counts as a Forester. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Fury of the Horde | I | Buff Spell | 10 Mana / 15 CCP | - | Tier I and Tier II friendly units in a 2-hex radius gain: • 2 stacks of Strengthened. |
| Houndmaster | I | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Houndmaster** (Tier II Ranged; 120 Draft 100 Gold; upkeep 12 Gold; HP 55, Def 1, Res 1, Status res 0, MP 40) — Abilities: Weak Point Shot, Defense Mode. Passives: Unleash the Hounds. A Ranged Unit that summons a War Hound to debilitate enemies. |
| Blaze of the Horde | II | Damage Spell | 5 Mana / 10 CCP | - | Target enemy unit suffers: • 25 Fire Damage. • +5 Fire Damage for each adjacent friendly unit |
| Spawnkin | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Makes the target race smaller and more numerous, granting them: • Increased number of units in formation. • +20% damage for non-hero units. • +10% Evasion for hero units. • Incompatible with Supergrowth. |
| Summon Irregulars | II | Summon Spell | 60 Mana / 60 WCP | - | Summons a random non-Scout Tier I unit that can be produced in a city on the target hex. |
| Unleash the War Hounds | II | Siege Project | - | - | • At the start of the battle, gain 6 War Hound units on the attacker's side until the end of battle. |

#### Tome of Beasts  

- **Tier:** I | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_beasts`
- **Theme:** Walk beside the Animals of nature. Specialize in summoning and buffing Animals and become stronger when standing next to them.
- **Lore attribution:** Serena, Elven Wizard of Life
- **Unlocked on selection (Special Province Improvement) — Forester Wildlife Sanctuary** (100 Gold 250 Production): • +10 Food. • +5 Draft per adjacent Province with Forest. • Unlocks the production of various Animal Units. • Counts as a Forester. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Mark as Prey | I | Debuff Spell | 5 Mana / 10 CCP | - | Target enemy: • Becomes Distracted. • Suffers 3 Sundered Defense. |
| Animal Kinship | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Makes the target race more bestial and connected to animals. When adjacent to a friendly Animal, both units are granted: • +10% damage • +10% Critical Hit Chance |
| Call Wild Animal | II | Summon Spell | 60 Mana / 60 WCP | - | • Choose a Tier I or Tier II Animal unit to add to your army. • The available Animals depend on the type of terrain the spell is cast on. Summons: Ice Spider (Tier II Magic Fighter, HP 75, Def 2, Res 2); Goretusk Piglet (Tier I Shock, HP 65, Def 1, Res 0); Grimbeak Crow (Tier I Fighter, HP 60, Def 0, Res 0); Polar Bear (Tier II Fighter, HP 80, Def 2, Res 0); Dire Penguin (Tier II Fighter, HP 70, Def 2, Res 1); Carrion Bird (Tier II Fighter, HP 70, Def 2, Res 1); Inferno Puppy (Tier I Magic Fighter, HP 60, Def 1, Res 1); Scrap Hermit (Tier II Shield, HP 80, Def 6, Res 1); Elephant (Tier II Shock, HP 90, Def 3, Res 0); Pyremoth (Tier II Battle Mage, HP 55, Def 0, Res 2); Warg (Tier II Fighter, HP 70, Def 2, Res 1); Hunter Spider (Tier II Fighter, HP 75, Def 2, Res 1); Dread Spider Hatchling (Tier I Fighter, HP 60, Def 2, Res 0); Young Caustic Worm (Tier I Shock, HP 65, Def 2, Res 0); Brown Bear (Tier II Fighter, HP 70, Def 2, Res 0); Giant Beetle (Tier I Fighter, HP 60, Def 2, Res 0); Weaver Spider (Tier II Ranged, HP 65, Def 1, Res 1); Slither Hatchling (Tier I Skirmisher, HP 65, Def 2, Res 0); Wyvern Fledgling (Tier I Magic Fighter, HP 60, Def 1, Res 1); Razorback (Tier II Ranged, HP 65, Def 3, Res 1); Vampire Spider Hatchling (Tier I Fighter, HP 50, Def 1, Res 0); Crocodile (Tier I Fighter, HP 65, Def 1, Res 0); Ape (Tier II Shock, HP 90, Def 3, Res 1); Celestial Griffon (Tier II Skirmisher, HP 65, Def 3, Res 3); Griffon (Tier II Shock, HP 80, Def 2, Res 2); Nimu (Tier II Shield, HP 80, Def 6, Res 1); Kraken Spawn (Tier II Fighter, HP 70, Def 2, Res 1); Blood Maggot (Tier I Fighter, HP 50, Def 0, Res 0); Doom Bat (Tier I Fighter, HP 60, Def 0, Res 0); Shrieking Bat (Tier II Ranged, HP 65, Def 1, Res 1); Plague Serpent (Tier II Magic Fighter, HP 70, Def 2, Res 2); Fractured Serpent (Tier I Fighter, HP 50, Def 1, Res 1) |
| Call of the Wild | II | Buff Spell | 15 Mana / 20 CCP | - | Friendly Animal and Cavalry units in a 1-hex radius gain: • 2 Bolstered Defense • 2 Strengthened |
| Wildspeaker | II | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Wildspeaker** (Tier II Support; 120 Draft 100 Gold; upkeep 12 Gold; HP 50, Def 1, Res 3, Status res 2, MP 40) — Abilities: Blight Blast, Unleash the Beast, Conjure Animal, Defense Mode: Warding. Passives: Caretaker. A Support Unit that summons and empowers Animals. |

#### Tome of Roots  

- **Tier:** I | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_roots`
- **Theme:** Discover the power of the natural world and specialize in immobilizing enemies and healing allies.
- **Lore attribution:** Birchfoot, Hermit of the Glade
- **Unlocked on selection (Special Province Improvement) — Conduit Herbalist** (60 Gold 130 Production): • +5 Food. • +5 Mana. • Per adjacent Province with Forest or Swamp: • +2 Food. • +2 Mana. • Friendly Armies in this City's Domain regenerate an additional +5 Hit Points per Turn. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Blight Blades | I | Unit Enchantment | 90 Mana / 90 WCP | - | Makes attacks of enchanted units deal: • +2 Blight Damage. • +10% damage against Poisoned or Decaying units. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Healing Roots | I | Healing/Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit: • Heals +10 Temporary Hit Points. • Gains 2 Regeneration. • Has Obscuring Flora created below it. |
| Poison Arrows | II | Unit Enchantment | 90 Mana / 90 WCP | - | Makes attacks of enchanted units: • Deal +1 Blight Damage. • Gain base 60% chance of inflicting Poisoned, a damage-over-time effect. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Skirmisher Unit. |
| Summon Entwined Thrall | II | Summon Spell | 60 Mana / 60 WCP | - | Summons an Entwined Thrall, a poisonous and plantlike creature. Summons: Entwined Thrall (Tier I Skirmisher, HP 55, Def 2, Res 0) |
| Vine Prison | II | Combat Summon Spell | 30 Mana / 25 CCP | - | Summon 5 Living Vine units randomly in a 2-hex radius which live for 2 Turns. These don't deal damage but have a chance of inflicting Immobilized on enemies. Cannot be used in Water battles. Summons: Living Vine (Tier I Fighter, HP 1, Def 0, Res 0) |

#### Tome of Enchantment  

- **Tier:** I | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_enchantment`
- **Theme:** Improve your units with Unit Enchantments and specialize in Physical Damage.
- **Lore attribution:** Edward Portsmith, Last Dreadnought of the Commonwealth
- **Unlocked on selection (Special Province Improvement) — Quarry Runecarver's Camp** (60 Gold 130 Production): • +15 Draft. • +3 Mana per adjacent Quarry. • Unit deployment location. • Counts as a Quarry. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Spell-Tempered Shields | I | Unit Enchantment | 70 Mana / 70 WCP | - | Grants enchanted units: • +1 Resistance. • When entering Defense Mode, this unit and all adjacent allies receive +1 Resistance until the start of the next turn. Applies to: Shield Unit. |
| Summon Copper Golem | I | Summon Spell | 60 Mana / 60 WCP | - | Summons a Copper Golem, a Tier I Polearm Unit. Summons: Copper Golem (Tier I Polearm, HP 70, Def 3, Res 0) |
| Awakened Tools | II | Sustained City Spell | 60 Mana / 60 WCP | 6 Mana | Target owned city has: • +20 Production • +20 Draft • -10 City Stability |
| Purging Arrows | II | Unit Enchantment | 70 Mana / 70 WCP | - | Grants attacks of enchanted units: • +10% damage against Magic Origin units. • Base 60% chance of removing 1 Positive Status Effect from the target. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Skirmisher Unit. |
| Sundering Blades | II | Unit Enchantment | 80 Mana / 80 WCP | - | Grants attacks of enchanted units: • Base 90% chance of inflicting Sundered Defense, reducing enemy Defense. • Demolisher, making them able to destroy reinforced obstacles. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |

#### Tome of Rock  

- **Tier:** I | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_rock`
- **Theme:** Smash your enemies with the force of stone. Specialize in increasing your defenses and dealing Physical Damage.
- **Lore attribution:** Blint the Underminer, First Protector of the Molemen
- **Unlocked on selection (Special Province Improvement) — Central Quarry** (60 Gold 130 Production): • +15 Production. • +5 Production per adjacent Quarry. • Counts as a Quarry. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Gargoyle | I | Unit | 120 Draft 50 Gold 50 Mana | upkeep 12 Gold | **Gargoyle** (Tier II Shock; 120 Draft 50 Gold 50 Mana; upkeep 12 Gold; HP 80, Def 4, Res 0, Status res 0, MP 40) — Abilities: Charge Strike, Defense Mode: Turn to Stone. Passives: -. A flying Shock Unit unit that can harden itself to soften enemy attacks. |
| Rock Blast | I | Damage Spell | 10 Mana / 15 CCP | - | Target enemy unit: • Suffers 24 Physical Damage. • Has its Defense Mode canceled. • Has its Retaliation Attacks removed. |
| Earthkin | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Makes rock growths develop on the target race, granting them: • +1 Defense. • Mountain Camouflage, which allows them to hide on Mountain terrain. • Mountain Walk, which allows them to traverse Mountain terrain faster. |
| Obsidian Weapons | II | Unit Enchantment | 80 Mana / 80 WCP | - | Makes attacks of enchanted units gain: • +1 Physical Damage. • Gain a base 60% chance of inflicting Bleeding for 3 Turns. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Stone Skin | II | Buff Spell | 5 Mana / 10 CCP | - | Target unit gains Stone Skin for 3 Turns. |
| Summon Lesser Stone Spirit | II | Summon Spell | 60 Mana / 60 WCP | - | Summons a Lesser Stone Spirit, a Shield Unit with good defenses. Summons: Lesser Stone Spirit (Tier I Shield, HP 65, Def 4, Res 1) |

#### Tome of Evocation  

- **Tier:** I | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_evocation`
- **Theme:** Grants excellent and cheap attack spells to any aspiring wizard.
- **Lore attribution:** Laryssa Mirabilis, Sorceress of the Commonwealth
- **Unlocked on selection (Special Province Improvement) — Conduit Channeling Tower** (100 Gold 250 Production): • +10 Mana. • +3 Mana per adjacent Conduit. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Fulmination | I | Damage/Debuff Spell | 10 Mana / 15 CCP | - | Enemy units in a 1-hex radius: • Sustain 15 Lightning Damage. • Have a 60% chance of becoming Electrified. |
| Lightning Focus | I | Unit Enchantment | 80 Mana / 80 WCP | - | Makes attacks of enchanted units: • Deal +2 Lightning Damage. • Gain base 30% chance of inflicting Electrified, a damage-over-time effect. Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Evoker | II | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Evoker** (Tier II Battle Mage; 120 Draft 100 Gold; upkeep 12 Gold; HP 55, Def 0, Res 2, Status res 0, MP 40) — Abilities: Lightning Bolts, Electrifying Arc, Defense Mode. Passives: -. A Battle Mage Unit with offensive chain lightning magic. |
| Lightning Blades | II | Unit Enchantment | 80 Mana / 80 WCP | - | Makes attacks of enchanted units deal: • +2 Lightning Damage. • +10% damage against Electrified units. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Summon Lesser Storm Spirit | II | Summon Spell | 60 Mana / 60 WCP | - | Summons a Lesser Storm Spirit on target hex. Summons: Lesser Storm Spirit (Tier I Shock, HP 50, Def 2, Res 0) |
| Lightning Torrent | III | Enemy Army Spell | 80 Mana / 80 WCP | - | In target enemy army: • All units sustain 20 Lightning Damage. • All units suffer -1 Lightning Protection for 1 World Map Turns. |

#### Tome of Warding  

- **Tier:** I | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_warding`
- **Theme:** Specialize in magic that protects your units from damage and retaliates against enemies that attack you.
- **Lore attribution:** Tempest, Master of Storms
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Staves of Warding | I | Unit Enchantment | 70 Mana / 70 WCP | - | Makes Support abilities of enchanted units: • Grant +2 Bolstered Resistance to affected units. Applies to: Support Unit. |
| Summon Phantasm Warrior | I | Summon Spell | 60 Mana / 60 WCP | - | Summons a Phantasm Warrior, a Shield Unit that strikes with Lightning Damage. Summons: Phantasm Warrior (Tier I Shield, HP 60, Def 3, Res 2) |
| Mark of Invulnerability | II | Buff Spell | 15 Mana / 20 CCP | - | Target friendly unit: • Becomes Invulnerable for 1 Turn. • Has their Negative Status Effects removed. Cannot be used on a unit more than once per battle. |
| Magical Wards | III | Minor Race Transformation | 150 Mana / 150 WCP | - | Inscribes magical wards onto the target race, granting: • +2 Lightning Protection • +2 Fire Protection • +2 Frost Protection |
| Static Shield | III | Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit and another within 3 hexes gain Static Shield for 2 Turns. |

#### Tome of Cryomancy  

- **Tier:** I | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_cryomancy`
- **Theme:** Specialize in dealing Frost Damage and inflicting Frozen.
- **Lore attribution:** Artica the Cold, Queen of the Frostlings
- **Unlocked on selection (Special Province Improvement) — School of Cryomancy** (100 Gold 250 Production): • +10 Knowledge. • +3 Mana per adjacent Snow or Ice Province. • Counts as a Research Post. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ice Coffin | I | Damage/Debuff Spell | 15 Mana / 20 CCP | - | Target enemy: • Sustains 10 Frost Damage. • Has a base 90% chance of becoming Frozen. If unsuccessful, inflicts Status Vulnerability. |
| Frost Arrows | II | Unit Enchantment | 80 Mana / 80 WCP | - | Makes attacks of enchanted units gain: • +1 Frost Damage. • A base 60% chance of inflicting Slowed. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Skirmisher Unit. |
| Frost Blades | II | Unit Enchantment | 80 Mana / 80 WCP | - | Makes attacks of enchanted units deal: • +2 Frost Damage. • +10% damage against Frozen or Slowed units. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Summon Lesser Snow Spirit | II | Summon Spell | 60 Mana / 60 WCP | - | Summons a Lesser Snow Spirit, a Magic Fighter Unit with attacks that inflict Frozen. Summons: Lesser Snow Spirit (Tier I Magic Fighter, HP 60, Def 1, Res 1) |
| White Witch | II | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **White Witch** (Tier II Battle Mage; 120 Draft 100 Gold; upkeep 12 Gold; HP 55, Def 0, Res 2, Status res 0, MP 40) — Abilities: Frost Bolts, Freezing Blast, Defense Mode. Passives: -. Grants access to a Battle Mage Unit that inflicts Frozen. |
| Blizzard | III | Enemy Army Spell | 80 Mana / 80 WCP | - | All units in target enemy army: • Sustain 20 Frost Damage. • Suffer -3 Status Resistance for 1 World Map Turns. |

#### Tome of Necromancy  

- **Tier:** I | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_necromancy`
- **Theme:** Harvest Souls from your enemies and create Undead creatures. Specialize in expendable units and starting your Soul economy.
- **Lore attribution:** Gloom Hooknail, Dark Lady of the Corrupted Goblins
- **Tome passive — Soul Harvest:** Gain Souls when enemies die in battle. Unlocks the ability to animate City Ruin and to animate Heroes in your crypt as your undead servants.
- **Unlocked on selection (Special Province Improvement) — Soulwell** (100 Gold 250 Production): • +5 Souls. • +3 Mana per adjacent Research Post or Conduit. • Counts as a Research Post. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Necrotize | I | Damage/Debuff Spell | 10 Mana / 15 CCP | - | Target enemy unit: • Sustains 10 Frost Damage and 10 Blight Damage • Gains 2 stacks of Decaying for 3 Turns. • When it dies, it becomes a Decaying Zombie under your control until the end of combat. |
| Skeleton Reanimation | I | Empire Bonus | - | - | When killing racial units, gain the option to spend Souls to create Skeletons after combat. |
| Soul Collection | I | Sustained World Spell | 45 Mana / 45 WCP | 30 Gold | • Gain +10 Souls income. • Costs 30 Gold upkeep. |
| Necromancer | II | Unit | 120 Draft 50 Gold 20 Souls | upkeep 12 Gold | **Necromancer** (Tier II Support; 120 Draft 50 Gold 20 Souls; upkeep 12 Gold; HP 60, Def 1, Res 3, Status res 2, MP 40) — Abilities: Death Blast, Strengthen Undead, Raise Undead, Defense Mode: Warding. Passives: -. Necromancer strengthen the Undead and create them from corpses. |
| Necrotic Imbuement | II | Unit Enchantment | 90 Mana / 90 WCP | - | Grants attacks of enchanted units: • A base 90% chance of inflicting Decaying, a damage-over-time effect that decreases healing received. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Rotting Explosion | III | Damage/Debuff Spell | 10 Souls / 15 CCP | - | Target friendly Zombie or Skeleton unit explodes, all enemies in a 2-hex radius: • Sustain 10 Frost Damage and 10 Blight Damage. • Gain 2 Decaying for 3 Turns. |

#### Tome of the Sprite  

- **Tier:** I | **Affinity granted:** +1 Astral, +1 Nature | **DLC:** Secrets of the Archmages | id `tome_of_the_sprite`
- **Theme:** Use the powers of small Fey to support your units and befuddle your enemies.
- **Lore attribution:** Ham Binger, Chosen of the Fey
- **Unlocked on selection (Special Province Improvement) — Forester Fey Woods** (60 Gold 130 Production): • +10 Food. • +5 Draft. • +2 Mana per adjacent Forester. • Counts as a Forester. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Captivating Lights | I | Debuff Spell | 15 Mana / 20 CCP | - | Target enemy unit: • Becomes Distracted for 1 Turn. • Has its Defense Mode canceled. • Has its Retaliation Attacks removed. |
| Catnap | I | Friendly Army Spell | 30 Mana / 30 WCP | - | Target friendly army loses all their movement points then heals by 1 Hit Point per movement point lost. |
| Summon Sprite | I | Summon Spell | 60 Mana / 60 WCP | - | Summon a Morning Sprite Support Unit or an Evening Sprite Battle Mage Unit. Summons: Morning Sprite (Tier I Support, HP 50, Def 0, Res 2); Evening Sprite (Tier I Battle Mage, HP 50, Def 0, Res 2) |
| Fairy Dust | II | Unit Enchantment | 70 Mana / 70 WCP | - | Enchanted units: • Gain the Fairy Dust ability. Applies to: Support Unit, Battle Mage Unit. |
| Fey Bond | II | Unit Enchantment | 70 Mana / 70 WCP | - | Enchanted units: • On combat start, gain +10 Morale. • When at neutral morale, gain +2 Status Resistance. • When at high morale, gain +4 Status Resistance. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Tome of the Warband  

- **Tier:** I | **Affinity granted:** +1 Chaos, +1 Materium | **DLC:** Rise from Ruin | id `tome_of_the_warband`
- **Theme:** Build strong martial armies and mentor your units through the ranks.
- **Lore attribution:** Unknown, Soldier of the Lost Battalion
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Commander's Call | I | Buff Spell | 15 Mana / 20 CCP | - | Friendly units in a 1-hex radius: • Heal 15 Temporary Hit Points • Gain 15 Morale |
| Lieutenant | I | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Lieutenant** (Tier II Fighter; 120 Draft 100 Gold; upkeep 12 Gold; HP 85, Def 3, Res 2, Status res 0, MP 40) — Abilities: Melee Strike, Discern Weakness, Defense Mode. Passives: Lieutenant's Lead. A Fighter Unit unit that empowers others in battle through their own actions. |
| Mentorship | I | Empire Bonus | - | - | All heroes under your control gain: • While army leader, the non-Hero unit with the least Experience in the army gains +40 Experience per World Map Turn. |
| Bred for War | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Transformed units become stronger and more battle ready gaining: • +10 Hit Points. • +10% Morale resistance to morale loss, plus +10% for each adjacent friendly unit. |
| Training Regimen | II | City Spell | 45 Mana / 45 WCP | 10 Mana | Target owned city: • Gains 40 Draft. |

#### Tome of the Blood Rite  

- **Tier:** I | **Affinity granted:** +1 Chaos, +1 Shadow | **DLC:** Thrones of Blood | id `tome_of_the_blood_rite`
- **Theme:** Perform forbidden and dangerous rites on your units to bleed your enemies and strengthen your allies.
- **Lore attribution:** Ymbria, the Bleeding Priestess
- **Unlocked on selection (Special Province Improvement) — Conduit Blood Altar** (60 Gold 130 Production): • +15 Draft income. • +5 Draft per adjacent Farm. • When victorious in battle gain 10 Mana. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Rite of Bloodletting | I | Damage/Debuff Spell | 10 Mana / 15 CCP | - | Target friendly unit sustains 5 unblockable Physical Damage. Then all enemy units within 2 hexes: • Sustain 12 Physical Damage. • Gain 2 Bleeding for 3 Turns. |
| Rite of Life Leeching | I | Buff Spell | 15 Mana / 20 CCP | - | Target friendly unit sustains 5 unblockable Physical Damage. Then all adjacent friendly units gain: • Strengthened for 3 Turns. • Life Steal for 3 Turns. |
| Blood Cultist | II | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Blood Cultist** (Tier II Battle Mage; 120 Draft 100 Gold; upkeep 12 Gold; HP 55, Def 0, Res 2, Status res 0, MP 40) — Abilities: Hemorrhage Bolts, Scarlet Plague, Dagger of the Rite, Defense Mode. Passives: -. A Battle Mage Unit that inflicts a Blood Parasite on its enemies and can empower themselves at the cost of their lives. |
| Blood Drinking Blades | II | Unit Enchantment | 80 Mana / 80 WCP | - | Attacks of enchanted units: • Deal +2 Physical Damage. • When striking units with Bleeding, heal for 3 Temporary Hit Points. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Flesh Carved Runes | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Carve profane sigils onto the flesh of your race, granting them: • +5 Hit Point regeneration on the World Map. • Attack and Debuff abilities: • Ignore 1 Status Resistance per stack of Bleeding on the target. |
| Sanguine Focus | II | Unit Enchantment | 80 Mana / 80 WCP | - | Attacks of enchanted units gain: • +1 Physical Damage. • A base 60% chance of inflicting Bleeding for 3 Turns. Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |

#### Tome of Alchemy  

- **Tier:** I | **Affinity granted:** +1 Materium, +1 Nature | **DLC:** Empires & Ashes | id `tome_of_alchemy`
- **Theme:** Inflict your enemies with Negative Status Effects and mitigate them on your own units. Tinctures and a powerful ranged unit will help you manipulate the tides of battle.
- **Lore attribution:** Fauster, the Meticulous
- **Unlocked on selection (Special Province Improvement) — Alchemist's Lab** (100 Gold 250 Production): • +10 Knowledge. • +3 Knowledge per adjacent unique Province Improvement. • Counts as a Research Post. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Disperse Afflicting Miasma | I | Debuff Spell | 15 Mana / 20 CCP | - | Create Afflicting Miasma in a 1-radius. |
| Mysterious Tonic | I | Unit Enchantment | 70 Mana / 70 WCP | - | Grants enchanted units: • Distribute Tonic, granting Positive Status Effects while removing a negative one. Applies to: Support Unit. |
| Afflictor | II | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Afflictor** (Tier II Ranged; 120 Draft 100 Gold; upkeep 12 Gold; HP 65, Def 1, Res 1, Status res 4, MP 40) — Abilities: Shoot Repeater Crossbow, Miasma Shot, Defense Mode. Passives: -. Ranged Unit that can create Miasmas to debilitate enemies. |
| Antimagic Tincture | II | Buff Spell | 10 Mana / 15 CCP | - | Friendly units in a 1-hex radius: • Have 2 Negative Status Effects dispelled. • Gain 2 Status Protection. |
| Fumigation | II | Siege Project | - | - | At the start of combat units defending the city: • Suffer 16 Blight Damage. • Suffer 2 Weakened. |
| Material Refinery | II | City Structure | 100 Gold 250 Production | - | • +5 Gold income • +5 Knowledge income • +5 Gold income per Magic Material inside Domain: • +5 Knowledge income per Magic Material inside Domain: |

#### Tome of Discipline  

- **Tier:** I | **Affinity granted:** +1 Materium, +1 Order | **DLC:** Ways of War | id `tome_of_discipline`
- **Theme:** Channel your inner strength to empower your attacks and cleanse your body.
- **Lore attribution:** Aya the Enlightened, Eternal Guide of the Open Hand
- **Unlocked on selection (Special Province Improvement) — Conduit Monastery** (60 Gold 130 Production): • 10 City Stability. • 10 Draft • Per adjacent Farm: • 2 City Stability • 3 Draft • Counts as a Conduit Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Mantra of Purification | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • Has 3 Negative Status Effect dispelled. |
| Monk | I | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Monk** (Tier II Fighter; 120 Draft 100 Gold; upkeep 12 Gold; HP 80, Def 3, Res 1, Status res 0, MP 40) — Abilities: Melee Strike, Leap, Meditate, Defense Mode. Passives: -. Mobile Fighter Unit that can use devastating combo attacks and heal itself. |
| Empowered Strikes | II | Unit Enchantment | 70 Mana / 70 WCP | - | Makes base Melee attacks and Magic Strikes of enchanted units: • Deal +2 Physical Damage. • Third attack in a turn has a 60% base chance of inflicting Stunned for 1 Turn Enchantment doesn't apply to units without a repeating base melee attack. Applies to: Shield Unit, Polearm Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Focus Aim | II | Unit Enchantment | 70 Mana / 70 WCP | - | Grants enchanted units: • The Focus Aim ability, which allows the unit to make an attack that cannot miss Applies to: Ranged Unit, Support Unit, Battle Mage Unit. |
| Inner Mastery | II | Minor Race Transformation | 150 Mana / 150 WCP | - | Grants the target race mastery over their own internal energies, granting them: • +1 Status Resistance • +20% healing received in combat. |

#### Tome of Evolution  

- **Tier:** I | **Affinity granted:** +1 Nature, +1 Chaos | **DLC:** Dragon Dawn | id `tome_of_evolution`
- **Theme:** Take young primal forces and nurture them into formidable allies.
- **Lore attribution:** Nimue, Siren Goddess
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Slither Hatchling | I | Unit | 80 Draft 60 Gold | upkeep 8 Gold | **Slither Hatchling** (Tier I Skirmisher; 80 Draft 60 Gold; upkeep 8 Gold; HP 65, Def 2, Res 0, Status res 0, MP 40) — Abilities: Melee Strike, Venomous Spit, Defense Mode. Passives: Draconic Rage, Low Maintenance, Slippery, Swift. A Skirmisher Unit that evolves into a stronger unit. |
| Youthful Rejuvenation | I | Healing/Buff Spell | 10 Mana / 15 CCP | - | Target unit: • Heals for 25 Temporary Hit Points. • Gains 2 stacks of Strengthened. Units with Evolve or Product of Evolution: • Gain Resurgence until the end of combat. |
| Rapid Evolution Enchantment | II | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • 15 Experience per Turn. • Slip Away healing them once per battle if their Hit Points would be reduced to zero. Applies to: Units that Evolve, Units that have Evolved. |
| Summon Wyvern Fledgling | II | Summon Spell | 60 Mana / 60 WCP | - | Summons a Wyvern Fledgling to target hex. Summons: Wyvern Fledgling (Tier I Magic Fighter, HP 60, Def 1, Res 1) |
| Draconic Vitality | III | Minor Race Transformation | 150 Mana / 150 WCP | - | Target race is imbued with Dragon-like vitality, granting them: • +5 Hit Point regeneration per World Map Turn. • +3 Hit Points per Unit Rank. • +3 Hit Points per Hero Level, up to Level 10. |

#### Tome of Abjuration  

- **Tier:** I | **Affinity granted:** +1 Order, +1 Astral | **DLC:** Secrets of the Archmages | id `tome_of_abjuration`
- **Theme:** Create wards and protections to preserve your units.
- **Lore attribution:** Merlin, the Tarnished Archmage
- **Unlocked on selection (Special Province Improvement) — Conduit Glyph Tower** (100 Gold 250 Production): • +10 City Stability • +10 Draft • Per adjacent Conduit or Research Post: • +3 City Stability • +1 Fortification Health • Counts as a Conduit Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| City Wards | I | Sustained City Spell | 45 Mana / 45 WCP | 10 Mana | Target owned city or non-hostile free city: • Gains +10 City Stability. • Gains +10 Fortification Health if not under siege. • If targeting a free city with an owned Whispering Stone, gain +2 Allegiance per turn. |
| Curse Reversal | I | Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit: • Has its negative status effects removed. • If the removed status effects have positive counters, the unit gains a stack of it. |
| Abjure Violence | II | Debuff Spell | 10 Mana / 15 CCP | - | Target enemy unit: • Has a base 120% chance of becoming Pacified for 1 Turn. • Chance decreases based on target's lost Hit Points. |
| Abjurer Glyphs | II | Unit Enchantment | 70 Mana / 70 WCP | - | Enchanted units gain: • Battle Shields, gaining Precognition when its total Hit Points reach 60% and 30%. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit. |
| Conjure Abjurer Pylon | II | Combat Summon Spell | 15 Mana / 20 CCP | - | Conjure an Abjurer Pylon on target hex that casts Magic Shield on friendly units. This summon lasts for 3 Turns. Cannot be used in Water battles. Summons: Abjurer Pylon (Tier II ?, HP 70, Def 2, Res 2) |
| Mage Armor | II | Unit Enchantment | 70 Mana / 70 WCP | - | Enchanted units gain: • +1 Defense • +2 Status Resistance Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |

#### Tome of the Tentacle  

- **Tier:** I | **Affinity granted:** +1 Shadow, +1 Astral | **DLC:** Eldritch Realms | id `tome_of_the_tentacle`
- **Theme:** Conjure tentacled mutations and creatures from the depths to restrain and constrict your enemies, keeping them right where you want them.
- **Lore attribution:** Ra'cheq the Disturbing, High Corruptor
- **Unlock rule:** Tier I: available from the start (no tome or affinity requirement).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Conjure Tentacle | I | Combat Summon Spell | 30 Mana / 25 CCP | - | Summon an Immobile Fighter Unit with Hyper-Awareness. This summon lasts for 3 Turns. Summons: Tentacle (Tier I Fighter, HP 50, Def 0, Res 0) |
| Constrictor | I | Unit | 120 Draft 100 Gold | upkeep 12 Gold | **Constrictor** (Tier II Polearm; 120 Draft 100 Gold; upkeep 12 Gold; HP 80, Def 4, Res 1, Status res 0, MP 40) — Abilities: Melee Strike, Pull, Defense Mode. Passives: Charge Resistance, First Strike. A Polearm Unit capable of pulling in and restraining opponents. |
| Constricting Focus | II | Unit Enchantment | 80 Mana / 80 WCP | - | Base Magic attacks of enchanted units: • Deal +2 Physical Damage • Gain base 30% chance of inflicting Constricted for 1 Turn. • Chance increased to 60% against Marked or Slowed units. Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Retaliating Growths | II | Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit gains Retaliating Growths for 2 Turns. |
| Tendril Labyrinth | II | City Structure | 60 Gold 130 Production | - | • Unlock Tendril Labyrinth • +10 Gold income • +10 City Stability income |

### 1.4 Tier II tomes — full contents

#### Tome of Virtue  

- **Tier:** II | **Affinity granted:** +2 Order | **DLC:** Archon Prophecy | id `tome_of_virtue`
- **Theme:** Create a virtuous army and make them fight strong until the end.
- **Lore attribution:** Maliel, Archon Paladin of the Second Order
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Heroic Stand | III | Buff Spell | 30 Mana / 25 CCP | - | Target friendly unit: • Has their Negative Status Effects removed. • Gains Steadfast for 1 Turn. • Ignores the penalties from Casualties for 1 Turn. Can only affect a unit once per battle. |
| House of Charity | III | City Structure | 60 Gold 130 Production | - | The city loses 10% of its Gold income, and gains double that amount as Food and Production. |
| Paladin | III | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Paladin** (Tier III Shield; 220 Draft 140 Gold; upkeep 20 Gold; HP 90, Def 7, Res 3, Status res 3, MP 40) — Abilities: Melee Strike, Smite, Lay on Hands, Defense Mode: Shield Wall. Passives: Shield Defense. A Shield Unit with healing capabilities and a powerful smite. |
| Virtuous Spirit | III | Minor Race Transformation | 250 Mana / 250 WCP | - | Gives target race strength in moments of weakness, giving them: • +2 Spirit Protection • When this unit drops below 60% of their maximum Hit Points: • Ignores 50% of its Casualties. • Gains +1 Defense. • Gains +1 Resistance. |
| Summon Vigil | IV | Summon Spell | 150 Mana / 150 WCP | - | Summon a Vigil Battle Mage Unit, a unit that delivers holy fire to purify their enemies. Summons: Vigil (Tier III Battle Mage, HP 75, Def 1, Res 3) |

#### Tome of the Beacon  

- **Tier:** II | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_the_beacon`
- **Theme:** Brings out the inner radiance of the Faithful to smite enemies and bolster allies.
- **Lore attribution:** Sola the Pure, Exalted Human
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Conjure Divine Beacon | II | Combat Summon Spell | 30 Mana / 25 CCP | - | Summons a Divine Beacon. Upon casting and at the start of each turn, friendly units in a 2-hex radius: • Heal +15 Temporary Hit Points. • Gain +5 Morale. This summon lasts for 3 Turns. Cannot be used in Water battles. Summons: Divine Beacon (Tier II ?, HP 80, Def 2, Res 2) |
| Covenant of the Faith | III | Sustained City Spell | 60 Mana / 60 WCP | - | Units recruited through Rally of the Lieges from the target Vassal have Faithful. Target Vassal city grants the player +15 Mana each Turn. |
| Summon Blessed Soul | III | Summon Spell | 150 Mana / 150 WCP | - | Summons a Blessed Soul Shield Unit that can rally your units and condemn the enemy. Summons: Blessed Soul (Tier III Shield, HP 100, Def 7, Res 3) |
| Chaplain | IV | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Chaplain** (Tier III Support; 220 Draft 140 Gold; upkeep 20 Gold; HP 80, Def 2, Res 4, Status res 5, MP 40) — Abilities: Spirit Blast, Bless, Healing Prayer, Defense Mode: Warding. Passives: Faithful. Faithful Support Unit that bolsters allies. |
| Mighty Meek | IV | Unit Enchantment | 100 Mana / 100 WCP | - | Grants enchanted units: • Faithful, which reduces Unit Upkeep. • +2 Status Resistance. • +1 Spirit Damage on attacks for each Unit Tier of the target. Effects are increased for Single Shot attacks. Applies to: Tier I, Tier II. |

#### Tome of the Inquisition  

- **Tier:** II | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_the_inquisition`
- **Theme:** Hunt down those who do not agree with your authority. Inflict Condemned on enemies and restrict their Movement.
- **Lore attribution:** Shira Snowblood, Godir of the Covenant
- **Unlocked on selection (Special Province Improvement) — Mine Tithe Collector** (100 Gold 250 Production): • +10 Gold. • +2 Gold per adjacent Farm or Forester. • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Summon Lightbringer | II | Summon Spell | 100 Mana / 100 WCP | - | Summon a Lightbringer Battle Mage Unit that can convert other units to your cause. Summons: Lightbringer (Tier II Battle Mage, HP 55, Def 0, Res 2) |
| Burden of Guilt | III | Enemy Army Spell | 80 Mana / 80 WCP | - | Target enemy army: • Sustains 20 Spirit Damage. • Loses 50% of its Move Points on the World Map. |
| Inquisitor | III | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Inquisitor** (Tier III Skirmisher; 220 Draft 140 Gold; upkeep 20 Gold; HP 95, Def 4, Res 2, Status res 3, MP 40) — Abilities: Melee Strike, Shoot Crossbow, Bolt of Judgment, Defense Mode. Passives: Slippery, Swift, Truesight, Zeal. Grants access to an aggressive Skirmisher Unit that can inflict Condemned and Stunned. |
| Mass Condemnation | III | Damage/Debuff Spell | 15 Mana / 20 CCP | - | Enemies in a 1-hex radius: • Sustain 10 Spirit Damage. • Become Condemned until the end of battle. |
| Tribunal | III | City Structure | 100 Gold 250 Production | - | • +20 City Stability income • +1 Knowledge income per Population: |
| Inquisitor's Mark | IV | Unit Enchantment | 90 Mana / 90 WCP | - | Makes attacks of enchanted units have a: • Base 60% chance of inflicting Condemned until end of combat, reducing enemy Status Resistance. • Base 60% chance of inflicting Weakened, reducing enemy damage. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Skirmisher Unit. |

#### Tome of Burning Passion  

- **Tier:** II | **Affinity granted:** +2 Chaos | **DLC:** Secrets of the Archmages | id `tome_of_burning_passion`
- **Theme:** Strengthen your units with Demonic wrath, seduce your enemies with fiendish lust, and engulf both in infernal flames.
- **Lore attribution:** Cinren Toliath, Sublime Seducer
- **Unlocked on selection (Special Province Improvement) — Quarry House of Passion** (100 Gold 250 Production): • +10 Draft. • +6 Gold per adjacent Farm. • Counts as a Quarry. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Blazing Aura | III | Unit Enchantment | 80 Mana / 80 WCP | - | Enchanted units gain: • Blazing Aura, burning and damaging nearby enemies. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Conjure Orb of Desire | III | Combat Summon Spell | 30 Mana / 25 CCP | - | Conjure an Orb of Desire on target hex that Taunts enemies and burns attackers. This summon lasts for 3 Turns. Summons: Orb of Desire (Tier III ?, HP 80, Def 3, Res 3) |
| Strength Sapping Imbuement | III | Unit Enchantment | 80 Mana / 80 WCP | - | Enchanted units attacks gain: • +1 Fire Damage. • Base attacks have a base 60% chance of inflicting Weakened for 3 Turns. On success gain Strengthened for 3 Turns. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Temptress | III | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Temptress** (Tier III Magic Fighter; 220 Draft 140 Gold; upkeep 20 Gold; HP 90, Def 3, Res 4, Status res 3, MP 40) — Abilities: Magic Strike, Kiss of Seduction, Defense Mode. Passives: Curse of Desire, Flanker, Melee Mage. A Magic Fighter Unit that can inflict Dominated on enemy units. |
| Thrill of Combat | III | Buff Spell | 15 Mana / 20 CCP | - | Target friendly unit gains: • Berserk for 3 Turns. • 5 Infernal Might for 3 Turns. |
| Fiery Heart | IV | Minor Race Transformation | 250 Mana / 250 WCP | - | Target race gains a fiery core, gaining: • +2 Fire Protection • +10% Critical Hit chance • Fire Hazard Immunity |

#### Tome of Mayhem  

- **Tier:** II | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_mayhem`
- **Theme:** Cause chaos on the battlefield by randomly displacing enemies and inflicting Misfortune.
- **Lore attribution:** Kruul Blightlord, Chaos Prince
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Curse of Misfortune | III | Debuff Spell | 30 Mana / 25 CCP | - | Targets in a 2-hex radius suffer 2 Misfortune. |
| Mark of Misfortune | III | Unit Enchantment | 90 Mana / 90 WCP | - | Makes attacks of enchanted units: • Inflict Misfortune. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Summon Gremlin | III | Summon Spell | 100 Mana / 100 WCP | - | Summons a Gremlin onto the target world hex. This unit is a disruptive and fiendish Magic Fighter Unit. Summons: Gremlin (Tier II Magic Fighter, HP 60, Def 2, Res 2) |
| Incite Revolution | IV | World Spell | 100 Mana / 100 WCP | - | Target enemy city: • Loses a border province and the population is lost. • Spawns a Brigand Camp on land provinces. • Spawns a Pirate Cove on coastal provinces. |
| Sow Confusion | IV | Siege Project | - | - | At the start of the battle, enemy units: • Are displaced by 4 hexes. • Suffer Misfortune for 3 Turns. • Suffer Slowed for 1 Turn. |

#### Tome of Revelry  

- **Tier:** II | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_revelry`
- **Theme:** Follow the path of debauchery that rewards those who take chances and specialize in gaining Morale and Experience.
- **Lore attribution:** Asgera Spinesplitter, War Queen of the Bloodfang Orcs
- **Unlocked on selection (Special Province Improvement) — Carnival of Flesh** (100 Gold 250 Production): • +7 Food. • +7 Draft. • Per adjacent Farm: • +3 Food. • +3 Draft. • Counts as a Farm. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Bloodfury Weapons | III | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • +2 Physical Damage on attacks. • On kill, adjacent enemies to the target gain 2 Bleeding for 3 Turns. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Revels of Carnage | III | Friendly Army Spell | 60 Mana / 60 WCP | - | Non-hero units in target friendly army gain +100% Experience from combat for 3 Turns. |
| Skald | III | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Skald** (Tier III Support; 220 Draft 140 Gold; upkeep 20 Gold; HP 80, Def 2, Res 4, Status res 5, MP 40) — Abilities: Heat of the Revel, Song of Revelry, Song of Carnage, Defense Mode: Warding. Passives: -. A Support Unit that ensures the revelry never stops by inspiring your units. |
| Reveler's Heart | IV | Minor Race Transformation | 250 Mana / 250 WCP | - | Overwhelms the target race with an intense fervor, granting them: • +50% Morale from all sources. |
| Revels of Blood | IV | Siege Project | - | - | At the start of the battle, attacking units gain 10 Morale and defending units are inflicted with 2 Bleeding for 3 Turns |

#### Tome of Fertility  

- **Tier:** II | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_fertility`
- **Theme:** Thrive on the bountiful spoils of nature. Provide your empire with ample Food and heal your units in battle.
- **Lore attribution:** Julia of House Inioch, Druid Queen of the High Elves
- **Unlocked on selection (Special Province Improvement) — Farm Bountiful Fields** (100 Gold 250 Production): • +10 Food income. • Per adjacent Province with Grasslands or Fungal Fields: • +3 Food. • +3 Mana. • Counts as a Farm. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Restore the Land | III | Terraforming Spell | 45 Mana / 45 WCP | - | Target and adjacent friendly or unowned Provinces: • Gains Grassland if it is on the Surface or Fungus Fields and Mushroom Forest if it is in the Underground. • Loses Chasm, Swamp, Snow, Ice, Ashlands, Sand, Cavern Floor, Stalagmites, and Gloom. |
| Staves of Life | III | Unit Enchantment | 90 Mana / 90 WCP | - | Makes Attack or Support abilities of enchanted units: • Heal a random friendly unit within 3 hexes of it for 15 Temporary Hit Point. Applies to: Support Unit. |
| Temple of Fertility | III | City Structure | 100 Gold 250 Production | - | • +10 Food income • +3 Food income per Population: • +2 Draft income per Population: |
| Blossom of Life | IV | Buff Spell | 45 Mana / 30 CCP | - | Friendly units in a 2-hex radius gain 3 Regeneration. |
| Summon Nymph | IV | Summon Spell | 150 Mana / 150 WCP | - | Summons a Nymph onto the target world hex. Summons: Nymph (Tier III Support, HP 80, Def 2, Res 4) |

#### Tome of Glades  

- **Tier:** II | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_glades`
- **Theme:** Create and protect forests. Specialize in healing and making use of forests.
- **Lore attribution:** Birchfoot, Hermit of the Glade
- **Unlocked on selection (Special Province Improvement) — Farm Sacred Meadow** (100 Gold 250 Production): • +10 Food. • +5 City Stability per adjacent Conduit. • Grants Encouraged at start of next Combat to friendly Units on this hex, 5 Turn cooldown. • Counts as a Farm. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Animate Flora | II | Combat Summon Spell | 15 Mana / 20 CCP | - | Target Flora Obstacle transforms into a Floral Stinger unit under your control. This summon lasts for 3 Turns. Summons: Floral Stinger (Tier II Skirmisher, HP 80, Def 2, Res 0) |
| Create Forest | III | Terraforming Spell | 45 Mana / 45 WCP | - | Target and adjacent Provinces: • Gain Forest on the Surface • Gain Mushroom Forest in the Underground. |
| Glade Runner | III | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Glade Runner** (Tier III Ranged; 220 Draft 140 Gold; upkeep 20 Gold; HP 85, Def 2, Res 2, Status res 3, MP 40) — Abilities: Shoot Bow, Tracker's Mark, Defense Mode. Passives: Truesight. Ranged Unit that marks and weakens enemies. |
| Leafskin | III | Minor Race Transformation | 250 Mana / 250 WCP | - | Makes the target race one with the forest, granting them: • Forest Walk • Forest Camouflage • When in a province with Forest or Mushroom Forest: • +10% Evasion • +10% Accuracy • +10% Critical Hit Chance |
| Aspect of the Root | IV | Unit Enchantment | 90 Mana / 90 WCP | - | Grants enchanted units: • The Aspect of the Root ability, which allows units to heal themselves in battle. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Magic Fighter Unit. |
| Summon Entwined Protector | IV | Summon Spell | 150 Mana / 150 WCP | - | Summons an Entwined Protector, a Shield Unit with healing abilities. Summons: Entwined Protector (Tier III Shield, HP 100, Def 7, Res 3) |

#### Tome of Artificing  

- **Tier:** II | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_artificing`
- **Theme:** Specialize in siegecraft, expertly crafted weapons, and Golems.
- **Lore attribution:** Edward Portsmith, Last Dreadnought of the Commonwealth
- **Unlocked on selection (Special Province Improvement) — Golem Mine** (100 Gold 250 Production): • +10 Gold. • +5 Production per adjacent Quarry. • Spawns an Iron Golem on the owner's side for Combat in this Domain. • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Artisan Armaments | III | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • +25% Critical Hit Chance. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit. |
| Construct Bolt Repeaters | III | Siege Project | - | - | At the start of the battle, gain 2 Bolt Repeater units on the attacker's side until the end of battle. • Bolt Repeaters are immobile Siegecraft Units with long range area of effect attacks that are repeating, unlike Onagers. • Only one type of Siegecraft unit can be brought into Combat. |
| Iron Golem | III | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Iron Golem** (Tier III Shield; 220 Draft 140 Gold; upkeep 20 Gold; HP 100, Def 7, Res 2, Status res 3, MP 40) — Abilities: Melee Strike, Defense Mode: Protective Wall. Passives: Control Loss Immunity, Heartless, Reinforced, Shield Defense, Siege Breaker. Highly defensive Shield Unit that is resistant to Negative Status Effects and protects allies from them. |
| Artisan Fortification | IV | City Structure | 170 Gold 450 Production | - | A Tower Structure that grants the city Bolt Repeater Towers during siege combat. |
| Siege Magic | IV | Unit Enchantment | 90 Mana / 90 WCP | - | Grants enchanted units: • +10% damage • Siege Breaker, dealing extra fortification damage during a siege. • Demolisher, making them able to destroy reinforced obstacles. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |

#### Tome of Winds  

- **Tier:** II | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_winds`
- **Theme:** Harness the powers of the wind to gain boosts of speed and disrupt enemies.
- **Lore attribution:** Tempest, Master of Storms
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Abducting Cyclone | III | Debuff Spell | 15 Mana / 20 CCP | - | Pulls the closest enemy within 3 hexes to target empty hex. They have a base 90% chance of becoming Stunned for 1 Turn. |
| Dust Storm | III | Damage/Debuff Spell | 15 Mana / 20 CCP | - | Enemy units in a 2-hex radius: • Sustain 10 Physical Damage. • Have a base 90% chance of becoming Blind for 1 Turn. |
| Favorable Winds | III | Friendly Army Spell | 80 Mana / 80 WCP | - | Target friendly army regains all their Movement points if they are on water. Half if they are on land. A unit cannot benefit from this spell more than once per turn. |
| Seeker Arrows | III | Unit Enchantment | 80 Mana / 80 WCP | - | Grants Missile attacks of enchanted units: • +1 Range. Applies to: Ranged Unit, Skirmisher Unit. |
| Summon Wind Rager | IV | Summon Spell | 100 Mana / 100 WCP | - | Summon a Wind Rager, a fast and disruptive Magic Fighter Unit Summons: Wind Rager (Tier II Magic Fighter, HP 65, Def 2, Res 2) |
| Zephyr Archer | IV | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Zephyr Archer** (Tier III Ranged; 220 Draft 140 Gold; upkeep 20 Gold; HP 85, Def 2, Res 2, Status res 3, MP 40) — Abilities: Shoot Bow, Zephyr Shot, Defense Mode. Passives: -. A Ranged Unit with extra range and an area of effect ability. |

#### Tome of the Dungeon Depths  

- **Tier:** II | **Affinity granted:** +2 Materium | **DLC:** Giant Kings | id `tome_of_the_dungeon_depths`
- **Theme:** Build a grand Dungeon Underground, fill it with structures that will enrich you, and protect it with eternal clay soldiers and traps.
- **Lore attribution:** Thrudgelmir, Giant King of Myrrida
- **Unlocked on selection (Special Province Improvement) — Dungeoneering Conclave** (100 Gold 250 Production): • +5 Knowledge • Every Turn, a Province in the Domain of a City: • Gains Dungeon. • Gain +2 Production per adjacent Dungeon Province. • Counts as a Research Post. Requirement: Must be built on an annexed Underground Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Mine Underground Vault | III | Special Province Improvement | 100 Gold 250 Production | - | • +10 Gold • +3 Gold per adjacent Dungeon Province. • +1 Binding Essence per adjacent Dungeon Province • Counts as a Mine Requirement: Must be built on an annexed Underground Province. Requires City Tier II. |
| Quarry Clay Forge | III | Special Province Improvement | 100 Gold 250 Production | - | • +5 Production per adjacent Dungeon Province. • +5 Draft per adjacent Dungeon Province. • Allows the drafting of the Clay Arbalest, Clay Charger, and Clay Defender units. • Counts as a Quarry. Requirement: Must be built on an annexed Underground Province. Requires City Tier II. |
| Quarry Silent Barracks | III | Special Province Improvement | 100 Gold 250 Production | - | • +1 Fortification Health per adjacent Dungeon Province. • +3 City Stability per adjacent Dungeon Province. • A Clay Arbalest, Clay Charger, or a Clay Defender joins combat on your side when fighting in this city's domain (does not function in water or lava). • Counts as a Quarry. Requirement: Must be built on an annexed Underground Province. Requires City Tier II. |
| Dungeon Hazard | III | Enemy Army Spell | 80 Mana / 80 WCP | - | Target enemy army: • Sustains 15 Physical Damage, doubled if cast on a Dungeon Province. • For 1 World Map Turn, at the start of combat units in this army become Slowed for 3 Turn. |
| Raiders of the Deep | III | Unit Enchantment | 90 Mana / 90 WCP | - | Enchanted units gain: • Cave Walk • While in the Underground: • +1 Defense • +1 Resistance • While above ground: • Deal +10% damage Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Tome of Scrying  

- **Tier:** II | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_scrying`
- **Theme:** Keep an eye on your enemies and let nothing pass you by. Specialize in gaining more vision and Truesight and inflicting Marked.
- **Lore attribution:** Werlac of Insaldur, Shadowborn Cultist
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Mental Mark | III | Debuff Spell | 15 Mana / 20 CCP | - | Target Enemies in a 1-hex radius gain: • 2 Marked. • 3 Sundered Resistance. |
| Scry Enemy | III | Enemy Army Spell | 30 Mana / 30 WCP | - | All enemies in the target army provide you with vision for 10 Turns. |
| Summon Watcher | III | Summon Spell | 150 Mana / 150 WCP | - | Summons a Watcher, a Battle Mage Unit with increased vision capabilities. Summons: Watcher (Tier III Battle Mage, HP 75, Def 1, Res 3) |
| Guided Projectiles | IV | Unit Enchantment | 90 Mana / 90 WCP | - | Makes base attacks of enchanted units: • Fire 1 hex further without Long Range Accuracy penalties. • Ignore Accuracy penalties from the Obscuring condition caused by units that are in the way and certain terrain. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit. |
| Tower of True Sight | IV | City Structure | 100 Gold 250 Production | - | • +10 City Stability • +10 Knowledge • +6 Vision Range • True Sight making it possible to spot camouflaged enemies near the city. |

#### Tome of Summoning  

- **Tier:** II | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_summoning`
- **Theme:** Call forth, control, and enhance Magic Origin units.
- **Lore attribution:** Werlac of Insaldur, Shadowborn Cultist
- **Unlocked on selection (Special Province Improvement) — Conduit Summoning Well** (100 Gold 250 Production): • +10 Mana. • +2 Mana and +2 Knowledge per adjacent Conduit or Research Post. • Combat Summon Spells in the domain cost -50% less mana. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Arcane Bond | III | Debuff Spell | 45 Mana / 30 CCP | - | Target enemy Magic Origin unit has a base 90% chance of becoming Dominated for 2 Turns. If unsuccessful, deals 30 Lightning Damage instead. |
| Arcane Restoration | III | Healing Spell | 30 Mana / 25 CCP | - | Heals all friendly Magic Origin units +25 Temporary Hit Points. |
| Arcane Supercharge | III | Buff Spell | 80 Mana / 35 CCP | - | For 3 Turns, target friendly Magic Origin unit gains: • 5 Strengthened • 3 Bolstered Defense • 3 Bolstered Resistance • Static Charge |
| Conjure Astral Keeper | IV | Combat Summon Spell | 20 Mana / 25 CCP | - | Summons an Astral Keeper, a Support Unit that heals units even in death. This summon lasts for 3 Turns. Summons: Astral Keeper (Tier II Support, HP 70, Def 1, Res 3) |
| Summon Astral Serpent | IV | Summon Spell | 150 Mana / 150 WCP | - | Summons an Astral Serpent, a Magic Fighter Unit that can teleport into the front lines in an explosive manner. Summons: Astral Serpent (Tier III Magic Fighter, HP 80, Def 2, Res 4) |

#### Tome of Souls  

- **Tier:** II | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_souls`
- **Theme:** Create advanced Undead creatures and gain ways to collect more Souls. Specialize in buffs and healing for Undead units.
- **Lore attribution:** Nocrom, the Cursed Hand
- **Tome passive — Soul Harvest:** Gain Souls when enemies die in battle. Unlocks the ability to animate City Ruin and to animate Heroes in your crypt as your undead servants.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Soulbinders | II | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • Base 90% chance of inflicting Soulbound on attacks, increasing the Soul gain when the target is killed. • +10% damage against units with Soulbound. Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Feast of Souls | III | Friendly Army Spell | 20 Souls / 25 WCP | - | Target friendly army: • Heal non-Undead units for 20 Hit Points. • Heal Undead units for 40 Hit Points. |
| Soul Overflow | III | Buff Spell | 15 Souls / 20 CCP | - | Friendly units in a 1-hex radius: • Gain 1 Strengthened. • Gain +20 maximum Hit Points until the end of battle. • Have 2 Negative Status Effects removed. |
| Bone Horror Reanimation | IV | Empire Bonus | - | - | When killing non-racial Tier I-III units, gain the option to spend Souls to create a Bone Horror after combat. One Bone Horror can be created for every 4 tiers worth of units killed. |
| Summon Banshee | IV | Summon Spell | 45 Souls / 90 WCP | - | Summons a Banshee, a vengeful spirit that lowers morale and weakens enemies with its piercing wails. Summons: Banshee (Tier III Battle Mage, HP 90, Def 2, Res 4) |

#### Tome of the Doomherald  

- **Tier:** II | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_the_doomherald`
- **Theme:** Torment your enemies with a Morale-reducing effect and by exploiting enemies with Low Morale.
- **Lore attribution:** Arachna Aranea, Spider Queen
- **Unlocked on selection (Special Province Improvement) — Conduit Doomdepth Trench** (100 Gold 250 Production): • -5 City Stability. • +10 Mana. • +10 Knowledge. • +3 Mana and Knowledge for each Alignment level below Neutral. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Cause Despair | III | Debuff Spell | 30 Mana / 25 CCP | - | Enemies in a 1-hex radius have a base 90% chance of losing -15 Morale. |
| Prelude of Doom | III | Enemy Army Spell | 80 Mana / 80 WCP | - | Target enemy army gains 3 Demoralized for 1 Turn. |
| Summon Corrupt Soul | III | Summon Spell | 150 Mana / 150 WCP | - | Summons a Corrupt Soul, a Magic Fighter Unit that exploits low enemy unit Morale. Summons: Corrupt Soul (Tier III Magic Fighter, HP 90, Def 3, Res 3) |
| Cruel Weaponry | IV | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • +30% damage against units with Morale of "Low" or worse. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Joy Siphoners | IV | Minor Race Transformation | 250 Mana / 250 WCP | - | Target race becomes a living morale siphon, gaining: • +4 Morale when attacking an enemy. • Demoralizer Effects are increased for Single Shot attacks. |

#### Tome of the Sand Stalkers  

- **Tier:** II | **Affinity granted:** +1 Materium, +1 Nature | **DLC:** Rise from Ruin | id `tome_of_the_sand_stalkers`
- **Theme:** Spread deserts, stalk and blind your enemies, and summon a Guardian of the Desert to protect you.
- **Lore attribution:** Har'Acran, Queen of the Dunes
- **Tome passive — Sand Preference:** Provinces with Sand give +2 City Stability.
- **Tome passive — Desert Farming:** Able to build Farms on Sand terrain. Farms on Sand terrain gain +5 Food if your race has Desert Adaptation.
- **Unlocked on selection (Special Province Improvement) — Mine Grand Bazaar** (100 Gold 250 Production): • +7 Gold income. • Per adjacent Province with Sand: • +2 Gold. • +3 Food. • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Desertification | III | Terraforming Spell | 45 Mana / 45 WCP | - | Target and adjacent surface Provinces: • Gain Sand. • Lose Chasm, Swamp, Snow, Ice, Ashlands, and Gloom. |
| Dunestalkers | III | Minor Race Transformation | 250 Mana / 250 WCP | - | Target race becomes one with the desert, granting them: • Sand Walk • Sand Camouflage • When on Sand terrain gain: • Fast Movement • +20% Flanking damage |
| Sandstorm | III | Debuff Spell | 20 Mana / 25 CCP | - | Conjure a Sandstorm in a 2-hex radius that lasts for 3 Turns. |
| Scorpion Venom Weapons | III | Unit Enchantment | 90 Mana / 90 WCP | - | Attacks of enchanted units gain: • A base 60% chance of inflicting Weakened for 3 Turns. • A base 60% chance of inflicting Poisoned for 3 Turns. • +2 Blight Damage when flanking. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Summon Sand Scorpion | IV | Summon Spell | 150 Mana / 150 WCP | - | Summon a Sand Scorpion, a Shield Unit unit with a debilitating poison. Summons: Sand Scorpion (Tier III Shield, HP 100, Def 7, Res 2) |

#### Tome of the Construct  

- **Tier:** II | **Affinity granted:** +1 Materium, +1 Order | **DLC:** Empires & Ashes | id `tome_of_the_construct`
- **Theme:** Master legions of constructs, fighting in uncannily synchronized formations, commanding them perfectly and crushing your foes beneath the march of their boots.
- **Lore attribution:** Alikana Krom, War Puppeteer
- **Unlocked on selection (Special Province Improvement) — Quarry Worker Construct Nexus** (100 Gold 250 Production): • +10 Production. • +3 Food per adjacent Farm. • +3 Production per adjacent Quarry or Forester. • +3 Mana per adjacent Conduit. • +3 Knowledge per adjacent Research Post. • +3 Gold per adjacent Mine. • Counts as a Quarry. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Cascading Command: Defend | III | Buff Spell | 30 Mana / 25 CCP | - | Target friendly Construct or Linked Minds unit: • Gains Defensive Masters for 1 Turn. • Has 2 Negative Status Effects dispelled. • This effect then applies to adjacent friendly Construct or Linked Mind units and is repeated. |
| Cascading Command: Reposition | III | Buff Spell | 30 Mana / 25 CCP | - | Target friendly Construct or Linked Minds unit gains: • Hastened • Strengthened • This effect then cascades to adjacent friendly Construct or Linked Mind units and is repeated. |
| Bronze Golem | IV | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Bronze Golem** (Tier III Polearm; 220 Draft 140 Gold; upkeep 20 Gold; HP 100, Def 5, Res 2, Status res 3, MP 40) — Abilities: Melee Strike, Weakening Cleave, Defense Mode. Passives: Charge Resistance, Control Loss Immunity, First Strike, Heartless, Reinforced. A Polearm Unit capable of inflicting Weakened. |
| Compounding Defense | IV | Unit Enchantment | 100 Mana / 100 WCP | - | When adjacent to another unit with Compounding Defense this unit gains: • +1 Defense • +1 Resistance Applies to: Shield Unit, Polearm Unit, Fighter Unit, Magic Fighter Unit. |
| Linked Minds | IV | Minor Race Transformation | 250 Mana / 250 WCP | - | Units of this race gain the ability to share senses, granting them: • Hyper-Awareness when standing next to a Construct or another unit with Linked Minds. |

#### Tome of Shades  

- **Tier:** II | **Affinity granted:** +1 Materium, +1 Shadow | **DLC:** Ways of War | id `tome_of_shades`
- **Theme:** Strike from the shadows, blind your foes and find their weak points to deliver the perfect, fatal blow.
- **Lore attribution:** Nocturne, Greyblood Assassin
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Shade | IV | Unit | 220 Draft 140 Gold | upkeep 20 Gold | **Shade** (Tier III Skirmisher; 220 Draft 140 Gold; upkeep 20 Gold; HP 95, Def 4, Res 2, Status res 3, MP 40) — Abilities: Fatal Strike, Throw Shadow Dagger, Defense Mode. Passives: Shadowed Escape, Slippery, Swift. Stealthy Skirmisher Unit that specializes in finishing off weakened enemies. |
| Shadow Weapons | IV | Unit Enchantment | 100 Mana / 100 WCP | - | Attacks of enchanted units: • Deal +3 Frost Damage when Flanking or attacking Blind units. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Living Shadows | V | Minor Race Transformation | 250 Mana / 250 WCP | - | Wreathes target race in swirling shadows, granting them: • +10% Evasion. • Fleeting. • When this unit's Hit Points drop below 60%: • It becomes Obscured for 1 Turn. • Adjacent enemies have a base 90% chance of becoming Blind for 1 Turn. |
| Rending Shadows | V | Damage/Debuff Spell | 30 Mana / 25 CCP | - | Enemy units in a 1-hex radius: • Sustain 16 Physical Damage. • Have a base 90% chance of becoming Blind for 1 Turn. • Have a base 90% chance of gaining Sundered Defense for 3 Turn. |
| Shade Network | V | City Structure | 100 Gold 250 Production | - | • +10 Knowledge income. • +10 Knowledge for each non-owned city that shares a border with this City. |

#### Tome of Fey Mists  

- **Tier:** II | **Affinity granted:** +1 Nature, +1 Astral | **DLC:** Primal Fury | id `tome_of_fey_mists`
- **Theme:** Conjure otherworldly mists to protect and strengthen your units.
- **Lore attribution:** Zaethyl, Wild Guardian of the First Elves
- **Unlocked on selection (Special Province Improvement) — Conduit Feywater Pond** (100 Gold 250 Production): • Provinces in this city's domain become Misty. • +3 Mana per adjacent Forester. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier II: requires 2 tomes already unlocked; no affinity requirement.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Summon Mistling | III | Summon Spell | 150 Mana / 150 WCP | - | Summons a Mistling, a Magic Fighter Unit with attacks that inflict random Negative Status Effects. Summons: Mistling (Tier III Magic Fighter, HP 90, Def 3, Res 3) |
| Fey Embrace | IV | Buff Spell | 15 Mana / 20 CCP | - | In a 1-hex radius: • Place Mist clouds. • Friendly units gain 2 random Positive Status Effects. |
| Feytouched | IV | Minor Race Transformation | 250 Mana / 250 WCP | - | Makes the target race connect with Fey powers, granting them: • Fey Guile • The ability to ignore: • Vision penalties from Misty. • Accuracy penalties from Clinging Mist. |
| Lingering Mists | IV | World Spell | 60 Mana / 60 WCP | - | Target province becomes Misty for 3 Turns. |
| Staves of Mist | IV | Unit Enchantment | 80 Mana / 80 WCP | - | Grants enchanted units: • The Fey Blessing ability. Applies to: Support Unit. |

### 1.5 Tier III tomes — full contents

#### Tome of Sanctuary  

- **Tier:** III | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_sanctuary`
- **Theme:** Create a safe haven for all believers. Specialize in healing and buffing defenses.
- **Lore attribution:** Anon, Archon Wizard of Life
- **Unlocked on selection (Special Province Improvement) — Conduit Sanctuary** (170 Gold 450 Production): • +15 Mana. • Pillaging Province Improvements in this domain takes +2 and yields -30% resources. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Anointed People | V | Minor Race Transformation | 450 Mana / 450 WCP | - | Gives the target race divine protection, granting them: • +3 Status Resistance • +3 Spirit Protection |
| Consecrated Domain | V | Sustained City Spell | 80 Mana / 80 WCP | 8 Mana | Target friendly City, friendly units in the Domain gain: • +2 Resistance. • +20 Morale at the start of battle. |
| Healing Spires | V | City Structure | 85 Gold 200 Production | - | Tower Structure • Adds 4 Healing Spires in Combat during a Siege. • Friendly units in the domain heal +12 Hit Points per Turn. • +10 City Stability |
| Keeper's Mark | V | Unit Enchantment | 100 Mana / 100 WCP | - | Enchanted units: • Gain Faithful, reducing Unit Upkeep. • When taking fatal damage for the first time, this unit gains: • Steadfast for 1 Turn. • Pacified for 1 Turn. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Summon Light Spirit | V | Summon Spell | 150 Mana / 150 WCP | - | Summon a Light Spirit, a Support Unit with strong healing capabilities. Summons: Light Spirit (Tier III Support, HP 80, Def 2, Res 4) |
| Salvation | VI | Healing/Buff Spell | 80 Mana / 35 CCP | - | Target friendly unit: • Heals all of its Hit Points as Temporary Hit Points. • Dispels its Negative Status Effects. • Gains 3 Bolstered Resistance. |

#### Tome of Subjugation  

- **Tier:** III | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_subjugation`
- **Theme:** Expands and subjugates cities from other races. Specializes in lowering enemy Morale and conquering cities.
- **Lore attribution:** Turiel, Exalted Warden of Grexolis
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Final Ultimatum | V | Debuff Spell | 45 Mana / 30 CCP | - | Target Routing non-Hero enemy unit: • Has a base 90% chance of becoming permanently mind controlled. • If successful, it gains +60 Morale. • If resisted, the unit dies instead. |
| Subjugating Raid | V | Siege Project | - | - | • When the walls are breached, the besieged City loses -2 Population. • Closest owned City gains +2 Population. • At the start of the battle, all enemy units have -10 Morale until the end of battle. |
| Subjugator | V | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Subjugator** (Tier IV Shock; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 120, Def 5, Res 3, Status res 7, MP 40) — Abilities: Demoralizing Charge Strike, Oppress, Defense Mode. Passives: Armor of Despair, Unyielding. A heavy Shock Unit that specializes in lowering Morale. |
| Baron's Palace | VI | City Structure | 100 Gold 250 Production | - | This city gains: • +10 City Stability • +20 Draft Your Throne City gains: • +20 Gold • +20 Food • +5 Imperium Can only be built in cities of another race. |
| Intimidating Aura | VI | Unit Enchantment | 70 Mana / 70 WCP | - | Grants enchanted units: • Intimidating Aura, which reduces Morale of nearby enemies. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Tome of Devastation  

- **Tier:** III | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_devastation`
- **Theme:** Gain the means to take cities with overwhelming force. Specialize in Sieges and dealing damage.
- **Lore attribution:** Asgera Spinesplitter, War Queen of the Bloodfang Orcs
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Construct Devastator Spheres | V | Siege Project | - | - | • At the start of battle, the attacker gains 2 Devastator Sphere until the end of battle. • Devastator Spheres are Siegecraft Units that can detonate themselves into target obstacles or Unit to deal massive damage and destroy obstacles. • Only one type of Siegecraft unit can be brought into Combat. |
| Flame Volley | V | Damage/Debuff Spell | 80 Mana / 35 CCP | - | In a 1-hex radius: • Enemy units sustain 16 Physical Damage and 16 Fire Damage. • Enemy units gain 2 Burning for 3 Turns. • Hexes are set On Fire. |
| Monstrous Rebirth | V | Buff Spell | 45 Mana / 30 CCP | - | Target friendly Tier I, II, or III non-Magic Origin, non-Construct unit: • Transforms into a Warbreed. • Heals 60 Temporary Hit Points. • Dies at the end of combat. Cannot be used in Water Combat. |
| Flameburst Weapons | VI | Unit Enchantment | 160 Mana / 160 WCP | - | Grants enchanted units: • +20% Critical Hit Chance. • Killing a unit causes it to explode, adjacent enemies: • Sustain 15 Fire Damage. • Gain 2 Burning for 3 Turns. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Focus of Devastation | VI | Unit Enchantment | 160 Mana / 160 WCP | - | Grants attacks of enchanted units: • Demolisher, which allows them to destroy Fortified obstacles. • A base 60% chance of canceling Defense Modes. Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Warbreed | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Warbreed** (Tier IV Shock; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 130, Def 5, Res 2, Status res 7, MP 40) — Abilities: Charge Strike, Power Cleave, Defense Mode. Passives: Demolisher, Natural Regeneration, Siege Breaker. Monstrous Shock Unit that is used as a living siege weapon. |

#### Tome of Pandemonium  

- **Tier:** III | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_pandemonium`
- **Theme:** Thrive in the chaos of battle and specialize in inflicting random Negative Status Effects on your enemies and dealing more damage to enemies that are already inflicted.
- **Lore attribution:** Karissa the Red, Mistress of Passions
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Havoc Magic | V | Unit Enchantment | 120 Mana / 120 WCP | - | Grants base Magic attacks of enchanted units: • Base 60% chance of inflicting a random Negative Status Effect. Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Mass Hysteria | V | Debuff Spell | 45 Mana / 30 CCP | - | Inflicts a random Negative Status Effect on all units in a 1-hex radius. |
| Summon Chaos Eater | V | Summon Spell | 200 Mana / 200 WCP | - | Summons a Chaos Eater, a close-range Battle Mage Unit that thrives on eating Negative Status Effects. Summons: Chaos Eater (Tier IV Battle Mage, HP 110, Def 3, Res 5) |
| Infectious Insanity | VI | Debuff Spell | 100 Mana / 40 CCP | - | Target Unit has: • 90% chance of being inflicted with Infectious Insanity for 2 Turns. • If resisted, the target is inflicted with Insanity for 1 Turn. |
| Vessels of Chaos | VI | Minor Race Transformation | 350 Mana / 350 WCP | - | Turns the target race into a conduit for chaotic energies, granting them: • +10% damage for each of the target's Negative Status Effects. Stacks up to 3 times. |

#### Tome of the Warlord  

- **Tier:** III | **Affinity granted:** +2 Chaos | **DLC:** Rise from Ruin | id `tome_of_the_warlord`
- **Theme:** Conquer the world with powerful warriors and infernal allies.
- **Lore attribution:** Ralinstone Pedant, Chronicler
- **Unlocked on selection (Special Province Improvement) — Mine War Forge** (100 Gold 250 Production): • +20 Draft income. • Per available Ore type Magic Material available to your empire gain: • +5 Gold. • +10 Draft • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Conqueror's Edict | V | Siege Project | - | - | • At the start of combat random hexes are set On Fire. • During battle all friendly units gain +15% Critical Hit chance. • If victorious, Razing and Migrating this city requires 1 fewer Turns. |
| Gladiatorial Pit | V | City Structure | 170 Gold 450 Production | - | • +20 Draft • +10 Gold • +10 City Stability |
| Might of the Battlefield | V | Buff Spell | 45 Mana / 30 CCP | - | All friendly units in a 2-hex radius gain: • Infernal Might for 3 Turns. • 15 Morale. Doubled for Tier I, Tier II, and Tier III units. |
| Relentless Might | V | Unit Enchantment | 100 Mana / 100 WCP | - | Enchanted units gain: • +1 Retaliation Attack. • Infernal Might when it attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Summon War Golem | V | Summon Spell | 150 Mana / 150 WCP | - | Summon a War Golem, an infernal siege weapon that specializes in destroying enemy fortifications. Summons: War Golem (Tier III Magic Fighter, HP 90, Def 4, Res 3) |
| Warlord | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Warlord** (Tier IV Mythic; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 140, Def 5, Res 6, Status res 7, MP 40) — Abilities: Charge Strike, Command: Attack, Command: Defend, Command: Retreat, Defense Mode: Hold your Ground. Passives: Charge Resistance, Command Momentum, Control Loss Immunity, Field Tactics, First Strike. A powerful Mythic Unit, a master of melee combat that commands others in combat. |

#### Tome of Cycles  

- **Tier:** III | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_cycles`
- **Theme:** Master the natural cycles of life and death and specialize in debuffing enemies and healing allies.
- **Lore attribution:** Serena, Elven Wizard of Life
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Diffuse Health | V | Damage/Healing Spell | 45 Mana / 30 CCP | - | Target enemy unit: • Sustains 30 Blight Damage. • Gains 2 Decaying. Friendly units in a 2-hex range. • Heal +15 Temporary Hit Points. • Gain 2 Regeneration. |
| Parting Gifts | V | Combat Enchantment | 80 Mana / 35 CCP | - | Until the end of battle, whenever a friendly unit dies, all other friendly units within 2 hexes heal +15 Temporary Hit Points. |
| Blades of Decay | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Makes attacks of enchanted units: • Inflict Decaying, a damage-over-time effect that decreases healing received. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Blooming Imbuement | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Makes attacks of enchanted units: • Gain a base 60% chance of inflicting Life Seed for 3 Turns. • Deal +20% damage against Decaying units. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Cycle of Seasons | VI | Sustained City Spell | 120 Mana / 120 WCP | 12 Mana | All battles that take place in target city's domain gain Cycle of Seasons, granting a different effect each battle turn in the following order: • Winter: All enemies sustain 10 Frost. • Spring: All friendly units become 1 Strengthened. • Summer: All friendly units heal +10 Temporary Hit Points. • Autumn: All enemies become 1 Weakened. |
| Druid of the Cycle | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Druid of the Cycle** (Tier IV Support; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 100, Def 3, Res 5, Status res 9, MP 40) — Abilities: Decaying Blast, Restart the Cycle, Cycle's End, Sacrificial Blight, Defense Mode: Warding. Passives: Life From Death. Support Unit that manipulates life and death as part of the natural cycle. |

#### Tome of Vigor  

- **Tier:** III | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_vigor`
- **Theme:** Strengthen your units and armies with the brute power of wild beasts. Specialize in buffing Animals and increasing Hit Points.
- **Lore attribution:** Zaethyl, Wild Guardian of the First Elves
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Call Greater Animal | V | Summon Spell | 150 Mana / 150 WCP | - | • Choose a Tier III or Tier IV Animal unit to add to your army. • The available Animals depend on the type of terrain the spell is cast on. Summons: Ice Spider Matriarch (Tier IV Magic Fighter, HP 110, Def 4, Res 4); White Wolf (Tier IV Fighter, HP 120, Def 5, Res 3); Thunderbird (Tier III Battle Mage, HP 75, Def 1, Res 3); Goretusk Matriarch (Tier III Shock, HP 110, Def 4, Res 1); Frost Wyvern (Tier III Magic Fighter, HP 90, Def 3, Res 3); Dire Bear (Tier IV Fighter, HP 130, Def 5, Res 2); Mammoth (Tier III Shock, HP 110, Def 4, Res 1); Sabertooth (Tier III Fighter, HP 95, Def 3, Res 2); Slither (Tier III Skirmisher, HP 95, Def 4, Res 2); Gold Wyvern (Tier III Magic Fighter, HP 90, Def 3, Res 3); Hunter Spider Matriarch (Tier IV Fighter, HP 125, Def 4, Res 2); Dread Spider Matriarch (Tier III Fighter, HP 90, Def 3, Res 1); Spirit Wolf (Tier III Magic Fighter, HP 90, Def 3, Res 3); Unicorn (Tier III Shock, HP 90, Def 3, Res 3); Pestilence Crocodile (Tier III Fighter, HP 90, Def 3, Res 2); Death Beetle (Tier III Fighter, HP 90, Def 5, Res 2); Weaver Spider Matriarch (Tier IV Ranged, HP 105, Def 3, Res 3); Obsidian Wyvern (Tier III Magic Fighter, HP 90, Def 3, Res 3); Caustic Worm (Tier III Shock, HP 100, Def 4, Res 2); Vampire Spider Matriarch (Tier III Fighter, HP 90, Def 3, Res 1); Nightmare (Tier III Shock, HP 90, Def 4, Res 2); Phoenix (Tier IV Magic Fighter, HP 110, Def 4, Res 4); Fire Wyvern (Tier III Magic Fighter, HP 90, Def 3, Res 3); Infernal Juggernaut (Tier IV Shock, HP 130, Def 5, Res 3); Inferno Hound (Tier III Magic Fighter, HP 90, Def 3, Res 3); Sand Scorpion (Tier III Shield, HP 100, Def 7, Res 2); Sand Worm (Tier IV Shock, HP 130, Def 5, Res 3); Deep-Sea Nimu (Tier III Support, HP 80, Def 2, Res 4); Kraken (Tier IV Mythic, HP 140, Def 6, Res 6); Fractured Worm (Tier IV Shock, HP 120, Def 5, Res 5); Fractured Scorpion (Tier III Shield, HP 90, Def 7, Res 4); Fractured Unicorn (Tier III Shock, HP 100, Def 3, Res 3) |
| Totem of the Wild | V | Combat Summon Spell | 80 Mana / 35 CCP | - | Summons a Totem of the Wild, which spawns a random Tier I or II animal unit when it's created and at the start of your next 2 Turns. Cannot be used in Water battles. Summons: Totem of the Wild (Tier III ?, HP 80, Def 4, Res 2) |
| Empowered Beasts | VI | Unit Enchantment | 100 Mana / 100 WCP | - | Makes enchanted units: • Deal +20% damage. • Gain +10 Hit Points. • Gain Demolisher, making them able to destroy reinforced obstacles. • Decreased number of units in formation. Applies to: Animal. |
| Supergrowth | VI | Minor Race Transformation | 350 Mana / 350 WCP | - | Makes the target race grow in mass and stature, granting them: • +10 Hit Points. • +1 Retaliation Attack. • Decreased number of units in formation. This transformation is incompatible with Spawnkin. |
| Unleash Beast | VI | Buff Spell | 100 Mana / 40 CCP | - | Target Animal or Cavalry unit gains, for 3 Turns: • 5 Strengthened • 5 Bolstered Defense • Berserk. |

#### Tome of Terramancy  

- **Tier:** III | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_terramancy`
- **Theme:** Manipulate the earth at will. Specialize in dealing Physical Damage and hindering enemy Movement.
- **Lore attribution:** Mother Mab, Goddess of Goblins
- **Unlocked on selection (Special Province Improvement) — Conduit Excavated Ley Line** (100 Gold 250 Production): • +5 Production. • +5 Mana. • +5 World Map Casting Points. • +4 Mana per adjacent Quarry. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Crushing Earth | V | Damage/Debuff Spell | 45 Mana / 30 CCP | - | Target enemy unit: • Sustains 50 Physical Damage. • Suffers 4 Sundered Defense for 3 Turns. • Has a base 90% chance of becoming Stunned for 1 Turn. |
| Earth Shatter | V | Terraforming Spell | 150 Mana / 150 WCP | - | In target habitable or uninhabitable Province: • Enemy Units sustain 10 Physical Damage. • The province loses any Mountain, Stalagmites, and Diggable Earth. • Summon a Stone Spirit on the target hex. Summons: Stone Spirit (Tier III Shield, HP 100, Def 6, Res 3) |
| Seismic Shock | V | Damage/Debuff Spell | 45 Mana / 30 CCP | - | Deals 30 Physical Damage to units in a 1-hex radius and inflicts Slowed. This spell deals double damage to obstacles. |
| Ley Line Focus | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Enchanted units gain: • At the start of the turn and until the unit moves this unit has: • +30% damage • +2 Resistance. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Summon Rock Giant | VI | Summon Spell | 200 Mana / 200 WCP | - | Summons a Rock Giant, a Mythic Unit that throws boulders that hinder enemies and crushes them with earthquake like smashes. Summons: Rock Giant (Tier IV Mythic, HP 150, Def 7, Res 4) |
| Tremor Ritual | VI | Siege Project | - | - | • In battle, every 2 Turns a random enemy unit is struck by an earthquake: • Enemy non-flying, non-floating units within 2-hex radius take 10 Physical Damage. • Enemy non-flying, non-floating units within 2-hex radius have 90% chance of suffering Slowed for 3 Turns. • Obstacles, including Walls, Towers, and Battlements within 2-hex radius are destroyed. |

#### Tome of Transmutation  

- **Tier:** III | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_transmutation`
- **Theme:** Change physical substances using vast amounts of mana. Specialize in debuffing enemies, buffing allies, and changing your economy.
- **Lore attribution:** Tugrum Hammerhall, Dwarven Master Artificer
- **Unlocked on selection (Special Province Improvement) — Mine Transmutation Circle** (100 Gold 250 Production): • Once built, can replicate the effects and income of a Magic Material. • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Melt Armor | V | Damage/Debuff Spell | 45 Mana / 30 CCP | - | Target enemies in a 1-hex radius: • Gain 3 Sundered Defense. • Sustain 20 Fire Damage. |
| Transmute Resources | V | Sustained City Spell | 100 Mana / 100 WCP | - | Target owned city converts their Mana income, gaining Gold, Production, and Food income equal to 75% of the Mana income. |
| Transmuter | V | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Transmuter** (Tier IV Battle Mage; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 95, Def 2, Res 4, Status res 7, MP 40) — Abilities: Molten Bolts, Transmute, Defense Mode. Passives: -. A Battle Mage Unit that turns enemies to gold and can steal their armor and grant it to friendly units. |
| Adaptive Armor | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Once per Turn, whenever enchanted units are damaged by Magic attacks or spells, they gain: • Bolstered Resistance, increasing their resistance to magical damage. • Status Protection, reducing the chance that the unit will be affected by Negative Status Effects. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Steel Skin | VI | Minor Race Transformation | 350 Mana / 350 WCP | - | Transmutes the target race's skin into steel, granting them: • +2 Physical Protection. • +2 Blight Protection • -2 Lightning Protection |

#### Tome of Amplification  

- **Tier:** III | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_amplification`
- **Theme:** Enhance your mages and your spellcasting with more advanced arcane magic.
- **Lore attribution:** Merlin the Wanderer
- **Unlocked on selection (Special Province Improvement) — Conduit Resonance Fields** (100 Gold 250 Production): • +5 Mana. • +5 World Map Casting Points. • +5 Combat Casting Points. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Amplifying Imbuement | IV | Unit Enchantment | 100 Mana / 100 WCP | - | Makes base attacks of enchanted units: • Deal +3 Lightning Damage. • Deal 3 Lightning Damage to 2 other targets within 2 hexes. • Have a base 30% chance of inflicting Sundered Resistance on each target hit for 3 Turns. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Conjure Amplification Pylon | V | Combat Summon Spell | 45 Mana / 30 CCP | - | Conjures an Amplification Pylon, a stationary structure that deals damage and increases the damage of your spells by +50%. This summon lasts for 3 Turns. Cannot be used in Water battles. Summons: Amplification Pylon (Tier III ?, HP 80, Def 2, Res 2) |
| Amplify Minds | VI | Sustained City Spell | 80 Mana / 80 WCP | 8 Mana | Target owned city gains: • +20 Knowledge income • -10 City Stability |
| Astral Blood | VI | Minor Race Transformation | 250 Mana / 250 WCP | - | Makes magic begin to flow through the veins of the target race, granting them: • Attunement: Fortune, which increases Critical Hit Chance when spells are cast. |
| Chain Lightning | VI | Damage/Debuff Spell | 45 Mana / 30 CCP | - | Target enemy unit: • Sustains 30 Lightning Damage. • Is inflicted with 2 Electrified. • This effect passes on to another enemy within 3 hexes. • Passes on up to 2 times. |

#### Tome of Teleportation  

- **Tier:** III | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_teleportation`
- **Theme:** Exploit spatial magic to its full potential. Strategically reposition your units in battle in a mere instant.
- **Lore attribution:** Laryssa Mirabilis, Sorceress of the Commonwealth
- **Unlocked on selection (Special Province Improvement) — Teleporter Chrono Gate** (170 Gold 450 Production): • +3 Mana per adjacent Conduit or Research Post. • +3 Knowledge per adjacent Conduit or Research Post. • Grants Evasion to visiting Armies until their next combat. • Functions as a Teleporter. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Emergency Teleportation | V | Healing Spell | 45 Mana / 30 CCP | - | Teleport the closest allied unit within 4 hexes to target empty hex. That unit heals +30 Temporary Hit Points and has all Negative Status Effects removed. |
| Mass Recall | V | Friendly Army Spell | 100 Mana / 100 WCP | - | Makes target friendly army teleport back to the nearest owned city. |
| Summon Phase Beast | V | Summon Spell | 200 Mana / 200 WCP | - | Summons a Phase Beast onto the target world hex. Summons: Phase Beast (Tier IV Shock, HP 120, Def 4, Res 3) |
| Astral Trade Relay | VI | City Structure | 170 Gold 450 Production | - | • +15 Gold income. • +4 Gold income for each Astral Trade Relay built in your empire. |
| Phasing Enchantment | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Grants enchanted units: • The Charged Phase ability, which allows them to teleport in battle. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |

#### Tome of Torment  

- **Tier:** III | **Affinity granted:** +2 Shadow | **DLC:** Thrones of Blood | id `tome_of_torment`
- **Theme:** Torment your enemies by turning their very actions against them and make your units empowered by pain.
- **Lore attribution:** Princess Consort Mavelith, the Grave Archdam
- **Unlocked on selection (Special Province Improvement) — Conduit Basilica of Lamentation** (100 Gold 250 Production): • +10 Mana income. • +10 Knowledge income. • +10 City Stability • +3 Mana per adjacent Farm. • +2 Knowledge per adjacent Forester. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Agonize | V | Damage/Debuff Spell | 80 Mana / 35 CCP | - | Enemy units in a 1-hex radius: • Sustain 40 Frost Damage • Have a base 90% chance of gaining 3 stacks of Torment until end of combat. On failure, inflict 1 stack of Torment instead. |
| Tormenting Imbuement | V | Unit Enchantment | 140 Mana / 140 WCP | - | Attacks of enchanted units: • Have a base 90% chance of inflicting Torment until the end of combat. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Pain Bringer | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Pain Bringer** (Tier IV Mythic; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 140, Def 5, Res 5, Status res 7, MP 40) — Abilities: Draining Strike, Tormenting Lash, Shadow Step, Defense Mode. Passives: Control Loss Immunity, Flanker, Hyper-Awareness, Vigilant. Mythic Unit that torments their enemies and can easily flank them and drain their vitality. |
| Painbound | VI | Minor Race Transformation | 350 Mana / 350 WCP | - | Target race embraces pain and when hit by an attack gain: • 2 Morale. • A random positive status effect. |
| Lens of Anguish | VII | City Structure | 100 Gold 250 Production | - | • +5 Mana. • +10 Combat Casting Points. • Damage Spells and Debuff Spells apply an extra 5 Morale loss. Can only be built in the Throne City. |

#### Tome of the Cold Dark  

- **Tier:** III | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_the_cold_dark`
- **Theme:** Spread Arctic terrain throughout the world and envelop your units with its power, so they may be empowered by its presence.
- **Lore attribution:** Artica the Cold, Queen of the Frostlings
- **Tome passive — Snow Preference:** Provinces with Snow give +2 City Stability.
- **Tome passive — Arctic Farming:** Able to build Farms on Snow terrain. Farms on Snow terrain gain +5 Food if your race has Arctic Adaptation.
- **Unlocked on selection (Special Province Improvement) — Frostspire** (170 Gold 450 Production): • +10 Knowledge. • +3 Knowledge per adjacent Snow or Ice Province. • Visiting units gain Icetouch until the end of the next battle, giving their physical attacks a base 30% chance of inflicting Frozen. • Counts as a Research Post. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Flash Freeze | V | Terraforming Spell | 100 Mana / 100 WCP | - | Target Province: • Enemy Units in the Province suffer: • 20 Frost Damage. • -5 Status Resistance for 1 World Map Turns. • The province gains Snow and Ice. • The province loses Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. |
| Summon Snow Spirit | V | Summon Spell | 150 Mana / 150 WCP | - | Summon a Snow Spirit, a Magic Fighter Unit with attacks that inflict Frozen. Summons: Snow Spirit (Tier III Magic Fighter, HP 95, Def 3, Res 4) |
| Veil of Darkness | V | Friendly Army Spell | 100 Mana / 100 WCP | - | Target that is leading an army gains Universal Camouflage for its entire army for 3 Turns. |
| Frostling Transformation | VI | Minor Race Transformation | 350 Mana / 350 WCP | - | Makes winter run through the target race's veins, granting them: • 3 Frost Protection. • Immunity to Frozen. • +10 Morale while on cold terrain. • Arctic Walk, which allows them to traverse cold terrain faster. |
| Marching Winter | VI | Terraforming Spell | 120 Mana / 120 WCP | 12 Mana | Target friendly City gains:Every Turn, 2 Provinces within or adjacent to the Domain: • Gain Snow and Ice. • Lose Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. • Provinces in the domain with Snow or Ice provide +2 Food and +2 Production income. |

#### Tome of the Great Transformation  

- **Tier:** III | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_the_great_transformation`
- **Theme:** Turn your people into the Undead and transform your empire into a paradise for them to thrive in.
- **Lore attribution:** Nekron, Master of Death
- **Tome passive — Soul Harvest:** Gain Souls when enemies die in battle. Unlocks the ability to animate City Ruin and to animate Heroes in your crypt as your undead servants.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Bone Dragon Reanimation | V | Empire Bonus | - | - | When killing non-racial Tier IV or Tier V units, gain the option to spend Souls to create a Bone Dragon after combat. |
| Desecrate Structure | V | World Spell | 80 Mana / 80 WCP | 8 Mana | Targets a resource node in your domain: • Node provides +5 Soul income. • If you lose the province, the effect stops. |
| Domain of Death | V | Sustained City Spell | 60 Souls / 50 WCP | 5 Mana | Target friendly city: • Has +20 City Stability. • Friendly Undead units in the domain deal +10% damage. • Enemy units in the domain become Soulbound. |
| Necrotic Spires | V | City Structure | 85 Gold 200 Production | - | Tower Structure • Adds 4 Necrotic Spires in Combat during a Siege. • Friendly Undead units in the domain heal +12 Hit Points per turn. |
| Fetid Legion | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Grants enchanted units: • +10 Hit Points. • Weakening Aura, which inflicts Weakened to adjacent enemies at the end of the turn. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Wightborn | VI | Major Race Transformation | 300 Mana 100 Souls / 300 WCP | - | Gives the target race immortality beyond life, granting them: • The Undead unit type. • Life Steal, which restores Temporary Hit Points upon each attack. |

#### Tome of Geomancy  

- **Tier:** III | **Affinity granted:** +1 Materium, +1 Astral | **DLC:** Giant Kings | id `tome_of_geomancy`
- **Theme:** Become attuned to the Ley energies beneath you and use them to change the damage and resistances of your armies based on where they stand.
- **Lore attribution:** Fjalla Tor-Builder, Giant Queen of the Fourth Age
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Hall of Geomantic Resonance | V | City Structure | 170 Gold 450 Production | - | City gains different resources based on the terrain features of the city core's location: • +40 Food if in Grasslands, Swamp or Fungus Fields. • +30 Production if in Forest, Mushroom Forest, Rocky or Mountains. • +20 Gold if in Ashlands. • +20 Mana if in Snow, Ice or Sand. |
| Geomancer | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Geomancer** (Tier IV Battle Mage; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 90, Def 2, Res 4, Status res 7, MP 40) — Abilities: Terra Bolts, Geo Surge, Defense Mode. Passives: Geomantic Connection. An adaptable Battle Mage Unit that shifts damage according to the terrain. |
| Geomantic Crystallization | VI | Major Race Transformation | 600 Mana / 600 WCP | - | Turn target race into resonating crystals that self infuse with environmental magics, gaining: • The Elemental unit type. • Resistance to a specific damage based on the terrain the unit is on. • +2 damage on attacks based on terrain the unit is on. Effects are increased for Single Shot attacks. |
| Resonant Weapons | VI | Unit Enchantment | 120 Mana / 120 WCP | - | Attacks of enchanted units gain: • Apply extra damage and Negative Status Effects based on the terrain. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Summon Elemental | VII | Summon Spell | 150 Mana / 150 WCP | - | Summon a Tier III Elemental unit on target hex. The Elemental summoned changes based on the terrain type. Summons: Magma Spirit (Tier III Battle Mage, HP 85, Def 1, Res 3); Snow Spirit (Tier III Magic Fighter, HP 95, Def 3, Res 4); Stone Spirit (Tier III Shield, HP 100, Def 6, Res 3); Storm Spirit (Tier III Shock, HP 95, Def 4, Res 3); Tide Spirit (Tier III Fighter, HP 110, Def 3, Res 3) |

#### Tome of the Dreadnought  

- **Tier:** III | **Affinity granted:** +1 Materium, +1 Chaos | **DLC:** Empires & Ashes | id `tome_of_the_dreadnought`
- **Theme:** Call upon the power of mighty machines and obliterate your enemies with powerful barrages.
- **Lore attribution:** Edward Portsmith, Last Dreadnought of the Commonwealth
- **Unlocked on selection (Special Province Improvement) — Quarry War Foundry** (170 Gold 450 Production): • +20 Draft. • +5 Draft per adjacent Quarry or Mine Province. • Construct Units produced in the owner city gain +2 Ranks. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Destabilized Mana Core | IV | Damage/Debuff Spell | 30 Mana / 25 CCP | - | Units in 2-hex radius are Marked. After 1 Turn the Mana Core explodes inflicting: • 24 Physical Damage • 24 Lightning Damage. • 60% base chance of receiving Disrupted. |
| Pinning Barrage | IV | Damage/Debuff Spell | 80 Mana / 35 CCP | - | Units in a 2-hex radius: • Suffer 20 Physical Damage. • Become Marked. • Have a base 60% chance of becoming Immobilized. |
| Warding Metals | IV | Unit Enchantment | 90 Mana / 90 WCP | - | Grants enchanted units: • +2 Resistance Applies to: Construct. |
| Construct Great Bombard | V | Siege Project | - | - | At the start of the battle, gain Great Bombard on the attacker's side until the end of battle. • Great Bombard is an immobile Siegecraft Unit. • Only one type of Siegecraft unit can be brought into Combat. |
| Tuning Kits | V | Unit Enchantment | 90 Mana / 90 WCP | - | Grants enchanted units: • The Overcharge ability, which can grant a Construct unit Overcharged until the end of battle. Applies to: Support Unit. |
| Ironclad | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Ironclad** (Tier IV Mythic; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 110, Def 6, Res 4, Status res 7, MP 40) — Abilities: Direct Fire, Barrage, Load Sundering Shot, Load Incendiary Shot, Load Shrapnel Shot, Defense Mode. Passives: Control Loss Immunity, Control Loss Immunity, Demolisher, Heartless, High Maintenance, Reinforced, Siege Breaker, Unstoppable Juggernaut. An armored Mythic Unit with a powerful tri-barreled cannon able to load and fire specialized shells at significant range. |

#### Tome of Dragons  

- **Tier:** III | **Affinity granted:** +1 Nature, +1 Chaos | **DLC:** Dragon Dawn | id `tome_of_dragons`
- **Theme:** Revel in the power of Dragons and let their flames empower your people.
- **Lore attribution:** Tempest, Master of Storms
- **Unlocked on selection (Special Province Improvement) — Mine Wyvern Eyrie** (170 Gold 450 Production): • +10 Gold. • +5 Gold per adjacent Farm Province. • Unlocks the production of various Wyvern Units. Alignment influences which Wyverns can be drafted. • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Dragonstrike Infusion | IV | Unit Enchantment | 100 Mana / 100 WCP | - | Grants enchanted units: • Dragonstrike. • The damage type is determined by your empire's Dominant Affinity and increases with the unit's tier. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Magic Fighter Unit. |
| Draconian Transformation | V | Major Race Transformation | 600 Mana / 600 WCP | - | Turn target race into Draconians, which grants them: • Dragon unit type. • +10 Hit Points. • Natural Regeneration, which makes the unit regain health faster. |
| Dragon Attack | V | Siege Project | - | - | • At the start of combat: • Units defending the city take 26 Fire Damage. • Units defending the city have a base 120% of suffering Burning. • Random positions are On Fire. • Most Battlement Structure obstacles are On Fire. |
| Dragon Infusion | V | Empire Bonus | - | - | Non-Racial Dragon units can be ranked up rapidly by exchanging Gold to gain Experience. |
| Purifying Flame | V | Healing Spell | 80 Mana / 35 CCP | - | Friendly units in a 1-hex radius: • Heal for 25 Temporary Hit Points. • Have their Negative Status Effects removed. |
| Call young Dragon | VI | Summon Spell | - | - | Choose a Tier III Young Dragon to add to your army: • Young Fire Dragon • Young Frost Dragon • Young Obsidian Dragon • Young Golden Dragon These units may Evolve into Adult Dragons. |

#### Tome of the Weaver  

- **Tier:** III | **Affinity granted:** +1 Nature, +1 Shadow | **DLC:** Secrets of the Archmages | id `tome_of_the_weaver`
- **Theme:** Inflict and exploit the Immobilized status effect and strike fear into your enemies.
- **Lore attribution:** Onoka, the Queen of Whispers
- **Unlocked on selection (Special Province Improvement) — Forester Spider's Nest** (170 Gold 450 Production): • +20 Food. • +5 Draft per adjacent Forester or Forest. • Unlocks various Spider units. • Counts as a Forester. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Conjure Weaver Spiders | V | Combat Summon Spell | 45 Mana / 30 CCP | - | Conjure 2 Weaver Spiders on target and adjacent hex. This summon lasts for 3 Turns. Cannot be used in Water battles. Summons: Weaver Spider (Tier II Ranged, HP 65, Def 1, Res 1) |
| Dread Hunters | V | Unit Enchantment | 120 Mana / 120 WCP | - | Enchanted units: • Gain Demoralizer • Attacks deal +20% damage against Immobilized or Frozen targets. Applies to: Animal, Spider. |
| Dreadful Bind | V | Debuff Spell | 80 Mana / 35 CCP | - | Units in a 2-hex radius: • Have a base 90% chance of becoming Immobilized for 1 Turn. • Gain 2 Remorse for 3 Turns. |
| Priest of the Weave | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Priest of the Weave** (Tier IV Support; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 100, Def 3, Res 5, Status res 9, MP 40) — Abilities: Web Blast, Webbed Transfusion, Spider Rebirth, Defense Mode: Warding. Passives: -. A Support Unit that can rebirth dead units as spiders and transfer negative effects from friendly units to enemies. |
| Spider's Embrace | VI | Major Race Transformation | 600 Mana / 600 WCP | - | Target race weaves themselves with spiders gaining: • The Spider unit type. • Fast Movement • Base attacks gain a base 30% chance of inflicting Immobilized for 1 Turn. Increased for Single Shots. Mounted units lose their mounts. Heroes lose their Mount and Leg equipment slots. |

#### Tome of Prophecies  

- **Tier:** III | **Affinity granted:** +1 Order, +1 Astral | **DLC:** Archon Prophecy | id `tome_of_prophecies`
- **Theme:** Prevent enemy attacks and foresee the downfall of your enemies.
- **Lore attribution:** Petras Celena, Fate Weaver of the Stars' Children
- **Unlocked on selection (Special Province Improvement) — Conduit Temple of the Prophet** (100 Gold 250 Production): • +15 Mana. • +5 Knowledge per adjacent Conduit. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Battle Divination | V | Combat Enchantment | 80 Mana / 35 CCP | - | When cast and for the next 2 Turns, apply effect to the battle in the following order: • All friendly units gain +25% Evasion for the turn. • All friendly units gain Precognition. • All friendly units gain +20% damage for the turn. |
| Fateful Imbuement | V | Unit Enchantment | 100 Mana / 100 WCP | - | Grants enchanted units: • +20% Critical Hit Chance. • Faithful. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Prescient Circlets | V | Unit Enchantment | 100 Mana / 100 WCP | - | Grants enchanted units: • Gain Precognition when entering Defense Mode. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Foresee Downfall | VI | Siege Project | - | - | At the start of combat: • Friendly units gain: • Precognition • +10% Critical Hit Chance for the duration of combat. • Enemy units gain: • A 10% Fumble chance for the duration of combat. |
| Oracle | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Oracle** (Tier IV Support; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 100, Def 3, Res 5, Status res 9, MP 40) — Abilities: Mystic Blast, Healing Portent, Striking Portent, Defense Mode: Warding. Passives: Scrying Eye, Truesight. A Support Unit that can foresee the future and use that knowledge to strengthen and protect other units. |

#### Tome of the Cleansing Flame  

- **Tier:** III | **Affinity granted:** +1 Order, +1 Chaos | **DLC:** Eldritch Realms | id `tome_of_the_cleansing_flame`
- **Theme:** Utilize the zeal of your troops to bathe the battlefield in cleansing flame that punishes the condemned and blesses the faithful.
- **Lore attribution:** Maliel, Archon Paladin of the Second Order
- **Unlocked on selection (Special Province Improvement) — Forester Pyreshrine** (100 Gold 250 Production): • +15 Gold. • +5 Draft per adjacent Forester. • Units produced in this city gain Faithful. • Flameherald's Consecration is added to all battles in this domain. • Counts as a Forester. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Pureflame Staves | V | Unit Enchantment | 140 Mana / 140 WCP | - | Makes base Magic attacks of enchanted units: • Gain base 60% chance of inflicting Condemned • Create Cleansing Flames on the target hex for 3 Turns Effects are increased for Single Shot attacks. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Temple of the Pyre | V | City Structure | 170 Gold 450 Production | - | Support Structure • Ignore income and stability penalties from being under Siege. • At the start of combat in this city's Domain, enemy units suffer Condemned. |
| Zealous Ignition | V | Buff/Debuff Spell | 45 Mana / 30 CCP | - | Target unit: • Gains Zeal until the end of battle. If target already has Zeal, gain 2 Strengthened for 3 Turns. • Enemy units in a 2-hex radius suffer Condemned until the end of battle. • Create Cleansing Flames on the target hexes for 3 Turns. |
| Consecrating Firestorm | VI | World Spell | 100 Mana / 100 WCP | - | In target Province: • Enemy units sustain 20 Spirit Damage. • The province gains Consecrating Firestorm for 3 Turns • If it has an enemy owned Province Improvement, it is Pillaged. |
| Flame Blessed Champions | VI | Unit Enchantment | 160 Mana / 160 WCP | - | Makes base Melee attacks of enchanted units: • Gain base 60% chance of inflicting Burning • Create Cleansing Flames on the target hex for 3 Turns Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Pyre Templar | VI | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Pyre Templar** (Tier IV Polearm; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 110, Def 5, Res 3, Status res 7, MP 40) — Abilities: Fire Cleave, Pyre Cloak, Defense Mode. Passives: Charge Resistance, First Strike, Status Effect Immunity: Burning, Zeal. A zealous Polearm Unit whose sweeping strikes inflict Burning. |

#### Tome of Corruption  

- **Tier:** III | **Affinity granted:** +1 Shadow, +1 Astral | **DLC:** Eldritch Realms | id `tome_of_corruption`
- **Theme:** Become closer to the umbral demons, and punish your enemies with their own strengths.
- **Lore attribution:** Lithyl Nightweaver, Harbinger of Urrath
- **Unlock rule:** Tier III: requires 4 tomes already unlocked and 3 affinity points in this tome's affinity (for dual tomes any mix of its two affinities).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Corrupted Boon | VII | Debuff Spell | 20 Mana / 25 CCP | - | Target enemy unit: • Loses all Positive Status Effects. • If a lost status effect has any Status Effects Countering, then the unit gains a stack of that Negative Status Effect. |
| Gloom Strider | VII | Major Race Transformation | 600 Mana / 600 WCP | - | Turns target race into Umbral beings, which grants them: • The Umbral Demon unit type. • Floating. • Fast Movement. Mounted units lose their mounts. Heroes lose their Mount and Leg equipment slots. This transformation is incompatible with Pure Soul. |
| Summon Umbral Mistress | VII | Summon Spell | 200 Mana / 200 WCP | - | Summons an Umbral Mistress, a Mythic Unit that can manipulate other units to do her bidding. Summons: Umbral Mistress (Tier IV Mythic, HP 110, Def 3, Res 5) |
| Throne of Insidious Whispers | VII | City Structure | 170 Gold 450 Production | - | • +15 Mana income • 15 World Map Casting Points • 15 Combat Casting Points At the start of combat in this city's domain: • 3 enemy units have a base 90% chance of suffering Insanity for 1 Turn. If unsuccessful, are Stunned for 1 Turn. Can only be built in the Throne City. |
| Treacherous Reflection | VII | Debuff Spell | 100 Mana / 40 CCP | - | Create a Treacherous Reflection of target enemy unit. Cannot target Heroes, Combat Summons, and Mythic Units. |
| Umbral Incursion | VII | World Spell | 120 Mana / 120 WCP | - | Target enemy city: • Loses a border land province and the population is lost. • Spawns an Umbral Nest Infestation on lost province. |

### 1.6 Tier IV tomes — full contents

#### Tome of Exaltation  

- **Tier:** IV | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_exaltation`
- **Theme:** Convert your people to Celestials and use their faith to smite your enemies.
- **Lore attribution:** Anon, Archon Wizard of Life
- **Unlocked on selection (Special Province Improvement) — Conduit Ruler's Statue** (170 Gold 450 Production): • Can only be built once in your Throne City. • Allied Empires and Free Cities with a Supreme Vassalage grant 3 Imperium. • Ruler respawns 1 Turn faster. • Spells can be cast even if the Ruler is in the void. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Angelic Transformation | VII | Major Race Transformation | 600 Mana / 600 WCP | - | Turns the target race into angelic beings, granting them: • The Celestial unit type. • Flying Movement, which increases mobility. • Faithful, which reduces Unit Upkeep. • Decreased number of units in formation. |
| Ascended Warriors | VII | Friendly Army Spell | 240 Mana / 240 WCP | - | Non-Hero units in target army gain 1 Rank. Cannot promote units above Legendary rank. |
| Resurrect Unit | VII | Combat Summon Spell | 100 Mana / 40 CCP | - | Returns target dead friendly unit to full Temporary Hit Points. Cannot be used in Water battles. |
| Shrine of Smiting | VII | Unit | 400 Draft 300 Gold | upkeep 60 Gold 7 Imperium | **Shrine of Smiting** (Tier V Mythic; 400 Draft 300 Gold; upkeep 60 Gold 7 Imperium; HP 140, Def 5, Res 7, Status res 11, MP 40) — Abilities: Smiting Prayer Blast, Divine Vengeance, Defense Mode. Passives: Control Loss Immunity, Control Loss Immunity, Control Loss Immunity, Demolisher, Distracting Aura, Fearless, Heartless, Inspiring Killer, Reinforced, Zeal. A Mythic Unit whose power scales with the number of Faithful units on the battlefield. |
| Temple of the Exalted | VIII | City Structure | 280 Gold 750 Production | - | • +30 Mana income • +30 City Stability income |

#### Tome of Supremacy  

- **Tier:** IV | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_supremacy`
- **Theme:** Lead your people to glorious victory. Specialize in increasing Morale and managing a big empire.
- **Lore attribution:** Inioch, Emperor of the Elven Court
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Condemn Army | VII | Enemy Army Spell | 80 Mana / 80 WCP | - | Target enemy army: • Takes 20 Spirit Damage • Becomes Condemned for 5 World Map Turns. |
| Exemplar | VII | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Exemplar** (Tier IV Shield; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 120, Def 8, Res 3, Status res 7, MP 40) — Abilities: Melee Strike, Embolden Allies, Defense Mode: Shield Wall. Passives: Demolisher, Graceful Defense, Inspiring Killer, Inspiring Presence, Shield Defense, Zeal. A flying Shield Unit that excels at increasing the Morale of your units. |
| Monument of Supremacy | VII | City Structure | 170 Gold 450 Production | - | +5 City Stability per Monument of Supremacy in your empire. |
| Anthem of Victory | VIII | Buff Spell | 150 Mana / 50 CCP | - | All allied units gain: • 3 Strengthened. • +15 Morale. |
| Supreme Magic | VIII | Unit Enchantment | 160 Mana / 160 WCP | - | For enchanted units: • Grants Zeal, which makes attacks deal extra Spirit Damage. • Attacks ignore 2 Status Resistance. • Killing a unit causes it to explode, dealing 20 Spirit Damage to adjacent enemy units. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |

#### Tome of the Archon  

- **Tier:** IV | **Affinity granted:** +2 Order | **DLC:** Archon Prophecy | id `tome_of_the_archon`
- **Theme:** Summon Celestial allies and ascend your units to the ranks of the Archons.
- **Lore attribution:** Cantariel of Gilrad, Herald of Glory
- **Unlocked on selection (Special Province Improvement) — Teleporter Archon Gate** (170 Gold 450 Production): • +20 City Stability • Unit deployment location. • Allows the drafting of Titans. • Functions as a Teleporter. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ascended Rebirth | VI | Buff Spell | 100 Mana / 40 CCP | - | Target dead non-Hero and non-Celestial unit: • Revives as a Vigil under the caster's control until the end of combat. • On revive, all friendly units in a 2-hex radius are healed for 20 Temporary Hit Points. |
| Celestial Guardians | VII | Friendly Army Spell | 200 Mana / 200 WCP | - | Target leader of an army gains Celestial Guardians for 1 World Map Turn, conjuring 2 Tier III Archon units at the start of combat for the duration. |
| Holy Aura | VII | Unit Enchantment | 140 Mana / 140 WCP | - | Grants enchanted units: • Holy Aura, granting status protection to adjacent friendly units and damaging adjacent enemies. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Pure Soul | VII | Minor Race Transformation | 450 Mana / 450 WCP | - | Purify the souls of target race, granting them: • At the start of each turn in combat, dispel 1 Negative Status Effect. • If the Negative Status Effect removed had a positive counter, gain the Positive Status Effect. This transformation is incompatible with Umbral Flesh and Gloom Strider. |
| Summon Astra | VIII | Summon Spell | 150 Gold 300 Mana / 300 WCP | - | Summon an Astra Mythic Unit, an Angel unit with strong attacks and healing abilities. Summons: Astra (Tier V Mythic, HP 150, Def 7, Res 6) |

#### Tome of Chaos Channeling  

- **Tier:** IV | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_chaos_channeling`
- **Theme:** Become the master of chaos by exploiting your accumulated chaotic powers from previous Chaos Affinity Tomes.
- **Lore attribution:** Karissa the Red, Mistress of Passions
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Abyssal Flames | VII | Terraforming Spell | 150 Mana / 150 WCP | - | Target Province: • Enemy Units suffer -2 Fire Protection for 1 World Map Turn. • The provinces gain Ashlands. • The provinces lose River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom. • Summon a Magma Spirit on the targeted hex. Summons: Magma Spirit (Tier III Battle Mage, HP 85, Def 1, Res 3) |
| Fan the Inferno | VII | Damage/Debuff Spell | 100 Mana / 40 CCP | - | All enemy units: • Sustain 5 Fire Damage that ignores 50% of Resistance. • Are inflicted with Burning. |
| Flamer Focus | VII | Unit Enchantment | 140 Mana / 140 WCP | - | Enchanted units gain: • The Fire Bomb ability, which deals magical damage in an area. • The damage of this ability increases with the unit's tier. Applies to: Support Unit, Battle Mage Unit. |
| Golden Horde | VII | Summon Spell | 300 Mana / 300 WCP | - | • Summons a full army of random non-Scout Tier I units that can be produced in a city on the target hex. • If cast within an enemy Province, instantly pillages it. |
| Scion of Flame | VII | Minor Race Transformation | 450 Mana / 450 WCP | - | Makes the target race the embodiment of fire, granting them: • 4 Fire Protection. • Vengeful Flames, which damages Melee attackers. • Fiery Wake, which ignites flammable terrain such as Flora Obstacles. • Immunity to Burning. • Lava Walk. • Cities of this race ignore the City Stability penalty from Chasm and Lava in their Domain. |
| Summon Flame Incarnate | VIII | Summon Spell | 300 Mana / 300 WCP | - | Summons a non-Fiend Tier V Mythic Unit with Fire and Burning-related abilities on target hex. Summons: Fire Dragon (Tier V Mythic, HP 175, Def 8, Res 6); Herald of War (Tier V Mythic, HP 160, Def 6, Res 10) |

#### Tome of the Demon Gate  

- **Tier:** IV | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_the_demon_gate`
- **Theme:** Open rifts to summon Fiends and burn the world in your wake.
- **Lore attribution:** Kruul Blightlord, Chaos Prince
- **Unlocked on selection (Special Province Improvement) — Teleporter Demon Gate** (170 Gold 450 Production): • Unlocks the production of various Infernal Fiend Units. • Unit deployment location. • Functions as a Teleporter. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Demonic Summoning | VII | Summon Spell | 150 Mana / 150 WCP | - | Target one of your Free City Vassals: • Summon 2 random Fiends under your control, one will be Tier III and the other Tier IV. • The Vassal loses: • A Vassalage Phase diplomatic stage. • 1 Population. Cannot be cast on a Denying Tributary. Summons: Skald (Tier III Support, HP 80, Def 2, Res 4); Nightmare (Tier III Shock, HP 90, Def 4, Res 2); Accursed Blade (Tier III Polearm, HP 110, Def 5, Res 2); Inferno Hound (Tier III Magic Fighter, HP 90, Def 3, Res 3); Immolated Soul (Tier III Magic Fighter, HP 90, Def 3, Res 3); Infernal Juggernaut (Tier IV Shock, HP 130, Def 5, Res 3); Chaos Eater (Tier IV Battle Mage, HP 110, Def 3, Res 5); Accursed Trickster (Tier IV Battle Mage, HP 95, Def 2, Res 4) |
| Fight for Power | VII | Friendly Army Spell | - / 45 WCP | - | Two Fiend units of the same Tier in the target army fight each other. One dies and the other transforms into a Fiend with a Tier one level higher than before. |
| Sacrificial Slaughter | VII | Damage Spell | 100 Mana / 40 CCP | - | Target friendly unit explodes and enemy units within 2 hexes: • Sustain 20 Fire Damage plus 5 Fire Damage per Tier of the sacrificed unit. • Suffer one random Negative Status Effect per Tier of the sacrificed unit. |
| Gremlin Ambushers | VIII | Sustained City Spell | 100 Mana / 100 WCP | 10 Mana | Targets a city, and whenever you fight in that domain, a Gremlin is summoned next to one of your units every Turn. Up to 5 Gremlins can be summoned per battle. |
| Summon Balor | VIII | Summon Spell | 300 Mana / 300 WCP | - | Target city loses 2 Population and spawns a Balor, a mythic unit that wreaks havoc on your foes. Summons: Balor (Tier V Mythic, HP 160, Def 7, Res 6) |
| Demonkin | IX | Major Race Transformation | 600 Mana / 600 WCP | - | Turns the target race into demonic beings, which grants them: • The Infernal Fiend unit type. • Flying, increasing mobility. • Frenzy, increasing damage as they attack. • Cities of this race ignore the City Stability penalty from Chasm and Lava in their Domain. |

#### Tome of Nature's Wrath  

- **Tier:** IV | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_natures_wrath`
- **Theme:** Grants powerful spells that unleash the uncontrollable power of nature.
- **Lore attribution:** Serena, Elven Wizard of Life
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Awaken Instincts | VII | Healing/Buff Spell | 150 Mana / 50 CCP | - | All friendly units in a 2-hex radius: • Heal +25 Temporary Hit Points. • Regain all Action Points. • Become Berserk for 2 Turns. Does not affect units with Control Loss Immunity. |
| Destructive Regrowth | VII | Terraforming Spell | 150 Mana / 150 WCP | - | On Target Province: • Enemy units sustain 20 Blight Damage and suffer -2 Blight Protection for 2 Turn. • If it contains an enemy Province Improvement, it becomes Pillaged. • You are not granted its rewards nor do you lose Alignment. • The province gains Forest if on the Surface or Mushroom Forest if in the Underground. |
| Devolve | VII | Debuff Spell | 100 Mana / 40 CCP | - | Target non-Hero enemy: • Has a base 90% chance of being transformed into a random Tier I animal until the end of battle. • If resisted, inflicts Stunned instead. Cannot be used in Water battles. |
| Frenzying Imbuement | VII | Unit Enchantment | 90 Mana / 90 WCP | - | Grants enchanted units: • Frenzy • Life Steal Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Awaken the Forest | VIII | Summon Spell | 400 Mana / 400 WCP | - | Target Province with Forest: • Loses Forest. • An Army of Animals and Plants is summoned under your control. Summons: Entwined Thrall (Tier I Skirmisher, HP 55, Def 2, Res 0); Entwined Protector (Tier III Shield, HP 100, Def 7, Res 3); Warg (Tier II Fighter, HP 70, Def 2, Res 1); Goretusk Matriarch (Tier III Shock, HP 110, Def 4, Res 1); Entwined Scourge (Tier IV Battle Mage, HP 105, Def 2, Res 4) |
| Summon Horned God | VIII | Summon Spell | 300 Mana / 300 WCP | - | Summons the Horned God, a Tier V Mythic Unit with potent summoning abilities. Summons: Horned God (Tier V Mythic, HP 160, Def 5, Res 7) |

#### Tome of Paradise  

- **Tier:** IV | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_paradise`
- **Theme:** Create a lush green paradise for your people. Focus on economy, healing, and buffs.
- **Lore attribution:** Birchfoot, Hermit of the Glade
- **Unlocked on selection (Special Province Improvement) — Farm Garden of Bliss** (170 Gold 450 Production): • +15 City Stability. • +7 Food per adjacent Grasslands Province. • Convert 10% of Food income into Mana. • Counts as a Farm. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Enchanted Bloom | VII | Terraforming Spell | 150 Mana / 150 WCP | 15 Mana | Target friendly City gains: • Every Turn, 1 Province within or adjacent to the Domain: • Gain Grassland and Forest if on the Surface, or Fungus Fields and Mushroom Forest if in the Underground. • Lose Chasm, Swamp, Sand, Snow, Ice, Ashlands, and Gloom. • Provinces within the domain with either Grasslands, Forests, Fungus Fields, or Mushroom Forest features gain: +5 Food, +5 City Stability |
| Exhilarating Pollen | VII | Buff/Debuff Spell | 45 Mana / 30 CCP | - | All friendly units gain +15 Morale. All enemy units have a base 90% chance of becoming Distracted. |
| Nature's Bounty | VII | Friendly Army Spell | 120 Mana / 120 WCP | - | All friendly units in the target Province gain +15 max Hit Points and regenerate 15 Hit Points in neutral and friendly domain for the next 2 World Map Turns. |
| Blessing of Paradise | VIII | Empire Bonus | - | - | Your cities gain +5% income per City Stability above Neutral. |
| Fortress of Vines | VIII | Sustained World Spell | 300 Mana / 300 WCP | 30 Mana | Your empire gains: • Your non-hero units in your domain earn 10 Experience each Turn. • Enemy units in this domain spend 4 more Move Points per hex moved. • A Living Vine spawns next to an enemy each turn during battle in your domain. |
| Gaia's Chosen | VIII | Major Race Transformation | 600 Mana / 600 WCP | - | Infuse the target race with the blessing of nature. They gain: • The Plant unit type. • +3 Status Resistance. • +20 Hit Points. |

#### Tome of the Crucible  

- **Tier:** IV | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_the_crucible`
- **Theme:** Bury your enemies in lava and shape the land using the destructive forces of both earth and fire.
- **Lore attribution:** Yaka, self-proclaimed God of Fire
- **Unlocked on selection (Special Province Improvement) — Mine Great Foundry** (170 Gold 450 Production): • +10 Gold. • Per adjacent Mine: • +5 Draft. • +3 Gold. • Counts as a Mine. • Allows for the drafting of Magma Spirit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Crucible Battlements | VII | City Structure | 170 Gold 450 Production | - | Battlement Structure • Battlements grant Missile and Magic attacks: • Deals +4 Fire Damage. • Sets affected hexes On Fire. • Ignore Obscured on targets. • +1 Range • The City ignores negative City Stability penalties from annexing provinces with Chasm or Lava. |
| Lava Burst | VII | Damage/Debuff Spell | 100 Mana / 40 CCP | - | Targets a 2-hex radius: • All units sustain 30 Fire Damage. • All units are inflicted with Burning. • All units are Slowed. • The ground is set On Fire. |
| Pyroclastic Eruption | VII | Terraforming Spell | 150 Mana / 150 WCP | - | Target Province: • If it contains an enemy Province Improvement, it will be Pillaged. • You will not gain its rewards or lose Alignment. • Enemy Units in the province sustain 20 Fire Damage. • The province gains Ashlands. • The province loses River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom. |
| Meteor Imbuement | VIII | Unit Enchantment | 160 Mana / 160 WCP | - | Makes base attacks of enchanted units: • Deal +4 Fire Damage to the target and adjacent enemies. • Gain Demolisher, making them able to destroy reinforced obstacles. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Meteor Shower | VIII | Combat Enchantment | 150 Mana / 50 CCP | - | Up to 2 random enemy units and enemies adjacent to those: • Sustain 10 Fire Damage and 10 Physical Damage. This spell repeats at the start of each turn for the next 5 Turns. |

#### Tome of the Golden Realm  

- **Tier:** IV | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_the_golden_realm`
- **Theme:** Become a prosperous empire and gain large amounts of gold with new infrastructure and by turning your very enemies into gold.
- **Lore attribution:** Fangir Rockborne, Master of Earth
- **Unlocked on selection (Special Province Improvement) — Mine Bazaar of Wonders** (170 Gold 450 Production): • +10 Gold. • +5 Gold per unique adjacent Province Improvement. • Counts as a Mine. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Luxury Markets | VII | City Structure | 170 Gold 450 Production | - | Buy Now is 25% cheaper and can be used 2 times per World Map Turn. |
| Gilding Blast | VIII | Debuff Spell | 100 Mana / 40 CCP | - | Grants units in a 1-hex radius a 90% chance of becoming Gilded for 1 Turn. |
| Gold Golem | VIII | Unit | 400 Draft 400 Gold | upkeep 60 Gold 7 Imperium | **Golden Golem** (Tier V Mythic; 400 Draft 400 Gold; upkeep 60 Gold 7 Imperium; HP 150, Def 7, Res 7, Status res 11, MP 40) — Abilities: Golden Cleave, Gilded Emanation, Defense Mode. Passives: Control Loss Immunity, Control Loss Immunity, Demolisher, Fearless, Golden Curse, Golden Retaliation, Heartless, Juggernaut, Polearm Weapon, Reinforced, Siege Breaker. A Polearm Unit that turns enemies into gold... and brings home the spoils. |
| Goldtouched | VIII | Minor Race Transformation | 450 Mana / 450 WCP | - | Makes the target race gain an affinity for gold, granting them: • +2 Resistance. • +1 Gold per Population in their Cities. |
| Reagent Refinery | VIII | City Structure | 170 Gold 450 Production | - | • +10 Gold income • +10 Food income per Magic Material inside Domain: • +10 Draft income per Magic Material inside Domain: |

#### Tome of Astral Convergence  

- **Tier:** IV | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_astral_convergence`
- **Theme:** Become stronger the more spells you cast and summon creatures from the Astral Sea.
- **Lore attribution:** Merlin the Wanderer
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Arcane Accumulation | VII | Siege Project | - | - | • At the start of combat, gain 50 Combat Casting Points. • During combat, all enemy Units suffer -1 Resistance. |
| Astral Shattering | VII | World Spell | 150 Mana / 150 WCP | - | Target Province: • If it contains an enemy Province Improvement and no Ancient Wonder, it becomes ruins. • Spawns a powerful marauding Army of Astral Sea Units. |
| Explosive Manifestation | VII | Combat Summon Spell | 100 Mana / 40 CCP | - | Target non-occupied hex: • Conjure an Astral Serpent or Astral Siphoner unit at random that lasts for 3 Turns. • All adjacent units sustain 10 Fire Damage, 10 Lightning Damage, and 10 Frost Damage. Summons: Astral Serpent (Tier III Magic Fighter, HP 80, Def 2, Res 4); Astral Siphoner (Tier III Fighter, HP 100, Def 2, Res 4) |
| Astral Attunement | VIII | Major Race Transformation | 600 Mana / 600 WCP | - | Links the target race to the Astral Sea, granting them: • The Ethereal unit type. • Attunement: Astral Omen, granting a random Positive Status Effect when a spell is cast in combat. |
| Cascading Power | VIII | Sustained World Spell | 120 Mana / 120 WCP | 12 Mana | Whenever you cast a spell in Tactical Combat, add a Stack of Cascading Power to that combat. |

#### Tome of the Astral Mirror  

- **Tier:** IV | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_the_astral_mirror`
- **Theme:** Create Astral Reflections of your units and leader and reflect damage back onto attackers.
- **Lore attribution:** Enam'ru Enkhanan, Arcane Matriarch
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Astral Revelation | VII | Sustained World Spell | 150 Mana / 150 WCP | 15 Mana | Units and Cities you control gain +7 Vision Range. |
| Summon Astral Reflection | VII | Combat Summon Spell | 150 Mana / 50 CCP | - | Summons an Astral Reflection of target friendly unit onto an unoccupied adjacent hex. Cannot target Heroes, Combat Summons, and Mythic Units. |
| Summon Mirror Mimic | VII | Summon Spell | 200 Mana / 200 WCP | - | Summons a Mirror Mimic, a Mythic Unit that can take the form of other units, gaining their abilities and healing themselves. Summons: Mirror Mimic (Tier IV Mythic, HP 120, Def 4, Res 5) |
| Mirror Veil | VIII | Unit Enchantment | 160 Mana / 160 WCP | - | Makes enchanted units: • Reflect 30% of non- Physical Damage sustained back onto attackers. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Throne of Mirrors | VIII | City Structure | 170 Gold 450 Production | - | • When a fight occurs in the city's domain, the player gains an Astral Reflection of their Ruler if they are not present themselves. • Your Ruler gains 10 Experience per Turn per owned City with this city structure built. |

#### Tome of Oblivion  

- **Tier:** IV | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_oblivion`
- **Theme:** Use powerful magic capable of sending your enemies to the nothingness of oblivion. Specialize in inflicting Insanity and making parts of the world and the battlefield inhospitable.
- **Lore attribution:** Meandor, Shadow Lord of the Dark Elves
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Devouring Void | VII | Debuff Spell | 100 Mana / 40 CCP | - | • Conjures a Devouring Void in a 1-hex radius. • Each turn, the radius increases by 1 hex. • Lasts for 2 Turns. |
| Ritual of Somnia | VII | Enemy Army Spell | 120 Mana / 120 WCP | - | In the target enemy army: • At the start of each battle, all units have a base 90% chance of becoming Stunned for 2 Turns. • Lasts 1 World Map Turns. |
| Sleep of Oblivion | VII | Debuff Spell | 100 Mana / 40 CCP | - | Target non-Hero unit dies. After 2 Turns, they come back to life with 75% of their total Hit Points and are inflicted with Insanity. While dead this way the unit cannot be revived or have its corpse destroyed. |
| Summon Living Fog | VII | Summon Spell | 200 Mana / 200 WCP | - | Summons a Living Fog unit onto the target world hex. Summons: Living Fog (Tier IV Mythic, HP 130, Def 7, Res 5) |
| Fog of Insanity | VIII | Sustained City Spell | 200 Mana / 200 WCP | 20 Mana | Target friendly City. Any battle in the Domain of the City now has the Fog of Insanity battle enchantment, which causes enemies to have a base 20% chance of gaining Insanity every Turn. |

#### Tome of the Reaper  

- **Tier:** IV | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_the_reaper`
- **Theme:** Extract Souls in brutal fashion and use them to bring Undead terrors into the world. Use instant kill effects and ultimate Undead synergy.
- **Lore attribution:** Melenis the Lifeless, Undead Stormlord
- **Tome passive — Soul Harvest:** Gain Souls when enemies die in battle. Unlocks the ability to animate City Ruin and to animate Heroes in your crypt as your undead servants.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Greater Reanimation | VII | Combat Summon Spell | 35 Souls / 40 CCP | - | Resurrects target non-Hero unit: • As a Corrupt Soul if not Undead. • With 100% of its total Hit Points if Undead. If a Corrupt Soul or enemy Undead survives this combat, the controller will have the option of spending Souls to keep the unit permanently. |
| Harvest Population | VII | Sustained City Spell | 45 Mana / 45 WCP | - | Target friendly City: • No longer gains any Food income. • Gains +30 Souls income. • Has -20 City Stability |
| Marked for Death | VII | Damage/Debuff Spell | 35 Souls / 40 CCP | - | Target unit: • Sustains 15 unblockable Physical Damage. • Loses -10 Morale. • Has a Decaying Zombie spawn adjacent to them. • Is afflicted with Visions of Death until the end of combat. Summons: Decaying Zombie (Tier I Fighter, HP 60, Def 0, Res 0) |
| Soul Siphon Ritual | VII | Siege Project | - | - | • When the walls are breached, you gain +40 Souls per Tier of the besieged City • At the start of the battle: • Gain 6 Decaying Zombie units. • All enemy units gain Soulbound. |
| Summon Reaper | VIII | Summon Spell | 150 Souls / 300 WCP | - | Summons a Reaper, a Tier V Mythic Unit that can instantly kill units and grows stronger when enemies die. Summons: Reaper (Tier V Mythic, HP 150, Def 6, Res 6) |

#### Tome of Calamity  

- **Tier:** IV | **Affinity granted:** +1 Chaos, +1 Shadow | **DLC:** Ways of War | id `tome_of_calamity`
- **Theme:** Bring calamity to the realm and burn your enemies in cold Ghostfire.
- **Lore attribution:** Nusai, Laureate Poet of the Ascended Empire
- **Unlocked on selection (Special Province Improvement) — Conduit Accursed Shrine** (280 Gold 750 Production): • When placed, alter terrain into Desolate. • Per adjacent Ruin province gain: • +3 Draft • +3 Food • +3 Gold • +3 Knowledge • +3 Mana • +3 Production • Allows the drafting of Accursed Ogre, Accursed Blade, and Accursed Trickster • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Comet of Calamity | VI | Damage/Debuff Spell | 100 Mana / 40 CCP | - | Units in a 2-hex radius: • Sustain 15 Fire Damage. • Sustain 15 Frost Damage. • Have a 50% base chance of becoming Frozen for 1 Turn. • Gain 2 stacks of Ghostfire for 3 Turns. |
| Desecrate Land | VI | Terraforming Spell | 60 Mana / 60 WCP | - | Target Province: • If it contains a Province Improvement, it becomes Pillaged. • You are granted its rewards and lose Alignment. • The province gains Ashlands. • The province loses River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom. |
| Accursed Armors | VII | Unit Enchantment | 120 Mana / 120 WCP | - | Enchanted units gain: • When a melee range attack hits, the attacker has a 60% chance of being inflicted with Misfortune for 3 Turns. • +1 Defense. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Accursed Imbuement | VII | Unit Enchantment | 120 Mana / 120 WCP | - | Attacks of enchanted units: • Deal +1 Fire Damage. • Deal +1 Frost Damage • Inflict Ghostfire for 3 Turns. Effects are increased for Single Shot attacks. Applies to: Ranged Unit, Support Unit, Battle Mage Unit, Skirmisher Unit, Magic Fighter Unit. |
| Ritual of Calamity | VII | Siege Project | - | - | • At the start of every Turn during the siege, a random Province Improvement of the besieged city is pillaged, granting you rewards. • At the start of combat: • All defenders gain a stack of Ghostfire for 3 Turns. • 2 Accursed Ogres appear on the attacker's side. |
| Summon Calamity Dragon | VIII | Summon Spell | 300 Mana / 300 WCP | - | Target owned non-ruined Province turns to Ruins and Desolate terrain and then summons a Calamity Dragon, a Mythic Unit unit with strong offensive capabilities. Summons: Calamity Dragon (Tier V Mythic, HP 150, Def 6, Res 7) |

#### Tome of the Crimson Reign  

- **Tier:** IV | **Affinity granted:** +1 Chaos, +1 Shadow | **DLC:** Thrones of Blood | id `tome_of_the_crimson_reign`
- **Theme:** Embrace a forgotten and corrupt magic that empowers your high tier units and has your faction embrace an ancient form of undeath, gaining the power to spread Blood Parasites onto your enemies.
- **Lore attribution:** The Blood Emperor Eternal
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Tears of the Crimson Sovereign | VI | Combat Enchantment | 80 Mana / 35 CCP | - | When cast and for the next 2 Turns: • Up to 3 enemy units: • Sustain 10 Physical Damage. • Have a base 90% chance of gaining Blood Parasite for 3 Turns. • Up to 3 friendly units: • Heal for 10 Temporary Hit Points. • Gain Fortune for 3 Turns. |
| Crimson Court | VII | City Structure | 170 Gold 450 Production | - | • Tier III, IV, and V units you own gain: • +5 Hit Point regeneration on the world map. • Gain 10 Experience per turn on the world map. • Gain Crimson Court Magistrate, letting you gain mana from Vassal and when Migrating, Razing, or Pillaging. Requirement: Can only be built in the Throne City. |
| Gift of the Old Blood | VII | Major Race Transformation | 600 Mana / 600 WCP | - | Transform your units as they ritually imbibe blood from an Exarch, granting them: • The Undead unit type. • Lifedrinker. • Base attacks have a base 60% chance of inflicting Blood Parasite for 3 Turns. This effect is increased for Single Shot attacks. |
| Mantle of the Blood Noble | VII | Unit Enchantment | 140 Mana / 140 WCP | - | Grants enchanted units: • Coagulate • At the start of combat, for each friendly non-summon Tier I and Tier II unit: • +5 Hit Points • +5% healing received in combat. Applies to: Tier III, Tier IV, Tier V. |
| Summon Blood Exarch | VIII | Summon Spell | 150 Gold 300 Mana / 300 WCP | - | Summon a Blood Exarch Mythic Unit with powerful support and offensive abilities that devastate low tier units. Summons: Blood Exarch (Tier V Mythic, HP 160, Def 6, Res 6) |

#### Tome of Severing  

- **Tier:** IV | **Affinity granted:** +1 Materium, +1 Shadow | **DLC:** Empires & Ashes | id `tome_of_severing`
- **Theme:** Wield powerful nullification magic to sever the very essence of summoned creatures.
- **Lore attribution:** Nocturne, Greyblood Assassin
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Astral Severance | VII | Debuff Spell | 150 Mana / 50 CCP | - | Target Magic Origin Unit: • Has a base 60% chance of being killed. • If unsuccessful, inflicts Disrupted and 4 stacks of Decaying. |
| Final Banishment | VII | Healing/Buff Spell | 150 Mana / 50 CCP | - | All non-hero corpses on the map are destroyed. For each corpse destroyed, friendly units: • Gain +1 Bolstered Resistance • Heals +5 Temporary Hit Points |
| Null Shield | VII | Unit Enchantment | 160 Mana / 160 WCP | - | Makes it so when enchanted unit enters Defense Mode, it and adjacent friendly units gain: • +5 Status Resistance Applies to: Shield Unit, Support Unit. |
| Conjure Spellward | VIII | World Spell | 200 Mana / 200 WCP | - | Conjures a Spellward on an empty hex in the target Province. This structure: • Functions as a Spell Jammer for this and adjacent provinces. • Provides vision in 3-hex radius. |
| Disrupting Blades | VIII | Unit Enchantment | 180 Mana / 180 WCP | - | Makes attacks of enchanted units gain: • A base 60% chance of inflicting Disrupted for 2 Turns. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit. |
| Severing Golem | VIII | Unit | 400 Draft 400 Gold | upkeep 60 Gold 7 Imperium | **Severing Golem** (Tier V Mythic; 400 Draft 400 Gold; upkeep 60 Gold 7 Imperium; HP 140, Def 5, Res 6, Status res 11, MP 40) — Abilities: Weakening Bolts, Magical Disruption, Dispelling Field, Defense Mode. Passives: Control Loss Immunity, Control Loss Immunity, Demolisher, Fearless, Heartless, Juggernaut, Reinforced, Siege Breaker. A caster Mythic Unit based on ancient designs that can remove friendly Negative Status Effects and enemy enchantments. |

#### Tome of the Stormborne  

- **Tier:** IV | **Affinity granted:** +1 Nature, +1 Astral | **DLC:** Primal Fury | id `tome_of_the_stormborne`
- **Theme:** Control the storms to do your bidding and turn your people into powerful Naga.
- **Lore attribution:** Tempest, Master of Storms
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Bounty of the Sea | VI | Sustained City Spell | 80 Mana / 80 WCP | 8 Mana | Target owned City gains: • Double the base resources from Coastal Province Improvement. • -10 City Stability. |
| Downpour | VII | World Spell | 60 Mana / 60 WCP | - | Target province: • Alters terrain to Swamp, if land. • Becomes Downpouring for 3 Turns. Cannot be used underground. |
| Lightning Storm | VII | Combat Enchantment | 80 Mana / 35 CCP | - | • All units become Wet for 3 Turns • Up to 2 random enemy units: • Sustain 20 Lightning Damage. • Have a base 90% chance of becoming Electrified for 3 Turns. This spell repeats at the start of each turn for the next 6 Turns. |
| Naga Transformation | VII | Major Race Transformation | 600 Mana / 600 WCP | - | Target race gains the body of a Naga, granting: • Fast Movement • Amphibious • Slip Away • Immunity to Electrified • +2 Blight Protection • +2 Lightning Protection Mounted units lose their mounts. Heroes lose their Mount and Leg equipment slots. |
| Stormbringer | VII | Unit | 300 Draft 200 Gold | upkeep 30 Gold 3 Imperium | **Stormbringer** (Tier IV Magic Fighter; 300 Draft 200 Gold; upkeep 30 Gold 3 Imperium; HP 105, Def 4, Res 4, Status res 7, MP 40) — Abilities: Storm Strikes, Throw Storm Trident, Defense Mode. Passives: Melee Mage. Offensive Magic Fighter Unit whose attacks arc to other enemy units. |
| Stormport | VII | City Structure | 280 Gold 750 Production | - | • +12 Mana • For each Stormport built in your empire, gain: • +4 Mana • +3 Gold Requires a Coastal Province Improvement in order to build. |

#### Tome of Prosperity  

- **Tier:** IV | **Affinity granted:** +1 Order, +1 Nature | **DLC:** Ways of War | id `tome_of_prosperity`
- **Theme:** Bring forth prosperity to your empire and grant your units healing Grace.
- **Lore attribution:** Nusai, Laureate Poet of the Ascended Empire
- **Unlocked on selection (Special Province Improvement) — Conduit Shrine of Prosperity** (280 Gold 750 Production): • +3 City Stability per adjacent Farm or Forester. • +7 Food per adjacent Farm or Forester. • 10% of Food income in the city is converted to Gold. • Allows the drafting of Blessed Dragon, Radiant Guardian, and Righteous Judge. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Grand Protection | VI | Buff Spell | 100 Mana / 40 CCP | - | Friendly units in a 2-hex radius gain: • 2 Grace • 2 Regeneration for 3 Turns • 2 Bolstered Defense for 3 Turns • 2 Bolstered Resistance for 3 Turns |
| Blessed Armors | VII | Unit Enchantment | 120 Mana / 120 WCP | - | Enchanted units gain: • Inner Grace • +1 Resistance Applies to: Shield Unit, Polearm Unit, Shock Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Garden of Affluence | VII | City Structure | 170 Gold 450 Production | - | • +10 City Stability • Per Farm and Forester in the domain: • +2 Gold income • +2 Mana income |
| Staves of Grace | VII | Unit Enchantment | 120 Mana / 120 WCP | - | Enchanted units gain: • Inner Grace • Their Support abilities grant 1 Grace. • The Cleansing Rain ability. Applies to: Support Unit. |
| Summon Prosperity Dragon | VIII | Summon Spell | 150 Gold 300 Mana / 300 WCP | - | Summons a Prosperity Dragon, a Mythic Unit unit with strong protective and healing abilities. Summons: Prosperity Dragon (Tier V Mythic, HP 150, Def 6, Res 7) |

#### Tome of the Revenant  

- **Tier:** IV | **Affinity granted:** +1 Order, +1 Shadow | **DLC:** Archon Prophecy | id `tome_of_the_revenant`
- **Theme:** Raise an army of corrupted and undead Archons and use their knowledge to make your undead come back again and again, while protecting them from those who would use the powers of light and fire.
- **Lore attribution:** Hurr-A-Khal, He Who Eats The Light
- **Tome passive — Soul Harvest:** Gain Souls when enemies die in battle. Unlocks the ability to animate City Ruin and to animate Heroes in your crypt as your undead servants.
- **Unlocked on selection (Special Province Improvement) — Necropolis** (280 Gold 750 Production): • +8 Soul • +2 Soul per adjacent Research Post. • Allows the drafting of Skeletons, Corrupt Souls and Undead Titans. • Counts as a Research Post. Requirement: Must be built on an annexed Province. Requires City Tier II.
- **Unlock rule:** Tier IV: requires 6 tomes already unlocked and 6 affinity points in this tome's affinity (any mix for dual tomes).

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Chamber of the Rite | VI | City Structure | 170 Gold 450 Production | - | Undead units drafted in this city gain Natural Regeneration. |
| Revenant Whispers | VII | Enemy Army Spell | 60 Souls / 100 WCP | - | For 1 World Map Turn, target enemy army gains: • 2 Demoralized. • When attacked, conjure 3 Skeletons with Unholy Champion on the attacker side. |
| Undead Resentment | VII | Unit Enchantment | 140 Mana / 140 WCP | - | Grants enchanted units: • +2 Spirit Protection • +2 Fire Protection • Vicious Killer Applies to: Undead. |
| Unholy Champion | VII | Buff/Debuff Spell | 35 Souls / 40 CCP | - | Target friendly unit gains: • +50% damage. • Undying. • Armor of Despair On cast, enemy units in a 2-hex radius lose 10 Morale. |
| Summon Fallen Angel | VIII | Summon Spell | 150 Souls / 300 WCP | - | Summon a Fallen Angel Battle Mage Unit, that causes decay and corruption. Summons: Fallen Angel (Tier V Mythic, HP 150, Def 6, Res 6) |

### 1.7 Tier V tomes — full contents

#### Tome of the God Emperor  

- **Tier:** V | **Affinity granted:** +2 Order | **DLC:** Base game | id `tome_of_the_god_emperor`
- **Theme:** Become a god to be worshiped. Your mere presence inspires your troops and your cities. Specialize in buffing your units.
- **Lore attribution:** Turiel, Exalted Warden of Grexolis
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Divine Protection | IX | Friendly Army Spell | 200 Mana / 200 WCP | - | Units in target friendly army gain Resurgence for 1. |
| Exalted Champion | IX | Buff Spell | 150 Mana / 50 CCP | - | For 3 Turns, makes target friendly unit: • Deal +100% damage. • Gain +5 Bolstered Defense. • Gain +5 Bolstered Resistance. • Gain +5 Status Protection. |
| Wrath of the Emperor | IX | Enemy Army Spell | 120 Mana / 120 WCP | - | Target enemy army: • Sustains 20 Spirit Damage. • Becomes Demoralized for 1 Turn. • Becomes Condemned for 1 Turn. • If cast in enemy territory, the army additionally sustains +50% damage. |
| Mass Revive | X | Combat Summon Spell | 200 Mana / 65 CCP | - | Targets all friendly dead units with Faithful or Zeal. They come back to life with 50% of their total Hit Points. Cannot be used in Water battles. |

#### Tome of the Chaos Lord  

- **Tier:** V | **Affinity granted:** +2 Chaos | **DLC:** Base game | id `tome_of_the_chaos_lord`
- **Theme:** Unleash chaos forces upon the world. Specialize in offensive buffs.
- **Lore attribution:** Karissa the Red, Mistress of Passions
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Demonic Siphon | VIII | Unit Enchantment | 160 Mana / 160 WCP | - | Whenever another unit dies in battle, enchanted unit gains: • Infernal Might for 3 Turns. • +5 Morale. Does not trigger on the death of Combat Summons, Tower, and Siegecraft units. Applies to: Dragon, Elemental, Fiend, Accursed Fiend. |
| Demonic Onslaught | IX | Buff Spell | 150 Mana / 50 CCP | - | All attacking units gain Killing Momentum and Hastened for 3 Turns. |
| Incite Rebellion | IX | Siege Project | - | - | • After 1 in battle, 3 enemy non-Hero units are Mind-Controlled until the end of combat. • The city suffers -50 City Stability while it is besieged. |
| Call Forth Avatar of Chaos | X | Combat Summon Spell | 150 Mana / 50 CCP | - | Summons an avatar of your Ruler into a battle. The avatar has the same abilities as your Ruler and spawns with full Action Points. All Fiends gain +10 Morale. Cannot be used in Water battles. Cannot be used in battles where your Ruler is present. |

#### Tome of the Goddess of Nature  

- **Tier:** V | **Affinity granted:** +2 Nature | **DLC:** Base game | id `tome_of_the_goddess_of_nature`
- **Theme:** Become the ultimate embodiment of nature. Excel at buffs and healing, especially for Plants and Animals.
- **Lore attribution:** Serena, Elven Wizard of Life
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Force of Nature | IX | Unit Enchantment | 200 Mana / 200 WCP | - | Enchanted units gain: • +15% Critical Hit Chance • +3 Blight Damage on attacks Effects are increased for Single Shot attacks. Applies to: Cavalry, Dragon, Plant, Animal, Fey, Spider, Naga. |
| Forest Awareness | IX | World Spell | 200 Mana / 200 WCP | 20 Mana | All forests grant Vision on the World Map. |
| Mass Rejuvenation | X | Healing Spell | 150 Mana / 50 CCP | - | • Heals all friendly units +40 Temporary Hit Points. • Brings all dead friendly Animals and Plants back to life with 50% of their total Hit Points. |

#### Tome of the Creator  

- **Tier:** V | **Affinity granted:** +2 Materium | **DLC:** Base game | id `tome_of_the_creator`
- **Theme:** Shape the world, summon slumbering titans, and become the master of the earth.
- **Lore attribution:** Mother Mab, Goddess of Goblins
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Call the Titan of the Earth | IX | Combat Summon Spell | 200 Mana / 65 CCP | - | • Summons an Earth Titan onto the target unoccupied hex. • All adjacent enemies lose their Defense Mode and Retaliation Attack. Cannot be used in Water battles. Summons: Earth Titan (Tier V Mythic, HP 160, Def 6, Res 6) |
| Tectonic Shatter | IX | Damage/Debuff Spell | 200 Mana / 65 CCP | - | • All enemies sustain 30 Physical Damage. • All enemies have a base 60% chance of becoming Stunned. • All obstacles on the map have a 50% chance of being destroyed. |
| Create Earthshatter Engines | X | Siege Project | - | - | • At the start of the battle, all Wall obstacles are damaged. • At the start of the battle, gain 2 Earthshatter Engine units on the attacker's side until the end of battle. • Earthshatter Engines are Siegecraft Units with short range, area of effect attacks that can destroy obstacles and knock enemy units out of Defense Mode. • Only one type of Siegecraft unit can be brought into Combat. |
| Shaper's Touch | X | Unit Enchantment | 200 Mana / 200 WCP | - | Grants enchanted units: • Natural Regeneration • +10 Hit Points • +2 Lightning Protection Applies to: Elemental, Construct. |

#### Tome of the Archmage  

- **Tier:** V | **Affinity granted:** +2 Astral | **DLC:** Base game | id `tome_of_the_archmage`
- **Theme:** Reach the pinnacle of the arcane arts by bending space and time to your will.
- **Lore attribution:** High Councilor Gabriel, Keeper of Evermore
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Astral Travel | IX | World Spell | 200 Mana / 200 WCP | - | Makes your leader teleport to the target world hex. |
| Cosmic Overdrive | IX | Unit Enchantment | 180 Mana / 180 WCP | - | Grants enchanted units: • +20% damage. • Very Fast Movement. Applies to: Combat Summon, Magic Origin. |
| Time Stop | IX | Debuff Spell | 200 Mana / 65 CCP | - | Target enemy units in a 1-hex radius: • Become Stunned for 1 Turn. • Become Distracted for 1 Turn. • Gain 5 Marked for 3 Turns. |
| Disruption Wave | X | Buff/Debuff Spell | 300 Mana / 80 CCP | - | • Enemy units have a base 120% chance of becoming Disrupted for 2 Turns. • Dispels 2 Positive Status Effects from enemies. • Dispels 2 Negative Status Effects from allies. |

#### Tome of the Eternal Lord  

- **Tier:** V | **Affinity granted:** +2 Shadow | **DLC:** Base game | id `tome_of_the_eternal_lord`
- **Theme:** Become the leader of an eternal realm and command unending armies.
- **Lore attribution:** Melenis the Lifeless, Undead Stormlord
- **Tome passive — Soul Harvest:** Gain Souls when enemies die in battle. Unlocks the ability to animate City Ruin and to animate Heroes in your crypt as your undead servants.
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Withering Mist | VIII | Combat Enchantment | 100 Mana / 40 CCP | - | Each turn, for 3 Turns, all enemies: • Sustain 15 Frost Damage. • Have a base 90% chance of becoming Blind for 1 Turn. • Have a base 90% chance of becoming Weakened for 3 Turns. |
| Raise Undead Army | IX | Summon Spell | 150 Souls / 300 WCP | - | Summons a full army stack of low-Tier Undead units onto a target world hex. Summons: Skeleton Archer (Tier I Ranged, HP 50, Def 0, Res 0); Skeleton Mage (Tier I Battle Mage, HP 40, Def 0, Res 2); Skeleton Militia (Tier I Polearm, HP 60, Def 2, Res 0); Skeleton Warrior (Tier I Shield, HP 55, Def 5, Res 0); Bone Wyvern (Tier II Magic Fighter, HP 70, Def 2, Res 2); Corrupt Soul (Tier III Magic Fighter, HP 90, Def 3, Res 3); Banshee (Tier III Battle Mage, HP 90, Def 2, Res 4); Bone Horror (Tier III Shock, HP 100, Def 4, Res 1) |
| True Death Magic | IX | Unit Enchantment | 90 Souls / 75 WCP | - | Grants enchanted units: • The Curse of the Reaper ability, which has a chance to instantly kill the target. Applies to: Support Unit, Battle Mage Unit. |
| Battlefield Reanimation | X | Combat Summon Spell | 50 Souls / 65 CCP | - | • All friendly Undead units come back to life with 50% of their total Hit Points. • Non-undead Corpses come back to life as Decaying Zombies under your control until the end of battle. Cannot be used in Water battles. |

#### Tome of the Cosmos  

- **Tier:** V | **Affinity granted:** +1 Astral, +1 Alignment, +1 Shadow, +1 Chaos, +1 Nature, +1 Materium, +1 Order | **DLC:** Secrets of the Archmages | id `tome_of_the_cosmos`
- **Theme:** Use your mastery over the magic of the universe to empower your units and your economy, and summon a mighty Avatar of the Cosmos itself.
- **Lore attribution:** Merlin the Wanderer
- **Unlock rule:** Tier V: requires 8 tomes already unlocked and 8 affinity points in this affinity; only ONE Tier V tome may be taken per game and it is the capstone of the research tree.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Cosmos Awakening | X | Unit Enchantment | 250 Mana / 250 WCP | - | Enchanted units gain: • +1 damage of each damage channel. • +1 protection of each damage channel. Effects are increased for Single Shot attacks. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Prismatic Tower | X | City Structure | 440 Gold 1300 Production | - | • Reveal the Map. • +25 World Map Casting Point. • +25 Combat Casting Point. • For each Affinity at or above 5 the city gains +50 of the resource based on that affinity. • Astral Affinity - Mana • Chaos Affinity - Draft • Materium Affinity - Production • Nature Affinity - Food • Order Affinity - Gold • Shadow Affinity - Knowledge Can only be built in the Throne City. |
| Summon Avatar of the Cosmos | X | Sustained World Spell | 300 Mana / 300 WCP | - | Summon the Avatar of the Cosmos, a Mythic Unit that is empowered by your own affinities. Summons: Avatar of the Cosmos (Tier V Mythic, HP 150, Def 7, Res 7) |

### 1.8 Culture, sub-culture and general research trees (non-tome research)

These appear in the research pool alongside tome skills; they are granted by the culture chosen at faction creation, not by tome selection.

#### Architect (Archon Prophecy)

This research is available to Rulers with the Architect culture. They empower and adapt to their Affinity.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Conjure Elemental | III | Combat Summon Spell | - | - | Summon a Tier 1 Lesser Spirit based on your Empire's dominant Affinity. This summon lasts for 3 Turns. |
| Incarnate Mark | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Architect units: • Affinity Incarnate. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Resilient Incarnation | III | Buff Spell | 10 Mana / 15 CCP | - | Friendly units in a 1-hex radius for 1 Turn gain: • +1 Defense, +1 Resistance. • An additional +1 Defense, +1 Resistance per stack of Affinity Incarnate. |

#### Barbarian (Base game)

This research is available to rulers with the Barbarian culture. They specialize in speed and aggression.

- **Passive — Ritual of Alacrity:** Units standing on the center of this city or outpost restore 50% Hit Points, 100% Move Points, and remove Exhausted from Forced March. The city or outpost has a 3 Turn cooldown before it can use this again.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Song of the Reckless | I | Buff Spell | 15 Mana / 20 CCP | - | For 3 Turns, target friendly unit gains: • Berserk • 3 Strengthened Does not affect units with Control Loss Immunity. |
| Vision of Victory | II | Buff Spell | 30 Mana / 25 CCP | - | Friendly units in a 1-hex radius gain 3 Fortune. |
| Brutal Mark | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Barbarian units: • Savage Strike, which adds Blight Damage on critical hits. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Dark - Cult of Death (Base game)

This research is available to Rulers with the Dark culture.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Deathwaltz | I | Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit: • Regains its Action Points and Health. • Gains Resurgence. • Gains Doomed, dying at the end of this turn. |
| Mark of the Death Cult | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Dark units: • Power from Death Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |
| Morbid Sacrifice | III | Friendly Army Spell | 60 Mana 1 Embalmed Sacrifice / 60 WCP | - | Units in friendly armies in the target Province: • Restore all Hit Points. • Gain Universal Camouflage for 3 Turns. • Gain +15 Morale until the end of their next combat. • Gain +20 Hit Points until the end of their next combat. |

#### Dark - Cult of Tyranny (Base game)

This research is available to Rulers with the Dark culture.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Tyrannical Exploitation | I | City Spell | 30 Mana / 30 WCP | - | Target Vassal City: • No longer gains Allegiance • Vassal Income is increased by +20% for each point of Allegiance Income instead. |
| Baneful Curse | II | Debuff Spell | 10 Mana / 15 CCP | - | Enemy units in a 1-hex radius gain: • Base 90% chance of inflicting 2 Weakened for 3 Turns. • Base 90% chance of inflicting 2 Misfortune for 3 Turns. |
| Mark of Tyranny | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Dark units: • Cult of Tyranny Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Feudal - Aristocracy (Base game)

This research is available to rulers with the Feudal culture. They specialize in cheap troops and leadership.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Call to Glory | I | Combat Enchantment | 20 Mana / 25 CCP | - | For 3 Turns all friendly units gain: • +5 Morale at the start of your Turn. |
| Call Militia | III | Summon Spell | 60 Gold / 60 WCP | - | Summon 2 Militia in the target owned City. Summons: Militia (Tier I Polearm, HP 70, Def 1, Res 0) |
| Hold the Line | III | Buff Spell | 10 Mana / 15 CCP | - | Friendly units in a 1-hex radius for 1 Turn gain: • Defensive Masters • Charge Resistance |

#### Feudal - Monarchy (Base game)

This research is available to rulers with the Feudal culture. They specialize in cheap troops and leadership.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Call to Glory | I | Combat Enchantment | 20 Mana / 25 CCP | - | For 3 Turns all friendly units gain: • +5 Morale at the start of your Turn. |
| Call Militia | III | Summon Spell | 60 Gold / 60 WCP | - | Summon 2 Militia in the target owned City. Summons: Militia (Tier I Polearm, HP 70, Def 1, Res 0) |
| Monarch's Decree | III | Combat Enchantment | 30 Mana / 25 CCP | - | For 2 Turns, all friendly units gain the benefit from For the Monarch as though the Monarch were present. |

#### General Research (Base game)

Every aspiring Godir knows the basics of spellcasting, which helps when exploring new uncharted realms.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Enchanted Crow Companion | I | Unit Enchantment | 70 Mana / 70 WCP | - | Grants +2 Vision Range on the World Map. Applies to: Scout Unit. |
| Wayfinder Enchantment | I | Unit Enchantment | 40 Mana / 40 WCP | - | When enchanted units rout in combat: • They never die. • They return 2 Turns sooner. Applies to: Scout Unit. |

#### High (Base game)

This research is available to rulers with the High culture. They specialize in buffing allies and diplomacy.

- **Passive — Alignment Agenda:** The High Culture has an Alignment Agenda, which grants bonuses for the following alignment levels: • Pure Good: 25 City Stability in all Cities. • Alignment Neutral: 10 Food and 10 Production per City Stability level above Neutral in all Cities. • Pure Evil: Units start Combat in an Awakened state.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Awaken Inner Radiance | I | Buff Spell | 10 Mana / 15 CCP | - | Friendly units in a 1-hex radius become Awakened for 3 Turns. If already Awakened, a unit gains Strengthened instead. |
| Warding Blessing | II | Healing/Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit: • Heals +20 Temporary Hit Points • Gains 2 Bolstered Resistance |
| Dormant Enchantment | III | Unit Enchantment | 80 Mana / 80 WCP | - | Grants non-High units: • Dormant: Guardian if a Polearm Unit or Fighter Unit. • Dormant: Shield of Light if a Shield Unit, Shock Unit, or Mythic Unit. • Dormant: Seeking Arrows if a Ranged Unit or Skirmisher Unit. • Dormant: Radiant Light if a Battle Mage Unit or Magic Fighter Unit. • The Awaken ability and Dormant: Radiant Light if a Support Unit. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Industrious (Base game)

This research is available to rulers with the Industrious culture. They specialize in defenses and exploiting natural resources.

- **Passive — Scout Prospecting:** When Industrious Scout Units stand within a friendly or neutral Province that contains a Cliff, Mountain or Stalagmite, the player that owns the Scout Unit can prospect the Province for Production or Gold rewards. Each Province can only be prospected once.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Bolstering Chant | I | Healing/Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit: • Heals +20 Temporary Hit Points. • Gains 2 Bolstered Defense. |
| Steelfury Chant | II | Buff Spell | 15 Mana / 20 CCP | - | All friendly units lose all stacks of Bolstered Defense and Bolstered Resistance. For each stack lost they gain: • Strengthened • Fortune |
| Rune of Industry | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Industrious units: • Bolstering, which increases defense when they sustain damage. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Mystic - School of Attunement (Base game)

This research is available to rulers with the Mystic culture. They specialize in magic damage and spellcasting.

- **Passive — Astral Echoes:** Mysterious whispers of the Astral Sea, only visible to and collectible by Mystics.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Astral Divination | I | World Spell | 100 Mana / 300 WCP | - | Create and reveal new Astral Echoes in provinces near your domain. |
| Magic Shield | II | Buff Spell | 5 Mana / 10 CCP | - | Target unit gains: • 2 Bolstered Defense for 3 Turns. • 2 Bolstered Resistance for 3 Turns. |
| Scroll of Attunement | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Mystic units: • Attunement: Star Blades, which increases damage dealt when spells are cast. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Mystic - School of Potential (Base game)

This research is available to rulers with the Mystic culture. They specialize in magic damage and spellcasting.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Cosmic Ablation | I | Damage Spell | 10 Mana / 15 CCP | - | Target unit sustains: • 10 Lightning Damage • 10 Fire Damage • 10 Frost Damage |
| Arcane Studies | II | City Spell | 45 Mana / 45 WCP | - | For 10 Turns, target owned city: • Contributes 1 Arcane Inspiration to a random spell each Turn. |
| Ciphers of Dissonance | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Mystic units: • Ciphers of Dissonance, which inflicts Dissonance on enemy units. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Mystic - School of Summoning (Base game)

This research is available to rulers with the Mystic culture. They specialize in magic damage and spellcasting.

- **Passive — Astral Echoes:** Mysterious whispers of the Astral Sea, only visible to and collectible by Mystics.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Astral Divination | I | World Spell | 100 Mana / 300 WCP | - | Create and reveal new Astral Echoes in provinces near your domain. |
| Conjure Astral Ward | I | Combat Summon Spell | 30 Mana / 25 CCP | - | Summon an Immobile Astral Ward. This summon lasts for 3 Turns. Summons: Astral Ward (Tier I ?, HP 25, Def 0, Res 0) |
| Conjure Summoning Rift | I | World Spell | 60 Mana / 60 WCP | - | Conjures a Summoning Rift on an empty hex in the target Province. This structure: • Allows summoning spells to be cast on or adjacent to it. • Provides vision in 5-hex radius. • Units in this province gain regenerate +15 Hit Points per Turn. • During combat in this province friendly Combat Summon Spells are 20% cheaper to cast. |
| Scroll of Astral Connection | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Mystic non-Magic Origin units: • Astral Connection. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Eldritch Pact (Eldritch Realms)

These boons can be purchased from an Umbral Dwelling by reaching an Eldritch Pact with them. They help your Empire adapt to the Umbral Abyss and spread Gloom.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Conduit Altar of Marching Gloom | III | Special Province Improvement | 60 Gold 130 Production | - | • +10 Mana income. • Every Turn, 1 Province within a radius equal to the City Tier: • Gains Gloom. • Loses Chasm, River, Swamp, Sand, Snow, Ice, and Ashlands. • Counts as a Conduit. Requirement: Must be built on an annexed Province. Requires City Tier II. |
| Summon Umbral Juggernaut | III | Summon Spell | 150 Mana / 150 WCP | - | Summons an Umbral Juggernaut on target hex. Summons: Umbral Juggernaut (Tier III Shock, HP 100, Def 4, Res 2) |
| Umbral Exile | III | Debuff Spell | 45 Mana / 30 CCP | - | Target unit has a base 60% chance of: • Being immediately removed from combat. • Appearing at a random location in the Umbral Abyss after battle. • If unsuccessful, inflicts Stunned for 1 Turn instead. Cannot be used in Water Combat. |
| Umbral Flesh | III | Minor Race Transformation | 250 Mana / 250 WCP | - | Gives the target race blessings of the Umbral Abyss, granting them: • Umbral Malady Immunity • While in Gloom terrain units gain: • +10 Morale • +12 Hit Point per Turn on the world map. • Cities of the race: • Gain +2 Knowledge income for each province with Gloom terrain. • Ignore City Stability penalties from Gloom terrain. • Hero units gain Gloom Shepherd. This transformation is incompatible with Pure Soul. |
| Pall of Gloom | VII | Terraforming Spell | 150 Mana / 150 WCP | - | Target Province and adjacent Provinces: • Gain Gloom • Lose Chasm, River, Sand, Snow, Ice, Ashlands, Swamp, Cavern Floor, and Dungeon. • Enemy Units suffer 10 Frost Damage and 10 Blight Damage. |
| Umbral Rift | VII | Sustained World Spell | 100 Mana / 100 WCP | 10 Mana | Create an Umbral Rift in the target Umbral Abyss province, and another nearby on the Surface layer. |
| Ritual of the Gloomveil | X | Sustained World Spell | 300 Mana / 300 WCP | 30 Mana | All Units in your Empire gain Umbral Malady Immunity. |

#### Reaver - Federated (Empires & Ashes)

This research is available to rulers with the Reaver culture. They use Magelock technology.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Sundering Barrage | I | Damage/Debuff Spell | 15 Mana / 20 CCP | - | Units in a 1-hex radius: • Suffer 10 Physical Damage. • Have a 90% chance of inflicting Sundered Defense for 3 Turn |
| Revitalizing Alliance | II | Healing Spell | 15 Mana / 20 CCP | - | Heal target friendly unit: • Federate Soldier units: • +10 Temporary Hit Points • +5 Temporary Hit Points for each friendly Federate Levy in battle. • Federate Levy units: • +10 Temporary Hit Points • +5 Temporary Hit Points for each friendly Federate Soldier in battle. This effect jumps to 2 additional targets within 3 hexes. |
| Banner of the Federation | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Reaver units: • Federate Soldier Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Reaver - Imperial (Empires & Ashes)

This research is available to rulers with the Reaver culture. They use Magelock technology.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Suppressing Barrage | I | Damage/Debuff Spell | 15 Mana / 20 CCP | - | Units in a 1-hex radius: • Suffer 10 Physical Damage. • Have their Defense Mode canceled and Retaliation Attacks removed. |
| Designate Target | II | Debuff Spell | 15 Mana / 20 CCP | - | Target enemy gains: • 2 Marked • Immobilized |
| Engraving of Focus | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Reaver units: • Focused Aggression. Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Crystal Pact (Giant Kings)

These boons can be purchased from a Crystal Dwelling by reaching a Crystal or Eternal pact with them. They will give you access to Lithorine units and the power of the Eternals.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Lithorine Core | II | Unit | 80 Draft 60 Mana | upkeep 8 Gold | **Lithorine Core** (Tier I Support; 80 Draft 60 Mana; upkeep 8 Gold; HP 60, Def 0, Res 2, Status res 2, MP 40) — Abilities: Crystal Blast, Core Link, Defense Mode: Warding. Passives: Crystal Reflection, Natural Regeneration. A Support Unit that can link to units and take their damage for them. Draftable in cities. |
| Lithorine Needler | III | Unit | 140 Draft 100 Mana | upkeep 12 Gold | **Lithorine Needler** (Tier II Ranged; 140 Draft 100 Mana; upkeep 12 Gold; HP 65, Def 1, Res 1, Status res 0, MP 40) — Abilities: Crystal Shots, Defense Mode. Passives: Crystal Reflection. A Ranged Unit with a ranged attack that applies Volatile Charge. Draftable in cities. |
| Crystal Crash | V | Damage/Debuff Spell | 80 Mana / 35 CCP | - | Enemy units in a 1-hex radius: • Sustain 15 Physical Damage. • Sustain 15 Lightning Damage. • Have a base 90% chance of inflicting Volatile Charge for 2 Turns. |
| Crystal Focus | V | Unit Enchantment | 100 Mana / 100 WCP | - | Attacks of enchanted units gain: • A base 60% chance of applying Volatile Charge. Applies to: Support Unit, Battle Mage Unit, Magic Fighter Unit. |
| Lithorine Gemcaster | V | Unit | 300 Draft 200 Mana | upkeep 30 Gold 3 Imperium | **Lithorine Gemcaster** (Tier IV Battle Mage; 300 Draft 200 Mana; upkeep 30 Gold 3 Imperium; HP 95, Def 2, Res 4, Status res 7, MP 40) — Abilities: Crystal Bolts, Gemstream, Reactive Flicker, Defense Mode. Passives: Crystal Reflection. A Battle Mage Unit that inflicts Volatile Charge in a large area. Draftable in cities. |
| Lithorine Shardlancer | V | Unit | 220 Draft 140 Mana | upkeep 20 Gold | **Lithorine Shardlancer** (Tier III Polearm; 220 Draft 140 Mana; upkeep 20 Gold; HP 100, Def 5, Res 2, Status res 3, MP 40) — Abilities: Melee Strike, Pinning Thrust, Defense Mode. Passives: Charge Resistance, Crystal Reflection, First Strike. A Polearm Unit that immobilizes enemies. Draftable in cities. |
| Crystallize Essence | VII | Combat Summon Spell | 100 Mana / 40 CCP | - | Revive target non-Lithorine non-Hero unit as a Lithorine of its Tier. If victorious in combat, units revived can be kept for a Mana cost. |
| Eternal Embassy | VII | City Structure | 280 Gold 750 Production | - | • 15 Mana • 15 Knowledge • 10 Imperium |
| Lithorine Simulacrum | VII | Unit | 300 Draft 300 Mana | upkeep 60 Gold 7 Imperium | **Lithorine Simulacrum** (Tier V Mythic; 300 Draft 300 Mana; upkeep 60 Gold 7 Imperium; HP 150, Def 6, Res 7, Status res 11, MP 40) — Abilities: Crystal Charge, Chain Reaction, Defense Mode. Passives: Control Loss Immunity, Crystal Reflection, Demolisher, Reactive Core. A Mythic Unit with a strong charge attack and the ability to create a chain of lightning that can trigger Volatile Charge. Draftable in cities. |

#### Primal - Ash Sabertooth (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Ash Sabertooth** (Primal SubCulture - Sabertooth - Hero Skill Group): Avatar of the Ash Sabertooth: At the start of combat in a province with Ashlands, all friendly units with Ash Sabertooth's Boon start combat with 3 Fury of the Ash Sabertooth.

- **Passive — Ash Sabertooth Den:** Can see Ash Sabertooth Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow an Ash Sabertooth Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Sabertooth | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Sabertooth. This summon lasts for 3 Turns. Summons: Primal Sabertooth (Tier II Mythic, HP 70, Def 2, Res 2) |
| Sabertooth Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Ash Sabertooth's Boon • Desolate Walk Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Primal - Dune Serpent (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Dune Serpent** (Primal SubCulture - Serpent - Hero Skill Group): Avatar of the Dune Serpent: At the start of combat in a province with Sand, all friendly units with Dune Serpent's Boon start combat with 3 Fury of the Dune Serpent.

- **Passive — Dune Serpent Den:** Can see Dune Serpent Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow a Dune Serpent Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Serpent | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Serpent. This summon lasts for 3 Turns. Summons: Primal Serpent (Tier II Mythic, HP 70, Def 2, Res 2) |
| Serpent Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Dune Serpent's Boon • Sand Walk Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Primal - Glacial Mammoth (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Glacial Mammoth** (Primal SubCulture - Mammoth - Hero Skill Group): Avatar of the Glacial Mammoth: At the start of combat in a province with Snow, all friendly units with Glacial Mammoth's Boon start combat with 3 Fury of the Glacial Mammoth.

- **Passive — Glacial Mammoth Den:** Can see Glacial Mammoth Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow a Glacial Mammoth Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Mammoth | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Mammoth. This summon lasts for 3 Turns. Summons: Primal Mammoth (Tier II Mythic, HP 80, Def 1, Res 2) |
| Mammoth Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Glacial Mammoth's Boon • Arctic Walk Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Primal - Mire Crocodile (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Mire Crocodile** (Primal SubCulture - Crocodile - Hero Skill Group): Avatar of the Mire Crocodile: At the start of combat in a province with Swamp, all friendly units with Mire Crocodile's Boon start combat with 3 Fury of the Mire Crocodile.

- **Passive — Mire Crocodile Den:** Can see Mire Crocodile Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow a Mire Crocodile Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Crocodile | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Crocodile. This summon lasts for 3 Turns. Summons: Primal Crocodile (Tier II Mythic, HP 70, Def 2, Res 2) |
| Crocodile Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Mire Crocodile's Boon • Swamp Walk • Status Effect Immunity: Diseased Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Primal - Storm Crow (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Storm Crow** (Primal SubCulture - Crow - Hero Skill Group): Avatar of the Storm Crow: At the start of combat in a province with Grasslands, all friendly units with Storm Crow's Boon start combat with 3 Fury of the Storm Crow.

- **Passive — Storm Crow Den:** Can see Storm Crow Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow a Storm Crow Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Crow | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Crow. This summon lasts for 3 Turns. Summons: Primal Crow (Tier II Mythic, HP 60, Def 1, Res 1) |
| Crow Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Storm Crow's Boon • Grassland Walk Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Primal - Sylvan Wolf (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Sylvan Wolf** (Primal SubCulture - Wolf - Hero Skill Group): Avatar of the Sylvan Wolf: At the start of combat in a province with Forest, all friendly units with Sylvan Wolf's Boon start combat with 3 Fury of the Sylvan Wolf.

- **Passive — Sylvan Wolf Den:** Can see Sylvan Wolf Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow a Sylvan Wolf Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Wolf | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Wolf. This summon lasts for 3 Turns. Summons: Primal Wolf (Tier II Mythic, HP 70, Def 2, Res 2) |
| Wolf Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Sylvan Wolf's Boon • Forest Walk Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Primal - Tunneling Spider (Primal Fury)

This research is available to rulers with the Primal culture. They specialize in spiritual communion and empowerment.

- **Hero skill unlocked — Avatar of the Tunneling Spider** (Primal SubCulture - Spider - Hero Skill Group): Avatar of the Tunneling Spider: At the start of combat in a province with Mushroom Forest, all friendly units with Tunneling Spider's Boon start combat with 3 Fury of the Tunneling Spider.

- **Passive — Tunneling Spider Den:** Can see Tunneling Spider Den nodes which when annexed to a city: • Grant +15 City Stability. • Allow a Tunneling Spider Temple to be built.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Ancestral Harmony | I | Healing Spell | 5 Mana / 10 CCP | - | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Sylvan Wolf is active, heal twice the amount. |
| Conjure Primal Spider | II | Combat Summon Spell | 45 Mana / 30 CCP | - | Summon a Tier 2 Primal Spider. This summon lasts for 3 Turns. Summons: Primal Spider (Tier II Mythic, HP 70, Def 2, Res 2) |
| Spider Primal Communion | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Tunneling Spider's Boon • Cave Walk Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Nomad - Conquerors (Rise from Ruin)

This research is available to Rulers with the Nomad culture. They specialize in mobility.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Swiftstrike Blessing | I | Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit that has action points remaining and another within 3 hexes gain: • Momentum for 1 Turn. • Fortune for 3 Turns. |
| Watchful Eye | I | World Spell | 45 Mana / 45 WCP | - | Target province: • Provides vision in a 3 hex-radius from the province center. • Enemy units in this province suffer Marked. Lasts for 3 Turns. |
| Chimes of Momentum | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Empowering Momentum Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Nomad - Scavengers (Rise from Ruin)

This research is available to Rulers with the Nomad culture. They specialize in mobility.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Empowering Trophies | I | Buff Spell | 10 Mana / 15 CCP | - | Target friendly unit with Scavenger: • Gains +1 Looted Power |
| Improvised Remedy | I | Healing Spell | 10 Mana / 15 CCP | - | All friendly units with Looted Power: • Heal for 10 Temporary Hit Points. • Have their Negative Status Effects removed. |
| Scavenger's Bags | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grant non-Culture units: • Scavenger Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Oathsworn - Harmony (Ways of War)

This research is available to rulers with the Oathsworn culture. They specialize in martial combat and devotion to their ways.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Counter Stance | I | Buff Spell | 5 Mana / 10 CCP | - | Friendly units in a 1-hex radius gain, for 1 Turn: • First Strike • An extra Retaliation Attack • Defensive Masters |
| Devout Radiance | II | Damage Spell | 10 Mana / 15 CCP | - | Enemy units in a 1-hex radius sustain 10 Spirit Damage. Damage changes based on your Devotion level. |
| Pledge of Harmony | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Culture units: • Harmonize Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Oathsworn - Righteousness (Ways of War)

This research is available to rulers with the Oathsworn culture. They specialize in martial combat and devotion to their ways.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Counter Stance | I | Buff Spell | 5 Mana / 10 CCP | - | Friendly units in a 1-hex radius gain, for 1 Turn: • First Strike • An extra Retaliation Attack • Defensive Masters |
| Devout Radiance | II | Damage Spell | 10 Mana / 15 CCP | - | Enemy units in a 1-hex radius sustain 10 Spirit Damage. Damage changes based on your Devotion level. |
| Pledge of Righteousness | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Culture units: • Nobility Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

#### Oathsworn - Strife (Ways of War)

This research is available to rulers with the Oathsworn culture. They specialize in martial combat and devotion to their ways.

| Research skill | Skill tier | Type | Cost / casting points | Upkeep | Effect |
|---|---|---|---|---|---|
| Counter Stance | I | Buff Spell | 5 Mana / 10 CCP | - | Friendly units in a 1-hex radius gain, for 1 Turn: • First Strike • An extra Retaliation Attack • Defensive Masters |
| Devout Radiance | II | Damage Spell | 10 Mana / 15 CCP | - | Enemy units in a 1-hex radius sustain 10 Spirit Damage. Damage changes based on your Devotion level. |
| Pledge of Strife | III | Unit Enchantment | 90 Mana / 90 WCP | - | Grants non-Culture units: • Warrior's Soul Applies to: Shield Unit, Ranged Unit, Polearm Unit, Support Unit, Shock Unit, Battle Mage Unit, Mythic Unit, Fighter Unit, Skirmisher Unit, Magic Fighter Unit. |

## PART 2 — AFFINITY & EMPIRE DEVELOPMENT (complete node list)

Each affinity branch has 10 levels; a level unlocks once your accumulated affinity points in that branch reach the *Affinity needed* threshold (15/40/60/100/120/160/200/300/400/500). Every node is then bought with Imperium. Rites are one-shot effects that can be repeated: after use they go on cooldown (turns) and their Imperium cost rises by the listed amount per repeat. The General branch is gated by empire level (total affinity) rather than one affinity.

### 2.0 Where affinity points come from

Your empire's **affinity score** in each of the six branches is a static total of the points below. Each turn that score is added to the branch's *accumulated affinity* (the "Affinity needed" column in the tables that follow), which unlocks empire-tree levels; the static score is also what tome tier prerequisites (3 / 6 / 8) check.

| Source | Points |
|---|---|
| Every single-affinity tome unlocked | +2 in that affinity |
| Every dual-affinity tome unlocked | +1 in each of its two affinities |
| Tome of the Cosmos (T5, Secrets of the Archmages) | +1 in all six affinities and +1 Alignment |
| Culture chosen at faction creation | Feudal: +1 Order; Barbarian: +1 Chaos, +1 Nature; Architect: none (Architect adapts to your dominant affinity); Industrious: +2 Materium; High: +2 Order; Dark: +1 Shadow; Nomad: +1 Chaos; Mystic: +1 Astral; Oathsworn: +1 Order; Reaver: +1 Materium; Primal: +1 Nature |
| Society traits (faction creation; each costs 1 trait point unless noted) | Adept Settlers (1 Nature Affinity); Ancient Wise Ones (1 Astral Affinity); Apex Predators (1 Nature Affinity, -10 Alignment); Astrological Diviners (1 Astral Affinity); Bannerlords (1 Order Affinity); Cannibals (-1 Order Affinity); Chosen (1 Order Affinity); Chosen Destroyers (1 Chaos Affinity, -10 Alignment); Chosen Uniters (10 Alignment, 1 Order Affinity); Cult of Personality (1 Shadow Affinity); Devious Watchers (1 Shadow Affinity); Devotees of Good (1 Order Affinity, 10 Alignment); Doomed (1 Chaos Affinity); Druidic Terraformers (1 Nature Affinity); Empire of the Cosmos (1 Astral Affinity); Equipment Hoarders (1 Materium Affinity); Experienced Seafarers (1 Nature Affinity); Fabled Hunters (1 Nature Affinity); Gifted Casters (1 Astral Affinity); Great Builders (1 Materium Affinity); Hermit Kingdom (1 Astral Affinity); Imperialists (1 Order Affinity); Keepers of Knowledge (10 Alignment, 1 Shadow Affinity); Lucky Ones (1 Chaos Affinity); Malformed (-1 Nature Affinity); Mana Addicts (1 Astral Affinity); Mana Channelers (1 Astral Affinity); Merciless Slavers (1 Chaos Affinity, -10 Alignment); Perfectionist Artisans (1 Materium Affinity); Powerful Evokers (1 Shadow Affinity); Prolific Swarmers (1 Chaos Affinity); Reclaimers (1 Materium Affinity); Regenerating (1 Nature Affinity); Relentless Crusaders (1 Order Affinity, 10 Alignment); Ritual Cannibals (1 Chaos Affinity, -10 Alignment); Runesmiths (1 Materium Affinity); Ruthless Raiders (1 Chaos Affinity, -10 Alignment); Scions of Evil (1 Shadow Affinity, -10 Alignment); Seekers of Wonders (1 Materium Affinity); Silver Tongued (1 Shadow Affinity); Spider Worshippers (1 Nature Affinity); Subterranean Society (1 Materium Affinity); Swift Marchers (1 Chaos Affinity); Talented Collectors (1 Nature Affinity); Transformation Ascetics (1 Order Affinity); Umbral Disciples (-10 Alignment, 1 Shadow Affinity); Umbral Thralls (-100 Alignment); Verminous (-1 Order Affinity); Vigilante Knights (1 Order Affinity) |
| Destiny marks (ruler council traits) | (unnamed) (1 Nature Affinity); (unnamed) (1 Order Affinity); Mark of the Owl (2 Shadow Affinity); Mark of the Hoard (2 Materium Affinity); Mark of the Dove (10 Alignment); Mark of the Butcher (-10 Alignment); Mark of the Wildspeaker (2 Nature Affinity); Mark of the Sword (2 Chaos Affinity); Mark of the Tower (2 Order Affinity); Mark of the Conflux (2 Astral Affinity) |
| General empire skills | Cosmic Affinity: +5 accumulated affinity per turn in every branch with score ≥ 3; Focused Affinity: +50 per turn in your highest branch |
| Ruler alignment, pantheon/ascension perks, some realm traits | small ± modifiers (not enumerated in the data dump) |

### General Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| - | - | Advanced Seafaring | 175 Imperium | The movement cost of embarking is reduced while Embarked Units gain Very Fast Movement. |
| 2 | 40 | Basic Seafaring | 100 Imperium | Unlocks the ability for Units to embark and use vessels to cross the water, and for Flying and Floating units to travel over water. |
| 3 | 60 | Excavation | 125 Imperium | Unlocks the ability for Units to Excavate Earthen terrain in the Underground. |
| 4 | 100 | Road Building | 125 Imperium | Unit can build roads on the World Map. Most terrain costs 6-8 Move Points while roads cost 5. Road Building can be enabled in the Army panel. Roads are built on hexes along which the Army moves and cost 3 Gold per hex. |
| 5 | 120 | Diplomatic Focus | 150 Imperium | Gain +1 Whispering Stone. |
| 6 | 160 | Advanced Sensing | 150 Imperium | Your Units and Cities gain +2 Vision Range and +3 Sensing Range. |
| 6 | 160 | Wizard King | 100 Imperium | Gain +10 Casting Points. |
| 7 | 200 | Forced March | 175 Imperium | Unlocks the ability for your Armies to use Forced March. |
| 8 | 300 | Siege Specialization | 175 Imperium | Gain +1 Siege Project slot. |
| 9 | 400 | Advanced Logistics | 175 Imperium | Roads cost 3 Move Points instead of 5. Units gain Fast Embark and while embarked they gain Very Fast Movement on the World Map. |
| 10 | 500 | Teleporter Infrastructure | 200 Imperium | Cities can now build Teleporters. Outposts can build teleporters in a province they annex through a Work Camp. |
| 11 | 600 | Cosmic Affinity | 250 Imperium | Gain +5 Affinity Points per Turn in every branch where you have at least 3 Affinity. |
| 11 | 600 | Focused Affinity | 250 Imperium | Gain +50 Affinity Points per Turn in the branch of your highest Affinity. |

### Repeatable General Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 4 | 100 | Expanded Governance | 200 Imperium | 0 | 300 Imperium | Increase the City Cap by +1. |
| 5 | 120 | Rite of the Last Stand | 175 Imperium | 120 | 50 Imperium | Each city in your Empire loses -1 Population, but immediately summons 3 Tier I Units. |

### Order Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| 1 | 15 | Aligned Relations | 100 Imperium | You gain +300 Relations with every Free City whose alignment does not oppose yours. |
| 1 | 15 | Pacification | 100 Imperium | Destroying an Infestation grants a stacking +20 City Stability to all your Cities for 10 Turns. |
| 2 | 40 | Diplomatic Expertise | 125 Imperium | • You gain +1 Whispering Stone. • Whispering Stones grant +1 Allegiance. |
| 2 | 40 | Gold Infrastructure | 125 Imperium | Gold City Structures cost -25% Gold and Production. |
| 3 | 60 | Cultural Exchangers | 150 Imperium | • Gain +4 Knowledge per active Wizards Bond, Treaty, or Declaration with other Empires. • Gain +4 Knowledge per Trade Treaty with Free Cities. |
| 3 | 60 | Spiritual Conviction | 150 Imperium | Cities gain +10 Mana for each City Stability above Neutral. |
| 4 | 100 | Dutiful Watch | 175 Imperium | • Cities gain +1 City Stability per Unit tier of each friendly Unit inside the City. (Heroes count as Tier 5). • Friendly Units inside your Cities gain +5 Experience Per Turn. |
| 5 | 120 | Oaths of Vengeance | 200 Imperium | Completing a Bounty grants you: • +25% more rewards. • +200% better Empire Relations with the Empire that posted it. |
| 5 | 120 | Shared Prosperity | 200 Imperium | Gold City Structures grant +10 City Stability and +5 Production income. |
| 6 | 160 | Benevolent Conquerors | 250 Imperium | Converting conquered Cities into Vassals takes -2 Turns and does not give a Relations penalty. |
| 6 | 160 | Bonds of Brotherhood | 250 Imperium | • You gain +5 Imperium income per Defensive Pact you have with other Rulers. • You gain +15 Imperium income per Alliance you have with other Rulers instead. |
| 7 | 200 | Blessings and Wards | 300 Imperium | • Healing Spells and Buff Spells cost -25% Mana and Combat Casting Points. • Friendly Army Spells cost -25% Mana and World Map Casting Points. |
| 8 | 300 | Call to Arms | 350 Imperium | Units from Rally of the Lieges: • Cost -50% Gold. • Gain +2 starting ranks. |
| 8 | 300 | Lead by Example | 350 Imperium | Armies led by Heroes gain +5 Morale for each level of Renown they have. |
| 9 | 400 | Absolute Loyalty | 400 Imperium | Vassals grant +40% income when at Supreme Vassalage. |
| 9 | 400 | Utopian Society | 400 Imperium | Cities gain +10% income when at the highest City Stability level. |
| 10 | 500 | Order of Knightly Oaths | 500 Imperium | Units of Legendary Rank gain a buff depending on their unit type. • Shield Units gain Order of the Unbreakable. • Polearm Units gain Order of the Tyrantslayer. • Shock Units gain Order of the Thunderer. • Skirmisher Units gain Order of the Windborne. • Support Units gain Order of the Soulwarden. • Battle Mage Units gain Order of the Warmage. • Ranged Units gain Order of the Titanslayer. • Fighter Units gain Order of the Berserker. • Mythic Units gain Order of the Indomitable. • Magic Fighter Units gain Order of the Spellblade. |

### Order Repeatable Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 4 | 100 | Rite of Allegiance | 175 Imperium | 100 | 50 Imperium | Instantly gain 20 Allegiance with all non-hostile Free Cities. |
| 7 | 200 | Rite of Wealth | 300 Imperium | 200 | 50 Imperium | Instantly gain 2000 Gold. |
| 10 | 500 | Rite of the Banners | 500 Imperium | 500 | 50 Imperium | Call a Rally of the Lieges event, where you have 20 additional Recruitment Points. |

### Chaos Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| 1 | 15 | War Industry | 100 Imperium | Quarry Quarries grant +5 Draft income. |
| 1 | 15 | War Infrastructure | 100 Imperium | Draft City Structures cost -25% Gold and Production. |
| 2 | 40 | Iron Rule | 125 Imperium | Draft City Structures grant +10 City Stability income. |
| 2 | 40 | Specialized Troops | 125 Imperium | Unit Research skills cost -25% Knowledge. Units unlocked through Research cost -25% Gold to draft in your Cities. |
| 3 | 60 | Battlefield Looting | 150 Imperium | Gain 3 Gold per Unit Tier of the Units killed in Combat. |
| 3 | 60 | Might Makes Right | 150 Imperium | • Tier 3, 4, and 5 units gain +5 Hit Point for each Tier 1 and 2 unit in the same army. • Tier 1 and 2 units gain +2 Experience per Turn for each Tier 3, 4, and 5 unit in the same army. |
| 4 | 100 | Chaotic Inspiration | 175 Imperium | Whenever a new Research Skill is being researched, the Knowledge cost of another random Skill is reduced by -25%. |
| 5 | 120 | Otherworldly Reinforcements | 200 Imperium | • Summon Spells cost -25% World Map Casting Point. • Combat Summon Spells cost -25% Combat Casting Point. |
| 5 | 120 | Skilled Raiders | 200 Imperium | Pillaging a Province takes -1 turns and yields +20% more rewards. Pillaging Units are healed for 20 Hit Points. |
| 6 | 160 | Destiny of War | 250 Imperium | 30 Grievances against all other Empires. These cannot be traded or lost. Your Throne City gains +30 Gold and +30 Mana per active War you are involved in. |
| 7 | 200 | Conquerors | 300 Imperium | Absorbing and Migrating Cities take -2 Turns. Absorbed and Migrated Cities permanently gain +20 Food, +20 Production, and +20 City Stability. |
| 7 | 200 | Despoilers | 300 Imperium | Razing a City: • Takes -2 Turns. • Gives 30 Gold per Population killed. • Gives 100 Food per Population killed to one of your cities. |
| 8 | 300 | First Blood Initiation | 350 Imperium | Your Units gain +25% Critical Hit Chance. They lose 5% of this bonus for each Rank they have. |
| 8 | 300 | Lawless Lands | 350 Imperium | While in unowned Provinces, your Units regenerate +15 Hit Point per turn and gain +5 Experience per turn. |
| 9 | 400 | Monstrous Elites | 400 Imperium | Your Mythic Units gain +5 Hit Points for each Rank that they have, up to Legendary. |
| 9 | 400 | Resilient Hordes | 400 Imperium | Your Tier 1 Unit gain +30 maximum Hit Points, +2 Defense, and Resistance. Your Tier 2 Units gain +20 maximum Hit Points, +1 Defense, and Resistance. |
| 10 | 500 | Tireless Armies | 500 Imperium | Your Units gain Exhausted Immunity. |

### Repeatable Chaos Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 4 | 100 | Rite of War | 175 Imperium | 100 | 50 Imperium | All your Cities immediately gain 400 Draft. |
| 6 | 160 | Rite of Chosen Warriors | 250 Imperium | 160 | 50 Imperium | Your Units all immediately gain enough Experience to level up. Does not affect Heroes and units above Legendary rank. |
| 10 | 500 | Rite of Fanaticism | 500 Imperium | 500 | 50 Imperium | All of your Units gain the following for 5 Turns: • Resurgence • Martyr |

### Nature Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| 1 | 15 | Food Infrastructure | 100 Imperium | Food City Structures cost -25% Gold and Production to build. |
| 1 | 15 | Fruitful Integration | 100 Imperium | Founding or Absorbing Cities takes -2 turns. Newly Founded or Absorbed Cities gain +1 Population. |
| 2 | 40 | Prosperous Lands | 125 Imperium | Farms grant +3 Gold and +2 City Stability income. |
| 2 | 40 | Tree Keepers | 125 Imperium | Foresters grant +2 Mana and +2 City Stability income. |
| 3 | 60 | Foraging | 150 Imperium | While in Friendly domain, your Units regenerate +10 Hit Point per turn and gain +2 Experience per turn. |
| 3 | 60 | Symbiotic Armies | 150 Imperium | Your non-Racial Units gain +5 Hit Point and +2 Experience per Turn for each Racial Unit in the same Army. |
| 4 | 100 | Cooperating Community | 175 Imperium | Food City Structures grant +10 Production income. |
| 4 | 100 | Fields of Fertility | 175 Imperium | Provinces in your domain without Resource Nodes generate +5 Food income. |
| 5 | 120 | Adapt and Overcome | 200 Imperium | Your Units gain Status Protection for 3 Turns whenever they gain the first Negative Status Effect that Turn in Combat. |
| 5 | 120 | Lasting Boons | 200 Imperium | Positive Status Effects on your Units which last at least 2 Turns, last an additional 1 Turn. |
| 6 | 160 | Expansive Reach | 250 Imperium | Cities may expand to Provinces located 2 Province further from the center. |
| 7 | 200 | Sacred Waters | 300 Imperium | Coast, River, and Water Provinces grant +2 Knowledge income. Rivers cost 4 Move Points to traverse. |
| 7 | 200 | Spiritual Grounds | 300 Imperium | Food Resource Nodes grant +5 Knowledge income. |
| 8 | 300 | Plowshares To Swords | 350 Imperium | Your Cities gain Draft income equal to 25% of their Food income. |
| 9 | 400 | Well Supplied | 400 Imperium | Your Units gain Well Supplied at the start of their Turn in the World Map if they are within your Domain, which lasts for 5 Turns outside of your Domain. |
| 10 | 500 | Complete Harmony | 500 Imperium | Each Population costs no Food upkeep and grants +3 City Stability income. Your Cities gain +15 maximum Population, raising it from 30 to 45. |
| 10 | 500 | Druidic Empire | 500 Imperium | Each Population in your cities grants +1 Knowledge, +1 Mana, and +1 Gold income. |

### Repeatable Nature Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 6 | 160 | Rite of Expansive Growth | 250 Imperium | 160 | 50 Imperium | Increase the City Cap by +1. |
| 8 | 300 | Rite of Awakening | 350 Imperium | 300 | 50 Imperium | Instantly gain 15 Knowledge, 15 Mana, and 15 Gold for each Population in your empire's Cities. |
| 9 | 400 | Rite of Nature's Guardians | 400 Imperium | 400 | 50 Imperium | Immediately summon a White Wolf with Resurgence and Animal Guardian and an Entwined Scourge with Resurgence and Plant Guardian in your Throne City. |

### Materium Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| 1 | 15 | Industrial Infrastructure | 100 Imperium | Production City Structures cost -25% Gold and Production to build. |
| 1 | 15 | Land Sculptors | 100 Imperium | Terraforming Spells cost -25% Mana and World Map Casting Point. |
| 2 | 40 | Metropolitan Plans | 125 Imperium | City Spells and City Structures Research cost -25% Knowledge. City Structures unlocked through Research cost -25% Gold to build. |
| 2 | 40 | Outpost Expertise | 125 Imperium | Constructing Outposts takes -1 Turn and costs -50% Gold. |
| 3 | 60 | Mythical Alloys | 150 Imperium | Mines grant +5 Mana income. |
| 3 | 60 | Purified Gold | 150 Imperium | Mines grant +5 Gold income. |
| 4 | 100 | Growing Workforce | 175 Imperium | Quarry Quarries grant +5 Food and +2 City Stability income. |
| 5 | 120 | Bastion Builders | 200 Imperium | City Defense Structures: • Cost -25% Gold and Production. • Grant +5 City Stability and +5 Production. |
| 5 | 120 | Siege Masters | 200 Imperium | Gain +1 Siege Project slot. Siege Projects cost -25% less. |
| 6 | 160 | Consolidated Industry | 250 Imperium | Province Improvements grant +2 City Stability for each adjacent Province Improvement of the same type. |
| 6 | 160 | Efficient Allocation | 250 Imperium | Production City Structures grant +10 Gold income. |
| 7 | 200 | Metropolitan Society | 300 Imperium | The Throne City and Cities that share a border with the Throne City gain +10% in all types of income. |
| 8 | 300 | Logistical Centers | 350 Imperium | Provinces adjacent to your Cities grant +100% income. |
| 9 | 400 | Formula Archives | 400 Imperium | You gain 1 Arcanium Ore, Fireforge Stone, and Focus Crystals. |
| 9 | 400 | Innovator Specialists | 400 Imperium | Special Province Improvement grant +5 Knowledge. |
| 10 | 500 | Competitive Markets | 500 Imperium | Cities gain an additional Guild Slot. |
| 10 | 500 | Wasteless Process | 500 Imperium | Produce Merchandise converts an additional 75% in Cities. |

### Repeatable Materium Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 4 | 100 | Rite of the Armorer | 175 Imperium | 100 | 50 Imperium | Immediately gain 500 Binding Essence and 250 Binding Fragments |
| 7 | 200 | Rite of Industry | 300 Imperium | 200 | 50 Imperium | All of your Cities immediately gain 500 Production. |
| 8 | 300 | Rite of Stoic Defense | 350 Imperium | 300 | 50 Imperium | All of your current Units: • Heal to their maximum Hit Points. • Gain +1 Defense and +1 Resistance, which does not stack with subsequent uses. |

### Astral Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| 1 | 15 | Mana Infrastructure | 100 Imperium | Mana City Structures cost -25% Gold and Production. |
| 1 | 15 | Supercharged Conduits | 100 Imperium | Conduits grant 3 Production and 3 Food income. |
| 2 | 40 | Ancient Studies | 125 Imperium | Ancient Wonders grant +5 Knowledge income for each Tier they have, when annexed to a City. |
| 2 | 40 | Transformative Expertise | 125 Imperium | Enchantment and Transformation Spells cost -25% Mana and World Map Casting Point. |
| 3 | 60 | Grand Casting Reserves | 150 Imperium | Gain +30 World Map Casting Points. |
| 3 | 60 | Tactical Casting Reserves | 150 Imperium | Gain +30 Combat Casting Points. |
| 4 | 100 | Summoning Bonds | 175 Imperium | • Your Magic Origin Units gain +2 Experience for each non-Magic Origin unit in the same army. • Your non-Magic Origin Units gain +1 Status Resistance for each Magic Origin unit in the same army. |
| 5 | 120 | Cosmic Breaches | 200 Imperium | Damage Spells and Debuff Spells in combat now apply Sundered Resistance to their targets. |
| 5 | 120 | Spell Warding | 200 Imperium | Buff Spells and Healing Spells in combat now apply Bolstered Resistance to the friendly targets. |
| 6 | 160 | Enchantment Attunement | 250 Imperium | Upkeep from Unit Enchantment spells is reduced by -20%. |
| 7 | 200 | Alchemical Applications | 300 Imperium | Mana Resource Nodes and Pearl Resource Nodes grant +10 Gold and +10 Production income. |
| 7 | 200 | Extravagant Studies | 300 Imperium | Mana City Structures grant +5 Knowledge income. |
| 8 | 300 | Ingredient Experimentation | 350 Imperium | Your Throne City gains +5 Gold and +5 Mana income for each Magic Material your Empire has access to. |
| 9 | 400 | Teleportation Mastery | 400 Imperium | Units are restored to full Hit Points and regain 50% of their Move Points after using a Teleporter if they have not yet regained any Move Point this turn. Teleporters grant +15 Mana income. |
| 9 | 400 | Tower of Enlightenment | 400 Imperium | All Wizard Tower City Structures grant +5 City Stability, +10 Food, and +10 Knowledge income. For Elder Vampires, Vampire Castle upgrades grant this bonus instead. |
| 10 | 500 | Astral Absorption | 500 Imperium | When an enemy player casts a spell in combat with you, gain 15 Combat Casting Point and 60 Mana. |
| 10 | 500 | Quickening | 500 Imperium | Spells can now be cast on the first Turn of Combat. |

### Repeatable Astral Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 4 | 100 | Rite of Astral Abundance | 175 Imperium | 100 | 50 Imperium | Instantly gain 750 Mana. |
| 6 | 160 | Rite of Conjuration | 250 Imperium | 160 | 50 Imperium | Create a random Magic Material near your Throne City. |
| 8 | 300 | Rite of Spell Storm | 350 Imperium | 300 | 50 Imperium | Gain 150 World Map Casting Points and Combat Casting Points until the end of the turn. |

### Shadow Empire Skills

| Level | Affinity needed | Skill | Imperium cost | Effect |
|---|---|---|---|---|
| 1 | 15 | Finders Keepers | 100 Imperium | Resource rewards from Pickups is increased by +50%. |
| 1 | 15 | Wonder Reavers | 100 Imperium | When clearing an Ancient Wonder gain: • 70 Knowledge for a Bronze Ancient Wonder. • 150 Knowledge for a Silver Ancient Wonder. • 300 Knowledge for a Gold Ancient Wonder. |
| 2 | 40 | Extracted Essence | 125 Imperium | Gain 2 Mana per Unit Tier of the Units killed in Combat. |
| 2 | 40 | Turncoat Masters | 125 Imperium | Routing Units are Captured if your side is victorious in Combat. Units recruited in this way have Low Maintenance. |
| 3 | 60 | Hexes and Curses | 150 Imperium | • Enemy Army Spells cost -25% World Map Casting Points. • Debuff Spells cost -25% Combat Casting Points. |
| 3 | 60 | Research Infrastructure | 150 Imperium | Knowledge City Structures cost -25% Gold and Production. |
| 4 | 100 | Seeing Stones | 175 Imperium | Free Cities with a Whispering Stone assigned instantly provide you with Vision Range. Free Cities or Vassals with a Whispering Stone assigned grant you +15 Knowledge. |
| 5 | 120 | Interrogation Studies | 200 Imperium | Knowledge City Structures grant +5 Mana and +5 Gold income. |
| 5 | 120 | Shadow Binding | 200 Imperium | Magic Origin base Unit Upkeep is reduced by -20%. |
| 6 | 160 | Court of Whispers | 250 Imperium | Gain the ability to assign Whispering Stones to other empires' Vassals to gain their tribute. Gain +1 Whispering Stone. |
| 7 | 200 | Dark Vigor | 300 Imperium | Your Armies regenerate +15 Hit Points per Turn in hostile Domain. |
| 7 | 200 | Feeding on Fear | 300 Imperium | Units heal 10 Hit Points for every enemy unit that Routed during combat. |
| 8 | 300 | Unnatural Recovery | 350 Imperium | After winning a battle, you can spend Mana to resurrect any of your non-hero units that died. |
| 9 | 400 | Exalted by Shadows | 400 Imperium | Your Heroes gain +200% Experience from combat. |
| 9 | 400 | Headhunters | 400 Imperium | Your non-Hero Units do +20% damage to Heroes. |
| 10 | 500 | Death Casting | 500 Imperium | Gain 10 Combat Casting Points whenever a Unit dies in combat. Doesn't affect units with: • Combat Summon • Non-Vital |
| 10 | 500 | Eyes Everywhere | 500 Imperium | Immediately reveal the full World Map. Your Throne City gains infinite Sensing Range. Armies in Sensing Range reveal their numbers and allegiance. |

### Shadow Repeatable Rites

| Level | Affinity needed | Rite | Imperium cost | Cooldown (turns) | Cost increase per use | Effect |
|---|---|---|---|---|---|---|
| 4 | 100 | Rite of Forbidden Knowledge | 175 Imperium | 100 | 50 Imperium | Instantly gain 400 Knowledge. |
| 6 | 160 | Rite of the Exalted | 250 Imperium | 160 | 50 Imperium | All your Heroes instantly gain +1 Rank. |
| 8 | 300 | Rite of Swift Shadows | 350 Imperium | 300 | 50 Imperium | Your Units immediately regain all of their Move Points and gain Universal Camouflage for 2 Turns. |

## PART 3 — SPELL SYSTEM RULES

### 3.1 Two kinds of casting points

| Pool | Used for | Refresh | Notes |
|---|---|---|---|
| **World Map Casting Points (WCP)** | Strategic spells: Summon, Unit Enchantment, World, Terraforming, City, Sustained City/World, Friendly/Enemy Army spells, Race Transformations, the Bind/Age-of victory spells | Per world turn | A strategic spell whose casting-point cost exceeds your per-turn WCP is **channelled across several turns** — the spell sits in the casting slot and receives your WCP each turn until the cost is met (cost ÷ WCP per turn, rounded up). Only one strategic spell channels at a time. |
| **Combat Casting Points (CCP)** | Tactical spells: Damage, Debuff, Buff, Healing, Combat Summon, Combat Enchantment | Per battle (full pool at the start of every combat you fight, even several in one turn) and topped up each combat round | Base rule (wiki): you cannot cast in combat round 1 — the Astral empire skill *Quickening* lifts this. Spells can be cast only when the current pool covers the cost, so expensive tactical spells (Time Stop 65 CCP, Mass Revive 65 CCP) need a raised pool. |

Every spell costs **mana (or a special resource) + casting points**. Spells that read "10 Mana / 15 CCP" cost both. Special resources replace mana in some tomes: **Souls** (Necromancy line), **Thralls** (Vampire rulers, Thrones of Blood), **Embalmed Sacrifice** (Tome of the Revenant), gold (a few Architect/Reaver spells).

**Sources of casting points (both pools unless stated).** Every source below is from the game data or the wiki:

| Source | WCP | CCP |
|---|---|---|
| Each tome unlocked (wiki: "each tome grants +5 Casting Points") | +5 | +5 |
| Wizard's Tower upgrade *Channeling Chamber* (wiki) | +10 | +10 |
| Mystic culture Town Hall IV (wiki) | +10 | +10 |
| General empire skill *Wizard King* (100 Imperium, level 6) | +10 | +10 |
| Astral empire skill *Grand Casting Reserves* (150 Imperium, 60 affinity) | +30 | — |
| Astral empire skill *Tactical Casting Reserves* (150 Imperium, 60 affinity) | — | +30 |
| Tome of Amplification improvement *Resonance Fields* | +5 | +5 |
| Astral rite *Rite of Spell Storm* (350 Imperium, repeatable) | +150 this turn | +150 this turn |
| Astral skill *Astral Absorption* (500 Imperium) | — | +15 CCP and +60 mana whenever an enemy casts in a battle with you |
| Shadow skill *Death Casting* (500 Imperium) | — | +10 CCP whenever a non-summon unit dies in combat |
| Tome of the Cosmos (T5) city structure *Prismatic Tower* (440 gold / 1300 production, Throne City only) | +25 | +25 |
| Age-of-Affinity channelling (−20% costs, see Part 4), several hero signature skills | various | various |

The ruler's starting pool is small (a few tens of points) and the game is tuned so a T1 combat spell (15–30 CCP) is castable every round early on while a 400–600 WCP spell (Awaken the Forest, a Major Race Transformation) takes many turns to channel. **[verify exact starting value in-game; the wiki does not state it]**

**Cost reducers (all from the empire tree, Part 2):** Land Sculptors −25% mana & WCP on Terraforming; Transformative Expertise −25% mana & WCP on Enchantment & Transformation spells; Otherworldly Reinforcements −25% WCP on Summons / −25% CCP on Combat Summons; Blessings and Wards −25% mana & CCP on Healing/Buff and −25% mana & WCP on Friendly Army spells; Hexes and Curses −25% WCP on Enemy Army and −25% CCP on Debuff spells; Enchantment Attunement −20% enchantment upkeep. Each *Age of [Affinity]* victory spell gives −20% mana/WCP/CCP on that affinity's spells while channelling. Casting inside a province with a Summoning Rift makes Combat Summons 20% cheaper.

### 3.2 Mana upkeep

* **Unit Enchantments** (121 of them in the data) are cast once on the empire (WCP) and thereafter *every unit that qualifies* carries an extra mana upkeep for as long as the enchantment is active. The per-unit surcharge scales with the unit's tier **[verify exact per-tier values; wiki/forum: "enchantment maintenance is per unit affected"]**. The Astral skill *Enchantment Attunement* cuts it by 20%. Enchantments can be toggled off to stop the upkeep. Enchantments only apply to the unit classes listed in "Applies to" (e.g. Blight Blades: Shield/Polearm/Shock/Fighter) and their effects are "increased for Single Shot attacks" where noted.
* **Race Transformations** (Minor: 31, Major: 13) are permanent, apply to every unit of the target race, cost 200–600 mana/WCP once and **have no upkeep**. A race may hold several Minor transformations (some are mutually exclusive, e.g. Supergrowth vs Spawnkin) but only **one Major** transformation.
* **Sustained City / Sustained World / some Terraforming spells** have a flat per-turn mana (rarely gold) upkeep, typically 10% of their casting cost. Complete list from the data:

| Spell | Type | Cost | Upkeep |
|---|---|---|---|
| Amplify Minds | Sustained City | 80 mana | 8 mana |
| Astral Revelation | Sustained World | 150 mana | 15 mana |
| Awakened Tools | Sustained City | 60 mana | 6 mana |
| Bind Gold Ancient Wonder | Sustained World | 400 mana | none (cancelled if the wonder is occupied or changes hands) |
| Bind Leviathan Landmark | Sustained City | 100 mana | 10 mana |
| Bounty of the Sea | Sustained City | 80 mana | 8 mana |
| Cascading Power | Sustained World | 120 mana | 12 mana |
| City Wards | Sustained City | 45 mana | 10 mana |
| Consecrated Domain | Sustained City | 80 mana | 8 mana |
| Cycle of Seasons | Sustained City | 120 mana | 12 mana |
| Desecrate Structure | World | 80 mana | 8 mana |
| Domain of Death | Sustained City | 60 souls | 5 mana |
| Elemental Bane | Sustained City | 100 mana | 10 mana |
| Enchanted Bloom | Terraforming | 150 mana | 15 mana |
| Fog of Insanity | Sustained City | 200 mana | 20 mana |
| Forest Awareness | World | 200 mana | 20 mana |
| Fortress of Vines | Sustained World | 300 mana | 30 mana |
| Gremlin Ambushers | Sustained City | 100 mana | 10 mana |
| Marching Winter | Terraforming | 120 mana | 12 mana |
| Ritual of the Gloomveil | Sustained World | 300 mana | 30 mana |
| Soul Collection | Sustained World | 45 mana | 30 gold |
| Summon Ice / Storm / Rock / Lava Runestele | Terraforming | 80 mana | 5 mana each |
| Training Regimen | City | 45 mana | 10 mana |
| Umbral Rift | Sustained World | 100 mana | 10 mana |
| Age of Order / Chaos / Nature / Materium / Astral / Shadow | Spell Victory | 800 mana | 50 mana |

* **Summoned units** (Magic Origin) pay their upkeep in mana rather than gold (e.g. Colossal Penguin 60 gold + 7 imperium listed for a drafted T5; summons show mana upkeep). Shadow skill *Shadow Binding* −20% Magic-Origin upkeep.
* Running out of mana: sustained spells and enchantments are automatically dispelled when the treasury cannot pay.

### 3.3 Research, knowledge and tomes

**Selecting tomes.** A faction starts with one tome chosen at creation. New tomes are unlocked from the research panel whenever the tier prerequisites are met — there is **no cap on the total number of tomes** and no need to finish the previous tome first, but every extra tome raises the knowledge cost of all later research (table below), so 8–12 tomes is a normal full game. Each tome unlocked also grants its affinity points immediately (+2 for a single-affinity tome, +1/+1 for a dual-affinity tome; the Tome of the Cosmos gives +1 in all six plus +1 Alignment) and, per the wiki, +5 casting points.

**Tier prerequisites (wiki, post-Watcher Update):**

| Tome tier | Tomes already owned | Affinity required (in that tome's affinity; any mix for dual tomes) | Other |
|---|---|---|---|
| I | 0 | 0 | All Tier I tomes are available from turn 1 |
| II | 2 | 0 | |
| III | 4 | 3 | Unlocks the *Bind Gold Ancient Wonder* research (Magic Victory step 1) |
| IV | 6 | 6 | |
| V | 8 | 8 | **Only one Tier V tome per game**; it unlocks the *Age of [Affinity]* victory spell |

The research panel offers a rotating set of skills drawn from every tome you own plus your culture tree; a tome's skills carry an internal *skill tier* (I–X in the data: Tier I tomes hold tier I–II skills, Tier II tomes III–IV, Tier III tomes V–VI, Tier IV tomes VII–VIII, Tier V tomes IX–X) that orders them and steers cost. Tier I–IV tomes contain 5–6 skills each; Tier V tomes 3–4 capstone skills. Skills are also labelled Adept / Intermediate / Expert.

**Knowledge cost scaling (wiki).** The base cost of a skill depends on how many tomes you owned when the tome containing it was selected:

| Tome # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Base knowledge / skill | 250 | 400 | 600 | 800 | 1100 | 1500 | 1900 | 2400 | 3000 | 3600 | 4300 | 5000 | +1000 per further tome |

Modifiers: Adept skills −20%, Intermediate ±0, Expert +20%. Empire-tree discounts: Specialized Troops −25% on unit skills; Metropolitan Plans −25% on City Spell / City Structure skills; Chaotic Inspiration randomly −25% on another skill each time research starts. Knowledge income comes from Libraries/knowledge structures, annexed Ancient Wonders (Ancient Studies), Whispering Stones, wonder clears (Wonder Reavers), etc.

**Spell types in the data (557 spell records, 191 tactical / 366 strategic):**

| Type | Count | Typical cost | Notes |
|---|---|---|---|
| Unit Enchantment (strategic) | 121 | 70–160 mana / equal WCP | Per-unit mana upkeep; class-restricted |
| Summon Spell (strategic) | 63 | 60–400 mana / equal WCP | Needs a Summoning Rift, city domain or Wizard Tower as target unless stated |
| Buff Spell (tactical) | 41 | 10–150 mana / 15–50 CCP | |
| Combat Summon Spell (tactical) | 37 | 15–200 mana / 15–65 CCP | Summons last 2–3 rounds or until end of combat; not in water battles |
| Minor Race Transformation | 31 | 200–350 mana | Permanent, no upkeep, several allowed |
| World Spell | 30 | 60–450 mana | One-shot map effects (disasters, teleports, pillage) |
| Debuff Spell (tactical) | 29 | 20–200 mana / 25–65 CCP | |
| Damage/Debuff Spell (tactical) | 28 | 15–100 mana / 20–40 CCP | |
| Friendly Army Spell | 24 | 20–200 mana | Target one of your stacks on the map |
| Terraforming Spell | 24 | 80–200 mana | Change province terrain/climate |
| Combat Enchantment (tactical) | 18 | 80–150 mana / 35–50 CCP | Battlefield-wide effects that repeat each round |
| Sustained City Spell | 17 | 45–200 mana + upkeep | Ongoing city effect |
| Enemy Army Spell | 15 | 45–250 mana | Curse/damage an enemy stack on the map |
| Healing Spell (tactical) | 15 | 10–80 mana | |
| Major Race Transformation | 13 | 600 mana | One per race |
| City Spell | 10 | 45–300 mana | One-shot city effect |
| Damage Spell (tactical) | 10 | 10–100 mana | |
| Sustained World Spell | 9 | 45–400 mana + upkeep | |
| Healing/Buff (7), Buff/Debuff (5), Damage/Healing (1) | 13 | | |
| Spell Victory | 6 | 800 mana / 400 WCP, 50 upkeep | Age of [Affinity] |

**Spell Amplification.** Combat damage/healing spells scale with the caster's Spell Amplification (from the Tome of Amplification passive, hero items, Astral empire nodes); the numbers listed in Part 1/5 are the un-amplified base.


## PART 4 — VICTORY CONDITIONS

All victory conditions can be toggled per realm at game setup; allied rulers share a victory when one of them wins (wiki). Vassals and Free Cities never need to be defeated.

### 4.1 Magic Victory (current system — "Watcher Update", July 2023 onwards)

| Step | Requirement | Details (game data + Dev Diary #21) |
|---|---|---|
| 1 | Unlock **any Tier III tome** (4 tomes owned, 3 affinity) | A fixed research option **"Bind Gold Ancient Wonder"** appears in the research panel and stays there until researched. |
| 2 | Annex Gold-tier Ancient Wonders | Gold Ancient Wonders (the strongest, dragon/wizard-tier sites) must be cleared and annexed into a city's or outpost's domain. Architect culture: fully completed *Monuments* also count. |
| 3 | Cast **Bind Gold Ancient Wonder** on each | Sustained World Spell, **400 mana / 300 WCP, no upkeep**. While bound the wonder grants **+50 Knowledge**. The bind is cancelled if the wonder is occupied by an enemy or changes ownership. |
| 4 | Bind the required number | Shown in the Quests → Magic Victory tab; it is derived from how many Gold Wonders the realm generated (typically **2–3**, more on large maps). |
| 5 | Unlock **a Tier V tome** (8 tomes, 8 affinity) | Its affinity determines which of the six **Age of Order / Chaos / Nature / Materium / Astral / Shadow** spells (type *Spell Victory*) becomes researchable. (The all-affinity Tome of the Cosmos from Secrets of the Archmages grants +1 in every affinity; which Age spell it unlocks is not stated in the data **[verify]**.) |
| 6 | Cast the **Age of [Affinity]** spell | **800 mana / 400 WCP, 50 mana upkeep** while channelling. Casting starts a **15-turn countdown**; every other ruler is warned and all of them may declare war; hostile "unraveling" armies spawn near your bound wonders. Losing a bound wonder or failing to pay upkeep interrupts the channel. Survive the countdown → Magic Victory. |

While channelling, each Age spell also gives −20% mana/WCP/CCP on spells of that affinity plus a per-combat effect: *Order* — each round a random ally gains 3 random positive status effects and loses all negative ones; *Chaos* — each round a random enemy takes 15 damage of a random type and has a base 90% chance of a random negative status; *Nature* — every 2 rounds a Tier II–III nature unit is summoned on your side; *Materium* — each round a friendly unit gains Bolstered Defense and Bolstered Resistance, repeated 2–4 times; *Astral* — each round a random enemy takes 15 mixed Fire/Lightning/Frost damage and gets 2 Sundered Resistance and 2 Status Vulnerability; *Shadow* — each round a random corpse is reanimated as a Decaying Zombie.

**Launch-era system (superseded, kept for design reference).** Tier III, IV and V tomes unlocked the *Seed*, *Root* and *Heart of [Affinity]* special province improvements. Each had to be built in a **different** city; once all three of one affinity stood, the *Age of [Affinity]* spell appeared (no cast cost, **20 mana upkeep**), starting a **15-turn** timer during which every faction could declare war and affinity-themed enemies spawned next to the three improvements.

### 4.2 Expansion Victory

1. Control the realm's **required number of provinces** (shown in Quests → Expansion Victory; scales with map size — roughly a fifth to a quarter of all provinces **[verify per size]**). Provinces of your own cities and of vassals at **Bonded Vassalage or better** count.
2. This unlocks the **Beacon of Unity** Special Province Improvement (**280 gold / 750 production**). Build **three**, each in a **different city** (one per city; vassal cities cannot be ordered to build them, so you need at least three cities of your own).
3. Choose **"Light the Beacons"** → a **15-turn** countdown starts. Rebel/"opposing unification" armies spawn around the beacons each turn; other rulers are alerted. A beacon that is pillaged/destroyed becomes *Beacon of Unity Ruins* and must be rebuilt (the countdown is interrupted while fewer than three stand — confirmed by Paradox forum bug-thread as intended).
4. Survive the countdown → Expansion Victory.

### 4.3 Military Victory

* Defeat every rival **ruler** — a ruler is eliminated when their Throne City is taken (and their last city is gone or they are vassalised). Rulers you have **vassalised** count as defeated; rulers in an **Alliance** with you do not need to be defeated (they share the win).
* Free Cities and independent marauders/Infestations are irrelevant to the condition.
* The game also ends immediately in defeat for a player whose ruler loses their last city (rulers can be "in the void" and respawn while they still own a city).

### 4.4 Score Victory

* Triggered by the **turn limit** (default **150** turns; configurable, or off).
* When the limit is reached with no other victory, the ruler with the **highest score** wins. Score is the sum of five tracks shown in the Score screen: **Military** (army value, battles won), **Diplomacy** (relations, vassals, alliances), **Economy** (income), **Expansion** (cities/provinces/population) and **Research** (skills researched/tomes). Exact weights are not published **[verify]**.

### 4.5 Seals of Power Victory (Empires & Ashes, Nov 2023)

* Only available in realms with a **World Seals** realm trait (variants: *Dormant* / *Active* — Active needs fewer points; the number of Seals scales with the number of players; setup also offers small/medium/large point targets).
* Seals are unannexable structures guarded by strong marauder armies. Defeat the guards and **end your turn with an army standing on the Seal** to control it.
* Each Seal you hold at end of turn gives **+1 Seal point**; holding more Seals accelerates progress. Every few turns a new guardian army spawns at each Seal and must be beaten to keep it.
* Reach the realm's Seal-point target → Seals Victory. Other rulers can contest by killing the occupying army.

### 4.6 Story-realm and crisis endings (not standard victories)

* Story realms (base campaign, Eldritch Realms, Giant Kings, Archon Prophecy, Secrets of the Archmages) add scripted objectives that end the realm on completion.
* Realm-wide **crises** (Umbral Abyss invasion, Leviathan landmarks, Cosmic Happenings, Withered World hazards in Rise from Ruin) do not grant victory but can eliminate players or gate the map.


## PART 5 — CURATED ICONIC SPELLS (exact in-game numbers)

A hand-picked cross-section of the spell catalogue (one or more per affinity, every spell type represented). Values are base values from the game data. Names requested that do not exist verbatim in AoW4 map to: "Lightning Blast" → Chain Lightning; "Summon Wild Animal" → Call Wild Animal; "Seeds of Growth" → Spring Growth / Healing Roots; "Chaos Rift" → Conjure Summoning Rift (and Umbral Rift); "Awaken the Land" → Awaken the Forest; "Winter Storm" → Winter Sorrow / Marching Winter.

| # | Spell | Type | Cost | Casting pts | Upkeep | Source tome | Exact effect |
|---|---|---|---|---|---|---|---|
| 1 | Chain Lightning | Damage/Debuff Spell | 45 Mana | 30 CCP | - | Tome of Amplification | Target enemy unit: • Sustains 30 Lightning Damage. • Is inflicted with 2 Electrified. • This effect passes on to another enemy within 3 hexes. • Passes on up to 2 times. |
| 2 | Lightning Storm | Combat Enchantment | 80 Mana | 35 CCP | - | Tome of the Stormborne | • All units become Wet for 3 Turns • Up to 2 random enemy units: • Sustain 20 Lightning Damage. • Have a base 90% chance of becoming Electrified for 3 Turns. This spell repeats at the start of each turn for the next 6 Turns. |
| 3 | Call Wild Animal | Summon Spell | 60 Mana | 60 WCP | - | Tome of Beasts | • Choose a Tier I or Tier II Animal unit to add to your army. • The available Animals depend on the type of terrain the spell is cast on. Summons: Ice Spider (Tier II Magic Fighter, HP 75, Def 2, Res 2, abilities: Magic Strike, Frozen Web, Defense Mode); Goretusk Piglet (Tier I Shock, HP 65, Def 1, Res 0, abilities: Charge Strike, Defense Mode); Grimbeak Crow (Tier I Fighter, HP 60, Def 0, Res 0, abilities: Melee Strike, Defense Mode); Polar Bear (Tier II Fighter, HP 80, Def 2, Res 0, abilities: Melee Strike, Swipe, Defense Mode); Dire Penguin (Tier II Fighter, HP 70, Def 2, Res 1, abilities: Melee Strike, Defense Mode); Carrion Bird (Tier II Fighter, HP 70, Def 2, Res 1, abilities: Melee Strike, Carrion Feed, Defense Mode); Inferno Puppy (Tier I Magic Fighter, HP 60, Def 1, Res 1, abilities: Magic Strike, Defense Mode); Scrap Hermit (Tier II Shield, HP 80, Def 6, Res 1, abilities: Melee Strike, Acid Spray, Defense Mode: Shield Wall); Elephant (Tier II Shock, HP 90, Def 3, Res 0, abilities: Charge Strike, Stomp, Defense Mode); Pyremoth (Tier II Battle Mage, HP 55, Def 0, Res 2, abilities: Fire Bolts, Burning Dust, Defense Mode); Warg (Tier II Fighter, HP 70, Def 2, Res 1, abilities: Melee Strike, Defense Mode); Hunter Spider (Tier II Fighter, HP 75, Def 2, Res 1, abilities: Melee Strike, Jump, Web, Defense Mode); Dread Spider Hatchling (Tier I Fighter, HP 60, Def 2, Res 0, abilities: Melee Strike, Defense Mode); Young Caustic Worm (Tier I Shock, HP 65, Def 2, Res 0, abilities: Charge Strike, Defense Mode); Brown Bear (Tier II Fighter, HP 70, Def 2, Res 0, abilities: Melee Strike, Swipe, Defense Mode); Giant Beetle (Tier I Fighter, HP 60, Def 2, Res 0, abilities: Melee Strike, Pestilent Escape, Defense Mode); Weaver Spider (Tier II Ranged, HP 65, Def 1, Res 1, abilities: Shoot Web, Defense Mode); Slither Hatchling (Tier I Skirmisher, HP 65, Def 2, Res 0, abilities: Melee Strike, Venomous Spit, Defense Mode); Wyvern Fledgling (Tier I Magic Fighter, HP 60, Def 1, Res 1, abilities: Magic Strike, Lesser Burst, Defense Mode); Razorback (Tier II Ranged, HP 65, Def 3, Res 1, abilities: Quillshot, Defense Mode); Vampire Spider Hatchling (Tier I Fighter, HP 50, Def 1, Res 0, abilities: Melee Strike, Defense Mode); Crocodile (Tier I Fighter, HP 65, Def 1, Res 0, abilities: Melee Strike, Defense Mode); Ape (Tier II Shock, HP 90, Def 3, Res 1, abilities: Charge Strike, Defense Mode); Celestial Griffon (Tier II Skirmisher, HP 65, Def 3, Res 3, abilities: Melee Strike, Fling Pinion, Defense Mode); Griffon (Tier II Shock, HP 80, Def 2, Res 2, abilities: Flyby Melee Charge, Defense Mode); Nimu (Tier II Shield, HP 80, Def 6, Res 1, abilities: Melee Strike, Enhancing Symbiosis, Defense Mode: Shield Wall); Kraken Spawn (Tier II Fighter, HP 70, Def 2, Res 1, abilities: Melee Strike, Defense Mode); Blood Maggot (Tier I Fighter, HP 50, Def 0, Res 0, abilities: Melee Strike, Corpse Gorge, Defense Mode); Doom Bat (Tier I Fighter, HP 60, Def 0, Res 0, abilities: Melee Strike, Defense Mode); Shrieking Bat (Tier II Ranged, HP 65, Def 1, Res 1, abilities: Echoing Shriek, Defense Mode); Plague Serpent (Tier II Magic Fighter, HP 70, Def 2, Res 2, abilities: Magic Strike, Defense Mode); Fractured Serpent (Tier I Fighter, HP 50, Def 1, Res 1, abilities: Melee Strike, Defense Mode) |
| 4 | Spring Growth | Combat Enchantment | 150 Mana | 50 CCP | - | (non-tome) | Each time the owner's units suffer damage, they gain 1 stack(s) of Regeneration. |
| 5 | Awaken the Forest | Summon Spell | 400 Mana | 400 WCP | - | Tome of Nature's Wrath | Target Province with Forest: • Loses Forest. • An Army of Animals and Plants is summoned under your control. Summons: Entwined Thrall (Tier I Skirmisher, HP 55, Def 2, Res 0, abilities: Melee Strike, Poison Needle, Defense Mode); Entwined Protector (Tier III Shield, HP 100, Def 7, Res 3, abilities: Melee Strike, Healing Sap, Defense Mode: Shield Wall); Warg (Tier II Fighter, HP 70, Def 2, Res 1, abilities: Melee Strike, Defense Mode); Goretusk Matriarch (Tier III Shock, HP 110, Def 4, Res 1, abilities: Charge Strike, Violent Gorging, Defense Mode); Entwined Scourge (Tier IV Battle Mage, HP 105, Def 2, Res 4, abilities: Entwining Bolts, Sap Strength, Defense Mode) |
| 6 | Marked for Death | Damage/Debuff Spell | 35 Souls | 40 CCP | - | Tome of the Reaper | Target unit: • Sustains 15 unblockable Physical Damage. • Loses -10 Morale. • Has a Decaying Zombie spawn adjacent to them. • Is afflicted with Visions of Death until the end of combat. Summons: Decaying Zombie (Tier I Fighter, HP 60, Def 0, Res 0, abilities: Melee Strike, Defense Mode) |
| 7 | Winter Sorrow | Combat Enchantment | 150 Mana | 50 CCP | - | (non-tome) | Enemy units suffer 5 stack(s) of Demoralized whenever they kill another unit. |
| 8 | Marching Winter | Terraforming Spell | 120 Mana | 120 WCP | 12 Mana | Tome of the Cold Dark | Target friendly City gains:Every Turn, 2 Provinces within or adjacent to the Domain: • Gain Snow and Ice. • Lose Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. • Provinces in the domain with Snow or Ice provide +2 Food and +2 Production income. |
| 9 | Artica's Ice Age | World Spell | 100 Mana | 100 WCP | - | (non-tome) | Up to 40 random Provinces gain an Ice Age Hazard. At the start of the next turn those hazards expire and: • Enemy units sustain 20 Frost Damage. • Provinces are destroyed. • The province: • Gains Snow and Ice. • Loses Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. |
| 10 | Meteor Shower | Combat Enchantment | 150 Mana | 50 CCP | - | Tome of the Crucible | Up to 2 random enemy units and enemies adjacent to those: • Sustain 10 Fire Damage and 10 Physical Damage. This spell repeats at the start of each turn for the next 5 Turns. |
| 11 | Lava Burst | Damage/Debuff Spell | 100 Mana | 40 CCP | - | Tome of the Crucible | Targets a 2-hex radius: • All units sustain 30 Fire Damage. • All units are inflicted with Burning. • All units are Slowed. • The ground is set On Fire. |
| 12 | Flame Volley | Damage/Debuff Spell | 80 Mana | 35 CCP | - | Tome of Devastation | In a 1-hex radius: • Enemy units sustain 16 Physical Damage and 16 Fire Damage. • Enemy units gain 2 Burning for 3 Turns. • Hexes are set On Fire. |
| 13 | Purifying Flame | Healing Spell | 80 Mana | 35 CCP | - | Tome of Dragons | Friendly units in a 1-hex radius: • Heal for 25 Temporary Hit Points. • Have their Negative Status Effects removed. |
| 14 | Raise Undead Army | Summon Spell | 150 Souls | 300 WCP | - | Tome of the Eternal Lord | Summons a full army stack of low-Tier Undead units onto a target world hex. Summons: Skeleton Archer (Tier I Ranged, HP 50, Def 0, Res 0, abilities: Shoot Bow, Defense Mode); Skeleton Mage (Tier I Battle Mage, HP 40, Def 0, Res 2, abilities: Death Bolts, Defense Mode); Skeleton Militia (Tier I Polearm, HP 60, Def 2, Res 0, abilities: Melee Strike, Defense Mode); Skeleton Warrior (Tier I Shield, HP 55, Def 5, Res 0, abilities: Melee Strike, Defense Mode: Shield Wall); Bone Wyvern (Tier II Magic Fighter, HP 70, Def 2, Res 2, abilities: Magic Strike, Poisonous Burst, Defense Mode); Corrupt Soul (Tier III Magic Fighter, HP 90, Def 3, Res 3, abilities: Magic Strike, Crushing Anguish, Defense Mode); Banshee (Tier III Battle Mage, HP 90, Def 2, Res 4, abilities: Cruel Bolts, Phase, Wail of the Banshee, Defense Mode); Bone Horror (Tier III Shock, HP 100, Def 4, Res 1, abilities: Charge Strike, Consume Corpse, Defense Mode) |
| 15 | Raise Zombies | Combat Summon Spell | 10 Souls | 15 CCP | - | (non-tome) | Raises corpses in a 1-hex radius as Decaying Zombie units that die at the end of combat. Cannot be used in Water battles. |
| 16 | Necrotize | Damage/Debuff Spell | 10 Mana | 15 CCP | - | Tome of Necromancy | Target enemy unit: • Sustains 10 Frost Damage and 10 Blight Damage • Gains 2 stacks of Decaying for 3 Turns. • When it dies, it becomes a Decaying Zombie under your control until the end of combat. |
| 17 | Time Stop | Debuff Spell | 200 Mana | 65 CCP | - | Tome of the Archmage | Target enemy units in a 1-hex radius: • Become Stunned for 1 Turn. • Become Distracted for 1 Turn. • Gain 5 Marked for 3 Turns. |
| 18 | Sleep of Oblivion | Debuff Spell | 100 Mana | 40 CCP | - | Tome of Oblivion | Target non-Hero unit dies. After 2 Turns, they come back to life with 75% of their total Hit Points and are inflicted with Insanity. While dead this way the unit cannot be revived or have its corpse destroyed. |
| 19 | Army Heal | Friendly Army Spell | 80 Mana | 80 WCP | - | Tome of Faith | Units in target army heal 25 Hit Points. |
| 20 | Healing Roots | Healing/Buff Spell | 10 Mana | 15 CCP | - | Tome of Roots | Target friendly unit: • Heals +10 Temporary Hit Points. • Gains 2 Regeneration. • Has Obscuring Flora created below it. |
| 21 | Awaken Instincts | Healing/Buff Spell | 150 Mana | 50 CCP | - | Tome of Nature's Wrath | All friendly units in a 2-hex radius: • Heal +25 Temporary Hit Points. • Regain all Action Points. • Become Berserk for 2 Turns. Does not affect units with Control Loss Immunity. |
| 22 | Divine Protection | Friendly Army Spell | 200 Mana | 200 WCP | - | Tome of the God Emperor | Units in target friendly army gain Resurgence for 1. |
| 23 | Static Shield | Buff Spell | 10 Mana | 15 CCP | - | Tome of Warding | Target friendly unit and another within 3 hexes gain Static Shield for 2 Turns. |
| 24 | Mage Armor | Unit Enchantment | 70 Mana | 70 WCP | - | Tome of Abjuration | Enchanted units gain: • +1 Defense • +2 Status Resistance |
| 25 | Steel Skin | Minor Race Transformation | 350 Mana | 350 WCP | - | Tome of Transmutation | Transmutes the target race's skin into steel, granting them: • +2 Physical Protection. • +2 Blight Protection • -2 Lightning Protection |
| 26 | Seismic Shock | Damage/Debuff Spell | 45 Mana | 30 CCP | - | Tome of Terramancy | Deals 30 Physical Damage to units in a 1-hex radius and inflicts Slowed. This spell deals double damage to obstacles. |
| 27 | Earth Shatter | Terraforming Spell | 150 Mana | 150 WCP | - | Tome of Terramancy | In target habitable or uninhabitable Province: • Enemy Units sustain 10 Physical Damage. • The province loses any Mountain, Stalagmites, and Diggable Earth. • Summon a Stone Spirit on the target hex. Summons: Stone Spirit (Tier III Shield, HP 100, Def 6, Res 3, abilities: Melee Strike, Immobilizing Phase, Quake, Defense Mode: Shield Wall) |
| 28 | Rock Blast | Damage Spell | 10 Mana | 15 CCP | - | Tome of Rock | Target enemy unit: • Suffers 24 Physical Damage. • Has its Defense Mode canceled. • Has its Retaliation Attacks removed. |
| 29 | Melt Armor | Damage/Debuff Spell | 45 Mana | 30 CCP | - | Tome of Transmutation | Target enemies in a 1-hex radius: • Gain 3 Sundered Defense. • Sustain 20 Fire Damage. |
| 30 | Frost Arrows | Unit Enchantment | 80 Mana | 80 WCP | - | Tome of Cryomancy | Makes attacks of enchanted units gain: • +1 Frost Damage. • A base 60% chance of inflicting Slowed. Effects are increased for Single Shot attacks. |
| 31 | Blight Blades | Unit Enchantment | 90 Mana | 90 WCP | - | Tome of Roots | Makes attacks of enchanted units deal: • +2 Blight Damage. • +10% damage against Poisoned or Decaying units. Effects are increased for Single Shot attacks. |
| 32 | Legion of Zeal | Unit Enchantment | 80 Mana | 80 WCP | - | Tome of Zeal | Grants enchanted units: • Zeal, which makes attacks deal extra Spirit Damage. |
| 33 | Supergrowth | Minor Race Transformation | 350 Mana | 350 WCP | - | Tome of Vigor | Makes the target race grow in mass and stature, granting them: • +10 Hit Points. • +1 Retaliation Attack. • Decreased number of units in formation. This transformation is incompatible with Spawnkin. |
| 34 | Angelic Transformation | Major Race Transformation | 600 Mana | 600 WCP | - | Tome of Exaltation | Turns the target race into angelic beings, granting them: • The Celestial unit type. • Flying Movement, which increases mobility. • Faithful, which reduces Unit Upkeep. • Decreased number of units in formation. |
| 35 | Golden Horde | Summon Spell | 300 Mana | 300 WCP | - | Tome of Chaos Channeling | • Summons a full army of random non-Scout Tier I units that can be produced in a city on the target hex. • If cast within an enemy Province, instantly pillages it. |
| 36 | Fury of the Horde | Buff Spell | 10 Mana | 15 CCP | - | Tome of the Horde | Tier I and Tier II friendly units in a 2-hex radius gain: • 2 stacks of Strengthened. |
| 37 | Demonic Onslaught | Buff Spell | 150 Mana | 50 CCP | - | Tome of the Chaos Lord | All attacking units gain Killing Momentum and Hastened for 3 Turns. |
| 38 | Feast of Souls | Friendly Army Spell | 20 Souls | 25 WCP | - | Tome of Souls | Target friendly army: • Heal non-Undead units for 20 Hit Points. • Heal Undead units for 40 Hit Points. |
| 39 | Summon Balor | Summon Spell | 300 Mana | 300 WCP | - | Tome of the Demon Gate | Target city loses 2 Population and spawns a Balor, a mythic unit that wreaks havoc on your foes. Summons: Balor (Tier V Mythic, HP 160, Def 7, Res 6, abilities: Melee Strike, Chaos Brand, Sunder the Earth, Defense Mode) |
| 40 | Summon Phase Beast | Summon Spell | 200 Mana | 200 WCP | - | Tome of Teleportation | Summons a Phase Beast onto the target world hex. Summons: Phase Beast (Tier IV Shock, HP 120, Def 4, Res 3, abilities: Charge Strike, Fast Phase, Defense Mode) |
| 41 | Summon Horned God | Summon Spell | 300 Mana | 300 WCP | - | Tome of Nature's Wrath | Summons the Horned God, a Tier V Mythic Unit with potent summoning abilities. Summons: Horned God (Tier V Mythic, HP 160, Def 5, Res 7, abilities: Reclaiming Bolt, Wild Eruption, Animate Flora, Defense Mode) |
| 42 | Summon Watcher | Summon Spell | 150 Mana | 150 WCP | - | Tome of Scrying | Summons a Watcher, a Battle Mage Unit with increased vision capabilities. Summons: Watcher (Tier III Battle Mage, HP 75, Def 1, Res 3, abilities: Lightning Bolts, Psychic Gaze, Defense Mode) |
| 43 | Summon Calamity Dragon | Summon Spell | 300 Mana | 300 WCP | - | Tome of Calamity | Target owned non-ruined Province turns to Ruins and Desolate terrain and then summons a Calamity Dragon, a Mythic Unit unit with strong offensive capabilities. Summons: Calamity Dragon (Tier V Mythic, HP 150, Def 6, Res 7, abilities: Ghostfire Spike, Ghostfire Storm, Force Mask of Calamity, Ghostfire Rebuke, Defense Mode) |
| 44 | Summon Avatar of the Cosmos | Sustained World Spell | 300 Mana | 300 WCP | - | Tome of the Cosmos | Summon the Avatar of the Cosmos, a Mythic Unit that is empowered by your own affinities. Summons: Avatar of the Cosmos (Tier V Mythic, HP 150, Def 7, Res 7, abilities: Cosmos Bolts, Greater Phase, Cosmos Beam, Defense Mode) |
| 45 | Summon Prosperity Dragon | Summon Spell | 150 Gold 300 Mana | 300 WCP | - | Tome of Prosperity | Summons a Prosperity Dragon, a Mythic Unit unit with strong protective and healing abilities. Summons: Prosperity Dragon (Tier V Mythic, HP 150, Def 6, Res 7, abilities: Radiant Spike, Radiant Rebuke, Rain of Prosperity, Bestow Mask of Prosperity, Defense Mode) |
| 46 | Vine Prison | Combat Summon Spell | 30 Mana | 25 CCP | - | Tome of Roots | Summon 5 Living Vine units randomly in a 2-hex radius which live for 2 Turns. These don't deal damage but have a chance of inflicting Immobilized on enemies. Cannot be used in Water battles. Summons: Living Vine (Tier I Fighter, HP 1, Def 0, Res 0, abilities: Entangle, Defense Mode) |
| 47 | Curse of Misfortune | Debuff Spell | 30 Mana | 25 CCP | - | Tome of Mayhem | Targets in a 2-hex radius suffer 2 Misfortune. |
| 48 | Devouring Void | Debuff Spell | 100 Mana | 40 CCP | - | Tome of Oblivion | • Conjures a Devouring Void in a 1-hex radius. • Each turn, the radius increases by 1 hex. • Lasts for 2 Turns. |
| 49 | Gilding Blast | Debuff Spell | 100 Mana | 40 CCP | - | Tome of the Golden Realm | Grants units in a 1-hex radius a 90% chance of becoming Gilded for 1 Turn. |
| 50 | Ice Coffin | Damage/Debuff Spell | 15 Mana | 20 CCP | - | Tome of Cryomancy | Target enemy: • Sustains 10 Frost Damage. • Has a base 90% chance of becoming Frozen. If unsuccessful, inflicts Status Vulnerability. |
| 51 | Withering Mist | Combat Enchantment | 100 Mana | 40 CCP | - | Tome of the Eternal Lord | Each turn, for 3 Turns, all enemies: • Sustain 15 Frost Damage. • Have a base 90% chance of becoming Blind for 1 Turn. • Have a base 90% chance of becoming Weakened for 3 Turns. |
| 52 | Consecrating Firestorm | World Spell | 100 Mana | 100 WCP | - | Tome of the Cleansing Flame | In target Province: • Enemy units sustain 20 Spirit Damage. • The province gains Consecrating Firestorm for 3 Turns • If it has an enemy owned Province Improvement, it is Pillaged. |
| 53 | Conjure Summoning Rift | World Spell | 60 Mana | 60 WCP | - | Mystic - School of Summoning | Conjures a Summoning Rift on an empty hex in the target Province. This structure: • Allows summoning spells to be cast on or adjacent to it. • Provides vision in 5-hex radius. • Units in this province gain regenerate +15 Hit Points per Turn. • During combat in this province friendly Combat Summon Spells are 20% cheaper to cast. |
| 54 | Umbral Rift | Sustained World Spell | 100 Mana | 100 WCP | 10 Mana | Eldritch Pact | Create an Umbral Rift in the target Umbral Abyss province, and another nearby on the Surface layer. |
| 55 | Fortress of Vines | Sustained World Spell | 300 Mana | 300 WCP | 30 Mana | Tome of Paradise | Your empire gains: • Your non-hero units in your domain earn 10 Experience each Turn. • Enemy units in this domain spend 4 more Move Points per hex moved. • A Living Vine spawns next to an enemy each turn during battle in your domain. |
| 56 | Blood Moon Ritual | World Spell | 12 Thralls | 300 WCP | - | (non-tome) | For the next 10 World Map Turns Vampires: • Don't suffer from Sunlight Weakness. • +15 Hit Point regeneration on the World Map. • Gain +20% damage. • Gain +2 Resistance. |
| 57 | Astral Travel | World Spell | 200 Mana | 200 WCP | - | Tome of the Archmage | Makes your leader teleport to the target world hex. |
| 58 | Teleportation Circle | Friendly Army Spell | 120 Mana | 120 WCP | - | (non-tome) | Return target Army to Throne City |
| 59 | Prelude of Doom | Enemy Army Spell | 80 Mana | 80 WCP | - | Tome of the Doomherald | Target enemy army gains 3 Demoralized for 1 Turn. |
| 60 | Bind Gold Ancient Wonder | Sustained World Spell | 400 Mana | 300 WCP | - | (non-tome) | • Target owned and annexed Gold Gold Ancient Wonder becomes bound. • While bound, it grants +50 Knowledge. • A number of bound Golden Ancient Wonders are required for Magic Victory. • This spell is canceled if the Bound Ancient Wonder is occupied or changes ownership. |
| 61 | Age of Chaos | Spell Victory | 800 Mana | 400 WCP | 50 Mana | (non-tome) | Channel the Age of Chaos to reach the Magic Victory. While channeling: • Your Chaos Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Each Turn in combat, a random enemy unit sustains 15 damage of a random type and has a base 90% chance of receiving a random Negative Status Effect. |

## APPENDIX A — Complete spell index (540 unique spells)

### Other (2)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Rite of Fanaticism | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Base game | All of your Units gain the following for 5 Turns: • Resurgence • Martyr |
| Tireless Armies | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Base game | Your Units gain Exhausted Immunity. |

### Buff Spell (39)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Anthem of Victory | 150 Mana | 50 CCP | - | Tome of Supremacy | Base game | All allied units gain: • 3 Strengthened. • +15 Morale. |
| Antimagic Tincture | 10 Mana | 15 CCP | - | Tome of Alchemy | Empires & Ashes | Friendly units in a 1-hex radius: • Have 2 Negative Status Effects dispelled. • Gain 2 Status Protection. |
| Arcane Supercharge | 80 Mana | 35 CCP | - | Tome of Summoning | Base game | For 3 Turns, target friendly Magic Origin unit gains: • 5 Strengthened • 3 Bolstered Defense • 3 Bolstered Resistance • Static Charge |
| Ascended Rebirth | 100 Mana | 40 CCP | - | Tome of the Archon | Archon Prophecy | Target dead non-Hero and non-Celestial unit: • Revives as a Vigil under the caster's control until the end of combat. • On revive, all friendly units in a 2-hex radius are healed for 20 Temporary Hit Points. |
| Awaken Inner Radiance | 10 Mana | 15 CCP | - | High | Base game | Friendly units in a 1-hex radius become Awakened for 3 Turns. If already Awakened, a unit gains Strengthened instead. |
| Blossom of Life | 45 Mana | 30 CCP | - | Tome of Fertility | Base game | Friendly units in a 2-hex radius gain 3 Regeneration. |
| Break Shackles | 5 Mana | 10 CCP | - | (non-tome / event / pantheon) | Base game | Target friendly unit: • Loses all Negative Status Effects • Gains 2 Strengthened |
| Call of the Wild | 15 Mana | 20 CCP | - | Tome of Beasts | Base game | Friendly Animal and Cavalry units in a 1-hex radius gain: • 2 Bolstered Defense • 2 Strengthened |
| Cascading Command: Defend | 30 Mana | 25 CCP | - | Tome of the Construct | Empires & Ashes | Target friendly Construct or Linked Minds unit: • Gains Defensive Masters for 1 Turn. • Has 2 Negative Status Effects dispelled. • This effect then applies to adjacent friendly Construct or Linked Mind units and is repeated. |
| Cascading Command: Reposition | 30 Mana | 25 CCP | - | Tome of the Construct | Empires & Ashes | Target friendly Construct or Linked Minds unit gains: • Hastened • Strengthened • This effect then cascades to adjacent friendly Construct or Linked Mind units and is repeated. |
| Commander's Call | 15 Mana | 20 CCP | - | Tome of the Warband | Rise from Ruin | Friendly units in a 1-hex radius: • Heal 15 Temporary Hit Points • Gain 15 Morale |
| Counter Stance | 5 Mana | 10 CCP | - | Oathsworn - Strife, Oathsworn - Righteousness, Oathsworn - Harmony | Ways of War | Friendly units in a 1-hex radius gain, for 1 Turn: • First Strike • An extra Retaliation Attack • Defensive Masters |
| Curse Reversal | 10 Mana | 15 CCP | - | Tome of Abjuration | Secrets of the Archmages | Target friendly unit: • Has its negative status effects removed. • If the removed status effects have positive counters, the unit gains a stack of it. |
| Deathwaltz | 10 Mana | 15 CCP | - | Dark - Cult of Death | Base game | Target friendly unit: • Regains its Action Points and Health. • Gains Resurgence. • Gains Doomed, dying at the end of this turn. |
| Demonic Onslaught | 150 Mana | 50 CCP | - | Tome of the Chaos Lord | Base game | All attacking units gain Killing Momentum and Hastened for 3 Turns. |
| Empowering Trophies | 10 Mana | 15 CCP | - | Nomad - Scavengers | Rise from Ruin | Target friendly unit with Scavenger: • Gains +1 Looted Power |
| Exalted Champion | 150 Mana | 50 CCP | - | Tome of the God Emperor | Base game | For 3 Turns, makes target friendly unit: • Deal +100% damage. • Gain +5 Bolstered Defense. • Gain +5 Bolstered Resistance. • Gain +5 Status Protection. |
| Fey Embrace | 15 Mana | 20 CCP | - | Tome of Fey Mists | Primal Fury | In a 1-hex radius: • Place Mist clouds. • Friendly units gain 2 random Positive Status Effects. |
| Fury of the Horde | 10 Mana | 15 CCP | - | Tome of the Horde | Base game | Tier I and Tier II friendly units in a 2-hex radius gain: • 2 stacks of Strengthened. |
| Grand Protection | 100 Mana | 40 CCP | - | Tome of Prosperity | Ways of War | Friendly units in a 2-hex radius gain: • 2 Grace • 2 Regeneration for 3 Turns • 2 Bolstered Defense for 3 Turns • 2 Bolstered Resistance for 3 Turns |
| Heroic Stand | 30 Mana | 25 CCP | - | Tome of Virtue | Archon Prophecy | Target friendly unit: • Has their Negative Status Effects removed. • Gains Steadfast for 1 Turn. • Ignores the penalties from Casualties for 1 Turn. Can only affect a unit once per battle. |
| Hold the Line | 10 Mana | 15 CCP | - | Feudal - Aristocracy | Base game | Friendly units in a 1-hex radius for 1 Turn gain: • Defensive Masters • Charge Resistance |
| Inspiring Chant | 30 Mana | 25 CCP | - | Tome of Zeal | Base game | Friendly units in a 2-hex radius: • Gain +10 Morale. • Become 2 Strengthened if they have Zeal. |
| Magic Shield | 5 Mana | 10 CCP | - | Mystic - School of Attunement | Base game | Target unit gains: • 2 Bolstered Defense for 3 Turns. • 2 Bolstered Resistance for 3 Turns. |
| Mark of Invulnerability | 15 Mana | 20 CCP | - | Tome of Warding | Base game | Target friendly unit: • Becomes Invulnerable for 1 Turn. • Has their Negative Status Effects removed. Cannot be used on a unit more than once per battle. |
| Might of the Battlefield | 45 Mana | 30 CCP | - | Tome of the Warlord | Rise from Ruin | All friendly units in a 2-hex radius gain: • Infernal Might for 3 Turns. • 15 Morale. Doubled for Tier I, Tier II, and Tier III units. |
| Monstrous Rebirth | 45 Mana | 30 CCP | - | Tome of Devastation | Base game | Target friendly Tier I, II, or III non-Magic Origin, non-Construct unit: • Transforms into a Warbreed. • Heals 60 Temporary Hit Points. • Dies at the end of combat. Cannot be used in Water Combat. |
| Resilient Incarnation | 10 Mana | 15 CCP | - | Architect | Archon Prophecy | Friendly units in a 1-hex radius for 1 Turn gain: • +1 Defense, +1 Resistance. • An additional +1 Defense, +1 Resistance per stack of Affinity Incarnate. |
| Retaliating Growths | 10 Mana | 15 CCP | - | Tome of the Tentacle | Eldritch Realms | Target friendly unit gains Retaliating Growths for 2 Turns. |
| Rite of Life Leeching | 15 Mana | 20 CCP | - | Tome of the Blood Rite | Thrones of Blood | Target friendly unit sustains 5 unblockable Physical Damage. Then all adjacent friendly units gain: • Strengthened for 3 Turns. • Life Steal for 3 Turns. |
| Song of the Reckless | 15 Mana | 20 CCP | - | Barbarian | Base game | For 3 Turns, target friendly unit gains: • Berserk • 3 Strengthened Does not affect units with Control Loss Immunity. |
| Soul Overflow | 15 Souls | 20 CCP | - | Tome of Souls | Base game | Friendly units in a 1-hex radius: • Gain 1 Strengthened. • Gain +20 maximum Hit Points until the end of battle. • Have 2 Negative Status Effects removed. |
| Static Shield | 10 Mana | 15 CCP | - | Tome of Warding | Base game | Target friendly unit and another within 3 hexes gain Static Shield for 2 Turns. |
| Steelfury Chant | 15 Mana | 20 CCP | - | Industrious | Base game | All friendly units lose all stacks of Bolstered Defense and Bolstered Resistance. For each stack lost they gain: • Strengthened • Fortune |
| Stone Skin | 5 Mana | 10 CCP | - | Tome of Rock | Base game | Target unit gains Stone Skin for 3 Turns. |
| Swiftstrike Blessing | 10 Mana | 15 CCP | - | Nomad - Conquerors | Rise from Ruin | Target friendly unit that has action points remaining and another within 3 hexes gain: • Momentum for 1 Turn. • Fortune for 3 Turns. |
| Thrill of Combat | 15 Mana | 20 CCP | - | Tome of Burning Passion | Secrets of the Archmages | Target friendly unit gains: • Berserk for 3 Turns. • 5 Infernal Might for 3 Turns. |
| Unleash Beast | 100 Mana | 40 CCP | - | Tome of Vigor | Base game | Target Animal or Cavalry unit gains, for 3 Turns: • 5 Strengthened • 5 Bolstered Defense • Berserk. |
| Vision of Victory | 30 Mana | 25 CCP | - | Barbarian | Base game | Friendly units in a 1-hex radius gain 3 Fortune. |

### Buff/Debuff Spell (5)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Disruption Wave | 300 Mana | 80 CCP | - | Tome of the Archmage | Base game | • Enemy units have a base 120% chance of becoming Disrupted for 2 Turns. • Dispels 2 Positive Status Effects from enemies. • Dispels 2 Negative Status Effects from allies. |
| Exhilarating Pollen | 45 Mana | 30 CCP | - | Tome of Paradise | Base game | All friendly units gain +15 Morale. All enemy units have a base 90% chance of becoming Distracted. |
| Misty Magic | 60 Mana | 60 CCP | - | (non-tome / event / pantheon) | Base game | Obscuring Mist covers the battlefield for 3 Turns, giving your units standing in the mist +1 Resistance and enemy units become Distracted. |
| Unholy Champion | 35 Souls | 40 CCP | - | Tome of the Revenant | Archon Prophecy | Target friendly unit gains: • +50% damage. • Undying. • Armor of Despair On cast, enemy units in a 2-hex radius lose 10 Morale. |
| Zealous Ignition | 45 Mana | 30 CCP | - | Tome of the Cleansing Flame | Eldritch Realms | Target unit: • Gains Zeal until the end of battle. If target already has Zeal, gain 2 Strengthened for 3 Turns. • Enemy units in a 2-hex radius suffer Condemned until the end of battle. • Create Cleansing Flames on the target hexes for 3 Turns. |

### City Spell (10)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Arcane Studies | 45 Mana | 45 WCP | - | Mystic - School of Potential | Base game | For 10 Turns, target owned city: • Contributes 1 Arcane Inspiration to a random spell each Turn. |
| Cosmic Inspiration | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | • Requires target owned City with 3 or more Provinces in its Domain adjacent to the Broken Wizard's Throne. • Each City can only be targeted once by this Spell. • Immediately unlocks a random Spell that you do not have access to yet. |
| Cosmic Wake | 150 Mana | 150 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Target Province: • If it contains an enemy Province Improvement and no Ancient Wonder, it is removed and the Population is lost. • Enemy Units in the province sustain 4 Fire Damage, Frost Damage, Blight Damage, Spirit Damage, Lightning Damage, and Physical Damage. |
| Enthrall Population | 30 Mana | 30 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | • Target owned or vassal city loses 1 Population. • If used on a vassal lose -200 relation with them. • You gain 3 Thralls. |
| Fanatical Workforce | 45 Mana | 45 WCP | - | Tome of Zeal | Base game | For 3 Turns, target owned city: • Gains +60 Production income. • Loses -20 Food income. |
| Mesmerizing Draft Ritual | 1 Thralls | 45 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Target owned city gains +50 Draft for 3 Turns. |
| Pacification | - | 0 WCP | - | (non-tome / event / pantheon) | Base game | Destroying an Infestation grants a stacking +20 City Stability to all your Cities for 10 Turns. |
| Ritual of Calamity | - | 0 WCP | - | (non-tome / event / pantheon) | Ways of War | • At the start of every Turn during the siege, a random Province Improvement of the besieged city is pillaged, granting you rewards. • At the start of combat: • All defenders gain a stack of Ghostfire for Turns. • Accursed Ogres appear on the attacker's side. |
| Training Regimen | 45 Mana | 45 WCP | 10 Mana | Tome of the Warband | Rise from Ruin | Target owned city: • Gains 40 Draft. |
| Tyrannical Exploitation | 30 Mana | 30 WCP | - | Dark - Cult of Tyranny | Base game | Target Vassal City: • No longer gains Allegiance • Vassal Income is increased by +20% for each point of Allegiance Income instead. |

### Combat Enchantment (18)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Autumn Storm | 150 Mana | 50 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | All enemy units suffer Wet until the end of battle. In addition, after 5 Turns, all enemy units that are Wet suffer 20 Lightning Damage and have a 60%% chance of suffering Stunned. |
| Battle Divination | 80 Mana | 35 CCP | - | Tome of Prophecies | Archon Prophecy | When cast and for the next 2 Turns, apply effect to the battle in the following order: • All friendly units gain +25% Evasion for the turn. • All friendly units gain Precognition. • All friendly units gain +20% damage for the turn. |
| Call Arctic Blizzards | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | For 3 turns, at the start of your turn: • Enemy units take 8 Frost Damage. • All Wet units have a 90% chance of becoming Frozen for 1 turn. |
| Call Blightfall | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | For 3 turns, at the start of your turn, a random enemy unit: • Takes 15 Blight Damage. • Becomes Diseased. |
| Call Blinding Sands | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | For 3 turns, at the start of your turn: • Each enemy unit has a 60% chance of becoming Blind for 1 turn. |
| Call Grasping Vines | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | Every turn in combat, all enemy units have a 50% chance of becoming Immobilized for 3 turn. Lasts for 3 turns. |
| Call Thunder Storms | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | For 3 turns, at the start of your turn: • All units become Wet. • 1 random units take 20 Lightning Damage. |
| Call Volcanic Eruptions | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | For 3 turns, at the start of your turn, a marker is placed near an enemy. Then, after 3 the ground will erupt, and units within 1 of the marker will suffer 10 Physical Damage and 10 Fire Damage. Random affected hexes will gain On Fire. |
| Call to Glory | 20 Mana | 25 CCP | - | Feudal - Aristocracy, Feudal - Monarchy | Base game | For 3 Turns all friendly units gain: • +5 Morale at the start of your Turn. |
| Lightning Storm | 80 Mana | 35 CCP | - | Tome of the Stormborne | Primal Fury | • All units become Wet for 3 Turns • Up to 2 random enemy units: • Sustain 20 Lightning Damage. • Have a base 90% chance of becoming Electrified for 3 Turns. This spell repeats at the start of each turn for the next 6 Turns. |
| Meteor Shower | 150 Mana | 50 CCP | - | Tome of the Crucible | Base game | Up to 2 random enemy units and enemies adjacent to those: • Sustain 10 Fire Damage and 10 Physical Damage. This spell repeats at the start of each turn for the next 5 Turns. |
| Monarch's Decree | 30 Mana | 25 CCP | - | Feudal - Monarchy | Base game | For 2 Turns, all friendly units gain the benefit from For the Monarch as though the Monarch were present. |
| Parting Gifts | 80 Mana | 35 CCP | - | Tome of Cycles | Base game | Until the end of battle, whenever a friendly unit dies, all other friendly units within 2 hexes heal +15 Temporary Hit Points. |
| Spring Growth | 150 Mana | 50 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | Each time the owner's units suffer damage, they gain 1 stack(s) of Regeneration. |
| Summer Heat | 150 Mana | 50 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | At the start of the owner's turn, enemy units adjacent to owner's units have 90% chance of suffering Burning and suffer 5 Fire Damage for each stack of Burning they have. |
| Tears of the Crimson Sovereign | 80 Mana | 35 CCP | - | Tome of the Crimson Reign | Thrones of Blood | When cast and for the next 2 Turns: • Up to 3 enemy units: • Sustain 10 Physical Damage. • Have a base 90% chance of gaining Blood Parasite for 3 Turns. • Up to 3 friendly units: • Heal for 10 Temporary Hit Points. • Gain Fortune for 3 Turns. |
| Winter Sorrow | 150 Mana | 50 CCP | - | (non-tome / event / pantheon) | Eldritch Realms | Enemy units suffer 5 stack(s) of Demoralized whenever they kill another unit. |
| Withering Mist | 100 Mana | 40 CCP | - | Tome of the Eternal Lord | Base game | Each turn, for 3 Turns, all enemies: • Sustain 15 Frost Damage. • Have a base 90% chance of becoming Blind for 1 Turn. • Have a base 90% chance of becoming Weakened for 3 Turns. |

### Combat Summon Spell (32)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Animate Flora | 15 Mana | 20 CCP | - | Tome of Glades | Base game | Target Flora Obstacle transforms into a Floral Stinger unit under your control. This summon lasts for 3 Turns. |
| Battlefield Reanimation | 50 Souls | 65 CCP | - | Tome of the Eternal Lord | Base game | • All friendly Undead units come back to life with 50% of their total Hit Points. • Non-undead Corpses come back to life as Decaying Zombies under your control until the end of battle. Cannot be used in Water battles. |
| Call Forth Avatar of Chaos | 150 Mana | 50 CCP | - | Tome of the Chaos Lord | Base game | Summons an avatar of your Ruler into a battle. The avatar has the same abilities as your Ruler and spawns with full Action Points. All Fiends gain +10 Morale. Cannot be used in Water battles. Cannot be used in battles where your Ruler is present. |
| Call the Titan of the Earth | 200 Mana | 65 CCP | - | Tome of the Creator | Base game | • Summons an Earth Titan onto the target unoccupied hex. • All adjacent enemies lose their Defense Mode and Retaliation Attack. Cannot be used in Water battles. |
| Conjure Abjurer Pylon | 15 Mana | 20 CCP | - | Tome of Abjuration | Secrets of the Archmages | Conjure an Abjurer Pylon on target hex that casts Magic Shield on friendly units. This summon lasts for 3 Turns. Cannot be used in Water battles. |
| Conjure Amplification Pylon | 45 Mana | 30 CCP | - | Tome of Amplification | Base game | Conjures an Amplification Pylon, a stationary structure that deals damage and increases the damage of your spells by +50%. This summon lasts for 3 Turns. Cannot be used in Water battles. |
| Conjure Astral Keeper | 20 Mana | 25 CCP | - | Tome of Summoning | Base game | Summons an Astral Keeper, a Support Unit that heals units even in death. This summon lasts for 3 Turns. |
| Conjure Astral Ward | 30 Mana | 25 CCP | - | Mystic - School of Summoning | Base game | Summon an Immobile Astral Ward. This summon lasts for 3 Turns. |
| Conjure Divine Beacon | 30 Mana | 25 CCP | - | Tome of the Beacon | Base game | Summons a Divine Beacon. Upon casting and at the start of each turn, friendly units in a 2-hex radius: • Heal +15 Temporary Hit Points. • Gain +5 Morale. This summon lasts for 3 Turns. Cannot be used in Water battles. |
| Conjure Elemental | 20 Mana | 25 CCP | - | (non-tome / event / pantheon) | Archon Prophecy | Summon a Tier 1 Lesser Spirit based on your Empire's dominant Affinity: Lesser Snow Spirit This summon lasts for 3 Turns. |
| Conjure Orb of Desire | 30 Mana | 25 CCP | - | Tome of Burning Passion | Secrets of the Archmages | Conjure an Orb of Desire on target hex that Taunts enemies and burns attackers. This summon lasts for 3 Turns. |
| Conjure Primal Crocodile | 45 Mana | 30 CCP | - | Primal - Mire Crocodile | Primal Fury | Summon a Tier 2 Primal Crocodile. This summon lasts for 3 Turns. |
| Conjure Primal Crow | 45 Mana | 30 CCP | - | Primal - Storm Crow | Primal Fury | Summon a Tier 2 Primal Crow. This summon lasts for 3 Turns. |
| Conjure Primal Mammoth | 45 Mana | 30 CCP | - | Primal - Glacial Mammoth | Primal Fury | Summon a Tier 2 Primal Mammoth. This summon lasts for 3 Turns. |
| Conjure Primal Sabertooth | 45 Mana | 30 CCP | - | Primal - Ash Sabertooth | Primal Fury | Summon a Tier 2 Primal Sabertooth. This summon lasts for 3 Turns. |
| Conjure Primal Serpent | 45 Mana | 30 CCP | - | Primal - Dune Serpent | Primal Fury | Summon a Tier 2 Primal Serpent. This summon lasts for 3 Turns. |
| Conjure Primal Spider | 45 Mana | 30 CCP | - | Primal - Tunneling Spider | Primal Fury | Summon a Tier 2 Primal Spider. This summon lasts for 3 Turns. |
| Conjure Primal Wolf | 45 Mana | 30 CCP | - | Primal - Sylvan Wolf | Primal Fury | Summon a Tier 2 Primal Wolf. This summon lasts for 3 Turns. |
| Conjure Tentacle | 30 Mana | 25 CCP | - | Tome of the Tentacle | Eldritch Realms | Summon an Immobile Fighter Unit with Hyper-Awareness. This summon lasts for 3 Turns. |
| Conjure Weaver Spiders | 45 Mana | 30 CCP | - | Tome of the Weaver | Secrets of the Archmages | Conjure 2 Weaver Spiders on target and adjacent hex. This summon lasts for 3 Turns. Cannot be used in Water battles. |
| Crystallize Essence | 100 Mana | 40 CCP | - | Crystal Pact | Giant Kings | Revive target non-Lithorine non-Hero unit as a Lithorine of its Tier. If victorious in combat, units revived can be kept for a Mana cost. |
| Explosive Manifestation | 100 Mana | 40 CCP | - | Tome of Astral Convergence | Base game | Target non-occupied hex: • Conjure an Astral Serpent or Astral Siphoner unit at random that lasts for 3 Turns. • All adjacent units sustain 10 Fire Damage, 10 Lightning Damage, and 10 Frost Damage. |
| Frikka's Revelation | 200 Mana | 65 CCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Target non-Hero enemy unit is revealed to be a Mirror Mimic spy on your side. If it survives until the end of combat, it can be acquired for a Mana cost. |
| Greater Reanimation | 35 Souls | 40 CCP | - | Tome of the Reaper | Base game | Resurrects target non-Hero unit: • As a Corrupt Soul if not Undead. • With 100% of its total Hit Points if Undead. If a Corrupt Soul or enemy Undead survives this combat, the controller will have the option of spending Souls to keep the unit permanently. |
| Karissa's Immolation | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Target enemy unit sustains 60 Fire Damage. If it dies to this damage and is not a hero or Combat Summon unit, it turns into an Immolated Soul under your control that can be acquired at the end of combat for a Mana cost. |
| Mass Revive | 200 Mana | 65 CCP | - | Tome of the God Emperor | Base game | Targets all friendly dead units with Faithful or Zeal. They come back to life with 50% of their total Hit Points. Cannot be used in Water battles. |
| Raise Zombies | 10 Souls | 15 CCP | - | (non-tome / event / pantheon) | Base game | Raises corpses in a 1-hex radius as Decaying Zombie units that die at the end of combat. Cannot be used in Water battles. |
| Resurrect Unit | 100 Mana | 40 CCP | - | Tome of Exaltation | Base game | Returns target dead friendly unit to full Temporary Hit Points. Cannot be used in Water battles. |
| Summon Astral Reflection | 150 Mana | 50 CCP | - | Tome of the Astral Mirror | Base game | Summons an Astral Reflection of target friendly unit onto an unoccupied adjacent hex. Cannot target Heroes, Combat Summons, and Mythic Units. |
| Summon Progenitor Golem | 200 Mana | 65 CCP | - | (non-tome / event / pantheon) | Empires & Ashes | Summon a friendly Progenitor Golem on the target hex, which lasts for 3 |
| Totem of the Wild | 80 Mana | 35 CCP | - | Tome of Vigor | Base game | Summons a Totem of the Wild, which spawns a random Tier I or II animal unit when it's created and at the start of your next 2 Turns. Cannot be used in Water battles. |
| Vine Prison | 30 Mana | 25 CCP | - | Tome of Roots | Base game | Summon 5 Living Vine units randomly in a 2-hex radius which live for 2 Turns. These don't deal damage but have a chance of inflicting Immobilized on enemies. Cannot be used in Water battles. |

### Damage Spell (8)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Blaze of the Horde | 5 Mana | 10 CCP | - | Tome of the Horde | Base game | Target enemy unit suffers: • 25 Fire Damage. • +5 Fire Damage for each adjacent friendly unit |
| Cosmic Ablation | 10 Mana | 15 CCP | - | Mystic - School of Potential | Base game | Target unit sustains: • 10 Lightning Damage • 10 Fire Damage • 10 Frost Damage |
| Devout Radiance | 10 Mana | 15 CCP | - | Oathsworn - Strife, Oathsworn - Righteousness, Oathsworn - Harmony | Ways of War | Enemy units in a 1-hex radius sustain 10 Spirit Damage. Damage changes based on your Devotion level. |
| Immolate | 15 Mana | 20 CCP | - | Tome of Pyromancy | Base game | Enemy units in a 1-hex radius: • Sustain 10 Fire Damage. • Sustain an extra 15 Fire Damage if they are Burning. |
| Infernal Jaws | 10 Mana | 15 CCP | - | Tome of Gluttony | Secrets of the Archmages | Target enemy sustains: • 15 Physical Damage. • 15 Fire Damage. If the enemy dies, adjacent friendly units: • Heal 20 Temporary Hit Points. • If they have Demonic Hunger or Imp's Hunger, gain Gorged. |
| Rock Blast | 10 Mana | 15 CCP | - | Tome of Rock | Base game | Target enemy unit: • Suffers 24 Physical Damage. • Has its Defense Mode canceled. • Has its Retaliation Attacks removed. |
| Sacrificial Slaughter | 100 Mana | 40 CCP | - | Tome of the Demon Gate | Base game | Target friendly unit explodes and enemy units within 2 hexes: • Sustain 20 Fire Damage plus 5 Fire Damage per Tier of the sacrificed unit. • Suffer one random Negative Status Effect per Tier of the sacrificed unit. |
| Wrath of the Faithful | 10 Mana | 15 CCP | - | Tome of Faith | Base game | Target enemy unit sustains 10 Spirit Damage plus 5 Spirit Damage per each friendly Faithful unit in battle (up to 8). |

### Damage/Debuff Spell (27)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Agonize | 80 Mana | 35 CCP | - | Tome of Torment | Thrones of Blood | Enemy units in a 1-hex radius: • Sustain 40 Frost Damage • Have a base 90% chance of gaining 3 stacks of Torment until end of combat. On failure, inflict 1 stack of Torment instead. |
| Chain Lightning | 45 Mana | 30 CCP | - | Tome of Amplification | Base game | Target enemy unit: • Sustains 30 Lightning Damage. • Is inflicted with 2 Electrified. • This effect passes on to another enemy within 3 hexes. • Passes on up to 2 times. |
| Comet of Calamity | 100 Mana | 40 CCP | - | Tome of Calamity | Ways of War | Units in a 2-hex radius: • Sustain 15 Fire Damage. • Sustain 15 Frost Damage. • Have a 50% base chance of becoming Frozen for 1 Turn. • Gain 2 stacks of Ghostfire for 3 Turns. |
| Condemnation | 5 Mana | 10 CCP | - | Tome of Zeal | Base game | Target enemy unit: • Sustains 15 Spirit Damage. • Becomes Condemned until the end of battle. |
| Crushing Earth | 45 Mana | 30 CCP | - | Tome of Terramancy | Base game | Target enemy unit: • Sustains 50 Physical Damage. • Suffers 4 Sundered Defense for 3 Turns. • Has a base 90% chance of becoming Stunned for 1 Turn. |
| Crystal Crash | 80 Mana | 35 CCP | - | Crystal Pact | Giant Kings | Enemy units in a 1-hex radius: • Sustain 15 Physical Damage. • Sustain 15 Lightning Damage. • Have a base 90% chance of inflicting Volatile Charge for 2 Turns. |
| Destabilized Mana Core | 30 Mana | 25 CCP | - | Tome of the Dreadnought | Empires & Ashes | Units in 2-hex radius are Marked. After 1 Turn the Mana Core explodes inflicting: • 24 Physical Damage • 24 Lightning Damage. • 60% base chance of receiving Disrupted. |
| Dust Storm | 15 Mana | 20 CCP | - | Tome of Winds | Base game | Enemy units in a 2-hex radius: • Sustain 10 Physical Damage. • Have a base 90% chance of becoming Blind for 1 Turn. |
| Fan the Inferno | 100 Mana | 40 CCP | - | Tome of Chaos Channeling | Base game | All enemy units: • Sustain 5 Fire Damage that ignores 50% of Resistance. • Are inflicted with Burning. |
| Flame Volley | 80 Mana | 35 CCP | - | Tome of Devastation | Base game | In a 1-hex radius: • Enemy units sustain 16 Physical Damage and 16 Fire Damage. • Enemy units gain 2 Burning for 3 Turns. • Hexes are set On Fire. |
| Fulmination | 10 Mana | 15 CCP | - | Tome of Evocation | Base game | Enemy units in a 1-hex radius: • Sustain 15 Lightning Damage. • Have a 60% chance of becoming Electrified. |
| Ice Coffin | 15 Mana | 20 CCP | - | Tome of Cryomancy | Base game | Target enemy: • Sustains 10 Frost Damage. • Has a base 90% chance of becoming Frozen. If unsuccessful, inflicts Status Vulnerability. |
| Ignite | 10 Mana | 15 CCP | - | Tome of Pyromancy | Base game | Target enemy unit: • Sustains 25 Fire Damage. • Is inflicted with Burning. • The ground is set On Fire. |
| Lava Burst | 100 Mana | 40 CCP | - | Tome of the Crucible | Base game | Targets a 2-hex radius: • All units sustain 30 Fire Damage. • All units are inflicted with Burning. • All units are Slowed. • The ground is set On Fire. |
| Marked for Death | 35 Souls | 40 CCP | - | Tome of the Reaper | Base game | Target unit: • Sustains 15 unblockable Physical Damage. • Loses -10 Morale. • Has a Decaying Zombie spawn adjacent to them. • Is afflicted with Visions of Death until the end of combat. |
| Mass Condemnation | 15 Mana | 20 CCP | - | Tome of the Inquisition | Base game | Enemies in a 1-hex radius: • Sustain 10 Spirit Damage. • Become Condemned until the end of battle. |
| Melt Armor | 45 Mana | 30 CCP | - | Tome of Transmutation | Base game | Target enemies in a 1-hex radius: • Gain 3 Sundered Defense. • Sustain 20 Fire Damage. |
| Necrotize | 10 Mana | 15 CCP | - | Tome of Necromancy | Base game | Target enemy unit: • Sustains 10 Frost Damage and 10 Blight Damage • Gains 2 stacks of Decaying for 3 Turns. • When it dies, it becomes a Decaying Zombie under your control until the end of combat. |
| Pinning Barrage | 80 Mana | 35 CCP | - | Tome of the Dreadnought | Empires & Ashes | Units in a 2-hex radius: • Suffer 20 Physical Damage. • Become Marked. • Have a base 60% chance of becoming Immobilized. |
| Rending Shadows | 30 Mana | 25 CCP | - | Tome of Shades | Ways of War | Enemy units in a 1-hex radius: • Sustain 16 Physical Damage. • Have a base 90% chance of becoming Blind for 1 Turn. • Have a base 90% chance of gaining Sundered Defense for 3 Turn. |
| Rite of Bloodletting | 10 Mana | 15 CCP | - | Tome of the Blood Rite | Thrones of Blood | Target friendly unit sustains 5 unblockable Physical Damage. Then all enemy units within 2 hexes: • Sustain 12 Physical Damage. • Gain 2 Bleeding for 3 Turns. |
| Rotting Explosion | 10 Souls | 15 CCP | - | Tome of Necromancy | Base game | Target friendly Zombie or Skeleton unit explodes, all enemies in a 2-hex radius: • Sustain 10 Frost Damage and 10 Blight Damage. • Gain 2 Decaying for 3 Turns. |
| Seismic Shock | 45 Mana | 30 CCP | - | Tome of Terramancy | Base game | Deals 30 Physical Damage to units in a 1-hex radius and inflicts Slowed. This spell deals double damage to obstacles. |
| Sundering Barrage | 15 Mana | 20 CCP | - | Reaver - Federated | Empires & Ashes | Units in a 1-hex radius: • Suffer 10 Physical Damage. • Have a 90% chance of inflicting Sundered Defense for 3 Turn |
| Suppressing Barrage | 15 Mana | 20 CCP | - | Reaver - Imperial | Empires & Ashes | Units in a 1-hex radius: • Suffer 10 Physical Damage. • Have their Defense Mode canceled and Retaliation Attacks removed. |
| Tear Fracture | 45 Mana | 30 CCP | - | (non-tome / event / pantheon) | Rise from Ruin | Target hex becomes marked, Units in 2-hex radius of the marked hex have a 60% base chance of receiving Disrupted. After 1 Turn, the marked hex explodes and inflicts the following in a 2-hex radius: • Units suffer 48 Physical Damage. • Units have 60% base chance of suffering Mana Drained. • Each hex has 20% chance of creating a Mana Fracture obstacle, which have Draining and spread to adjacent hexes when spells are cast. This spell cannot Backfire. |
| Tectonic Shatter | 200 Mana | 65 CCP | - | Tome of the Creator | Base game | • All enemies sustain 30 Physical Damage. • All enemies have a base 60% chance of becoming Stunned. • All obstacles on the map have a 50% chance of being destroyed. |

### Damage/Healing Spell (1)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Diffuse Health | 45 Mana | 30 CCP | - | Tome of Cycles | Base game | Target enemy unit: • Sustains 30 Blight Damage. • Gains 2 Decaying. Friendly units in a 2-hex range. • Heal +15 Temporary Hit Points. • Gain 2 Regeneration. |

### Debuff Spell (29)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Abducting Cyclone | 15 Mana | 20 CCP | - | Tome of Winds | Base game | Pulls the closest enemy within 3 hexes to target empty hex. They have a base 90% chance of becoming Stunned for 1 Turn. |
| Abjure Violence | 10 Mana | 15 CCP | - | Tome of Abjuration | Secrets of the Archmages | Target enemy unit: • Has a base 120% chance of becoming Pacified for 1 Turn. • Chance decreases based on target's lost Hit Points. |
| Arcane Bond | 45 Mana | 30 CCP | - | Tome of Summoning | Base game | Target enemy Magic Origin unit has a base 90% chance of becoming Dominated for 2 Turns. If unsuccessful, deals 30 Lightning Damage instead. |
| Astral Severance | 150 Mana | 50 CCP | - | Tome of Severing | Empires & Ashes | Target Magic Origin Unit: • Has a base 60% chance of being killed. • If unsuccessful, inflicts Disrupted and 4 stacks of Decaying. |
| Baneful Curse | 10 Mana | 15 CCP | - | Dark - Cult of Tyranny | Base game | Enemy units in a 1-hex radius gain: • Base 90% chance of inflicting 2 Weakened for 3 Turns. • Base 90% chance of inflicting 2 Misfortune for 3 Turns. |
| Bhajif's Disruption | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | • Enemies in a 1-hex radius: • Become Disrupted for 2 Turns. • Become Mana Drained for 1 Turn. • Additionally: • All active combat enchantments are dispelled. • For the next 2 Turns, Combat Spells cannot be cast. |
| Brimstone Bind | 100 Mana | 40 CCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Target enemy Unit: • Has 120% chance of suffering Burning for 3 Turns. • This effect repeats 5 times. • Suffers Immobilized and Pacified for 1 Turn. |
| Captivating Lights | 15 Mana | 20 CCP | - | Tome of the Sprite | Secrets of the Archmages | Target enemy unit: • Becomes Distracted for 1 Turn. • Has its Defense Mode canceled. • Has its Retaliation Attacks removed. |
| Cause Despair | 30 Mana | 25 CCP | - | Tome of the Doomherald | Base game | Enemies in a 1-hex radius have a base 90% chance of losing -15 Morale. |
| Corrupted Boon | 20 Mana | 25 CCP | - | Tome of Corruption | Eldritch Realms | Target enemy unit: • Loses all Positive Status Effects. • If a lost status effect has any Status Effects Countering, then the unit gains a stack of that Negative Status Effect. |
| Curse of Misfortune | 30 Mana | 25 CCP | - | Tome of Mayhem | Base game | Targets in a 2-hex radius suffer 2 Misfortune. |
| Designate Target | 15 Mana | 20 CCP | - | Reaver - Imperial | Empires & Ashes | Target enemy gains: • 2 Marked • Immobilized |
| Devolve | 100 Mana | 40 CCP | - | Tome of Nature's Wrath | Base game | Target non-Hero enemy: • Has a base 90% chance of being transformed into a random Tier I animal until the end of battle. • If resisted, inflicts Stunned instead. Cannot be used in Water battles. |
| Devouring Void | 100 Mana | 40 CCP | - | Tome of Oblivion | Base game | • Conjures a Devouring Void in a 1-hex radius. • Each turn, the radius increases by 1 hex. • Lasts for 2 Turns. |
| Disperse Afflicting Miasma | 15 Mana | 20 CCP | - | Tome of Alchemy | Empires & Ashes | Create Afflicting Miasma in a 1-radius. |
| Dreadful Bind | 80 Mana | 35 CCP | - | Tome of the Weaver | Secrets of the Archmages | Units in a 2-hex radius: • Have a base 90% chance of becoming Immobilized for 1 Turn. • Gain 2 Remorse for 3 Turns. |
| Fanfare of Mercy | 80 Mana | 35 CCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Ethereal and Undead units in a 2-hex radius: • Have a 60% chance of becoming Routing. If resisted, they are Pacified for 1 Turn instead. |
| Final Ultimatum | 45 Mana | 30 CCP | - | Tome of Subjugation | Base game | Target Routing non-Hero enemy unit: • Has a base 90% chance of becoming permanently mind controlled. • If successful, it gains +60 Morale. • If resisted, the unit dies instead. |
| Gilding Blast | 100 Mana | 40 CCP | - | Tome of the Golden Realm | Base game | Grants units in a 1-hex radius a 90% chance of becoming Gilded for 1 Turn. |
| Illusory Feast | 10 Mana | 15 CCP | - | Tome of Gluttony | Secrets of the Archmages | Target enemy unit: • Becomes Distracted for 1 Turn. • Has a base 90% chance of becoming Stunned for 1 Turn. |
| Infectious Insanity | 100 Mana | 40 CCP | - | Tome of Pandemonium | Base game | Target Unit has: • 90% chance of being inflicted with Infectious Insanity for 2 Turns. • If resisted, the target is inflicted with Insanity for 1 Turn. |
| Mark as Prey | 5 Mana | 10 CCP | - | Tome of Beasts | Base game | Target enemy: • Becomes Distracted. • Suffers 3 Sundered Defense. |
| Mass Hysteria | 45 Mana | 30 CCP | - | Tome of Pandemonium | Base game | Inflicts a random Negative Status Effect on all units in a 1-hex radius. |
| Mental Mark | 15 Mana | 20 CCP | - | Tome of Scrying | Base game | Target Enemies in a 1-hex radius gain: • 2 Marked. • 3 Sundered Resistance. |
| Sandstorm | 20 Mana | 25 CCP | - | Tome of the Sand Stalkers | Rise from Ruin | Conjure a Sandstorm in a 2-hex radius that lasts for 3 Turns. |
| Sleep of Oblivion | 100 Mana | 40 CCP | - | Tome of Oblivion | Base game | Target non-Hero unit dies. After 2 Turns, they come back to life with 75% of their total Hit Points and are inflicted with Insanity. While dead this way the unit cannot be revived or have its corpse destroyed. |
| Time Stop | 200 Mana | 65 CCP | - | Tome of the Archmage | Base game | Target enemy units in a 1-hex radius: • Become Stunned for 1 Turn. • Become Distracted for 1 Turn. • Gain 5 Marked for 3 Turns. |
| Treacherous Reflection | 100 Mana | 40 CCP | - | Tome of Corruption | Eldritch Realms | Create a Treacherous Reflection of target enemy unit. Cannot target Heroes, Combat Summons, and Mythic Units. |
| Umbral Exile | 45 Mana | 30 CCP | - | Eldritch Pact | Eldritch Realms | Target unit has a base 60% chance of: • Being immediately removed from combat. • Appearing at a random location in the Umbral Abyss after battle. • If unsuccessful, inflicts Stunned for 1 Turn instead. Cannot be used in Water Combat. |

### Enemy Army Spell (15)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Blizzard | 80 Mana | 80 WCP | - | Tome of Cryomancy | Base game | All units in target enemy army: • Sustain 20 Frost Damage. • Suffer -3 Status Resistance for 1 World Map Turns. |
| Burden of Guilt | 80 Mana | 80 WCP | - | Tome of the Inquisition | Base game | Target enemy army: • Sustains 20 Spirit Damage. • Loses 50% of its Move Points on the World Map. |
| Condemn Army | 80 Mana | 80 WCP | - | Tome of Supremacy | Base game | Target enemy army: • Takes 20 Spirit Damage • Becomes Condemned for 5 World Map Turns. |
| Dungeon Hazard | 80 Mana | 80 WCP | - | Tome of the Dungeon Depths | Giant Kings | Target enemy army: • Sustains 15 Physical Damage, doubled if cast on a Dungeon Province. • For 1 World Map Turn, at the start of combat units in this army become Slowed for 3 Turn. |
| Irradiant Flare | 80 Mana | 80 WCP | - | (non-tome / event / pantheon) | Rise from Ruin | Target army: • Sustains 15 Physical Damage, doubled if cast on an Astral Barrens. • For 1 World Map Turn, at the start of combat units in this army has a 60% chance of becoming Mana Drained. |
| Lightning Torrent | 80 Mana | 80 WCP | - | Tome of Evocation | Base game | In target enemy army: • All units sustain 20 Lightning Damage. • All units suffer -1 Lightning Protection for 1 World Map Turns. |
| Mass Phantasmal Ritual | 4 Thralls | 150 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Enemy units in target and adjacent Provinces: • Sustain damage equal to 15% of their maximum Hit Points. • Lose 2 Status Resistance until the end of their next combat. |
| Phantasmal Ritual | 3 Thralls | 100 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Target enemy army: • Sustains damage equal to 20% of its maximum Hit Points • Loses 2 Status Resistance until the end of its next combat |
| Prelude of Doom | 80 Mana | 80 WCP | - | Tome of the Doomherald | Base game | Target enemy army gains 3 Demoralized for 1 Turn. |
| Revenant Whispers | 60 Souls | 100 WCP | - | Tome of the Revenant | Archon Prophecy | For 1 World Map Turn, target enemy army gains: • 2 Demoralized. • When attacked, conjure 3 Skeletons with Unholy Champion on the attacker side. |
| Ritual of Somnia | 120 Mana | 120 WCP | - | Tome of Oblivion | Base game | In the target enemy army: • At the start of each battle, all units have a base 90% chance of becoming Stunned for 2 Turns. • Lasts 1 World Map Turns. |
| Scry Enemy | 30 Mana | 30 WCP | - | Tome of Scrying | Base game | All enemies in the target army provide you with vision for 10 Turns. |
| Soulcurse of Greed | 80 Mana | 80 WCP | - | (non-tome / event / pantheon) | Giant Kings | Target enemy army: • Sustains 8 Spirit Damage and 8 Frost Damage. • Becomes Cursed by Greed for 1 Turn. |
| Vivisection Ritual | 4 Thralls | 150 WCP | - | (non-tome / event / pantheon) | Thrones of Blood | Target enemy army sustains 20 Physical Damage damage. Then gain +150 Knowledge. |
| Wrath of the Emperor | 120 Mana | 120 WCP | - | Tome of the God Emperor | Base game | Target enemy army: • Sustains 20 Spirit Damage. • Becomes Demoralized for 1 Turn. • Becomes Condemned for 1 Turn. • If cast in enemy territory, the army additionally sustains +50% damage. |

### Friendly Army Spell (24)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Army Heal | 80 Mana | 80 WCP | - | Tome of Faith | Base game | Units in target army heal 25 Hit Points. |
| Ascended Warriors | 240 Mana | 240 WCP | - | Tome of Exaltation | Base game | Non-Hero units in target army gain 1 Rank. Cannot promote units above Legendary rank. |
| Blood Transfer Ritual | 2 Thralls | 80 WCP | - | (non-tome / event / pantheon) | Thrones of Blood | In target friendly army: • Heal Vampires for 50% of their maximum Hit Points. • Heal non-Vampires for 20% of their maximum Hit Points. |
| Catnap | 30 Mana | 30 WCP | - | Tome of the Sprite | Secrets of the Archmages | Target friendly army loses all their movement points then heals by 1 Hit Point per movement point lost. |
| Celestial Guardians | 200 Mana | 200 WCP | - | Tome of the Archon | Archon Prophecy | Target leader of an army gains Celestial Guardians for 1 World Map Turn, conjuring 2 Tier III Archon units at the start of combat for the duration. |
| Create Bone Horror | 10 Souls | 30 WCP | - | (non-tome / event / pantheon) | Base game | Creates a Bone Horror by combining two Skeleton Militia units. |
| Divine Protection | 200 Mana | 200 WCP | - | Tome of the God Emperor | Base game | Units in target friendly army gain Resurgence for 1. |
| Eldritch Rituals | 1 Thralls | 45 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Units in target friendly army deal +20% damage until the end of their next combat. |
| Favorable Winds | 80 Mana | 80 WCP | - | Tome of Winds | Base game | Target friendly army regains all their Movement points if they are on water. Half if they are on land. A unit cannot benefit from this spell more than once per turn. |
| Feast of Souls | 20 Souls | 25 WCP | - | Tome of Souls | Base game | Target friendly army: • Heal non-Undead units for 20 Hit Points. • Heal Undead units for 40 Hit Points. |
| Fight for Power | - | 45 WCP | - | Tome of the Demon Gate | Base game | Two Fiend units of the same Tier in the target army fight each other. One dies and the other transforms into a Fiend with a Tier one level higher than before. |
| Forced Evolution | 60 Mana | 60 WCP | - | (non-tome / event / pantheon) | Empires & Ashes | Target a friendly Army, a random Tier I or Tier II Unit in the army with Evolve immediately gains enough ranks to evolve. |
| Ilandra's Chosen | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Target Hero leading an army you control is permanently transformed into a Scourge of Spring. This also restores all Hit Points and Move Points of the unit. This transformation cannot be reverted and the Hero loses its hero status, becoming a normal Unit! |
| Luth's Chosen | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Target Hero leading an army you control is permanently transformed into a Scourge of Autumn. This also restores all Hit Points and Move Points of the unit. This transformation cannot be reverted and the Hero loses its hero status, becoming a normal Unit! |
| Mass Recall | 100 Mana | 100 WCP | - | Tome of Teleportation | Base game | Makes target friendly army teleport back to the nearest owned city. |
| Morbid Sacrifice | 60 Mana 1 Embalmed Sacrifice | 60 WCP | - | Dark - Cult of Death | Base game | Units in friendly armies in the target Province: • Restore all Hit Points. • Gain Universal Camouflage for 3 Turns. • Gain +15 Morale until the end of their next combat. • Gain +20 Hit Points until the end of their next combat. |
| Nature's Bounty | 120 Mana | 120 WCP | - | Tome of Paradise | Base game | All friendly units in the target Province gain +15 max Hit Points and regenerate 15 Hit Points in neutral and friendly domain for the next 2 World Map Turns. |
| Onoka's Chosen | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Target Hero leading an army you control is permanently transformed into a Scourge of Winter. This also restores all Hit Points and Move Points of the unit. This transformation cannot be reverted and the Hero loses its hero status, becoming a normal Unit! |
| Quickening Ritual | 4 Thralls | 150 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Units in target friendly army gain Very Fast Movement for 2 World Map Turns |
| Recall Ruler | 80 Mana | 80 WCP | - | (non-tome / event / pantheon) | Base game | Return target Army with your Ruler to your Throne City. |
| Revels of Carnage | 60 Mana | 60 WCP | - | Tome of Revelry | Base game | Non-hero units in target friendly army gain +100% Experience from combat for 3 Turns. |
| Teleportation Circle | 120 Mana | 120 WCP | - | (non-tome / event / pantheon) | Base game | Return target Army to Throne City |
| Veil of Darkness | 100 Mana | 100 WCP | - | Tome of the Cold Dark | Base game | Target that is leading an army gains Universal Camouflage for its entire army for 3 Turns. |
| Ventrogh's Chosen | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Target Hero leading an army you control is permanently transformed into a Scourge of Summer. This also restores all Hit Points and Move Points of the unit. This transformation cannot be reverted and the Hero loses its hero status, becoming a normal Unit! |

### Healing Spell (9)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Ancestral Harmony | 5 Mana | 10 CCP | - | Primal - Tunneling Spider, Primal - Glacial Mammoth, Primal - Storm Crow, Primal - Dune Serpent, Primal - Ash Sabertooth, Primal - Mire Crocodile, Primal - Sylvan Wolf | Primal Fury | Target friendly unit: • Heals 15 Temporary Hit Points. • If Fury of the Tunneling Spider is active, heal twice the amount. |
| Arcane Renewal | 15 Mana | 20 CCP | - | (non-tome / event / pantheon) | Base game | Target friendly unit heals 30 Temporary Hit Points. |
| Arcane Restoration | 30 Mana | 25 CCP | - | Tome of Summoning | Base game | Heals all friendly Magic Origin units +25 Temporary Hit Points. |
| Emergency Teleportation | 45 Mana | 30 CCP | - | Tome of Teleportation | Base game | Teleport the closest allied unit within 4 hexes to target empty hex. That unit heals +30 Temporary Hit Points and has all Negative Status Effects removed. |
| Improvised Remedy | 10 Mana | 15 CCP | - | Nomad - Scavengers | Rise from Ruin | All friendly units with Looted Power: • Heal for 10 Temporary Hit Points. • Have their Negative Status Effects removed. |
| Mantra of Purification | 5 Mana | 10 CCP | - | Tome of Discipline | Ways of War | Target friendly unit: • Heals 15 Temporary Hit Points. • Has 3 Negative Status Effect dispelled. |
| Mass Rejuvenation | 150 Mana | 50 CCP | - | Tome of the Goddess of Nature | Base game | • Heals all friendly units +40 Temporary Hit Points. • Brings all dead friendly Animals and Plants back to life with 50% of their total Hit Points. |
| Purifying Flame | 80 Mana | 35 CCP | - | Tome of Dragons | Dragon Dawn | Friendly units in a 1-hex radius: • Heal for 25 Temporary Hit Points. • Have their Negative Status Effects removed. |
| Revitalizing Alliance | 15 Mana | 20 CCP | - | Reaver - Federated | Empires & Ashes | Heal target friendly unit: • Federate Soldier units: • +10 Temporary Hit Points • +5 Temporary Hit Points for each friendly Federate Levy in battle. • Federate Levy units: • +10 Temporary Hit Points • +5 Temporary Hit Points for each friendly Federate Soldier in battle. This effect jumps to 2 additional targets within 3 hexes. |

### Healing/Buff Spell (7)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Awaken Instincts | 150 Mana | 50 CCP | - | Tome of Nature's Wrath | Base game | All friendly units in a 2-hex radius: • Heal +25 Temporary Hit Points. • Regain all Action Points. • Become Berserk for 2 Turns. Does not affect units with Control Loss Immunity. |
| Bolstering Chant | 10 Mana | 15 CCP | - | Industrious | Base game | Target friendly unit: • Heals +20 Temporary Hit Points. • Gains 2 Bolstered Defense. |
| Final Banishment | 150 Mana | 50 CCP | - | Tome of Severing | Empires & Ashes | All non-hero corpses on the map are destroyed. For each corpse destroyed, friendly units: • Gain +1 Bolstered Resistance • Heals +5 Temporary Hit Points |
| Healing Roots | 10 Mana | 15 CCP | - | Tome of Roots | Base game | Target friendly unit: • Heals +10 Temporary Hit Points. • Gains 2 Regeneration. • Has Obscuring Flora created below it. |
| Salvation | 80 Mana | 35 CCP | - | Tome of Sanctuary | Base game | Target friendly unit: • Heals all of its Hit Points as Temporary Hit Points. • Dispels its Negative Status Effects. • Gains 3 Bolstered Resistance. |
| Warding Blessing | 10 Mana | 15 CCP | - | High | Base game | Target friendly unit: • Heals +20 Temporary Hit Points • Gains 2 Bolstered Resistance |
| Youthful Rejuvenation | 10 Mana | 15 CCP | - | Tome of Evolution | Dragon Dawn | Target unit: • Heals for 25 Temporary Hit Points. • Gains 2 stacks of Strengthened. Units with Evolve or Product of Evolution: • Gain Resurgence until the end of combat. |

### Major Race Transformation (13)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Angelic Transformation | 600 Mana | 600 WCP | - | Tome of Exaltation | Base game | Turns the target race into angelic beings, granting them: • The Celestial unit type. • Flying Movement, which increases mobility. • Faithful, which reduces Unit Upkeep. • Decreased number of units in formation. |
| Astral Attunement | 600 Mana | 600 WCP | - | Tome of Astral Convergence | Base game | Links the target race to the Astral Sea, granting them: • The Ethereal unit type. • Attunement: Astral Omen, granting a random Positive Status Effect when a spell is cast in combat. |
| Demonkin | 600 Mana | 600 WCP | - | Tome of the Demon Gate | Base game | Turns the target race into demonic beings, which grants them: • The Infernal Fiend unit type. • Flying, increasing mobility. • Frenzy, increasing damage as they attack. • Cities of this race ignore the City Stability penalty from Chasm and Lava in their Domain. |
| Draconian Transformation | 600 Mana | 600 WCP | - | Tome of Dragons | Dragon Dawn | Turn target race into Draconians, which grants them: • Dragon unit type. • +10 Hit Points. • Natural Regeneration, which makes the unit regain health faster. |
| Fractured Transformation | 600 Mana | 600 WCP | - | (non-tome / event / pantheon) | Rise from Ruin | Target race becomes fractured: • Attacks have a base 60% chance of inflicting Disrupted. This effect is increased for Single Shot attacks. • Gains Mana Starved. • Has all its other enchantments and transformations disabled. For each disabled gain: • 5 Hit Points • +5% damage |
| Gaia's Chosen | 600 Mana | 600 WCP | - | Tome of Paradise | Base game | Infuse the target race with the blessing of nature. They gain: • The Plant unit type. • +3 Status Resistance. • +20 Hit Points. |
| Geomantic Crystallization | 600 Mana | 600 WCP | - | Tome of Geomancy | Giant Kings | Turn target race into resonating crystals that self infuse with environmental magics, gaining: • The Elemental unit type. • Resistance to a specific damage based on the terrain the unit is on. • +2 damage on attacks based on terrain the unit is on. Effects are increased for Single Shot attacks. |
| Gift of the Old Blood | 600 Mana | 600 WCP | - | Tome of the Crimson Reign | Thrones of Blood | Transform your units as they ritually imbibe blood from an Exarch, granting them: • The Undead unit type. • Lifedrinker. • Base attacks have a base 60% chance of inflicting Blood Parasite for 3 Turns. This effect is increased for Single Shot attacks. |
| Gloom Strider | 600 Mana | 600 WCP | - | Tome of Corruption | Eldritch Realms | Turns target race into Umbral beings, which grants them: • The Umbral Demon unit type. • Floating. • Fast Movement. Mounted units lose their mounts. Heroes lose their Mount and Leg equipment slots. This transformation is incompatible with Pure Soul. |
| Naga Transformation | 600 Mana | 600 WCP | - | Tome of the Stormborne | Primal Fury | Target race gains the body of a Naga, granting: • Fast Movement • Amphibious • Slip Away • Immunity to Electrified • +2 Blight Protection • +2 Lightning Protection Mounted units lose their mounts. Heroes lose their Mount and Leg equipment slots. |
| Spider's Embrace | 600 Mana | 600 WCP | - | Tome of the Weaver | Secrets of the Archmages | Target race weaves themselves with spiders gaining: • The Spider unit type. • Fast Movement • Base attacks gain a base 30% chance of inflicting Immobilized for 1 Turn. Increased for Single Shots. Mounted units lose their mounts. Heroes lose their Mount and Leg equipment slots. |
| Wightborn | 300 Mana 100 Souls | 300 WCP | - | Tome of the Great Transformation | Base game | Gives the target race immortality beyond life, granting them: • The Undead unit type. • Life Steal, which restores Temporary Hit Points upon each attack. |
| Ysariel's Fallen Form | 600 Mana | 600 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Target race is infused with Fallen Angels gaining: • The Celestial unit type. • Flying. • Frenzy. • Decreased number of units in formation. |

### Minor Race Transformation (31)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Animal Kinship | 150 Mana | 150 WCP | - | Tome of Beasts | Base game | Makes the target race more bestial and connected to animals. When adjacent to a friendly Animal, both units are granted: • +10% damage • +10% Critical Hit Chance |
| Anointed People | 450 Mana | 450 WCP | - | Tome of Sanctuary | Base game | Gives the target race divine protection, granting them: • +3 Status Resistance • +3 Spirit Protection |
| Astral Blood | 250 Mana | 250 WCP | - | Tome of Amplification | Base game | Makes magic begin to flow through the veins of the target race, granting them: • Attunement: Fortune, which increases Critical Hit Chance when spells are cast. |
| Bred for War | 150 Mana | 150 WCP | - | Tome of the Warband | Rise from Ruin | Transformed units become stronger and more battle ready gaining: • +10 Hit Points. • +10% Morale resistance to morale loss, plus +10% for each adjacent friendly unit. |
| Demonic Hunger | 150 Mana | 150 WCP | - | Tome of Gluttony | Secrets of the Archmages | Target race is charged with infernal forces of gluttony, gaining: • When killing a non-Combat Summon enemy unit, gain a permanent stack of Gorged which: • At 10 stacks turns into a permanent stack of Demonic Satiation. • Cannot be gained when Demonic Satiation is at 10 stacks. • When pillaging a province, heal for 25% of their maximum Hit Points. |
| Draconic Vitality | 150 Mana | 150 WCP | - | Tome of Evolution | Dragon Dawn | Target race is imbued with Dragon-like vitality, granting them: • +5 Hit Point regeneration per World Map Turn. • +3 Hit Points per Unit Rank. • +3 Hit Points per Hero Level, up to Level 10. |
| Dunestalkers | 250 Mana | 250 WCP | - | Tome of the Sand Stalkers | Rise from Ruin | Target race becomes one with the desert, granting them: • Sand Walk • Sand Camouflage • When on Sand terrain gain: • Fast Movement • +20% Flanking damage |
| Earthkin | 150 Mana | 150 WCP | - | Tome of Rock | Base game | Makes rock growths develop on the target race, granting them: • +1 Defense. • Mountain Camouflage, which allows them to hide on Mountain terrain. • Mountain Walk, which allows them to traverse Mountain terrain faster. |
| Feytouched | 250 Mana | 250 WCP | - | Tome of Fey Mists | Base game | Makes the target race connect with Fey powers, granting them: • Fey Guile • The ability to ignore: • Vision penalties from Misty. • Accuracy penalties from Clinging Mist. |
| Fiery Heart | 250 Mana | 250 WCP | - | Tome of Burning Passion | Secrets of the Archmages | Target race gains a fiery core, gaining: • +2 Fire Protection • +10% Critical Hit chance • Fire Hazard Immunity |
| Flesh Carved Runes | 150 Mana | 150 WCP | - | Tome of the Blood Rite | Thrones of Blood | Carve profane sigils onto the flesh of your race, granting them: • +5 Hit Point regeneration on the World Map. • Attack and Debuff abilities: • Ignore 1 Status Resistance per stack of Bleeding on the target. |
| Frostling Transformation | 350 Mana | 350 WCP | - | Tome of the Cold Dark | Base game | Makes winter run through the target race's veins, granting them: • 3 Frost Protection. • Immunity to Frozen. • +10 Morale while on cold terrain. • Arctic Walk, which allows them to traverse cold terrain faster. |
| Goldtouched | 450 Mana | 450 WCP | - | Tome of the Golden Realm | Base game | Makes the target race gain an affinity for gold, granting them: • +2 Resistance. • +1 Gold per Population in their Cities. |
| Inner Mastery | 150 Mana | 150 WCP | - | Tome of Discipline | Ways of War | Grants the target race mastery over their own internal energies, granting them: • +1 Status Resistance • +20% healing received in combat. |
| Joy Siphoners | 250 Mana | 250 WCP | - | Tome of the Doomherald | Base game | Target race becomes a living morale siphon, gaining: • +4 Morale when attacking an enemy. • Demoralizer Effects are increased for Single Shot attacks. |
| Leafskin | 250 Mana | 250 WCP | - | Tome of Glades | Base game | Makes the target race one with the forest, granting them: • Forest Walk • Forest Camouflage • When in a province with Forest or Mushroom Forest: • +10% Evasion • +10% Accuracy • +10% Critical Hit Chance |
| Linked Minds | 250 Mana | 250 WCP | - | Tome of the Construct | Empires & Ashes | Units of this race gain the ability to share senses, granting them: • Hyper-Awareness when standing next to a Construct or another unit with Linked Minds. |
| Living Shadows | 250 Mana | 250 WCP | - | Tome of Shades | Ways of War | Wreathes target race in swirling shadows, granting them: • +10% Evasion. • Fleeting. • When this unit's Hit Points drop below 60%: • It becomes Obscured for 1 Turn. • Adjacent enemies have a base 90% chance of becoming Blind for 1 Turn. |
| Magical Wards | 150 Mana | 150 WCP | - | Tome of Warding | Base game | Inscribes magical wards onto the target race, granting: • +2 Lightning Protection • +2 Fire Protection • +2 Frost Protection |
| Painbound | 350 Mana | 350 WCP | - | Tome of Torment | Thrones of Blood | Target race embraces pain and when hit by an attack gain: • 2 Morale. • A random positive status effect. |
| Pure Soul | 450 Mana | 450 WCP | - | Tome of the Archon | Archon Prophecy | Purify the souls of target race, granting them: • At the start of each turn in combat, dispel 1 Negative Status Effect. • If the Negative Status Effect removed had a positive counter, gain the Positive Status Effect. This transformation is incompatible with Umbral Flesh and Gloom Strider. |
| Reveler's Heart | 250 Mana | 250 WCP | - | Tome of Revelry | Base game | Overwhelms the target race with an intense fervor, granting them: • +50% Morale from all sources. |
| Scion of Flame | 450 Mana | 450 WCP | - | Tome of Chaos Channeling | Base game | Makes the target race the embodiment of fire, granting them: • 4 Fire Protection. • Vengeful Flames, which damages Melee attackers. • Fiery Wake, which ignites flammable terrain such as Flora Obstacles. • Immunity to Burning. • Lava Walk. • Cities of this race ignore the City Stability penalty from Chasm and Lava in their Domain. |
| Spawnkin | 150 Mana | 150 WCP | - | Tome of the Horde | Base game | Makes the target race smaller and more numerous, granting them: • Increased number of units in formation. • +20% damage for non-hero units. • +10% Evasion for hero units. • Incompatible with Supergrowth. |
| Steel Skin | 350 Mana | 350 WCP | - | Tome of Transmutation | Base game | Transmutes the target race's skin into steel, granting them: • +2 Physical Protection. • +2 Blight Protection • -2 Lightning Protection |
| Supergrowth | 350 Mana | 350 WCP | - | Tome of Vigor | Base game | Makes the target race grow in mass and stature, granting them: • +10 Hit Points. • +1 Retaliation Attack. • Decreased number of units in formation. This transformation is incompatible with Spawnkin. |
| Transformation Ascetics | - | 0 WCP | - | (non-tome / event / pantheon) | Base game | • Units of this Race cannot have any non-Cultural Unit Enchantments. • Units of this Race cannot have any Race Transformation. • Non-Hero Units of this Race gain +5 maximum Hit Points and deal +1 damage (doubled for non-repeating) with their attacks per Rank. • Hero Units of this Race gain +5 maximum Hit Points and deal +1 damage (doubled for non-repeating) with their attacks per Signature Skill they have. |
| Umbral Flesh | 250 Mana | 250 WCP | - | Eldritch Pact | Eldritch Realms | Gives the target race blessings of the Umbral Abyss, granting them: • Umbral Malady Immunity • While in Gloom terrain units gain: • +10 Morale • +12 Hit Point per Turn on the world map. • Cities of the race: • Gain +2 Knowledge income for each province with Gloom terrain. • Ignore City Stability penalties from Gloom terrain. • Hero units gain Gloom Shepherd. This transformation is incompatible with Pure Soul. |
| Vessels of Chaos | 350 Mana | 350 WCP | - | Tome of Pandemonium | Base game | Turns the target race into a conduit for chaotic energies, granting them: • +10% damage for each of the target's Negative Status Effects. Stacks up to 3 times. |
| Virtuous Spirit | 250 Mana | 250 WCP | - | Tome of Virtue | Archon Prophecy | Gives target race strength in moments of weakness, giving them: • +2 Spirit Protection • When this unit drops below 60% of their maximum Hit Points: • Ignores 50% of its Casualties. • Gains +1 Defense. • Gains +1 Resistance. |
| Yaka's Feline Infusion | 250 Mana | 250 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Infuse target race with feline essence gaining: • Very Fast Movement • +25% Evasion against Missile and Magic attacks. |

### Spell Victory (6)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Age of Astral | 800 Mana | 400 WCP | 50 Mana | (non-tome / event / pantheon) | Base game | Channel the Age of Astral to reach the Magic Victory. While channeling: • Your Astral Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Each turn in combat, a random enemy takes 15 mixed Fire, Lightning, and Frost, damage and gets 2 Sundered Resistance and 2 Status Vulnerability. |
| Age of Chaos | 800 Mana | 400 WCP | 50 Mana | (non-tome / event / pantheon) | Base game | Channel the Age of Chaos to reach the Magic Victory. While channeling: • Your Chaos Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Each Turn in combat, a random enemy unit sustains 15 damage of a random type and has a base 90% chance of receiving a random Negative Status Effect. |
| Age of Materium | 800 Mana | 400 WCP | 50 Mana | (non-tome / event / pantheon) | Base game | Channel the Age of Materium to reach the Magic Victory. While channeling: • Your Materium Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Each turn in combat, a friendly unit gains Bolstered Defense and Bolstered Resistance. Repeats 2-4 times. |
| Age of Nature | 800 Mana | 400 WCP | 50 Mana | (non-tome / event / pantheon) | Base game | Channel the Age of Nature to reach the Magic Victory. While channeling: • Your Nature Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Every 2 turns in combat, a Tier II-III nature unit is summoned on your side. |
| Age of Order | 800 Mana | 400 WCP | 50 Mana | (non-tome / event / pantheon) | Base game | Channel the Age of Order to reach the Magic Victory. While channeling: • Your Order Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Each turn in combat, a random ally gains 3 random Positive Status Effects and loses all Negative Status Effects. |
| Age of Shadow | 800 Mana | 400 WCP | 50 Mana | (non-tome / event / pantheon) | Base game | Channel the Age of Shadow to reach the Magic Victory. While channeling: • Your Shadow Affinity Spells cost -20% Mana, World Map Casting Points, and Combat Casting Points. • Each turn in combat, a random corpse is reanimated as a Decaying Zombie until the end of combat. |

### Summon Spell (63)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Astral Siphoner Ritual | 4 Thralls | 150 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Summons an Astral Siphoner on target hex. |
| Astral Wisp Ritual | 1 Thralls | 45 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Summons an Astral Wisp on target hex. |
| Awaken the Forest | 400 Mana | 400 WCP | - | Tome of Nature's Wrath | Base game | Target Province with Forest: • Loses Forest. • An Army of Animals and Plants is summoned under your control. |
| Belbedor's Folly | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Summon a Feylor, a powerful unit that uses the abilities of a powerful fiend with a Fey twist. |
| Call Greater Animal | 150 Mana | 150 WCP | - | Tome of Vigor | Base game | • Choose a Tier III or Tier IV Animal unit to add to your army. • The available Animals depend on the type of terrain the spell is cast on. |
| Call Militia | 60 Gold | 60 WCP | - | Feudal - Aristocracy, Feudal - Monarchy | Base game | Summon 2 Militia in the target owned City. |
| Call Wild Animal | 60 Mana | 60 WCP | - | Tome of Beasts | Base game | • Choose a Tier I or Tier II Animal unit to add to your army. • The available Animals depend on the type of terrain the spell is cast on. |
| Call young Dragon | 150 Mana | 150 WCP | - | (non-tome / event / pantheon) | Dragon Dawn | • Choose a Tier III young Dragon unit to add to your army. |
| Demonic Summoning | 150 Mana | 150 WCP | - | Tome of the Demon Gate | Base game | Target one of your Free City Vassals: • Summon 2 random Fiends under your control, one will be Tier III and the other Tier IV. • The Vassal loses: • A Vassalage Phase diplomatic stage. • 1 Population. Cannot be cast on a Denying Tributary. |
| Golden Horde | 300 Mana | 300 WCP | - | Tome of Chaos Channeling | Base game | • Summons a full army of random non-Scout Tier I units that can be produced in a city on the target hex. • If cast within an enemy Province, instantly pillages it. |
| Mage Bane Ritual | 10 Thralls | 300 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Summons a Mage Bane on target hex. |
| Nimue's Failure | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Summon a Colossal Penguin, the failed experiment of Nimue as she tried to harness a power too evil for even her to control. Additionally, unlock the drafting of some Penguin units in cities. |
| Raise Undead Army | 150 Souls | 300 WCP | - | Tome of the Eternal Lord | Base game | Summons a full army stack of low-Tier Undead units onto a target world hex. |
| Summon Accursed Ogre | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Ways of War | Summon an Accursed Ogre, a shock unit that pushes enemies around and inflicts them with Ghostfire. |
| Summon Astra | 150 Gold 300 Mana | 300 WCP | - | Tome of the Archon | Archon Prophecy | Summon an Astra Mythic Unit, an Angel unit with strong attacks and healing abilities. |
| Summon Astral Serpent | 150 Mana | 150 WCP | - | Tome of Summoning | Base game | Summons an Astral Serpent, a Magic Fighter Unit that can teleport into the front lines in an explosive manner. |
| Summon Balor | 300 Mana | 300 WCP | - | Tome of the Demon Gate | Base game | Target city loses 2 Population and spawns a Balor, a mythic unit that wreaks havoc on your foes. |
| Summon Banshee | 45 Souls | 90 WCP | - | Tome of Souls | Base game | Summons a Banshee, a vengeful spirit that lowers morale and weakens enemies with its piercing wails. |
| Summon Blessed Dragon | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Ways of War | Summon a Blessed Dragon, a support unit that grants Regeneration and Grace to friendly units. |
| Summon Blessed Soul | 150 Mana | 150 WCP | - | Tome of the Beacon | Base game | Summons a Blessed Soul Shield Unit that can rally your units and condemn the enemy. |
| Summon Blood Exarch | 150 Gold 300 Mana | 300 WCP | - | Tome of the Crimson Reign | Thrones of Blood | Summon a Blood Exarch Mythic Unit with powerful support and offensive abilities that devastate low tier units. |
| Summon Calamity Dragon | 300 Mana | 300 WCP | - | Tome of Calamity | Ways of War | Target owned non-ruined Province turns to Ruins and Desolate terrain and then summons a Calamity Dragon, a Mythic Unit unit with strong offensive capabilities. |
| Summon Chaos Eater | 200 Mana | 200 WCP | - | Tome of Pandemonium | Base game | Summons a Chaos Eater, a close-range Battle Mage Unit that thrives on eating Negative Status Effects. |
| Summon Copper Golem | 60 Mana | 60 WCP | - | Tome of Enchantment | Base game | Summons a Copper Golem, a Tier I Polearm Unit. |
| Summon Corrupt Soul | 150 Mana | 150 WCP | - | Tome of the Doomherald | Base game | Summons a Corrupt Soul, a Magic Fighter Unit that exploits low enemy unit Morale. |
| Summon Elemental | 150 Mana | 150 WCP | - | Tome of Geomancy | Giant Kings | Summon a Tier III Elemental unit on target hex. The Elemental summoned changes based on the terrain type. |
| Summon Entwined Protector | 150 Mana | 150 WCP | - | Tome of Glades | Base game | Summons an Entwined Protector, a Shield Unit with healing abilities. |
| Summon Entwined Thrall | 60 Mana | 60 WCP | - | Tome of Roots | Base game | Summons an Entwined Thrall, a poisonous and plantlike creature. |
| Summon Fallen Angel | 150 Souls | 300 WCP | - | Tome of the Revenant | Archon Prophecy | Summon a Fallen Angel Battle Mage Unit, that causes decay and corruption. |
| Summon Flame Incarnate | 300 Mana | 300 WCP | - | Tome of Chaos Channeling | Base game | Summons a non-Fiend Tier V Mythic Unit with Fire and Burning-related abilities on target hex. |
| Summon Gluttonous Imp | 60 Mana | 60 WCP | - | Tome of Gluttony | Secrets of the Archmages | Summon a Gluttonous Imp on target hex. |
| Summon Gremlin | 100 Mana | 100 WCP | - | Tome of Mayhem | Base game | Summons a Gremlin onto the target world hex. This unit is a disruptive and fiendish Magic Fighter Unit. |
| Summon Horned God | 300 Mana | 300 WCP | - | Tome of Nature's Wrath | Base game | Summons the Horned God, a Tier V Mythic Unit with potent summoning abilities. |
| Summon Irregulars | 60 Mana | 60 WCP | - | Tome of the Horde | Base game | Summons a random non-Scout Tier I unit that can be produced in a city on the target hex. |
| Summon Lesser Light Spirit | 60 Mana | 60 WCP | - | Tome of Faith | Base game | Summons a Lesser Light Spirit Support Unit. |
| Summon Lesser Magma Spirit | 60 Mana | 60 WCP | - | Tome of Pyromancy | Base game | Summons a Lesser Magma Spirit on target hex. |
| Summon Lesser Snow Spirit | 60 Mana | 60 WCP | - | Tome of Cryomancy | Base game | Summons a Lesser Snow Spirit, a Magic Fighter Unit with attacks that inflict Frozen. |
| Summon Lesser Stone Spirit | 60 Mana | 60 WCP | - | Tome of Rock | Base game | Summons a Lesser Stone Spirit, a Shield Unit with good defenses. |
| Summon Lesser Storm Spirit | 60 Mana | 60 WCP | - | Tome of Evocation | Base game | Summons a Lesser Storm Spirit on target hex. |
| Summon Light Spirit | 150 Mana | 150 WCP | - | Tome of Sanctuary | Base game | Summon a Light Spirit, a Support Unit with strong healing capabilities. |
| Summon Lightbringer | 100 Mana | 100 WCP | - | Tome of the Inquisition | Base game | Summon a Lightbringer Battle Mage Unit that can convert other units to your cause. |
| Summon Living Fog | 200 Mana | 200 WCP | - | Tome of Oblivion | Base game | Summons a Living Fog unit onto the target world hex. |
| Summon Mirror Mimic | 200 Mana | 200 WCP | - | Tome of the Astral Mirror | Base game | Summons a Mirror Mimic, a Mythic Unit that can take the form of other units, gaining their abilities and healing themselves. |
| Summon Mistling | 150 Mana | 150 WCP | - | Tome of Fey Mists | Primal Fury | Summons a Mistling, a Magic Fighter Unit with attacks that inflict random Negative Status Effects. |
| Summon Nymph | 150 Mana | 150 WCP | - | Tome of Fertility | Base game | Summons a Nymph onto the target world hex. |
| Summon Phantasm Warrior | 60 Mana | 60 WCP | - | Tome of Warding | Base game | Summons a Phantasm Warrior, a Shield Unit that strikes with Lightning Damage. |
| Summon Phase Beast | 200 Mana | 200 WCP | - | Tome of Teleportation | Base game | Summons a Phase Beast onto the target world hex. |
| Summon Prosperity Dragon | 150 Gold 300 Mana | 300 WCP | - | Tome of Prosperity | Ways of War | Summons a Prosperity Dragon, a Mythic Unit unit with strong protective and healing abilities. |
| Summon Reaper | 150 Souls | 300 WCP | - | Tome of the Reaper | Base game | Summons a Reaper, a Tier V Mythic Unit that can instantly kill units and grows stronger when enemies die. |
| Summon Rock Giant | 200 Mana | 200 WCP | - | Tome of Terramancy | Base game | Summons a Rock Giant, a Mythic Unit that throws boulders that hinder enemies and crushes them with earthquake like smashes. |
| Summon Sand Scorpion | 150 Mana | 150 WCP | - | Tome of the Sand Stalkers | Rise from Ruin | Summon a Sand Scorpion, a Shield Unit unit with a debilitating poison. |
| Summon Snow Spirit | 150 Mana | 150 WCP | - | Tome of the Cold Dark | Base game | Summon a Snow Spirit, a Magic Fighter Unit with attacks that inflict Frozen. |
| Summon Sprite | 60 Mana | 60 WCP | - | Tome of the Sprite | Secrets of the Archmages | Summon a Morning Sprite Support Unit or an Evening Sprite Battle Mage Unit. |
| Summon Umbral Juggernaut | 150 Mana | 150 WCP | - | Eldritch Pact | Eldritch Realms | Summons an Umbral Juggernaut on target hex. |
| Summon Umbral Mistress | 200 Mana | 200 WCP | - | Tome of Corruption | Eldritch Realms | Summons an Umbral Mistress, a Mythic Unit that can manipulate other units to do her bidding. |
| Summon Vigil | 150 Mana | 150 WCP | - | Tome of Virtue | Archon Prophecy | Summon a Vigil Battle Mage Unit, a unit that delivers holy fire to purify their enemies. |
| Summon War Golem | 150 Mana | 150 WCP | - | Tome of the Warlord | Rise from Ruin | Summon a War Golem, an infernal siege weapon that specializes in destroying enemy fortifications. |
| Summon Watcher | 150 Mana | 150 WCP | - | Tome of Scrying | Base game | Summons a Watcher, a Battle Mage Unit with increased vision capabilities. |
| Summon Willthief | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Summons a Willthief, an Umbral Demon that binds to and drains enemy units. |
| Summon Wind Rager | 100 Mana | 100 WCP | - | Tome of Winds | Base game | Summon a Wind Rager, a fast and disruptive Magic Fighter Unit |
| Summon Wyvern Fledgling | 60 Mana | 60 WCP | - | Tome of Evolution | Dragon Dawn | Summons a Wyvern Fledgling to target hex. |
| Summon Zealot | 60 Mana | 60 WCP | - | Tome of Zeal | Base game | Summons a Zealot onto the target world hex. A Zealot is a reckless Fighter Unit that is advantageous against Condemned units. |
| Thulyana's Contortion | 300 Mana | 300 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Summon an Abominable Mistling, a transformed and monstrous Fey that favors brute force over Fey tricks. |

### Sustained City Spell (17)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Amplify Minds | 80 Mana | 80 WCP | 8 Mana | Tome of Amplification | Base game | Target owned city gains: • +20 Knowledge income • -10 City Stability |
| Awakened Tools | 60 Mana | 60 WCP | 6 Mana | Tome of Enchantment | Base game | Target owned city has: • +20 Production • +20 Draft • -10 City Stability |
| Bind Leviathan Landmark | 100 Mana | 100 WCP | 10 Mana | (non-tome / event / pantheon) | Secrets of the Archmages | Puts the Leviathan Landmark next to the target city into dormant state, deactivating its adjacency effects. As the crisis progresses, once all Landmarks have been revealed, a bound Leviathan Landmark may be woken up again, disengaging this spell. |
| Bounty of the Sea | 80 Mana | 80 WCP | 8 Mana | Tome of the Stormborne | Primal Fury | Target owned City gains: • Double the base resources from Coastal Province Improvement. • -10 City Stability. |
| City Wards | 45 Mana | 45 WCP | 10 Mana | Tome of Abjuration | Secrets of the Archmages | Target owned city or non-hostile free city: • Gains +10 City Stability. • Gains +10 Fortification Health if not under siege. • If targeting a free city with an owned Whispering Stone, gain +2 Allegiance per turn. |
| Consecrated Domain | 80 Mana | 80 WCP | 8 Mana | Tome of Sanctuary | Base game | Target friendly City, friendly units in the Domain gain: • +2 Resistance. • +20 Morale at the start of battle. |
| Construct Population | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Empires & Ashes | Target friendly city gains +40 Food. This spell costs Binding Essence. |
| Corrupt Pact | 60 Mana | 60 WCP | - | Tome of Gluttony | Secrets of the Archmages | Target Free City: • Has its Relations to other rulers reduced by 200. • 80% of its Food income is given to your cities. |
| Covenant of the Faith | 60 Mana | 60 WCP | - | Tome of the Beacon | Base game | Units recruited through Rally of the Lieges from the target Vassal have Faithful. Target Vassal city grants the player +15 Mana each Turn. |
| Cycle of Seasons | 120 Mana | 120 WCP | 12 Mana | Tome of Cycles | Base game | All battles that take place in target city's domain gain Cycle of Seasons, granting a different effect each battle turn in the following order: • Winter: All enemies sustain 10 Frost. • Spring: All friendly units become 1 Strengthened. • Summer: All friendly units heal +10 Temporary Hit Points. • Autumn: All enemies become 1 Weakened. |
| Domain of Death | 60 Souls | 50 WCP | 5 Mana | Tome of the Great Transformation | Base game | Target friendly city: • Has +20 City Stability. • Friendly Undead units in the domain deal +10% damage. • Enemy units in the domain become Soulbound. |
| Elemental Bane | 100 Mana | 100 WCP | 10 Mana | (non-tome / event / pantheon) | Empires & Ashes | Targets a city, and whenever you fight in that domain, a Gremlin is summoned next to one of your units every Turn. Up to 5 Gremlins can be summoned per battle. |
| Faithful Whispers | 45 Mana | 45 WCP | - | Tome of Faith | Base game | Allegiance with target Free City increases 30% faster. |
| Fog of Insanity | 200 Mana | 200 WCP | 20 Mana | Tome of Oblivion | Base game | Target friendly City. Any battle in the Domain of the City now has the Fog of Insanity battle enchantment, which causes enemies to have a base 20% chance of gaining Insanity every Turn. |
| Gremlin Ambushers | 100 Mana | 100 WCP | 10 Mana | Tome of the Demon Gate | Base game | Targets a city, and whenever you fight in that domain, a Gremlin is summoned next to one of your units every Turn. Up to 5 Gremlins can be summoned per battle. |
| Harvest Population | 45 Mana | 45 WCP | - | Tome of the Reaper | Base game | Target friendly City: • No longer gains any Food income. • Gains +30 Souls income. • Has -20 City Stability |
| Transmute Resources | 100 Mana | 100 WCP | - | Tome of Transmutation | Base game | Target owned city converts their Mana income, gaining Gold, Production, and Food income equal to 75% of the Mana income. |

### Sustained World Spell (9)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Astral Revelation | 150 Mana | 150 WCP | 15 Mana | Tome of the Astral Mirror | Base game | Units and Cities you control gain +7 Vision Range. |
| Bind Gold Ancient Wonder | 400 Mana | 300 WCP | - | (non-tome / event / pantheon) | Base game | • Target owned and annexed Gold Gold Ancient Wonder becomes bound. • While bound, it grants +50 Knowledge. • A number of bound Golden Ancient Wonders are required for Magic Victory. • This spell is canceled if the Bound Ancient Wonder is occupied or changes ownership. |
| Cascading Power | 120 Mana | 120 WCP | 12 Mana | Tome of Astral Convergence | Base game | Whenever you cast a spell in Tactical Combat, add a Stack of Cascading Power to that combat. |
| Fortress of Vines | 300 Mana | 300 WCP | 30 Mana | Tome of Paradise | Base game | Your empire gains: • Your non-hero units in your domain earn 10 Experience each Turn. • Enemy units in this domain spend 4 more Move Points per hex moved. • A Living Vine spawns next to an enemy each turn during battle in your domain. |
| Rite of Spell Storm | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Base game | Gain 200 World Map Casting Points and Combat Casting Points until the end of the turn. |
| Ritual of the Gloomveil | 300 Mana | 300 WCP | 30 Mana | Eldritch Pact | Eldritch Realms | All Units in your Empire gain Umbral Malady Immunity. |
| Soul Collection | 45 Mana | 45 WCP | 30 Gold | Tome of Necromancy | Base game | • Gain +10 Souls income. • Costs 30 Gold upkeep. |
| Summon Avatar of the Cosmos | 300 Mana | 300 WCP | - | Tome of the Cosmos | Secrets of the Archmages | Summon the Avatar of the Cosmos, a Mythic Unit that is empowered by your own affinities. |
| Umbral Rift | 100 Mana | 100 WCP | 10 Mana | Eldritch Pact | Eldritch Realms | Create an Umbral Rift in the target Umbral Abyss province, and another nearby on the Surface layer. |

### Terraforming Spell (24)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Abyssal Flames | 150 Mana | 150 WCP | - | Tome of Chaos Channeling | Base game | Target Province: • Enemy Units suffer -2 Fire Protection for 1 World Map Turn. • The provinces gain Ashlands. • The provinces lose River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom. • Summon a Magma Spirit on the targeted hex. |
| Create Forest | 45 Mana | 45 WCP | - | Tome of Glades | Base game | Target and adjacent Provinces: • Gain Forest on the Surface • Gain Mushroom Forest in the Underground. |
| Desecrate Land | 60 Mana | 60 WCP | - | Tome of Calamity | Ways of War | Target Province: • If it contains a Province Improvement, it becomes Pillaged. • You are granted its rewards and lose Alignment. • The province gains Ashlands. • The province loses River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom. |
| Desecration Ritual | 6 Thralls | 275 WCP | - | (non-tome / event / pantheon) | Thrones of Blood | Target and adjacent surface Provinces: • Gains Sunless. • Enemy armies sustain 20 Frost Damage. |
| Desertification | 45 Mana | 45 WCP | - | Tome of the Sand Stalkers | Rise from Ruin | Target and adjacent surface Provinces: • Gain Sand. • Lose Chasm, Swamp, Snow, Ice, Ashlands, and Gloom. |
| Destructive Regrowth | 150 Mana | 150 WCP | - | Tome of Nature's Wrath | Base game | On Target Province: • Enemy units sustain 20 Blight Damage and suffer -2 Blight Protection for 2 Turn. • If it contains an enemy Province Improvement, it becomes Pillaged. • You are not granted its rewards nor do you lose Alignment. • The province gains Forest if on the Surface or Mushroom Forest if in the Underground. |
| Earth Shatter | 150 Mana | 150 WCP | - | Tome of Terramancy | Base game | In target habitable or uninhabitable Province: • Enemy Units sustain 10 Physical Damage. • The province loses any Mountain, Stalagmites, and Diggable Earth. • Summon a Stone Spirit on the target hex. |
| Earthshape: Ashland | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Base game | Target friendly or unowned Province: • Gains Ashlands • Loses River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom |
| Earthshape: Forest | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Base game | Target friendly or unowned Province: • Gains Forest if it is on the Surface. • Mushroom Forest if it is in the Underground. |
| Earthshape: Grasslands | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Base game | Target friendly or unowned Surface Province: • Gains Grassland. • Loses Chasm, Sand, Swamp, Snow, Ice, Ashlands, and Gloom. |
| Earthshape: Sand | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Base game | Target friendly or unowned Surface Province: • Gains Sand. • Loses Chasm, Swamp, Snow, Ice, Ashlands, and Gloom. |
| Earthshape: Snow | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Base game | Target friendly or unowned Province: • Gains Snow and Ice. • Loses Chasm, Grassland, Swamp, Ashlands, Sand, Cavern Floor, and Gloom. |
| Earthshape: Swamp | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Base game | Target friendly or unowned Surface Province: • Gains Swamp • Loses Chasm, Sand, Snow, Ice, Ashlands, and Gloom. |
| Enchanted Bloom | 150 Mana | 150 WCP | 15 Mana | Tome of Paradise | Base game | Target friendly City gains: • Every Turn, 1 Province within or adjacent to the Domain: • Gain Grassland and Forest if on the Surface, or Fungus Fields and Mushroom Forest if in the Underground. • Lose Chasm, Swamp, Sand, Snow, Ice, Ashlands, and Gloom. • Provinces within the domain with either Grasslands, Forests, Fungus Fields, or Mushroom Forest features gain: +5 Food, +5 City Stability |
| Flash Freeze | 100 Mana | 100 WCP | - | Tome of the Cold Dark | Base game | Target Province: • Enemy Units in the Province suffer: • 20 Frost Damage. • -5 Status Resistance for 1 World Map Turns. • The province gains Snow and Ice. • The province loses Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. |
| Marching Winter | 120 Mana | 120 WCP | 12 Mana | Tome of the Cold Dark | Base game | Target friendly City gains:Every Turn, 2 Provinces within or adjacent to the Domain: • Gain Snow and Ice. • Lose Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. • Provinces in the domain with Snow or Ice provide +2 Food and +2 Production income. |
| Pall of Darkness Ritual | 1 Thralls | 30 WCP | - | (non-tome / event / pantheon) | Thrones of Blood | Target surface Provinces gain Sunless for 3 Turns. |
| Pall of Gloom | 150 Mana | 150 WCP | - | Eldritch Pact | Eldritch Realms | Target Province and adjacent Provinces: • Gain Gloom • Lose Chasm, River, Sand, Snow, Ice, Ashlands, Swamp, Cavern Floor, and Dungeon. • Enemy Units suffer 10 Frost Damage and 10 Blight Damage. |
| Pyroclastic Eruption | 150 Mana | 150 WCP | - | Tome of the Crucible | Base game | Target Province: • If it contains an enemy Province Improvement, it will be Pillaged. • You will not gain its rewards or lose Alignment. • Enemy Units in the province sustain 20 Fire Damage. • The province gains Ashlands. • The province loses River, Grassland, Swamp, Snow, Ice, Sand, Cavern Floor, and Gloom. |
| Restore the Land | 45 Mana | 45 WCP | - | Tome of Fertility | Base game | Target and adjacent friendly or unowned Provinces: • Gains Grassland if it is on the Surface or Fungus Fields and Mushroom Forest if it is in the Underground. • Loses Chasm, Swamp, Snow, Ice, Ashlands, Sand, Cavern Floor, Stalagmites, and Gloom. |
| Summon Ice Runestele | 80 Mana | 80 WCP | 5 Mana | (non-tome / event / pantheon) | Giant Kings | Summon an Ice Runestele on target Province, which will appear on an empty hex and terraform surrounding provinces every Turn. |
| Summon Lava Runestele | 80 Mana | 80 WCP | 5 Mana | (non-tome / event / pantheon) | Giant Kings | Summon a Lava Runestele on target Province, which will appear on an empty hex and terraform surrounding provinces every Turn. |
| Summon Rock Runestele | 80 Mana | 80 WCP | 5 Mana | (non-tome / event / pantheon) | Giant Kings | Summon a Rock Runestele on target Province, which will appear on an empty hex and terraform surrounding provinces every Turn. |
| Summon Storm Runestele | 80 Mana | 80 WCP | 5 Mana | (non-tome / event / pantheon) | Giant Kings | Summon a Storm Runestele on target Surface Province, which will appear on an empty hex and terraform surrounding provinces every Turn. |

### Unit Enchantment (121)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Abjurer Glyphs | 70 Mana | 70 WCP | - | Tome of Abjuration | Secrets of the Archmages | Enchanted units gain: • Battle Shields, gaining Precognition when its total Hit Points reach 60% and 30%. |
| Accursed Armors | 120 Mana | 120 WCP | - | Tome of Calamity | Ways of War | Enchanted units gain: • When a melee range attack hits, the attacker has a 60% chance of being inflicted with Misfortune for 3 Turns. • +1 Defense. |
| Accursed Imbuement | 120 Mana | 120 WCP | - | Tome of Calamity | Ways of War | Attacks of enchanted units: • Deal +1 Fire Damage. • Deal +1 Frost Damage • Inflict Ghostfire for 3 Turns. Effects are increased for Single Shot attacks. |
| Adaptive Armor | 120 Mana | 120 WCP | - | Tome of Transmutation | Base game | Once per Turn, whenever enchanted units are damaged by Magic attacks or spells, they gain: • Bolstered Resistance, increasing their resistance to magical damage. • Status Protection, reducing the chance that the unit will be affected by Negative Status Effects. |
| Amplifying Imbuement | 100 Mana | 100 WCP | - | Tome of Amplification | Base game | Makes base attacks of enchanted units: • Deal +3 Lightning Damage. • Deal 3 Lightning Damage to 2 other targets within 2 hexes. • Have a base 30% chance of inflicting Sundered Resistance on each target hit for 3 Turns. Effects are increased for Single Shot attacks. |
| Artisan Armaments | 80 Mana | 80 WCP | - | Tome of Artificing | Base game | Grants enchanted units: • +25% Critical Hit Chance. |
| Aspect of the Root | 90 Mana | 90 WCP | - | Tome of Glades | Base game | Grants enchanted units: • The Aspect of the Root ability, which allows units to heal themselves in battle. |
| Banner of the Federation | 90 Mana | 90 WCP | - | Reaver - Federated | Empires & Ashes | Grants non-Reaver units: • Federate Soldier |
| Blades of Decay | 120 Mana | 120 WCP | - | Tome of Cycles | Base game | Makes attacks of enchanted units: • Inflict Decaying, a damage-over-time effect that decreases healing received. Effects are increased for Single Shot attacks. |
| Blazing Aura | 80 Mana | 80 WCP | - | Tome of Burning Passion | Secrets of the Archmages | Enchanted units gain: • Blazing Aura, burning and damaging nearby enemies. |
| Blessed Armors | 120 Mana | 120 WCP | - | Tome of Prosperity | Ways of War | Enchanted units gain: • Inner Grace • +1 Resistance |
| Blight Blades | 90 Mana | 90 WCP | - | Tome of Roots | Base game | Makes attacks of enchanted units deal: • +2 Blight Damage. • +10% damage against Poisoned or Decaying units. Effects are increased for Single Shot attacks. |
| Blood Drinking Blades | 80 Mana | 80 WCP | - | Tome of the Blood Rite | Thrones of Blood | Attacks of enchanted units: • Deal +2 Physical Damage. • When striking units with Bleeding, heal for 3 Temporary Hit Points. Effects are increased for Single Shot attacks. |
| Bloodfury Weapons | 80 Mana | 80 WCP | - | Tome of Revelry | Base game | Grants enchanted units: • +2 Physical Damage on attacks. • On kill, adjacent enemies to the target gain 2 Bleeding for 3 Turns. Effects are increased for Single Shot attacks. |
| Blooming Imbuement | 120 Mana | 120 WCP | - | Tome of Cycles | Base game | Makes attacks of enchanted units: • Gain a base 60% chance of inflicting Life Seed for 3 Turns. • Deal +20% damage against Decaying units. Effects are increased for Single Shot attacks. |
| Brutal Mark | 90 Mana | 90 WCP | - | Barbarian | Base game | Grants non-Barbarian units: • Savage Strike, which adds Blight Damage on critical hits. |
| Chimes of Momentum | 90 Mana | 90 WCP | - | Nomad - Conquerors | Rise from Ruin | Grant non-Culture units: • Empowering Momentum |
| Ciphers of Dissonance | 90 Mana | 90 WCP | - | Mystic - School of Potential | Base game | Grants non-Mystic units: • Ciphers of Dissonance, which inflicts Dissonance on enemy units. |
| Compounding Defense | 100 Mana | 100 WCP | - | Tome of the Construct | Empires & Ashes | When adjacent to another unit with Compounding Defense this unit gains: • +1 Defense • +1 Resistance |
| Constricting Focus | 80 Mana | 80 WCP | - | Tome of the Tentacle | Eldritch Realms | Base Magic attacks of enchanted units: • Deal +2 Physical Damage • Gain base 30% chance of inflicting Constricted for 1 Turn. • Chance increased to 60% against Marked or Slowed units. Effects are increased for Single Shot attacks. |
| Cosmic Overdrive | 180 Mana | 180 WCP | - | Tome of the Archmage | Base game | Grants enchanted units: • +20% damage. • Very Fast Movement. |
| Cosmos Awakening | 250 Mana | 250 WCP | - | Tome of the Cosmos | Secrets of the Archmages | Enchanted units gain: • +1 damage of each damage channel. • +1 protection of each damage channel. Effects are increased for Single Shot attacks. |
| Crocodile Primal Communion | 90 Mana | 90 WCP | - | Primal - Mire Crocodile | Primal Fury | Grant non-Culture units: • Mire Crocodile's Boon • Swamp Walk • Status Effect Immunity: Diseased |
| Crow Primal Communion | 90 Mana | 90 WCP | - | Primal - Storm Crow | Primal Fury | Grant non-Culture units: • Storm Crow's Boon • Grassland Walk |
| Cruel Weaponry | 80 Mana | 80 WCP | - | Tome of the Doomherald | Base game | Grants enchanted units: • +30% damage against units with Morale of "Low" or worse. |
| Crystal Focus | 100 Mana | 100 WCP | - | Crystal Pact | Giant Kings | Attacks of enchanted units gain: • A base 60% chance of applying Volatile Charge. |
| Demonic Siphon | 160 Mana | 160 WCP | - | Tome of the Chaos Lord | Base game | Whenever another unit dies in battle, enchanted unit gains: • Infernal Might for 3 Turns. • +5 Morale. Does not trigger on the death of Combat Summons, Tower, and Siegecraft units. |
| Disrupting Blades | 180 Mana | 180 WCP | - | Tome of Severing | Empires & Ashes | Makes attacks of enchanted units gain: • A base 60% chance of inflicting Disrupted for 2 Turns. Effects are increased for Single Shot attacks. |
| Dormant Enchantment | 80 Mana | 80 WCP | - | High | Base game | Grants non-High units: • Dormant: Guardian if a Polearm Unit or Fighter Unit. • Dormant: Shield of Light if a Shield Unit, Shock Unit, or Mythic Unit. • Dormant: Seeking Arrows if a Ranged Unit or Skirmisher Unit. • Dormant: Radiant Light if a Battle Mage Unit or Magic Fighter Unit. • The Awaken ability and Dormant: Radiant Light if a Support Unit. |
| Dragonstrike Infusion | 100 Mana | 100 WCP | - | Tome of Dragons | Dragon Dawn | Grants enchanted units: • Dragonstrike. • The damage type is determined by your empire's Dominant Affinity and increases with the unit's tier. |
| Dread Hunters | 120 Mana | 120 WCP | - | Tome of the Weaver | Secrets of the Archmages | Enchanted units: • Gain Demoralizer • Attacks deal +20% damage against Immobilized or Frozen targets. |
| Empowered Beasts | 100 Mana | 100 WCP | - | Tome of Vigor | Base game | Makes enchanted units: • Deal +20% damage. • Gain +10 Hit Points. • Gain Demolisher, making them able to destroy reinforced obstacles. • Decreased number of units in formation. |
| Empowered Strikes | 70 Mana | 70 WCP | - | Tome of Discipline | Ways of War | Makes base Melee attacks and Magic Strikes of enchanted units: • Deal +2 Physical Damage. • Third attack in a turn has a 60% base chance of inflicting Stunned for 1 Turn Enchantment doesn't apply to units without a repeating base melee attack. |
| Enchanted Crow Companion | 70 Mana | 70 WCP | - | General Research | Base game | Grants +2 Vision Range on the World Map. |
| Engraving of Focus | 90 Mana | 90 WCP | - | Reaver - Imperial | Empires & Ashes | Grants non-Reaver units: • Focused Aggression. |
| Fairy Dust | 70 Mana | 70 WCP | - | Tome of the Sprite | Secrets of the Archmages | Enchanted units: • Gain the Fairy Dust ability. |
| Fateful Imbuement | 100 Mana | 100 WCP | - | Tome of Prophecies | Archon Prophecy | Grants enchanted units: • +20% Critical Hit Chance. • Faithful. |
| Fetid Legion | 120 Mana | 120 WCP | - | Tome of the Great Transformation | Base game | Grants enchanted units: • +10 Hit Points. • Weakening Aura, which inflicts Weakened to adjacent enemies at the end of the turn. |
| Fey Bond | 70 Mana | 70 WCP | - | Tome of the Sprite | Secrets of the Archmages | Enchanted units: • On combat start, gain +10 Morale. • When at neutral morale, gain +2 Status Resistance. • When at high morale, gain +4 Status Resistance. |
| Fiery Imbuement | 80 Mana | 80 WCP | - | Tome of Pyromancy | Base game | Attacks of enchanted units gain: • +1 Fire Damage. • A base 60% chance of inflicting Burning. Effects are increased for Single Shot attacks. |
| Flame Blessed Champions | 160 Mana | 160 WCP | - | Tome of the Cleansing Flame | Eldritch Realms | Makes base Melee attacks of enchanted units: • Gain base 60% chance of inflicting Burning • Create Cleansing Flames on the target hex for 3 Turns Effects are increased for Single Shot attacks. |
| Flameburst Weapons | 160 Mana | 160 WCP | - | Tome of Devastation | Base game | Grants enchanted units: • +20% Critical Hit Chance. • Killing a unit causes it to explode, adjacent enemies: • Sustain 15 Fire Damage. • Gain 2 Burning for 3 Turns. |
| Flamer Focus | 140 Mana | 140 WCP | - | Tome of Chaos Channeling | Base game | Enchanted units gain: • The Fire Bomb ability, which deals magical damage in an area. • The damage of this ability increases with the unit's tier. |
| Focus Aim | 70 Mana | 70 WCP | - | Tome of Discipline | Ways of War | Grants enchanted units: • The Focus Aim ability, which allows the unit to make an attack that cannot miss |
| Focus of Devastation | 160 Mana | 160 WCP | - | Tome of Devastation | Base game | Grants attacks of enchanted units: • Demolisher, which allows them to destroy Fortified obstacles. • A base 60% chance of canceling Defense Modes. Effects are increased for Single Shot attacks. |
| Force of Nature | 200 Mana | 200 WCP | - | Tome of the Goddess of Nature | Base game | Enchanted units gain: • +15% Critical Hit Chance • +3 Blight Damage on attacks Effects are increased for Single Shot attacks. |
| Frenzying Imbuement | 90 Mana | 90 WCP | - | Tome of Nature's Wrath | Base game | Grants enchanted units: • Frenzy • Life Steal |
| Frost Arrows | 80 Mana | 80 WCP | - | Tome of Cryomancy | Base game | Makes attacks of enchanted units gain: • +1 Frost Damage. • A base 60% chance of inflicting Slowed. Effects are increased for Single Shot attacks. |
| Frost Blades | 80 Mana | 80 WCP | - | Tome of Cryomancy | Base game | Makes attacks of enchanted units deal: • +2 Frost Damage. • +10% damage against Frozen or Slowed units. Effects are increased for Single Shot attacks. |
| Guided Projectiles | 90 Mana | 90 WCP | - | Tome of Scrying | Base game | Makes base attacks of enchanted units: • Fire 1 hex further without Long Range Accuracy penalties. • Ignore Accuracy penalties from the Obscuring condition caused by units that are in the way and certain terrain. |
| Havoc Magic | 120 Mana | 120 WCP | - | Tome of Pandemonium | Base game | Grants base Magic attacks of enchanted units: • Base 60% chance of inflicting a random Negative Status Effect. Effects are increased for Single Shot attacks. |
| Holy Aura | 140 Mana | 140 WCP | - | Tome of the Archon | Archon Prophecy | Grants enchanted units: • Holy Aura, granting status protection to adjacent friendly units and damaging adjacent enemies. |
| Incarnate Mark | 90 Mana | 90 WCP | - | Architect | Archon Prophecy | Grants non-Architect units: • Affinity Incarnate. |
| Inquisitor's Mark | 90 Mana | 90 WCP | - | Tome of the Inquisition | Base game | Makes attacks of enchanted units have a: • Base 60% chance of inflicting Condemned until end of combat, reducing enemy Status Resistance. • Base 60% chance of inflicting Weakened, reducing enemy damage. Effects are increased for Single Shot attacks. |
| Intimidation Aura | 70 Mana | 70 WCP | - | Tome of Subjugation | Base game | Grants enchanted units: • Intimidating Aura, which reduces Morale of nearby enemies. |
| Keeper's Mark | 100 Mana | 100 WCP | - | Tome of Sanctuary | Base game | Enchanted units: • Gain Faithful, reducing Unit Upkeep. • When taking fatal damage for the first time, this unit gains: • Steadfast for 1 Turn. • Pacified for 1 Turn. |
| Legion of Zeal | 80 Mana | 80 WCP | - | Tome of Zeal | Base game | Grants enchanted units: • Zeal, which makes attacks deal extra Spirit Damage. |
| Ley Line Focus | 120 Mana | 120 WCP | - | Tome of Terramancy | Base game | Enchanted units gain: • At the start of the turn and until the unit moves this unit has: • +30% damage • +2 Resistance. |
| Lightning Blades | 80 Mana | 80 WCP | - | Tome of Evocation | Base game | Makes attacks of enchanted units deal: • +2 Lightning Damage. • +10% damage against Electrified units. Effects are increased for Single Shot attacks. |
| Lightning Focus | 80 Mana | 80 WCP | - | Tome of Evocation | Base game | Makes attacks of enchanted units: • Deal +2 Lightning Damage. • Gain base 30% chance of inflicting Electrified, a damage-over-time effect. Effects are increased for Single Shot attacks. |
| Mage Armor | 70 Mana | 70 WCP | - | Tome of Abjuration | Secrets of the Archmages | Enchanted units gain: • +1 Defense • +2 Status Resistance |
| Mammoth Primal Communion | 90 Mana | 90 WCP | - | Primal - Glacial Mammoth | Primal Fury | Grant non-Culture units: • Glacial Mammoth's Boon • Arctic Walk |
| Mantle of the Blood Noble | 140 Mana | 140 WCP | - | Tome of the Crimson Reign | Thrones of Blood | Grants enchanted units: • Coagulate • At the start of combat, for each friendly non-summon Tier I and Tier II unit: • +5 Hit Points • +5% healing received in combat. |
| Mark of Misfortune | 90 Mana | 90 WCP | - | Tome of Mayhem | Base game | Makes attacks of enchanted units: • Inflict Misfortune. Effects are increased for Single Shot attacks. |
| Mark of Tyranny | 90 Mana | 90 WCP | - | Dark - Cult of Tyranny | Base game | Grants non-Dark units: • Cult of Tyranny |
| Mark of the Death Cult | 90 Mana | 90 WCP | - | Dark - Cult of Death | Base game | Grants non-Dark units: • Power from Death |
| Meteor Imbuement | 160 Mana | 160 WCP | - | Tome of the Crucible | Base game | Makes base attacks of enchanted units: • Deal +4 Fire Damage to the target and adjacent enemies. • Gain Demolisher, making them able to destroy reinforced obstacles. Effects are increased for Single Shot attacks. |
| Mighty Meek | 100 Mana | 100 WCP | - | Tome of the Beacon | Base game | Grants enchanted units: • Faithful, which reduces Unit Upkeep. • +2 Status Resistance. • +1 Spirit Damage on attacks for each Unit Tier of the target. Effects are increased for Single Shot attacks. |
| Mirror Veil | 160 Mana | 160 WCP | - | Tome of the Astral Mirror | Base game | Makes enchanted units: • Reflect 30% of non- Physical Damage sustained back onto attackers. |
| Mysterious Tonic | 70 Mana | 70 WCP | - | Tome of Alchemy | Empires & Ashes | Grants enchanted units: • Distribute Tonic, granting Positive Status Effects while removing a negative one. |
| Necrotic Imbuement | 90 Mana | 90 WCP | - | Tome of Necromancy | Base game | Grants attacks of enchanted units: • A base 90% chance of inflicting Decaying, a damage-over-time effect that decreases healing received. Effects are increased for Single Shot attacks. |
| Null Shield | 160 Mana | 160 WCP | - | Tome of Severing | Empires & Ashes | Makes it so when enchanted unit enters Defense Mode, it and adjacent friendly units gain: • +5 Status Resistance |
| Obsidian Weapons | 80 Mana | 80 WCP | - | Tome of Rock | Base game | Makes attacks of enchanted units gain: • +1 Physical Damage. • Gain a base 60% chance of inflicting Bleeding for 3 Turns. Effects are increased for Single Shot attacks. |
| Phasing Enchantment | 120 Mana | 120 WCP | - | Tome of Teleportation | Base game | Grants enchanted units: • The Charged Phase ability, which allows them to teleport in battle. |
| Pledge of Harmony | 90 Mana | 90 WCP | - | Oathsworn - Harmony | Ways of War | Grants non-Culture units: • Harmonize |
| Pledge of Righteousness | 90 Mana | 90 WCP | - | Oathsworn - Righteousness | Ways of War | Grants non-Culture units: • Nobility |
| Pledge of Strife | 90 Mana | 90 WCP | - | Oathsworn - Strife | Ways of War | Grants non-Culture units: • Warrior's Soul |
| Poison Arrows | 90 Mana | 90 WCP | - | Tome of Roots | Base game | Makes attacks of enchanted units: • Deal +1 Blight Damage. • Gain base 60% chance of inflicting Poisoned, a damage-over-time effect. Effects are increased for Single Shot attacks. |
| Prescient Circlets | 100 Mana | 100 WCP | - | Tome of Prophecies | Archon Prophecy | Grants enchanted units: • Gain Precognition when entering Defense Mode. |
| Pureflame Staves | 140 Mana | 140 WCP | - | Tome of the Cleansing Flame | Eldritch Realms | Makes base Magic attacks of enchanted units: • Gain base 60% chance of inflicting Condemned • Create Cleansing Flames on the target hex for 3 Turns Effects are increased for Single Shot attacks. |
| Purging Arrows | 70 Mana | 70 WCP | - | Tome of Enchantment | Base game | Grants attacks of enchanted units: • +10% damage against Magic Origin units. • Base 60% chance of removing 1 Positive Status Effect from the target. Effects are increased for Single Shot attacks. |
| Raiders of the Deep | 90 Mana | 90 WCP | - | Tome of the Dungeon Depths | Giant Kings | Enchanted units gain: • Cave Walk • While in the Underground: • +1 Defense • +1 Resistance • While above ground: • Deal +10% damage |
| Rapid Evolution Enchantment | 80 Mana | 80 WCP | - | Tome of Evolution | Dragon Dawn | Grants enchanted units: • 15 Experience per Turn. • Slip Away healing them once per battle if their Hit Points would be reduced to zero. |
| Relentless Might | 100 Mana | 100 WCP | - | Tome of the Warlord | Rise from Ruin | Enchanted units gain: • +1 Retaliation Attack. • Infernal Might when it attacks. |
| Resonant Weapons | 120 Mana | 120 WCP | - | Tome of Geomancy | Giant Kings | Attacks of enchanted units gain: • Apply extra damage and Negative Status Effects based on the terrain. Effects are increased for Single Shot attacks. |
| Rune of Industry | 90 Mana | 90 WCP | - | Industrious | Base game | Grants non-Industrious units: • Bolstering, which increases defense when they sustain damage. |
| Sabertooth Primal Communion | 90 Mana | 90 WCP | - | Primal - Ash Sabertooth | Primal Fury | Grant non-Culture units: • Ash Sabertooth's Boon • Desolate Walk |
| Sanguine Focus | 80 Mana | 80 WCP | - | Tome of the Blood Rite | Thrones of Blood | Attacks of enchanted units gain: • +1 Physical Damage. • A base 60% chance of inflicting Bleeding for 3 Turns. Effects are increased for Single Shot attacks. |
| Scavenger's Bags | 90 Mana | 90 WCP | - | Nomad - Scavengers | Rise from Ruin | Grant non-Culture units: • Scavenger |
| Scorpion Venom Weapons | 90 Mana | 90 WCP | - | Tome of the Sand Stalkers | Rise from Ruin | Attacks of enchanted units gain: • A base 60% chance of inflicting Weakened for 3 Turns. • A base 60% chance of inflicting Poisoned for 3 Turns. • +2 Blight Damage when flanking. Effects are increased for Single Shot attacks. |
| Scroll of Astral Connection | 90 Mana | 90 WCP | - | Mystic - School of Summoning | Base game | Grants non-Mystic non-Magic Origin units: • Astral Connection. |
| Scroll of Attunement | 90 Mana | 90 WCP | - | Mystic - School of Attunement | Base game | Grants non-Mystic units: • Attunement: Star Blades, which increases damage dealt when spells are cast. |
| Searing Blades | 80 Mana | 80 WCP | - | Tome of Pyromancy | Base game | Makes attacks of enchanted units deal: • +2 Fire Damage. • +10% damage against targets that are Burning. Effects are increased for Single Shot attacks. |
| Seeker Arrows | 80 Mana | 80 WCP | - | Tome of Winds | Base game | Grants Missile attacks of enchanted units: • +1 Range. |
| Serpent Primal Communion | 90 Mana | 90 WCP | - | Primal - Dune Serpent | Primal Fury | Grant non-Culture units: • Dune Serpent's Boon • Sand Walk |
| Shadow Weapons | 100 Mana | 100 WCP | - | Tome of Shades | Ways of War | Attacks of enchanted units: • Deal +3 Frost Damage when Flanking or attacking Blind units. Effects are increased for Single Shot attacks. |
| Shaper's Touch | 200 Mana | 200 WCP | - | Tome of the Creator | Base game | Grants enchanted units: • Natural Regeneration • +10 Hit Points • +2 Lightning Protection |
| Siege Magic | 90 Mana | 90 WCP | - | Tome of Artificing | Base game | Grants enchanted units: • +10% damage • Siege Breaker, dealing extra fortification damage during a siege. • Demolisher, making them able to destroy reinforced obstacles. |
| Sign Of The Lumbering Staff | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Unit has: • Magic and Support abilities have +1 Range. • Slow Movement in combat. |
| Sign Of The Vanguard | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Unit has: • Very Fast Movement in combat. • Magic and Missile attacks against this unit have -20% Accuracy. • Melee attacks deal -20% damage. |
| Sign of the Cleft Shield | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Unit has: • -4 Defense. • Base attacks deal +40% damage. |
| Sign of the Huntress | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Magic and Missile attacks have +30% damage and -1 Range. |
| Signet of Loyalty | 90 Mana | 90 WCP | - | (non-tome / event / pantheon) | Base game | Grants non-Feudal units: • For the Monarch, granting power when in combat alongside the Ruler. |
| Soulbinders | 80 Mana | 80 WCP | - | Tome of Souls | Base game | Grants enchanted units: • Base 90% chance of inflicting Soulbound on attacks, increasing the Soul gain when the target is killed. • +10% damage against units with Soulbound. Effects are increased for Single Shot attacks. |
| Spell-Tempered Shields | 70 Mana | 70 WCP | - | Tome of Enchantment | Base game | Grants enchanted units: • +1 Resistance. • When entering Defense Mode, this unit and all adjacent allies receive +1 Resistance until the start of the next turn. |
| Spider Primal Communion | 90 Mana | 90 WCP | - | Primal - Tunneling Spider | Primal Fury | Grant non-Culture units: • Tunneling Spider's Boon • Cave Walk |
| Staves of Grace | 120 Mana | 120 WCP | - | Tome of Prosperity | Ways of War | Enchanted units gain: • Inner Grace • Their Support abilities grant 1 Grace. • The Cleansing Rain ability. |
| Staves of Life | 90 Mana | 90 WCP | - | Tome of Fertility | Base game | Makes Attack or Support abilities of enchanted units: • Heal a random friendly unit within 3 hexes of it for 15 Temporary Hit Point. |
| Staves of Mending | 80 Mana | 80 WCP | - | Tome of Faith | Base game | Grants enchanted units: • Faithful, which reduces base Unit Upkeep. • Mending Touch, a healing ability for use in battle. |
| Staves of Mist | 80 Mana | 80 WCP | - | Tome of Fey Mists | Primal Fury | Grants enchanted units: • The Fey Blessing ability. |
| Staves of Warding | 70 Mana | 70 WCP | - | Tome of Warding | Base game | Makes Support abilities of enchanted units: • Grant +2 Bolstered Resistance to affected units. |
| Strength Sapping Imbuement | 80 Mana | 80 WCP | - | Tome of Burning Passion | Secrets of the Archmages | Enchanted units attacks gain: • +1 Fire Damage. • Base attacks have a base 60% chance of inflicting Weakened for 3 Turns. On success gain Strengthened for 3 Turns. Effects are increased for Single Shot attacks. |
| Sundering Blades | 80 Mana | 80 WCP | - | Tome of Enchantment | Base game | Grants attacks of enchanted units: • Base 90% chance of inflicting Sundered Defense, reducing enemy Defense. • Demolisher, making them able to destroy reinforced obstacles. Effects are increased for Single Shot attacks. |
| Supreme Magic | 160 Mana | 160 WCP | - | Tome of Supremacy | Base game | For enchanted units: • Grants Zeal, which makes attacks deal extra Spirit Damage. • Attacks ignore 2 Status Resistance. • Killing a unit causes it to explode, dealing 20 Spirit Damage to adjacent enemy units. |
| Tormenting Imbuement | 140 Mana | 140 WCP | - | Tome of Torment | Thrones of Blood | Attacks of enchanted units: • Have a base 90% chance of inflicting Torment until the end of combat. Effects are increased for Single Shot attacks. |
| True Death Magic | 90 Souls | 75 WCP | - | Tome of the Eternal Lord | Base game | Grants enchanted units: • The Curse of the Reaper ability, which has a chance to instantly kill the target. |
| Tuning Kits | 90 Mana | 90 WCP | - | Tome of the Dreadnought | Empires & Ashes | Grants enchanted units: • The Overcharge ability, which can grant a Construct unit Overcharged until the end of battle. |
| Undead Resentment | 140 Mana | 140 WCP | - | Tome of the Revenant | Archon Prophecy | Grants enchanted units: • +2 Spirit Protection • +2 Fire Protection • Vicious Killer |
| Warding Metals | 90 Mana | 90 WCP | - | Tome of the Dreadnought | Empires & Ashes | Grants enchanted units: • +2 Resistance |
| Wayfinder Enchantment | 40 Mana | 40 WCP | - | General Research | Base game | When enchanted units rout in combat: • They never die. • They return 2 Turns sooner. |
| Wolf Primal Communion | 90 Mana | 90 WCP | - | Primal - Sylvan Wolf | Primal Fury | Grant non-Culture units: • Sylvan Wolf's Boon • Forest Walk |

### World Spell (30)

| Spell | Cost | Casting pts | Upkeep | Source tome(s) | DLC | Effect |
|---|---|---|---|---|---|---|
| Artica's Ice Age | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Up to 40 random Provinces gain an Ice Age Hazard. At the start of the next turn those hazards expire and: • Enemy units sustain 20 Frost Damage. • Provinces are destroyed. • The province: • Gains Snow and Ice. • Loses Chasm, Swamp, Ashlands, Sand, Cavern Floor, Fungus Fields, and Gloom. |
| Astral Divination | 100 Mana | 300 WCP | - | Mystic - School of Summoning, Mystic - School of Attunement | Base game | Create and reveal new Astral Echoes in provinces near your domain. |
| Astral Shattering | 150 Mana | 150 WCP | - | Tome of Astral Convergence | Base game | Target Province: • If it contains an enemy Province Improvement and no Ancient Wonder, it becomes ruins. • Spawns a powerful marauding Army of Astral Sea Units. |
| Astral Travel | 200 Mana | 200 WCP | - | Tome of the Archmage | Base game | Makes your leader teleport to the target world hex. |
| Blood Moon Ritual | 12 Thralls | 300 WCP | - | (non-tome / event / pantheon) | Thrones of Blood | For the next 10 World Map Turns Vampires: • Don't suffer from Sunlight Weakness. • +15 Hit Point regeneration on the World Map. • Gain +20% damage. • Gain +2 Resistance. |
| Cinren's Temptation | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | • A random non-hero enemy in target army deserts its ranks. • You may acquire it for an additional Mana cost. |
| Clairvoyance Ritual | 1 Thralls | 45 WCP | - | (non-tome / event / pantheon) | Base game | Reveals the closest undiscovered Infestation or Ancient Wonder. |
| Conjure Spellward | 200 Mana | 200 WCP | - | Tome of Severing | Empires & Ashes | Conjures a Spellward on an empty hex in the target Province. This structure: • Functions as a Spell Jammer for this and adjacent provinces. • Provides vision in 3-hex radius. |
| Conjure Summoning Rift | 60 Mana | 60 WCP | - | Mystic - School of Summoning | Base game | Conjures a Summoning Rift on an empty hex in the target Province. This structure: • Allows summoning spells to be cast on or adjacent to it. • Provides vision in 5-hex radius. • Units in this province gain regenerate +15 Hit Points per Turn. • During combat in this province friendly Combat Summon Spells are 20% cheaper to cast. |
| Consecrating Firestorm | 100 Mana | 100 WCP | - | Tome of the Cleansing Flame | Eldritch Realms | In target Province: • Enemy units sustain 20 Spirit Damage. • The province gains Consecrating Firestorm for 3 Turns • If it has an enemy owned Province Improvement, it is Pillaged. |
| Dark Knowledge Ritual | 6 Thralls | 150 WCP | - | (non-tome / event / pantheon) | Eldritch Realms | Gain 200 Knowledge. |
| Desecrate Structure | 80 Mana | 80 WCP | 8 Mana | Tome of the Great Transformation | Base game | Targets a resource node in your domain: • Node provides +5 Soul income. • If you lose the province, the effect stops. |
| Detonate Infestation | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Rise from Ruin | Target Fractured Infestation or Fleeting Fractured Infestation is destroyed, does not grant its rewards. This spell does not contribute to the Devouring Winds and cannot Backfire. |
| Divert Devouring Winds | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Rise from Ruin | Target Province that is marked to be struck by a Cataclysm loses its mark and will not be struck next Cataclysm. This spell does not contribute to the Devouring Winds and cannot Backfire. |
| Downpour | 60 Mana | 60 WCP | - | Tome of the Stormborne | Primal Fury | Target province: • Alters terrain to Swamp, if land. • Becomes Downpouring for 3 Turns. Cannot be used underground. |
| Forest Awareness | 200 Mana | 200 WCP | 20 Mana | Tome of the Goddess of Nature | Base game | All forests grant Vision on the World Map. |
| Incite Revolution | 100 Mana | 100 WCP | - | Tome of Mayhem | Base game | Target enemy city: • Loses a border province and the population is lost. • Spawns a Brigand Camp on land provinces. • Spawns a Pirate Cove on coastal provinces. |
| Lingering Mists | 60 Mana | 60 WCP | - | Tome of Fey Mists | Base game | Target province becomes Misty for 3 Turns. |
| Mend Fracture | 150 Mana | 150 WCP | - | (non-tome / event / pantheon) | Rise from Ruin | Decreases the Devouring Winds value by 220, temporarily reducing the chance of a Cataclysm. The cost of this spell is reduced based on the amount of Artifacts of the Unmakers the caster has. This spell does not contribute to the Devouring Winds and cannot Backfire. |
| Move Portal | 100 Mana | 0 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Move this structure to an unoccupied target position within your empire's Domain. Requires the Empire to own and have bound this structure. |
| Noctus' Mastery | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Target friendly city is destroyed. Then for each population of the destroyed city: • Gain +50 Knowledge. • Gain +20 Soul. • Gain a random Skeleton unit. • Each skeleton gained has a small chance of being a Corrupt Soul instead. |
| Rite of Swift Shadows | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Base game | Your Units immediately regain all of their Move Points and gain Universal Camouflage for 2 Turns. |
| Soul Drain Ritual | 3 Thralls | 45 WCP | - | (non-tome / event / pantheon) | Base game | Gain 30 Souls. |
| Soulcurse of Gluttony | 60 Mana | 60 WCP | - | (non-tome / event / pantheon) | Giant Kings | Target province becomes affected by Malediction of Gluttony for 3 Turns. |
| Soulcurse of Pride | 100 Mana | 100 WCP | - | (non-tome / event / pantheon) | Giant Kings | Target enemy City: • Loses a border land Province and the Population is lost. • Spawns a Ritual Circle Infestation on lost province. |
| Thrall Effigy | 30 Souls | 80 WCP | - | (non-tome / event / pantheon) | Base game | Gain 3 Thrall. |
| Umbral Incursion | 120 Mana | 120 WCP | - | Tome of Corruption | Eldritch Realms | Target enemy city: • Loses a border land province and the population is lost. • Spawns an Umbral Nest Infestation on lost province. |
| Watchful Eye | 45 Mana | 45 WCP | - | Nomad - Conquerors | Rise from Ruin | Target province: • Provides vision in a 3 hex-radius from the province center. • Enemy units in this province suffer Marked. Lasts for 3 Turns. |
| Ydgaard's Trade | 45 Mana | 45 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | Heroes in target army: • Lose 20 maximum Hit Points. • Base attacks gain a base 60% chance of inflicting Gilded for 1 Turn. • Grants +50 Gold per World Map Turn. Cannot affect Leaders. |
| Zaethyl's Paradise | 200 Mana | 200 WCP | - | (non-tome / event / pantheon) | Secrets of the Archmages | All Provinces: • Gain Grassland and Forest if on the Surface or Fungus Fields and Mushroom Forest if they are in the Underground. • Lose Chasm, Swamp, Snow, Ice, Ashlands, Sand, Cavern Floor, Stalagmites, and Gloom. Additionally, all your Provinces with Grassland or Forest gain double income. |

## APPENDIX B — Affinity hero skills (hero skills gated by empire affinity)

Since the hero rework (Ways of War update) heroes no longer draw skills from individual tomes; instead the *Affinity Hero Skill Group* below becomes available to every hero as the empire accumulates affinity in that branch (the requirement is shown in-game on the hero skill tree). Abilities are resolved from the game data.

| Hero skill | Type | DLC | Effect / granted abilities |
|---|---|---|---|
| Adaptive Vigor | normal | Base game | Adaptive Vigor: Once per turn, this unit gains Regeneration when hit by an attack. |
| Amplify Chaos | normal | Base game | Amplify Chaos: Target all adjacent enemies: • Deals 12 Fire Damage for each Negative Status Effect on each target, up to 5 times. Enter Defense Mode after use [range 0; Cooldown: 1] |
| Ancient One | normal | Base game | Ancient One: Unit gains: • +20 Hit Points • +20% damage |
| Ancient of Earth | normal | Base game | Ancient of Earth: Unit gains: • +20 Hit Points • +20% damage |
| Ancient of Earth | normal | Base game | Ancient of Earth: Unit grows in size and gains: • Large Target • +20 Hit Points • +30% damage Unit can no longer use a mount. |
| Ancient of Earth | normal | Base game | Ancient of Earth: Unit gains: • +20 Hit Points • +20% damage |
| Arcane Surge | normal | Base game | Arcane Surge: Whenever a friendly spell is cast, gain: • +10 Temporary Hit Points • +1 Strengthened • +1 Bolstered Defense • +1 Bolstered Resistance |
| Artificer's Overcharge | normal | Base game | Overcharge: Target friendly non-hero unit: • Gains Overcharged until end of combat. • Heals 20 Temporary Hit Point. [range 2; free action; Can only be used once per battle.] |
| Avatar of Nature | normal | Base game | Gain: • +30 Hit Point • Maternal Rage • Natural Regeneration  |
| Awaken Earth | normal | Base game | Awaken Earth: Destroy obstacles in the target area, then summon a Stone Spirit unit under your control. This summon lasts for 3 Turns. [range 5; full action; Cannot be used when within an enemy Zone of Control.; Cooldown: 2] |
| Blight Strikes | normal | Base game | Base attacks: • Inflict +2 Blight Damage. • +10% damage against targets that are Poisoned or Decaying. Effects are increased for Single Shot attacks.  |
| Blink | normal | Base game | Blink: Makes this unit teleport to target hex. [range 4; Cooldown: 2] |
| Bolstering Evasion | normal | Base game | Bolstering Evasion: Once per turn, this unit gains Evasion when hit by a Magic or Missile attack. |
| Call of the Wild | normal | Base game | Call of the Wild: Summons 2 random Tier II animals on target hex. [range 4; full action; Cannot be used when within an enemy Zone of Control.; Can only be used once per battle.] |
| Chaos Empowerment | normal | Base game | Base attacks gain: • +10% Critical Hit Chance. • Critical Hits inflict 3 Fire Damage and Burning to the target and adjacent enemies. Effects are increased for Single Shot attacks.  |
| Conjure Dome of Protection | normal | Base game | Conjure Dome of Protection: • Heals allies within a 2-hex radius +10 Temporary Hit Points. • Places a Dome of Protection over a 2-hex radius. • Enter defense mode. [range 0; Cooldown: 3] |
| Conjure Dread Matriarch | normal | Base game | Conjure Dread Matriarch: Conjure a Dread Spider Matriarch. This summon lasts for 3 Turns. [range 4; full action; Cannot be used when within an enemy Zone of Control.; Can only be used once per battle.] |
| Conjure Vampire Spider Matriarch | normal | Base game | Conjure Vampire Spider Matriarch: Conjure a Vampire Spider Matriarch. This summon lasts for 3 Turns. [range 4; full action; Cannot be used when within an enemy Zone of Control.; Can only be used once per battle.] |
| Controlled Chaos | normal | Base game | Controlled Chaos: • Adjacent enemies have a +30% Fumble chance. • Adjacent allies have a +30% Critical Hit Chance. |
| Crushing Anguish | normal | Base game | Crushing Anguish: Target unit with Morale of "Low" or worse: • Has a chance of dying instantly. • The lower the target unit's morale is, the more this chance increases. • If the unit does not die, it sustains 30 Frost Damage instead. [range 4; full action; Cooldown: 2] |
| Debilitating Aura | normal | Base game | Debilitating Aura: Adjacent enemies have -5 Status Resistance. |
| Draining Burst | normal | Base game | Draining Burst: Target adjacent enemies: • Inflict 20 Frost Damage. • Caster heals 100% of the damage dealt. [damage 20 Frost; range 0; Cooldown: 3] |
| Eternal One | normal | Base game | Eternal One: • When this Hero unit is killed in battle, after 2 Turns, it comes back to life with 35% of its total Hit Points. • Can be used any number of times. • Does not function if all other units are dead. |
| Exhume Undead | normal | Base game | Exhume Undead: Target empty hex: • Summons a random Tier III Undead unit. This summon lasts for 3 Turns. • Adjacent enemies suffer Soulbound and 2 Remorse. [range 5; full action; Cannot be used when within an enemy Zone of Control.; Can only be used once per battle.] |
| Frost Strikes | normal | Base game | Base attacks gain: • +2 Frost Damage. • +10% damage against targets that are Slowed or Frozen. Effects are increased for Single Shot attacks.  |
| Immobilizing Presence | normal | Base game | Immobilizing Presence: At the start of the turn, adjacent enemies become Slowed. If they were already Slowed, they become Immobilized instead. |
| Incorruptible Spirit | normal | Base game | Incorruptible Spirit: • +6 Status Resistance. • Morale loss reduced by -50%. |
| Inspiring Killer | normal | Base game | Inspiring Killer: This unit grants double the morale bonus to itself and its allies when killing an enemy. |
| Investiture of Chaos | normal | Base game | Investiture of Chaos: Enemies in a 1-hex radius get 2 random Negative Status Effects. [range 4; Cannot be used when within an enemy Zone of Control.; Cooldown: 1] |
| Keeper's Mark | normal | Base game | Keeper's Mark: • Unit has Faithful. • When taking fatal damage for the first time, this unit gains: • Steadfast for 1 Turn. • Pacified for 1 Turn. |
| Lead by Example | normal | Base game | • On kill: All friendly units gain +15 Temporary Hit Points and +15 Morale. • When using a Support ability: All friendly units gain +5 Morale.  |
| Lightning Strikes | normal | Base game | Base attacks gain: • +2 Lightning Damage. • +10% damage against targets that are Electrified. Effects are increased for Single Shot attacks.  |
| Mending Touch | normal | Base game | Mending Touch: Target heals +25 Temporary Hit Points. [range 1; free action; Cannot be used when within an enemy Zone of Control.; Cooldown: 2] / Faithful: Base Unit Upkeep is reduced by 10%. |
| Meteor Strikes | normal | Base game | • Base attacks deal 4 Fire Damage to the target and adjacent enemies. • All attacks gain Demolisher. Effects are increased for Single Shot attacks.  |
| Pack Leader | normal | Base game | Pack Leader: While army leader, all Animals in army have: • Flanker • -20% base Unit Upkeep • +1 Defense • +1 Resistance |
| Phaselock | normal | Base game | Phaselock: Adjacent enemies have a base 120% chance of becoming Stunned. Enter defense mode. [range 0; Cooldown: 3] |
| Poisonous Undergrowth | normal | Base game | Poisonous Undergrowth: Target enemies in a 1-hex radius: • Inflict 3 Poisoned. • 90% chance of inflicting Immobilized. [range 5; Cooldown: 3] |
| Purging Strikes | normal | Base game | Base attacks have a base 60% chance of removing 1 Positive Status Effect. Effects are increased for Single Shot attacks.  |
| Resistance Sundering | normal | Base game | Base attacks have a 90% chance of inflicting Sundered Resistance. Effects are increased for Single Shot attacks.  |
| Scarlet Plague | normal | Thrones of Blood | Scarlet Plague: Target enemy: • Sustains damage • Gains 2 Blood Parasite for 3 Turns. [damage 24 Physical; range 6; full action; Cannot be used when within an enemy Zone of Control.; Cooldown: 1] |
| Searing Strikes | normal | Base game | Base attacks gain: • +2 Fire Damage. • +10% damage against targets that are Burning. Effects are increased for Single Shot attacks.  |
| Shield of Faith | normal | Base game | • Gains Faithful. • Attackers have a 60% chance of suffering Remorse.  |
| Song of Carnage | normal | Base game | Song of Carnage: This unit and adjacent friendly units gain: • 2 Strengthened. • 2 Fortune. [range 0; Cannot be used when within an enemy Zone of Control.; Cooldown: 2] |
| Souldraining Strikes | normal | Base game | Base attacks gain: • Inflict Soulbound • Base 90% chance of inflicting Remorse Effects are increased for Single Shot attacks.  |
| Spiritbreaker Aura | normal | Base game | Spiritbreaker Aura: Adjacent enemy units lose morale 50% faster. |
| Still as Stone | normal | Base game | Still as Stone: At the start of each turn, gain +2 Defense and + 2 Resistance until the start of the next turn or until the unit moves. |
| Unholy Leader | normal | Base game | Unholy Leader: While army leader, non-Hero Undead units in army have: • +10% damage • +15 Hit Points • +2 Fire Protection • +2 Spirit Protection |
| Vicious Killer | normal | Base game | Vicious Killer: This unit inflicts increased morale penalties when killing an enemy. Affects enemy units up to 3 hexes. |
| Wail of the Banshee | normal | Base game | Wail of the Banshee: Enemy units within a 2-hex radius sustain damage and have a base 90% chance of: • Having their Morale reduced by -10. • Becoming 2 Weakened. [damage 10 Frost; range 0; Cooldown: 2] |
| Warding Aura | normal | Base game | Warding Aura: Adjacent friendly units gain +2 Resistance. |
| Withering Decay | normal | Base game | Base attacks inflict Decaying.  |
| Zealous | normal | Base game | This unit gains Zeal.  |
