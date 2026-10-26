# 池边试炼 · web-app（卡1）

Vite + Phaser 3 + TypeScript 多文件工程。禁止再用巨型单 HTML 交付。

## 目录

```
web-app/
  public/art/          # PNG 资源（与仓库 art 约定对齐，后续换 atlas）
  src/
    data/level1.ts     # 地图坐标、速度、奔跑参数
    scenes/            # BootScene / Level1Scene
    ui/                # Joystick / SprintButton / Hud
    main.ts
  README.md
```

## 运行

```bash
cd web-app
npm install
npm run dev
```

浏览器打开终端给出的本地地址；手机真机可用同一局域网 IP。

构建静态包：

```bash
npm run build
npm run preview
```

产物在 `dist/`。

## 卡1 手感 / 布局

- 竖屏固定 `360×640`，`Scale.FIT` 居中
- 左下虚拟摇杆；右下 **按住冲刺**（×1.6 移速，无体力，松手回常态，0.2s 短 CD）
- 进池强制半速且不可冲刺
- 顶栏单行计数 + 提示；安全区避开摇杆

## 与正式栈

正式仍迁 **Cocos Creator → 微信小游戏**（卡2 `cocos-level1/`）。本工程资源目录约定尽量与 Cocos `art/` 对齐，避免再推倒。

## 当前玩法（过渡）

黄珠走拾 → 红珠池中取 → 红后史莱姆衔蓝珠。三珠新机制（牵引 / 点史莱姆 / 石台木桥）见卡3。
