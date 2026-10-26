import Phaser from 'phaser';
import { ART_KEYS } from '../data/level1';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    ART_KEYS.forEach((k) => this.load.image(k, `/art/${k}.png`));
  }

  create() {
    this.scene.start('level1');
  }
}
