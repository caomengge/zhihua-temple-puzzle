function main() {
  function applyLocale() {
    const l = I18n.getLocale();
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.textContent = l === 'en' ? 'EN / 中' : '中 / EN';
    });
    document.querySelectorAll('.not-yet-text').forEach(el => {
      el.textContent = I18n.t('not_yet');
    });
  }

  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.addEventListener('click', () => { I18n.toggle(); applyLocale(); });
  });
  document.addEventListener('localechange', () => {
    applyLocale();
    CeilingPuzzle.updateLabels();
    PavilionPuzzle.updateLabels();
    NichePuzzle.updateLabels();
  });

  // Mute toggle
  document.getElementById('mute-btn').addEventListener('click', () => {
    const muted = !State.get().audioMuted;
    State.update({ audioMuted: muted });
    document.getElementById('mute-btn').textContent = muted ? '♪̶' : '♪';
    document.getElementById('mute-btn').classList.toggle('muted', muted);
  });

  applyLocale();
}

function startGameWithLocale(locale) {
  I18n.setLocale(locale);
  const title = document.getElementById('title-screen');
  title.classList.add('fade-out');
  setTimeout(() => {
    title.style.display = 'none';
    document.getElementById('game-screen').classList.add('active');
    Screens.init();
    StelePuzzle.init();
    Inventory.render(null);
  }, 500);
}

main();
