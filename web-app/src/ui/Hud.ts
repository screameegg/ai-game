import Phaser from 'phaser';
import { VIEW_W } from '../data/level1';

export class Hud {
  private counter: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  readonly winPanel: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    scene.add
      .rectangle(VIEW_W / 2, 28, VIEW_W - 16, 44, 0x0a100c, 0.72)
      .setStrokeStyle(1, 0x3a4a3a, 0.8)
      .setScrollFactor(0)
      .setDepth(200);
    this.counter = scene.add
      .text(18, 16, '魔力珠 0/3', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '16px',
        color: '#fff8e0',
      })
      .setScrollFactor(0)
      .setDepth(201);
    this.hint = scene.add
      .text(18, 36, '摇杆移动 · 右下按住冲刺 · 沿箭头取黄珠', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '11px',
        color: '#b8c4b8',
      })
      .setScrollFactor(0)
      .setDepth(201);

    this.winPanel = scene.add.container(VIEW_W / 2, 320).setScrollFactor(0).setDepth(300).setVisible(false);
    const panel = scene.add.image(0, -8, 'hud_panel').setDisplaySize(280, 140);
    const title = scene.add
      .text(0, -32, '试炼完成', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '22px',
        color: '#fff8e8',
      })
      .setOrigin(0.5);
    const sub = scene.add
      .text(0, 0, '三枚魔力珠已归位', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '12px',
        color: '#d8c8a8',
      })
      .setOrigin(0.5);
    const ok = scene.add.image(0, 48, 'hud_ok').setDisplaySize(110, 52).setInteractive({ useHandCursor: true });
    ok.on('pointerdown', () => this.winPanel.setVisible(false));
    const star1 = scene.add.image(-86, -64, 'fx_star').setDisplaySize(36, 36);
    const star2 = scene.add.image(86, -64, 'fx_star').setDisplaySize(36, 36);
    this.winPanel.add([panel, title, sub, ok, star1, star2]);
  }

  setCount(n: number) {
    this.counter.setText(`魔力珠 ${n}/3`);
  }

  setHint(t: string) {
    this.hint.setText(t);
  }
}
