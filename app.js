import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ipykgtdgipphehgpzytn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eCjkurxOEZjUQFfvKjYS2g_L_R_NZaSq";
// ضع رابط Worker بعد نشره، مثال: https://speedora-api.YOUR-SUBDOMAIN.workers.dev
const SPEEDORA_API = "https://REPLACE-WITH-YOUR-WORKER-URL";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Number(n||0).toLocaleString('en-US');
function toast(t){let x=$('.toast');if(x)x.remove();x=document.createElement('div');x.className='toast';x.textContent=t;document.body.append(x);setTimeout(()=>x.remove(),3000)}
let session=null, profile=null, balances={gaming:0,pending_reward:0,available_reward:0}, ledger=[];
async function api(path, options={}){
 if(!session?.access_token) throw new Error('سجّل الدخول أولًا.');
 if(SPEEDORA_API.includes('REPLACE-WITH')) throw new Error('رابط Speedora API لم يتم ضبطه بعد.');
 const r=await fetch(SPEEDORA_API+path,{...options,headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token,...(options.headers||{})}});
 const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error||'تعذر الاتصال بالخادم.'); return data;
}
function render(){
 $$('#balance').forEach(x=>x.textContent=fmt(balances.gaming));
 $$('#earned').forEach(x=>x.textContent=fmt(balances.gaming));
 $$('#redeemed').forEach(x=>x.textContent='0');
 $$('#profilePoints').forEach(x=>x.textContent=fmt(balances.gaming));
 const activity=$('#activity'); if(activity){activity.innerHTML=''; if(!ledger.length) activity.innerHTML='<p class="muted">No activity yet.</p>'; ledger.forEach(v=>{const row=document.createElement('div');row.className='activity';const l=document.createElement('span');l.textContent=v.reason+' · '+new Date(v.created_at).toLocaleString();const r=document.createElement('b');r.textContent=(v.amount>0?'+':'')+fmt(v.amount)+' pts';row.append(l,r);activity.append(row)})}
 $$('.user b').forEach(x=>x.textContent=profile?.display_name||session?.user?.email||'Speedora Player');
 $$('.user small').forEach(x=>x.textContent=session?'Connected account':'Sign in required');
}
async function refreshAccount(){const [me,history]=await Promise.all([api('/api/me'),api('/api/ledger')]);profile=me.profile;balances=me.balances;ledger=history.transactions||[];render()}
async function init(){
 const {data}=await supabase.auth.getSession(); session=data.session;
 supabase.auth.onAuthStateChange((_event,s)=>{session=s; if(!s){location.href='auth.html'} else refreshAccount().catch(e=>toast(e.message))});
 if(!session){if(!location.pathname.endsWith('auth.html')) location.href='auth.html';return}
 try{await refreshAccount()}catch(e){toast(e.message)}
}
init();
$('#menu')?.addEventListener('click',()=>$('.sidebar')?.classList.toggle('open'));
document.addEventListener('click',e=>{let s=$('.sidebar');if(s?.classList.contains('open')&&!s.contains(e.target)&&!e.target.closest('#menu'))s.classList.remove('open')});
$('#search')?.addEventListener('input',e=>{let q=e.target.value.toLowerCase();$$('.card,.task,.feature,.game,.offer').forEach(x=>x.hidden=!!q&&!x.textContent.toLowerCase().includes(q))});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>x.classList.toggle('active',x===b));let cat=b.dataset.filter;$$('[data-category]').forEach(x=>x.hidden=cat!=='all'&&x.dataset.category!==cat)}));
const gameData={quiz:{title:'Quiz Master',q:'Which planet is known as the Red Planet?',opts:['Mars','Venus','Jupiter'],answer:'Mars'},memory:{title:'Memory Match',q:'Which two symbols are identical?',opts:['◆ ●','★ ★','▲ ■'],answer:'★ ★'},merge:{title:'Number Merge',q:'Which number is double 16?',opts:['24','32','64'],answer:'32'},speed:{title:'Speed Tap',q:'Choose the lightning bolt.',opts:['☁ Cloud','⚡ Lightning','❄ Snow'],answer:'⚡ Lightning'},world:{title:'World Facts',q:'Which ocean is the largest?',opts:['Pacific','Arctic','Indian'],answer:'Pacific'},logic:{title:'Pattern Logic',q:'What comes next: 2, 4, 6, ...?',opts:['7','8','10'],answer:'8'}};
$$('.play').forEach(b=>b.addEventListener('click',()=>{const d=gameData[b.dataset.game],box=$('#gamebox');if(!d||!box)return;box.hidden=false;$('#gameTitle').textContent=d.title;$('#question').textContent=d.q;$('#gameMessage').textContent='سجّل دخولك للعب واحتساب النقاط على حسابك.';const area=$('#answers');area.innerHTML='';d.opts.forEach(o=>{const x=document.createElement('button');x.className='filter';x.textContent=o;x.onclick=async()=>{if(x.disabled)return;area.querySelectorAll('button').forEach(y=>y.disabled=true);if(o!==d.answer){$('#gameMessage').textContent='إجابة غير صحيحة. لم تتم إضافة نقاط.';return}try{const result=await api('/api/games/complete',{method:'POST',body:JSON.stringify({game_id:b.dataset.game,answer:o,completion_id:crypto.randomUUID()})});$('#gameMessage').textContent=`إجابة صحيحة! تمت إضافة ${result.awarded} نقطة إلى حسابك.`;await refreshAccount();toast('تم تحديث رصيدك من الخادم.')}catch(e){$('#gameMessage').textContent=e.message;toast(e.message)}};area.append(x)});box.scrollIntoView({behavior:'smooth',block:'start'})}));
$('#closeGame')?.addEventListener('click',()=>$('#gamebox').hidden=true);
$$('.taskbtn').forEach(b=>b.addEventListener('click',()=>toast('العروض الحقيقية لم يتم ربطها بعد.')));
$$('.redeem').forEach(b=>b.addEventListener('click',()=>toast('الاستبدال غير متاح حاليًا.')));
$('#reset')?.addEventListener('click',()=>toast('لا يمكن مسح رصيد الحساب من المتصفح.'));
$('#profileForm')?.addEventListener('submit',e=>{e.preventDefault();toast('تعديل الملف الشخصي سيتم تفعيله في المرحلة التالية.')});
$('#supportForm')?.addEventListener('submit',e=>{e.preventDefault();toast('نموذج الدعم لم يتم ربطه بالخادم بعد.')});
