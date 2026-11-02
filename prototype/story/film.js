// The film of Daphne's story, between the scroll story and the chapter after it.
// A phone held upright gets the upright cut, made for it, not cropped, and nothing of the film
// loads until its section is a screen away. Without JavaScript the 16:9 film plays.
const screen = document.getElementById('screen'), video = document.getElementById('film');
if (screen && video && window.matchMedia) {
  const tall = matchMedia('(max-aspect-ratio: 4/5)');
  const pick = () => {
    if (!video.paused || video.currentTime > 0) return; // never swap under someone watching
    const name = tall.matches ? '9x16' : '16x9';
    if (video.dataset.size === name) return;
    video.dataset.size = name;
    screen.classList.toggle('tall', tall.matches);
    video.poster = `poster-${name}.webp`;
    video.querySelector('source').src = `daphne-story-${name}.mp4`;
    if (video.preload !== 'none') video.load(); // otherwise near() loads it
  };
  pick();
  if (tall.addEventListener) tall.addEventListener('change', pick); else tall.addListener(pick);
  const near = () => { if (video.preload !== 'none') return; if (video.paused && !video.currentTime) video.load(); video.preload = 'metadata'; };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { near(); o.disconnect(); } }, { rootMargin: '0px 0px 100% 0px' }).observe(screen);
  } else near();
}
