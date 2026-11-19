/* =====================  YOUR SETTINGS  =====================
   1) (character dialogue boxes were removed)
   2) TRACKS: music files YOU own, in the audio/ folder. A slide number overrides DEFAULT_TRACK.
      If no file is found, the built-in chiptune plays instead.
   3) GALLERY: logos / photos per interest. Put files in images/<topic>/ - missing ones show a label. */
const CHAR_GIFS = {}; // unused: dialogue boxes were removed
const DEFAULT_TRACK = "audio/Shop.mp3";
const TRACKS = { /* 0: "audio/ruins.mp3", 1: "audio/snowdin.mp3", 2: "audio/waterfall.mp3" */ };
/* 4) WALKERS: characters that stand in the bottom corners with their own idle movement (your GIFs are still images,
      so they do not travel). Put your own sprite at the path below. Until the file exists, a small original pixel
      placeholder stands there instead. move: "lazy" = slow sway + sometimes blinks out and back, "hop" = bouncy.
      side/x = which corner and how far from the edge. facing: "front" never flips; use "left"/"right" if your
      sprite looks sideways, and look = the way it should look on screen. */
const WALKERS = [
  { name: "SANS", src: "images/chars/sans-walk.gif", move: "lazy", side: "right", x: "3vw", facing: "front", look: "left", height: 60, art: "slime" },
  { name: "PAPYRUS", src: "images/chars/papyrus-walk.gif", move: "hop", side: "left", x: "3vw", facing: "front", look: "right", height: 92, art: "robot" },
];
const VIEWER_LAST = "Moments";   // label of the photo that should appear LAST in the Photography viewer
const GALLERY = {
  gaming: ["Valorant|valorant.jpg", "League of Legends|lol.jpg", "Mobile Legends|ml.png", "Clash of Clans|coc.png", "Wild Rift|wr.png", "Minecraft|mc.png", "Undertale|undertale.jpg", "Outlast Trials|outlast.jpg", "Tekken|tekken.jpg", "Mortal Kombat|mk.jpg",
    "Farlight 84|fl.jpg", "Albion Online|albion.jpeg", "Bloodstrike|bloodstrike.jpg", "CODM|codm.png", "Sleeping Dogs|sd.png", "FNAF|fnaf.png"],
  // Collage pages: the FIRST entry is the biggest polaroid. Edit labels/filenames freely.
  reading: ["Manga|manga.jpg", "Manhwa|manhwa.jpg", "Comics|comics.jpeg", "Books|books.jpg", "Psychology|psychology.png"],
  watching: ["Anime|anime.jpg", "Movies|movies.jpg", "Series|series.jpeg"],
  photography: ["Moments|moments.jpg", "Street|street.jpg", "Cats|cats.jpg", "Portraits|portraits.jpg", "Sunsets|sunsets.jpg", "Nature|nature.jpg", "Friends|friends.jpg", "Details|details.jpg", "Pets|pets.jpg"],
};
/* ========================================================== */

const $ = (id) => document.getElementById(id);
const deck = $("deck"), prev = $("prev"), next = $("next"), counter = $("counter"), fill = $("fill"), loc = $("loc"), intro = $("intro"), muteBtn = $("mute");
const slides = [...document.querySelectorAll(".slide")];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let current = 0, step = 0, started = false, muted = false, synthOn = true, bgm = null;

/* ---------- Pixel icons (original art, no files needed) ---------- */
const ICONS = {
  game: [".##########.", "############", "##.######.##", "#.#.####.#.#", "##.######.##", "############", ".##########."],
  book: ["..####..####..", ".#....##....#.", "#.####.#.####.", "#......#......#", "#.####.#.####.", "#......#......#", ".##########.."],
  tv: ["....#..#....", ".....##.....", "############", "#..........#", "#.########.#", "#.########.#", "#.########.#", "#..........#", "############"],
  camera: ["...####.....", "############", "#..........#", "#...####...#", "#..#....#..#", "#..#....#..#", "#...####...#", "############"],
};
document.querySelectorAll(".pix").forEach((svg) => {
  const rows = ICONS[svg.dataset.icon];
  const w = Math.max(...rows.map((r) => r.length));
  svg.setAttribute("viewBox", `0 0 ${w} ${rows.length}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.innerHTML = rows.map((r, y) => [...r].map((c, x) => (c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "")).join("")).join("");
});


/* ---------- Galleries ---------- */
document.querySelectorAll("[data-gallery]").forEach((box) => {
  const key = box.dataset.gallery;
  box.innerHTML = (GALLERY[key] || []).map((item) => {
    const [label, file] = item.split("|");
    if (box.classList.contains("collage")) return `<figure class="pol"><div class="pic"><span>${label}</span><img src="images/${key}/${file}" alt="${label}" onload="this.closest('.pol').style.setProperty('--ar', this.naturalWidth / this.naturalHeight)" onerror="this.remove()"></div><figcaption>${label}</figcaption></figure>`;
    return `<figure class="tile"><div class="thumb"><span>${label.slice(0, 2).toUpperCase()}</span><img src="images/${key}/${file}" alt="${label}" onerror="this.remove()"></div><figcaption>${label}</figcaption></figure>`;
  }).join("");
});

/* ---------- One-by-one photo viewer: each Next zooms out the next photo (uncropped) ---------- */
document.querySelectorAll("[data-full]").forEach((box) => {
  const key = box.dataset.full, all = GALLERY[key] || [];
  // In the one-by-one viewer, the photo named in VIEWER_LAST is shown last (the wall keeps the original order).
  const list = [...all.filter((i) => i.split("|")[0] !== VIEWER_LAST), ...all.filter((i) => i.split("|")[0] === VIEWER_LAST)];
  box.closest(".slide").dataset.steps = list.length;
  box.innerHTML = `<p class="full-title">PHOTOGRAPHY</p>` + list.map((item) => {
    const [label, file] = item.split("|");
    return `<figure class="shot"><div class="shot-frame"><span>${label}<small>images/${key}/${file}</small></span><img src="images/${key}/${file}" alt="${label}" onload="this.parentNode.style.setProperty('--ar', this.naturalWidth / this.naturalHeight)" onerror="this.parentNode.classList.add('missing');this.remove()"></div><figcaption>${label}</figcaption></figure>`;
  }).join("") + `<p class="shot-count"></p>`;
});
function syncShots() {
  document.body.classList.toggle("viewing", step > 0);   // hide wandering characters during the full-screen photo viewer
  const sl = slides[current];
  sl.querySelectorAll(".shot").forEach((el, i) => el.classList.toggle("on", step === i + 1));
  const c = sl.querySelector(".shot-count");
  if (c) c.textContent = step ? `${step} / ${maxStep(current)}` : "";
}

/* ---------- Animated character portraits ---------- */
document.querySelectorAll(".dialogue").forEach((d) => {
  const img = d.querySelector(".portrait img"), name = d.dataset.name, src = (CHAR_GIFS[name] || [])[0];
  if (!img || !src) return;
  img.onerror = () => { img.onerror = () => img.remove(); img.src = `images/chars/${name.toLowerCase()}.png`; };
  img.src = src;
});

/* ---------- Pixel cat (original sprite) that walks along the bottom ---------- */
const CAT = [
  ["..........#.#.", "..........###.", "#........####.", "#.#########...", ".##########...", "..#########...", "..#.#...#.#...", "..#.#...#.#..."],
  ["..........#.#.", "..........###.", "#........####.", "#.#########...", ".##########...", "..#########...", "...#.#.#...#..", "...#.#.#...#.."],
];
$("cat").innerHTML = CAT.map((rows, f) => `<svg class="cf cf${f}" viewBox="0 0 14 8" shape-rendering="crispEdges">${rows.map((r, y) => [...r].map((c, x) => (c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "")).join("")).join("")}</svg>`).join("");
$("cat").onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); burst(r.left + 24, r.top + 10); [700, 900, 700].forEach((f, i) => tone(f, 0.08, "square", 0.06, i * 0.09)); };

/* ---------- Sound: all generated live with WebAudio (original, no downloads) ---------- */
let ac, master, musicTimer;
const PITCH = { SANS: 180, PAPYRUS: 330, UNDYNE: 260, ALPHYS: 420, METTATON: 300, TEMMIE: 520, TORIEL: 240 };
function tone(freq, dur, type = "square", vol = 0.06, when = 0, dest) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
}
const blip = (name) => tone((PITCH[name] || 280) * (0.95 + Math.random() * 0.1), 0.05, "square", 0.05);
const sfxSelect = () => { tone(660, 0.07, "square", 0.07); tone(880, 0.09, "square", 0.07, 0.07); };
const sfxRoom = () => { tone(300, 0.18, "sawtooth", 0.05); tone(150, 0.25, "triangle", 0.08, 0.05); };

// Original looping chiptune: slow A-minor arpeggios over a triangle bass.
const BASS = [110, 110, 87.3, 87.3, 98, 98, 82.4, 82.4];
const LEAD = [440, 0, 523, 0, 659, 523, 0, 440, 392, 0, 440, 0, 523, 440, 0, 392, 349, 0, 440, 0, 523, 0, 440, 349, 330, 0, 392, 0, 494, 392, 0, 330];
let mstep = 0;
function playTrack(path) {
  if (!path || (bgm && bgm._base === path)) return;
  if (bgm) bgm.pause();
  // GitHub is case-sensitive, so also try the file name in lowercase / Capitalised form.
  const file = path.split("/").pop(), dir = path.slice(0, path.length - file.length);
  const variants = [...new Set([path, dir + file.toLowerCase(), dir + file[0].toUpperCase() + file.slice(1).toLowerCase()])];
  tryTrack(path, variants, 0);
}
function tryTrack(base, variants, i) {
  if (i >= variants.length) {
    console.warn("[audio] could not load any of:", variants.join(", "));
    muteBtn.title = `Track not found: ${base} (playing built-in chiptune instead)`;
    bgm = null; synthOn = true; return;
  }
  const a = new Audio(variants[i]); a._base = base; a.loop = true; a.volume = 0.5; a.muted = muted; bgm = a; synthOn = true;
  a.addEventListener("error", () => { if (bgm === a) { console.warn("[audio] failed:", variants[i]); tryTrack(base, variants, i + 1); } });
  const go = () => a.play().then(() => { if (bgm === a) { synthOn = false; muteBtn.title = `Playing: ${variants[i]}`; } })
    .catch((e) => {
      console.warn("[audio] play blocked, retrying on your next click/key:", e.name);
      const retry = () => { if (bgm === a) go(); };
      document.addEventListener("pointerdown", retry, { once: true });
      document.addEventListener("keydown", retry, { once: true });
    });
  go();
}
function musicStep() {
  if (muted || !synthOn) return;
  if (mstep % 4 === 0) tone(BASS[(mstep / 4) % 8 | 0], 0.55, "triangle", 0.09);
  const n = LEAD[mstep % LEAD.length];
  if (n) tone(n, 0.22, "square", 0.025);
  mstep++;
}
function startAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  musicTimer = setInterval(musicStep, 270);
}
function setMuted(m) { muted = m; if (bgm) bgm.muted = m; muteBtn.textContent = m ? "♪ OFF" : "♪ ON"; }
muteBtn.onclick = () => { setMuted(!muted); if (!muted) sfxSelect(); };

/* ---------- Typewriter with talking blips ---------- */
function type(el, text, name, speed = 34) {
  clearInterval(el._t); el.textContent = "";
  if (reduce) { el.textContent = text; return; }
  let i = 0;
  el._t = setInterval(() => {
    const ch = text[i++]; el.textContent = text.slice(0, i);
    if (ch && ch !== " " && i % 2) blip(name);
    if (i >= text.length) clearInterval(el._t);
  }, speed);
}

/* ---------- Slides ---------- */
const maxStep = (i) => +slides[i].dataset.steps || 0;
function show(i, animate = true, st = 0) {
  current = Math.max(0, Math.min(i, slides.length - 1));
  step = st;
  slides.forEach((s, n) => { s.classList.toggle("active", n === current); s.classList.toggle("zoomed", n === current && step > 0); });
  syncShots();
  counter.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  fill.style.width = `${((current + 1) / slides.length) * 100}%`;
  prev.disabled = current === 0 && step === 0; next.disabled = current === slides.length - 1 && step >= maxStep(current);
  loc.textContent = slides[current].dataset.loc;
  history.replaceState(null, "", `#${current + 1}`);
  if (animate && !reduce) { deck.classList.remove("flash"); void deck.offsetWidth; deck.classList.add("flash"); burst(innerWidth / 2, innerHeight / 2); }
  if (animate) sfxRoom();
  if (started) playTrack(TRACKS[current] || DEFAULT_TRACK);
  const d = slides[current].querySelector(".dialogue");
  if (d && started) type(d.querySelector(".speech"), d.dataset.text, d.dataset.name);
}
function advance(dir) {
  if (dir > 0 && step < maxStep(current)) return setStep(step + 1);
  if (dir < 0 && step > 0) return setStep(step - 1);
  if (dir > 0) go(current + 1);
  else if (current > 0) show(current - 1, true, maxStep(current - 1));
}
function setStep(n) {
  step = n;
  slides[current].classList.toggle("zoomed", step > 0);
  syncShots();
  prev.disabled = current === 0 && step === 0; next.disabled = current === slides.length - 1 && step >= maxStep(current);
  if (!reduce) burst(innerWidth / 2, innerHeight / 2);
  [880, 660, 440, 330].forEach((f, i) => tone(step ? f : 1320 - f, 0.09, "square", 0.05, i * 0.05));
}
const go = (n) => { if (n !== current && n >= 0 && n < slides.length) show(n); };
next.onclick = () => advance(1);
prev.onclick = () => advance(-1);

function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
$("full").onclick = toggleFull;

document.addEventListener("keydown", (e) => {
  if (!started) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } return; }
  if (["ArrowRight", "PageDown", "Enter", " "].includes(e.key)) { e.preventDefault(); advance(1); }
  else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); advance(-1); }
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(slides.length - 1);
  else if (e.key.toLowerCase() === "m") muteBtn.click();
  else if (e.key.toLowerCase() === "f") toggleFull();
});
document.querySelectorAll(".dialogue").forEach((d) => d.addEventListener("click", () => {
  const sp = d.querySelector(".speech"); clearInterval(sp._t); sp.textContent = d.dataset.text;
}));
let sx = null;
document.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!started || sx === null) return;
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 60) advance(dx < 0 ? 1 : -1);
  sx = null;
});

/* ---------- VFX: drifting pixel stars and hearts + burst on slide change ---------- */
const cv = $("fx"), cx = cv.getContext("2d");
let parts = [];
function resize() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener("resize", resize); resize();
const COLORS = ["#ffffff", "#ffe45c", "#ff2a2a"];
function spawn(x, y, vx, vy, life, size, color) { parts.push({ x, y, vx, vy, life, max: life, size, color }); }
function burst(x, y) { for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, s = 2 + Math.random() * 5; spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 40 + Math.random() * 20, 6, COLORS[(Math.random() * 3) | 0]); } }
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  if (!reduce && Math.random() < 0.25) spawn(Math.random() * cv.width, cv.height + 10, 0, -(0.4 + Math.random()), 400, 2 + ((Math.random() * 3) | 0) * 2, COLORS[(Math.random() * 3) | 0]);
  parts = parts.filter((p) => p.life > 0 && p.y > -20);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.life--;
    cx.globalAlpha = Math.min(1, p.life / 40) * 0.55;
    cx.fillStyle = p.color; cx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  requestAnimationFrame(loop);
}
loop();

/* ---------- Title screen ---------- */
function start() {
  if (started) return;
  started = true;
  startAudio(); sfxSelect();
  document.documentElement.requestFullscreen?.().catch(() => {});
  intro.classList.add("gone"); deck.classList.add("ready");
  show((parseInt(location.hash.slice(1), 10) || 1) - 1, false);
  burst(innerWidth / 2, innerHeight / 2);
}
intro.addEventListener("click", start);
intro.focus();
type($("introText"), "* It's a beautiful day outside. Birds are singing, flowers are blooming... on days like these, people like Jhay-Em...", "TORIEL", 38);
show(0, false);

/* ---------- Intro / school photos: frame takes the photo's own shape ---------- */
document.querySelectorAll(".frame img").forEach((img) => {
  const frame = img.parentNode;
  const apply = () => {
    if (!img.naturalWidth) return;
    frame.style.setProperty("--ar", img.naturalWidth / img.naturalHeight);
    frame.classList.add("fit");
  };
  if (img.complete) apply(); else img.addEventListener("load", apply);
});

/* ---------- Walkers (Sans / Papyrus slots): same idea as the cat, different movement ---------- */
const ART = {
  slime: ["....####....", "..########..", ".##########.", "##.##..##.##", "############", "############", ".##.####.##."],
  robot: ["..######..", ".########.", ".#.####.#.", ".########.", "..######..", "...####...", "..######..", ".########.", "#.######.#", "#.######.#", "..######..", "...#..#...", "...#..#...", "..##..##.."],
};
const CLICK = { lazy: [150, 130, 150, 110], hop: [500, 650, 800, 1000] };
function pixelSvg(rows) {
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${rows.map((r, y) => [...r].map((c, x) => (c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "")).join("")).join("")}</svg>`;
}
WALKERS.forEach((w) => {
  const b = document.createElement("button");
  b.type = "button"; b.setAttribute("aria-label", `${w.name} standing by (click me)`);
  b.className = `walker ${w.move}`;
  b.style.cssText = `--h:${w.height}px; ${w.side}:${w.x}`;
  const flip = w.facing !== "front" && w.facing !== w.look;
  b.innerHTML = `<span class="flip${flip ? " mirror" : ""}"><span class="sprite"><img src="${w.src}" alt="${w.name}"></span></span>`;
  const img = b.querySelector("img");
  img.onerror = () => { img.parentNode.innerHTML = pixelSvg(ART[w.art]); };
  b.onclick = () => {
    const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2);
    CLICK[w.move].forEach((f, i) => tone(f, 0.09, "square", 0.06, i * 0.08));
  };
  document.body.appendChild(b);
});
