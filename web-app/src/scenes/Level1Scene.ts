import Phaser from 'phaser';
import {
  buildDirt,
  cell,
  DEADZONE,
  DECOR,
  MAP_H,
  MAP_W,
  ORB_BLUE,
  ORB_RED,
  ORB_YELLOW,
  POND,
  POSTS,
  SPAWN,
  SPEED,
  SPEED_WATER,
  SPRINT_MULT,
  TILE,
  TREES,
  WORLD_H,
  WORLD_W,
} from '../data/level1';
import { Hud } from '../ui/Hud';
import { Joystick } from '../ui/Joystick';
import { SprintButton } from '../ui/SprintButton';

type Facing = 's' | 'w' | 'e' | 'n';

export class Level1Scene extends Phaser.Scene {
  private joy!: Joystick;
  private sprint!: SprintButton;
  private hud!: Hud;
  private player!: Phaser.GameObjects.Image;
  private slime!: Phaser.GameObjects.Image;
  private orbYellow!: Phaser.GameObjects.Image;
  private orbRed!: Phaser.GameObjects.Image;
  private orbBlue!: Phaser.GameObjects.Image;
  private guideArrow!: Phaser.GameObjects.Image;
  private guideDots: Phaser.GameObjects.Image[] = [];
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  private move = { x: 0, y: 0 };
  private facing: Facing = 's';
  private slimeFacing: Facing = 's';
  private got = { yellow: false, red: false, blue: false };
  private count = 0;
  private complete = false;
  private wasInWater = false;
  private slimeFetch = false;
  private blueCarried = false;

  constructor() {
    super('level1');
  }

  create() {
    const dirt = buildDirt();
    const ground = this.make.renderTexture({ x: 0, y: 0, width: WORLD_W, height: WORLD_H }, false);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        ground.draw(dirt.has(`${x},${y}`) ? 'dirt' : 'grass', x * TILE, y * TILE);
      }
    }
    ground.setOrigin(0, 0).setDepth(0);

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = POND.x + Math.cos(a) * (POND.r + 8);
      const y = POND.y + Math.sin(a) * (POND.r + 8);
      this.add
        .image(x, y, a % (Math.PI / 4) < 0.2 ? 'decor_shore' : 'decor_rocks')
        .setOrigin(0.5, 0.85)
        .setDisplaySize(26, 20)
        .setDepth(1);
    }
    this.add.image(POND.x, POND.y, 'pond').setDisplaySize(POND.r * 2.05, POND.r * 2.05).setDepth(2);

    POSTS.forEach((p) => this.add.image(p.x, p.y, 'post').setOrigin(0.5, 1).setDepth(p.y));
    TREES.forEach((t) => this.add.image(t.x, t.y, t.key).setOrigin(0.5, 1).setDepth(t.y));
    DECOR.forEach(([gx, gy, key, sc]) => {
      const p = cell(gx, gy);
      this.add.image(p.x, p.y, key).setOrigin(0.5, 1).setScale(sc).setDepth(p.y);
    });

    this.guideDots = [
      { x: SPAWN.x + 28, y: SPAWN.y - 6 },
      { x: SPAWN.x + 50, y: SPAWN.y - 22 },
      { x: SPAWN.x + 62, y: SPAWN.y - 44 },
      { x: SPAWN.x + 70, y: SPAWN.y - 68 },
    ].map((p, i) => this.add.image(p.x, p.y, 'guide_dot').setDepth(5).setAlpha(0.8 - i * 0.1));

    this.guideArrow = this.add
      .image(SPAWN.x + 34, SPAWN.y - 38, 'guide_arrow')
      .setDisplaySize(48, 28)
      .setDepth(40)
      .setAngle(-50);
    this.tweens.add({
      targets: this.guideArrow,
      y: '-=5',
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.orbYellow = this.add.image(ORB_YELLOW.x, ORB_YELLOW.y, 'orb_yellow').setDisplaySize(32, 32).setDepth(50);
    this.orbRed = this.add.image(ORB_RED.x, ORB_RED.y, 'orb_red').setDisplaySize(32, 32).setDepth(50);
    this.orbBlue = this.add.image(ORB_BLUE.x, ORB_BLUE.y, 'orb_blue').setDisplaySize(32, 32).setDepth(50);
    this.tweens.add({
      targets: [this.orbYellow, this.orbRed, this.orbBlue],
      y: '-=3',
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.player = this.add.image(SPAWN.x, SPAWN.y, 'wizard_s').setOrigin(0.5, 1).setDepth(SPAWN.y);
    this.slime = this.add.image(SPAWN.x - 18, SPAWN.y + 6, 'slime_s').setOrigin(0.5, 1).setDepth(SPAWN.y);

    this.splash = this.add.particles(0, 0, 'guide_dot', {
      speed: { min: 18, max: 48 },
      angle: { min: 220, max: 320 },
      lifespan: 320,
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.65, end: 0 },
      tint: 0x7ec8ff,
      frequency: -1,
      quantity: 8,
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.player, true, 0.18, 0.18);
    cam.setFollowOffset(-40, 30);
    cam.roundPixels = true;

    this.joy = new Joystick(this);
    this.sprint = new SprintButton(this);
    this.hud = new Hud(this);
    this.input.addPointer(2);
  }

  private inPond(x: number, y: number) {
    const dx = x - POND.x;
    const dy = y - POND.y;
    return dx * dx + dy * dy < (POND.r - 16) * (POND.r - 16);
  }

  private collides(x: number, y: number) {
    const rad = 7;
    for (const t of TREES) {
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy < (rad + 8) * (rad + 8)) return true;
    }
    for (const p of POSTS) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy < (rad + 5) * (rad + 5)) return true;
    }
    return false;
  }

  private setFacing(tex: Phaser.GameObjects.Image, next: Facing, prefix: 'wizard' | 'slime', store: 'facing' | 'slimeFacing') {
    if (store === 'facing') {
      if (this.facing === next) return;
      this.facing = next;
    } else {
      if (this.slimeFacing === next) return;
      this.slimeFacing = next;
    }
    tex.setTexture(`${prefix}_${next}`);
  }

  private attract(orb: Phaser.GameObjects.Image, key: 'yellow' | 'red', who: Phaser.GameObjects.Image) {
    if (this.got[key] || !orb.visible) return;
    const dx = who.x - orb.x;
    const dy = who.y - 10 - orb.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 48 && dist > 1) {
      orb.x += dx * 0.14;
      orb.y += dy * 0.14;
    }
    if (dist < 16) this.collect(key, orb);
  }

  private collect(key: 'yellow' | 'red' | 'blue', orb: Phaser.GameObjects.Image) {
    if (this.got[key]) return;
    this.got[key] = true;
    this.count += 1;
    this.hud.setCount(this.count);
    this.tweens.add({
      targets: orb,
      scale: 0,
      alpha: 0,
      duration: 180,
      onComplete: () => orb.setVisible(false),
    });
    const star = this.add.image(orb.x, orb.y, 'fx_star').setDisplaySize(24, 24).setDepth(500);
    this.tweens.add({
      targets: star,
      y: orb.y - 36,
      alpha: 0,
      scale: 1.4,
      duration: 380,
      onComplete: () => star.destroy(),
    });

    if (key === 'yellow') {
      this.guideDots.forEach((d) => d.setVisible(false));
      this.hud.setHint('箭头指向池塘 · 取偏右红珠 · 可按住冲刺');
      this.cameras.main.setFollowOffset(20, -10);
    } else if (key === 'red') {
      this.guideArrow.setVisible(false);
      this.hud.setHint('史莱姆去西浅滩衔蓝珠…');
      this.slimeFetch = true;
    }

    if (this.count >= 3 && !this.complete) {
      this.complete = true;
      this.hud.setHint('试炼完成');
      this.time.delayedCall(280, () => this.hud.winPanel.setVisible(true));
    }
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(0.033, dtMs / 1000);
    this.sprint.tick(dt);

    let mx = 0;
    let my = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) mx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) mx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) my -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) my += 1;
    if (this.joy.active) {
      mx = this.joy.dx;
      my = this.joy.dy;
    }

    const mlen = Math.hypot(mx, my);
    if (mlen > DEADZONE) {
      mx /= mlen;
      my /= mlen;
      this.move.x += (mx - this.move.x) * Math.min(1, dt * 14);
      this.move.y += (my - this.move.y) * Math.min(1, dt * 14);
      if (Math.abs(this.move.x) > Math.abs(this.move.y)) {
        this.setFacing(this.player, this.move.x > 0 ? 'e' : 'w', 'wizard', 'facing');
      } else if (Math.abs(this.move.y) > 0.05) {
        this.setFacing(this.player, this.move.y > 0 ? 's' : 'n', 'wizard', 'facing');
      }
    } else {
      this.move.x *= Math.max(0, 1 - dt * 16);
      this.move.y *= Math.max(0, 1 - dt * 16);
      if (Math.hypot(this.move.x, this.move.y) < 0.02) {
        this.move.x = 0;
        this.move.y = 0;
      }
    }

    const inWater = this.inPond(this.player.x, this.player.y);
    if (inWater && !this.wasInWater) this.splash.emitParticleAt(this.player.x, this.player.y - 4, 8);
    this.wasInWater = inWater;

    const sprinting = this.sprint.canSprint(inWater);
    const base = inWater ? SPEED_WATER : SPEED;
    const spd = base * (sprinting ? SPRINT_MULT : 1) * dt;
    const nx = Phaser.Math.Clamp(this.player.x + this.move.x * spd, 14, WORLD_W - 14);
    const ny = Phaser.Math.Clamp(this.player.y + this.move.y * spd, 14, WORLD_H - 14);
    if (!this.collides(nx, this.player.y)) this.player.x = nx;
    if (!this.collides(this.player.x, ny)) this.player.y = ny;
    this.player.setDepth(this.player.y);

    if (this.got.yellow && !this.got.red && this.guideArrow.visible) {
      this.guideArrow.setPosition(POND.x - 52, POND.y + 8);
      this.guideArrow.setAngle(5);
    }

    this.attract(this.orbYellow, 'yellow', this.player);
    this.attract(this.orbRed, 'red', this.player);

    let followX = this.player.x;
    let followY = this.player.y - 6;
    if (this.slimeFetch && !this.got.blue) {
      if (!this.blueCarried) {
        followX = this.orbBlue.x;
        followY = this.orbBlue.y;
        if (Phaser.Math.Distance.Between(this.slime.x, this.slime.y, this.orbBlue.x, this.orbBlue.y) < 18) {
          this.blueCarried = true;
          this.orbBlue.setVisible(false);
        }
      } else {
        followX = this.player.x;
        followY = this.player.y - 6;
        if (Phaser.Math.Distance.Between(this.slime.x, this.slime.y, this.player.x, this.player.y) < 24) {
          this.collect('blue', this.orbBlue);
        }
      }
    }

    const toX = followX - this.slime.x;
    const toY = followY - this.slime.y;
    const toLen = Math.hypot(toX, toY) || 1;
    const hold = this.slimeFetch && !this.got.blue && !this.blueCarried ? 6 : 26;
    if (toLen > hold) {
      const ss = Math.min((this.slimeFetch && !this.got.blue ? 95 : 100) * dt, toLen - hold * 0.2);
      this.slime.x += (toX / toLen) * ss;
      this.slime.y += (toY / toLen) * ss;
      if (Math.abs(toX) > Math.abs(toY)) this.setFacing(this.slime, toX > 0 ? 'e' : 'w', 'slime', 'slimeFacing');
      else this.setFacing(this.slime, toY > 0 ? 's' : 'n', 'slime', 'slimeFacing');
    }
    this.slime.setDepth(this.slime.y);

    if (this.blueCarried && !this.got.blue) {
      this.orbBlue
        .setVisible(true)
        .setPosition(this.slime.x, this.slime.y - 16)
        .setDepth(this.slime.y + 1)
        .setDisplaySize(20, 20);
    }

    if (this.orbYellow.visible) this.orbYellow.setDepth(this.orbYellow.y);
    if (this.orbRed.visible) this.orbRed.setDepth(this.orbRed.y);
    if (this.orbBlue.visible && !this.blueCarried) this.orbBlue.setDepth(this.orbBlue.y);
  }
}
