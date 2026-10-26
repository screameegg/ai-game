import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './data/level1';
import { BootScene } from './scenes/BootScene';
import { Level1Scene } from './scenes/Level1Scene';

const parent = document.querySelector<HTMLDivElement>('#game')!;

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0e1210',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  fps: { target: 60, forceSetTimeOut: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, Level1Scene],
});
