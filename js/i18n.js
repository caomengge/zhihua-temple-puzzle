const I18n = (() => {
  let locale = 'en';

  const strings = {
    en: {
      title: "Zhihua Temple",
      subtitle: "Fragmented yet Connected: Pathways to Wisdom",
      start: "Begin",
      not_yet: "Not yet",
      tap_to_continue: "Tap to continue",
      show_both: "Show both",
      show_one: "Show one language",
      screen_1: "The Stele",
      screen_2: "Coffered Ceiling",
      screen_3: "Wanfo Pavilion",
      screen_4: "Buddha Niche",
      inventory_fragment: "Ceiling Fragment",
      inventory_profile: "Coffered Ceiling",
      inventory_buddha: "Small Buddha",
      share: "Share",
      start_over: "Leave Zhihua Temple",
      view_profile: "View side profile",
      back_full_wall: "← Back to full wall",
      back_profile: "← Side profile",
    },
    zh: {
      title: "智化寺",
      subtitle: "殘缺與連接：通往智慧之路",
      start: "開始",
      not_yet: "尚未",
      tap_to_continue: "點擊繼續",
      show_both: "同時顯示",
      show_one: "顯示單語",
      screen_1: "石碑",
      screen_2: "藻井",
      screen_3: "萬佛閣",
      screen_4: "佛龕",
      inventory_fragment: "藻井構件",
      inventory_profile: "藻井剖面",
      inventory_buddha: "小佛像",
      share: "分享",
      start_over: "辭別智化寺",
      view_profile: "側面圖",
      back_full_wall: "← 返回全景",
      back_profile: "← 側面圖",
    }
  };

  function t(key) {
    return strings[locale][key] || strings.en[key] || key;
  }

  function setLocale(l) {
    locale = l;
    document.documentElement.lang = l === 'zh' ? 'zh-Hant' : 'en';
    document.dispatchEvent(new CustomEvent('localechange', { detail: l }));
  }

  function getLocale() { return locale; }

  function toggle() {
    setLocale(locale === 'en' ? 'zh' : 'en');
  }

  return { t, setLocale, getLocale, toggle };
})();
