/* ==========================================
   Speedora — Core Engine v2
   (نقاط + يومية + level + عجلة + إنجازات + leaderboard)
   ========================================== */
(function () {
  const KEY = 'speedora_state';
  const DEFAULTS = {
    balance: 1250, earned: 0, redeemed: 0, activity: [],
    streak: 0, lastClaim: null, level: 1,
    totalGamesPlayed: 0, totalTasksDone: 0,
    lastSpin: null,
    unlockedAchievements: [],
    bots: {}, lastBotUpdate: null
  };

  const POINTS_PER_EGP = 100;
  const MIN_REDEEM = 5000;
  const LEVELS = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000, 35000, 50000];
  const LEVEL_NAMES = ['مبتدئ','نشيط','محترف','خبير','متمكن','أسطورة','نجم','بطل','أسطوري','خارق','لا يُهزم'];

  const WHEEL_PRIZES = [
    { label: '+50', points: 50, color: '#ef4444' },
    { label: '+100', points: 100, color: '#f59e0b' },
    { label: 'حظ أوفر', points: 0, color: '#6b7280' },
    { label: '+200', points: 200, color: '#10b981' },
    { label: '+500', points: 500, color: '#3b82f6' },
    { label: '+50', points: 50, color: '#ef4444' },
    { label: '+1000', points: 1000, color: '#8b5cf6' },
    { label: '+100', points: 100, color: '#f59e0b' }
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
    { id: 'level_5', icon: '🌟', title: 'مستوى 5', desc: 'وصل للمستوى 5', condition: s => s.level >= 5, reward: 500 }
  ];

  const BOTS = [
    { name: 'ShadowKing', avatar: 'S', base: 24680 },
    { name: 'LunaQueen', avatar: 'L', base: 19450 },
    { name: 'CryptoGamer', avatar: 'C', base: 17632 },
    { name: 'FastEagle', avatar: 'F', base: 15420 },
    { name: 'PixelPro', avatar: 'P', base: 13278 },
    { name: 'NeonHunter', avatar: 'N', base: 11890 },
    { name: 'StarNinja', avatar: '★', base: 9456 },
    { name: 'IceWolf', avatar: 'I', base: 8234 },
    { name: 'FireDragon', avatar: 'D', base: 6789 }
  ];

  const load = () => {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
    catch { return { ...DEFAULTS }; }
  };
  const save = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: s }));
  };
  const calcLevel = (earned) => { let l = 1; LEVELS.forEach((v, i) => { if (earned >= v) l = i + 1; }); return l; };
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
      this.checkAchievements();
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
      if (!this.canClaimDaily()) return { error: 'استلمت النهاردة بالفعل. ارجع بكرة!' };
      let ns = 1;
      if (s.lastClaim) {
        const d = Math.floor((new Date() - new Date(s.lastClaim)) / 86400000);
        ns = d === 1 ? s.streak + 1 : 1;
      }
      s.streak = ns;
      s.lastClaim = new Date().toISOString();
      save(s);
      const bonus = streakBonus(ns);
      this.addPoints(bonus, `مكافأة يومية (${ns} يوم)`, 'bonus');
      return { ok: true, bonus, streak: ns };
    },

    /* ===== Wheel ===== */
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
      const s = load();
      s.lastSpin = new Date().toISOString();
      save(s);
      if (prize.points > 0) this.addPoints(prize.points, 'عجلة الحظ', 'wheel');
      return { ok: true, index: idx, prize };
    },

    /* ===== Achievements ===== */
    checkAchievements() {
      for (let i = 0; i < 5; i++) {
        const s = load();
        const newOnes = ACHIEVEMENTS.filter(a => !s.unlockedAchievements.includes(a.id) && a.condition(s));
        if (!newOnes.length) break;
        newOnes.forEach(a => {
          s.unlockedAchievements.push(a.id);
          s.balance += a.reward;
          s.earned += a.reward;
          s.activity.unshift({ type: 'achievement', title: `إنجاز: ${a.title}`, points: a.reward, date: new Date().toISOString() });
          window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: a }));
        });
        s.level = calcLevel(s.earned);
        save(s);
      }
    },
    getAchievements() {
      const s = load();
      return ACHIEVEMENTS.map(a => ({ ...a, unlocked: s.unlockedAchievements.includes(a.id) }));
    },

    /* ===== Leaderboard ===== */
    getLeaderboard(userName = 'أنت') {
      const s = load();
      const today = new Date().toDateString();
      if (s.lastBotUpdate !== today) {
        BOTS.forEach(b => {
          if (!s.bots[b.name]) s.bots[b.name] = b.base;
          s.bots[b.name] += 50 + Math.floor(Math.random() * 450);
        });
        s.lastBotUpdate = today;
        save(s);
      }
      const all = BOTS.map(b => ({ name: b.name, avatar: b.avatar, points: s.bots[b.name] || b.base, isUser: false }));
      all.push({ name: userName, avatar: 'A', points: s.balance, isUser: true });
      all.sort((a, b) => b.points - a.points);
      return all;
    },

    /* ===== Helpers ===== */
    getLevelInfo() {
      const s = load();
      const lvl = calcLevel(s.earned);
      const cur = LEVELS[lvl - 1] || 0;
      const nxt = LEVELS[lvl] || (LEVELS[LEVELS.length - 1] + 15000);
      return {
        level: lvl, name: LEVEL_NAMES[lvl - 1] || 'أسطوري',
        current: cur, next: nxt,
        progress: Math.min(100, ((s.earned - cur) / (nxt - cur)) * 100)
      };
    },
    getConversion: () => ({ rate: POINTS_PER_EGP, minRedeem: MIN_REDEEM }),
    streakBonus
  };

  window.addEventListener('levelUp', e => {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#d43bea,#642cff);color:white;padding:16px 28px;border-radius:14px;z-index:9999;font-weight:bold;box-shadow:0 10px 40px rgba(100,44,255,.5)';
    t.textContent = `🎉 وصلت للمستوى ${e.detail.level} - ${e.detail.name}!`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  });

  window.addEventListener('achievementUnlocked', e => {
    const a = e.detail;
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;padding:14px 24px;border-radius:14px;z-index:9999;font-weight:bold;box-shadow:0 10px 40px rgba(239,68,68,.5)';
    t.textContent = `${a.icon} إنجاز: ${a.title} (+${a.reward})`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
       /* ===== v3 Extensions ===== */
  const SOUND_KEY = 'speedora_sound';

  window.Speedora.getUserName = function() {
    return localStorage.getItem('speedora_user_name') || 'Player';
  };
  window.Speedora.setUserName = function(name) {
    localStorage.setItem('speedora_user_name', name);
    window.dispatchEvent(new CustomEvent('userNameChanged', { detail: name }));
  };

  window.Speedora.getReferralCode = function() {
    let code = localStorage.getItem('speedora_ref_code');
    if (!code) {
      code = 'SPD' + Math.random().toString(36).slice(2, 8).toUpperCase();
      localStorage.setItem('speedora_ref_code', code);
    }
    return code;
  };

  window.Speedora.gamesPlayedToday = function() {
    const s = load();
    const today = new Date().toDateString();
    return (s.activity || []).filter(a => a.type === 'game' && new Date(a.date).toDateString() === today).length;
  };
  window.Speedora.spunToday = function() {
    const s = load();
    return s.lastSpin && new Date(s.lastSpin).toDateString() === new Date().toDateString();
  };
  window.Speedora.claimedDailyToday = function() {
    const s = load();
    return s.lastClaim && new Date(s.lastClaim).toDateString() === new Date().toDateString();
  };
  window.Speedora.taskClaimedToday = function(taskId) {
    const s = load();
    const today = new Date().toDateString();
    return (s.activity || []).some(a => a.type === 'task' && a.title === taskId && new Date(a.date).toDateString() === today);
  };

  /* ===== Sound Engine ===== */
  let audioCtx = null;
  window.Speedora.isSoundOn = function() {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  };
  window.Speedora.toggleSound = function() {
    const on = !this.isSoundOn();
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    return on;
  };
  window.Speedora.playSound = function(type) {
    if (!this.isSoundOn()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx;
      const now = ctx.currentTime;

      const notes = {
        point: [523.25, 659.25, 783.99],  // C-E-G
        success: [523.25, 659.25, 783.99, 1046.5],
        fail: [329.63, 261.63],
        spin: [261.63, 329.63, 392.00, 523.25],
        achievement: [659.25, 783.99, 987.77, 1318.51],
      };
      const seq = notes[type] || notes.point;
      seq.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch (e) { /* silent fail */ }
  };
  });
})();
