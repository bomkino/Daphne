// D06: one dialog at a time owns the keyboard. While it's open the page behind it is inert (no focus, no clicks),
// Escape closes only the dialog on top, and focus goes back where it was.
export function holdFocus(scrim, close) {
  const prev = document.activeElement, set = [];
  for (const el of document.body.children) if (el !== scrim && el.id !== 'toasts' && !el.inert) { el.inert = true; set.push(el); }
  const onKey = (e) => {
    const all = document.querySelectorAll('.scrim'); if (all[all.length - 1] !== scrim) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
  };
  window.addEventListener('keydown', onKey, true);
  return () => {
    window.removeEventListener('keydown', onKey, true);
    for (const el of set) el.inert = false;
    if (prev && prev.focus && document.contains(prev)) prev.focus();
  };
}

// D10: rebuilding a panel puts focus back on the same control (found by what it's called and which field it's in),
// so a keyboard user never drops to the page body when the editor redraws itself
const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]';
const keyOf = (el) => [el.tagName, el.type || '', el.getAttribute('role') || '', el.getAttribute('aria-label') || el.title || el.name || el.id || el.textContent.trim().slice(0, 40), el.closest('[data-id]')?.dataset.id || ''].join('|');
export function keepFocus(container, rebuild) {
  const a = document.activeElement, had = a && a !== document.body && container.contains(a);
  if (!had) return rebuild();
  const key = keyOf(a), nth = [...container.querySelectorAll(FOCUSABLE)].filter((el) => keyOf(el) === key).indexOf(a);
  const sel = a.selectionStart != null && /^(text|search|url|tel|number)?$/.test(a.type || '') ? [a.selectionStart, a.selectionEnd] : null;
  const out = rebuild();
  if (document.activeElement && document.activeElement !== document.body && document.activeElement !== a) return out;
  if (container.contains(a)) return out;
  const same = [...container.querySelectorAll(FOCUSABLE)].filter((el) => keyOf(el) === key), m = same[Math.max(0, nth)] || same[0];
  if (m) { m.focus({ preventScroll: true }); if (sel) try { m.setSelectionRange(...sel); } catch { /* not a text field */ } }
  return out;
}
