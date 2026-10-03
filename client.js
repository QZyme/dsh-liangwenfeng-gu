/**
 * dsh-liangwenfeng-gu — browser client bundle
 *
 * 功能：在 DSH 输入框（composer）右上角显示「当前状态」角标。
 *   - 周一~周五 北京时间(UTC+8) 09:00-12:00 / 14:00-18:00 -> 红色「梁文峰」
 *   - 其余时间 -> 绿色「梁文谷」
 *   - 每 30 秒自检一次，到点自动变色。
 *   - 同时注入全局样式，只为首行预留角标宽度：文字提前换行，**第二行起恢复
 *     整行宽度**，光标与文字都不会被角标盖住。
 *
 * 实现：
 *   1) 通过 `conversation.input.overlay` 槽位注入角标组件（composer 卡片
 *      顶部 overlay 锚点，绝对定位 top:11px / right:8px 与首行文字对齐）；
 *   2) 注入全局 CSS。DSH 0.1.2 起 composer 换成了 Lexical contenteditable，
 *      旧版对 textarea / backdrop / mirror 的 padding 规则已匹配不到，且
 *      padding-right 会作用于每一行、把折行文字提前拉回。改为「一行高的零宽
 *      右浮动」精确压缩首行行盒；占位符是绝对定位单行，仍以 padding 处理。
 *      预留宽度与行高由角标组件按实时几何测量后写入
 *      --dsh-status-badge-reserve / --dsh-status-badge-line，
 *      随字号与文案自适应；无角标时默认 0，不占任何空间。
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
			/*
			 * DSH 0.1.2 replaced the composer's <textarea> (+ backdrop/mirror) with a
			 * Lexical contenteditable, so a padding rule on those three matched
			 * nothing there and the text ran underneath the badge.
			 *
			 * The reservation must cover the FIRST LINE only: the badge sits at the
			 * card's top-right, while padding-right applies to every line and would
			 * pull wrapped lines in early. A zero-width right float one line tall is
			 * the exact tool — line boxes shorten to avoid a float, and once past its
			 * height the remaining lines use the full width again.
			 *
			 * Its width and height are published as custom properties on
			 * [data-composer-card] by the badge component, measured from the live
			 * geometry (badge width, input right edge, computed line-height), so a
			 * font-size change or a different label stays exact. Both default to 0,
			 * so a composer with no badge (hero page, no session) loses no space.
			 */
			'[data-composer-card] [data-composer-input]::before,',
			'[data-composer-card] [contenteditable="true"]::before {',
			"  content: '';",
			'  float: right;',
			'  width: var(--dsh-status-badge-reserve, 0px);',
			'  height: var(--dsh-status-badge-line, 24px);',
			'  pointer-events: none;',
			'}',
			/*
			 * The placeholder is absolutely positioned and single-line (nowrap +
			 * ellipsis), so it is stopped with padding rather than a float: it just
			 * ellipsizes before the badge instead of running under it.
			 */
			'[data-composer-card] [data-composer-placeholder] {',
			'  padding-right: var(--dsh-status-badge-reserve, 0px);',
			'}'
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
			const badgeRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const timer = setInterval(() => {
					setOnDuty(isBeijingOnDuty());
				}, 30 * 1000);
				return () => {
					clearInterval(timer);
				};
			}, []);
			/*
			 * Publish the first-line reservation onto the composer card. Measured
			 * rather than hardcoded: the badge width follows the label and font, the
			 * line height follows the user's content-font setting, and the input's
			 * right edge follows the card's own padding — all read from the live DOM.
			 * Re-measured on any resize of the badge or the input (which covers window
			 * resizes, font-size changes and the auto-grow height).
			 */
			(0, react.useEffect)(() => {
				if (typeof window === 'undefined') return;
				const el = badgeRef.current;
				const card = el === null ? null : el.closest('[data-composer-card]');
				if (card === null) return;
				const measure = () => {
					const input = card.querySelector('[data-composer-input]') || card.querySelector('[contenteditable="true"]');
					if (input === null) return;
					const inputRect = input.getBoundingClientRect();
					const badgeRect = el.getBoundingClientRect();
					if (inputRect.width === 0 || badgeRect.width === 0) return;
					/* From the text's right edge to just left of the badge, plus a gap.
					   Capped so a very narrow composer cannot reserve most of its line. */
					const GAP = 8;
					const reserve = Math.max(0, Math.min(inputRect.right - badgeRect.left + GAP, inputRect.width * 0.6));
					const computed = window.getComputedStyle(input);
					let lineHeight = parseFloat(computed.lineHeight);
					if (!isFinite(lineHeight)) {
						const fontSize = parseFloat(computed.fontSize);
						lineHeight = isFinite(fontSize) ? fontSize * 1.5 : 24;
					}
					card.style.setProperty('--dsh-status-badge-reserve', reserve + 'px');
					card.style.setProperty('--dsh-status-badge-line', lineHeight + 'px');
				};
				measure();
				let observer = null;
				if (typeof ResizeObserver !== 'undefined') {
					observer = new ResizeObserver(measure);
					observer.observe(el);
					const input = card.querySelector('[data-composer-input]');
					if (input !== null) observer.observe(input);
				}
				window.addEventListener('resize', measure);
				return () => {
					if (observer !== null) observer.disconnect();
					window.removeEventListener('resize', measure);
					/* With the badge gone the composer must get its full width back. */
					card.style.removeProperty('--dsh-status-badge-reserve');
					card.style.removeProperty('--dsh-status-badge-line');
				};
			}, []);
			return (0, react_jsx_runtime.jsx)("span", {
				ref: badgeRef,
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
