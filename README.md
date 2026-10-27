# ai-game

## 《再撕一层》Unwrap

静态站点在 `docs/`，对应 GitHub Pages「Deploy from a branch」的 `/docs` 目录。这份构建的 Vite `base` 是 `/ai-game/`，页面脚本、样式和 `art/` 贴图都使用该前缀。

公开地址：<https://screameegg.github.io/ai-game/>

Pages 需要在仓库网页上手动打开：**Settings → Pages** → Source 选 **Deploy from a branch** → Branch 选 `main`，文件夹选 **`/docs`**。`docs/.nojekyll` 用来跳过 Jekyll，避免带下划线的构建文件被忽略。
