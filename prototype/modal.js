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
