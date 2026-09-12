// src/art/palette.js — shared color palette for biomes, affinities, cultures and UI
(function (AOW) {
  'use strict';
  const Palette = {
    affinity: {
      order: '#e8c357', chaos: '#e0452b', nature: '#5fb043', materium: '#c07a2a', astral: '#5a7ff0', shadow: '#7b3fa0',
    },
    affinityDark: {
      order: '#8a6a1c', chaos: '#7a1e12', nature: '#2c5e1c', materium: '#6a3f12', astral: '#27357a', shadow: '#3a1a52',
    },
    affinityLight: {
      order: '#fff0b8', chaos: '#ffb39e', nature: '#c5f0a8', materium: '#ffd9a8', astral: '#c0ceff', shadow: '#d6b3f0',
    },
    channel: { physical: '#c8c2b4', fire: '#ff7a2a', frost: '#7ad8ff', lightning: '#ffe86a', blight: '#8ad34a', spirit: '#d9c4ff' },
    biome: {
      ocean: ['#123c66', '#1b5a8a'], coast: ['#2f8bb8', '#4fb0d4'], lake: ['#2b6f9c', '#3f95c4'],
      grass: ['#6f9a3c', '#8fb54a'], forest: ['#3f7030', '#5c8f3d'], hills: ['#8c9a4a', '#a9b25e'],
      mountain: ['#7d7a74', '#a39e95'], desert: ['#d6b16a', '#e8cf8f'], snow: ['#dfe7ee', '#f4f8fb'],
      swamp: ['#4b6a3a', '#5f7f47'], volcanic: ['#3d2b2b', '#5a3a30'],
    },
    tree: { leaf: '#3f7a2f', leafLight: '#6faa48', leafDark: '#25501e', pine: '#2f5a33', pineLight: '#4d8451', trunk: '#5a3b23', autumn: '#c8772a', snowLeaf: '#d7e3e8' },
    rock: { base: '#7a746c', light: '#a8a196', dark: '#4c4742', snow: '#eef3f6' },
    water: { deep: '#0f3557', shallow: '#3b95c0', foam: 'rgba(255,255,255,0.75)', river: '#4ea1d4' },
    ui: {
      bg: '#151a26', bg2: '#1e2536', bg3: '#262f45', gold: '#c9a24a', goldLight: '#f1d98a', goldDark: '#8a6a24',
      parchment: '#efe3c6', parchment2: '#e2d1a8', ink: '#2b2116', text: '#e8e2d0', textDim: '#a49c88', accent: '#5a7ff0',
      danger: '#d94b3a', good: '#5fb043', warn: '#e0a72b', border: 'rgba(201,162,74,0.55)',
    },
    resource: { gold: '#f2c94c', mana: '#6ea8ff', knowledge: '#c9a0ff', imperium: '#ffd27a', food: '#9bd35a', production: '#e08a3c', draft: '#e3e3e3', stability: '#7fd4b6', pop: '#f4e2c2' },
    players: ['#3f7fe0', '#d8402f', '#2fa85a', '#e0b83a', '#8f4fd0', '#f07d2c', '#2ab7c8', '#d94fa3'],
    players2: ['#c9d9ff', '#ffd0c8', '#c9f5d3', '#fff2b8', '#e6cdff', '#ffd9bd', '#c6f0f5', '#ffd0ee'],
    skin: { fair: '#e6bf9a', tan: '#c99a70', dark: '#7a5030', pale: '#efe0d0', grey: '#9aa0a8', green: '#6d9a4e', blue: '#6d8fb8', gold: '#d3b07a' },
    metal: { steel: '#b9bec8', steelDark: '#6d7480', gold: '#e8c357', bronze: '#b47a3a', iron: '#5c5f66', silver: '#dfe3ea', obsidian: '#2a2431' },
  };
  Palette.playerColor = i => Palette.players[i % Palette.players.length];
  Palette.playerColor2 = i => Palette.players2[i % Palette.players2.length];
  AOW.Palette = Palette;
})(window.AOW = window.AOW || {});
