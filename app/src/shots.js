// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the finished cover alone, edge to edge.
// Query keys: layout, grade, size (square/portrait/wide), photo, caption,
// subtitle. window.__shotReady is set once the cover is painted.
export async function runShot(shot, query, state, loadSample, applyShotSettings, redraw) {
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    document.title = 'Vice Sunset Cover Lab — exported cover';
  }
  if (shot !== 'cover' && shot !== 'editor') {
    window.__shotReady = true;
    return;
  }
  applyShotSettings(query);
  const photo = query.get('photo') ?? 'pier';
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  await loadSample(0, photo);
  await loadSample(1, other);
  await loadSample(2, other);
  await loadSample(3, photo);
  await document.fonts.ready;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
