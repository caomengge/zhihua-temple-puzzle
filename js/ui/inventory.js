const Inventory = (() => {
  const _obtainedAudio = new Audio('audio/OBJPack-cardboard_drop_on_th-Elevenlabs.wav');
  _obtainedAudio.preload = 'auto';

  function playObtained() {
    if (State.get().audioMuted) return;
    try { _obtainedAudio.currentTime = 0; _obtainedAudio.play().catch(() => {}); } catch (e) {}
  }

  const ITEM_SRCS = {
    ceiling_fragment: 'Asset/Ceiling%20Fragment.png',
    ceiling_profile: 'Asset/CeilingProfile.png',
    small_buddha: 'Asset/Buddha.png',
  };

  const ITEM_KEYS = {
    ceiling_fragment: 'inventory_fragment',
    ceiling_profile:  'inventory_profile',
    small_buddha:     'inventory_buddha',
  };

  function render(item) {
    const bar = document.getElementById('inventory-item');
    if (!item) {
      bar.innerHTML = '';
      bar.className = 'inventory-empty';
      return;
    }
    const label = I18n.t(ITEM_KEYS[item] || item);
    bar.className = 'inventory-has-item';
    bar.innerHTML = `<img src="${ITEM_SRCS[item]}" alt="${label}" class="inventory-img" title="${label}">`;

    const img = bar.querySelector('img');
    setTimeout(() => {
      img?.animate([
        { transform: 'scale(1)    translateY(0)',    offset: 0    },
        { transform: 'scale(1.12) translateY(-8px)', offset: 0.35 },
        { transform: 'scale(1)    translateY(0)',    offset: 0.7  },
        { transform: 'scale(1.06) translateY(-4px)', offset: 0.85 },
        { transform: 'scale(1)    translateY(0)',    offset: 1    },
      ], { duration: 700, easing: 'ease-in-out' });
    }, 400);
  }

  // Animate a new item flying into the inventory bar from a start position
  function flyIn(item, fromEl, onComplete) {
    const bar = document.getElementById('inventory-bar');
    const barRect = bar.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();

    const ghost = document.createElement('img');
    ghost.src = ITEM_SRCS[item];
    ghost.className = 'inventory-fly-ghost';
    ghost.style.cssText = `
      position: fixed;
      left: ${fromRect.left + fromRect.width / 2}px;
      top: ${fromRect.top + fromRect.height / 2}px;
      width: 60px;
      height: 60px;
      object-fit: contain;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1000;
      transition: none;
    `;
    document.body.appendChild(ghost);

    const destX = barRect.left + barRect.width / 2;
    const destY = barRect.top + barRect.height / 2;

    // Bézier via WAAPI
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const ctrlX = (startX + destX) / 2;
    const ctrlY = Math.min(startY, destY) - 80;

    const anim = ghost.animate([
      { transform: `translate(-50%, -50%) scale(1)`, opacity: 1 },
      { transform: `translate(calc(${ctrlX - startX}px - 50%), calc(${ctrlY - startY}px - 50%)) scale(0.8)`, offset: 0.5 },
      { transform: `translate(calc(${destX - startX}px - 50%), calc(${destY - startY}px - 50%)) scale(0.5)`, opacity: 0.8 },
    ], { duration: 500, easing: 'ease-in-out', fill: 'forwards' });

    anim.onfinish = () => {
      ghost.remove();
      render(item);
      if (onComplete) onComplete();
    };
  }

  function pulseClue() {
    const img = document.getElementById('inventory-item')?.querySelector('img');
    if (!img) return;
    img.animate([
      { transform: 'scale(1)    translateY(0)',    offset: 0    },
      { transform: 'scale(1.18) translateY(-10px)', offset: 0.3 },
      { transform: 'scale(0.95) translateY(2px)',  offset: 0.55 },
      { transform: 'scale(1.08) translateY(-5px)', offset: 0.75 },
      { transform: 'scale(1)    translateY(0)',    offset: 1    },
    ], { duration: 800, easing: 'ease-in-out' });
  }

  return { render, flyIn, pulseClue, playObtained };
})();
