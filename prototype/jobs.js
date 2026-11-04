// A16: a long export keeps its progress in view until it ends, wherever the filmmaker goes meanwhile: what it's
// doing, how far it is, a way to stop it, and, if it fails, a way to try again. One card in the corner of the page,
// outside the panels that come and go. Screen readers hear each new phase and the end, never every frame.
//
//   const job = jobs.start('MP4 video', { cancel: true, retry: () => again() });
//   job.phase('Drawing the frames'); job.progress(0.42, 'Frame 51 of 120');
//   job.check();      // throws a Stopped error once the filmmaker has pressed Stop
//   job.done('Downloaded'); or job.fail(error)
export class Stopped extends Error { constructor() { super('Stopped'); this.name = 'Stopped'; } }

export function jobTray(h) {
  let box = null, live = null;
  const ensure = () => {
    if (box && document.body.contains(box)) return;
    box = h('div', { class: 'jobs', role: 'region', 'aria-label': 'Exports in progress' });
    live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    document.body.append(box, live);
  };
  const say = (t) => { if (live) { live.textContent = ''; requestAnimationFrame(() => (live.textContent = t)); } };

  function start(label, o = {}) {
    ensure();
    let stopped = false, ended = false, lastPhase = '';
    const bar = h('i'), meter = h('div', { class: 'meter', role: 'progressbar', 'aria-label': label + ' progress', 'aria-valuemin': '0', 'aria-valuemax': '100' }, bar);
    const what = h('b', {}, label), phaseEl = h('span', { class: 'phase' }), detail = h('span', { class: 'detail' });
    const acts = h('div', { class: 'acts' });
    const card = h('div', { class: 'job' }, h('div', { class: 'top' }, what, detail), phaseEl, meter, acts);
    const stopBtn = o.cancel ? h('button', { class: 'btn small ghost', onclick: () => { stopped = true; stopBtn.disabled = true; stopBtn.textContent = 'Stopping…'; } }, 'Stop') : null;
    if (stopBtn) acts.append(stopBtn);
    // a job that ends within a moment never shows: quick downloads shouldn't flash a card
    // a stop or a failure always shows, however quickly it came; a job still running shows once it's taken a moment
    const reveal = (always) => { if ((always || !ended) && !card.isConnected) { box.append(card); if (!always) say(`${label}: ${lastPhase || 'started'}`); } };
    const timer = setTimeout(reveal, o.delay ?? 500);
    const remove = (after) => setTimeout(() => card.remove(), after);
    const job = {
      get stopped() { return stopped; },
      check() { if (stopped) throw new Stopped(); },
      phase(t) { if (t === lastPhase) return; lastPhase = t; phaseEl.textContent = t; if (card.isConnected) say(`${label}: ${t}`); },
      progress(p, text) {
        if (p == null) { meter.classList.add('busy'); meter.removeAttribute('aria-valuenow'); }
        else { meter.classList.remove('busy'); const v = Math.round(Math.max(0, Math.min(1, p)) * 100); bar.style.width = v + '%'; meter.setAttribute('aria-valuenow', String(v)); }
        if (text != null) detail.textContent = text;
      },
      done(t = 'Done') {
        ended = true; clearTimeout(timer);
        if (!card.isConnected) return;
        card.classList.add('ok'); phaseEl.textContent = t; detail.textContent = ''; bar.style.width = '100%'; acts.innerHTML = ''; say(`${label}: ${t}`);
        remove(2400);
      },
      stop(t = 'Stopped. Nothing was downloaded.') {
        ended = true; clearTimeout(timer);
        reveal(true); card.classList.add('stopped'); phaseEl.textContent = t; detail.textContent = ''; acts.innerHTML = ''; say(`${label}: ${t}`);
        remove(3200);
      },
      fail(e) {
        ended = true; clearTimeout(timer); reveal(true);
        const msg = (e && e.message) || String(e || 'Something went wrong');
        card.classList.add('failed'); phaseEl.textContent = 'It stopped: ' + msg; detail.textContent = ''; acts.innerHTML = '';
        if (o.retry) acts.append(h('button', { class: 'btn small primary', onclick: () => { card.remove(); o.retry(); } }, 'Try again'));
        acts.append(h('button', { class: 'btn small ghost', onclick: () => card.remove() }, 'Dismiss'));
        say(`${label} stopped: ${msg}`);
      },
    };
    return job;
  }
  return { start };
}
