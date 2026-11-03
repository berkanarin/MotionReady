// Prints a project's build plan: scenes (frames, page band, camera), blocks per scene, copies, late blocks, load.
// A "late" block is still being built when its scene hands over to the finished capture: shorten the scene's
// content (fewer sections, more bars) until none are late. Usage: npx tsx scripts/report.ts <project>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlan } from '../src/engine/plan';
import { computeTiming } from '../src/engine/timing';
import type { Capture, ProjectConfig } from '../src/engine/types';

const name = process.argv[2];
const dir = join(process.cwd(), 'projects', name);
const cfg: ProjectConfig = { name, ...JSON.parse(readFileSync(join(dir, 'project.json'), 'utf8')) };
const cap: Capture = JSON.parse(readFileSync(join(dir, 'capture', 'blocks.json'), 'utf8'));
const T = computeTiming(cfg, cap);
const plan = getPlan(name, cfg, cap, T);
const s = (f: number) => (f / T.fps).toFixed(2) + 's';

console.log(`${name}: ${T.W}×${T.H} @${T.fps} fps, ${T.bpm} BPM, drop ${s(T.DROP)}, ${s(T.total)} total, ${plan.workers.length} cursors`);
console.log(`page ${cap.W}×${cap.H} CSS px shown at ${T.K.toFixed(3)}×, ${Math.round(T.VIEW_H)} px visible, nav ${cap.nav ? 'yes' : 'no'}, logo ${plan.logo ? 'yes' : 'no (letter tile)'}`);
console.log('sections:', cap.sections.map((x) => `${x.id}@${x.r[1]}(${x.r[3]})`).join(' '));
let late = 0;
T.scenes.forEach((sc, i) => {
  const b = plan.blocks.filter((x) => x.scene === i && !x.instant);
  const lt = b.filter((x) => plan.endOf(x) > sc.doneAt).length;
  late += lt;
  const end = b.length ? Math.max(...b.map(plan.endOf)) : sc.from;
  console.log(
    `  ${sc.id.padEnd(16)} ${s(sc.from)}–${s(sc.to)}  band ${sc.y0}–${sc.y1}  camera ${sc.rest}→${sc.restEnd}  ${String(b.length).padStart(3)} blocks, built by ${s(end)}${lt ? `  LATE ${lt}` : ''}  copies ${plan.copies.filter((c) => c.scene === i).length}`,
  );
});
console.log(T.press != null ? `finale: gather ${s(T.gather)}, press "${cfg.cta}" ${s(T.press)}, leave ${s(T.leave)}` : `finale: no CTA ${cfg.cta ? `("${cfg.cta}" not visible in the last scene)` : ''}, swarm leaves ${s(T.leave)}`);
console.log(cfg.end ? `end card ${s(T.endFrom)}–${s(T.total)}` : 'no end card');
const per = plan.workers.map((_, k) => plan.blocks.filter((b) => b.worker === k).length);
console.log(`tasks per cursor: min ${Math.min(...per)}, max ${Math.max(...per)}, idle ${per.filter((p) => !p).length}`);
if (late) process.exitCode = 2;
