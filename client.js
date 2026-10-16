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

		// ── 节假日日历（国务院办公厅 2026 年放假安排，国办发明电〔2025〕7 号） ──
		/*
		 * 只维护两张表，其余全由它们推导：
		 *   HOLIDAYS         法定节假日（含调休放假）→ 一律「谷」
		 *   MAKEUP_WORKDAYS  调休上班的周末          → 按工作日规则（可为「峰」）
		 * 元旦/春节/清明/劳动节/端午/中秋/国庆 的日期与调休上班日逐年由国务院公布，
		 * 每年 11 月更新这两张表即可。未列入的年份按「周一~周五」的普通规则判断，
		 * 因此 2027 年的安排在公布前，1 月 1 日会暂时按普通工作日显示。
		 * 日期一律按北京时间（UTC+8，无夏令时）取 YYYY-MM-DD。
		 */
		const HOLIDAYS = new Set([
			'2026-01-01', '2026-01-02', '2026-01-03',
			'2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
			'2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
			'2026-04-04', '2026-04-05', '2026-04-06',
			'2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
			'2026-06-19', '2026-06-20', '2026-06-21',
			'2026-09-25', '2026-09-26', '2026-09-27',
			'2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
			'2026-10-06', '2026-10-07'
		]);
		const MAKEUP_WORKDAYS = new Set([
			'2026-01-04',
			'2026-02-14', '2026-02-28',
			'2026-05-09',
			'2026-09-20', '2026-10-10'
		]);

		/** 取北京时间的日期键、星期与分钟数；nowMs 仅供测试注入。 */
		function beijingNow(nowMs) {
			const now = new Date((nowMs === undefined ? Date.now() : nowMs) + 8 * 3600 * 1000);
			const pad = (n) => (n < 10 ? '0' + n : String(n));
			return {
				key: now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()),
				weekday: now.getUTCDay(),
				minutes: now.getUTCHours() * 60 + now.getUTCMinutes()
			};
		}

		/**
		 * 是否处于工作时间（决定显示「梁文峰」还是「梁文谷」）。
		 * 法定节假日 → 谷；调休上班的周末 → 按工作日；其余按周一~周五 + 两个时段。
		 */
		function isBeijingOnDuty(nowMs) {
			const t = beijingNow(nowMs);
			if (HOLIDAYS.has(t.key)) return false;
			const workday = MAKEUP_WORKDAYS.has(t.key) || t.weekday >= 1 && t.weekday <= 5;
			if (!workday) return false;
			return t.minutes >= 9 * 60 && t.minutes < 12 * 60 || t.minutes >= 14 * 60 && t.minutes < 18 * 60;
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
				title: onDuty
					? "工作时间：工作日（含调休上班）09:00-12:00 / 14:00-18:00（北京时间）"
					: "非工作时间：法定节假日 / 周末，或休息时段 12:00-14:00 / 18:00-次日 09:00（北京时间）",
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
		/*
		 * 测试钩子：判定逻辑闭包在 bundle 内部，外部拿不到；暴露一份只读引用给
		 * test/holiday.test.mjs 做时间旅行断言（不影响运行时行为）。
		 */
		exports.__internals = { isBeijingOnDuty, beijingNow, HOLIDAYS, MAKEUP_WORKDAYS };
		return module.exports;
	}
});
