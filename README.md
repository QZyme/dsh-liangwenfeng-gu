# dsh-liangwenfeng-gu

DeepSeek Harness 输入框右上角「当前状态」角标插件（梁文峰 / 梁文谷）。

## 功能

- 在 DSH Web 的**输入框（composer）右上角**显示一个状态角标：
  - **周一至周五，北京时间 09:00–12:00 / 14:00–18:00** → 红色 **梁文峰**
  - **其余时间**（周末、午休、晚间等）→ 绿色 **梁文谷**
- 每 30 秒自动重新判断，到点自动变色，无需刷新。
- 角标与输入首行文字/光标垂直对齐（`top: 11px`）。
- 自动为输入框预留右侧 112px 空间：输入文字**提前换行**，光标和文字永远不会被角标盖住。
- 时间计算固定用 UTC+8（北京时间无夏令时），与浏览器本地时区无关。

## 安装

```bash
dsh plugin --profile web add github:QZyme/dsh-liangwenfeng-gu
```

或手动方式（等价）：在 `~/.dsh/profiles/web/package.json` 的 dependencies 中加入
`"dsh-liangwenfeng-gu": "git+https://github.com/QZyme/dsh-liangwenfeng-gu.git"`，
在 `cordis.patch.yml` 的 `insert` 列表中加一行 `{ id: work-status, name: 'dsh-liangwenfeng-gu' }`，
然后在该目录执行 `pnpm install`。安装后**重启 dsh web** 生效。

## 结构

| 文件 | 作用 |
|---|---|
| `index.js` | cordis 宿主半部（no-op，用于挂载） |
| `client.js` | 浏览器半部：overlay 槽位注入角标 + 全局换行预留样式 |
| `cordis.patch.yml` | 插件挂载行（`dsh.bundle.patch` 层） |

## 定制

- 颜色：`#e5484d`（红/梁文峰）、`#30a46c`（绿/梁文谷）
- 换行预留宽度：`client.js` 中 `WRAP_CSS` 的 `112px`
- 时间规则：`isBeijingOnDuty()`（工作日 + 两个时段）

## License

MIT
