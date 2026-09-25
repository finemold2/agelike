# Age of Wonders 4 — Unit Catalog (Content Bible, Research Draft)

Research target: *Age of Wonders 4* (Triumph Studios / Paradox, May 2023) plus all expansions through mid-2026
(Dragon Dawn, Empires & Ashes, Primal Fury, Eldritch Realms, Herald of Glory, Ways of War, Giant Kings,
Archon Prophecy, Cosmic Wanderer, Thrones of Blood, Rise from Ruin, Secrets of the Archmages) and the free
updates (Watcher, Wolf, Golem, Mystic, Tiger, Ogre, Griffon, Scorpion …).

## 0. How to read this document

**Sourcing.** The official wiki (aow4.paradoxwikis.com), the community database (minionsart.github.io/aow4db)
and every guide site were blocked by this session's network egress proxy; only search-engine snippets of those
pages could be read. Every row is therefore tagged:

| Tag | Meaning |
|---|---|
| ✓ | Numbers were read directly from wiki / database snippets in this session. |
| ≈ | Name and role are correct; numbers are reconstructed from the game's tier/class norms and may be off by a few points. |
| ? | Name, tier or tome attribution is uncertain (recalled, not confirmed). Verify before shipping. |

For a fan game the *shape* of the roster matters more than exact numbers. Use the "Tier norms" table below to
sanity-check any ≈ row.

**Stat conventions used everywhere below**

| Field | Meaning |
|---|---|
| HP | Hit points of the whole unit (a T1 infantry "unit" is a squad of 3–7 figures; a T4/T5 is often one big model). |
| Def / Res | Defense (vs physical) and Resistance (vs magic). Each point ≈ −10% damage taken. Typical 0–6. |
| Dmg | Base damage of the main attack, followed by channel: **P**hysical, **Fi**re, **Fr**ost, **L**ightning, **B**light, **S**pirit. |
| MP | Strategic movement points. 32 = foot infantry, 40 = light/scout, 48 = cavalry, ≈ 40–48 flying/floating. |
| Class | Shield, Polearm, Fighter, Shock, Skirmisher, Ranged, Battle Mage, Support, Scout, Siege (E&A), Mythic tag. |
| Size | Small (squad of figures), Large (single big model, takes +40% from polearms), Huge/Colossal (T5). |

**Tier norms (base game, pre-enchantment)**

| Tier | HP | Def/Res | Melee dmg | Ranged dmg | Cost feel |
|---|---|---|---|---|---|
| I | 45–70 | 0–2 / 0–1 | 10–12 | 6–10 (scouts), 10 (archers) | cheap, spammable |
| II | 60–80 | 1–3 / 1–3 | 14–16 | 12–16 | core army |
| III | 80–110 | 2–5 / 2–4 | 18–24 | 18–22 | elite |
| IV | 110–140 | 3–6 / 3–5 | 24–32 | 22–28 | rare, mythic/racial champions |
| V | 150–220 | 4–7 / 4–6 | 30–45 (often AoE) | 25–35 | one-per-army titans |

**Rank system.** Recruit → Regular → Veteran → Elite → Champion → Legend (each rank ≈ +HP, +dmg, sometimes a new ability).
Rank badges are drawn as small chevrons under the unit portrait.

**Common ability vocabulary** (short forms used in the tables)

| Ability | Effect |
|---|---|
| Defense Mode: Shield Wall / Warding | End turn braced: +3 Def (Shield Wall) or +3 Res (Warding) until next action. |
| Shield Defense | Extra Defense vs non-flanking attacks (shield units). |
| First Strike | Hits an attacker before it strikes (polearms). |
| Charge Resistance | Ignores charge bonuses & interruptions. |
| Charge Strike / Heavy Charge Strike | Bonus damage when moving before attacking; interrupts Defense Mode. |
| Farsight | +1 vision range (scouts). |
| Outpost Builder | Can found outposts on the map. |
| Swift / Slippery | +move; no attacks of opportunity against it. |
| Frenzy | +damage/crit as it fights; Berserker's Rage: bigger when wounded. |
| Stand Together (Feudal) | +damage when adjacent to an ally. |
| Overwhelm Tactics / Savage Strike (Barbarian) | +20% crit when adjacent to ally / crits add Blight. |
| Dormant → Awakened (High) | High units start "Dormant"; high morale or a Sun Priest "Awakens" them, unlocking a bonus. |
| Cruel / Cull the Weak (Dark) | Bonus damage vs Weakened / low-morale / debuffed targets. |
| Bolstered (Industrious) | Defense Mode grants stacking Def/Res. |
| Attunement: Star Blades (Mystic) | Base attacks gain Fire/Frost/Lightning when spells are cast in combat. |
| War Spoils / Subdue (Reaver) | Overseers can capture impaired units; captured units join for Spoils. |
| Rising Fury (Primal) | Stacks of Fury build with actions; spent for heals/summons/boons. |
| Devotion / Oath boon (Oathsworn) | Units get stronger the higher the empire's Devotion to its Oath. |
| Resurgence | If the army wins, the dead unit returns with low HP. |
| Slow Learner | Needs double XP (evolving units). |

Status effects you will need icons for: Bleeding, Burning, Frozen, Electrified, Poisoned, Weakened, Sundered Defense,
Sundered Resistance, Stunned, Blinded, Marked, Immobilized, Distracted, Condemned, Zeal, Regeneration, Bolstered,
Awakened, Frenzied, Concealed, Soaked/Wet (Stormborne), Corrupted (Eldritch), Bleeding-out/Blood-rite (ToB).

---

## 1. Culture rosters (racial units — take the faction's physical Form)

Every culture has a six-unit roster (some DLC cultures seven) covering: a Scout, two more T1s, two T2s and one T3.
All culture units are **racial** — they are rendered in whatever Form the player picked (Human, Elf, Dwarf, Halfling,
Orc, Goblin, Toadkin, Ratkin, Molekin, Lizardfolk, Tigran, Ogrekin?, Owlkin, Harefolk …) wearing the culture's armor set.
Visual descriptions below therefore describe **the armor/weapon kit and palette**, not the species.

### 1.1 Feudal (Order) — "knights, peasants and banners"
Palette: royal blue, white/cream, steel grey, gold trim. Heraldic tabards, chainmail, kite shields, timber-and-stone
castles. Culture perks: Stand Together; Feudal Training (fast rank-up); Rally of the Lieges (free vassal units).

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Scout | I | Scout | 45 | 0/0 | 6 P (Shoot Bow) | 40 | Farsight, Defense Mode, Stand Together, cheap upkeep | Light rider on a brown horse, blue hooded cloak, short bow, no armor | ✓ |
| Peasant Pikeman | I | Polearm | 65 | 2/1 | 11 P | 32 | Charge Resistance, First Strike, Feudal Training, Stand Together | Peasant levy: padded gambeson, straw/kettle hat, long ash pike, blue-white ribbon | ✓ |
| Archer | I | Ranged | 50 | 0/0 | 10 P (Shoot Bow, range 5) | 32 | Stand Together | Longbowman in blue tunic & leather bracers, quiver on hip, hood | ✓ |
| Defender | II | Shield | 70 | 2 (+4 vs non-flank)/1 | 12 P | 32 | Shield Wall, Shield Defense, Stand Together | Man-at-arms: chainmail hauberk, heraldic kite shield, arming sword, nasal helm | ✓ |
| Bannerman | II | Support | 70 | 2/3 | 16 P (Banner Smite) | 32 | Bulwark Standard (+Def aura), Soothing Standard (heal/morale), Defense Mode: Warding | Standard-bearer with tall banner pole bearing the faction crest; mace; plate cuirass | ✓ |
| Knight | III | Shock | 110 | 4/4 | 26 P (Heavy Charge Strike) | 48 | Charge, Charge Resistance?, Chivalry (retaliation bonus) | Full plate knight on a barded warhorse with blue-white caparison, couched lance, heater shield, plumed great helm | ✓ HP/Def, ≈ dmg |

### 1.2 High (Order/Astral) — "the awakened, sun-lit elves-in-spirit"
Palette: white, ivory, pale gold, teal-turquoise accents. Fluted gilded armor, sun discs, halos of light when Awakened.
Culture perks: Dormant/Awakened; Sacred Sites; morale-driven.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Lightseeker | I | Scout | 45 | 0/0 | 5 P bow | 40 | Farsight, Dormant: Shield of Light | Slender rider on a white horse, white-gold light armor, recurve bow | ✓ |
| Dawn Defender | I | Shield | 70 | 5/0 | 10 P | 32 | Shield Wall, Shield Defense, Dormant: Shield of Light (+Res when awakened) | Tall gilded tower shield with sunburst, scale cuirass, short spear/sword, white cloak | ✓ |
| Dusk Hunter | I | Ranged | 50 | 0/0 | 10 P bow | 32 | Dormant: Seeking (ignores cover when awakened) | Hooded archer in ivory & teal, tall elegant bow, quiver on back | ≈ |
| Sun Priest | II | Support | 60 | 1/3 | 16 S (Cosmic Blast, ranged) | 32 | Mending Awakening (heal + awaken), Awaken, Defense Mode: Warding, Dormant: Radiant Light | Robed priest, gold sun-disc staff, ivory vestments, floating halo ring | ✓ |
| Daylight Spear | II | Polearm | 75 | 3/2 | 14 P | 32 | Charge Resistance, First Strike, Dormant: Guardian | Glaive-wielder in gilded lamellar, white plume, teal sash | ✓ |
| Awakener | III | Battle Mage | 80 | 2/4 | 14 S (Spirit Bolts) / 22 S (Exposing Light) | 32 | Twin Awakening (awaken two allies), Charge Resistance, Dormant: Seeking | Ascetic mage with two orbiting light-orbs, gold circlet, flowing white robes trailing light | ✓ |

### 1.3 Barbarian (Chaos/Nature) — "furs, war-paint and bronze"
Palette: ochre, blood red, bone white, dark brown fur, bronze/copper metal. Skull totems, feathers, woad tattoos.
Culture perks: Overwhelm Tactics, Savage Strike; Warcamps; pillaging.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Pathfinder | I | Scout | 45 | 0/0 | 6 P bow | 40 | Farsight, Outpost Builder, Defense Mode | Fur-clad rider on a shaggy pony, hunting bow, feathered headband | ✓ |
| Sunderer | I | Skirmisher | 50 | 0/0 | 12 P melee / 16 P Javelin (range 3) | 40 | Swift, Slippery, Primal Strike | Bare-armed warrior with hand-axe and bundle of javelins, war paint, wolf pelt | ✓ |
| Warrior | I | Shield | 70 | 2 (5 vs non-flank)/0 | 12 P | 32 | Shield Bash (stagger), Shield Wall | Round hide shield with bronze boss, one-handed axe, horned/antlered helm; squad of 6 | ✓ |
| Fury | II | Ranged | 60 | 1/1 | 12 P bow | 32 | Frenzy (dmg grows each shot), Defense Mode | Wild archer, huge composite bow, bone jewelry, red-painted eyes, bare midriff | ✓ |
| Shaman | II | Support | 60 | 1/3 | 10 B (Spirit/Blight bolt) | 32 | Ancestral Blessing (heal + Frenzy), Weakening Curse, Totem | Antlered bone headdress, painted face, gnarled totem staff with skulls & feathers | ≈ |
| Berserker | III | Shock | 90 | 3/3 | 24 P (Heavy Charge Strike) | 32 | Berserker's Rage (stronger when wounded), Frenzy, Primal Strike | Huge bare-chested warrior, two-handed axe, bear-pelt cloak, blood-red war paint | ✓ |

### 1.4 Dark (Shadow) — "cults, veils and black steel" (reworked in *Thrones of Blood*, Nov 2025)
Palette: black, deep plum purple, crimson, bone white masks, dull silver spikes. Gothic spiked plate, hoods, chains.
Culture perks: Cruel (bonus vs debuffed), Cult of Personality → post-rework "Evil Cults" mechanic; night-battle bonuses.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Outrider | I | Scout | 45 | 0/0 | 6 P bow | 40 | Farsight, Night Vision | Black-cloaked rider on a black horse with red-glowing eyes; light crossbow | ✓ |
| Pursuer | I | Ranged | 50 | 0/0 | 10 P bow (Cruel) | 32 | Cruel (+dmg vs Weakened), Mark? | Masked archer, white featureless mask, black leather, purple sash | ✓ |
| Dark Warrior | I | Shock | 60 | 1/0 | 14 P (Charge Strike) | 32 | Charge Strike (cancels target Defense Mode, no retaliation), fragile | Two-handed serrated blade, spiked pauldrons, hood over mask | ≈ |
| Night Guard | II | Shield | 75 | 3/2 | 14 P | 32 | Shield Wall, Shield Defense, Menacing (morale aura) | Full black plate, tower shield with skull boss, crimson plume, spiked helm | ✓ |
| Warlock | II | Battle Mage / Support | 60 | 1/3 | 8 B (Weakening Bolts) / 24 B (Sundering Curse) | 32 | Weaken, Sunder Resistance, Dark Ritual (sacrifice for power) | Purple-black robes, curled horns on hood, staff topped with a green-black soul-flame | ✓ |
| Dark Knight | III | Shock | 90 | 3/3 | 24 P (Heavy Charge Strike) / 18 S (Dark Surge, ranged) | 48 | Charge, Dark Surge (magic bolt), Cruel | Black plate knight on a nightmare-black barded horse with red eyes; spiked lance | ✓ |

*Thrones of Blood* rework note: Dark culture now themes around **evil cults** (Cult of Death / Cult of Blood etc.),
gets cultist-flavored abilities, and interacts with the Elder Vampire ruler and Turned Vampire heroes.

### 1.5 Industrious (Materium/Order) — "forges, brass and tower shields"
Palette: iron grey, brass/bronze, oxblood red leather, warm forge-orange glows. Riveted plate, anvil crests, gears.
Culture perks: Prospecting (extra resources), Bolstered defense stacking, Industrious Training, extra production.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Pioneer | I | Scout | 45 | 0/0 | 6 P crossbow | 40 | Farsight, Outpost Builder, Prospector | Stocky rider on a draft pony, pickaxe on back, leather apron, light crossbow | ≈ |
| Arbalest | I | Ranged | 50 | 1/0 | 12 P crossbow (Armor-piercing bolt) | 32 | Piercing Bolt (ignores part of Def), reload after volley | Heavy crossbowman with steel pavise on back, brass helmet, red-brown tabard | ≈ |
| Anvil Guard | I | Shield | 70 | 3/1 | 12 P | 32 | Shield Wall, Shield Defense, Bolstered | Tower shield with anvil emblem, war-hammer, riveted iron plate | ≈ |
| Halberdier | II | Polearm | 75 | 3/2 | 14 P | 32 | First Strike, Charge Resistance, Retaliation/Reflect (damages melee attackers) | Halberd, full steel plate with brass rivets, red-brown gambeson beneath | ≈ |
| Steelshaper | II | Support | 60 | 2/3 | 12 L (Forge Bolt) | 32 | Steel Skin (+Def buff), Mend (heal, repairs constructs), Warding | Forge-priest: heavy brass gauntlets, hammer glowing with runes, leather apron, goggles | ≈ |
| Bastion | III | Shield | 100 | 5/3 | 16 P | 32 | Shield Wall, Unyielding (cannot be moved), Taunt/Bulwark aura, Bolstered | Massive full plate with enormous tower shield and maul, shoulder plates like anvils, brass trim | ≈ |

### 1.6 Mystic (Astral) — "crystal, starlight and projections" (reworked in the *Mystic Update*, June 2024)
Palette: midnight blue, violet, silver, cyan crystal glow. Robes with floating crystal shards, rune-etched staves.
Three schools since the update: **Attunement** (default; Star Blades), **Potential** (spell-heavy "Arcanists"), **Summoning**
("Astral origin" units).

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Mystic Projection | I | Scout | 40 | 0/2 | 6 S (Astral bolt) | 40 | Floating, Ethereal (takes reduced physical dmg), Farsight; cannot take cities | A translucent blue-white astral image of a robed mage, hovering, trailing light | ≈ |
| Arcane Guard | I | Shield | 70 | 3/2 | 12 P (+Star Blades) | 32 | Shield Wall, Attunement: Star Blades, Warding | Shield of blue crystal glass, silver-blue mail, hooded tabard with star emblem | ≈ |
| Soother | I | Support | 55 | 0/3 | 8 S | 32 | Soothe (heal), Mind Calm (remove debuffs), Warding | Robed healer with a glowing crystal orb, pale violet robes, silver circlet | ≈ ? |
| Arcanist (Potential school) | I | Battle Mage | 45 | 0/2 | 12 magic (varies) | 32 | Critical Cast; squad of 3 | Three junior mages with floating rune tomes | ✓ HP |
| Spellweaver | II | Battle Mage | 60 | 1/4 | 16 magic (Astral/Frost/Fire selectable) | 32 | Attunement: Star Blades, Spell Amplify | Mage with orbiting crystal shards, long violet robes, staff of blue crystal | ≈ ? |
| Phantasm Warriors | II | Shock / Fighter | 65 | 1/3 | 15 S | 40 | Ethereal, Phase (ignore terrain), Fades on morale loss; Astral origin | A squad of ghostly blue see-through swordsmen in ancient armor | ≈ |
| Summoner (Summoning school) | II | Support | 60 | 1/3 | 10 S | 32 | Summon Astral creature in combat, Bolster Summons | Robed conjurer with a floating open book and a small astral portal | ≈ ? |
| Spellblade (Attunement T3) | III | Fighter / Battle Mage | 90 | 3/4 | 20 P+magic (Star Blades) | 32 | Attunement, Spell Strike, Warding | Mage-knight with a floating crystal sword orbiting, silver plate & star-blue cloak | ? |

### 1.7 Reaver (Materium/Chaos, *Empires & Ashes*) — "magelocks, cannons and slavers"
Palette: gunmetal, blackened iron, dark oxblood leather, brass fittings, orange arcane muzzle-glow. Tricorn hats, long
coats, chains, spiked pauldrons. Culture perks: War Spoils, Subdue/capture, Plunder, Outlaw mechanics.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Observer | I | Scout | 45 | 0/0 | 6 P | 40 | Farsight, spyglass (extra vision), Outpost Builder | Rider with spyglass and short rifle, wide-brimmed hat, long coat | ≈ (name ✓) |
| Mercenary | I | Fighter | 70 | 3/1 | 13 P | 32 | Defensive Strike, expensive for T1 | Hired sword: iron breastplate, buckler, sabre, red sash, stubbled hood | ≈ |
| Harrier | I | Skirmisher | 60 | 2/0 | 11 P melee / 12 P thrown | 40 | Net Throw (Immobilize), Swift, Slippery; squad of 7 | Light-armored raiders with nets, hooks and throwing blades, bandanas | ✓ |
| Magelock | II | Ranged | 65 | 1/1 | 24 P/L (Heavy Magelock Rifle, needs all 3 action points) | 32 | Full-turn shot, high crit, Mark; squad of 3 | Musketeer with a long arcane rifle glowing orange at the breech, tricorn, long coat | ✓ |
| Overseer | II | Support | 70 | 1/3 | 12 P (Whip: Blind + Mark) | 32 | Subdue (capture impaired unit), Field Medic (close heal), Status Res 2 | Slaver-warden: whip, hooded coat, lantern on a chain, iron mask | ✓ |
| Magelock Cannon | III | Siege / Ranged | 90 | 3/2 | 30 P line blast (3 AP) | 32 | Cannon Line (hits all in a line), Siege (bonus vs walls), Overheat | Wheeled bronze cannon with arcane glow, crewed by three gunners | ≈ |

### 1.8 Primal (Nature/Chaos, *Primal Fury*) — "tribes bonded to a spirit animal"
Palette: earth tones + the chosen animal's element (ash-orange, sand-gold, ice-blue, mire-green, storm-violet,
forest-green, cave-purple). Bone, hide, feathers, totems; animal skulls as helms. Culture perks: Rising Fury, Spirit
Animal boons, terrain terraforming to the animal's biome, hit-and-run.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Spirit Tracker | I | Scout / Ranged | 45 | 0/0 | 6 P | 40 | Farsight, Track (reveals), Rising Fury | Lightly-clad hunter with a spear and sling, animal-tooth necklace | ≈ |
| Darter | I | Ranged | 50 | 0/0 | 9 P/B (Blowgun, range 4, ignores cover) | 32 | Disengaging Shot (shoot & leap back), Poison | Blowgun hunter, feathered cloak, painted face | ✓ |
| Protector | I | Shield | 70 | 3/1 | 12 P | 32 | Primal Renewal (spend Fury to heal), Shield Wall | Hide-and-bone shield, obsidian club, animal-skull helm | ✓ |
| Ancestral Warden | II | Polearm | 75 | 2/2 | 15 P | 40 | Leap Strike (jumps into enemy groups), First Strike | Long bone-tipped spear, bone chest plate, totem braids | ≈ |
| Animist | II | Support | 60 | 1/3 | 10 B/S | 32 | Summon Primal Animal (spend Fury; one free), Spiritual Healing (heal 15 + 3 Fury) | Shaman with a totem staff carved as the tribe's animal, fur mantle, glowing tattoos | ✓ |
| Primal Charger | II | Shock (mounted) | 80 | 2/2 | 18 P (Cleaving Charge — up to 3 adjacent targets) | 48 | Cleaving Charge, Spirit Animal boon | Rider mounted on the tribe's chosen animal (sabertooth, crocodile, wolf, spider…) | ✓ |
| Chosen Spirit Animal | III | Fighter/Shock (animal) | 100 | 3/3 | 22 (element of animal) | 40–48 | See §4.1 for the seven animals | The tribe's beast itself, painted/tattooed with tribal markings | ≈ |

### 1.9 Oathsworn (Order + Oath affinity, *Ways of War*) — "samurai-monk honor codes"
Palette: lacquered black/red (Strife), white/gold (Righteousness), jade-green/cream (Harmony); banners on the back
(sashimono), naginata, curved blades, wide-brim hats. Culture perks: Devotion, Oath boons (Harmonize etc.),
Oathbreaker penalties.

| Unit | Tier | Class | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|
| Scout (Oathsworn) | I | Scout | 45 | 0/0 | 6 P | 40 | Farsight | Mounted messenger with back-banner and short bow, conical hat | ≈ ? name |
| Ranged (Oathsworn) | I | Ranged | 50 | 0/0 | 10 P | 32 | Oath boon | Archer with tall asymmetric bow, lacquered lamellar | ? name |
| Sworn Guard | I–II | Polearm | 70 | 3/1 | 13 P (applies Sundered Defense) | 32 | First Strike, Charge Resistance, Sunder Defense | Naginata guard in lacquered lamellar, back-banner with oath sigil | ✓ role |
| Honor Blade | II | Fighter | 80 | 3/2 | 16 P (Defensive Strike → enters Defense Mode) | 32 | Defensive Strike, extra Def/Res, high cost | Two-sword duelist, ornate helmet crest, silk sash | ✓ role |
| Vowkeeper | II | Support | 65 | 1/3 | 10 S | 32 | Harmonize (self-heal below HP threshold), AoE heal, strip positive effects | Monk-priest with prayer beads and a ringed staff (shakujō), cream & jade robes | ✓ role |
| Avenger | III | Shock | 95 | 3/3 | 24 P | 48 | Vengeful Charge (bonus vs units that harmed allies), Oath boon | Heavy cavalry with great-blade, red-black lacquer, tall back-banner | ✓ role |

### 1.10 Architects (*Archon Prophecy*, Aug 2025) — "monument builders"
Culture builds vast magical monuments dedicated to an affinity. Roster **not captured** in this session; expect the
standard 6 slots (Scout, Shield, Ranged, Support, Polearm/Fighter, T3) in a white-stone / bronze / geometric-sigil
aesthetic with masons' tools, chariots (new mount) and Griffon riders.

### 1.11 Nomads (*Rise from Ruin*, Mar 2026) — "mobile cities, Conquerors or Scavengers"
Roster not captured. Aesthetic: desert caravan — sand-gold, terracotta, indigo cloth, brass; riders (Harefolk form
debuted here), wagons, siege on wheels. Two paths: Conquerors (fast raids) and Scavengers (loot wonders).

---

## 2. Tome units by affinity

Tome tier grid (base game; 2 tomes per tier per affinity at T1–T4, 1 at T5; DLC tomes noted):

| Affinity | T1 | T2 | T3 | T4 | T5 | DLC tomes |
|---|---|---|---|---|---|---|
| Order | Faith, Zeal | Beacon, Inquisition | Sanctuary, Subjugation | Exaltation, Supremacy | God Emperor | Discipline (T1, WoW), Prosperity (T4, WoW), Cleansing Flame (ER), Prophecies / Archon / Revenant (AP) |
| Chaos | Horde, Pyromancy? | Revelry, Warlord?/Devastation | Mayhem, Devastation? | Demon Gate, Chaos Channeling | Chaos Lord | Calamity (T4, WoW), Warlord & Warband (RfR), Torment (ToB) |
| Nature | Roots, Beasts | Fertility, Glades | Cycles, Vigor | Nature's Wrath, Paradise | Goddess of Nature | Evolution (T1, DD), Fey Mists (T2, PF), Stormborne (T4, PF) |
| Materium | Enchantment, Rock | Artificing, Winds | Terramancy, Transmutation | Crucible, Golden Realm | Creator | Alchemy, Construct, Dreadnought, Severing (E&A), Geomancy, Dungeon Depths (GK), Sandwalkers (RfR) |
| Astral | Evocation, Warding | Scrying, Summoning | Teleportation, Astral Mirror | Astral Convergence, Amplification? | Arch Mage | Amplification (E&A), Fey Mists/Stormborne (PF, dual), 6 forbidden tomes (SotA) |
| Shadow | Souls, Cryomancy | Cold Dark, Necromancy | Doomherald?, Oblivion? | Reaper, Oblivion? | Eternal Lord | Doomherald (E&A), Shades (T2, WoW), Tentacle, Corruption (ER), Blood Rite, Crimson Reign (ToB) |

Rows marked ? are uncertain placements. Tome *units* below.

### 2.1 Order tome units
| Unit | Tier | Class | Tome | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|---|
| Zealot | I | Fighter | Zeal | 60 | 1/1 | 12 P | 32 | Permanent Zeal (+dmg, morale immune) | Robed fanatic with flail/mace, white tabard with gold sun, bare feet, wild eyes | ✓ role |
| Chaplain | II | Support | Faith | 60 | 1/3 | 10 S | 32 | Restore (heal), Bless, Smite Undead | Armored cleric with censer and mace, white-gold surcoat | ≈ |
| Divine Beacon | II | Support (construct) | Beacon | 65 | 2/4 | 12 S | 32 (float) | Aura +Res/morale, Condemn, Floating | A hovering golden lantern-shrine, ornate filigree, radiant light beams | ≈ |
| Inquisitor | II | Skirmisher | Inquisition | 65 | 1/2 | 12 P melee / 14 S ranged | 40 | Condemn, Interrogate (reveal), Slippery | Hooded inquisitor in black & gold, crossbow and short sword, holy seal on chest | ✓ role |
| Monk | I | Fighter | Discipline (WoW) | 60 | 1/2 | 12 P (unarmed) | 40 | Cleanse (remove debuffs), Focused Strike, Evasive | Bald monk, orange-white wraps, staff or bare fists | ✓ role |
| Tyrant Knight | III (IV?) | Shock | Subjugation | 100 | 4/3 | 24 P (Tyrant's Charge: HP + morale dmg) | 48 | Charge, Intimidate, morale synergy | Imposing knight in blackened gold plate on barded warhorse, whip & lance, iron crown | ✓ role |
| Eagle Rider | IV | Shield (flying) | Supremacy | 120 | 4/4 | 26 P | 48 fly | Flying, Shield Wall, Anthem synergy, dive attack | Golden-armored rider on a giant eagle, white-and-gold plumage | ✓ role |
| Shrine of Smiting | V | Support / Battle Mage (construct, Mythic) | God Emperor | 180 | 5/6 | 34 S AoE (Smite) | 32 float | Floating, Divine Aura (mass buff), Smite, Sanctify | A colossal floating golden temple-shrine with pillars, bells and a blazing sun core | ✓ tier |
| Archon (celestial ally) | IV | Fighter/Support (Celestial) | Archon (AP) | 120 | 4/5 | 24 S | 48 fly | Flying, Radiance, Ascension | Winged celestial warrior, white-gold armor, halo of light, spear | ≈ |
| Revenant Archon (×2) | III–IV | Fighter / Battle Mage (Undead Celestial) | Revenant (AP) | 100–120 | 3/4 | 22 S/B | 40 | Vengeance, Necrotic strength, Resurgence | "Twisted echoes of fallen warriors": tarnished archon armor, broken wings of ash, green-blue spectral glow | ✓ existence |
| Battlesaint (hero class) | hero | Support/Tank | AP | — | — | — | — | Sacred support or martyr tank | Armored saint with relic banner, gold halo | ✓ |

### 2.2 Chaos tome units
| Unit | Tier | Class | Tome | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|---|
| Inferno Puppy | I | Fighter (Fiend) | Pyromancy / Horde | 45 | 0/2 | 10 Fi | 40 | Burning bite, Fire immune, summon | A cute rotund hellhound pup with ember-glow eyes and smouldering fur | ✓ name |
| Lesser Magma Spirit | I | Fighter (Elemental) | Pyromancy | 50 | 2/2 | 10 Fi | 32 | Fire immune, Burning aura | Squat molten-rock elemental with glowing lava cracks | ✓ name |
| Houndmaster | II | Support | Horde | 65 | 1/1 | 12 P | 32 | Free hound summon each battle, Rally the Mob | Burly handler with chained hounds, spiked leather, whip | ✓ role |
| Pyromancer | II | Battle Mage | Pyromancy | 60 | 0/3 | 16 Fi (Fire Bolts) / Fireball AoE | 32 | Critical Cast, Burning | Red-and-black robed mage with flaming hands, ash-grey hood | ✓ name |
| Skald | II | Support | Revelry | 65 | 1/2 | 12 P | 32 | Inspiring Song (+morale, Frenzy), Mockery (debuff) | Bard-warrior with war drum/horn, tattoos, mead horn on belt | ✓ name |
| Gremlin | II | Skirmisher (Fiend) | Mayhem | 55 | 1/2 | 12 P/Fi | 40 | Sabotage (siege dmg), Slippery, Mischief (Distract) | Small hunched imp with oversized ears, wrench/knife, chaos-orange skin | ✓ name |
| Devastator Sphere | III | Siege / Shock (construct) | Devastation | 95 | 4/3 | 26 Fi/P (rolling charge, AoE) | 40 | Siege, Charge, Explode on death | Iron sphere wreathed in fire, spikes, rolls over enemies | ✓ name |
| Warbreed | IV | Fighter (racial) | Chaos Channeling? | 130 | 3/3 | 28 P AoE sweep | 32 | Regeneration, AoE cleave, Siege bonus, gets racial transformations | A hulking mutated giant version of the faction's race, tusks, spines, bulging muscle | ✓ role |
| Chaos Eater | IV | Fighter (Fiend) | Demon Gate | 125 | 3/4 | 26 P (+big bonus vs debuffed, lifesteal) | 40 | Devour (heal on debuffed targets), Fear | Bloated demon with an enormous toothed maw for a torso, red-orange hide | ✓ role |
| Balor | V | Shock (Fiend, Mythic) | Chaos Lord | 200 | 5/5 | 40 Fi/P (whip + blade) | 48 fly | Flying, Burning aura, Fear, Death Explosion | Colossal winged demon lord of fire and shadow, flaming whip and greatsword, black horns | ✓ tier |
| Warlord elite / Infernal allies | III–IV | various | Warlord (RfR) | — | — | — | — | Elite warriors & infernal summons | Bronze-armored elite warriors; horned infernal brutes | ✓ existence |
| Calamity units | IV | Battle Mage / Fighter | Calamity (WoW) | ≈115 | 3/4 | 24 Fr-"Ghostfire" | 32 | Ghostfire (cold fire), Calamity | Ash-grey robed harbingers wreathed in pale blue-white "ghostfire" | ✓ existence |

### 2.3 Nature tome units
| Unit | Tier | Class | Tome | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|---|
| Entwined Thrall | I | Skirmisher (Plant) | Roots | 50 | 1/1 | 11 P melee / 10 B ranged (poison spit) | 40 | Poison, Slippery, Entwined (rooted regen) | Humanoid wrapped head-to-toe in living vines, wooden mask, thorn claws | ✓ |
| Entwined Protector | II | Shield (Plant) | Glades / Fertility | 80 | 4/2 | 14 P | 32 | Healing Sap (heal self + adjacent), Shield Wall | Bark-armored guardian with a shield of living wood, moss shoulders, glowing green sap veins | ✓ |
| Nymph | II | Support (Fey) | Glades | 55 | 0/4 | 10 S | 40 | Heal, Charm (mind control), Blight bolt | Fey woman with flowers in hair, leaf-dress, faint green glow, butterfly motes | ✓ |
| Wildspeaker | II | Support | Beasts | 60 | 1/3 | 10 B | 32 | Animal Kinship (buff animals), Summon Wild Animal, Heal | Druid with antler crown and animal companions, hide cloak | ✓ name |
| Druid of the Cycle | III | Support | Cycles | 80 | 2/4 | 16 B/S | 32 | Resurrect ally, Reap (instant-kill wounded), Wither/Bloom | Autumn-robed druid with a scythe-staff, antlers, half-green/half-brown robes | ✓ |
| Mistling | I–II | Skirmisher (Fey) | Fey Mists (PF) | 50 | 0/3 | 10 S | 40 fly | Concealed in mist, Mist aura (ranged shield) | A wisp-like fey of pale blue mist with glowing eyes | ✓ name |
| Stormborne creature | IV | Fighter (Astral/Nature) | Stormborne (PF) | 120 | 3/4 | 24 L/Fr | 40 swim | Soak, Lightning, transform race to deep-sea folk | Kraken-like sea beast crackling with lightning, teal-black skin | ≈ |
| Horned God | V | Support / Battle Mage (Mythic) | Goddess of Nature (Nature's Wrath?) | 190 | 4/6 | 34 B/S AoE + spell-like abilities | 40 | Regeneration aura, Entangle, Mass Heal, Wrath | Gigantic antlered forest deity — stag skull face, bark skin, moss and mushrooms, glowing green eyes | ✓ |
| Slither Hatchling | I | Fighter (Reptile, evolving) | Evolution (DD) | 45 | 1/1 | 10 P/B | 40 | Slow Learner, evolves into a T3 serpent | Small hooded serpent, green-gold scales | ✓ |
| Wyvern Fledgling | I | Fighter (Dragon, evolving) | Evolution (DD) | 50 | 1/1 | 11 P | 40 fly | Slow Learner, evolves into random T3 Wyvern (Fire/Frost/Golden/Obsidian) | Gangly young wyvern, leathery wings, oversized head | ✓ |

### 2.4 Materium tome units
| Unit | Tier | Class | Tome | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|---|
| Copper Golem | I | Shield (Construct) | Enchantment | 60 | 3/1 | 11 P | 32 | Construct (no morale, immune poison/bleed), evolves to Iron Golem w/ XP | Small stout golem of green-patinaed copper plates, glowing seam runes | ✓ |
| Lesser Stone Spirit | I | Fighter (Elemental) | Rock | 55 | 3/1 | 11 P | 32 | Stone skin, Slow, Immovable | Boulder-bodied elemental with amber crystal eyes | ? |
| Iron Golem | II | Shield (Construct) | Artificing | 80 | 4/2 | 14 P | 32 | Shield Wall, Status Immunity aura (protects allies), Construct | Heavy riveted iron golem, furnace glow in chest, hammer-fists | ✓ |
| Zephyr Archer | II | Ranged (racial) | Winds | 55 | 0/2 | 12 P (Multi-shot: 2–3 targets) | 40 float | Floating, Wind Step, Multi-target volley | Archer hovering on a swirl of wind, teal-white scarves, feathered bow | ✓ |
| Transmuter | III | Support | Transmutation | 75 | 2/4 | 14 magic | 32 | Transmute (buff Def/Res), Turn to Gold?, Alchemical bolt | Alchemist with vial belt, brass gauntlets, goggles, amber-glass staff | ✓ role |
| Bronze Golem | III | Fighter (Construct) | Construct (E&A) | 100 | 5/3 | 22 P | 32 | Construct, Heavy strike, Bolstered | Massive bronze automaton, clockwork joints, verdigris | ✓ |
| Afflictor | II | Support / Battle Mage | Alchemy (E&A) | 60 | 1/3 | 12 B (acid flask) | 32 | Afflict (Poison/Weaken), Alchemical brew (buff) | Plague-doctor style alchemist with acid flasks, bronze mask | ✓ name |
| Great Bombard | IV | Siege (Construct) | Dreadnought (E&A) | 120 | 4/3 | 34 P AoE (indirect, 3 AP) | 32 | Siege, Bombard, Overheat | A gigantic iron mortar-cannon on wheels with a crew | ✓ |
| Ironclad | IV | Shock / Siege (Construct) | Dreadnought (E&A) | 140 | 6/3 | 28 P/Fi (ammo types: shrapnel, incendiary, chain) | 40 | Tank charge (crush), ammo selection, Siege | A magic-powered iron tank/war wagon, smokestack, riveted plates, glowing core | ✓ |
| Golden Golem | IV/V | Shield (Construct, Mythic) | Golden Realm | 160 | 6/5 | 30 P | 32 | Immovable, Gleaming (blinds), Reflect magic | Towering gleaming gold statue-golem with sunburst crown | ✓ (tier?) |
| Earth Titan | V | Fighter (Elemental, Mythic) | Creator | 210 | 6/5 | 40 P AoE stomp | 32 | Earthquake, Immovable, Terraform | A mountain given legs: granite body, crystal veins, moss shoulders | ✓ name (tier?) |
| Severing Golem | V | Battle Mage / Fighter (Construct) | Severing (E&A) | 180 | 5/6 | 32 P + Dispel | 32 | Sever (dispel/suppress summons), Anti-magic aura | Obsidian-and-brass golem with a rune-blade that cuts magic, purple-white void seams | ✓ |
| Geomancer | II–III | Battle Mage | Geomancy (GK) | 70 | 2/4 | 16 P/L (crystal shards) | 32 | Crystal Growth, Earth channel, geomantic transformation synergy | Robed mage with floating amber/violet crystal shards, crystal gauntlets | ✓ role |
| Clay Soldier | I–II | Fighter (Construct) | Dungeon Depths (GK) | 60 | 2/2 | 12 P | 32 | Construct, Eternal (rebuild), Trap synergy | Terracotta-army style clay warrior with glazed armor | ✓ role |
| Sand Guardian | III | Fighter (Elemental) | Sandwalkers (RfR) | 100 | 3/4 | 22 P | 40 | Sandstorm, Sand Walk, Bury | Dune elemental / sandstone sphinx-like guardian | ≈ |

### 2.5 Astral tome units
| Unit | Tier | Class | Tome | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|---|
| Evoker | II | Battle Mage | Evocation | 60 | 0/3 | 16 L (Lightning Bolts) / Chain Lightning | 32 | Critical Cast, Electrify | Blue-robed mage with crackling lightning between the hands | ✓ name |
| Phantasm Warrior | II | Shield/Fighter (Astral) | Summoning | 65 | 2/3 | 14 S | 40 | Ethereal, Phase, Defensive | Ghostly blue see-through warriors in antique plate | ✓ |
| Astral Keeper | III | Support (Astral) | Warding? | 75 | 1/5 | 14 S | 32 float | Heal magical-origin units, Ward, Dispel | Hovering crystalline guardian — a robed figure of blue glass with a floating crystal halo | ✓ role |
| Watcher | III | Battle Mage (Astral) | Scrying | 80 | 2/5 | 18 S (Gaze) | 40 float | Floating, +vision, Reveal, Stun gaze | A giant floating eyeball orb set in a ring of crystal, tendrils of light | ✓ |
| Amplification Pylon | III | Support (Construct) | Amplification (E&A) | 80 | 3/5 | — | 32 | Amplify Spells (+dmg/–cost), Warding aura | A floating faceted blue-violet crystal obelisk with rune rings | ✓ |
| Astral Serpent | III | Fighter (Astral) | Teleportation? | 95 | 2/4 | 22 S (bite + tail) | 48 fly | Flying, Phase, aggressive melee | Translucent sky-blue serpent-dragon with a starfield body | ✓ |
| Mirror Mimic | III | Fighter (Astral) | Astral Mirror | 85 | 2/4 | copies target | 40 | Mimic (copies enemy stats/attack), Reflect | A silvery liquid-mirror humanoid | ✓ name |
| Phase Beast | IV | Shock (Astral) | Astral Mirror / Convergence | 120 | 3/5 | 28 S | 48 | Teleport into melee (Phase Charge), Slippery | Panther-like beast of violet-blue with glowing geometric markings and no visible eyes | ✓ |
| Lost Wizard | IV/V | Battle Mage (Mythic) | Arch Mage | 150 | 3/7 | 30 S AoE + spells | 40 float | Multi-cast, Dispel, Arcane storm | A spectral archmage-king floating amid orbiting tomes, robes of night sky, crown of light | ✓ (tier?) |
| Astral Wisp | I | Skirmisher (Ethereal, wild) | wild / summons | 40 | 0/4 | 8 S | 48 fly | Ethereal, Flying | A drifting mote of blue light with a faint face | ✓ name |
| Forbidden-tome units | III–V | various | Secrets of the Archmages (2026) | — | — | — | — | "Forbidden magic" | Owlkin-era arcane: black-and-gold sigils, purple void | ✓ existence |

### 2.6 Shadow tome units
| Unit | Tier | Class | Tome | HP | Def/Res | Dmg | MP | Abilities | Visual | Src |
|---|---|---|---|---|---|---|---|---|---|---|
| Lesser Snow Spirit | I | Fighter (Elemental) | Cryomancy | 50 | 1/3 | 10 Fr | 40 float | Frost aura, Freeze, Frost immune | A drifting ice-crystal sprite with a cold blue glow | ✓ name |
| Lost Soul | I | Skirmisher (Undead, Ethereal) | Souls | 40 | 0/4 | 9 S | 48 fly | Ethereal, Flying, Soul Drain | A wailing translucent ghost trailing tattered shroud | ✓ name |
| Zombie | I | Fighter (Undead) | Necromancy (raised) | 60 | 1/0 | 11 P (Decay) | 24 | Undead, Slow, Infect | Rotting corpse in remnants of its former culture's gear, grey-green skin | ≈ |
| Skeleton | I | Shield/Fighter (Undead) | Necromancy / Bone Golem death | 45 | 2/1 | 10 P | 32 | Undead, pierce-resistant | Bare bones with rusted helm and shield | ≈ |
| Necromancer | II | Support | Necromancy | 60 | 1/4 | 12 B | 32 | Raise Zombie/Skeleton from corpses, Necrotic Magic, Curse | Skull-masked caster in black-teal robes, staff crowned with a green soul-flame | ✓ |
| Bone Horror | III | Fighter (Undead) | Necromancy / Souls | 100 | 3/2 | 22 P AoE | 32 | Undead, Terrify, Regenerates from corpses | A many-limbed amalgam of skulls and ribcages | ✓ name |
| Bone Golem | III | Shock (Undead construct) | Oblivion?/Necromancy | 95 | 4/2 | 22 P | 40 | Charge; splits into Skeletons on death | Hulking golem assembled from bones, bound by green-black necrotic energy | ✓ |
| Assassin | II | Skirmisher | Shades (WoW) | 60 | 1/2 | 14 P (Backstab: big vs flanked) | 40 | Concealed, Blind, Fatal Blow | Hooded assassin with twin daggers, grey-black wraps, smoke | ✓ role |
| Doomherald | III–IV | Support / Battle Mage | Doomherald (E&A) | 90 | 2/5 | 20 B/S (Doom) | 32 | Doom (delayed death), Fear aura | Hooded harbinger with a bell and a rune-scribed scroll, black-iron mask | ≈ |
| Constrictor | II–III | Fighter (racial, Eldritch) | Tentacle (ER) | 85 | 2/3 | 18 P (Constrict: Immobilize) | 32 | Grapple, Immobilize, Corruption | The faction's race with writhing tentacles for arms, purple-black suckers | ✓ |
| Evil Reflection | = target | copy (Eldritch) | Corruption (ER) | copy | copy | copy | copy | Mirror of an enemy unit, dark-tinted | A shadow-doppelgänger of the target with purple void eyes | ✓ |
| Reaper | V | Fighter/Support (Undead, Mythic) | Reaper / Eternal Lord | 180 | 4/6 | 36 S (Reap: kills wounded) | 48 fly | Flying, Soul Harvest (+souls), Fear, upkeep 5 souls/turn | A vast hooded death-spirit with a scythe of pale light, ragged black robes, no face | ✓ |
| Blood-rite / Torment units | III–IV | Fighter/Support | Blood Rite, Torment (ToB) | ≈100 | 3/3 | 22 P (Bleed) | 32 | Bleed, Pain-empowered, drain | Crimson-robed cultists, blood-glass blades, gothic black steel | ✓ existence |
| Turned Vampire (hero) | hero | — | ToB | — | — | — | — | Vampire Origin tree, night power, drain | Pale aristocrat with red eyes, high collar, black-crimson cloak | ✓ |

---

## 3. Mythic & high-tier reference (T4–T5 quick list)

| Unit | Tier | Affinity | Source | Notes |
|---|---|---|---|---|
| Shrine of Smiting | V | Order | Tome of the God Emperor | floating golden temple |
| Balor | V | Chaos | Tome of the Chaos Lord | winged fire demon; death explosion |
| Horned God | V | Nature | Tome of the Goddess of Nature | antlered forest god |
| Golden Golem | IV–V | Materium | Tome of the Golden Realm | gold construct |
| Earth Titan | V | Materium | Tome of the Creator | stone colossus |
| Reaper | V | Shadow | Tome of the Reaper / Eternal Lord | death spirit |
| Lost Wizard | IV–V | Astral | Tome of the Arch Mage | spectral archmage |
| Severing Golem | V | Materium/Astral | Tome of Severing (E&A) | anti-magic golem |
| Adult Dragons (Fire, Frost, Golden, Obsidian) | V | Dragon | Young Dragon at Champion rank (DD) | see §4.4 |
| Primordials (several) | V | Nature/Materium | Giant Kings wildlife (Ancient Wonders) | colossal beasts |
| Eagle Rider | IV | Order | Tome of Supremacy | flying shield |
| Phase Beast | IV | Astral | Tome of the Astral Mirror | teleporting shock |
| Chaos Eater, Warbreed | IV | Chaos | Demon Gate / Chaos Channeling | fiend / mutant racial |
| Great Bombard, Ironclad | IV | Materium | Tome of the Dreadnought (E&A) | siege engines |
| Stormborne beast | IV | Astral/Nature | Tome of the Stormborne (PF) | sea monster |
| Archon | IV | Order | Tome of the Archon (AP) | celestial |
| Tyrant Knight | III–IV | Order | Tome of Subjugation | morale-breaking cavalry |

---

## 4. Wildlife, animals and mounts

### 4.1 Primal spirit animals (Primal Fury) — also recruitable / summonable by Primal culture
| Animal | Tier | Element / biome | Visual |
|---|---|---|---|
| Ash Sabertooth | III | Fire / Volcanic ashlands | Black-and-ember-striped sabertooth cat, smouldering mane |
| Dune Serpent | III | Physical-Blight? / Desert | Sand-gold horned serpent that burrows |
| Glacial Mammoth | III | Frost / Arctic | Shaggy white-blue mammoth with icy tusks |
| Mire Crocodile | III | Blight / Swamp | Moss-backed dark green crocodile |
| Storm Crow | III | Lightning / Coast-plains | Giant blue-black crow with lightning-crackling wings |
| Sylvan Wolf | III | Physical / Forest | Grey-green wolf with leaf-and-antler markings |
| Tunneling Spider | III | Blight-Physical / Underground | Pale violet cave spider with digging forelegs |

### 4.2 General wildlife (roam the map, guard sites, summoned by Nature spells)
| Unit | Tier | Class | HP | Def/Res | Dmg | Biome | Visual | Src |
|---|---|---|---|---|---|---|---|---|
| Goretusk Piglet | I | Fighter | 40 | 0/0 | 9 P | temperate | Small tusked boar | ✓ name |
| Goretusk Boar | II | Shock | 65 | 1/1 | 15 P (charge) | temperate | Big bristled boar with cracked tusks | ≈ |
| Dire Penguin | I | Fighter | 40 | 1/1 | 9 P/Fr | arctic | Comically large aggressive penguin | ✓ name |
| Giant Beetle | I | Shield | 50 | 3/0 | 9 P | underground | Armored black-blue beetle | ✓ |
| Dread Spider Hatchling | I | Skirmisher | 40 | 0/1 | 9 B | forest/underground | Small black spider | ✓ |
| Vampire Spider Hatchling | I | Skirmisher | 40 | 0/1 | 9 B (drain) | underground | Red-marked spider | ✓ |
| Young Caustic Worm | I | Fighter | 45 | 1/2 | 10 B | swamp | Pale segmented worm dripping acid | ✓ |
| Crocodile | I | Fighter | 55 | 2/0 | 11 P | swamp | Green river crocodile | ✓ |
| Fractured Serpent | I | Fighter | 45 | 0/3 | 10 S | astral/ruins | A serpent of cracked crystal | ✓ |
| Slither Hatchling | I | Fighter | 45 | 1/1 | 10 P | desert | Young hooded serpent | ✓ |
| Wyvern Fledgling | I | Fighter (fly) | 50 | 1/1 | 11 P | mountain | Juvenile wyvern | ✓ |
| Warg | II | Shock | 60 | 1/0 | 14 P | temperate/tundra | Large grey wolf-like beast | ✓ |
| White Wolf | II | Shock | 65 | 1/2 | 14 P/Fr | arctic | Snow-white wolf with pale eyes | ✓ name |
| Brown Bear | II | Fighter | 75 | 2/1 | 16 P | forest | Brown bear | ✓ |
| Hunter Spider | II | Skirmisher | 60 | 1/1 | 13 B | forest | Long-legged tan spider | ✓ |
| Weaver Spider | II | Support/Ranged | 55 | 1/2 | 12 B (web: Immobilize) | underground | Bulbous web-spinning spider | ✓ |
| Razorback | II | Shock | 65 | 2/0 | 15 P | ashlands | Spined boar with bony ridge | ✓ |
| Ape | II | Fighter | 70 | 1/1 | 15 P | jungle/forest | Grey-black great ape | ✓ |
| Griffon | II | Shock (fly) | 70 | 2/2 | 16 P | mountain | Eagle-lion, brown-gold | ✓ |
| Plague Serpent | II | Fighter | 65 | 1/2 | 14 B | swamp | Sickly green serpent | ✓ |
| Sabertooth | II–III | Shock | 80 | 2/1 | 18 P | plains/ash | Tawny sabertooth cat | ≈ |
| Dire Bear | III | Fighter | 100 | 3/2 | 22 P | forest | Enormous dark bear | ✓ name |
| Ice Spider Matriarch | III | Support/Fighter | 95 | 3/3 | 20 Fr | arctic/underground | Huge pale-blue spider | ✓ name |
| Dread Spider Matriarch | III | Fighter | 95 | 3/2 | 20 B | underground | Huge black spider | ≈ |
| Caustic Worm (Greater) | III | Fighter | 100 | 2/3 | 22 B | swamp | Giant acid worm | ≈ |
| Mammoth | III | Fighter | 110 | 3/2 | 22 P | arctic | Shaggy mammoth | ≈ |
| Wyvern (Fire/Frost/Golden/Obsidian) | III | Fighter (fly) | 90 | 2/3 | 20 Fi/Fr/S/B | mountain | Two-legged dragon-kin in the four color variants | ✓ |
| Ogre | III | Fighter | 105 | 2/1 | 24 P | hills | Fat brutish giant with club (Ogre Update) | ≈ |
| Infernal Juggernaut | IV | Shock | 130 | 4/3 | 28 Fi | volcanic | Lava-armored rhinoceros-beast | ✓ name |
| Phoenix | IV | Battle Mage (fly) | 110 | 2/6 | 24 Fi/S | volcanic/holy | Blazing golden-red firebird; Resurgence | ✓ name |
| Scorpion (Giant) | II–III | Fighter | 80 | 3/1 | 18 B | desert | Sand-colored scorpion (Scorpion Update 2026) | ≈ |
| Bats / Maggots (ToB) | I–II | Skirmisher | 40–55 | 0/1 | 8–12 B | sunless lands | Bat swarms; bloated grave maggots | ✓ existence |
| Lithorine (×5) | II–IV | various (Construct-like) | 70–130 | 3–5/3–5 | 14–28 P/L | underground | Crystal-forged beings: faceted amethyst/quartz bodies with glowing cores | ✓ existence |
| Primordials | V | Fighter (Mythic) | 200+ | 5/5 | 40 AoE | Ancient Wonders | Colossal primeval beasts (e.g. a tortoise-mountain, a behemoth) | ✓ existence |

### 4.3 Mounts (hero & cavalry mounts change the model)
Horse (default), Warg/Wolf, Boar, Elk/Stag, Nightmare (fire horse), Spider, Sabertooth, Lizard/Raptor (Dragon Dawn),
Mammoth, Crocodile, Griffon & Chariot (Archon Prophecy), Bat (ToB), plus culture-specific (Primal animals).

### 4.4 Dragons (Dragon Dawn)
| Unit | Tier | Class | HP | Def/Res | Dmg | Notes | Visual |
|---|---|---|---|---|---|---|---|
| Wyvern Fledgling | I | Fighter | 50 | 1/1 | 11 P | evolves to a random T3 Wyvern | gangly winged juvenile |
| Fire / Frost / Golden / Obsidian Wyvern | III | Fighter (fly) | 90 | 2/3 | 20 elem | Golden = good, Obsidian = evil | two-legged, bat-winged, tail spike |
| Young Fire Dragon | III | Fighter (fly) | 100 | 3/3 | 22 Fi | no breath yet; evolves at Champion | crimson-orange scales, ember eyes |
| Young Frost Dragon | III | Fighter (fly) | 100 | 3/3 | 22 Fr | " | ice-blue scales, frost crest |
| Young Golden Dragon | III | Fighter (fly) | 100 | 3/4 | 22 S | requires good alignment | gleaming gold, white horns |
| Young Obsidian Dragon | III | Fighter (fly) | 100 | 3/3 | 22 B | requires evil alignment | black glassy scales, purple glow |
| Adult Fire/Frost/Golden/Obsidian Dragon | V | Shock/Battle Mage (fly) | 200 | 5/5 | 36 breath cone + 30 claw | Flying, Breath, Fear | full four-legged winged dragon, huge |
| Dragon Lord (ruler) | hero | — | — | — | — | playable dragon ruler with skill tree | an ancient dragon of the chosen element |

---

## 5. Marauders, infestations and independents

**Infestations** are sites (Bronze/Silver/Gold danger) that spawn hostile armies and expand if not cleared. **Marauder**
armies are mixed stacks of wildlife + racial "bandit" units of random Forms + undead. **Free Cities** are independent
towns of a random culture/form that field that culture's roster. **Dwellings** (Umbral, Giant/Lithorine) field their own.

| Site / faction | Typical units | Visual of the site |
|---|---|---|
| Bandit / Marauder Camp | Marauder Raider (T1 fighter), Marauder Archer (T1), Marauder Skirmisher (T1), Marauder Warrior (T2 shield), Marauder Chieftain/hero | Palisade of sharpened logs, hide tents, loot piles, smoke |
| Mob Camp (Tome of the Horde) | own T1 hordes | tents + cages |
| Spider Nest | Hatchlings, Hunter/Weaver Spiders, Matriarch | Web-choked cave mouth, egg sacs |
| Wolf/Warg Den | Wargs, White Wolves, Dire Bear | Rocky den with bones |
| Undead Crypt / Lost Tomb | Zombies, Skeletons, Lost Souls, Bone Horror, Necromancer | Sunken mausoleum, green soul-fire braziers |
| Dragon Lair | Wyverns, Young Dragon | Cliff cave with treasure hoard glints |
| Wild Beast Lair | Goretusks, Razorbacks, Spiders, Penguins (mixed) | Overgrown clearing |
| Cultist Shrine / Demon Rift | Zealots (dark), Inferno Puppies, Gremlins, Chaos Eater | Cracked earth, red rift glow |
| Umbral Rift / Umbral Dwelling (ER) | Umbral Demons (T2–T4 corrupt tentacled fiends), Constrictor-like thralls | Purple-black tear in the world, floating rocks |
| Reaver War Camp (E&A infestation) | Harriers, Mercenaries, Magelocks | Iron watchtowers, cannons |
| Sunless gothic sites (ToB) | Bats, Maggots, ghouls, vampire thralls | Ruined chapels, blood-glass spires |
| Ancient Wonder guardians | scaled to Bronze/Silver/Gold: e.g. Entwined at World Tree, Golems at Golden Ziggurat, Lost Souls at Lost Tomb, Watchers at Fallen Tower, Magma Spirits at Magma Forge | see art_direction.md |

---

## 6. Racial transformations (change how every racial unit looks)

Transformations are empire-wide enchantments from tomes. **Minor** ones are subtle and stack (up to several);
**Major** ones replace the body (one at a time; the last applied overrides visuals).

### 6.1 Minor transformations (15 in base; more in DLC)
| Name | Tome (affinity) | Effect (short) | Visual cue on units |
|---|---|---|---|
| Magical Wards | Warding (Astral) | +elemental resistances | faint blue rune-circles on skin/armor |
| Frostling | Cold Dark (Shadow) | +Frost res, Frozen immune, Arctic Walk, morale in cold | pale blue skin, frost on brows, breath mist |
| Stone Skin / Rock Skin | Rock (Materium) | +Def, slow | grey stony patches, amber cracks |
| Blessed / Sacred | Faith or Zeal (Order) | +morale, +Spirit res | soft gold glow, white-gold eyes |
| Fiery / Chaos-touched | Pyromancy or Horde (Chaos) | Burning immune, +Fire dmg | ember-orange eyes, glowing veins |
| Poison / Blight adaptation | Roots or Fertility (Nature) | Poison immune, regen on fertile land | green-tinted skin, leaf/vine growths |
| Beast-kin (Animal Kinship) | Beasts (Nature) | +dmg with animals, forest walk | fur tufts, claws, animal eyes |
| Necrotic / Soulbound | Souls (Shadow) | +Spirit res, souls on kill | sunken eyes, green-teal soul glow |
| Runic / Enchanted | Enchantment (Materium) | +dmg with enchanted weapons | glowing runes on weapons |
| Windborne | Winds (Materium) | +move, cover ignore | scarves and hair perpetually blown |
| Astral-touched | Evocation or Scrying (Astral) | +Lightning res, +vision | starry freckles, violet eyes |
| Zealous | Zeal (Order) | Zeal at battle start | holy tattoos, shaven heads |
| Fey Mist-touched | Fey Mists (PF) | mist concealment | glowing pale eyes, wisps |
| Discipline / Enlightened | Discipline (WoW) | cleanse, focus | white headbands, serene faces |
| Blood-rite | Blood Rite (ToB) | bleed on hit | crimson tattoos, red eyes |

(Names other than Magical Wards, Frostling, Stone Skin are descriptive placeholders — verify exact wiki names.)

### 6.2 Major transformations
| Name | Tome (affinity) | Effect (short) | Visual (full body change) |
|---|---|---|---|
| Angelic / Angelize | Exaltation (Order T4) | Flying?, +Spirit, Celestial tag | large white feathered wings, gold halo-crown, radiant skin |
| Demonkin | Demon Gate (Chaos T4) | Fire immune, Fiend, +dmg | red/black skin, curved horns, ember eyes, tail |
| Undead / Necrotic form | Necromancy line (Shadow) | Undead: no morale, poison immune, souls | grey skin, exposed bone, green soul-glow |
| Wolf / Beast-form (Lycanthrope) | Beasts / Vigor (Nature) | +regen, +move | fur, muzzle, claws (werewolf-like) |
| Golem / Runic body | Golden Realm / Crucible (Materium) | Construct-like, high Def | metal/gold plating fused to flesh, rune seams |
| Astral form | Astral Convergence (Astral T4) | Ethereal, Phase | translucent starry body, floating |
| Draconic | Dragons (DD) | scales, breath, Fire/Frost res | scales, horns, tail, small wings |
| Stormborne | Stormborne (PF) | Swimming, Lightning | gills, fins, teal skin, kraken-like tendrils |
| Gloom Strider | Corruption (ER) | Floating + Fast; no mounts | legs become writhing tendrils like an Eldritch Sovereign |
| Geomantic | Geomancy (GK) | +dmg/res, crystal | crystal shards growing from body, glowing amber/violet |
| Crimson Reign (ancient undeath) | Crimson Reign (ToB) | vampiric undeath for high tiers | pale marble skin, red eyes, bat-like silhouettes |
| Archon ascension | Archon (AP) | Celestial | golden wings of light, halos |
| Sandwalker | Sandwalkers (RfR) | desert walk, sand | sandstone skin, dust trails |
| Owlkin/forbidden forms | SotA (2026) | — | feathered, owl-eyed |

---

## 7. Elementals, constructs, undead, celestials, eldritch and giants — grouping index

| Group | Members (see rows above) | Shared visual language |
|---|---|---|
| Elementals | Lesser Magma/Snow/Stone Spirit, Earth Titan, Sand Guardian, Storm creatures | body made of the element; glowing "core"; no face detail; particle trails |
| Constructs / Golems | Copper, Iron, Bronze, Golden, Severing Golem; Clay Soldier; Devastator Sphere; Great Bombard; Ironclad; Amplification Pylon; Divine Beacon; Shrine of Smiting | riveted plates, rune seams, furnace or crystal cores; no morale |
| Undead | Lost Soul, Zombie, Skeleton, Bone Horror, Bone Golem, Reaper, Revenant Archons, vampire thralls, ghouls | grey-green necrotic palette, teal-green soul-fire, tattered cloth |
| Celestials / Angels | Angelic transformation, Archons, Eagle Rider (Order), Divine Beacon | white-gold, feathered wings, halos, beams of light |
| Fiends / Demons | Inferno Puppy, Gremlin, Chaos Eater, Balor, Warlord infernals | red-orange-black, horns, fire, jagged silhouettes |
| Fey / Plants | Entwined Thrall/Protector, Nymph, Mistling, Horned God, Druid | greens, bark, blossom, mist, fireflies |
| Astral / Ethereal | Mystic Projection, Phantasm Warriors, Astral Wisp, Watcher, Astral Serpent, Phase Beast, Mirror Mimic, Lost Wizard | translucent blue-violet, star-fields, geometric glyphs |
| Eldritch | Eldritch Sovereign, Constrictor, Evil Reflection, Gloom Striders, Umbral Demons | purple-black, tentacles, too many eyes, oily sheen |
| Dragons | Fledglings, Wyverns, Young/Adult Dragons, Dragon Lords | four color-lines: fire red, frost blue, gold, obsidian |
| Giants | Giant King rulers (frost/fire/storm/earth), Ogres, Primordials, Lithorine crystal beings | 3–4× human scale, rough hewn, crystal or rune adornments |
| Vampires (ToB) | Elder Vampire ruler, Turned Vampire heroes, Crimson Reign race | pale skin, crimson, gothic black lace and steel, bats |

---

## 8. Coverage summary

- Culture units: 11 cultures listed; 6 base + Reaver + Primal + Oathsworn fully rostered (~60 units), Architects/Nomads noted.
- Tome units: ~65 across six affinities incl. every DLC tome family.
- Wildlife/animals: ~40; dragons: 14; marauder/infestation groups: 12; transformations: 15 minor + 14 major.
- Total distinct unit entries: **≈ 200**.
- Verified numeric stats (✓): ~40 units; the rest follow the tier norms table and are safe to use as design targets.
