// ===== worker.js (النسخة النهائية المدمجة) =====

// دالة مساعدة للردود JSON
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });
}

// ===== دالة بناء الصفحات (التصميم القديم) =====
function page(path) {
  const pages = ["/", "/signup", "/login", "/dashboard", "/tasks", "/wallet", "/admin"];
  if (!pages.includes(path)) return new Response("Not found", { status: 404 });
  
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Speedora | ${path === "/" ? "الرئيسية" : path.replace("/", "")}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
  :root{--primary:#6c5ce7;--bg:#f5f6fa;--card:#fff;--text:#2d3436;--muted:#636e72;--border:#e4e6ee}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',sans-serif;background:var(--bg);color:var(--text);display:flex;min-height:100vh}
  .sidebar{width:250px;background:#fff;border-left:1px solid var(--border);padding:20px;position:fixed;height:100vh;right:0}
  .main{margin-right:250px;padding:20px;width:calc(100% - 250px)}
  .brand{font-size:1.5rem;font-weight:800;color:var(--primary);margin-bottom:30px;display:block;text-decoration:none}
  .nav a{display:block;padding:12px;color:var(--muted);text-decoration:none;border-radius:10px;margin-bottom:5px;font-weight:600}
  .nav a:hover,.nav a.active{background:#efedff;color:var(--primary)}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;margin-bottom:15px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:15px}
  .btn{background:var(--primary);color:#fff;border:0;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
  .btn:hover{background:#5649c7}
  input,select{padding:10px;border:1px solid var(--border);border-radius:10px;width:100%;margin-bottom:10px;font-family:inherit}
  .hero{text-align:center;padding:50px 0}
  .hero h1{font-size:2.5rem;margin-bottom:10px}
  .hero p{color:var(--muted);margin-bottom:20px}
</style>
</head>
<body>
  <aside class="sidebar">
    <a class="brand" href="/"><i class="fa-solid fa-bolt"></i> Speedora</a>
    <nav class="nav">
      <a href="/dashboard"><i class="fa-solid fa-house"></i> الرئيسية</a>
      <a href="/tasks"><i class="fa-solid fa-list-check"></i> المهام</a>
      <a href="/wallet"><i class="fa-solid fa-wallet"></i> المحفظة</a>
      <a href="/login"><i class="fa-solid fa-right-to-bracket"></i> دخول</a>
      <a href="/signup"><i class="fa-solid fa-user-plus"></i> حساب جديد</a>
    </nav>
  </aside>
  <main class="main" id="app">
    <div style="text-align:center;padding:50px;color:#636e72">جاري التحميل...</div>
  </main>
  <script>
    const app = document.getElementById('app');
    const path = location.pathname;
    
    async function api(url, method='GET', body) {
      const res = await fetch('/api'+url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: body ? JSON.stringify(body) : undefined
      });
      return res.json();
    }

    if (path === '/') {
      app.innerHTML = `
        <div class="hero">
          <h1>العب، أنجز، واجمع <span style="color:#6c5ce7">النقاط</span></h1>
          <p>Speedora تجمع بين التحديات والمهام في تجربة واحدة. ابدأ مجاناً واكتشف المهام المتاحة.</p>
          <a href="/signup" class="btn">ابدأ الآن</a>
        </div>
        <div class="grid">
          <div class="card"><h3>🎮 تحديات</h3><p>تجربة مهام وتحديات بسيطة.</p></div>
          <div class="card"><h3>⭐ نقاط</h3><p>اجمع نقاطاً مقابل المهام المعتمدة.</p></div>
          <div class="card"><h3>🔒 حساب آمن</h3><p>جلسات دخول وصلاحيات منفصلة.</p></div>
        </div>
      `;
    }

    if (path === '/login' || path === '/signup') {
      const isLogin = path === '/login';
      app.innerHTML = `
        <div style="max-width:400px;margin:50px auto">
          <div class="card">
            <h2 style="margin-bottom:20px">${isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
            <form id="form">
              ${!isLogin ? '<label>الاسم</label><input name="name" required>' : ''}
              <label>البريد الإلكتروني</label><input name="email" type="email" required>
              <label>كلمة المرور</label><input name="password" type="password" required minlength="10">
              ${!isLogin ? '<label>نوع الحساب</label><select name="role"><option value="worker">عامل</option><option value="advertiser">معلن</option></select>' : ''}
              <button class="btn" style="width:100%;margin-top:15px">${isLogin ? 'دخول' : 'إنشاء'}</button>
            </form>
            <p style="margin-top:15px;text-align:center;color:#636e72">
              ${isLogin ? 'ليس لديك حساب؟ <a href="/signup">سجل الآن</a>' : 'لديك حساب؟ <a href="/login">دخول</a>'}
            </p>
          </div>
        </div>
      `;
      document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
          const endpoint = isLogin ? '/login' : '/signup';
          const res = await api(endpoint, 'POST', data);
          if (res.error) throw new Error(res.error);
          location.href = '/dashboard';
        } catch (err) {
          alert(err.message);
        }
      };
    }

    if (path === '/dashboard') {
      app.innerHTML = '<div class="card"><h2>جاري التحميل...</h2></div>';
      api('/me').then(res => {
        if (!res.user) { location.href = '/login'; return; }
        app.innerHTML = `
          <div class="card" style="background:linear-gradient(135deg, #6c5ce7, #a29bfe);color:white">
            <h2>أهلاً، ${res.user.name}</h2>
            <p style="font-size:2rem;font-weight:bold">${res.user.balance} نقطة</p>
          </div>
          <div class="grid">
            <a href="/tasks" class="card" style="text-decoration:none;color:inherit"><h3>🎯 المهام</h3><p>تصفح المهام المتاحة</p></a>
            <a href="/wallet" class="card" style="text-decoration:none;color:inherit"><h3>💳 المحفظة</h3><p>سجل المعاملات</p></a>
          </div>
        `;
      });
    }

    if (path === '/tasks') {
      app.innerHTML = '<div class="card"><h2>جاري تحميل المهام...</h2></div>';
      api('/tasks').then(res => {
        if (res.error) { app.innerHTML = `<div class="card">${res.error}</div>`; return; }
        app.innerHTML = `
          <h2 style="margin-bottom:20px">المهام المتاحة</h2>
          ${res.tasks.length === 0 ? '<div class="card">لا توجد مهام متاحة حالياً.</div>' : 
            res.tasks.map(t => `
              <div class="card">
                <h3>${t.title}</h3>
                <p style="color:#636e72">${t.description}</p>
                <span class="btn" style="background:#00b894">+${t.reward_points} نقطة</span>
              </div>
            `).join('')
          }
        `;
      });
    }

    if (path === '/wallet') {
      app.innerHTML = '<div class="card"><h2>جاري تحميل المحفظة...</h2></div>';
      api('/wallet').then(res => {
        if (res.error) { app.innerHTML = `<div class="card">${res.error}</div>`; return; }
        app.innerHTML = `
          <div class="card">
            <h3>رصيدك الحالي</h3>
            <p style="font-size:2rem;font-weight:bold;color:#6c5ce7">${res.wallet.balance} نقطة</p>
          </div>
          <div class="card">
            <h3>آخر الحركات</h3>
            ${res.transactions.length === 0 ? '<p>لا توجد حركات</p>' : 
              res.transactions.map(tx => `
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">
                  <span>${tx.kind}</span>
                  <span style="color:${tx.delta > 0 ? '#00b894' : '#d63031'}">${tx.delta > 0 ? '+' : ''}${tx.delta}</span>
                </div>
              `).join('')
            }
          </div>
        `;
      });
    }
  </script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ===== الكود الأساسي (API + export default) =====
const COOKIE = "speedora_session";
const SESSION_DAYS = 7;

// ... (هنا يجب أن تضع كود الـ API الكامل الذي كان لديك سابقاً، مع دوال createSession, authenticate, إلخ) ...

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    try {
      if (url.pathname.startsWith("/api/")) return await api(request, env, url);
      return page(url.pathname);
    } catch (err) {
      console.error("Speedora error:", err);
      return json({ error: "حدث خطأ داخلي. حاول مرة أخرى." }, 500);
    }
  },
};

// ... (هنا يجب أن تضع باقي دوال الـ API: api, createSession, authenticate, إلخ) ...
