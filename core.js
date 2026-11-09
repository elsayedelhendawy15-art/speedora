/* ==========================================
   Speedora — Unified Points Engine v1
   محرك النقاط الموحد (يشتغل على كل الصفحات)
   ========================================== */
(function () {
  const KEY = 'speedora_state';
  const DEFAULTS = {
    balance: 1250, earned: 0, redeemed: 0, activity: [],
    streak: 0, lastClaim: null, level: 1,
    totalGamesPlayed: 0, totalTasksDone: 0
  };

  const POINTS_PER_EGP = 100;
  const MIN_REDEEM = 5000;
  const LEVELS = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000, 35000, 50000];
  const LEVEL_NAMES = ['مبتدئ', 'نشيط', 'محترف', 'خبير', 'متمكن', 'أسطورة', 'نجم', 'بطل', 'أسطوري', 'خارق', 'لا يُهزم'];

  const load = () => {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
    catch { return { ...DEFAULTS }; }
  };
  const save = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: s }));
  };
  const calcLevel = (earned) => { let l = 1; LEVELS.forEach((v, i) => { if (earned >= v) l = i + 1; }); return l; };
  const levelInfo = () => {
    const s = load();
    const lvl = calcLevel(s.earned);
    const cur = LEVELS[lvl - 1] || 0;
    const nxt = LEVELS[lvl] || (LEVELS[LEVELS.length - 1] + 15000);
    return { level: lvl, name: LEVEL_NAMES[lvl - 1] || 'أسطوري', current: cur, next: nxt, progress: Math.min(100, ((s.earned - cur) / (nxt - cur)) * 100) };
  };
  const streakBonus = (streak) => streak < 3 ? 50 : streak < 7 ? 100 : streak < 14 ? 200 : streak < 30 ? 350 : 500;

  window.Speedora = {
    get: load,
    formatNum: (n) => Number(n || 0).toLocaleString('en-US'),

    addPoints(amount, title, type = 'game') {
      const s = load();
      const oldLevel = s.level;
      s.balance += amount;
      s.earned += amount;
      s.activity.unshift({ type, title, points: amount, date: new Date().toISOString() });
      if (s.activity.length > 100) s.activity = s.activity.slice(0, 100);
      if (type === 'game') s.totalGamesPlayed++;
      if (type === 'task') s.totalTasksDone++;
      s.level = calcLevel(s.earned);
      save(s);
      if (s.level > oldLevel) {
        window.dispatchEvent(new CustomEvent('levelUp', { detail: { level: s.level, name: LEVEL_NAMES[s.level - 1] } }));
      }
      return s;
    },

    spendPoints(amount, title) {
      const s = load();
      if (s.balance < amount) return { error: 'رصيدك غير كافٍ' };
      s.balance -= amount;
      s.redeemed += amount;
      s.activity.unshift({ type: 'redeem', title, points: -amount, date: new Date().toISOString() });
      save(s);
      return { ok: true, state: s };
    },

    canClaimDaily() {
      const s = load();
      if (!s.lastClaim) return true;
      return new Date(s.lastClaim).toDateString() !== new Date().toDateString();
    },

    claimDaily() {
      const s = load();
      if (!this.canClaimDaily()) return { error: 'استلمت مكافأة النهاردة بالفعل. ارجع بكرة!' };
      let newStreak = 1;
      if (s.lastClaim) {
        const diff = Math.floor((new Date() - new Date(s.lastClaim)) / 86400000);
        newStreak = diff === 1 ? s.streak + 1 : 1;
      }
      s.streak = newStreak;
      s.lastClaim = new Date().toISOString();
      save(s);
      const bonus = streakBonus(newStreak);
      this.addPoints(bonus, `مكافأة يومية (${newStreak} يوم متتالي)`, 'bonus');
      return { ok: true, bonus, streak: newStreak };
    },

    getLevelInfo: levelInfo,
    getConversion: () => ({ rate: POINTS_PER_EGP, minRedeem: MIN_REDEEM }),
    streakBonus,
  };

  // شاشة احتفال عند Level Up
  window.addEventListener('levelUp', (e) => {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#d43bea,#642cff);color:white;padding:16px 28px;border-radius:14px;z-index:9999;font-weight:bold;box-shadow:0 10px 40px rgba(100,44,255,.5);animation:pop .4s';
    toast.textContent = `🎉 وصلت للمستوى ${e.detail.level} - ${e.detail.name}!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  });
})();
