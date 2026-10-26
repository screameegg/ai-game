(() => {
  const TILE = 32;
  const MAP_W = 20;
  const MAP_H = 16;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  // 策划草图：池圆心 (12,8) 半径4；出生(2,12)；黄(10,3)；红(14,8)；蓝(9,9)
  const cell = (cx, cy) => ({ x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2 });
  const POND = { x: 12 * TILE + TILE / 2, y: 8 * TILE + TILE / 2, r: 4 * TILE };
  const SPAWN = cell(2, 12);
  const ORB_YELLOW = cell(10, 3);
  const ORB_RED = cell(14, 8);
  const ORB_BLUE = cell(9, 9);
  const DEADZONE = 0.10;

  const DIRT = new Set();
  const addDirt = (x, y) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    DIRT.add(`${x},${y}`);
  };
  // 弯土路环池一圈 + 西侧出生岔路
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const gx = Math.round(12 + Math.cos(a) * 5.2);
    const gy = Math.round(8 + Math.sin(a) * 5.2);
    addDirt(gx, gy);
    addDirt(gx + 1, gy);
    addDirt(gx, gy + 1);
  }
  // 出生到环池西侧
  for (let x = 2; x <= 7; x++) { addDirt(x, 12); addDirt(x, 11); }
  for (let y = 10; y <= 12; y++) addDirt(7, y);
  // 北岸岔到黄珠
  for (let y = 3; y <= 5; y++) { addDirt(10, y); addDirt(9, y); }
  for (let x = 8; x <= 10; x++) addDirt(x, 5);

  const TREES = [
    { x: cell(4, 4).x, y: cell(4, 4).y, key: 'tree' },
    { x: cell(10, 2).x, y: cell(10, 2).y, key: 'tree2' }, // 近黄珠
    { x: cell(16, 3).x, y: cell(16, 3).y, key: 'tree' },
    { x: cell(3, 8).x, y: cell(3, 8).y, key: 'tree2' },
    { x: cell(17, 12).x, y: cell(17, 12).y, key: 'tree' },
    { x: cell(6, 14).x, y: cell(6, 14).y, key: 'tree2' },
  ];
  const POSTS = [
    cell(5, 12), cell(8, 10), cell(15, 12), cell(11, 5),
  ];

  const ART = [
    'grass', 'dirt', 'pond', 'post', 'tree', 'tree2',
    'wizard_s', 'wizard_w', 'wizard_e', 'wizard_n',
    'slime_s', 'slime_w', 'slime_e', 'slime_n',
    'hud_joy_base', 'hud_joy_knob', 'hud_panel', 'hud_ok',
    'orb_yellow', 'orb_red', 'orb_blue',
    'guide_arrow', 'guide_dot', 'fx_star',
    'decor_rocks', 'decor_flower', 'decor_flower2', 'decor_berry',
    'decor_grass', 'decor_shore', 'decor_rockpile',
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

      // 岸石环
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
        const x = POND.x + Math.cos(a) * (POND.r + 6);
        const y = POND.y + Math.sin(a) * (POND.r + 6);
        const key = (Math.floor(a * 10) % 2 === 0) ? 'decor_shore' : 'decor_rocks';
        this.add.image(x, y, key).setOrigin(0.5, 0.8).setDisplaySize(28, 22).setDepth(y - 20).setAlpha(0.95);
      }

      this.add.image(POND.x, POND.y, 'pond').setDisplaySize(POND.r * 2.1, POND.r * 2.1);

      this.propGroup = this.add.group();
      POSTS.forEach((p) => this.propGroup.add(this.add.image(p.x, p.y, 'post').setOrigin(0.5, 1)));
      TREES.forEach((t) => this.propGroup.add(this.add.image(t.x, t.y, t.key).setOrigin(0.5, 1)));

      // 花/浆果/草簇密铺（禁大块空草）
      const decor = [
        [3, 11, 'decor_flower'], [4, 13, 'decor_berry'], [5, 9, 'decor_grass'],
        [8, 13, 'decor_flower2'], [11, 13, 'decor_flower'], [14, 13, 'decor_berry'],
        [16, 10, 'decor_flower2'], [17, 7, 'decor_grass'], [15, 5, 'decor_flower'],
        [8, 4, 'decor_berry'], [6, 6, 'decor_flower2'], [13, 3, 'decor_grass'],
        [18, 14, 'decor_flower'], [1, 9, 'decor_grass'], [2, 6, 'decor_flower'],
        [10, 14, 'decor_rockpile'], [7, 3, 'decor_rocks'],
      ];
      decor.forEach(([gx, gy, key]) => {
        const p = cell(gx, gy);
        const s = this.add.image(p.x, p.y, key).setOrigin(0.5, 1).setDepth(p.y);
        const scale = key.includes('rockpile') ? 0.35 : (key.includes('berry') ? 0.45 : 0.5);
        s.setScale(scale);
        this.propGroup.add(s);
      });

      // 引导
      const path = [
        { x: SPAWN.x + 30, y: SPAWN.y - 8 },
        { x: SPAWN.x + 55, y: SPAWN.y - 20 },
        { x: SPAWN.x + 70, y: SPAWN.y - 40 },
        { x: SPAWN.x + 80, y: SPAWN.y - 70 },
      ];
      this.guideDots = path.map((p, i) => this.add.image(p.x, p.y, 'guide_dot').setDepth(5).setAlpha(0.85 - i * 0.1));
      this.guideArrow = this.add.image(SPAWN.x + 36, SPAWN.y - 40, 'guide_arrow')
        .setDisplaySize(52, 30).setDepth(30).setAngle(-55);
      this.tweens.add({ targets: this.guideArrow, y: this.guideArrow.y - 6, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      this.orbYellow = this.add.image(ORB_YELLOW.x, ORB_YELLOW.y, 'orb_yellow').setDisplaySize(34, 34);
      this.orbRed = this.add.image(ORB_RED.x, ORB_RED.y, 'orb_red').setDisplaySize(34, 34);
      this.orbBlue = this.add.image(ORB_BLUE.x, ORB_BLUE.y, 'orb_blue').setDisplaySize(34, 34);
      this.tweens.add({ targets: [this.orbYellow, this.orbRed, this.orbBlue], y: '-=4', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      this.player = this.physics.add.sprite(SPAWN.x, SPAWN.y, 'wizard_s');
      this.player.setOrigin(0.5, 1);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(14, 10);
      this.player.body.setOffset(this.player.width / 2 - 7, this.player.height - 12);
      this.player.facing = 's';

      this.slime = this.add.image(SPAWN.x - 20, SPAWN.y + 6, 'slime_s').setOrigin(0.5, 1);
      this.slime.facing = 's';
      this.slimeTarget = { x: this.slime.x, y: this.slime.y };

      this.splash = this.add.particles(0, 0, 'guide_dot', {
        speed: { min: 20, max: 60 }, angle: { min: 220, max: 320 }, lifespan: 400,
        scale: { start: 0.5, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: 0x7ec8ff, emitting: false,
      });

      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');

      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      // 竖屏：法师约占屏高 1/8 → zoom 约 height/(8*charH) 粗调
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.scale.height / 220, 1.6, 2.8));

      this.counter = this.add.text(12, 10, '魔力珠 0/3', {
        fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '15px', color: '#fff8e0',
        backgroundColor: '#00000088', padding: { x: 10, y: 6 },
      }).setScrollFactor(0).setDepth(100);
      this.hint = this.add.text(12, 40, '沿箭头去北岸黄珠 · 再进池取红珠', {
        fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '12px', color: '#d8e0d8',
        backgroundColor: '#00000066', padding: { x: 8, y: 4 },
      }).setScrollFactor(0).setDepth(100);

      this.winPanel = this.add.container(this.scale.width / 2, this.scale.height / 2)
        .setScrollFactor(0).setDepth(300).setVisible(false);
      const panel = this.add.image(0, -10, 'hud_panel').setDisplaySize(300, 150);
      const title = this.add.text(0, -36, '试炼完成', { fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '24px', color: '#fff8e8' }).setOrigin(0.5);
      const sub = this.add.text(0, -4, '三枚魔力珠已归位', { fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '13px', color: '#d8c8a8' }).setOrigin(0.5);
      this.okBtn = this.add.image(0, 52, 'hud_ok').setDisplaySize(120, 56).setInteractive({ useHandCursor: true });
      this.okBtn.on('pointerdown', () => this.winPanel.setVisible(false));
      this.star1 = this.add.image(-90, -70, 'fx_star').setDisplaySize(40, 40);
      this.star2 = this.add.image(90, -70, 'fx_star').setDisplaySize(40, 40);
      this.winPanel.add([panel, title, sub, this.okBtn, this.star1, this.star2]);

      this._buildJoystick();
      this.scale.on('resize', (gs) => {
        this.winPanel.setPosition(gs.width / 2, gs.height / 2);
        this._layoutJoystick(gs.width, gs.height);
        this.cameras.main.setZoom(Phaser.Math.Clamp(gs.height / 220, 1.6, 2.8));
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
          this.stick.active = true; this.stick.pointerId = p.id; this._updateStick(p.x, p.y);
        }
      });
      this.input.on('pointermove', (p) => {
        if (!this.stick.active || p.id !== this.stick.pointerId) return;
        this._updateStick(p.x, p.y);
      });
      const end = (p) => {
        if (!this.stick.active || (p && p.id !== this.stick.pointerId)) return;
        this.stick.active = false; this.stick.dx = 0; this.stick.dy = 0;
        this.joyKnob.setPosition(this.joyCX, this.joyCY);
      };
      this.input.on('pointerup', end);
      this.input.on('pointerupoutside', end);
    }

    _layoutJoystick(w, h) {
      this.joyCX = 72; this.joyCY = h - 78;
      this.joyBase.setPosition(this.joyCX, this.joyCY);
      this.joyKnob.setPosition(this.joyCX, this.joyCY);
    }

    _updateStick(px, py) {
      const max = 36;
      let dx = px - this.joyCX; let dy = py - this.joyCY;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      let nx = dx / max; let ny = dy / max;
      const m = Math.hypot(nx, ny);
      if (m < DEADZONE) { nx = 0; ny = 0; }
      else {
        const t = (m - DEADZONE) / (1 - DEADZONE);
        nx = (nx / m) * t; ny = (ny / m) * t;
      }
      this.stick.dx = nx; this.stick.dy = ny;
      this.joyKnob.setPosition(this.joyCX + dx, this.joyCY + dy);
    }

    inPond(x, y) {
      const dx = x - POND.x; const dy = y - POND.y;
      return dx * dx + dy * dy < (POND.r - 14) * (POND.r - 14);
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
      if (dist < 52 && dist > 1) { orb.x += dx * 0.12; orb.y += dy * 0.12; }
      if (dist < 18) this._collect(key, orb);
    }

    _collect(key, orb) {
      if (this.got[key]) return;
      this.got[key] = true;
      this.count += 1;
      this.counter.setText(`魔力珠 ${this.count}/3`);
      this.tweens.add({ targets: orb, scale: 0, alpha: 0, duration: 220, onComplete: () => orb.setVisible(false) });
      const star = this.add.image(orb.x, orb.y, 'fx_star').setDisplaySize(28, 28).setDepth(500);
      this.tweens.add({ targets: star, y: orb.y - 40, alpha: 0, scale: 1.6, duration: 450, onComplete: () => star.destroy() });

      if (key === 'yellow') {
        this.guideArrow.setVisible(false);
        this.guideDots.forEach((d) => d.setVisible(false));
        this.hint.setText('进圆池取红珠（水里半速）');
        this.slimeFetch = true;
      } else if (key === 'red') {
        this.hint.setText('史莱姆正在衔蓝珠…');
        this.slimeFetch = true;
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
      if (inWater && !this.wasInWater) this.splash.emitParticleAt(this.player.x, this.player.y - 6, 10);
      this.wasInWater = inWater;

      const spd = (inWater ? 60 : 125) * dt;
      const nx = Phaser.Math.Clamp(this.player.x + mx * spd, 12, WORLD_W - 12);
      const ny = Phaser.Math.Clamp(this.player.y + my * spd, 12, WORLD_H - 12);
      if (!this.collides(nx, this.player.y)) this.player.x = nx;
      if (!this.collides(this.player.x, ny)) this.player.y = ny;

      this._attractAndCollect(this.orbYellow, 'yellow', this.player);
      this._attractAndCollect(this.orbRed, 'red', this.player);

      let followX = this.player.x; let followY = this.player.y - 8;
      if (this.slimeFetch && !this.got.blue) {
        if (!this.blueCarried) {
          followX = this.orbBlue.x; followY = this.orbBlue.y;
          if (Phaser.Math.Distance.Between(this.slime.x, this.slime.y, this.orbBlue.x, this.orbBlue.y) < 20) {
            this.blueCarried = true; this.orbBlue.setVisible(false);
          } else {
            this.orbBlue.x += (this.slime.x - this.orbBlue.x) * 0.04;
            this.orbBlue.y += (this.slime.y - this.orbBlue.y) * 0.04;
          }
        } else {
          followX = this.player.x; followY = this.player.y - 8;
          if (Phaser.Math.Distance.Between(this.slime.x, this.slime.y, this.player.x, this.player.y) < 26) {
            this._collect('blue', this.orbBlue);
          }
        }
      }

      const toX = followX - this.slime.x; const toY = followY - this.slime.y;
      const toLen = Math.hypot(toX, toY);
      const hold = (this.slimeFetch && !this.got.blue && !this.blueCarried) ? 8 : 28;
      if (toLen > hold) {
        const destX = followX - (toX / toLen) * (hold * 0.3);
        const destY = followY - (toY / toLen) * (hold * 0.3);
        this.slimeTarget.x += (destX - this.slimeTarget.x) * (1 - Math.exp(-dt / 0.1));
        this.slimeTarget.y += (destY - this.slimeTarget.y) * (1 - Math.exp(-dt / 0.1));
        const sx = this.slimeTarget.x - this.slime.x; const sy = this.slimeTarget.y - this.slime.y;
        const sl = Math.hypot(sx, sy);
        if (sl > 0.4) {
          const slimeSpd = (this.slimeFetch && !this.got.blue ? 90 : 105) * dt;
          const ss = Math.min(slimeSpd, sl);
          this.slime.x += (sx / sl) * ss; this.slime.y += (sy / sl) * ss;
          if (Math.abs(sx) > Math.abs(sy)) this.slime.facing = sx > 0 ? 'e' : 'w';
          else this.slime.facing = sy > 0 ? 's' : 'n';
          this.slime.setTexture(`slime_${this.slime.facing}`);
        }
      } else {
        this.slimeTarget.x = this.slime.x; this.slimeTarget.y = this.slime.y;
      }

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
