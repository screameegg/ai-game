(() => {
  const TILE = 32;
  const MAP_W = 22;
  const MAP_H = 18;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  const POND = { x: 15 * TILE + 8, y: 9 * TILE, r: 70 };
  const SPAWN = { x: 3.5 * TILE, y: 11 * TILE };
  const DEADZONE = 0.10;

  // Dirt path: west spawn → bend → south of pond → east shore
  const DIRT = new Set();
  const paint = (cells) => cells.forEach(([x, y]) => {
    DIRT.add(`${x},${y}`);
    DIRT.add(`${x + 1},${y}`);
    DIRT.add(`${x},${y + 1}`);
  });
  paint([
    [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10],
    [7, 9], [8, 9], [9, 9], [10, 9],
    [10, 10], [10, 11], [11, 11], [12, 11], [13, 11],
    [13, 10], [13, 9], [14, 9], [15, 9],
    [9, 8], [9, 7], [10, 7], [11, 7], [12, 7],
  ]);

  const TREES = [
    { x: 5 * TILE, y: 7 * TILE, key: 'tree' },
    { x: 9 * TILE, y: 14 * TILE, key: 'tree2' },
    { x: 12 * TILE, y: 5 * TILE, key: 'tree' },
    { x: 18 * TILE, y: 13 * TILE, key: 'tree2' },
    { x: 4 * TILE, y: 14 * TILE, key: 'tree2' },
    { x: 17 * TILE, y: 4 * TILE, key: 'tree' },
  ];
  const POSTS = [
    { x: 6 * TILE, y: 10.2 * TILE },
    { x: 9 * TILE, y: 9.2 * TILE },
    { x: 12 * TILE, y: 11.2 * TILE },
    { x: 14 * TILE, y: 8 * TILE },
  ];

  // Orbs: yellow shore near tree bend, red in pond, blue deeper pond
  const ORB_YELLOW = { x: 11.2 * TILE, y: 7.6 * TILE };
  const ORB_RED = { x: POND.x - 18, y: POND.y + 8 };
  const ORB_BLUE = { x: POND.x + 22, y: POND.y - 14 };

  const ART = [
    'grass', 'dirt', 'pond', 'post', 'tree', 'tree2',
    'wizard_s', 'wizard_w', 'wizard_e', 'wizard_n',
    'slime_s', 'slime_w', 'slime_e', 'slime_n',
    'hud_joy_base', 'hud_joy_knob', 'hud_panel', 'hud_ok',
    'orb_yellow', 'orb_red', 'orb_blue',
    'guide_arrow', 'guide_dot', 'fx_star',
  ];

  class MainScene extends Phaser.Scene {
    constructor() {
      super('main');
      this.stick = { dx: 0, dy: 0, active: false };
      this.got = { yellow: false, red: false, blue: false };
      this.count = 0;
      this.complete = false;
      this.wasInWater = false;
      this.slimeFetch = false;
      this.blueCarried = false;
    }

    preload() {
      if (typeof ASSETS !== 'undefined') {
        Object.entries(ASSETS).forEach(([k, src]) => this.load.image(k, src));
      } else {
        ART.forEach((k) => this.load.image(k, `art/${k}.png`));
      }
    }

    create() {
      this.cameras.main.setBackgroundColor('#0e1210');
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          const key = DIRT.has(`${x},${y}`) ? 'dirt' : 'grass';
          this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, key).setDisplaySize(TILE, TILE);
        }
      }

      this.add.image(POND.x, POND.y, 'pond').setScale(1.15);

      this.propGroup = this.add.group();
      POSTS.forEach((p) => this.propGroup.add(this.add.image(p.x, p.y, 'post').setOrigin(0.5, 1)));
      TREES.forEach((t) => this.propGroup.add(this.add.image(t.x, t.y, t.key).setOrigin(0.5, 1)));

      // Guide path dots + arrow at spawn (point SE toward yellow)
      this.guideDots = [];
      const path = [
        { x: SPAWN.x + 28, y: SPAWN.y - 4 },
        { x: SPAWN.x + 56, y: SPAWN.y - 10 },
        { x: SPAWN.x + 88, y: SPAWN.y - 18 },
        { x: SPAWN.x + 120, y: SPAWN.y - 28 },
      ];
      path.forEach((p, i) => {
        const d = this.add.image(p.x, p.y, 'guide_dot').setDepth(5).setAlpha(0.85 - i * 0.1);
        this.guideDots.push(d);
      });
      this.guideArrow = this.add.image(SPAWN.x + 40, SPAWN.y - 36, 'guide_arrow')
        .setOrigin(0.5, 0.5).setDisplaySize(56, 32).setDepth(20).setAngle(25);
      this.tweens.add({
        targets: this.guideArrow,
        x: this.guideArrow.x + 10,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Orbs
      this.orbYellow = this.add.image(ORB_YELLOW.x, ORB_YELLOW.y, 'orb_yellow').setDisplaySize(36, 36).setDepth(ORB_YELLOW.y);
      this.orbRed = this.add.image(ORB_RED.x, ORB_RED.y, 'orb_red').setDisplaySize(36, 36).setDepth(ORB_RED.y);
      this.orbBlue = this.add.image(ORB_BLUE.x, ORB_BLUE.y, 'orb_blue').setDisplaySize(36, 36).setDepth(ORB_BLUE.y);
      this.tweens.add({ targets: [this.orbYellow, this.orbRed, this.orbBlue], y: '-=4', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      this.player = this.physics.add.sprite(SPAWN.x, SPAWN.y, 'wizard_s');
      this.player.setOrigin(0.5, 1);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(14, 10);
      this.player.body.setOffset(this.player.width / 2 - 7, this.player.height - 12);
      this.player.facing = 's';

      this.slime = this.add.image(SPAWN.x - 22, SPAWN.y + 6, 'slime_s').setOrigin(0.5, 1);
      this.slime.facing = 's';
      this.slimeTarget = { x: this.slime.x, y: this.slime.y };

      this.splash = this.add.particles(0, 0, 'guide_dot', {
        speed: { min: 20, max: 60 },
        angle: { min: 220, max: 320 },
        lifespan: 400,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: 0x7ec8ff,
        quantity: 0,
        emitting: false,
      });

      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');

      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.scale.width / 300, 1.5, 2.5));

      this.counter = this.add.text(12, 10, '魔力珠 0/3', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '15px',
        color: '#fff8e0',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 6 },
      }).setScrollFactor(0).setDepth(100);

      this.hint = this.add.text(12, 40, '沿箭头取黄珠 → 进池取红珠 · 史莱姆会衔蓝珠', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '12px',
        color: '#d8e0d8',
        backgroundColor: '#00000066',
        padding: { x: 8, y: 4 },
      }).setScrollFactor(0).setDepth(100);

      this.winPanel = this.add.container(this.scale.width / 2, this.scale.height / 2)
        .setScrollFactor(0).setDepth(300).setVisible(false);
      const panel = this.add.image(0, -10, 'hud_panel').setDisplaySize(300, 150);
      const title = this.add.text(0, -36, '试炼完成', {
        fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '24px', color: '#fff8e8',
      }).setOrigin(0.5);
      const sub = this.add.text(0, -4, '三枚魔力珠已归位', {
        fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '13px', color: '#d8c8a8',
      }).setOrigin(0.5);
      this.okBtn = this.add.image(0, 52, 'hud_ok').setDisplaySize(120, 56).setInteractive({ useHandCursor: true });
      this.okBtn.on('pointerdown', () => this.winPanel.setVisible(false));
      this.star1 = this.add.image(-90, -70, 'fx_star').setDisplaySize(40, 40);
      this.star2 = this.add.image(90, -70, 'fx_star').setDisplaySize(40, 40);
      this.winPanel.add([panel, title, sub, this.okBtn, this.star1, this.star2]);

      this._buildJoystick();
      this.scale.on('resize', (gs) => {
        this.winPanel.setPosition(gs.width / 2, gs.height / 2);
        this._layoutJoystick(gs.width, gs.height);
        this.cameras.main.setZoom(Phaser.Math.Clamp(gs.width / 300, 1.5, 2.5));
      });
    }

    _buildJoystick() {
      this.joyBase = this.add.image(0, 0, 'hud_joy_base').setScrollFactor(0).setDepth(150).setAlpha(0.92);
      this.joyKnob = this.add.image(0, 0, 'hud_joy_knob').setScrollFactor(0).setDepth(151);
      this.joyBase.setDisplaySize(110, 110);
      this.joyKnob.setDisplaySize(52, 52);
      this.joyHitR = 58;
      this._layoutJoystick(this.scale.width, this.scale.height);

      this.input.on('pointerdown', (p) => {
        if (Phaser.Math.Distance.Between(p.x, p.y, this.joyCX, this.joyCY) <= this.joyHitR + 16) {
          this.stick.active = true;
          this.stick.pointerId = p.id;
          this._updateStick(p.x, p.y);
        }
      });
      this.input.on('pointermove', (p) => {
        if (!this.stick.active || p.id !== this.stick.pointerId) return;
        this._updateStick(p.x, p.y);
      });
      const end = (p) => {
        if (!this.stick.active || (p && p.id !== this.stick.pointerId)) return;
        this.stick.active = false;
        this.stick.dx = 0;
        this.stick.dy = 0;
        this.joyKnob.setPosition(this.joyCX, this.joyCY);
      };
      this.input.on('pointerup', end);
      this.input.on('pointerupoutside', end);
    }

    _layoutJoystick(w, h) {
      this.joyCX = 72;
      this.joyCY = h - 78;
      this.joyBase.setPosition(this.joyCX, this.joyCY);
      this.joyKnob.setPosition(this.joyCX, this.joyCY);
    }

    _updateStick(px, py) {
      const max = 36;
      let dx = px - this.joyCX;
      let dy = py - this.joyCY;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      let nx = dx / max; let ny = dy / max;
      const m = Math.hypot(nx, ny);
      if (m < DEADZONE) { nx = 0; ny = 0; }
      else {
        const t = (m - DEADZONE) / (1 - DEADZONE);
        nx = (nx / m) * t;
        ny = (ny / m) * t;
      }
      this.stick.dx = nx;
      this.stick.dy = ny;
      this.joyKnob.setPosition(this.joyCX + dx, this.joyCY + dy);
    }

    inPond(x, y) {
      const dx = x - POND.x; const dy = y - POND.y;
      return dx * dx + dy * dy < (POND.r - 12) * (POND.r - 12);
    }

    collides(x, y) {
      const rad = 7;
      for (const t of TREES) {
        const dx = x - t.x; const dy = y - t.y;
        if (dx * dx + dy * dy < (rad + 8) * (rad + 8)) return true;
      }
      for (const p of POSTS) {
        const dx = x - p.x; const dy = y - p.y;
        if (dx * dx + dy * dy < (rad + 5) * (rad + 5)) return true;
      }
      return false;
    }

    _attractAndCollect(orb, key, who) {
      if (this.got[key] || !orb.visible) return;
      const dx = who.x - orb.x; const dy = who.y - 8 - orb.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 52 && dist > 1) {
        orb.x += dx * 0.12;
        orb.y += dy * 0.12;
      }
      if (dist < 18) this._collect(key, orb);
    }

    _collect(key, orb) {
      if (this.got[key]) return;
      this.got[key] = true;
      this.count += 1;
      this.counter.setText(`魔力珠 ${this.count}/3`);
      this.tweens.add({
        targets: orb, scale: 0, alpha: 0, duration: 220,
        onComplete: () => orb.setVisible(false),
      });
      // pop feedback
      const star = this.add.image(orb.x, orb.y, 'fx_star').setDisplaySize(28, 28).setDepth(500);
      this.tweens.add({ targets: star, y: orb.y - 40, alpha: 0, scale: 1.6, duration: 450, onComplete: () => star.destroy() });

      if (key === 'yellow') {
        this.guideArrow.setVisible(false);
        this.guideDots.forEach((d) => d.setVisible(false));
        this.hint.setText('进圆池取红珠（水里会变慢）');
        this.slimeFetch = true; // slime starts blue fetch after yellow
      } else if (key === 'red') {
        this.hint.setText('史莱姆正在衔蓝珠…');
        this.slimeFetch = true;
      } else if (key === 'blue') {
        this.hint.setText(this.count >= 3 ? '试炼完成！' : '继续收集魔力珠');
        this.blueCarried = false;
      }

      if (this.count >= 3 && !this.complete) {
        this.complete = true;
        this.hint.setText('试炼完成');
        this.time.delayedCall(350, () => {
          this.winPanel.setVisible(true);
          this.tweens.add({ targets: [this.star1, this.star2], angle: 360, duration: 1200, repeat: 1 });
        });
      }
    }

    update(_t, dtMs) {
      const dt = Math.min(0.05, dtMs / 1000);
      let mx = 0; let my = 0;
      if (this.cursors.left.isDown || this.wasd.A.isDown) mx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) mx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) my -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) my += 1;
      if (this.stick.active) { mx = this.stick.dx; my = this.stick.dy; }
      const mlen = Math.hypot(mx, my);
      if (mlen > DEADZONE) {
        mx /= mlen; my /= mlen;
        if (Math.abs(mx) > Math.abs(my)) this.player.facing = mx > 0 ? 'e' : 'w';
        else this.player.facing = my > 0 ? 's' : 'n';
        this.player.setTexture(`wizard_${this.player.facing}`);
      } else { mx = 0; my = 0; }

      const inWater = this.inPond(this.player.x, this.player.y);
      if (inWater && !this.wasInWater) {
        this.splash.emitParticleAt(this.player.x, this.player.y - 6, 10);
      }
      this.wasInWater = inWater;

      const spd = (inWater ? 60 : 125) * dt;
      const nx = Phaser.Math.Clamp(this.player.x + mx * spd, 12, WORLD_W - 12);
      const ny = Phaser.Math.Clamp(this.player.y + my * spd, 12, WORLD_H - 12);
      if (!this.collides(nx, this.player.y)) this.player.x = nx;
      if (!this.collides(this.player.x, ny)) this.player.y = ny;

      // Player attracts yellow & red
      this._attractAndCollect(this.orbYellow, 'yellow', this.player);
      this._attractAndCollect(this.orbRed, 'red', this.player);

      // Slime behavior
      let followX = this.player.x;
      let followY = this.player.y - 8;
      if (this.slimeFetch && !this.got.blue) {
        // go to blue, then carry back toward player
        if (!this.blueCarried) {
          followX = this.orbBlue.x;
          followY = this.orbBlue.y;
          const dBlue = Phaser.Math.Distance.Between(this.slime.x, this.slime.y, this.orbBlue.x, this.orbBlue.y);
          if (dBlue < 20) {
            this.blueCarried = true;
            this.orbBlue.setVisible(false);
          } else {
            // attract orb slightly toward slime
            this.orbBlue.x += (this.slime.x - this.orbBlue.x) * 0.04;
            this.orbBlue.y += (this.slime.y - this.orbBlue.y) * 0.04;
          }
        } else {
          followX = this.player.x;
          followY = this.player.y - 8;
          const dP = Phaser.Math.Distance.Between(this.slime.x, this.slime.y, this.player.x, this.player.y);
          if (dP < 26) {
            this._collect('blue', this.orbBlue);
          }
        }
      }

      const toX = followX - this.slime.x;
      const toY = followY - this.slime.y;
      const toLen = Math.hypot(toX, toY);
      const hold = (this.slimeFetch && !this.got.blue && !this.blueCarried) ? 8 : 28;
      if (toLen > hold) {
        const destX = followX - (toX / toLen) * (hold * 0.3);
        const destY = followY - (toY / toLen) * (hold * 0.3);
        this.slimeTarget.x += (destX - this.slimeTarget.x) * (1 - Math.exp(-dt / 0.1));
        this.slimeTarget.y += (destY - this.slimeTarget.y) * (1 - Math.exp(-dt / 0.1));
        const sx = this.slimeTarget.x - this.slime.x;
        const sy = this.slimeTarget.y - this.slime.y;
        const sl = Math.hypot(sx, sy);
        if (sl > 0.4) {
          const slimeSpd = (this.slimeFetch && !this.got.blue ? 90 : 105) * dt;
          const ss = Math.min(slimeSpd, sl);
          this.slime.x += (sx / sl) * ss;
          this.slime.y += (sy / sl) * ss;
          if (Math.abs(sx) > Math.abs(sy)) this.slime.facing = sx > 0 ? 'e' : 'w';
          else this.slime.facing = sy > 0 ? 's' : 'n';
          this.slime.setTexture(`slime_${this.slime.facing}`);
        }
      } else {
        this.slimeTarget.x = this.slime.x;
        this.slimeTarget.y = this.slime.y;
      }

      // carried blue visual on slime
      if (this.blueCarried && !this.got.blue) {
        this.orbBlue.setVisible(true).setPosition(this.slime.x, this.slime.y - 18).setDepth(this.slime.y + 1).setDisplaySize(22, 22);
      }

      this.player.setDepth(this.player.y);
      this.slime.setDepth(this.slime.y);
      if (this.orbYellow.visible) this.orbYellow.setDepth(this.orbYellow.y);
      if (this.orbRed.visible) this.orbRed.setDepth(this.orbRed.y);
      if (this.orbBlue.visible && !this.blueCarried) this.orbBlue.setDepth(this.orbBlue.y);
      this.propGroup.getChildren().forEach((s) => s.setDepth(s.y));
    }
  }

  // eslint-disable-next-line no-new
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0e1210',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [MainScene],
  });
})();
