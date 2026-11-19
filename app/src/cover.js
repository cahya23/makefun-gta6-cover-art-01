// Vice Sunset Cover Lab — cover engine.
// Draws a multi-panel poster cover on any canvas: the panels are cut from the
// user's photos, a sunset or neon grade washes over them, and the title is
// lettered big in Anton with a Pacifico script subtitle underneath.
// Everything here is drawn by hand on a 2D canvas; no artwork is borrowed.

export const LAYOUTS = {
  hero: { label: 'Hero + 3 panels', panels: 4 },
  grid: { label: 'Four-panel grid', panels: 4 },
  full: { label: 'Full-bleed single', panels: 1 },
  tilt: { label: 'Tilted trio', panels: 3 },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset', sky: ['#ff9a3d', '#ff5e7a', '#7a2d8f'], wash: 'rgba(255, 94, 122, 0.28)', deep: '#1c0b2e' },
  neon: { label: 'Neon Nights', sky: ['#00e5c7', '#ff2e88', '#2b0a4d'], wash: 'rgba(0, 229, 199, 0.22)', deep: '#0a0618' },
  dusk: { label: 'Palm Dusk', sky: ['#ffd166', '#f4845f', '#3d2b63'], wash: 'rgba(244, 132, 95, 0.26)', deep: '#171233' },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** Panel rectangles for a layout, as fractions of the cover, with a gutter. */
export function panelRects(layout, w, h) {
  const g = 0.012; // gutter as a share of the short side
  const gw = w * g;
  const gh = h * g;
  const full = [{ x: 0, y: 0, w, h }];
  if (layout === 'full') return full;
  if (layout === 'grid') {
    const cw = (w - gw) / 2;
    const ch = (h - gh) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + gw, y: 0, w: cw, h: ch },
      { x: 0, y: ch + gh, w: cw, h: ch },
      { x: cw + gw, y: ch + gh, w: cw, h: ch },
    ];
  }
  if (layout === 'tilt') {
    const cw = (w - gw * 2) / 3;
    const top = h * 0.62;
    return [
      { x: 0, y: 0, w: cw, h: top, tilt: -0.02 },
      { x: cw + gw, y: 0, w: cw, h: top, tilt: 0.015 },
      { x: (cw + gw) * 2, y: 0, w: cw, h: top, tilt: -0.01 },
    ];
  }
  // hero: one big panel on top, three small ones along the bottom.
  const heroH = h * 0.64;
  const rowH = h - heroH - gh;
  const cw = (w - gw * 2) / 3;
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: heroH + gh, w: cw, h: rowH },
    { x: cw + gw, y: heroH + gh, w: cw, h: rowH },
    { x: (cw + gw) * 2, y: heroH + gh, w: cw, h: rowH },
  ];
}

/** Draws one photo into a panel rect, cropped to fill, with zoom and pan. */
export function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  if (!img || !img.naturalWidth) return false;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (rect.tilt) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.tilt);
    ctx.translate(-rect.x - rect.w / 2, -rect.y - rect.h / 2);
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (oy || 0) * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
  return true;
}

/** Washes a colour grade over a panel: a sky gradient plus a warm tint. */
export function gradePanel(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, grade.sky[0] + '55');
  g.addColorStop(0.55, grade.sky[1] + '44');
  g.addColorStop(1, grade.sky[2] + '66');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Bold outlined title with a soft shadow, shrinking until it fits. */
export function drawTitle(ctx, text, x, y, maxW, size, color) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  let s = size;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (s > 18) {
    ctx.font = `${s}px Anton, "Arial Black", sans-serif`;
    if (ctx.measureText(clean).width <= maxW) break;
    s -= 4;
  }
  ctx.font = `${s}px Anton, "Arial Black", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, s * 0.09);
  ctx.strokeStyle = 'rgba(10, 4, 24, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = s * 0.22;
  ctx.shadowOffsetY = s * 0.05;
  ctx.strokeText(clean, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = color;
  ctx.fillText(clean, x, y);
  return s;
}

/** A thin neon underline bar under the title, in the grade's bright colour. */
export function drawTitleBar(ctx, x, y, w, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w, Math.max(4, w * 0.012));
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(x - w / 2, y, w * 0.35, Math.max(4, w * 0.012));
}

/** Speckled film grain over the whole cover, seeded so an export is reproducible. */
export function applyGrain(ctx, w, h, amount) {
  let seed = 20261119;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dots = Math.floor((w * h) / 900);
  ctx.save();
  ctx.globalAlpha = amount;
  for (let i = 0; i < dots; i++) {
    const v = next() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(next() * w, next() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** Darkens the corners so the middle of the poster pops. */
export function applyVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,2,20,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover. `state` holds layout, grade, title, subtitle,
 * grain, vignette and panels: [{ img, zoom, ox, oy }] — one per panel slot.
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const p = panels[i] || {};
    const painted = drawPanelPhoto(ctx, p.img || null, rect, p.zoom ?? 1, p.ox ?? 0, p.oy ?? 0);
    if (!painted) {
      // Empty panel: a sunset gradient with palm-stripe silhouettes.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, grade.sky[0]);
      g.addColorStop(0.6, grade.sky[1]);
      g.addColorStop(1, grade.sky[2]);
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(20,6,32,0.35)';
      for (let s = 0; s < 3; s++) {
        ctx.fillRect(rect.x + rect.w * (0.15 + s * 0.3), rect.y + rect.h * 0.55, rect.w * 0.03, rect.h * 0.45);
      }
    }
    gradePanel(ctx, rect, grade);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  });

  // Title block: a dark band across the lower part of the cover, kept shallow
  // so the bottom panels stay visible beneath the lettering.
  const bandH = h * (state.layout === 'full' ? 0.24 : 0.15);
  const bandY = h - bandH;
  ctx.fillStyle = 'rgba(12, 4, 26, 0.78)';
  ctx.fillRect(0, bandY, w, bandH);
  const bar = ctx.createLinearGradient(0, bandY, w, bandY);
  bar.addColorStop(0, grade.sky[0]);
  bar.addColorStop(0.5, grade.sky[1]);
  bar.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = bar;
  ctx.fillRect(0, bandY, w, Math.max(4, h * 0.008));
  const titleSize = drawTitle(ctx, state.title, w / 2, bandY + bandH * 0.42, w * 0.9, h * 0.11, '#ffffff');
  if (state.subtitle && state.subtitle.trim()) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(16, h * 0.032)}px Pacifico, cursive`;
    ctx.fillStyle = grade.sky[0];
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText(state.subtitle.trim(), w / 2, bandY + bandH * 0.78);
    ctx.shadowBlur = 0;
  }
  drawTitleBar(ctx, w / 2, bandY + bandH * 0.62, w * 0.22, grade.sky[1]);
  if (state.vignette) applyVignette(ctx, w, h);
  if (state.grain) applyGrain(ctx, w, h, 0.07);
  return { titleSize: titleSize || 0, panels: rects.length };
}
