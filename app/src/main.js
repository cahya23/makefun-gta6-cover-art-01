// Vice Sunset Cover Lab — editor wiring.
// Owns the state (layout, grade, words, four panels), the controls, dragging
// a photo inside its panel, and the one-click PNG export. The drawing itself
// lives in cover.js; the fixed screenshot scenes live in shots.js.
import { LAYOUTS, GRADES, SIZES, drawCoverArt, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const SAMPLES = ['boulevard', 'pier'];

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'Neon Shore',
  subtitle: 'one last summer drive',
  grain: true,
  vignette: true,
  size: 'wide',
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0, name: 'boulevard' },
    { img: null, zoom: 1, ox: 0, oy: 0, name: 'pier' },
    { img: null, zoom: 1, ox: 0, oy: 0, name: 'boulevard' },
    { img: null, zoom: 1, ox: 0, oy: 0, name: 'pier' },
  ],
};
let selected = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads a bundled sample photo into one panel. */
export async function loadSample(i, name) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.panels[i].img = img;
  state.panels[i].name = name;
  state.panels[i].zoom = 1;
  state.panels[i].ox = 0;
  state.panels[i].oy = 0;
  redraw();
}

function redraw() {
  drawCoverArt(canvas, state);
  syncPanelControls();
}

/** Builds the layout and grade choice buttons. */
export function buildChoices() {
  const layoutBox = document.getElementById('layoutChoices');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.setAttribute('aria-pressed', String(key === state.layout));
    b.addEventListener('click', () => {
      state.layout = key;
      for (const x of layoutBox.children) x.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
      redraw();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('gradeChoices');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.setAttribute('aria-pressed', String(key === state.grade));
    b.addEventListener('click', () => {
      state.grade = key;
      for (const x of gradeBox.children) x.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
      redraw();
    });
    gradeBox.appendChild(b);
  }
}

/** Builds one picker card per panel: sample buttons plus an upload. */
export function buildPanelPickers() {
  const box = document.getElementById('panelPickers');
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.textContent = `Panel ${i + 1}: ${panel.name}`;
    pick.setAttribute('aria-pressed', String(i === selected));
    pick.addEventListener('click', () => {
      selected = i;
      for (const x of box.querySelectorAll('button')) x.setAttribute('aria-pressed', 'false');
      pick.setAttribute('aria-pressed', 'true');
      syncPanelControls();
    });
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.setAttribute('aria-label', `Upload a photo for panel ${i + 1}`);
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      state.panels[i].img = await loadImage(URL.createObjectURL(f));
      state.panels[i].name = f.name.slice(0, 18) || 'your photo';
      state.panels[i].zoom = 1;
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
      pick.textContent = `Panel ${i + 1}: ${state.panels[i].name}`;
      redraw();
    });
    const swap = document.createElement('button');
    swap.type = 'button';
    swap.textContent = 'Use other sample';
    swap.addEventListener('click', async () => {
      const next = SAMPLES[(SAMPLES.indexOf(panel.name) + 1) % SAMPLES.length] || SAMPLES[0];
      await loadSample(i, next);
      pick.textContent = `Panel ${i + 1}: ${next}`;
    });
    card.append(pick, swap, file);
    box.appendChild(card);
  });
}

/** Copies the selected panel's zoom and pan into the sliders. */
export function syncPanelControls() {
  const p = state.panels[selected];
  document.getElementById('zoom').value = String(p.zoom);
  document.getElementById('panX').value = String(p.ox);
  document.getElementById('panY').value = String(p.oy);
}

/** Which panel rect holds a point on the preview canvas, or -1. */
export function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selected = i;
  syncPanelControls();
  dragging = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[selected];
  p.ox += (e.clientX - dragging.x) / r.width;
  p.oy += (e.clientY - dragging.y) / r.height;
  p.ox = Math.max(-0.4, Math.min(0.4, p.ox));
  p.oy = Math.max(-0.4, Math.min(0.4, p.oy));
  dragging = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('panX').addEventListener('input', (e) => {
  state.panels[selected].ox = Number(e.target.value);
  redraw();
});
document.getElementById('panY').addEventListener('input', (e) => {
  state.panels[selected].oy = Number(e.target.value);
  redraw();
});
document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  redraw();
});
document.getElementById('vignette').addEventListener('change', (e) => {
  state.vignette = e.target.checked;
  redraw();
});
document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
});
document.getElementById('fillAll').addEventListener('click', () => {
  const first = state.panels[0];
  for (let i = 1; i < state.panels.length; i++) {
    state.panels[i].img = first.img;
    state.panels[i].name = first.name;
  }
  for (const card of document.getElementById('panelPickers').children) {
    const pick = card.querySelector('button');
    if (pick && pick.textContent.startsWith('Panel')) {
      const n = Number(pick.textContent.replace('Panel ', '').split(':')[0]);
      pick.textContent = `Panel ${n}: ${first.name}`;
    }
  }
  redraw();
});

/** Arrow keys nudge the selected panel's photo, for fine positioning. */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const p = state.panels[selected];
  const step = 0.02;
  if (e.key === 'ArrowLeft') p.ox = Math.max(-0.4, p.ox - step);
  else if (e.key === 'ArrowRight') p.ox = Math.min(0.4, p.ox + step);
  else if (e.key === 'ArrowUp') p.oy = Math.max(-0.4, p.oy - step);
  else if (e.key === 'ArrowDown') p.oy = Math.min(0.4, p.oy + step);
  else return;
  e.preventDefault();
  redraw();
});

/** Exports the cover at the chosen post size as a PNG download. */
export function exportCover() {
  const size = SIZES[state.size] || SIZES.wide;
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  drawCoverArt(out, state);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-sunset-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-sunset-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
}
document.getElementById('export').addEventListener('click', exportCover);

/** Presses the layout and grade buttons that match the current state. */
export function syncChoices() {
  for (const box of [document.getElementById('layoutChoices'), document.getElementById('gradeChoices')]) {
    if (!box) continue;
    for (const b of box.children) b.setAttribute('aria-pressed', 'false');
  }
  const layoutLabel = LAYOUTS[state.layout]?.label;
  const gradeLabel = GRADES[state.grade]?.label;
  for (const b of document.getElementById('layoutChoices').children) {
    if (b.textContent === layoutLabel) b.setAttribute('aria-pressed', 'true');
  }
  for (const b of document.getElementById('gradeChoices').children) {
    if (b.textContent === gradeLabel) b.setAttribute('aria-pressed', 'true');
  }
}

/** Applies a shot scene's settings (layout, grade, size, words) to the state. */
export function applyShotSettings(query) {
  if (query.get('layout') && LAYOUTS[query.get('layout')]) state.layout = query.get('layout');
  if (query.get('grade') && GRADES[query.get('grade')]) state.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) {
    state.size = query.get('size');
    const size = SIZES[state.size];
    canvas.width = size.w;
    canvas.height = size.h;
  }
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  const title = document.getElementById('title');
  const subtitle = document.getElementById('subtitle');
  if (title) title.value = state.title;
  if (subtitle) subtitle.value = state.subtitle;
  syncChoices();
}

buildChoices();
buildPanelPickers();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, loadSample, applyShotSettings, redraw);
} else {
  // Default scene: the two bundled samples across the four panels.
  Promise.all([loadSample(0, 'boulevard'), loadSample(1, 'pier'), loadSample(2, 'pier'), loadSample(3, 'boulevard')])
    .then(() => document.fonts.ready.then(redraw))
    .catch(() => redraw());
}
