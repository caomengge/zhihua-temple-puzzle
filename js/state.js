const State = (() => {
  const state = {
    locale: 'en',
    audioMuted: false,
    currentScreen: 1,
    solved: { stele: false, ceiling: false, pavilion: false, niche: false },
    inventory: null, // 'ceiling_fragment' | 'ceiling_profile' | 'small_buddha' | null
    idleSince: Date.now(),
  };

  const listeners = [];

  function get() { return state; }

  function update(patch) {
    Object.assign(state, patch);
    listeners.forEach(fn => fn(state));
  }

  function onChange(fn) { listeners.push(fn); }

  function resetIdle() { state.idleSince = Date.now(); }

  function solveCount() {
    return Object.values(state.solved).filter(Boolean).length;
  }

  // Returns the index (1-based) of the first unsolved puzzle
  function firstUnsolved() {
    if (!state.solved.stele) return 1;
    if (!state.solved.ceiling) return 2;
    if (!state.solved.pavilion) return 3;
    if (!state.solved.niche) return 4;
    return 'end';
  }

  return { get, update, onChange, resetIdle, solveCount, firstUnsolved };
})();
