const Overlay = (() => {
  let showBothMode = false;

  const _brushAudio = new Audio('audio/brush_writing.wav');
  _brushAudio.preload = 'auto';

  function playBrush() {
    if (State.get().audioMuted) return;
    try { _brushAudio.currentTime = 0; _brushAudio.play().catch(() => {}); } catch (e) {}
  }

  const poems = {
    shen_tingfang: {
      key: "shen_tingfang",
      name_en: "Shen Tingfang", name_zh: "沈廷芳",
      dates: "1692–1762",
      title_en: "Compiler in the Hanlin Academy; Investigating Censor for the Shandong Circuit",
      title_zh: "翰林院編修、山東道監察御史",
      poem_zh: ["杭郡才子登翰林，","奉詔修史記前朝。","爲正人心除舊像，","方知餘波未肯消。"],
      poem_en: [
        "A gifted talent from Hangzhou rose to the Hanlin Academy;",
        "Under imperial command, he wrote the history of the fallen dynasty.",
        "To rectify the past in people's mind, he ordered the old image removed;",
        "Only then did he realize that its aftereffects would not fade away."
      ]
    },
    wang_zhen: {
      key: "wang_zhen",
      name_en: "Wang Zhen", name_zh: "王振",
      dates: "c. 1410–1449",
      title_en: "Chief Eunuch of the Directorate of Ceremonial",
      title_zh: "司禮監掌印太監",
      poem_zh: ["寒微內侍入深宮，","東宮侍講荷恩隆。","欲報君恩修禪寺，","因緣聚散是非中。"],
      poem_en: [
        "Born of humble means, a palace eunuch entered the inner court;",
        "As tutor for the crown prince, he flourished in imperial favor.",
        "To repay his sovereign's grace, he built a Buddhist temple;",
        "Yet as causes and conditions gathered and dispersed, his legacy became entangled in praise and blame."
      ]
    },
    liu_dunzhen: {
      key: "liu_dunzhen",
      name_en: "Liu Dunzhen", name_zh: "劉敦楨",
      dates: "1897–1968",
      title_en: "Member of the Society for the Study of Chinese Architecture; architectural historian",
      title_zh: "中國營造學社成員、建築史學者及教育家",
      poem_zh: ["攜徒北上勘古跡，","梁柋斗拱認分明。","只為營造存真相，","不見全貌意難平。"],
      poem_en: [
        "Leading his students northward to survey ancient architecture;",
        "He traced beams, purlins, and bracket sets with careful clarity.",
        "He longed to preserve the true form of the temple's structure;",
        "But denied its wholeness, his heart could not be at peace."
      ]
    },
    laurence_sickman: {
      key: "laurence_sickman",
      name_en: "Laurence Sickman", name_zh: "史克門",
      dates: "1907–1988",
      title_en: "Curator of Nelson-Atkins Museum of Art",
      title_zh: "納爾遜·阿特金斯藝術博物館策展人",
      poem_zh: ["燕京負笈少年行，","滿城風塵覓舊珍。","購得藻井離古寺，","萬佛閣中夢猶深。"],
      poem_en: [
        "A young scholar came to old capital with books upon his back;",
        "Through a city thick with dust, he searched for treasures of the past.",
        "He bought the coffered ceiling and parted it from its ancient temple;",
        "Yet in the Pavilion of Ten Thousand Buddhas, dreams still deepened."
      ]
    }
  };

  function show(poemKey, onDismiss) {
    const poem = poems[poemKey];
    if (!poem) return;

    const overlay = document.getElementById('poem-overlay');
    const locale = I18n.getLocale();

    renderPoem(overlay, poem, locale, showBothMode);

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { overlay.classList.add('visible'); playBrush(); });
    });

    function dismiss() {
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.classList.add('hidden');
        if (onDismiss) onDismiss();
      }, 400);
    }

    // Remove any existing listener first
    overlay._dismissHandler && overlay.removeEventListener('click', overlay._dismissHandler);
    overlay._dismissHandler = () => dismiss();
    overlay.addEventListener('click', overlay._dismissHandler);

    overlay._keyHandler && document.removeEventListener('keydown', overlay._keyHandler);
    overlay._keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') { dismiss(); }
    };
    document.addEventListener('keydown', overlay._keyHandler);
  }

  function renderPoem(overlay, poem, locale, bothMode) {
    const panel = overlay.querySelector('.poem-panel');
    const nameLine = `${poem.name_en}  ${poem.name_zh}`;
    const titleLine = locale === 'zh' ? poem.title_zh : poem.title_en;

    let poemHtml = '';
    if (bothMode) {
      poem.poem_zh.forEach((zl, i) => {
        poemHtml += `<p class="poem-line poem-line-zh anim-line" style="--i:${i * 2}">${zl}</p>`;
        if (poem.poem_en[i]) {
          poemHtml += `<p class="poem-line poem-line-en anim-line" style="--i:${i * 2 + 1}">${poem.poem_en[i]}</p>`;
        }
      });
    } else if (locale === 'zh') {
      poem.poem_zh.forEach((l, i) => {
        poemHtml += `<p class="poem-line anim-line" style="--i:${i}">${l}</p>`;
      });
    } else {
      poem.poem_en.forEach((l, i) => {
        poemHtml += `<p class="poem-line poem-line-en anim-line" style="--i:${i}">${l}</p>`;
      });
    }

    const lineCount = bothMode ? poem.poem_zh.length * 2 : poem.poem_zh.length;
    const continueDelay = 300 + lineCount * 250 + 600;

    panel.innerHTML = `
      <div class="poem-body">${poemHtml}</div>
      <div class="poem-continue" id="poem-continue">${I18n.t('tap_to_continue')}</div>
    `;

    setTimeout(() => {
      const cont = panel.querySelector('#poem-continue');
      if (cont) cont.classList.add('visible');
    }, continueDelay);
  }

  return { show };
})();
