import Phaser from 'phaser';
import { DEADZONE, VIEW_H } from '../data/level1';

export class Joystick {
  dx = 0;
  dy = 0;
  active = false;
  private pointerId = -1;
  private readonly cx: number;
  private readonly cy: number;
  private readonly hitR = 54;
  private readonly knob: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.cx = 68;
    this.cy = VIEW_H - 84;
    scene.add
      .image(this.cx, this.cy, 'hud_joy_base')
      .setScrollFactor(0)
      .setDepth(210)
      .setDisplaySize(100, 100)
      .setAlpha(0.9);
    this.knob = scene.add
      .image(this.cx, this.cy, 'hud_joy_knob')
      .setScrollFactor(0)
      .setDepth(211)
      .setDisplaySize(46, 46);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < VIEW_H * 0.45) return;
      if (p.x > 160) return; // left zone only; right is sprint
      if (Phaser.Math.Distance.Between(p.x, p.y, this.cx, this.cy) <= this.hitR + 28) {
        this.active = true;
        this.pointerId = p.id;
        this.update(p.x, p.y);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.active || p.id !== this.pointerId) return;
      this.update(p.x, p.y);
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (!this.active || p.id !== this.pointerId) return;
      this.active = false;
      this.dx = 0;
      this.dy = 0;
      this.knob.setPosition(this.cx, this.cy);
    };
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
  }

  private update(px: number, py: number) {
    const max = 34;
    let dx = px - this.cx;
    let dy = py - this.cy;
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    let nx = dx / max;
    let ny = dy / max;
    const m = Math.hypot(nx, ny);
    if (m < DEADZONE) {
      nx = 0;
      ny = 0;
    } else {
      const t = (m - DEADZONE) / (1 - DEADZONE);
      nx = (nx / m) * t;
      ny = (ny / m) * t;
    }
    this.dx = nx;
    this.dy = ny;
    this.knob.setPosition(this.cx + dx, this.cy + dy);
  }
}
