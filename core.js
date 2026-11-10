/* ==========================================
   Speedora — Core Engine v9 (Clean & Fast)
   ========================================== */
(function () {
  const KEY = 'speedora_state';
  const API_URL = 'https://speedora-api.elsayedelhendawy15.workers.dev';
  
  // 🆕 كود مسح البيانات من الرابط (للطوارئ)
  if (window.location.search.includes('reset=1')) {
    localStorage.clear();
    window.location.replace('auth.html');
    return;
  }

  let USER_ID = localStorage.getItem('speedora_user_id');
  let syncTimeout = null;

  // 🛡️ حماية الصفحات
  if (!USER_ID && !window.location.pathname.includes('auth.html') && !window.location.pathname.includes('admin.html')) {
    window.location.replace('auth.html');
    return;
  }

  const DEFAULTS = {
    balance: 0, earned: 0, redeemed: 0, activity: [],
    streak: 0, lastClaim: null, level: 1,
    totalGamesPlayed: 0, totalTasksDone: 0,
    lastSpin: null, lastScratch: null,
    unlockedAchievements: [],
    bots: {}, lastBotUpdate: null,
    purchasedRewards: [],
    welcomeShown: false,
    referralCode: null,
    referredBy: null,
    referrals: [],
    name: 'Player'
  };

  const POINTS_PER_EGP = 100;
  const MIN_REDEEM = 5000;
  const LEVELS = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000, 35000, 50000];
  const LEVEL_NAMES = ['مبتدئ','نشيط','محترف','خبير','متمكن','أسطورة','نجم','بطل','أسطوري','خارق','لا يُهزم'];

  const WHEEL_PRIZES = [
    { label: '+50', points: 50, color: '#ef4444' }, { label: '+100', points: 100, color: '#f59e0b' },
    { label: 'حظ أوفر', points: 0, color: '#6b7280' }, { label: '+200', points: 200, color: '#10b981' },
    { label: '+500', points: 500, color: '#3b82f6' }, { label: '+50', points: 50, color: '#ef4444' },
    { label: '+1000', points: 1000, color: '#8b5cf6' }, { label: '+100', points: 100, color: '#f59e0b' }
  ];

  const SCRATCH_PRIZES = [
    { label: 'حظ أوفر', points: 0, weight: 30 }, { label: '+25', points: 25, weight: 25 },
    { label: '+50', points: 50, weight: 20 }, { label: '+100', points: 100, weight: 12 },
    { label: '+200', points: 200, weight: 8 }, { label: '+500', points: 500, weight: 4 },
    { label: '+1500', points: 1500, weight: 1 }
  ];

  const REWARDS_STORE = [
    { id: 'gplay_5', icon: '🎮', title: 'بطاقة Google Play', desc: 'بطاقة بقيمة 5$', cost: 5000, badge: 'الأكثر مبيعاً' },
    { id: 'gplay_10', icon: '🎮', title: 'بطاقة Google Play', desc: 'بطاقة بقيمة 10$', cost: 9500, badge: null },
    { id: 'amazon_5', icon: '📦', title: 'بطاقة Amazon', desc: 'بطاقة بقيمة 5$', cost: 5500, badge: null },
    { id: 'mobile_10', icon: '📱', title: 'رصيد موبايل', desc: 'رصيد 10 ج.م لأي شبكة', cost: 1200, badge: 'سريع' },
    { id: 'mobile_50', icon: '📱', title: 'رصيد موبايل', desc: 'رصيد 50 ج.م لأي شبكة', cost: 5500, badge: null },
    { id: 'paypal_5', icon: '💳', title: 'PayPal', desc: 'رصيد 5$ على PayPal', cost: 6000, badge: null },
    { id: 'vip_week', icon: '👑', title: 'عضوية VIP', desc: 'أسبوع VIP مع مضاعفة النقاط', cost: 8000, badge: 'حصري' },
    { id: 'mystery_box', icon: '🎁', title: 'صندوق الغموض', desc: 'مكافأة عشوائية حتى 3000 نقطة', cost: 2000, badge: 'مثير' }
  ];

  const ACHIEVEMENTS = [
    { id: 'first_game', icon: '🎮', title: 'أول خطوة', desc: 'العب أول لعبة', condition: s => s.totalGamesPlayed >= 1, reward: 50 },
    { id: 'games_10', icon: '⚡', title: 'مدمن ألعاب', desc: 'العب 10 ألعاب', condition: s => s.totalGamesPlayed >= 10, reward: 200 },
    { id: 'games_50', icon: '🔥', title: 'محترف', desc: 'العب 50 لعبة', condition: s => s.totalGamesPlayed >= 50, reward: 500 },
    { id: 'first_task', icon: '✅', title: 'منفذ', desc: 'أكمل أول مهمة', condition: s => s.totalTasksDone >= 1, reward: 50 },
    { id: 'tasks_10', icon: '📋', title: 'منظم', desc: 'أكمل 10 مهام', condition: s => s.totalTasksDone >= 10, reward: 300 },
    { id: 'balance_1000', icon: '💰', title: 'مدخر', desc: 'وصل رصيدك 1000', condition: s => s.balance >= 1000, reward: 100 },
    { id: 'balance_5000', icon: '💎', title: 'ثري', desc: 'وصل رصيدك 5000', condition: s => s.balance >= 5000, reward: 500 },
    { id: 'balance_10000', icon: '👑', title: 'ملكي', desc: 'وصل رصيدك 10000', condition: s => s.balance >= 10000, reward: 1000 },
    { id: 'streak_3', icon: '🔥', title: '3 أيام', desc: 'سلسلة 3 أيام', condition: s => s.streak >= 3, reward: 150 },
    { id: 'streak_7', icon: '💥', title: 'أسبوع كامل', desc: 'سلسلة 7 أيام', condition: s => s.streak >= 7, reward: 500 },
    { id: 'level_3', icon: '⭐', title: 'مستوى 3', desc: 'وصل للمستوى 3', condition: s => s.level >= 3, reward: 200 },
    { id: 'level_5', icon: '🌟', title: 'مستوى 5', desc: 'وصل للمستوى 5', condition: s => s.level >= 5, reward: 500 },
    { id: 'first_purchase', icon: '🛒', title: 'مشتري', desc: 'اشتريت أول مكافأة', condition: s => s.purchasedRewards && s.purchasedRewards.length >= 1, reward: 100 },
    { id: 'first_scratch', icon: '🎫', title: 'محظوظ', desc: 'جربت سكراتش كارد', condition: s => s.lastScratch, reward: 50 }
  ];

  const BOTS = [
    { name: 'ShadowKing', avatar: 'S', base: 24680 }, { name: 'LunaQueen', avatar: 'L', base: 19450 },
    { name: 'CryptoGamer', avatar: 'C', base: 17632 }, { name: 'FastEagle', avatar: 'F', base: 15420 },
    { name: 'PixelPro', avatar: 'P', base: 13278 }, { name: 'NeonHunter', avatar: 'N', base: 11890 },
    { name: 'StarNinja', avatar: '★', base: 9456 }, { name: 'IceWolf', avatar: 'I', base: 8234 },
    { name: 'FireDragon', avatar: 'D', base: 6789 }
  ];

  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...raw };
    } catch { return { ...DEFAULTS }; }
  };

  const save = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: s }));
    
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_ID, state: s })
        });
      } catch (e) { console.warn('⚠️ فشل الاتصال بالسحابة:', e); }
    }, 1500);
  };

  const calcLevel = (earned) => { let l = 1; LEVELS.forEach((v, i) => { if (earned >= v) l = i + 1; }); return l; };
  const streakBonus = (streak) => streak < 3 ? 50 : streak < 7 ? 100 : streak < 14 ? 200 : streak < 30 ? 350 : 500;

  window.Speedora = {
    get: load,
    formatNum: (n) => Number(n || 0).toLocaleString('en-US'),

    addPoints(amount, title, type = 'game') {
      const s = load();
      const oldLevel = s.level;
      s.balance += amount; s.earned += amount;
      s.activity.unshift({ type, title, points: amount, date: new Date().toISOString() });
      if (s.activity.length > 200) s.activity = s.activity.slice(0, 200);
      if (type === 'game') s.totalGamesPlayed++;
      if (type === 'task') s.totalTasksDone++;
      s.level = calcLevel(s.earned);
      save(s);
      if (s.level > oldLevel) window.dispatchEvent(new CustomEvent('levelUp', { detail: { level: s.level, name: LEVEL_NAMES[s.level - 1] } }));
      this.checkAchievements();
      return s;
    },

    spendPoints(amount, title, type = 'redeem') {
      const s = load();
      if (s.balance < amount) return { error: 'رصيدك غير كافٍ' };
      s.balance -= amount; s.redeemed += amount;
      s.activity.unshift({ type, title, points: -amount, date: new Date().toISOString() });
      if (s.activity.length > 200) s.activity = s.activity.slice(0, 200);
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
      if (!this.canClaimDaily()) return { error: 'استلمت النهاردة بالفعل. ارجع بكرة!' };
      let ns = 1;
      if (s.lastClaim) { const d = Math.floor((new Date() - new Date(s.lastClaim)) / 86400000); ns = d === 1 ? s.streak + 1 : 1; }
      const bonus = streakBonus(ns);
      this.addPoints(bonus, `مكافأة يومية (${ns} يوم)`, 'bonus');
      const s2 = load(); s2.streak = ns; s2.lastClaim = new Date().toISOString(); save(s2);
      return { ok: true, bonus, streak: ns };
    },

    getWheelPrizes: () => WHEEL_PRIZES,
    canSpin() {
      const s = load();
      if (!s.lastSpin) return true;
      return new Date(s.lastSpin).toDateString() !== new Date().toDateString();
    },
    spin() {
      if (!this.canSpin()) return { error: 'لعبت النهاردة. ارجع بكرة!' };
      const idx = Math.floor(Math.random() * WHEEL_PRIZES.length);
      const prize = WHEEL_PRIZES[idx];
      const s = load(); s.lastSpin = new Date().toISOString(); save(s);
      if (prize.points > 0) this.addPoints(prize.points, 'عجلة الحظ', 'wheel');
      return { ok: true, index: idx, prize };
    },

    canScratch() {
      const s = load();
      if (!s.lastScratch) return true;
      return new Date(s.lastScratch).toDateString() !== new Date().toDateString();
    },
    scratch() {
      if (!this.canScratch()) return { error: 'جربت النهاردة. ارجع بكرة!' };
      const totalWeight = SCRATCH_PRIZES.reduce((sum, p) => sum + p.weight, 0);
      let r = Math.random() * totalWeight; let picked = SCRATCH_PRIZES[0];
      for (const p of SCRATCH_PRIZES) { if (r < p.weight) { picked = p; break; } r -= p.weight; }
      const s = load(); s.lastScratch = new Date().toISOString(); save(s);
      if (picked.points > 0) this.addPoints(picked.points, 'سكراتش كارد', 'scratch');
      return { ok: true, prize: picked };
    },

    getStore: () => REWARDS_STORE,
    purchase(rewardId) {
      const reward = REWARDS_STORE.find(r => r.id === rewardId);
      if (!reward) return { error: 'المكافأة غير موجودة' };
      const s = load();
      if (s.balance < reward.cost) return { error: `محتاج ${this.formatNum(reward.cost - s.balance)} نقطة إضافية` };

      if (reward.id === 'mystery_box') {
        const won = Math.floor(Math.random() * 2800) + 200;
        this.spendPoints(reward.cost, `شراء: ${reward.title}`, 'purchase');
        this.addPoints(won, `فتح صندوق الغموض`, 'bonus');
        const s2 = load(); s2.purchasedRewards.push({ id: reward.id, title: reward.title, date: new Date().toISOString() }); save(s2);
        return { ok: true, reward, mysteryWon: won };
      }

      this.spendPoints(reward.cost, `شراء: ${reward.title}`, 'purchase');
      const s2 = load(); s2.purchasedRewards.push({ id: reward.id, title: reward.title, date: new Date().toISOString() }); save(s2);
      return { ok: true, reward };
    },
    getPurchases() { return load().purchasedRewards || []; },

    checkAchievements() {
      for (let i = 0; i < 5; i++) {
        const s = load();
        const newOnes = ACHIEVEMENTS.filter(a => !s.unlockedAchievements.includes(a.id) && a.condition(s));
        if (!newOnes.length) break;
        newOnes.forEach(a => {
          s.unlockedAchievements.push(a.id); s.balance += a.reward; s.earned += a.reward;
          s.activity.unshift({ type: 'achievement', title: `إنجاز: ${a.title}`, points: a.reward, date: new Date().toISOString() });
          window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: a }));
        });
        s.level = calcLevel(s.earned); save(s);
      }
    },
    getAchievements() {
      const s = load();
      return ACHIEVEMENTS.map(a => ({ ...a, unlocked: s.unlockedAchievements.includes(a.id) }));
    },

    getLeaderboard(userName = 'أنت') {
      const s = load();
      const today = new Date().toDateString();
      if (s.lastBotUpdate !== today) {
        BOTS.forEach(b => { if (!s.bots[b.name]) s.bots[b.name] = b.base; s.bots[b.name] += 50 + Math.floor(Math.random() * 450); });
        s.lastBotUpdate = today; save(s);
      }
      const all = BOTS.map(b => ({ name: b.name, avatar: b.avatar, points: s.bots[b.name] || b.base, isUser: false }));
      all.push({ name: userName, avatar: 'A', points: s.balance, isUser: true });
      all.sort((a, b) => b.points - a.points);
      return all;
    },

    getUserName() { return localStorage.getItem('speedora_user_name') || 'Player'; },
    setUserName(name) {
      localStorage.setItem('speedora_user_name', name);
      const s = load(); s.name = name; save(s);
      window.dispatchEvent(new CustomEvent('userNameChanged', { detail: name }));
    },
    getReferralCode() { return load().referralCode; },

    gamesPlayedToday() {
      const s = load(); const today = new Date().toDateString();
      return (s.activity || []).filter(a => a.type === 'game' && new Date(a.date).toDateString() === today).length;
    },
    spunToday() { const s = load(); return s.lastSpin && new Date(s.lastSpin).toDateString() === new Date().toDateString(); },
    claimedDailyToday() { const s = load(); return s.lastClaim && new Date(s.lastClaim).toDateString() === new Date().toDateString(); },
    taskClaimedToday(taskId) {
      const s = load(); const today = new Date().toDateString();
      return (s.activity || []).some(a => a.type === 'task' && a.title === taskId && new Date(a.date).toDateString() === today);
    },

    getLevelInfo() {
      const s = load(); const lvl = calcLevel(s.earned);
      const cur = LEVELS[lvl - 1] || 0; const nxt = LEVELS[lvl] !== undefined ? LEVELS[lvl] : null;
      if (nxt === null) return { level: lvl, name: LEVEL_NAMES[lvl - 1] || 'أسطوري', current: cur, next: null, progress: 100, remaining: 0, isMax: true };
      const rangeSize = nxt - cur;
      const progress = rangeSize > 0 ? Math.min(100, Math.max(0, ((s.earned - cur) / rangeSize) * 100)) : 100;
      return { level: lvl, name: LEVEL_NAMES[lvl - 1] || 'أسطوري', current: cur, next: nxt, progress, remaining: Math.max(0, nxt - s.earned), isMax: false };
    },
    getConversion: () => ({ rate: POINTS_PER_EGP, minRedeem: MIN_REDEEM }),
    streakBonus,

    getActivityStats() {
      const s = load(); const acts = s.activity || [];
      return {
        totalEarned: acts.filter(a => a.points > 0).reduce((sum, a) => sum + a.points, 0),
        totalSpent: acts.filter(a => a.points < 0).reduce((sum, a) => sum + Math.abs(a.points), 0),
        gameEarnings: acts.filter(a => a.type === 'game').reduce((sum, a) => sum + a.points, 0),
        bonusEarnings: acts.filter(a => a.type === 'bonus' || a.type === 'wheel' || a.type === 'scratch').reduce((sum, a) => sum + a.points, 0),
        achievementEarnings: acts.filter(a => a.type === 'achievement').reduce((sum, a) => sum + a.points, 0),
        purchaseSpending: acts.filter(a => a.type === 'purchase' || a.type === 'redeem').reduce((sum, a) => sum + Math.abs(a.points), 0)
      };
    },
    getActivityByType(type) {
      const s = load(); const acts = s.activity || [];
      if (type === 'all') return acts;
      if (type === 'earned') return acts.filter(a => a.points > 0);
      if (type === 'spent') return acts.filter(a => a.points < 0);
      return acts.filter(a => a.type === type);
    },

    isSoundOn() { return localStorage.getItem('speedora_sound') !== 'off'; },
    toggleSound() { const on = !this.isSoundOn(); localStorage.setItem('speedora_sound', on ? 'on' : 'off'); return on; },
    playSound(type) {
      if (!this.isSoundOn()) return;
      try {
        if (!window._audioCtx) window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window._audioCtx; const now = ctx.currentTime;
        const notes = { point: [523.25, 659.25, 783.99], success: [523.25, 659.25, 783.99, 1046.5], fail: [329.63, 261.63], spin: [261.63, 329.63, 392.00, 523.25], achievement: [659.25, 783.99, 987.77, 1318.51] };
        const seq = notes[type] || notes.point;
        seq.forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + i * 0.08); gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
          osc.connect(gain); gain.connect(ctx.destination); osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.3);
        });
      } catch (e) {}
    },

    showToast(message, type = 'info') {
      const colors = { success: 'linear-gradient(135deg, #10b981, #059669)', error: 'linear-gradient(135deg, #ef4444, #dc2626)', info: 'linear-gradient(135deg, #6366f1, #4f46e5)', warning: 'linear-gradient(135deg, #f59e0b, #d97706)' };
      const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
      const old = document.getElementById('sp-toast'); if (old) old.remove();
      const t = document.createElement('div'); t.id = 'sp-toast';
      t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${colors[type]||colors.info};color:white;padding:14px 22px;border-radius:12px;z-index:99999;font-weight:700;font-size:14px;box-shadow:0 10px 40px rgba(0,0,0,.5);display:flex;align-items:center;gap:10px;max-width:90%;font-family:'Cairo',sans-serif;direction:rtl;`;
      t.innerHTML = `<span style="font-size:18px;background:rgba(255,255,255,.2);border-radius:50%;width:26px;height:26px;display:grid;place-items:center;flex-shrink:0">${icons[type]||'ℹ'}</span><span>${message}</span>`;
      document.body.appendChild(t);
      setTimeout(() => { t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
    },

    getLiveFeed() {
      const names = ['أحمد', 'محمد', 'سارة', 'ياسمين', 'علي', 'فاطمة', 'حسن', 'مريم', 'كريم', 'نور'];
      const actions = [{ icon: '🎮', text: 'كسب نقاط من لعبة' }, { icon: '🎡', text: 'لف العجلة' }, { icon: '🎁', text: 'استلم المكافأة اليومية' }, { icon: '🏅', text: 'فتح إنجاز جديد' }, { icon: '🛒', text: 'اشترى مكافأة' }, { icon: '🎫', text: 'فاز في سكراتش' }];
      const items = [];
      for (let i = 0; i < 8; i++) items.push({ name: names[Math.floor(Math.random() * names.length)], action: actions[Math.floor(Math.random() * actions.length)].icon, text: actions[Math.floor(Math.random() * actions.length)].text, pts: [50, 100, 200, 300, 500, 1000][Math.floor(Math.random() * 6)], minsAgo: Math.floor(Math.random() * 15) + 1 });
      return items;
    }
  };

  const style = document.createElement('style');
  style.textContent = `@keyframes spSlide { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } #speedora-live-bar { position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(90deg, #101831, #1a1042); border-top: 1px solid #753cff; padding: 10px 14px; z-index: 9990; font-family: 'Cairo', sans-serif; display: flex; align-items: center; gap: 10px; font-size: 12px; color: #c7a0ff; box-shadow: 0 -4px 20px rgba(117,60,255,.3); direction: rtl; } #speedora-live-bar .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: spPulse 1.5s infinite; flex-shrink: 0; } #speedora-live-bar .feed { flex: 1; overflow: hidden; position: relative; height: 18px; } #speedora-live-bar .feed span { position: absolute; width: 100%; animation: spSlide .5s ease-out; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } @keyframes spPulse { 0%,100%{opacity:1} 50%{opacity:.3} } body { padding-bottom: 50px !important; }`;
  document.head.appendChild(style);

  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('speedora-live-bar')) return;
    const bar = document.createElement('div'); bar.id = 'speedora-live-bar';
    bar.innerHTML = `<span class="dot"></span><div class="feed" id="spFeed"></div><span style="font-size:10px;opacity:.7">🔴 مباشر</span>`;
    document.body.appendChild(bar);
    const feed = document.getElementById('spFeed'); const items = window.Speedora.getLiveFeed(); let idx = 0;
    function showNext() { const it = items[idx % items.length]; feed.innerHTML = `<span>${it.action} <b>${it.name}</b> ${it.text} <b style="color:#10b981">+${it.pts}</b> · قبل ${it.minsAgo} د</span>`; idx++; setTimeout(showNext, 4000); }
    showNext();
  });

  window.addEventListener('levelUp', e => { if (window.Speedora) window.Speedora.showToast(`🎉 وصلت للمستوى ${e.detail.level} - ${e.detail.name}!`, 'success'); });
  window.addEventListener('achievementUnlocked', e => { if (window.Speedora) window.Speedora.showToast(`${e.detail.icon} إنجاز: ${e.detail.title} (+${e.detail.reward})`, 'success'); });

  async function loadFromCloud() {
    try {
      const res = await fetch(`${API_URL}/api/load?userId=${USER_ID}`);
      const data = await res.json();
      if (data.ok && data.state) {
        const local = JSON.parse(localStorage.getItem(KEY) || '{}');
        if (!local.earned || (data.state.earned > local.earned)) {
          localStorage.setItem(KEY, JSON.stringify(data.state));
          if (data.name) localStorage.setItem('speedora_user_name', data.name);
          window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: data.state }));
        }
      }
    } catch (e) { console.warn('⚠️ تعذر التحميل من السحابة', e); }
  }

  function processReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const incomingRef = urlParams.get('ref');
    if (incomingRef) {
      const s = load();
      if (!s.referredBy && s.totalGamesPlayed === 0 && s.balance <= 1250) {
        s.referredBy = incomingRef; s.balance += 500; s.earned += 500;
        s.activity.unshift({ type: 'bonus', title: 'مكافأة الترحيب (كود إحالة)', points: 500, date: new Date().toISOString() });
        save(s); window.history.replaceState({}, document.title, window.location.pathname);
        if (window.Speedora) window.Speedora.showToast('🎉 تم إضافة 500 نقطة من كود الإحالة!', 'success');
        
        fetch(`${API_URL}/api/referral/apply`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newUserId: USER_ID, newUserName: Speedora.getUserName(), referralCode: incomingRef })
        }).catch(e => console.warn('فشل تطبيق الإحالة', e));
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadFromCloud, 500); setTimeout(processReferral, 1000); 
  });

})();
