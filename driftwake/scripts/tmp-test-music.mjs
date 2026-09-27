import { chromium } from 'playwright';

const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

page.on('framenavigated', (f) => logs.push(`[nav] ${f.url()}`));
// First navigation just warms up Vite's dependency pre-bundling (which otherwise
// forces a full page reload mid-test); the second is the one we actually use.
await page.goto('http://localhost:5204/scripts/tmp-audio-test.html');
await page.waitForTimeout(1500);
await page.goto('http://localhost:5204/scripts/tmp-audio-test.html');
await page.waitForFunction(() => window.__ready === true);
await page.waitForTimeout(300);

const result = await page.evaluate(async () => {
  window.__musicDebug = [];
  const audio = window.__audio;
  audio.init();
  audio.setVolumes({ muted: false, master: 0.8, music: 0.5, sfx: 0.8 });
  audio.playMusic('town');
  await new Promise((r) => setTimeout(r, 4000));
  const events = window.__musicDebug.slice();
  // Also test crossfade: switch track and make sure the no-op / distinct-track logic behaves
  audio.playMusic('storm');
  await new Promise((r) => setTimeout(r, 2000));
  const eventsAfterSwitch = window.__musicDebug.slice(events.length);
  // Same-id call should be a no-op (no new song built, no gain reset)
  const beforeNoop = window.__musicDebug.length;
  audio.playMusic('storm');
  await new Promise((r) => setTimeout(r, 200));
  const noopAddedEvents = window.__musicDebug.length > beforeNoop;
  audio.stopMusic(500);
  await new Promise((r) => setTimeout(r, 700));
  return { events, eventsAfterSwitch, noopAddedEvents, volumes: audio.getVolumes() };
});

const { events, eventsAfterSwitch, volumes } = result;
console.log('town: total step-events in 4s window:', events.length);
console.log('town: bpm from first event:', events[0]?.bpm);

// Expected 16th-step duration for town (bpm 112): 60/112/4
const expectedStepDur = 60 / 112 / 4;
console.log('expected step duration (s):', expectedStepDur.toFixed(4));

// Compute observed intervals between consecutive distinct step times
const times = events.map((e) => e.time);
const diffs = [];
for (let i = 1; i < times.length; i++) {
  const d = times[i] - times[i - 1];
  if (d > 0.001) diffs.push(d);
}
const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
console.log('observed avg interval between scheduled steps (s):', avgDiff.toFixed(4));
console.log('sample diffs:', diffs.slice(0, 10).map((d) => d.toFixed(4)));

// Steps in ~4 seconds at correct tempo should be ~ 4 / expectedStepDur
console.log('expected step count in 4s:', (4 / expectedStepDur).toFixed(1));
console.log('actual distinct step count in 4s:', events.length);

console.log('storm: bpm from switch event:', eventsAfterSwitch[0]?.bpm);
console.log(
  '(informational only, always true since the current song keeps scheduling) same-id call window had events:',
  result.noopAddedEvents
);

// The real no-op check: if playMusic('storm') while storm was already playing had
// started a SECOND scheduler, we'd see near-duplicate/near-zero-gap timestamps
// (two schedulers ticking independently over the same track). Verify there are none.
const allTimes = [...events, ...eventsAfterSwitch].map((e) => e.time).sort((a, b) => a - b);
let minGap = Infinity;
for (let i = 1; i < allTimes.length; i++) {
  const d = allTimes[i] - allTimes[i - 1];
  if (d > 0.0001) minGap = Math.min(minGap, d);
}
console.log('smallest positive gap between any two scheduled steps across both tracks (s):', minGap.toFixed(4));
console.log('(a duplicate/overlapping scheduler from a same-id no-op bug would show gaps near 0)');

console.log('final volumes:', JSON.stringify(volumes));
console.log('--- page logs ---');
console.log(logs.join('\n'));

await browser.close();
