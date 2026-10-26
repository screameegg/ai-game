import Phaser from 'phaser';
import { SPRINT_CD, VIEW_H, VIEW_W } from '../data/level1';

/** 右下按住冲刺；无体力；0.2s 短 CD */
export class SprintButton {
  held = false;
  private cd = 0;
  private pointerId = -1;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const x = VIEW_W - 64;
    const y = VIEW_H - 84;
    const bg = scene.add.circle(0, 0, 36, 0x2a5a3a, 0.85).setStrokeStyle(2, 0x8fd4a0, 0.9);
    this.label = scene.add
      .text(0, 0, '冲刺', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '14px',
        color: '#e8ffe8',
      })
      .setOrigin(0.5);
    scene.add.container(x, y, [bg, this.label]).setScrollFactor(0).setDepth(212);
    bg.setInteractive(
      new Phaser.Geom.Circle(0, 0, 40),
      Phaser.Geom.Circle.Contains,
    );

    bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.cd > 0) return;
      this.held = true;
      this.pointerId = p.id;
      bg.setFillStyle(0x3d8a55, 0.95);
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      if (this.held) this.cd = SPRINT_CD;
      this.held = false;
      this.pointerId = -1;
      bg.setFillStyle(0x2a5a3a, 0.85);
    };
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
  }

  tick(dt: number) {
    if (this.cd > 0) this.cd = Math.max(0, this.cd - dt);
  }

  /** 进池时强制不可跑 */
  canSprint(inWater: boolean) {
    return this.held && !inWater && this.cd <= 0;
  }
}
