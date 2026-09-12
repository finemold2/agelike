# Art & Audio Direction Bible — "in the spirit of Age of Wonders 4"

Written for an artist and a composer/sound designer who will **never see the original game**. It describes what
*Age of Wonders 4* (Triumph Studios, 2023–2026) looks and sounds like, then translates it into concrete, painterly,
hand-drawable targets with palette hex codes. Where the original is 3D, the notes say how to get the same *read* in
2D painted art.

Triumph's own stated art philosophy (Dev Diary #11 "The Art of AoW4"): a **vibrant, welcoming fantasy world** whose
first rule is **clarity** — every hex must be readable at a glance, units must pop off the terrain, iconography must be
unambiguous. The team explicitly fixed the "washed-out, muddy" look of their previous game by giving each element a
distinct light/dark value grouping so the interface and the units "really pop." Textures are hand-authored tileables
(Photoshop / Substance Designer) assembled from modular building blocks — which is why a painted, tile-based 2D remake is
a natural fit.

---

## 1. Overall look in one paragraph

Think **illuminated storybook meets tabletop diorama**: a bright, sun-lit, saturated world seen from a raised
three-quarter camera; chunky, readable silhouettes; hand-painted-looking surfaces with visible brush texture in the
mid-tones and crisp, darker edge lines on the important shapes; soft bounced light; hardly any pure black except in
the deepest shadows of the underground and Shadow-affinity effects. Fantasy "high" not "grimdark" — even the evil
factions are jewel-toned (plum, crimson, teal soul-fire) rather than grey. Everything magical glows in **its affinity
color** so a player can read who cast what from across the map.

Stylization dial (0 = photoreal, 10 = cartoon): **terrain 5, buildings 5, units 4, UI 7, event illustrations 6**.
Proportions are close to realistic (heads ~1/7 body) but armor, weapons and heads are ~15% chunkier than life so they
read at 40 px tall on screen.

---

## 2. The world map

### 2.1 Structure
- Hex grid. Provinces are clusters of ~7 hexes with one feature hex in the middle. Borders of owned provinces are drawn as
  a thin ribbon in the owner's color with a faint inner glow; unowned land has no border.
- Two layers: **Surface** and **Underground** (a separate cavern map reached by cave entrances). DLC adds the
  **Umbral Abyss** (Eldritch Realms), **Sunless Lands** (Thrones of Blood), **Astral Barrens** (Rise from Ruin), **Dungeon**
  provinces (Giant Kings).
- Camera: perspective, default pitch ≈ 50°, yaw rotatable, zoom from "count the rivets" to "whole continent"; at far zoom
  the 3D map fades toward a flatter, more map-like read with bigger icons. For a 2D game: draw tiles at a fixed ~55°
  isometric-ish pitch with 2 zoom levels of art (detailed / simplified icon).

### 2.2 Biomes — how each reads, and a palette
Every biome has a base ground, a "fertile" overlay (fields/flowers), a forest variant, a hill/mountain variant, water and a
road. Keep ground textures low-contrast and mid-value so units (higher contrast) sit on top.

| Biome | What you see | Ground base | Ground light | Forest canopy | Rock/mountain | Water | Accent |
|---|---|---|---|---|---|---|---|
| Temperate grassland | rolling meadows, hedgerows, scattered oaks, wildflowers, wheat fields near cities | `#6E9B3E` | `#9CC25A` | `#2F6B34` | `#8A8578` | `#3F8FC4` | poppies `#D9483B` |
| Temperate forest | dense broadleaf canopies with visible individual tree tops, mossy floor | `#4F7A34` | `#7FA84C` | `#245C2C` | `#6F6A5E` | `#3A86B8` | fern `#5FA36B` |
| Tundra / Arctic | snowfields, frozen lakes with blue ice cracks, dark pines, exposed grey rock, aurora hints at far north | `#DDE6EC` | `#F5F8FA` | `#28453A` | `#7A8590` | `#7FB5D6` (ice) | ice-crack `#A6D8F0` |
| Desert / Dunes | orange-gold dunes, cracked salt flats, mesas, palms only at oases | `#D9A85C` | `#F0CB85` | `#6E8C3E` (oasis) | `#B7773C` | `#3AA3B0` (oasis) | red rock `#B5502F` |
| Volcanic / Ashlands | black basalt, ash plains, lava rivers, red-lit smoke, obsidian spikes | `#3B3535` | `#5A4E4A` | `#3D2F2A` (charred) | `#2A2424` | lava `#FF6A1F` | ember `#FFB347` |
| Wetlands / Swamp | still dark water, reeds, cypress, mist, fireflies | `#556B3A` | `#7C8C4A` | `#3B5A34` | `#5E5F52` | `#3F5A4C` | bog-light `#B8E986` |
| Underground | cavern floor of dark stone, luminous fungi, crystal clusters, stalagmites, lava pockets, ceiling is inky dark | `#2E2A33` | `#4A4452` | fungus `#7C4FA8` | `#3A3540` | `#2E5F8A` | crystal `#6FD3FF` |
| Umbral Abyss (DLC) | corrupted purple-black land, floating shards, tentacle-flora, bruised sky | `#2B1E3A` | `#4A3161` | `#3A2350` | `#231A2E` | `#5B2E8C` | eye-glow `#D23AFF` |
| Sunless Lands (DLC) | eternal dusk, blue-grey, gothic ruins, red "Blood Glass" crystal outcrops, bats | `#3A4250` | `#59667A` | `#2C3A38` | `#4B505C` | `#2E4B66` | blood glass `#C21E3A` |
| Astral Barrens (DLC) | bleached, cracked, mana-drained; pale lilac dust, dead white trees, broken arcane pylons | `#B9B0C4` | `#D9D3E0` | `#8E8A9A` | `#7E7887` | `#9CB7D6` | leak `#7A5CFF` |
| Fey / Verdant (Nature terraform) | hyper-lush, oversized flowers, glowing mushrooms, mist | `#5FA84A` | `#9BE07A` | `#2F7A40` | `#7E8A70` | `#4FB7C9` | blossom `#F28AC8` |

Rules of thumb
- Water: always brighter and more saturated than the land around it; foam line at shores; rivers are a 1-hex-wide ribbon
  with visible flow highlights, crossable at fords/bridges.
- Mountains: impassable, drawn as a cluster of 2–3 peaks with snow caps above ~60% height; hills are rounded lumps.
- Forests: draw the **tops of trees** as a texture of overlapping blobs with a darker underside — never single trees.
- Roads: inside a domain, pale cobbles `#C9B99A` with dark edge; outside, a dirt track `#A98A5B`. Roads follow hex
  centers.
- Magic materials / special resources (draw as a glowing outcrop on the hex): gold vein (yellow nuggets), mana crystals
  (blue-violet shards), iron/mithril (silver-grey), gems, ancient bones, and DLC Blood Glass (red). Glow in the matching
  affinity color.
- Terraforming: affinity spells recolor whole provinces — Nature → Fey/Verdant, Shadow → Arctic, Chaos → Volcanic,
  Materium → mountains/ore, Order → tidy farmland, Astral → shimmering "astral meadows" (pale blue grass, floating motes).

### 2.3 Ancient Wonders (landmark set-pieces)
Ancient Wonders are large, hand-placed structures occupying a feature hex, guarded by a themed army, and graded
**Bronze / Silver / Gold** (a small medallion icon over them). Names are randomized in-game; the ten base *types* and the
common fan/game-design names the requester used are mapped below.

| Wonder type (game) | Requester's name | Look | Guardians | Affinity glow |
|---|---|---|---|---|
| Golden Ziggurat (Vault of Transmutation / Artificer's Altar / Temple of Constructs) | Golden Ruins | Stepped gold-topped pyramid of sandstone, brass doors, golem statues, sun-glare | Copper/Iron/Golden Golems | Materium amber |
| Lost Tomb | Cursed Pyramid | Sunken black pyramid / mausoleum, cracked steps, green soul-braziers, skull reliefs | Lost Souls, Skeletons, Bone Horror, Necromancer | Shadow green-teal |
| Fallen / Lost Tower | Wizard Tower | Tall broken wizard's tower, floating masonry, crystal spikes, a rift of blue light at the top | Watchers, Astral Serpents, Phantasms | Astral blue |
| Secret Temple | — | Overgrown temple desecrated by cultists, red rift in the courtyard | Zealots/cultists, Inferno Puppies, a demon | Chaos red |
| World Tree / Mother Tree | — | Colossal tree, roots as walls, glowing sap, vine bridges | Entwined Thralls & Protectors | Nature green |
| Magma Forge | — | Dwarven-looking forge built into a lava vent, chains, giant anvil | Magma Spirits, Golems | Chaos orange / Materium |
| Hidden Wellspring | — | A spring in a grotto, glowing water, mossy statues | Nymphs, animals | Nature/Astral cyan |
| Ancient Colosseum / Arena | — | Ring of broken stands, banners, sand floor | mixed champions, Ogres | Order gold |
| Dragon Lair | — | Mountain cave with bones and hoard glitter | Wyverns, Young Dragon | element color |
| Sunken / Coral ruins | — | Half-drowned temple, coral, kelp | Stormborne beasts, serpents | Astral teal |
| DLC: Umbral Rifts, gothic Vampire crypts (ToB), Giant Kings' hand-crafted giant halls, Rings of Emnora (Archon) | — | scaled-up, more ornate, unique guardians | see unit_catalog §5 | — |

Draw every wonder **2–3 hexes tall** in silhouette so it towers over cities, and give it one strong glowing focal point.

### 2.4 Free Cities & Dwellings
Independent towns look like a small city of a random culture (see §2.5) with a neutral grey-white banner. Dwellings
(Umbral Dwelling; Giant/Lithorine dwellings) look alien: purple tentacle-hive; crystal-hewn giant hall.

### 2.5 Cities — by culture and size
A city sits on one hex and grows in footprint and height with its Town Hall level:
**Outpost** (a tower + palisade) → **Town** (a few houses, wooden wall) → **City** (stone wall, market, temple) →
**Metropolis** (double walls, a great hall/keep, towers, banners everywhere). Draw them as stacked-diorama clusters with
the keep at the back so the player can read size at a glance. City walls appear once built and matter for sieges.

| Culture | Architecture | Materials | Roofs / accents | Banner base color | Landmark building |
|---|---|---|---|---|---|
| Feudal | European castle town, half-timbered houses, market square, chapel | grey stone, oak timber, thatch | blue slate roofs, blue-white pennants | royal blue `#2D5DA8` | stone keep with round towers |
| High | white marble terraces, domes, tall slender towers, sun disks, reflecting pools | white marble, gold leaf, teal glass | gold domes `#D8B04A`, teal `#3FB3B0` | white/gold `#F2E8C9` | sun-temple with a floating golden ring |
| Barbarian | palisaded camp of longhouses, tents, totem poles, bone arches, fire pits | rough logs, hide, bone | red-ochre paint, skulls | blood red `#A8322A` | great hall with mammoth-tusk gate |
| Dark | gothic spires, black iron, spiked walls, veiled statues, braziers of purple flame | black basalt, wrought iron | plum `#5B2A6E` and crimson trims | black/purple `#3A1F4B` | cathedral-citadel with a great eye/skull |
| Industrious | dwarven-industrial: thick stone, brass fittings, chimneys, waterwheels, cranes, forges glowing | grey granite, brass, copper | oxblood `#7A2E2A`, brass `#C89B3C` | rust-red/bronze `#8C4B2F` | great forge with smokestacks and giant gears |
| Mystic | crystalline spires, floating stones, arcane circles, observatories, blue lanterns | pale blue stone, crystal, silver | violet `#6A4FBF`, cyan glow | midnight blue `#243B6B` | orrery tower with an orbiting crystal |
| Reaver (DLC) | grim iron fortifications, gun towers, cannons on walls, foundries, cages | blackened iron, dark brick | orange muzzle-glow, red-brown | gunmetal/oxblood `#4A2F2A` | dreadnought dock / cannon bastion |
| Primal (DLC) | tribal village bonded to a totem animal, huts of hide and bone, giant animal skull gate | hide, bone, wood, feathers | element color of the animal | earth `#7B5A36` + element | totem effigy of the animal |
| Oathsworn (DLC) | East-Asian-inspired: tiered pagoda roofs, lacquered gates, banners, stone lanterns, courtyards | lacquered wood, white plaster, jade tile | red-black (Strife), white-gold (Righteousness), jade (Harmony) | per Oath | oath-shrine with a great bell |
| Architects (DLC) | monumental: obelisks, colossal affinity-dedicated monuments, geometric plazas | white stone, bronze | affinity color of dedication | ivory/bronze | the Monument (huge, affinity-colored) |
| Nomads (DLC) | tents, yurts, caravan wagons, palisade-on-wheels; the whole city can pack up | canvas, rope, sand-brick | indigo `#3A4E8C`, terracotta | sand/indigo | great caravan wagon-palace |

Province improvements (small, on the feature hex): Farm (yellow fields + windmill), Quarry (cut-stone pit), Mine (timbered
entrance + ore carts), Forester (log piles, sawmill), Fishery (dock + nets), Conduit / Research post (small tower with a
crystal), Outpost (watchtower + palisade), Special: Ancient Wonder integrated, magic-material extractor (crystal drill).

### 2.6 Fog of war
- **Unexplored**: dark desaturated blue-grey "storm cloud" layer `#1E2430` with faint parchment-map contours; nothing drawn.
- **Explored, not currently seen**: the terrain remains but is dimmed and desaturated (~60% value, −40% sat), no units,
  last-known city state.
- **Visible**: full color. Vision edges are soft (2-hex feather), not hard lines.

### 2.7 Units, stacks, heroes and flags on the map
- A stack (up to 6 units) is drawn as **one representative figure** (the strongest / the hero) with a **banner pole** floating
  above: a pennant in the owner's color bearing the faction crest, and **six small shield pips** that fill to show the
  number of units. Stacks that can still move show a small green "move" chevron.
- Heroes are drawn larger (1.25×) with an extra flag and a portrait ring; the ruler has a crown over the banner.
- Racial units carry the culture's armor kit on the faction's Form; mounted units are shown on the mount.
- Selection: a glowing ring in player color under the figure; reachable hexes tinted green, one-more-turn yellow,
  unreachable none; the path is a dotted line with turn-count numbers.
- Player colors (pick 8, keep them separable from terrain): blue `#2F6FD6`, red `#D33B3B`, gold `#E0B23A`,
  green `#3AA64A`, purple `#8A46C7`, teal `#2FB5B5`, orange `#E77A2B`, white/silver `#E8E8EC`.

---

## 3. The tactical battle map

- Auto-generated from the world hex and its neighbors: the same biome ground, scattered obstacles (tree clumps, boulders,
  ruined walls, fences, crates in camps), a few elevated ledges, and — for sieges — the city wall line with towers and a
  gate. Wall segments have HP and crumble into rubble; gates splinter. Siege engines (rams, trebuchets, magelock cannons)
  stand in the attacker's deployment zone.
- Hex size on screen ≈ 1.4× a T1 figure's height at default zoom. Small units are **squads of 3–7 figures** standing in a
  loose triangle (e.g. Warriors 6, Harriers 7, Magelocks 3); Large units are one model filling the hex; T5 Colossals
  overhang it.
- Ground decoration is lower-contrast than on the world map; a subtle hex outline (10% white) appears on hover.
- Day / night: night battles are lit blue-violet with orange torch pools (Dark culture units get bonuses at night);
  underground battles are dark with crystal light; volcanic maps have red under-light and drifting embers.
- Feedback language: white damage numbers, orange crits with a screen shake, green heals, purple/blue for magic, morale
  arrows, status icons above heads. Attack arcs drawn as red wedges; retaliation as a small crossed-swords icon.

---

## 4. Units — how to draw them so they "read"

1. **Silhouette first**: each class has a shape word — Shield = *wall*, Polearm = *tall vertical line*, Shock = *forward
   lean / mount*, Skirmisher = *light, asymmetrical*, Ranged = *bow line*, Battle Mage = *raised hands + glow*, Support =
   *staff/banner/relic*, Scout = *mounted & light*.
2. **Culture kit, faction Form**: the armor set is the culture's; the body is the faction's chosen Form
   (Human, Elf, Dwarf, Halfling, Orc, Goblin, Toadkin, Ratkin, Molekin, Lizardfolk, Tigran, Owlkin, Harefolk …). Keep
   the kit's palette stable so a "Feudal Knight" is recognizably the same unit whether it is an Orc or a Halfling.
3. **Tier = ornament + scale**: T1 plain leather and cloth; T2 adds metal and a crest; T3 full plate/heavy ornament, a
   cloak; T4 mythic proportions and glow; T5 huge, with its own light source.
4. **Affinity glow**: any magical part (weapon enchantment, transformation, summoned body) glows in the affinity color
   (see §6).
5. **Racial transformations** repaint the Form: minor = skin tint / eye glow / small growths; major = wings, horns, bark,
   crystal, tendril legs, undeath.
6. Keep 3 value groups per unit (dark base, mid armor, light accent) and 1 saturated accent (banner, gem, glow).

---

## 5. The UI

Verified style notes: dark panels with gold ornament, parchment tooltips, hexagonal unit icons, layered tooltips
(the original is admitted to be "a bit cluttered" — the remake should keep the look but reduce nesting).

| Element | Look | Hex |
|---|---|---|
| Main panels | dark charcoal-navy, 90% opaque, subtle leather/stone texture, 1-px gold bevel + corner filigree | panel `#1C2130`, panel-2 `#252C3D`, edge `#C9A24A`, edge-dark `#7A5E23` |
| Top resource bar | one long dark strip with icon + number pairs | text `#F0E6CF`, positive `#8FD16A`, negative `#E4573D` |
| Tooltips | warm parchment with a burned edge, dark brown serif text, small icons inline | parchment `#EFE3C4`, parchment-shadow `#CDBB93`, ink `#2E2418`, header `#7A2E2A` |
| Buttons | dark plate with gold edge; hover brightens the gold; primary "End Turn" is a large hex-shaped button bottom-right | button `#2E3548`, hover `#3C4661`, gold `#E2B84C` |
| Unit icons | hexagonal portrait frames; frame color = tier (I bronze `#A87342`, II silver `#BFC3CA`, III gold `#E2B84C`, IV violet `#8A5CD6`, V red-gold `#E36B2B`) | — |
| Rank chevrons | small gold chevrons under the icon | `#E2B84C` |
| Affinity icons | Order: sun/scales in gold-white; Chaos: flame in red-orange; Nature: leaf/tree in green; Materium: hammer/anvil/gear in amber; Astral: star/eye in blue-violet; Shadow: crescent/skull in purple-black | see §6 |
| Resource icons | Gold = stack of coins `#F2C94C`; Mana = blue crystal `#5AA9FF`; Knowledge = open book/scroll `#B48CFF`; Imperium = crown `#E0A83C` on purple; Food = wheat sheaf `#D9B34A`; Production = hammer/gear `#C97B3A`; Draft = crossed sword & shield `#9AA3B5`; War Spoils (Reaver) = chest `#B5652C`; Souls = teal wisp `#4FD8C8`; Fury = red claw `#E24B3B`; Devotion = jade seal `#4FB08C`; Blood = drop `#C21E3A` | — |
| Map overlays | province borders in player color; hex highlights green `#6ED35F` / yellow `#F2D35B` / red `#E4573D` | — |
| Event popups | painted 2D illustration (storybook style, painterly, warm) above parchment text with 2–3 choice buttons | — |
| Diplomacy | ruler portrait (bust, painted), relation meter from red to green, stance badges | — |
| Fonts | headers: a humanist serif with slight calligraphic flair (e.g. Cinzel / Alegreya SC feel); body: readable serif (Alegreya / Crimson); numbers: tabular | — |

### 5.1 Tome (book) covers
The research screen is a library. Each tome is a **hardbound book seen from the front**:
- Leather cover in the affinity color, with a lighter tooled border and metal corner caps (bronze T1 → gold T5).
- A central emblem in a cartouche: e.g. Pyromancy = flame; Roots = tree-of-roots; Souls = a wisp/skull; Warding = shield rune;
  Winds = spiral; Dragons = dragon head; Tentacle = a curl of tentacle; Blood Rite = a chalice drop.
- Tier shown by **gems on the spine / roman numerals**: I one gem … V five gems and a glowing sigil.
- Dual-affinity DLC tomes split the cover diagonally in both colors.
- Unresearched tomes are dimmed with a clasp; the currently-read tome lies open with parchment pages listing spells,
  each with a small hex icon.

### 5.2 Affinity palette (the single most important table)
| Affinity | Core | Light | Dark | Glow / VFX | Mood words |
|---|---|---|---|---|---|
| Order | gold `#D9A93A` | white-cream `#F6EFD8` | bronze-brown `#7A5A1E` | radiant white-gold `#FFF1B8` | holy, lawful, sunlit |
| Chaos | red `#C7341F` | orange `#F0742A` | ember-black `#3A1C14` | fire `#FF8C1A` / rift red `#FF2E2E` | wild, fiery, mob |
| Nature | green `#3E9A3C` | leaf `#8CD46B` | moss-brown `#2F5A24` | spore-green `#B8FF7A` | growth, beasts, cycles |
| Materium | amber `#C98B2C` | sand `#E8C889` | earth-brown `#5C3F1D` | rune-amber `#FFC65A` | stone, forge, golems |
| Astral | blue `#3E6FE0` | cyan `#7FD8FF` | indigo `#232B6E` | violet-white lightning `#B69CFF` | arcane, stars, portals |
| Shadow | purple `#6B2F8C` | lilac `#B48CD6` | near-black `#1A1022` | soul-fire teal-green `#5FE6C0` and frost `#BFE9FF` | death, cold, secrets |

### 5.3 Culture badge colors (for banners/UI chips)
Feudal `#2D5DA8` · High `#E9D9A6` · Barbarian `#A8322A` · Dark `#3A1F4B` · Industrious `#8C4B2F` · Mystic `#243B6B` ·
Reaver `#4A2F2A` · Primal `#7B5A36` · Oathsworn `#9C1F2E`/`#F0E4C8`/`#4FB08C` · Architects `#D8CDB4` · Nomads `#3A4E8C`.

---

## 6. Spell & ability VFX language

| Affinity | Shapes | Motion | Particles | Sound pairing |
|---|---|---|---|---|
| Order | vertical pillars of light, halos, rune circles of gold, feathers | rising, slow, stately | soft gold sparks, white feathers | choir swell, bell chime |
| Chaos | explosions, jagged cracks, flame tongues, red rifts | fast, bursting, shaking | embers, black smoke | whoosh-boom, crackling, guttural roar |
| Nature | vines erupting, leaf spirals, blossoms, roots | organic, curling, breathing | pollen, fireflies, petals | rustle, wooden creak, bird chirrup, soft chime |
| Materium | stone slabs, metal shards, amber glyph rings, dust | heavy, snapping into place | dust, sparks from an anvil | anvil ring, stone grind, deep thud |
| Astral | geometric arcane circles, lightning arcs, star-fields, teleport rings | precise, flickering, instantaneous | blue-white sparks, star motes | electric zap, crystalline shimmer, reverse-whoosh for teleports |
| Shadow | wisps, skulls, frost spikes, black tendrils, soul-fire | drifting, creeping, sudden freeze | teal soul-flames, ice crystals, ink | whisper, wail, frost crack, low drone |

Summons arrive through an affinity-colored ring on the ground; enchantments leave a persistent thin glow on the weapon or
armor; transformations play a whole-body shimmer in the affinity color.

---

## 7. Lighting, camera and rendering targets for painted 2D

- Key light: warm sun from upper-left (≈ 35° elevation), fill from sky-blue; cast shadows short and soft
  (blur 6–10 px at 1080p). Underground: cold blue crystal key with warm lava rim-light.
- Colors: mid-saturation base, saturated accents; avoid pure black/white in scenery; use them only in UI and glows.
- Atmosphere: a very light warm haze toward the far edge of the map; god-rays only in event illustrations.
- Brushwork: visible strokes in mid-tones, clean edges on silhouettes; a 1-px darker "ink" line on units and buildings,
  none on ground textures.
- Every asset gets a 2-value **icon variant** (far zoom) with a bolder outline.

---

## 8. Sound design

### 8.1 World map ambience (loopable beds, 60–90 s, cross-fade by biome under the camera)
| Biome | Bed | Sweeteners (random, sparse) |
|---|---|---|
| Temperate | light breeze, distant birdsong, leaves | cow-bell, wood chopping near cities, church bell (Feudal) |
| Forest | denser birds, woodpecker, creaking wood | owl at night, stag call |
| Arctic | howling wind, ice creak, muffled snow | wolf howl, aurora "shimmer" tone |
| Desert | dry wind, sand hiss, insect buzz | hawk cry, distant drum |
| Volcanic | low rumble, lava bubbling, crackle | rock fall, hiss of steam |
| Swamp | frogs, dripping, insects | bittern boom, splash |
| Underground | deep drone, water drips, echoing pebbles | crystal ring, distant rumble |
| Umbral / Sunless | dissonant whispering pad, heartbeat-slow throb | wet tentacle slither, bat flutter |
| Cities | market murmur, hammering, children, bells (High: chimes; Industrious: forge hammers; Dark: chanting; Mystic: crystalline hum; Barbarian: drums) | — |

### 8.2 Unit responses
Short, non-verbal or one-word barks (the original keeps them brief): a select grunt/"Hm?", a move acknowledgment, an
attack shout, a death cry — recorded per **Form** (gruff for Orcs, chittering for Ratkin, croaks for Toadkin, hoots for
Owlkin) with metal/leather foley of the culture kit. Animals use real-animal libraries pitched down 10%. Constructs =
servo/stone grind; undead = rattle + moan; ethereal = reversed reverb whisper; dragons = big brass-like roar.

### 8.3 Combat hits
- Melee: layered *swing whoosh → impact (metal clang / leather thud / bone crunch by armor type) → small debris*. Crits add a
  high metallic ring and a sub-bass thump.
- Ranged: bow creak + whistle + thunk; crossbow clack; magelock = sharp arcane crack with a bell-like tail; cannon = deep boom
  + rolling echo.
- Spells: see §6 pairings; heals are a rising chime with a "leaf" rustle for Nature or a choir for Order.
- Deaths: unit-type cry + body fall; large units add ground shake; summons "unsummon" with a reversed whoosh.

### 8.4 UI sounds
Soft leathery/wooden taps for clicks (no plastic beeps); parchment slide for tooltips; page-turn + soft harp for opening a
tome; a quiet gold "coin tick" for resource changes; a deep drum + short horn for End Turn; a gentle bell for
notifications; a triumphant 3-note brass fanfare for level-ups and research complete; a low ominous chord for war
declarations.

---

## 9. Music — matching Michiel van den Bos's score with calm classical

**What the original score is.** Van den Bos (who scored the earlier *Age of Wonders* games and *Overlord*) writes
**orchestral music "drenched in synths"** — traditional orchestra (strings, harp, woodwinds, French horn, choir) with
analogue-style synth pads and arpeggios underneath, sometimes subtle, sometimes upfront. Fans praise the *spread of
moods that still feel connected*, and a **Nordic / "Viking-esque" vocalise** (wordless female and male voices) is a
signature. Examples from his own notes: *"Darklands"* — gloomy, atmospheric, percussion-forward; *"A Settlement Rises"* —
breezy, easy-going, a searing melody over a bed of short orchestral notes. Each expansion adds tracks in its theme
(Eldritch Realms: dissonant whispering strings; Giant Kings: heavy brass and drums; Archon Prophecy: five new tracks with
choirs; Thrones of Blood: gothic organ and low choir).

**Functional breakdown to reproduce**
| Layer | Original feel | Calm-classical translation |
|---|---|---|
| Exploration / world map (most of playtime) | slow, wide, hopeful; harp ostinati, strings, a flute or oboe melody, soft synth pad; 60–80 BPM; modal (Dorian, Mixolydian, Lydian for wonder) | string quartet/orchestra + harp + woodwind; keep percussion out; let phrases breathe with long rests |
| Culture themes | each culture has a motif: Feudal = noble horn & strings; High = shimmering high strings & choir; Barbarian = drums, low male chant, bone flutes; Dark = minor-key organ/choir, tritones; Industrious = anvil-like percussion, low brass; Mystic = celesta, glass harmonica, arpeggios; Reaver = snare, brass, industrial hits; Primal = frame drums, throat singing, animal calls; Oathsworn = shakuhachi/koto-like plucks, taiko touches | keep motif, drop the drums, re-voice for strings/piano |
| Tension / enemy nearby | sustained low strings, pulse | cello pedal note, sparse piano |
| Combat | driving percussion, brass stabs, choir, 110–130 BPM | if calm is required: replace drums with pizzicato, keep a steady pulse, brass swells only on crits |
| Victory / city founded | bright brass fanfare, major key | horn + strings chorale |
| Underground / Umbral | drones, reversed textures, whispers | low sustained organ, prepared piano, avoid melody |
| Menus / research | contemplative harp & pad | solo harp or guitar |

**Composer brief in three lines:** Late-Romantic film-fantasy warmth (think Vaughan Williams / Howard Shore pastoral, not
Zimmer), with a faint synthetic shimmer under the orchestra, a wordless voice as the "human" element, and a distinct
five-note motif per affinity that the VFX and UI stings can reuse.

---

## 10. Quick asset checklist (for the fan game)

- 11 biome tilesets × (ground, fertile, forest, hill, mountain, water, road, shore) at 2 zooms.
- 12 wonders + 6 infestation sites + 4 dwellings.
- 11 cultures × 4 city sizes; 8 province improvements; 3 wall states.
- ~200 unit sprites (see unit_catalog.md) with 4 tier frames, 8 player colors via banner tint.
- Affinity VFX kit: 6 × (bolt, AoE, buff ring, summon ring, enchant glow).
- UI kit: panels, hex frames, 12 resource icons, 6 affinity icons, 60 tome covers (6 palettes × 5 tiers × 2 emblems),
  parchment tooltip 9-slice, hex button.
- Audio: 9 ambience beds, ~30 unit voice sets, 40 hit/spell SFX, 12 UI SFX, 6 affinity stings, 11 culture motifs.
