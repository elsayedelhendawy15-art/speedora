export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Speedora | الرئيسية</title>
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
  .hero{text-align:center;padding:50px 0}
  .hero h1{font-size:2.5rem;margin-bottom:10px}
  .hero p{color:var(--muted);margin-bottom:20px}
</style>
</head>
<body>
  <aside class="sidebar">
    <a class="brand" href="/"><i class="fa-solid fa-bolt"></i> Speedora</a>
    <nav class="nav">
      <a href="#"><i class="fa-solid fa-house"></i> الرئيسية</a>
      <a href="#"><i class="fa-solid fa-list-check"></i> المهام</a>
      <a href="#"><i class="fa-solid fa-wallet"></i> المحفظة</a>
    </nav>
  </aside>
  <main class="main">
    <div class="hero">
      <h1>العب، أنجز، واجمع <span style="color:#6c5ce7">النقاط</span></h1>
      <p>Speedora تجمع بين التحديات والمهام في تجربة واحدة. ابدأ مجاناً واكتشف المهام المتاحة.</p>
      <a href="#" class="btn">ابدأ الآن</a>
    </div>
    <div class="grid">
      <div class="card"><h3>🎮 تحديات</h3><p>تجربة مهام وتحديات بسيطة.</p></div>
      <div class="card"><h3>⭐ نقاط</h3><p>اجمع نقاطاً مقابل المهام المعتمدة.</p></div>
      <div class="card"><h3>🔒 حساب آمن</h3><p>جلسات دخول وصلاحيات منفصلة.</p></div>
    </div>
  </main>
</body>
</html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response("Not found", { status: 404 });
  },
};
