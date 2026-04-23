const PavilionPuzzle = (() => {
  const GAP_CX  = 772 / 1535;
  const GAP_CY  = 347 / 1024;
  const SNAP_PX = 80;
  const HINT_MS = 20000;

  const _pushAudio = new Audio('audio/push_in.wav');
  _pushAudio.preload = 'auto';
  function playPushIn() {
    if (State.get().audioMuted) return;
    try { _pushAudio.currentTime = 0; _pushAudio.play().catch(() => {}); } catch (e) {}
  }

  const _wallAudio = new Audio('audio/wall_down.wav');
  _wallAudio.preload = 'auto';
  function playWallDown() {
    if (State.get().audioMuted) return;
    try { _wallAudio.currentTime = 0; _wallAudio.play().catch(() => {}); } catch (e) {}
  }

  const SRCS = {
    exterior: 'Asset/InitialState_Building.png',
    interior: 'Asset/MidState_Building_NoCeiling.png',
    endstate: 'Asset/EndState_Building_wCeiling.png',
  };

  let viewState = 'exterior';
  let solved    = false;
  let hintTimer = null;
  let rewardPoemShown = false;

  let ghost = null;
  let ghostOffX = 0, ghostOffY = 0;
  let onDragMove = null, onDragEnd = null;

  // ── Init ─────────────────────────────────────────────────────────────

  function init() {
    solved = false; rewardPoemShown = false; viewState = 'exterior';
    Object.values(SRCS).forEach(src => { new Image().src = src; });
    buildUI();
    setupInventoryDrag();
  }

  function buildUI() {
    const screen = document.getElementById('screen-3');
    screen.classList.remove('locked');
    screen.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.id = 'pavilion-wrap';
    wrap.style.cssText = 'position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;';

    const base = document.createElement('img');
    base.id = 'pavilion-base';
    base.src = SRCS.exterior;
    base.draggable = false;
    base.style.cssText = 'max-width:100%;max-height:100%;display:block;user-select:none;cursor:pointer;';
    base.addEventListener('click', onBaseTap);

    const over = document.createElement('img');
    over.id = 'pavilion-over';
    over.src = '';
    over.draggable = false;
    over.style.cssText = 'position:absolute;inset:0;margin:auto;max-width:100%;max-height:100%;display:block;opacity:0;transition:opacity 450ms ease;pointer-events:none;user-select:none;';

    const glow = document.createElement('div');
    glow.id = 'pavilion-glow';
    glow.style.display = 'none';

    wrap.append(base, over, glow);
    screen.appendChild(wrap);
  }

  // ── Click-to-cycle views ──────────────────────────────────────────────

  function onBaseTap() {
    if (solved) {
      if (rewardPoemShown) Overlay.show('liu_dunzhen', null);
      return;
    }
    playWallDown();
    const next = viewState === 'exterior' ? 'interior' : 'exterior';
    crossfadeTo(next);
    resetHintTimer();
  }

  function crossfadeTo(to) {
    const base = document.getElementById('pavilion-base');
    const over = document.getElementById('pavilion-over');
    if (!base || !over) return;

    stopHint();
    clearGlow();
    viewState = to;

    over.src = SRCS[to];
    over.onload = () => {
      requestAnimationFrame(() => { over.style.opacity = '1'; });
      over.addEventListener('transitionend', () => {
        base.src = SRCS[to];
        over.style.opacity = '0';
        over.src = '';
        over.onload = null;
      }, { once: true });
    };

    if (to === 'interior' && !solved) startHint();
  }

  // ── Drag-and-snap ─────────────────────────────────────────────────────

  function setupInventoryDrag() {
    document.getElementById('inventory-bar')
      .addEventListener('pointerdown', onInventoryDown);
  }

  function onInventoryDown(e) {
    if (Screens.getCurrent() !== 3) return;
    if (viewState !== 'interior') return;
    if (State.get().inventory !== 'ceiling_profile') return;
    if (solved) return;

    const img = document.getElementById('inventory-item')?.querySelector('img');
    if (!img) return;

    e.preventDefault();
    const rect = img.getBoundingClientRect();
    ghostOffX = e.clientX - (rect.left + rect.width  / 2);
    ghostOffY = e.clientY - (rect.top  + rect.height / 2);

    ghost = document.createElement('img');
    ghost.src = 'Asset/CeilingProfile.png';
    ghost.draggable = false;
    ghost.style.cssText = `
      position:fixed;
      width:${Math.max(rect.width, 160) * 1.1}px;
      pointer-events:none;
      z-index:500;
      filter:drop-shadow(0 4px 10px rgba(0,0,0,0.25));
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

    const slotPos = getSlotScreenPos();
    if (!slotPos) { elasticReturn(); return; }

    const dist = Math.hypot(
      (e.clientX - ghostOffX) - slotPos.x,
      (e.clientY - ghostOffY) - slotPos.y
    );

    dist <= SNAP_PX ? snapToSlot(slotPos) : elasticReturn();
  }

  function snapToSlot(slotPos) {
    playPushIn();
    ghost.style.transition = 'left 150ms ease, top 150ms ease, transform 150ms ease';
    ghost.style.left = slotPos.x + 'px';
    ghost.style.top  = slotPos.y + 'px';
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

  function getSlotScreenPos() {
    const base = document.getElementById('pavilion-base');
    if (!base || !base.src.includes('MidState_Building_NoCeiling')) return null;
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
    crossfadeTo('endstate');

    setTimeout(() => {
      State.update({
        solved: { ...State.get().solved, pavilion: true },
        inventory: 'small_buddha',
      });
      const flyFrom = document.getElementById('pavilion-base');
      Inventory.flyIn('small_buddha', flyFrom, () => {
        Inventory.playObtained();
        rewardPoemShown = true;
        setTimeout(() => Overlay.show('liu_dunzhen', () => Inventory.pulseClue()), 1000);
      });
    }, 700);
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
    if (viewState === 'interior' && !solved) startHint();
  }

  function showGlow() {
    const glow = document.getElementById('pavilion-glow');
    if (!glow || solved || viewState !== 'interior') return;
    const pos = getSlotScreenPos();
    if (!pos) return;
    const SIZE = 120;
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
    const glow = document.getElementById('pavilion-glow');
    if (glow) { glow.style.display = 'none'; glow.className = ''; }
  }

  return { init, updateLabels: () => {} };
})();
