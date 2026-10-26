# AI Game · 第一关初试

Godot 4.3 · 2D 假斜视像素原型

仓库：https://github.com/screameegg/ai-game  
分支：`feat/level1-prototype`（初版）→ 验收后合 `main`

## 运行

工程在仓库根目录（`project.godot` 与本文件同级）。安装 [Godot 4.3](https://godotengine.org/download/) 后打开本目录，或：

```bash
godot --path .
```

仓库不包含 Godot 引擎。若把本地二进制放在 `tools/`，该目录已被 `.gitignore` 排除。

操作：WASD / 方向键移动；进池约半速；**触碰红球**通关（到池边不够）。

## 手机试玩

验收请用 `web-app/`（Vite + Phaser 3 + TypeScript）。单文件 `web/` 已停用。说明见 `web-app/README.md`。

```bash
cd web-app
npm install
npm run dev
```

手机现在打开：https://appreciate-mon-spencer-instantly.trycloudflare.com/

`docs/` 是同一份构建结果，给 GitHub Pages 的 `/docs`。Pages 打开后的地址是 https://screameegg.github.io/ai-game/ 。右下按住冲刺（×1.6，无体力，水中不能冲，松手 0.2 秒冷却）。黄珠后箭头改指向池塘；史莱姆只在取到红珠后去衔蓝珠。

## 定稿玩法

- 地图约 20×16，出生点土路西侧，红球在池内偏右
- 池塘可进入，移动速度约 50%；**无岸边硬挡**
- 仅触碰红球触发「第一关完成」
- 树 / 路灯柱有碰撞；蓝史莱姆跟随

## 已实现

1. 场景：草地、弯土路、圆池  
2. 玩家四向移动  
3. 跟随 AI  
4. 红球通关  
5. 完成 UI  

## 资源

`art/` 来自美术表切片；同名 PNG 可覆盖热更。

## 分层

Ground → Water → Props → Actors → UI
