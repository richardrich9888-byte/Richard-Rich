/* ===================================================================
   RICHARD RICH — owner.js
   Command center: two-step gate → live client files from Firestore.
   =================================================================== */
'use strict';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const OWNER_EMAIL = (window.OWNER_EMAIL || '').toLowerCase();
const SECRET_CODE = window.OWNER_SECRET_CODE || '';

let BOOKINGS = [];          // cached client files
let currentFile = null;

document.addEventListener('DOMContentLoaded', () => {
  initSpace();
  initGate();
  initDashboardControls();
  initViewer();
  bootAuth();
});

/* ================= SPACE BACKGROUND ================= */
function initSpace(){
  const canvas = $('#space');
  const ctx = canvas.getContext('2d');
  let w,h,dpr,stars,shoot;
  function resize(){
    dpr = Math.min(window.devicePixelRatio||1,2);
    w=canvas.width=innerWidth*dpr; h=canvas.height=innerHeight*dpr;
    canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px';
    const n = Math.min(260, Math.floor(innerWidth*innerHeight/7000));
    stars = Array.from({length:n},()=>({
      x:Math.random()*w, y:Math.random()*h, z:Math.random()*.8+.2,
      r:(Math.random()*1.3+.3)*dpr, tw:Math.random()*6
    }));
    shoot = null;
  }
  resize(); window.addEventListener('resize', resize);
  if (prefersReduced){ ctx.fillStyle='#fff'; stars.forEach(s=>{ctx.globalAlpha=.5*s.z;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}); return; }
  let t=0;
  (function loop(){
    t+=.016; ctx.clearRect(0,0,w,h);
    // nebula glow
    const g = ctx.createRadialGradient(w*0.5,h*0.28,0,w*0.5,h*0.28,h*0.7);
    g.addColorStop(0,'rgba(50,90,160,0.10)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    for (const s of stars){
      const a = .4 + Math.sin(t+s.tw)*.35*s.z + .25*s.z;
      ctx.fillStyle=`rgba(210,230,255,${Math.max(0,a)})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill();
    }
    // occasional shooting star
    if (!shoot && Math.random()<0.004) shoot={x:Math.random()*w,y:Math.random()*h*0.5,vx:(6+Math.random()*4)*dpr,vy:(2+Math.random()*2)*dpr,life:1};
    if (shoot){
      ctx.strokeStyle=`rgba(150,240,255,${shoot.life})`; ctx.lineWidth=1.6*dpr;
      ctx.beginPath(); ctx.moveTo(shoot.x,shoot.y); ctx.lineTo(shoot.x-shoot.vx*6,shoot.y-shoot.vy*6); ctx.stroke();
      shoot.x+=shoot.vx; shoot.y+=shoot.vy; shoot.life-=0.012;
      if (shoot.life<=0||shoot.x>w) shoot=null;
    }
    requestAnimationFrame(loop);
  })();
}

/* ================= AUTH BOOT ================= */
function bootAuth(){
  if (!window.RR) return;
  window.RR.onAuth((user) => {
    if (user && user.email && user.email.toLowerCase() === OWNER_EMAIL){
      if (sessionStorage.getItem('rr_owner_unlocked') === '1'){
        openDashboard(user);
      } else {
        showStep(2); // already authenticated, just need the code
      }
    } else {
      showStep(1);
    }
  });
}

/* ================= GATE ================= */
function showStep(n){
  $('#gate').hidden = false;
  $('#dash').hidden = true;
  $('#step1').hidden = n !== 1;
  $('#step2').hidden = n !== 2;
  $('#gateKicker').textContent = n === 2 ? 'IDENTITY CONFIRMED · ONE MORE STEP' : 'RICHARD RICH · COMMAND CENTER';
}

function initGate(){
  const step1 = $('#step1'), step2 = $('#step2');

  step1.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#step1Btn'); const err = $('#err1');
    err.textContent = '';
    const email = $('#ownerEmail').value.trim();
    const pass  = $('#ownerPass').value;

    if (!window.RR || !window.RR.configured){
      err.textContent = 'Cloud not connected yet — finish FIREBASE-SETUP.md first.';
      return;
    }
    btn.classList.add('loading'); btn.disabled = true;
    try{
      const cred = await window.RR.ownerLogin(email, pass);
      if (!cred.user || cred.user.email.toLowerCase() !== OWNER_EMAIL){
        await window.RR.signOut();
        err.textContent = 'This account is not the owner.';
      } else {
        $('#ownerCode').value = '';
        showStep(2);
        setTimeout(()=>$('#ownerCode').focus(), 100);
      }
    }catch(ex){
      err.textContent = friendlyAuthError(ex);
    }finally{
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  step2.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#err2');
    const code = $('#ownerCode').value;
    if (code === SECRET_CODE){
      sessionStorage.setItem('rr_owner_unlocked','1');
      if (window.RR && window.RR.auth && window.RR.auth.currentUser) openDashboard(window.RR.auth.currentUser);
    } else {
      err.textContent = 'Incorrect access code.';
      $('#ownerCode').value = '';
    }
  });
}

function friendlyAuthError(ex){
  const c = ex && ex.code || '';
  if (c.includes('wrong-password') || c.includes('invalid-credential')) return 'Wrong email or password.';
  if (c.includes('user-not-found')) return 'No owner account found — create it in Firebase (setup step 5).';
  if (c.includes('too-many-requests')) return 'Too many attempts. Wait a moment and retry.';
  if (c.includes('network')) return 'Network problem. Check your connection.';
  return 'Could not sign in. Please try again.';
}

/* ================= DASHBOARD ================= */
async function openDashboard(user){
  $('#gate').hidden = true;
  $('#dash').hidden = false;
  $('#dashOwner').textContent = user.email;
  await loadBookings();
}

async function loadBookings(){
  const filesEl = $('#files');
  filesEl.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-ring">◎</div><p>Loading client files…</p></div>`;
  try{
    const snap = await window.RR.getBookings();
    BOOKINGS = snap.docs.map(d => Object.assign({ id:d.id }, d.data()));
  }catch(ex){
    BOOKINGS = [];
    filesEl.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-ring">!</div><p>Could not load files. ${escapeHtml(ex.message||'')}</p></div>`;
    return;
  }
  renderStats();
  renderFiles(BOOKINGS);
}

function renderStats(){
  $('#statTotal').textContent = BOOKINGS.length;
  $('#statNew').textContent = BOOKINGS.filter(b => (b.status||'new') === 'new').length;
  const latest = BOOKINGS[0];
  $('#statLatest').textContent = latest ? timeAgo(tsToDate(latest.createdAt)) : '—';
}

function renderFiles(list){
  const filesEl = $('#files'); const empty = $('#empty');
  filesEl.innerHTML = '';
  if (!list.length){ empty.hidden = false; return; }
  empty.hidden = true;
  list.forEach((b, i) => {
    const status = b.status || 'new';
    const el = document.createElement('button');
    el.className = 'file'; el.style.animationDelay = (i*0.03)+'s';
    el.innerHTML = `
      <div class="file-top">
        <span class="file-icon">🗂️</span>
        <span class="badge ${status==='new'?'new':'seen'}">${status==='new'?'NEW':'SEEN'}</span>
      </div>
      <div class="file-company">${escapeHtml(b.company||'Unnamed')}</div>
      <div class="file-industry">${escapeHtml(b.industry||'—')}</div>
      <div class="file-foot"><span>${escapeHtml((b.employees||'—')+' staff')}</span><span>${timeAgo(tsToDate(b.createdAt))}</span></div>`;
    el.addEventListener('click', () => openFile(b));
    filesEl.appendChild(el);
  });
}

function initDashboardControls(){
  $('#logoutBtn').addEventListener('click', async () => {
    sessionStorage.removeItem('rr_owner_unlocked');
    if (window.RR) await window.RR.signOut();
    location.reload();
  });
  $('#refreshBtn').addEventListener('click', loadBookings);
  $('#search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return renderFiles(BOOKINGS);
    renderFiles(BOOKINGS.filter(b =>
      [b.company,b.industry,b.email,b.problem].some(v => (v||'').toLowerCase().includes(q))
    ));
  });
}

/* ================= FILE VIEWER ================= */
function initViewer(){
  const viewer = $('#viewer');
  $('#viewerClose').addEventListener('click', closeViewer);
  viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !viewer.hidden) closeViewer(); });
  $('#vDelete').addEventListener('click', async () => {
    if (!currentFile) return;
    if (!confirm('Delete this client file permanently?')) return;
    try{ await window.RR.deleteBooking(currentFile.id); }catch(ex){}
    BOOKINGS = BOOKINGS.filter(b => b.id !== currentFile.id);
    closeViewer(); renderStats(); renderFiles(BOOKINGS);
  });
}

async function openFile(b){
  currentFile = b;
  $('#vCompany').textContent = b.company || 'Unnamed';
  $('#vMeta').textContent = 'Received ' + fullDate(tsToDate(b.createdAt));
  const rows = [
    ['Industry', b.industry],
    ['Company size', b.employees ? b.employees + ' employees' : '—'],
    ['Business problem', b.problem],
    ['Email', b.email],
    ['Contact number', b.phone || '—'],
  ];
  $('#vRows').innerHTML = rows.map(([k,v]) =>
    `<div class="vrow"><div class="vrow-label">${k}</div><div class="vrow-val">${escapeHtml(v||'—')}</div></div>`
  ).join('');
  const subject = encodeURIComponent(`Re: your meeting request — ${b.company||''}`);
  $('#vMail').href = `mailto:${b.email||''}?subject=${subject}`;
  $('#viewer').hidden = false;

  // mark as seen
  if ((b.status||'new') === 'new'){
    try{ await window.RR.updateStatus(b.id, 'seen'); b.status = 'seen'; renderStats(); renderFiles($('#search').value ? filtered() : BOOKINGS); }catch(ex){}
  }
}
function filtered(){
  const q = $('#search').value.toLowerCase().trim();
  return BOOKINGS.filter(b => [b.company,b.industry,b.email,b.problem].some(v => (v||'').toLowerCase().includes(q)));
}
function closeViewer(){ $('#viewer').hidden = true; currentFile = null; }

/* ================= helpers ================= */
function tsToDate(ts){ try{ return ts && ts.toDate ? ts.toDate() : (ts ? new Date(ts) : null); }catch(e){ return null; } }
function timeAgo(d){
  if (!d) return 'just now';
  const s = Math.floor((Date.now()-d.getTime())/1000);
  if (s<60) return 'just now';
  const m=Math.floor(s/60); if (m<60) return m+'m ago';
  const h=Math.floor(m/60); if (h<24) return h+'h ago';
  const dd=Math.floor(h/24); if (dd<7) return dd+'d ago';
  return d.toLocaleDateString();
}
function fullDate(d){ return d ? d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : 'just now'; }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
