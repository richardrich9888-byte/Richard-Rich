/* ===================================================================
   RICHARD RICH — main.js
   Hero parallax + starfield, scroll-driven 3D card deck, Google sign-in.
   =================================================================== */
'use strict';

/* Sign-in is powered by Firebase (see js/firebase-config.js + FIREBASE-SETUP.md) */

/* ================= CARD CONTENT ================= */
const CARDS = [
  { type:'hero',    title:'Richard Rich' },
  { type:'text',    title:'We transform businesses through AI' },
  { type:'text',    title:'We help businesses grow through AI' },
  { type:'text',    title:'Every business has a problem —', body:'and we have a solution to it.' },
  { type:'text',    title:"Meet our Founders & CEOs" },
  { type:'profile', name:'Tayyab',       role:'Founder & CEO', img:'assets/founder-tayyab.jpg',      initial:'T' },
  { type:'profile', name:'Abaidullah',   role:'Founder & CEO', img:'assets/founder-abaidullah.jpg', initial:'A' },
  { type:'text',    title:"It's not a deal —", body:"it's a partnership." },
  { type:'text',    title:'Our Process' },
  { type:'step',    step:'01', title:'Discover' },
  { type:'step',    step:'02', title:'Meeting' },
  { type:'step',    step:'03', title:'Planning' },
  { type:'step',    step:'04', title:'Development' },
  { type:'step',    step:'05', title:'Partnership' },
  { type:'contact', title:'Book Your Meeting',
    intro:'To have a meeting with us, send these details to our Gmail:',
    email:'richardrich9888@gmail.com',
    details:['Business name','Industry','Number of employees','Business problem','Your email','Contact number (optional)'] },
];

/* ================= UTIL ================= */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Phones/tablets get a lighter pipeline: no filter animations, no backdrop
   blur (see CSS), 1x canvases — transforms + opacity only, which stay on the
   GPU compositor and never drop frames. */
const isMobile = window.matchMedia('(max-width:820px), (hover:none) and (pointer:coarse)').matches;

document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();
  buildCards();
  initNav();
  initStars();
  initDust();
  initWorldParallax();
  initDeckAnimation();
  initSecretDoor();
});

/* Hidden owner entrance: type "owner" anywhere (nothing is shown on screen). */
function initSecretDoor(){
  let buf = '';
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key && e.key.length === 1) buf = (buf + e.key.toLowerCase()).slice(-5);
    if (buf === 'owner') location.href = 'owner.html';
  });
}

// shared world state (mouse + scroll dolly combine on the moon)
const WORLD = { mx:0, my:0, cmx:0, cmy:0, zoom:0 };

/* NOTE: no scroll-hijack library. Native scrolling can never freeze; the
   buttery motion comes from ScrollTrigger's scrub interpolation instead. */

/* ================= BUILD CARDS ================= */
function buildCards(){
  const stage = $('#deckStage');
  const prog  = $('#deckProgress');
  CARDS.forEach((c, i) => {
    const card = document.createElement('article');
    card.className = 'card type-' + c.type;
    card.dataset.index = i;

    let inner = '';
    const idxLabel = `<div class="card-index">${String(i+1).padStart(2,'0')} / ${CARDS.length}</div>`;

    if (c.type === 'profile'){
      inner = `
        ${idxLabel}
        <div class="profile">
          <div class="profile-photo" data-initial="${c.initial}">
            <img src="${c.img}" alt="${c.name}"
                 onerror="this.parentElement.classList.add('no-photo'); this.style.display='none';">
          </div>
          <div class="profile-name">${c.name}</div>
          <div class="profile-role">${c.role}</div>
        </div>`;
    } else if (c.type === 'step'){
      inner = `${idxLabel}<div class="step-num">${c.step}</div><h2 class="card-title">${c.title}</h2>`;
    } else if (c.type === 'contact'){
      inner = `
        ${idxLabel}
        <h2 class="card-title">${c.title}</h2>
        <p class="card-body">${c.intro}</p>
        <ul class="contact-list">
          ${c.details.map(d => {
            const m = d.match(/^(.*?)\s*(\(optional\))$/);
            return m ? `<li>${m[1]} <span>${m[2]}</span></li>` : `<li>${d}</li>`;
          }).join('')}
        </ul>
        <a class="cta-btn contact-mail" href="mailto:${c.email}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z" opacity="0"/><path d="M3 6.5 12 13l9-6.5"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
          ${c.email}
        </a>`;
    } else { // hero + text
      inner = `${idxLabel}<h2 class="card-title">${c.title}</h2>${c.body ? `<p class="card-body">${c.body}</p>` : ''}`;
    }

    card.innerHTML = `<div class="card-inner">${inner}</div>`;
    stage.appendChild(card);

    const dot = document.createElement('span');
    dot.className = 'dot' + (i === 0 ? ' on' : '');
    prog.appendChild(dot);
  });
}

/* ================= NAVBAR scroll state ================= */
function initNav(){
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });
}

/* ================= STARFIELD (lightweight canvas) ================= */
function initStars(){
  const canvas = $('#stars');
  const ctx = canvas.getContext('2d');
  let w, h, stars, dpr;

  function resize(){
    dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width  = innerWidth  * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = Math.min(isMobile ? 90 : 220, Math.floor((innerWidth * innerHeight) / (isMobile ? 14000 : 9000)));
    stars = Array.from({length:count}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      z: Math.random()*0.8 + 0.2,
      r: (Math.random()*1.3 + 0.3) * dpr,
      tw: Math.random()*Math.PI*2
    }));
  }
  resize();
  window.addEventListener('resize', resize);

  if (prefersReduced){ // draw once, no animation
    ctx.clearRect(0,0,w,h);
    stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${0.5*s.z})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill(); });
    return;
  }

  let t = 0;
  (function loop(){
    t += 0.02;
    ctx.clearRect(0,0,w,h);
    for (const s of stars){
      const a = 0.35 + Math.sin(t + s.tw) * 0.3 * s.z + 0.3*s.z;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0,a)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
}

/* ================= WORLD moonscape parallax + scroll dolly ================= */
function initWorldParallax(){
  const moon = $('#worldMoon');
  if (!moon || prefersReduced) return;

  if (!isMobile){
    window.addEventListener('pointermove', (e) => {
      WORLD.mx = (e.clientX / innerWidth  - 0.5);
      WORLD.my = (e.clientY / innerHeight - 0.5);
    }, { passive:true });
  }

  let lastZoom = -1;
  (function tick(){
    WORLD.cmx += (WORLD.mx - WORLD.cmx) * 0.05;
    WORLD.cmy += (WORLD.my - WORLD.cmy) * 0.05;
    // on touch there's no mouse drift — only write the transform when the
    // scroll dolly actually moved, so idle frames cost nothing
    if (isMobile && Math.abs(WORLD.zoom - lastZoom) < 0.0005){ requestAnimationFrame(tick); return; }
    lastZoom = WORLD.zoom;
    const scale = 1.14 + WORLD.zoom * 0.16;               // slow dolly-in through the deck
    const ty = -WORLD.zoom * 30;                          // drift downward as we descend
    moon.style.transform = `scale(${scale.toFixed(3)}) translate(${WORLD.cmx*-26}px, ${(WORLD.cmy*-18)+ty}px)`;
    requestAnimationFrame(tick);
  })();
}

/* ================= MOON DUST (drifting motes over the scene) ================= */
function initDust(){
  const canvas = $('#dust');
  if (!canvas) return;
  // dust + mix-blend-mode costs a full-screen offscreen pass — skip it on mobile
  if (isMobile){ canvas.style.display = 'none'; return; }
  const ctx = canvas.getContext('2d');
  let w, h, dpr, motes;
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width  = innerWidth  * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = innerWidth < 700 ? 26 : 46;
    motes = Array.from({length:count}, () => ({
      x:Math.random()*w, y:Math.random()*h,
      r:(Math.random()*1.6+0.4)*dpr,
      vx:(Math.random()-0.2)*0.25*dpr,
      vy:-(Math.random()*0.28+0.05)*dpr,
      a:Math.random()*0.5+0.15, tw:Math.random()*6
    }));
  }
  resize();
  window.addEventListener('resize', resize);
  if (prefersReduced) return;
  let t=0;
  (function loop(){
    t+=0.03; ctx.clearRect(0,0,w,h);
    for (const m of motes){
      m.x+=m.vx; m.y+=m.vy;
      if (m.y+m.r<0){ m.y=h+m.r; m.x=Math.random()*w; }
      if (m.x<-10) m.x=w+10; if (m.x>w+10) m.x=-10;
      const a = m.a * (0.6+0.4*Math.sin(t+m.tw));
      ctx.fillStyle=`rgba(210,224,255,${Math.max(0,a)})`;
      ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
}

/* ================= DECK — scroll-driven 3D card sequence ================= */
function initDeckAnimation(){
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined'){
    // graceful fallback: just show cards stacked
    $$('.card').forEach(c => { c.style.opacity = 1; c.style.position='relative'; c.style.transform='none'; c.style.margin='40px auto'; });
    $('#deckPin').style.height = 'auto';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  const cards = $$('.card');
  const dots  = $$('#deckProgress .dot');
  const n = cards.length;

  /* Animating CSS filter (blur) repaints the whole card texture every frame —
     fine on desktop GPUs, the main source of jank on phones. Mobile runs the
     same choreography with transforms + opacity only. */
  const fx = (props, blur) => {
    if (!isMobile) props.filter = `blur(${blur}px)`;
    return props;
  };

  // initial state — all cards waiting far above the horizon, out of focus
  gsap.set(cards, fx({ yPercent:-150, z:-1050, rotationX:48, rotationY:-8, opacity:0 }, 14));
  gsap.set(cards[0], fx({ yPercent:0, z:0, rotationX:0, rotationY:0, opacity:1 }, 0)); // first is ready

  // scroll length: one "beat" per card
  const beats = n;               // number of card slots
  const perBeat = 0.85;          // portion of a beat spent visible
  const total = beats;

  // glow palette shifts subtly as you move through the story
  const GLOWS = ['150,190,255','150,190,255','130,200,220','170,180,255','200,180,255',
                 '255,200,170','255,200,170','180,210,255','150,190,255','140,205,235',
                 '160,195,255','180,185,255','200,180,240','160,210,220','170,255,225'];
  const worldMoon = $('#worldMoon');
  const worldGlow = $('#worldGlow');
  let lastActive = 0;

  const tl = gsap.timeline({
    scrollTrigger:{
      trigger:'#deck',
      start:'top top',
      end:() => '+=' + (window.innerHeight * n * 1.4),
      scrub: prefersReduced ? false : 1.4,   // interpolates wheel steps → buttery card motion
      pin:'#deckPin',
      anticipatePin:1,
      onUpdate:(self) => {
        const active = Math.min(n-1, Math.floor(self.progress * n));
        // dolly the moon deeper into the scene as the story unfolds
        WORLD.zoom = self.progress;
        if (prefersReduced && worldMoon){
          worldMoon.style.transform = `scale(${(1.14 + self.progress*0.16).toFixed(3)})`;
        }
        // dots + glow only need touching when the active card changes,
        // not on every scroll frame
        if (active !== lastActive){
          lastActive = active;
          dots.forEach((d,i)=> d.classList.toggle('on', i===active));
          if (worldGlow){
            worldGlow.style.background =
              `radial-gradient(circle, rgba(${GLOWS[active]},.30), rgba(${GLOWS[active]},0) 62%)`;
          }
        }
      }
    }
  });

  cards.forEach((card, i) => {
    const at = i;                       // beat index
    // ENTER — descend from far above the moon horizon, blur into focus
    if (i > 0){
      tl.fromTo(card,
        fx({ yPercent:-150, z:-1050, rotationX:48, rotationY:-8, opacity:0 }, 14),
        fx({ yPercent:0, z:0, rotationX:0, rotationY:0, opacity:1, duration:perBeat*0.7, ease:'power2.inOut' }, 0),
        at - 0.4);
    }
    // EXIT — sink away toward the surface (skip last card; it stays to the end)
    if (i < n-1){
      tl.to(card,
        fx({ yPercent:150, z:-620, rotationX:-30, rotationY:8, opacity:0, duration:perBeat*0.7, ease:'power2.inOut' }, 9),
        at + 0.38);
    }
  });

  // hold the final card dead-center for a beat before the section releases,
  // so it reads comfortably instead of sliding straight off the pin.
  tl.to({}, { duration: 0.9 });

  // refresh once layout + pin spacer exist so the scroll length is correct
  const settle = () => { ScrollTrigger.refresh(); };
  settle();
  requestAnimationFrame(settle);
  window.addEventListener('load', settle);
  [200, 600, 1200, 2500].forEach(t => setTimeout(settle, t));
  // if fonts load late and shift layout, re-measure so scroll length stays correct
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
}

/* ===================================================================
   GOOGLE SIGN-IN  (Google Identity Services)
   =================================================================== */
/* Sign-in removed per user request */
