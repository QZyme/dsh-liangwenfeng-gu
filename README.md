# dsh-liangwenfeng-gu

DeepSeek Harness 输入框右上角「当前状态」角标插件（梁文峰 / 梁文谷）。

## 功能

- 在 DSH Web 的**输入框（composer）右上角**显示一个状态角标：
  - **周一至周五，北京时间 09:00–12:00 / 14:00–18:00** → 红色 **梁文峰**
  - **其余时间**（周末、午休、晚间等）→ 绿色 **梁文谷**
- 每 30 秒自动重新判断，到点自动变色，无需刷新。
- 角标与输入首行文字/光标垂直对齐（`top: 11px`）。
- 只为首行预留角标宽度（实时测量，随字号与文案自适应）：文字提前换行，**第二行起恢复整行宽度**，光标和文字都不会被角标盖住。
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
| `client.js` | 浏览器半部：overlay 槽位注入角标 + 首行换行预留（浮动方案，适配 DSH 0.1.2+ 的 Lexical composer） |
| `cordis.patch.yml` | 插件挂载行（`dsh.bundle.patch` 层） |

## 定制

- 颜色：`#e5484d`（红/梁文峰）、`#30a46c`（绿/梁文谷）
- 换行预留宽度：由角标组件实时测量后写入 `--dsh-status-badge-reserve`（上限为输入框宽度的 60%），不再依赖固定常量
- 时间规则：`isBeijingOnDuty()`（工作日 + 两个时段）

## License

MIT

## 变更记录

### 1.0.1

- **修复：输入文字被角标遮挡 / 折行提前换行。** DSH 0.1.2 把 composer 从
  `<textarea>`（+ backdrop / mirror）换成 Lexical contenteditable 后，原先针对那三个
  元素写的 `padding-right: 112px` 已匹配不到任何节点，文字会直接压到角标下面。
- 改用「一行高的零宽右浮动」压缩首行行盒：首行按需要让出角标宽度，**第二行起恢复
  整行宽度**（固定 padding 会作用于每一行，把折行文字提前拉回）。
- 预留宽度与行高改由角标组件按实时几何测量（角标宽度、输入框右边缘、计算行高）
  写入 `--dsh-status-badge-reserve` / `--dsh-status-badge-line`，并用
  `ResizeObserver` 在角标或输入框尺寸变化时重算；组件卸载时移除这两个属性，
  composer 立刻恢复满宽。
