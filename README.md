# ai-game

## 《再撕一层》Unwrap

静态站点在 `docs/unwrap/`（`index.html`、`assets/`、`art/`）。脚本和样式里的资源已改成相对路径（`./assets/`、`./art/`；样式表里的收藏柜底图是 `../art/`），因此可以挂在 GitHub Pages 子目录下。

公开地址：<https://screameegg.github.io/ai-game/unwrap/>

仓库根路径会跳到同一款游戏：<https://screameegg.github.io/ai-game/>

### 开启 GitHub Pages

当前令牌没有仓库 Administration 权限，无法通过 API 创建 Pages 站点（`POST /repos/screameegg/ai-game/pages` 返回 403）。合并到 `main` 之后，在 GitHub 网页上打开：

1. 仓库 **Settings → Pages**
2. **Build and deployment → Source** 选 **Deploy from a branch**
3. **Branch** 选 `main`，文件夹选 **`/docs`**，保存

保存后等一两分钟，上面的地址即可打开。`docs/.nojekyll` 用来跳过 Jekyll，避免带下划线的构建文件被忽略。
