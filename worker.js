const COOKIE = "speedora_session";
const SESSION_DAYS = 7;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    try {
      if (url.pathname.startsWith("/api/")) return await api(request, env, url);
      return page(url.pathname);
    } catch (err) {
      console.error("Speedora error:", err);
      return json({ error: "حدث خطأ داخلي. حاول مرة أخرى." }, 500);
    }
  },
};

async function api(request, env, url) {
  const path = url.pathname;
  if (path === "/api/health" && request.method === "GET")
    return json({ ok: true, app: "Speedora API" });

  if (path === "/api/signup" && request.method === "POST") {
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role = ["worker", "advertiser"].includes(body.role) ? body.role : "worker";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || password.length < 10)
      return json({ error: "أدخل بيانات صحيحة، وكلمة مرور 10 أحرف على الأقل." }, 400);
    const adminEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
    const finalRole = adminEmail && email === adminEmail ? "admin" : role;
    const salt = randomHex(16);
    const hash = await passwordHash(password, salt);
    try {
      const result = await env.DB.prepare(
        "INSERT INTO users(email,name,password_hash,password_salt,role,created_at) VALUES(?,?,?,?,?,?)"
      ).bind(email, name, hash, salt, finalRole, now()).run();
      const userId = result.meta.last_row_id;
      return await createSession(env, userId, finalRole, 201);
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) return json({ error: "البريد الإلكتروني مسجل بالفعل." }, 409);
      throw e;
    }
  }

  if (path === "/api/login" && request.method === "POST") {
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if (!user || !(await passwordVerify(password, user.password_salt, user.password_hash)))
      return json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }, 401);
    return await createSession(env, user.id, user.role, 200);
  }

  if (path === "/api/logout" && request.method === "POST") {
    const token = getCookie(request, COOKIE);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return json({ success: true }, 200, { "Set-Cookie": `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
  }

  const auth = await authenticate(request, env);
  if (path === "/api/me" && request.method === "GET") {
    if (!auth) return json({ user: null });
    return json({ user: publicUser(auth) });
  }
  if (!auth) return json({ error: "سجل الدخول أولاً." }, 401);

  if (path === "/api/tasks" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT t.id,t.title,t.description,t.reward_points,t.created_at,u.name advertiser_name FROM tasks t JOIN users u ON u.id=t.advertiser_id WHERE t.status='open' ORDER BY t.id DESC LIMIT 100"
    ).all();
    return json({ tasks: results });
  }

  if (path === "/api/tasks" && request.method === "POST") {
    if (!["advertiser", "admin"].includes(auth.role)) return json({ error: "هذه الخاصية للمعلنين فقط." }, 403);
    const b = await readBody(request);
    const title = String(b.title || "").trim();
    const description = String(b.description || "").trim();
    const points = Number(b.reward_points);
    if (title.length < 4 || description.length < 10 || !Number.isInteger(points) || points < 1 || points > 100000)
      return json({ error: "راجع عنوان المهمة ووصفها وعدد نقاطها." }, 400);
    const result = await env.DB.batch([
      env.DB.prepare("UPDATE users SET balance=balance-? WHERE id=? AND balance>=?").bind(points, auth.id, points),
      env.DB.prepare("INSERT INTO tasks(advertiser_id,title,description,reward_points,status,created_at) SELECT ?,?,?,?,'open',? WHERE changes()>0")
        .bind(auth.id, title, description, points, now()),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference,created_at) SELECT ?,?,?,?,? WHERE changes()>0")
        .bind(auth.id, -points, "task_reserve", "task_creation", now()),
    ]);
    if (!result[0].meta.changes) return json({ error: "رصيدك من النقاط غير كافٍ." }, 400);
    return json({ success: true, message: "تم نشر المهمة وحجز نقاطها." }, 201);
  }

  if (path === "/api/submit" && request.method === "POST") {
    const b = await readBody(request);
    const taskId = Number(b.task_id);
    const proof = String(b.proof_url || "").trim();
    let parsed;
    try { parsed = new URL(proof); } catch {}
    if (!Number.isInteger(taskId) || !parsed || !["https:", "http:"].includes(parsed.protocol))
      return json({ error: "أدخل رقم مهمة ورابط إثبات صحيح." }, 400);
    const task = await env.DB.prepare("SELECT id FROM tasks WHERE id=? AND status='open'").bind(taskId).first();
    if (!task) return json({ error: "المهمة غير متاحة." }, 404);
    try {
      const r = await env.DB.prepare(
        "INSERT INTO submissions(task_id,worker_id,proof_url,status,created_at) VALUES(?,?,?,'pending',?)"
      ).bind(taskId, auth.id, proof, now()).run();
      return json({ success: true, submission_id: r.meta.last_row_id }, 201);
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) return json({ error: "سبق وأرسلت إثباتاً لهذه المهمة." }, 409);
      throw e;
    }
  }

  if (path === "/api/admin/submissions" && request.method === "GET") {
    if (auth.role !== "admin") return json({ error: "غير مصرح." }, 403);
    const { results } = await env.DB.prepare(
      "SELECT s.id,s.task_id,s.worker_id,s.proof_url,s.created_at,t.title,u.name worker_name FROM submissions s JOIN tasks t ON t.id=s.task_id JOIN users u ON u.id=s.worker_id WHERE s.status='pending' ORDER BY s.id"
    ).all();
    return json({ submissions: results });
  }

  if (path === "/api/admin/approve" && request.method === "POST") {
    if (auth.role !== "admin") return json({ error: "غير مصرح." }, 403);
    const b = await readBody(request);
    const id = Number(b.submission_id);
    if (!Number.isInteger(id)) return json({ error: "رقم إثبات غير صحيح." }, 400);
    const submission = await env.DB.prepare(
      "SELECT s.id,s.worker_id,s.task_id,t.reward_points FROM submissions s JOIN tasks t ON t.id=s.task_id WHERE s.id=? AND s.status='pending'"
    ).bind(id).first();
    if (!submission) return json({ error: "الإثبات غير موجود أو تمت مراجعته." }, 404);
    await env.DB.batch([
      env.DB.prepare("UPDATE submissions SET status='approved',reviewed_at=? WHERE id=? AND status='pending'").bind(now(), id),
      env.DB.prepare("INSERT OR IGNORE INTO wallet_ledger(user_id,delta,kind,reference,created_at) SELECT ?,?,'task_reward',?,? WHERE changes()>0")
        .bind(submission.worker_id, submission.reward_points, `submission:${id}`, now()),
      env.DB.prepare("UPDATE users SET balance=balance+? WHERE id=? AND changes()>0")
        .bind(submission.reward_points, submission.worker_id),
      env.DB.prepare("UPDATE tasks SET status='completed' WHERE id=? AND EXISTS(SELECT 1 FROM submissions WHERE id=? AND status='approved')")
        .bind(submission.task_id, id),
    ]);
    return json({ success: true, message: "تم اعتماد الإثبات." });
  }

  if (path === "/api/wallet" && request.method === "GET") {
    const user = await env.DB.prepare("SELECT id,name,email,balance,role FROM users WHERE id=?").bind(auth.id).first();
    const { results } = await env.DB.prepare(
      "SELECT delta,kind,created_at FROM wallet_ledger WHERE user_id=? ORDER BY id DESC LIMIT 30"
    ).bind(auth.id).all();
    return json({ wallet: user, transactions: results });
  }

  return json({ error: "المسار غير موجود." }, 404);
}

async function createSession(env, userId, role, status) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?)")
    .bind(userId, tokenHash, expires, now()).run();
  const user = await env.DB.prepare("SELECT id,email,name,role,balance FROM users WHERE id=?").bind(userId).first();
  return json({ success: true, user: publicUser(user) }, status, {
    "Set-Cookie": `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}`,
  });
}

async function authenticate(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT u.id,u.email,u.name,u.role,u.balance FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?"
  ).bind(hash, now()).first();
  return row || null;
}
function publicUser(u) { return { id: u.id, email: u.email, name: u.name, role: u.role, balance: u.balance }; }
function getCookie(req, name) {
  const raw = req.headers.get("Cookie") || "";
  const item = raw.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return item ? item.slice(name.length + 1) : null;
}
async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}
function now() { return new Date().toISOString(); }
function randomHex(bytes) {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return [...a].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 310000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function passwordVerify(password, salt, expected) {
  const actual = await passwordHash(password, salt);
  return actual.length === expected.length && [...actual].reduce((n, c, i) => n | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0;
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}

function page(path) {
  const pages = ["/", "/signup", "/login", "/dashboard", "/tasks", "/wallet", "/admin"];
  if (!pages.includes(path)) return new Response("Not found", { status: 404 });
  const title = path === "/" ? "Speedora" : ({"/signup":"إنشاء حساب","/login":"تسجيل الدخول","/dashboard":"لوحة التحكم","/tasks":"المهام","/wallet":"المحفظة","/admin":"الإدارة"}[path]);
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101014"><title>${title} | Speedora</title><style>
  *{box-sizing:border-box}body{margin:0;background:#101014;color:#f5f2ea;font-family:Tahoma,Arial,sans-serif}header{padding:18px 6%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #29282c}a{color:#e8bd62;text-decoration:none;margin:0 8px}.brand{font-size:23px;font-weight:bold;color:#e8bd62}.wrap{max-width:1000px;margin:45px auto;padding:20px}.hero,.panel,.task{background:#19191f;border:1px solid #33313a;border-radius:18px;padding:25px;margin:16px 0}.hero{text-align:center;padding:55px 25px}.hero h1{font-size:42px;margin:5px}.gold{color:#e8bd62}p{color:#c4c1c8;line-height:1.8}button{background:#e8bd62;color:#17130a;border:0;padding:13px 20px;border-radius:10px;font-weight:bold;cursor:pointer;margin:5px}input,textarea,select{width:100%;padding:13px;margin:8px 0;background:#101014;border:1px solid #45414b;color:white;border-radius:9px}label{display:block;margin-top:12px;color:#ddd}nav{display:flex;gap:8px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.muted{color:#aaa;font-size:13px}.hidden{display:none}.notice{padding:12px;border-radius:9px;background:#29251b;color:#f2d58d;margin:12px 0}.task h3{margin-top:0}@media(max-width:600px){.hero h1{font-size:31px}.wrap{margin:20px auto;padding:12px}header{padding:14px}}
  </style></head><body><header><a class="brand" href="/">SPEEDORA</a><nav><a href="/dashboard">الرئيسية</a><a href="/tasks">المهام</a><a href="/wallet">المحفظة</a><a href="/signup">حساب جديد</a><a href="/login">دخول</a></nav></header><main class="wrap" id="app"></main><script>
  const path=location.pathname, app=document.getElementById('app');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url,method='GET',body){const r=await fetch('/api'+url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'حدث خطأ');return d}
  function form(title,fields,button,handler){app.innerHTML='<section class="panel"><h2>'+title+'</h2><div id="msg" class="notice hidden"></div><form id="f">'+fields+'<button>'+button+'</button></form></section>';document.getElementById('f').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{await handler(data);location.href='/dashboard'}catch(x){const m=document.getElementById('msg');m.textContent=x.message;m.classList.remove('hidden')}}}
  async function render(){
    if(path==='/'){app.innerHTML='<section class="hero"><div class="gold">منصة التحديات والمكافآت</div><h1>العب، أنجز، واجمع <span class="gold">النقاط</span></h1><p>Speedora تجمع بين التحديات والمهام في تجربة واحدة. ابدأ مجاناً واكتشف المهام المتاحة.</p><a href="/signup"><button>ابدأ الآن</button></a><a href="/tasks">استكشف المهام</a></section><div class="grid"><section class="panel"><h3>🎮 تحديات</h3><p>تجربة مهام وتحديات بسيطة.</p></section><section class="panel"><h3>⭐ نقاط</h3><p>اجمع نقاطاً مقابل المهام المعتمدة.</p></section><section class="panel"><h3>🔒 حساب آمن</h3><p>جلسات دخول وصلاحيات منفصلة.</p></section></div>';return}
    if(path==='/signup'){form('إنشاء حساب','<label>الاسم</label><input name="name" required minlength="2"><label>البريد الإلكتروني</label><input name="email" type="email" required><label>كلمة المرور (10 أحرف على الأقل)</label><input name="password" type="password" minlength="10" required><label>نوع الحساب</label><select name="role"><option value="worker">تنفيذ المهام</option><option value="advertiser">نشر المهام</option></select>','إنشاء الحساب',d=>api('/signup','POST',d));return}
    if(path==='/login'){form('تسجيل الدخول','<label>البريد الإلكتروني</label><input name="email" type="email" required><label>كلمة المرور</label><input name="password" type="password" required>','دخول',d=>api('/login','POST',d));return}
    let me;try{me=(await api('/me')).user}catch{}if(!me){app.innerHTML='<section class="panel"><h2>سجل الدخول للمتابعة</h2><a href="/login"><button>تسجيل الدخول</button></a></section>';return}
    if(path==='/dashboard'){app.innerHTML='<section class="hero"><div class="gold">أهلاً '+esc(me.name)+'</div><h1>'+Number(me.balance).toLocaleString('ar-EG')+' <span class="gold">نقطة</span></h1><p>رصيد النقاط الحالي</p><a href="/tasks"><button>شاهد المهام</button></a></section><section class="panel"><p>نوع الحساب: '+esc(me.role)+'</p><button id="out">تسجيل الخروج</button></section>';document.getElementById('out').onclick=async()=>{await api('/logout','POST',{});location.href='/'};return}
    if(path==='/tasks'){let data=await api('/tasks');app.innerHTML='<h2>المهام المتاحة</h2><div id="tasks"></div>'+(me.role==='advertiser'||me.role==='admin'?'<section class="panel"><h3>نشر مهمة جديدة</h3><form id="new"><input name="title" placeholder="عنوان المهمة" required><textarea name="description" placeholder="وصف المهمة" required></textarea><input name="reward_points" type="number" min="1" placeholder="النقاط المحجوزة" required><button>نشر المهمة</button></form></section>':'');document.getElementById('tasks').innerHTML=data.tasks.length?data.tasks.map(t=>'<article class="task"><h3>'+esc(t.title)+'</h3><p>'+esc(t.description)+'</p><b class="gold">'+t.reward_points+' نقطة</b><p class="muted">بواسطة '+esc(t.advertiser_name)+'</p><form class="submit" data-id="'+t.id+'"><input name="proof_url" type="url" placeholder="رابط إثبات التنفيذ" required><button>إرسال الإثبات</button></form></article>').join(''):'<p>لا توجد مهام متاحة حالياً.</p>';document.querySelectorAll('.submit').forEach(f=>f.onsubmit=async e=>{e.preventDefault();try{await api('/submit','POST',{task_id:Number(f.dataset.id),proof_url:new FormData(f).get('proof_url')});alert('تم إرسال الإثبات للمراجعة')}catch(x){alert(x.message)}});const nf=document.getElementById('new');if(nf)nf.onsubmit=async e=>{e.preventDefault();try{await api('/tasks','POST',Object.fromEntries(new FormData(nf)));alert('تم نشر المهمة');location.reload()}catch(x){alert(x.message)}};return}
    if(path==='/wallet'){let d=await api('/wallet');app.innerHTML='<section class="panel"><h2>المحفظة</h2><h1 class="gold">'+Number(d.wallet.balance).toLocaleString('ar-EG')+' نقطة</h1></section><h3>آخر الحركات</h3>'+d.transactions.map(x=>'<article class="task">'+esc(x.kind)+' — <b class="gold">'+(x.delta>0?'+':'')+x.delta+'</b><p class="muted">'+esc(x.created_at)+'</p></article>').join('');return}
    if(path==='/admin'){if(me.role!=='admin'){app.innerHTML='<section class="panel">غير مصرح لك بالدخول.</section>';return}let d=await api('/admin/submissions');app.innerHTML='<h2>مراجعة الإثباتات</h2>'+d.submissions.map(s=>'<article class="task"><b>'+esc(s.title)+'</b><p>المستخدم: '+esc(s.worker_name)+'</p><a target="_blank" rel="noopener" href="'+esc(s.proof_url)+'">فتح الإثبات</a><p><button data-id="'+s.id+'">اعتماد وصرف النقاط</button></p></article>').join('');document.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{try{await api('/admin/approve','POST',{submission_id:Number(b.dataset.id)});location.reload()}catch(x){alert(x.message)}});return}
  }
  render().catch(e=>app.innerHTML='<section class="panel">'+esc(e.message)+'</section>');
  </script></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
