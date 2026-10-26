(() => {
  const TILE = 32;
  const MAP_W = 20;
  const MAP_H = 16;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  const POND = { x: 15 * TILE, y: 8 * TILE, r: 60 };
  const SPAWN = { x: 5 * TILE, y: 10 * TILE };
  const BALL = { x: POND.x + 24, y: POND.y - 6 };

  const DIRT = new Set();
  [
    [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11],
    [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [9, 6], [9, 7], [9, 8], [9, 9], [9, 10],
    [10, 6], [11, 6], [12, 6], [13, 6], [13, 7], [13, 8], [13, 9], [14, 9],
  ].forEach(([x, y]) => {
    DIRT.add(`${x},${y}`);
    DIRT.add(`${x + 1},${y}`);
    DIRT.add(`${x},${y + 1}`);
  });

  const TREES = [
    { x: 3 * TILE, y: 4 * TILE, key: 'tree' },
    { x: 8 * TILE, y: 13 * TILE, key: 'tree2' },
    { x: 12 * TILE, y: 3 * TILE, key: 'tree' },
    { x: 17 * TILE, y: 12 * TILE, key: 'tree2' },
  ];
  const POSTS = [
    { x: 5 * TILE, y: 8 * TILE },
    { x: 11 * TILE, y: 7 * TILE },
    { x: 14 * TILE, y: 11 * TILE },
  ];

  const ART = [
    'grass', 'dirt', 'pond', 'post', 'red_ball', 'tree', 'tree2',
    'wizard_s', 'wizard_w', 'wizard_e', 'wizard_n',
    'slime_s', 'slime_w', 'slime_e', 'slime_n',
    'hud_joy_base', 'hud_joy_knob', 'hud_panel', 'hud_ok',
    'hud_btn_left', 'hud_btn_right', 'hud_btn_up', 'hud_btn_down',
  ];

  class MainScene extends Phaser.Scene {
    constructor() {
      super('main');
      this.complete = false;
      this.stick = { dx: 0, dy: 0, active: false };
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

      this.add.image(POND.x, POND.y, 'pond');

      this.propGroup = this.add.group();
      POSTS.forEach((p) => this.propGroup.add(this.add.image(p.x, p.y, 'post').setOrigin(0.5, 1)));
      TREES.forEach((t) => this.propGroup.add(this.add.image(t.x, t.y, t.key).setOrigin(0.5, 1)));

      this.ball = this.add.image(BALL.x, BALL.y, 'red_ball').setOrigin(0.5, 1);

      this.player = this.physics.add.sprite(SPAWN.x, SPAWN.y, 'wizard_s');
      this.player.setOrigin(0.5, 1);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(14, 10);
      this.player.body.setOffset(this.player.width / 2 - 7, this.player.height - 12);
      this.player.facing = 's';

      this.slime = this.add.image(SPAWN.x - 24, SPAWN.y + 8, 'slime_s').setOrigin(0.5, 1);
      this.slime.facing = 's';
      this.slimeTarget = { x: this.slime.x, y: this.slime.y };

      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');

      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
      const z = Phaser.Math.Clamp(this.scale.width / 320, 1.4, 2.4);
      this.cameras.main.setZoom(z);

      this.hint = this.add.text(12, 10, '摇杆移动 · 进池半速 · 碰红球通关', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '13px',
        color: '#e8eee8',
        backgroundColor: '#00000066',
        padding: { x: 8, y: 4 },
      }).setScrollFactor(0).setDepth(100);

      // Win UI from art HUD
      this.winPanel = this.add.container(this.scale.width / 2, this.scale.height / 2)
        .setScrollFactor(0).setDepth(200).setVisible(false);
      const panel = this.add.image(0, -10, 'hud_panel').setDisplaySize(280, 140);
      const title = this.add.text(0, -28, '第一关完成！', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '22px',
        color: '#fff8e8',
      }).setOrigin(0.5);
      const sub = this.add.text(0, 4, '可继续在场景里逛', {
        fontFamily: 'system-ui,-apple-system,sans-serif',
        fontSize: '13px',
        color: '#d8c8a8',
      }).setOrigin(0.5);
      this.okBtn = this.add.image(0, 58, 'hud_ok').setDisplaySize(120, 56).setInteractive({ useHandCursor: true });
      this.okBtn.on('pointerdown', () => this.winPanel.setVisible(false));
      this.winPanel.add([panel, title, sub, this.okBtn]);

      this._buildJoystick();
      this.scale.on('resize', (gameSize) => {
        this.winPanel.setPosition(gameSize.width / 2, gameSize.height / 2);
        this._layoutJoystick(gameSize.width, gameSize.height);
        const zz = Phaser.Math.Clamp(gameSize.width / 320, 1.4, 2.4);
        this.cameras.main.setZoom(zz);
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
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stick.dx = dx / max;
      this.stick.dy = dy / max;
      this.joyKnob.setPosition(this.joyCX + dx, this.joyCY + dy);
    }

    inPond(x, y) {
      const dx = x - POND.x;
      const dy = y - POND.y;
      return dx * dx + dy * dy < (POND.r - 10) * (POND.r - 10);
    }

    collides(x, y) {
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

    update(_t, dtMs) {
      const dt = Math.min(0.05, dtMs / 1000);
      let mx = 0;
      let my = 0;
      if (this.cursors.left.isDown || this.wasd.A.isDown) mx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) mx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) my -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) my += 1;
      if (this.stick.active) {
        mx = this.stick.dx;
        my = this.stick.dy;
      }
      const mlen = Math.hypot(mx, my);
      if (mlen > 0.08) {
        mx /= mlen;
        my /= mlen;
        if (Math.abs(mx) > Math.abs(my)) this.player.facing = mx > 0 ? 'e' : 'w';
        else this.player.facing = my > 0 ? 's' : 'n';
        this.player.setTexture(`wizard_${this.player.facing}`);
      } else {
        mx = 0;
        my = 0;
      }

      const spd = (this.inPond(this.player.x, this.player.y) ? 60 : 120) * dt;
      const nx = Phaser.Math.Clamp(this.player.x + mx * spd, 12, WORLD_W - 12);
      const ny = Phaser.Math.Clamp(this.player.y + my * spd, 12, WORLD_H - 12);
      if (!this.collides(nx, this.player.y)) this.player.x = nx;
      if (!this.collides(this.player.x, ny)) this.player.y = ny;

      const toX = this.player.x - this.slime.x;
      const toY = this.player.y - 8 - this.slime.y;
      const toLen = Math.hypot(toX, toY);
      if (toLen > 28) {
        const destX = this.player.x - (toX / toLen) * 28;
        const destY = this.player.y - 8 - (toY / toLen) * 28;
        this.slimeTarget.x += (destX - this.slimeTarget.x) * (1 - Math.exp(-dt / 0.12));
        this.slimeTarget.y += (destY - this.slimeTarget.y) * (1 - Math.exp(-dt / 0.12));
        const sx = this.slimeTarget.x - this.slime.x;
        const sy = this.slimeTarget.y - this.slime.y;
        const sl = Math.hypot(sx, sy);
        if (sl > 0.5) {
          const ss = Math.min(100 * dt, sl);
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

      this.player.setDepth(this.player.y);
      this.slime.setDepth(this.slime.y);
      this.ball.setDepth(this.ball.y);
      this.propGroup.getChildren().forEach((s) => s.setDepth(s.y));

      if (!this.complete) {
        const bx = this.player.x - BALL.x;
        const by = this.player.y - BALL.y;
        if (bx * bx + by * by < 14 * 14) {
          this.complete = true;
          this.winPanel.setVisible(true);
          this.hint.setText('通关成功');
        }
      }
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
