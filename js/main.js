/* ===================================================================
   RICHARD RICH — main.js
   Cinematic intro → hero → AUTO-PLAY 3D card showcase → contact.
   Pure vanilla + GSAP. No scroll-hijacking: every section is a normal
   page you can scroll past; the cards animate themselves on a loop.
   =================================================================== */
'use strict';

/* ================= CARD CONTENT ================= */
const CARDS = [
  { type:'text',    title:'We transform businesses through AI' },
  { type:'text',    title:'We help businesses grow through AI' },
  { type:'text',    title:'Every business has a problem —', body:'and we have a solution to it.' },
  { type:'text',    title:"Meet our Founders & CEOs" },
  { type:'profile', name:'Tayyab',     role:'Founder & CEO', img:'assets/founder-tayyab.jpg',      initial:'T' },
  { type:'profile', name:'Abaidullah', role:'Founder & CEO', img:'assets/founder-abaidullah.jpg', initial:'A' },
  { type:'text',    title:"It's not a deal —", body:"it's a partnership." },
  { type:'text',    title:'Our Process' },
  { type:'step',    step:'01', title:'Discover' },
  { type:'step',    step:'02', title:'Meeting' },
  { type:'step',    step:'03', title:'Planning' },
  { type:'step',    step:'04', title:'Development' },
  { type:'step',    step:'05', title:'Partnership' },
];

/* ================= UTIL ================= */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Phones/tablets get a lighter pipeline: no filter (blur) animation — the
   choreography runs on transforms + opacity only, which stay on the GPU. */
const isMobile = window.matchMedia('(max-width:820px), (hover:none) and (pointer:coarse)').matches;

document.addEventListener('DOMContentLoaded', () => {
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  buildCards();
  initIntro();
  initNav();
  initReveals();
  initVideos();
  initShowcase();
  initSecretDoor();
});

/* Hidden owner entrance: type "owner" anywhere. */
function initSecretDoor(){
  let buf = '';
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key && e.key.length === 1) buf = (buf + e.key.toLowerCase()).slice(-5);
    if (buf === 'owner') location.href = 'owner.html';
  });
}

/* ================= CINEMATIC INTRO ================= */
function initIntro(){
  const intro = $('#intro');
  if (!intro){ revealHero(); return; }
  document.body.style.overflow = 'hidden';
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    intro.classList.add('out');
    document.body.style.overflow = '';
    revealHero();
    setTimeout(() => intro.remove(), 900);
  };
  // auto-dismiss after the title reveal, or skip on any interaction
  setTimeout(finish, prefersReduced ? 400 : 2900);
  ['click','wheel','touchstart','keydown'].forEach(ev =>
    window.addEventListener(ev, finish, { once:true, passive:true }));
}
function revealHero(){ const h = $('#hero'); if (h) h.classList.add('in'); }

/* ================= NAVBAR scroll state ================= */
function initNav(){
  const nav = $('#nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });
}

/* ================= BUILD CARDS =================
   The cards live in a single horizontal track that scrolls sideways forever.
   The set is rendered twice back-to-back so the marquee can loop seamlessly. */
function makeCard(c, i){
  const card = document.createElement('article');
  card.className = 'card type-' + c.type;
  card.dataset.index = i;

  const idxLabel = `<div class="card-index">${String(i+1).padStart(2,'0')} / ${CARDS.length}</div>`;
  let inner;
  if (c.type === 'profile'){
    inner = `${idxLabel}
      <div class="profile">
        <div class="profile-photo" data-initial="${c.initial}">
          <img src="${c.img}" alt="${c.name}" onerror="this.parentElement.classList.add('no-photo'); this.style.display='none';">
        </div>
        <div class="profile-name">${c.name}</div>
        <div class="profile-role">${c.role}</div>
      </div>`;
  } else if (c.type === 'step'){
    inner = `${idxLabel}<div class="step-num">${c.step}</div><h2 class="card-title">${c.title}</h2>`;
  } else {
    inner = `${idxLabel}<h2 class="card-title">${c.title}</h2>${c.body ? `<p class="card-body">${c.body}</p>` : ''}`;
  }
  card.innerHTML = `<div class="card-inner">${inner}</div>`;
  return card;
}

function buildCards(){
  const stage = $('#deckStage');
  if (!stage) return;
  const track = document.createElement('div');
  track.className = 'deck-track';
  CARDS.forEach((c, i) => track.appendChild(makeCard(c, i)));                 // first set
  CARDS.forEach((c, i) => {                                                    // duplicate (seamless loop)
    const el = makeCard(c, i);
    el.setAttribute('aria-hidden', 'true');
    track.appendChild(el);
  });
  stage.appendChild(track);
}

/* ================= REVEAL on scroll (blur-fade-up) ================= */
function initReveals(){
  const sections = $$('.reveal');
  if (!('IntersectionObserver' in window)){ sections.forEach(s=>s.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.18 });
  // hero is revealed by the intro; observe the rest
  sections.forEach(s => { if (s.id !== 'hero') io.observe(s); });
}

/* ================= BACKGROUND WORLD VIDEO (single, always-on) =================
   ONE fixed video behind the whole site. A single decoder plays reliably on
   every device — multiple <video>s choke (especially on mobile), which was what
   made the mid page lose its effects / go black. The aurora gradient sits behind
   it and always shows; the video just fades in over it while genuinely playing,
   and stays looping continuously across every section (no per-section restarts). */
function kickVideo(v){ const p = v.play(); if (p && p.catch) p.catch(()=>{}); }

function initVideos(){
  const v = $('.world-video');
  if (!v) return;
  if (prefersReduced) return;            // reduced motion: show the static aurora, no video
  v.loop = true;

  // fade the video in once it actually has frames (CSS transitions the opacity)
  const reveal = () => { if (!v.paused && v.readyState >= 2) v.style.opacity = '1'; };
  ['playing','canplay','loadeddata','timeupdate'].forEach(ev => v.addEventListener(ev, reveal));
  v.addEventListener('error', () => { v.style.opacity = '0'; });   // fall back to aurora, never black

  // keep it alive: if the browser ever pauses/stalls it (and the tab is visible), resume;
  // and always resume when the user returns to the tab
  const resume = () => { if (!document.hidden) kickVideo(v); };
  ['pause','stalled','suspend'].forEach(ev => v.addEventListener(ev, resume));
  document.addEventListener('visibilitychange', resume);

  kickVideo(v);
}

/* ================= SHOWCASE — horizontal auto-scrolling card row =================
   The cards move sideways as one continuous row (pure CSS transform marquee —
   GPU-accelerated and buttery). JS only pauses the animation while the section
   is off-screen to save work. Reduced-motion users get a static, hand-scrollable
   row instead of movement. */
function initShowcase(){
  const stage = $('#deckStage');
  const track = stage && stage.querySelector('.deck-track');
  if (!track) return;

  if (prefersReduced){
    track.style.animation = 'none';
    stage.style.overflowX = 'auto';   // let them scroll the row themselves
    return;
  }

  const section = $('#showcase');
  if ('IntersectionObserver' in window && section){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { track.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; });
    }, { threshold:0 });
    io.observe(section);
  }
}
