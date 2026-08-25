/**
 * dsh-liangwenfeng-gu — browser client bundle
 *
 * 功能：在 DSH 输入框（composer）右上角显示「当前状态」角标。
 *   - 周一~周五 北京时间(UTC+8) 09:00-12:00 / 14:00-18:00 -> 红色「梁文峰」
 *   - 其余时间 -> 绿色「梁文谷」
 *   - 每 30 秒自检一次，到点自动变色。
 *   - 同时注入全局样式，为输入框预留右侧 112px，输入文字提前换行，
 *     光标和文字永远不会被角标盖住。
 *
 * 实现：
 *   1) 通过 `conversation.input.overlay` 槽位注入角标组件（composer 卡片
 *      顶部 overlay 锚点，绝对定位 top:11px / right:8px 与首行文字对齐）；
 *   2) 注入全局 CSS（动态插件环境走 styles.insert，独立 bundle 时直接
 *      插入 <style>），把 textarea / backdrop / mirror 三层的右侧内边距
 *      统一设为 112px，保证换行一致、自动增高与滚动条同步不被破坏。
 */
window.__ModuleLoader__.load({
	id: "dsh-liangwenfeng-gu",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		// ── 换行预留样式 ────────────────────────────────────────────────
		const WRAP_CSS = [
			'[data-composer-card] textarea,',
			'[data-composer-card] [data-input-backdrop],',
			'[data-composer-card] [data-input-mirror]',
			'{ padding-right: 112px !important; }'
		].join('\n');
		/**
		 * 注入换行预留样式；返回可卸载函数。
		 * 动态插件环境优先用 `styles.insert`（全局样式服务），
		 * 独立 bundle 场景回退为直接插入 <style> 标签。
		 */
		function insertWrapCss() {
			if (typeof styles !== 'undefined' && styles && typeof styles.insert === 'function') {
				return styles.insert(WRAP_CSS);
			}
			if (typeof document === 'undefined') return () => {};
			const id = 'dsh-liangwenfeng-gu/composer-wrap';
			if (document.querySelector('style[data-plugin-css="' + id + '"]') !== null) return () => {};
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-liangwenfeng-gu';
			tag.dataset.pluginCss = id;
			tag.textContent = WRAP_CSS;
			document.head.appendChild(tag);
			return () => {
				if (tag.parentNode) tag.parentNode.removeChild(tag);
			};
		}

		// ── 状态判断（固定 UTC+8，无夏令时） ────────────────────────────
		/** 周一~周五 北京时间 09:00-12:00 / 14:00-18:00 视为工作时间。 */
		function isBeijingOnDuty() {
			const now = new Date(Date.now() + 8 * 3600 * 1000);
			const day = now.getUTCDay();
			const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
			const inRange = minutes >= 9 * 60 && minutes < 12 * 60 || minutes >= 14 * 60 && minutes < 18 * 60;
			return day >= 1 && day <= 5 && inRange;
		}

		// ── 角标组件 ────────────────────────────────────────────────────
		/** 输入框右上角状态角标；忽略槽位 props，每 30s 自检一次。 */
		function WorkStatusBadge() {
			const [onDuty, setOnDuty] = (0, react.useState)(() => isBeijingOnDuty());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => {
					setOnDuty(isBeijingOnDuty());
				}, 30 * 1000);
				return () => {
					clearInterval(timer);
				};
			}, []);
			return (0, react_jsx_runtime.jsx)("span", {
				title: onDuty ? "工作时间: 周一至周五 09:00-12:00 / 14:00-18:00 (北京时间)" : "非工作时间 (周末或北京时间 12:00-14:00 / 18:00-次日09:00)",
				style: {
					position: "absolute",
					top: "11px",
					right: "8px",
					zIndex: 2,
					display: "inline-flex",
					alignItems: "center",
					minHeight: "22px",
					padding: "0 8px",
					borderRadius: "11px",
					fontSize: "11px",
					lineHeight: "18px",
					fontWeight: 500,
					color: "#fff",
					background: onDuty ? "#e5484d" : "#30a46c",
					boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
					userSelect: "none",
					whiteSpace: "nowrap",
					pointerEvents: "none"
				},
				children: "当前状态：" + (onDuty ? "梁文峰" : "梁文谷")
			});
		}

		// ── 插件主体 ────────────────────────────────────────────────────
		const inject = ["slots"];
		/** @param ctx - client root context（提供 slots 服务）。 */
		function apply(ctx) {
			ctx.effect(() => insertWrapCss(), "dsh-liangwenfeng-gu: wrap css");
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: "work-status-badge",
				order: 10
			}, WorkStatusBadge));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
