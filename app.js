/* ============================================
   app.js — Speedora Demo (Local Storage)
   ============================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Number(n || 0).toLocaleString('en-US');

// إعدادات النقاط الافتراضية
let state = JSON.parse(localStorage.getItem('speedora_state')) || {
  balance: 1250,
  earned: 0,
  redeemed: 0,
  activity: []
};

function save() {
  localStorage.setItem('speedora_state', JSON.stringify(state));
}

function toast(msg) {
  let x = $('.toast');
  if (x) x.remove();
  x = document.createElement('div');
  x.className = 'toast';
  x.textContent = msg;
  document.body.append(x);
  setTimeout(() => x.remove(), 3000);
}

function render() {
  // تحديث الأرقام في كل الصفحات
  $$('#balance').forEach(el => el.textContent = fmt(state.balance));
  $$('#earned').forEach(el => el.textContent = fmt(state.earned));
  $$('#redeemed').forEach(el => el.textContent = fmt(state.redeemed));
  $$('#profilePoints').forEach(el => el.textContent = fmt(state.balance));

  // تحديث سجل النشاط
  const act = $('#activity');
  if (act) {
    act.innerHTML = '';
    if (!state.activity.length) {
      act.innerHTML = '<p class="muted">No activity yet.</p>';
    } else {
      state.activity.slice(0, 10).forEach(v => {
        const row = document.createElement('div');
        row.className = 'activity';
        row.innerHTML = `<span>${v.title} · ${v.date}</span><b style="color:#00b894">+${fmt(v.points)} pts</b>`;
        act.append(row);
      });
    }
  }
}

// دالة إضافة النقاط
function addPoints(title, points) {
  state.balance += points;
  state.earned += points;
  state.activity.unshift({
    title,
    points,
    date: new Date().toLocaleDateString('ar-EG')
  });
  save();
  render();
  toast(`+${points} نقطة!`);
}

// ===== التحكم في السايدبار والبحث =====
$('#menu')?.addEventListener('click', () => $('.sidebar')?.classList.toggle('open'));
document.addEventListener('click', e => {
  const s = $('.sidebar');
  if (s?.classList.contains('open') && !s.contains(e.target) && !e.target.closest('#menu')) {
    s.classList.remove('open');
  }
});
$('#search')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  $$('.card,.task,.feature,.game,.offer').forEach(x => {
    x.hidden = !!q && !x.textContent.toLowerCase().includes(q);
  });
});

// ===== الألعاب =====
const gameData = {
  quiz:    { title: 'Quiz Master',   q: 'Which planet is known as the Red Planet?', opts: ['Mars','Venus','Jupiter'], answer: 'Mars' },
  memory:  { title: 'Memory Match',  q: 'Which two symbols are identical?',         opts: ['◆ ●','★ ★','▲ ■'],       answer: '★ ★' },
  merge:   { title: 'Number Merge',  q: 'Which number is double 16?',               opts: ['24','32','64'],          answer: '32' },
  speed:   { title: 'Speed Tap',     q: 'Choose the lightning bolt.',               opts: ['☁ Cloud','⚡ Lightning','❄ Snow'], answer: '⚡ Lightning' },
  world:   { title: 'World Facts',   q: 'Which ocean is the largest?',              opts: ['Pacific','Arctic','Indian'], answer: 'Pacific' },
  logic:   { title: 'Pattern Logic', q: 'What comes next: 2, 4, 6, ...?',           opts: ['7','8','10'],            answer: '8' },
};

$$('.play').forEach(b => b.addEventListener('click', () => {
  const d = gameData[b.dataset.game], box = $('#gamebox');
  if (!d || !box) return;
  
  box.hidden = false;
  $('#gameTitle').textContent = d.title;
  $('#question').textContent = d.q;
  $('#gameMessage').textContent = 'اختر الإجابة الصحيحة لتربح النقاط.';
  
  const area = $('#answers');
  area.innerHTML = '';
  d.opts.forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'filter';
    btn.textContent = o;
    btn.onclick = () => {
      area.querySelectorAll('button').forEach(x => x.disabled = true);
      if (o === d.answer) {
        $('#gameMessage').textContent = 'إجابة صحيحة! تم إضافة النقاط.';
        addPoints(d.title + ' demo', Number(b.dataset.points));
      } else {
        $('#gameMessage').textContent = 'إجابة خاطئة! لم يتم إضافة نقاط.';
      }
    };
    area.append(btn);
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

$('#closeGame')?.addEventListener('click', () => $('#gamebox').hidden = true);

// ===== أزرار المهام والمكافآت =====
$$('.taskbtn').forEach(b => b.addEventListener('click', () => toast('هذه المهمة للعرض فقط.')));
$$('.redeem').forEach(b => b.addEventListener('click', () => toast('الاستبدال غير متاح في النسخة التجريبية.')));

// ===== فورم البروفايل والدعم =====
$('#profileForm')?.addEventListener('submit', e => {
  e.preventDefault();
  toast('تم حفظ البيانات محليًا.');
});
$('#supportForm')?.addEventListener('submit', e => {
  e.preventDefault();
  toast('تم إرسال الرسالة (محليًا).');
});

// تشغيل التحديث عند فتح أي صفحة
render();
