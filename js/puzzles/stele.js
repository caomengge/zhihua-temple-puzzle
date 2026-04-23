const StelePuzzle = (() => {
  const ROTATE_MS  = 200;
  const HINT_DELAY = 20000;

  // ── Stone-click SFX ───────────────────────────────────────────────────
  const _stoneAudio = new Audio('audio/stone_click.wav');
  _stoneAudio.preload = 'auto';

  function playStoneClick() {
    if (State.get().audioMuted) return;
    try {
      _stoneAudio.currentTime = 0;
      _stoneAudio.play().catch(() => {});
    } catch (e) {}
  }

  // Cell layout measured from InitialState_GridStele.png (1111x2500)
  // bgX/bgY/bgW/bgH = cell position in the background image
  // srcX/srcY/srcW/srcH = corresponding portrait region in EndState_GridStele.png (1209x2500)
  const CELLS = [
    { col:0, row:0, bgX:265, bgY:692,  bgW:279, bgH:278, srcX:293, srcY:768,  srcW:309, srcH:305 },
    { col:1, row:0, bgX:552, bgY:692,  bgW:284, bgH:278, srcX:611, srcY:768,  srcW:316, srcH:305 },
    { col:0, row:1, bgX:265, bgY:975,  bgW:279, bgH:293, srcX:293, srcY:1080, srcW:309, srcH:324 },
    { col:1, row:1, bgX:552, bgY:975,  bgW:284, bgH:293, srcX:611, srcY:1080, srcW:316, srcH:324 },
    { col:0, row:2, bgX:265, bgY:1272, bgW:279, bgH:294, srcX:293, srcY:1409, srcW:309, srcH:335 },
    { col:1, row:2, bgX:552, bgY:1272, bgW:284, bgH:294, srcX:611, srcY:1409, srcW:316, srcH:335 },
  ];
  const BG_W = 1111, BG_H = 2500;

  let bgImg = null, portraitImg = null;
  let tiles = [], solved = false, hintTimer = null;
  let displayScale = 1;
  let rewardPoemShown = false;

  function init() {
    solved = false; tiles = []; rewardPoemShown = false;
    let loaded = 0;

    bgImg = new Image();
    portraitImg = new Image();

    function onLoad() {
      if (++loaded === 2) requestAnimationFrame(() => requestAnimationFrame(buildGrid));
    }
    bgImg.onload = onLoad;
    portraitImg.onload = onLoad;

    bgImg.src = 'Asset/InitialState_GridStele.png';
    portraitImg.src = 'Asset/EndState_GridStele.png';
  }

  function buildGrid() {
    const container = document.getElementById('stele-container');
    container.innerHTML = '';
    container.style.position = 'relative';

    // Scale background to fit available space
    const rect = container.getBoundingClientRect();
    const availW = rect.width  || (window.innerWidth  - 40);
    const availH = rect.height || (window.innerHeight - 44 - 76);
    displayScale = Math.min(availW / BG_W, availH / BG_H);

    const dispW = Math.floor(BG_W * displayScale);
    const dispH = Math.floor(BG_H * displayScale);

    // Wrapper: holds background + tile canvases at the same scale
    const wrapper = document.createElement('div');
    wrapper.id = 'stele-wrapper';
    wrapper.style.cssText = `position:relative;width:${dispW}px;height:${dispH}px;flex-shrink:0;`;

    // Static background — stele with empty grid cells
    const bg = document.createElement('img');
    bg.src = bgImg.src;
    bg.style.cssText = `
      position:absolute;inset:0;
      width:${dispW}px;height:${dispH}px;
      display:block;pointer-events:none;
    `;
    wrapper.appendChild(bg);

    // Randomise: at least 4 of 6 non-zero
    const rotations = shuffle([0, 0, 90, 90, 180, 270]);

    tiles = [];
    CELLS.forEach((cell, i) => {
      const cellDispX = cell.bgX * displayScale;
      const cellDispY = cell.bgY * displayScale;
      const cellDispW = cell.bgW * displayScale;
      const cellDispH = cell.bgH * displayScale;

      // Wrapper div to host the canvas and hint glow
      const tileWrap = document.createElement('div');
      tileWrap.style.cssText = `
        position:absolute;
        left:${cellDispX}px; top:${cellDispY}px;
        width:${cellDispW}px; height:${cellDispH}px;
        overflow:hidden; cursor:pointer;
      `;

      // Canvas resolution matches the EndState source region for sharp rendering
      const canvas = document.createElement('canvas');
      canvas.width  = cell.srcW;
      canvas.height = cell.srcH;
      canvas.style.cssText = `
        width:${cellDispW}px; height:${cellDispH}px; display:block;
      `;
      canvas.setAttribute('tabindex', '0');
      canvas.setAttribute('role', 'button');
      canvas.setAttribute('aria-label', `Portrait tile ${i + 1}`);

      const tile = {
        canvas, wrapper: tileWrap, cell,
        rotation: rotations[i],
        displayAngle: rotations[i],
        queue: [], animating: false,
      };
      tiles.push(tile);
      drawTileAt(tile, rotations[i]);
      attachEvents(tile);

      tileWrap.appendChild(canvas);
      wrapper.appendChild(tileWrap);
    });

    container.appendChild(wrapper);
    container.addEventListener('click', () => {
      if (solved && rewardPoemShown) Overlay.show('shen_tingfang', null);
    });
    startHint();
  }

  function attachEvents(tile) {
    let longPressTimer = null, longPressed = false;

    tile.canvas.addEventListener('pointerdown', () => {
      longPressed = false;
      longPressTimer = setTimeout(() => {
        longPressed = true;
        rotateTile(tile, -90); resetHint();
      }, 500);
    });
    tile.canvas.addEventListener('pointerup',     () => clearTimeout(longPressTimer));
    tile.canvas.addEventListener('pointercancel', () => clearTimeout(longPressTimer));

    tile.canvas.addEventListener('click', (e) => {
      if (longPressed) { longPressed = false; return; }
      clearTimeout(longPressTimer);
      rotateTile(tile, e.shiftKey ? -90 : 90); resetHint();
    });

    tile.canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        rotateTile(tile, e.shiftKey ? -90 : 90); resetHint();
      }
    });
  }

  function rotateTile(tile, delta) {
    if (solved) return;
    playStoneClick();
    tile.queue.push(delta);
    processQueue(tile);
  }

  function processQueue(tile) {
    if (tile.animating || tile.queue.length === 0) return;
    const delta = tile.queue.shift();
    const from = tile.displayAngle, to = from + delta;
    tile.animating = true;
    tweenAngle(from, to, ROTATE_MS, a => drawTileAt(tile, a), () => {
      tile.displayAngle = to;
      tile.rotation = ((to % 360) + 360) % 360;
      tile.animating = false;
      processQueue(tile);
      checkWin();
    });
  }

  function tweenAngle(from, to, dur, onFrame, onDone) {
    const start = performance.now();
    (function frame(now) {
      const t    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 2);
      onFrame(from + (to - from) * ease);
      t < 1 ? requestAnimationFrame(frame) : (onFrame(to), onDone());
    })(performance.now());
  }

  function drawTileAt(tile, angle) {
    const c = tile.cell;
    const ctx = tile.canvas.getContext('2d');
    const w = tile.canvas.width, h = tile.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.drawImage(portraitImg, c.srcX, c.srcY, c.srcW, c.srcH, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function checkWin() {
    if (solved || !tiles.every(t => t.rotation === 0)) return;
    solved = true;
    stopHint();
    tiles.forEach(t => t.wrapper.classList.remove('tile-hint'));
    setTimeout(runReward, 300);
  }

  function runReward() {
    // Glow the assembled portrait
    const wrapper = document.getElementById('stele-wrapper');
    tiles.forEach(t => {
      t.wrapper.style.transition = 'filter 600ms ease';
      t.wrapper.style.filter = 'brightness(1.07) drop-shadow(0 0 8px rgba(139,106,63,0.9))';
    });

    setTimeout(() => {
      State.update({ solved: { ...State.get().solved, stele: true }, inventory: 'ceiling_fragment' });
      Inventory.flyIn('ceiling_fragment', wrapper, () => {
        Inventory.playObtained();
        rewardPoemShown = true;
        setTimeout(() => Overlay.show('shen_tingfang', () => Inventory.pulseClue()), 1000);
      });
    }, 950);
  }

  function startHint() {
    stopHint();
    hintTimer = setTimeout(() => {
      tiles.forEach(t => { if (t.rotation !== 0) t.wrapper.classList.add('tile-hint'); });
    }, HINT_DELAY);
  }

  function stopHint() { clearTimeout(hintTimer); }

  function resetHint() {
    State.resetIdle();
    tiles.forEach(t => t.wrapper.classList.remove('tile-hint'));
    startHint();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { init };
})();
