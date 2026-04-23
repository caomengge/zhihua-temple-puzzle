const Screens = (() => {
  let current = 1;

  const _slideAudio = new Audio('audio/slide.wav');
  _slideAudio.preload = 'auto';
  function playSlide() {
    if (State.get().audioMuted) return;
    try { _slideAudio.currentTime = 0; _slideAudio.play().catch(() => {}); } catch (e) {}
  }

  function init() {
    document.getElementById('prev-btn').addEventListener('click', () => { playSlide(); goTo(current - 1); });
    document.getElementById('next-btn').addEventListener('click', () => { playSlide(); goTo(current + 1); });

    // Swipe support
    let touchStartX = 0;
    const area = document.getElementById('canvas-area');
    area.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    area.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') goTo(current + 1);
      if (e.key === 'ArrowLeft')  goTo(current - 1);
    });

    // Progress dot clicks re-open solved poem
    document.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const n = parseInt(dot.dataset.puzzle);
        const keys = ['shen_tingfang', 'wang_zhen', 'liu_dunzhen', 'laurence_sickman'];
        const solved = State.get().solved;
        const solvedArr = [solved.stele, solved.ceiling, solved.pavilion, solved.niche];
        if (solvedArr[n - 1]) Overlay.show(keys[n - 1], null);
        else goTo(n);
      });
    });

    updateDots();
    updateLockedScreens();
    updateNavArrows();
    CeilingPuzzle.init();
    PavilionPuzzle.init();
    NichePuzzle.init();
    State.onChange(() => { updateDots(); updateLockedScreens(); });
  }

  function goTo(n) {
    if (n < 1 || n > 4) return;
    current = n;
    State.update({ currentScreen: n });

    document.querySelectorAll('.puzzle-screen').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === n);
    });

    updateNavArrows();
    updateDots();
    updateLockedScreens();
  }

  function updateNavArrows() {
    document.getElementById('prev-btn').style.visibility = current > 1 ? 'visible' : 'hidden';
    document.getElementById('next-btn').style.visibility = current < 4 ? 'visible' : 'hidden';
  }

  function updateDots() {
    const s = State.get().solved;
    const solvedArr = [s.stele, s.ceiling, s.pavilion, s.niche];
    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('solved', solvedArr[i]);
      dot.classList.toggle('active', i + 1 === current);
    });
  }

  function updateLockedScreens() {
    document.querySelectorAll('.puzzle-screen').forEach(el => {
      el.classList.remove('locked');
      el.querySelector('.not-yet-overlay')?.classList.add('hidden');
    });
  }

  function getCurrent() { return current; }

  return { init, goTo, getCurrent };
})();
