/**
 * 判定逻辑的时间旅行测试。
 *
 * client.js 是浏览器 bundle：它只调用 `window.__ModuleLoader__.load({id, factory})`，
 * 因此这里用假 window / 假 require 把它加载进来，再从 `exports.__internals`
 * 取判定函数，喂入指定时刻（北京时间）断言「峰 / 谷」。
 *
 * 运行：node test/holiday.test.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const BUNDLE = fileURLToPath(new URL('../client.js', import.meta.url));
const source = fs.readFileSync(BUNDLE, 'utf8');

let captured = null;
const fakeWindow = { __ModuleLoader__: { load: (mod) => { captured = mod; } } };
new Function('window', source)(fakeWindow);
assert.ok(captured, 'bundle 未调用 window.__ModuleLoader__.load');

const fakeRequire = (name) => {
  if (name === 'react') return { useState: () => [false, () => {}], useRef: () => ({ current: null }), useEffect: () => {} };
  if (name === 'react/jsx-runtime') return { jsx: () => null };
  throw new Error('unexpected require: ' + name);
};

const mod = captured.factory(fakeRequire);
assert.equal(captured.id, 'dsh-liangwenfeng-gu');
const { isBeijingOnDuty, beijingNow, HOLIDAYS, MAKEUP_WORKDAYS } = mod.__internals;

/** 构造某一个北京时间时刻的 epoch 毫秒。 */
const bj = (y, m, d, hh = 10, mm = 0) => Date.UTC(y, m - 1, d, hh, mm) - 8 * 3600 * 1000;

const cases = [
  // ── 法定节假日 → 一律「谷」（即使落在工作日、且在上班时段内） ──
  ['元旦假期首日 2026-01-01(周四) 10:00', bj(2026, 1, 1), false],
  ['元旦假期末日 2026-01-03(周六) 10:00', bj(2026, 1, 3), false],
  ['春节假期中段 2026-02-17(周二) 10:00', bj(2026, 2, 17), false],
  ['春节假期末日 2026-02-23(周一) 15:00', bj(2026, 2, 23, 15), false],
  ['清明节 2026-04-06(周一) 10:00', bj(2026, 4, 6), false],
  ['劳动节 2026-05-01(周五) 10:00', bj(2026, 5, 1), false],
  ['端午节 2026-06-19(周五) 10:00', bj(2026, 6, 19), false],
  ['中秋节 2026-09-25(周五) 10:00', bj(2026, 9, 25), false],
  ['国庆假期 2026-10-07(周三) 10:00', bj(2026, 10, 7), false],

  // ── 调休上班的周末 → 按工作日规则（在时段内即「峰」） ──
  ['调休上班 2026-01-04(周日) 10:00', bj(2026, 1, 4), true],
  ['调休上班 2026-02-14(周六) 10:00', bj(2026, 2, 14), true],
  ['调休上班 2026-02-28(周六) 10:00', bj(2026, 2, 28), true],
  ['调休上班 2026-05-09(周六) 10:00', bj(2026, 5, 9), true],
  ['调休上班 2026-09-20(周日) 10:00', bj(2026, 9, 20), true],
  ['调休上班 2026-10-10(周六) 10:00', bj(2026, 10, 10), true],
  ['调休上班 2026-10-10(周六) 12:30 午休 → 谷', bj(2026, 10, 10, 12, 30), false],

  // ── 普通工作日 / 周末 ──
  ['普通周二 2026-10-13 10:00', bj(2026, 10, 13), true],
  ['普通周五 2026-10-16 10:00', bj(2026, 10, 16), true],
  ['普通周六 2026-10-17 10:00', bj(2026, 10, 17), false],
  ['普通周日 2026-10-18 10:00', bj(2026, 10, 18), false],
  ['普通周一 2026-10-19 10:00', bj(2026, 10, 19), true],

  // ── 时段边界（工作日 2026-10-16 周五） ──
  ['08:59 → 谷', bj(2026, 10, 16, 8, 59), false],
  ['09:00 → 峰', bj(2026, 10, 16, 9, 0), true],
  ['11:59 → 峰', bj(2026, 10, 16, 11, 59), true],
  ['12:00 → 谷（午休）', bj(2026, 10, 16, 12, 0), false],
  ['13:59 → 谷（午休）', bj(2026, 10, 16, 13, 59), false],
  ['14:00 → 峰', bj(2026, 10, 16, 14, 0), true],
  ['17:59 → 峰', bj(2026, 10, 16, 17, 59), true],
  ['18:00 → 谷', bj(2026, 10, 16, 18, 0), false],
  ['次日 08:59 → 谷', bj(2026, 10, 17, 8, 59), false]
];

let failed = 0;
for (const [label, ts, expected] of cases) {
  const actual = isBeijingOnDuty(ts);
  const mark = actual === expected ? '✓' : '✗';
  if (actual !== expected) failed += 1;
  console.log(`${mark} ${label} → ${actual ? '峰' : '谷'}（期望 ${expected ? '峰' : '谷'}）`);
}

// 日历表自身的完整性
const all = [...HOLIDAYS];
assert.equal(all.length, 33, `2026 法定节假日天数应为 33，实际 ${all.length}`);
assert.equal(MAKEUP_WORKDAYS.size, 6, `2026 调休上班日应为 6 天，实际 ${MAKEUP_WORKDAYS.size}`);
for (const k of all) assert.match(k, /^\d{4}-\d{2}-\d{2}$/, `日期格式不对: ${k}`);
for (const k of MAKEUP_WORKDAYS) assert.ok(!HOLIDAYS.has(k), `${k} 不能同时是假期和调休上班日`);
console.log(`\n日历：法定节假日 ${HOLIDAYS.size} 天，调休上班 ${MAKEUP_WORKDAYS.size} 天`);

// 北京时间的日期键不随本地时区变化
const t = beijingNow(bj(2026, 10, 16, 0, 30));
assert.deepEqual(t, { key: '2026-10-16', weekday: 5, minutes: 30 }, 'beijingNow 结果异常');

if (failed) {
  console.error(`\n${failed} 个断言失败`);
  process.exit(1);
}
console.log('\n全部通过 ✅');
