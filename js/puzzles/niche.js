const NichePuzzle = (() => {
  const GAP_CX  = 624 / 1254;
  const GAP_CY  = 629 / 1254;
  const SNAP_PX = 60;
  const HINT_MS = 20000;

  const SRCS = {
    wall:     'Asset/Initialstate_niche.png',
    closeup:  'Asset/Initialstate_niche_closeup.png',
    endstate: 'Asset/Finalstate_niche_closeup.png',
  };

  const _pushAudio = new Audio('audio/push_in.wav');
  _pushAudio.preload = 'auto';
  function playPushIn() {
    if (State.get().audioMuted) return;
    try { _pushAudio.currentTime = 0; _pushAudio.play().catch(() => {}); } catch (e) {}
  }

  const _walkAudio = new Audio('audio/walk.wav');
  _walkAudio.preload = 'auto';
  function playWalk() {
    if (State.get().audioMuted) return;
    try { _walkAudio.currentTime = 0; _walkAudio.play().catch(() => {}); } catch (e) {}
  }

  const FIGURES = [
    { key: 'shen_tingfang',    name_en: 'Shen Tingfang',    name_zh: '沈廷芳', img: 'EmptyStele.png'           },
    { key: 'wang_zhen',        name_en: 'Wang Zhen',        name_zh: '王振',   img: 'Ceiling.png'              },
    { key: 'liu_dunzhen',      name_en: 'Liu Dunzhen',      name_zh: '劉敦楨', img: 'InitialState_Building.png' },
    { key: 'laurence_sickman', name_en: 'Laurence Sickman', name_zh: '史克門', img: 'Buddha.png'               },
  ];

  let viewState = 'wall';
  let solved    = false;
  let hintTimer = null;
  let rewardPoemShown = false;

  let ghost = null;
  let ghostOffX = 0, ghostOffY = 0;
  let onDragMove = null, onDragEnd = null;

  // ── Init ─────────────────────────────────────────────────────────────

  function init() {
    solved = false; rewardPoemShown = false; viewState = 'wall';
    Object.values(SRCS).forEach(src => { new Image().src = src; });
    buildUI();
    setupInventoryDrag();
  }

  function buildUI() {
    const screen = document.getElementById('screen-4');
    screen.classList.remove('locked');
    screen.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.id = 'niche-wrap';
    wrap.style.cssText = 'position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;';

    const base = document.createElement('img');
    base.id = 'niche-base';
    base.src = SRCS.wall;
    base.draggable = false;
    base.style.cssText = 'max-width:100%;max-height:100%;display:block;user-select:none;cursor:pointer;';
    base.addEventListener('click', onBaseTap);

    const over = document.createElement('img');
    over.id = 'niche-over';
    over.src = '';
    over.draggable = false;
    over.style.cssText = 'position:absolute;inset:0;margin:auto;max-width:100%;max-height:100%;display:block;opacity:0;transition:opacity 450ms ease;pointer-events:none;user-select:none;';

    const glow = document.createElement('div');
    glow.id = 'niche-glow';
    glow.style.display = 'none';

    wrap.append(base, over, glow);
    screen.appendChild(wrap);
  }

  // ── Click-to-zoom ─────────────────────────────────────────────────────

  function onBaseTap() {
    if (solved) {
      if (rewardPoemShown) Overlay.show('laurence_sickman', null);
      return;
    }
    playWalk();
    const next = viewState === 'wall' ? 'closeup' : 'wall';
    crossfadeTo(next);
    resetHintTimer();
  }

  function crossfadeTo(to) {
    const base = document.getElementById('niche-base');
    const over = document.getElementById('niche-over');
    if (!base || !over) return;

    stopHint();
    clearGlow();
    viewState = to;

    over.src = SRCS[to];
    over.onload = () => {
      requestAnimationFrame(() => { over.style.opacity = '1'; });
      over.addEventListener('transitionend', () => {
        base.src = SRCS[to];
        base.style.cursor = 'pointer';
        over.style.opacity = '0';
        over.src = '';
        over.onload = null;
      }, { once: true });
    };

    if (to === 'closeup' && !solved) startHint();
  }

  // ── Drag-and-snap ─────────────────────────────────────────────────────

  function setupInventoryDrag() {
    document.getElementById('inventory-bar')
      .addEventListener('pointerdown', onInventoryDown);
  }

  function onInventoryDown(e) {
    if (Screens.getCurrent() !== 4) return;
    if (viewState !== 'closeup') return;
    if (State.get().inventory !== 'small_buddha') return;
    if (solved) return;

    const img = document.getElementById('inventory-item')?.querySelector('img');
    if (!img) return;

    e.preventDefault();
    const rect = img.getBoundingClientRect();
    ghostOffX = e.clientX - (rect.left + rect.width  / 2);
    ghostOffY = e.clientY - (rect.top  + rect.height / 2);

    ghost = document.createElement('img');
    ghost.src = 'Asset/Buddha.png';
    ghost.draggable = false;
    ghost.style.cssText = `
      position:fixed;
      width:${Math.max(rect.width, 80) * 1.0}px;
      pointer-events:none;
      z-index:500;
      filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      transform:translate(-50%,-50%) scale(0.9);
      left:${e.clientX - ghostOffX}px;
      top:${e.clientY  - ghostOffY}px;
      transition:none;
    `;
    document.body.appendChild(ghost);

    onDragMove = ev => {
      ghost.style.left = (ev.clientX - ghostOffX) + 'px';
      ghost.style.top  = (ev.clientY - ghostOffY) + 'px';
    };
    onDragEnd = ev => endDrag(ev);

    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup',   onDragEnd);
    resetHintTimer();
  }

  function endDrag(e) {
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup',   onDragEnd);
    onDragMove = onDragEnd = null;
    if (!ghost) return;

    const nichePos = getNicheScreenPos();
    if (!nichePos) { elasticReturn(); return; }

    const dist = Math.hypot(
      (e.clientX - ghostOffX) - nichePos.x,
      (e.clientY - ghostOffY) - nichePos.y
    );

    dist <= SNAP_PX ? snapToNiche(nichePos) : elasticReturn();
  }

  function snapToNiche(nichePos) {
    playPushIn();
    ghost.style.transition = 'left 150ms ease, top 150ms ease, transform 150ms ease';
    ghost.style.left = nichePos.x + 'px';
    ghost.style.top  = nichePos.y + 'px';
    ghost.style.transform = 'translate(-50%,-50%) scale(1)';
    setTimeout(() => { ghost?.remove(); ghost = null; runReward(); }, 180);
  }

  function elasticReturn() {
    if (!ghost) return;
    const invImg = document.getElementById('inventory-item')?.querySelector('img');
    if (!invImg) { ghost.remove(); ghost = null; return; }

    const r = invImg.getBoundingClientRect();
    const anim = ghost.animate([
      { left: ghost.style.left, top: ghost.style.top,
        transform: 'translate(-50%,-50%) scale(0.9)' },
      { left: (r.left + r.width / 2) + 'px', top: (r.top + r.height / 2) + 'px',
        transform: 'translate(-50%,-50%) scale(0.5)', opacity: '0.7' },
    ], { duration: 220, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = () => { ghost?.remove(); ghost = null; };
  }

  function getNicheScreenPos() {
    const base = document.getElementById('niche-base');
    if (!base || !base.src.includes('Initialstate_niche_closeup')) return null;
    const rect = base.getBoundingClientRect();
    return {
      x: rect.left + GAP_CX * rect.width,
      y: rect.top  + GAP_CY * rect.height,
    };
  }

  // ── Reward ────────────────────────────────────────────────────────────

  function runReward() {
    solved = true;
    stopHint(); clearGlow();

    // Glow the buddha figurine before crossfading
    const base = document.getElementById('niche-base');
    if (base) {
      base.style.transition = 'filter 500ms ease';
      base.style.filter = 'brightness(1.06) drop-shadow(0 0 10px rgba(139,106,63,0.7))';
    }

    setTimeout(() => {
      if (base) { base.style.transition = ''; base.style.filter = ''; }
      crossfadeTo('endstate');

      setTimeout(() => {
        State.update({
          solved: { ...State.get().solved, niche: true },
          inventory: null,
        });
        Inventory.render(null);

        rewardPoemShown = true;
        Overlay.show('laurence_sickman', () => showEndScreen());
      }, 700);
    }, 600);
  }

  // ── End Screen ───────────────────────────────────────────────────────

  function showEndScreen() {
    let end = document.getElementById('end-screen');
    if (!end) {
      end = document.createElement('div');
      end.id = 'end-screen';
      document.body.appendChild(end);
    }

    end.innerHTML = `
      <div class="end-figures">
        ${FIGURES.map(f => `
          <button class="end-figure-btn" data-key="${f.key}" aria-label="${f.name_en}">
            <img src="Asset/${f.img}" draggable="false" alt="${f.name_en}">
          </button>
        `).join('')}
      </div>
      <div class="end-actions">
        <button class="btn-secondary" id="end-start-over">${I18n.t('start_over')}</button>
      </div>
    `;

    end.querySelectorAll('.end-figure-btn').forEach(btn => {
      btn.addEventListener('click', () => Overlay.show(btn.dataset.key, null));
    });

    document.getElementById('end-start-over').addEventListener('click', () => {
      location.reload();
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        end.classList.add('visible');
        if (!State.get().audioMuted) {
          const bell = new Audio('audio/bell.wav');
          bell.play().catch(() => {});
        }
      });
    });
  }

  // ── Hints ─────────────────────────────────────────────────────────────

  function startHint() {
    stopHint();
    hintTimer = setTimeout(showGlow, HINT_MS);
  }

  function stopHint() { clearTimeout(hintTimer); hintTimer = null; }

  function resetHintTimer() {
    State.resetIdle();
    clearGlow();
    if (viewState === 'closeup' && !solved) startHint();
  }

  function showGlow() {
    const glow = document.getElementById('niche-glow');
    if (!glow || solved || viewState !== 'closeup') return;
    const pos = getNicheScreenPos();
    if (!pos) return;
    const SIZE = 80;
    Object.assign(glow.style, {
      display: 'block',
      position: 'fixed',
      left: (pos.x - SIZE / 2) + 'px',
      top:  (pos.y - SIZE / 2) + 'px',
      width:  SIZE + 'px',
      height: SIZE + 'px',
      borderRadius: '50%',
    });
    glow.className = 'ceiling-hint-gap';
  }

  function clearGlow() {
    const glow = document.getElementById('niche-glow');
    if (glow) { glow.style.display = 'none'; glow.className = ''; }
  }

  return { init, updateLabels: () => {} };
})();
