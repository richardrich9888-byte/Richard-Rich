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

/* ================= BUILD CARDS ================= */
function buildCards(){
  const stage = $('#deckStage');
  const prog  = $('#deckProgress');
  if (!stage) return;
  CARDS.forEach((c, i) => {
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
    stage.appendChild(card);

    if (prog){
      const dot = document.createElement('span');
      dot.className = 'dot' + (i === 0 ? ' on' : '');
      prog.appendChild(dot);
    }
  });
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

/* ================= VIDEO play/pause (battery + perf) ================= */
function initVideos(){
  const vids = $$('.bg-video');
  vids.forEach(v => { const p = v.play(); if (p && p.catch) p.catch(()=>{}); }); // nudge autoplay
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting){ const p = v.play(); if (p && p.catch) p.catch(()=>{}); }
      else v.pause();
    });
  }, { threshold:0.05 });
  vids.forEach(v => io.observe(v));
}

/* ================= SHOWCASE — auto-playing 3D card loop =================
   No scroll needed: a GSAP timeline flies each card in, holds it, then sends
   it away, looping forever. It only runs while the section is on screen. */
function initShowcase(){
  const stage = $('#deckStage');
  if (!stage) return;
  const cards = $$('.card', stage);
  const dots  = $$('#deckProgress .dot');
  const n = cards.length;
  if (!n) return;

  // graceful fallback if GSAP failed to load: just fade the cards in place
  if (typeof gsap === 'undefined' || prefersReduced){
    cards.forEach(c => { c.style.opacity = 1; });
    return;
  }

  // filter (blur) is desktop-only — it's the main mobile jank source
  const fx = (props, blur) => { if (!isMobile) props.filter = `blur(${blur}px)`; return props; };

  gsap.set(cards, fx({ yPercent:-140, z:-1000, rotationX:46, rotationY:-8, opacity:0 }, 14));

  const tl = gsap.timeline({ repeat:-1, paused:true });
  cards.forEach((card, i) => {
    tl.add(() => dots.forEach((d,k)=> d.classList.toggle('on', k===i)));
    tl.fromTo(card,
      fx({ yPercent:-140, z:-1000, rotationX:46, rotationY:-8, opacity:0 }, 14),
      fx({ yPercent:0, z:0, rotationX:0, rotationY:0, opacity:1, duration:0.9, ease:'power3.out' }, 0));
    tl.to(card,
      fx({ yPercent:130, z:-560, rotationX:-26, rotationY:8, opacity:0, duration:0.8, ease:'power2.in' }, 9),
      '+=1.5');   // hold the card centered before it leaves
  });

  // play only while the showcase is visible
  const section = $('#showcase');
  if ('IntersectionObserver' in window && section){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => e.isIntersecting ? tl.play() : tl.pause());
    }, { threshold:0.25 });
    io.observe(section);
  } else {
    tl.play();
  }
}
