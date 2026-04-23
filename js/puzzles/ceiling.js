const CeilingPuzzle = (() => {
  const GAP_CX   = 454 / 892;
  const GAP_CY   = 639 / 899;
  const SNAP_PX  = 40;
  const HINT_MS  = 20000;

  const _flipAudio = new Audio('audio/ceiling_flip.wav');
  _flipAudio.preload = 'auto';
  function playFlip() {
    if (State.get().audioMuted) return;
    try { _flipAudio.currentTime = 0; _flipAudio.play().catch(() => {}); } catch (e) {}
  }

  const _pushAudio = new Audio('audio/push_in.wav');
  _pushAudio.preload = 'auto';
  function playPushIn() {
    if (State.get().audioMuted) return;
    try { _pushAudio.currentTime = 0; _pushAudio.play().catch(() => {}); } catch (e) {}
  }

  const SRCS = {
    overhead: 'Asset/InitialState_Ceiling.png',
    profile:  'Asset/Initialstate_ceilingProfile.png',
    endstate: 'Asset/EndState_Ceiling.png',
  };

  let viewState = 'profile'; // persists across screen navigations
  let solved    = false;
  let hintTimer = null;
  let rewardPoemShown = false;

  let ghost = null;
  let ghostOffX = 0, ghostOffY = 0;
  let onDragMove = null, onDragEnd = null;

  // ── Init ─────────────────────────────────────────────────────────────

  function init() {
    solved = false; rewardPoemShown = false;
    Object.values(SRCS).forEach(src => { new Image().src = src; });
    buildUI();
    setupInventoryDrag();
    if (viewState === 'overhead') startHint();
  }

  function buildUI() {
    const screen = document.getElementById('screen-2');
    screen.classList.remove('locked');
    screen.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.id = 'ceiling-wrap';
    wrap.style.cssText = 'position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;';

    const base = document.createElement('img');
    base.id = 'ceiling-base';
    base.src = SRCS[viewState];
    base.draggable = false;
    base.style.cssText = 'max-width:100%;max-height:100%;display:block;user-select:none;cursor:pointer;';
    base.addEventListener('click', onBaseTap);

    const over = document.createElement('img');
    over.id = 'ceiling-over';
    over.src = '';
    over.draggable = false;
    over.style.cssText = 'position:absolute;inset:0;margin:auto;max-width:100%;max-height:100%;display:block;opacity:0;transition:opacity 450ms ease;pointer-events:none;user-select:none;';

    const glow = document.createElement('div');
    glow.id = 'ceiling-glow';
    glow.style.display = 'none';

    wrap.append(base, over, glow);
    screen.appendChild(wrap);
  }

  // ── Click-to-cycle views ──────────────────────────────────────────────

  function nextState() {
    if (viewState === 'endstate') return 'overhead';
    if (viewState === 'overhead') return 'profile';
    return solved ? 'endstate' : 'overhead'; // profile →
  }

  function onBaseTap() {
    if (solved) { if (rewardPoemShown) Overlay.show('wang_zhen', null); return; }
    playFlip();
    crossfadeTo(nextState());
    resetHintTimer();
  }

  function crossfadeTo(to) {
    const base = document.getElementById('ceiling-base');
    const over = document.getElementById('ceiling-over');
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

    if (to === 'overhead' && !solved) startHint();
  }

  // ── Drag-and-snap ─────────────────────────────────────────────────────

  function setupInventoryDrag() {
    document.getElementById('inventory-bar')
      .addEventListener('pointerdown', onInventoryDown);
  }

  function onInventoryDown(e) {
    if (Screens.getCurrent() !== 2) return;
    if (viewState !== 'overhead') return;
    if (State.get().inventory !== 'ceiling_fragment') return;
    if (solved) return;

    const img = document.getElementById('inventory-item')?.querySelector('img');
    if (!img) return;

    e.preventDefault();
    const rect = img.getBoundingClientRect();
    ghostOffX = e.clientX - (rect.left + rect.width  / 2);
    ghostOffY = e.clientY - (rect.top  + rect.height / 2);

    ghost = document.createElement('img');
    ghost.src = 'Asset/Ceiling%20Fragment.png';
    ghost.draggable = false;
    ghost.style.cssText = `
      position:fixed;
      width:${Math.max(rect.width, 140) * 0.9}px;
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

    const gapPos = getGapScreenPos();
    if (!gapPos) { elasticReturn(); return; }

    const dist = Math.hypot(
      (e.clientX - ghostOffX) - gapPos.x,
      (e.clientY - ghostOffY) - gapPos.y
    );

    dist <= SNAP_PX ? snapToGap(gapPos) : elasticReturn();
  }

  function snapToGap(gapPos) {
    playPushIn();
    ghost.style.transition = 'left 150ms ease, top 150ms ease, transform 150ms ease';
    ghost.style.left = gapPos.x + 'px';
    ghost.style.top  = gapPos.y + 'px';
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

  function cancelDrag() {
    if (!ghost) return;
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup',   onDragEnd);
    onDragMove = onDragEnd = null;
    ghost.remove(); ghost = null;
  }

  function getGapScreenPos() {
    const base = document.getElementById('ceiling-base');
    if (!base || !base.src.includes('InitialState_Ceiling')) return null;
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
        solved: { ...State.get().solved, ceiling: true },
        inventory: 'ceiling_profile',
      });
      const flyFrom = document.getElementById('ceiling-base');
      Inventory.flyIn('ceiling_profile', flyFrom, () => {
        Inventory.playObtained();
        rewardPoemShown = true;
        setTimeout(() => Overlay.show('wang_zhen', () => Inventory.pulseClue()), 1000);
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
    if (viewState === 'overhead' && !solved) startHint();
  }

  function showGlow() {
    const glow = document.getElementById('ceiling-glow');
    if (!glow || solved || viewState !== 'overhead') return;
    const pos = getGapScreenPos();
    if (!pos) return;
    const SIZE = 100;
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
    const glow = document.getElementById('ceiling-glow');
    if (glow) { glow.style.display = 'none'; glow.className = ''; }
  }

  return { init, updateLabels: () => {} };
})();
