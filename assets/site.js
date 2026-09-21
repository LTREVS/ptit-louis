/* P'tit Louis : film d'entrée scrubbé + couloir photoréaliste (vidéo de marche et murs d'accrochage) + fiche projet. JavaScript simple, aucune dépendance. */
(() => {
'use strict';

const D = window.PL || { ailes: [], projets: [] };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const WA = '33761479585';
const root = document.documentElement;
const parAile = (id) => D.projets.filter((p) => p.cat === id);
// Vignette d'index : 800 px suffisent pour une case de 250 px ; la version 1600 px ne sert qu'aux très grands écrans. Les murs du couloir gardent la version 1600 px.
const vignette = (im, p) => { const r = p.ratio || 1.7, k = p.type === 'video' ? 0.5625 : Math.min(1, r); const w1 = Math.round((p.type === 'video' ? 800 : 800) * k), w2 = p.type === 'video' ? 900 : Math.round(1600 * k); im.srcset = `${src(p, '-m.jpg')} ${w1}w, ${src(p, '-w.jpg')} ${w2}w`; im.sizes = '(max-width:720px) 60vw, (max-width:860px) 31vw, (max-width:1100px) 23vw, 19vw'; im.src = src(p, '-m.jpg'); };
const aile = (id) => D.ailes.find((a) => a.id === id);
const src = (p, suf) => `assets/p/${p.id}${suf}`;

/* ------------------------------------------------------------------ */
/* Titres découpés en mots : décalages pseudo-aléatoires à graine fixe */
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function decoupe(el, seed) {
  const brut = el.textContent.trim(); const r = rng(seed); const lignes = brut.split("|").map((l) => l.trim());
  const total = lignes.reduce((n, l) => n + l.split(" ").length, 0); let i = 0;
  el.textContent = "";
  const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = lignes.join(" ");
  const vis = document.createElement("span"); vis.setAttribute("aria-hidden", "true");
  lignes.forEach((ligne) => {
    const bloc = document.createElement("span"); bloc.className = lignes.length > 1 ? "ligne" : "";
    const mots = ligne.split(" ");
    mots.forEach((m, j) => {
      const w = document.createElement("span"); w.className = "w"; w.textContent = m + (j < mots.length - 1 ? " " : "");
      w.style.setProperty("--th", (i / Math.max(1, total) * 0.5 + r() * 0.05).toFixed(3));
      w.style.setProperty("--sx", i < total / 2 ? "1" : "-1");
      w.style.setProperty("--jx", ((r() - 0.5) * 160).toFixed(0) + "px");
      w.style.setProperty("--jy", ((r() - 0.5) * 90).toFixed(0) + "px");
      w.style.setProperty("--jr", ((r() - 0.5) * 24).toFixed(1) + "deg");
      bloc.appendChild(w); i++;
    });
    vis.appendChild(bloc);
  });
  el.append(sr, vis);
}

/* Bandes de texte : opacité et assemblage pilotés par la progression, écrits seulement au changement */
function lireBandes(conteneur, reglages) {
  const els = $$('.band', conteneur);
  return els.map((el, i) => ({ el, a: +el.dataset.a, b: +el.dataset.b, first: !!el.dataset.first, last: !!el.dataset.last, op: -1, k: -1, ...reglages }));
}
function majBandes(bandes, p, loadK = 0) {
  for (const b of bandes) {
    const f = Math.min(b.f, (b.b - b.a) / 3);
    let op = (b.first ? 1 : smoothstep(p, b.a, b.a + f)) * (b.last ? 1 : 1 - smoothstep(p, b.b - f, b.b));
    if (b.first && p < b.a) op = 1;
    let k = clamp((p - b.a) / Math.min(b.ramp, (b.b - b.a) * 0.35), 0, 1);
    if (b.first) k = Math.max(k, loadK);
    if (Math.abs(op - b.op) > 0.004 || (op === 0) !== (b.op === 0) || (op === 1) !== (b.op === 1)) {
      b.el.style.opacity = op.toFixed(3);
      b.el.classList.toggle('on', op > 0.001);
      b.op = op;
    }
    if (Math.abs(k - b.k) > 0.008 || (k === 1) !== (b.k === 1) || (k === 0) !== (b.k === 0)) { b.el.style.setProperty('--k', k.toFixed(3)); b.k = k; }
  }
}
function progression(section) {
  const r = section.getBoundingClientRect();
  const course = section.offsetHeight - innerHeight;
  return course > 0 ? clamp(-r.top / course, 0, 1) : 0;
}

/* ------------------------------------------------------------------ */
/* LE RIDEAU : pour aller loin dans la page, on ne déroule pas tout en accéléré. Fondu, saut, fondu. */
const Rideau = (() => {
  const el = $(".rideau"); let occupe = false; const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    vers(calculeY, apres) {
      if (occupe) return; if (calme()) { scrollTo({ top: calculeY(), behavior: "instant" }); if (apres) apres(); return; }
      occupe = true; el.classList.add("on");
      setTimeout(() => { scrollTo({ top: calculeY(), behavior: "instant" }); if (apres) apres(); setTimeout(() => { el.classList.remove("on"); occupe = false; }, 340); }, 380);
    },
  };
})();

/* ------------------------------------------------------------------ */
/* LA BALADE : une seule scène du début à la fin. Le film de la porte, la marche dans le couloir, les murs      */
/* d'accrochage, la porte du fond. Tout est piloté par le scroll, en fondus doux, sans rien de lourd à l'écran. */
const Balade = (() => {
  const section = $('.balade'); const scene = $('.scene'); const zoneMurs = $('.murs'); const marche = $('.marche'); const vMarche = $('#marche'); const vArrivee = $('#arrivee');
  const filmEl = $('.film-couche'); const vFilm = $('#hero'); const enseigne = $('.enseigne-film'); const cue = $('.cue');
  const finEl = $('.fin-couloir'); const zoneTitres = $('.titres'); const cartelEl = $('.cartel'); const planEl = $('.plan'); const astuce = $('.astuce');
  const planIci = $('.plan-ici', planEl); const planTrace = $('.plan-trace', planEl);
  let arriveeOn = null;
  const OCTETS = [22395243, 17917385, 19989676];   // tailles réelles des deux vidéos, écrites par _outils/taille-videos.mjs (secours si le serveur ne donne pas Content-Length)
  const FONDS = ['assets/decor/mur-a.jpg', 'assets/decor/mur-b.jpg']; const NB = D.ailes.length; const F = 400;   // durée du film d'entrée, en vh de scroll (8 s de film)
  const REPART = { 1: [1], 2: [2], 3: [1, 2], 4: [2, 2], 5: [2, 3], 6: [2, 2, 2], 7: [2, 3, 2], 8: [3, 2, 3], 9: [3, 2, 4], 10: [3, 3, 4], 11: [4, 3, 4], 12: [4, 4, 4] };
  // Téléphone tenu droit : le plan du mur (16:9) déborde largement de l'écran, on n'en voit que la bande centrale. La zone d'accrochage s'y adapte,
  // les films et les images passent en version verticale légère (suffixe -m), et l'accrochage se fait sur deux colonnes.
  const DEBOUT = innerHeight > innerWidth * 1.05, VISIBLE = Math.min(1, (innerWidth / innerHeight) / 1.849), M = DEBOUT ? '-m' : '';
  const ZONE = DEBOUT ? { x: 0.5, y: 0.425, w: 0.9 * VISIBLE, h: 0.6, sol: 0.772 } : { x: 0.5, y: 0.435, w: 0.548, h: 0.595, sol: 0.772 };
  const OCTETS_M = [2534000, 2066000, 2097000];
  // position de la porte dans le film (temps s, centre x, haut y, largeur), en fractions de l'image. À re-mesurer si le film change.
  const PORTE = [[0, .494, .112, .404], [0.5, .494, .096, .417], [1.0, .495, .078, .433], [1.5, .496, .052, .456], [2.0, .496, .013, .487], [2.5, .497, -.03, .52]];
  let stations = [], trous = [], S_TOTAL = 1, sAiles = [], sTitres = [], sFin = [0, 1];
  let bandes = [], arme = false, init = false, surEcran = true, rafId = null, lastTick = 0, sale = true, t0 = 0, loadK = 0;
  let target = 0, shown = 0, mx = 0, my = 0, mxC = 0, myC = 0, aileActive = -2, astuceVue = false, astuceFinie = false, planLarg = 0;
  const ease = (t) => t * t * (3 - 2 * t);

  /* --- deux vidéos scrubbées, chacune avec son verrou de seek --- */
  function scrub(video) {
    let busy = false, pending = null, tBusy = 0;
    // garde-fou : sur iPhone il arrive que "seeked" ne revienne jamais. Au bout de 300 ms on considère le saut comme fait, sinon le film resterait figé.
    const seek = (t) => { if (!video.duration) return; if (busy && performance.now() - tBusy > 300) busy = false; if (busy) { pending = t; return; } if (Math.abs(video.currentTime - t) < 0.012) return; busy = true; tBusy = performance.now(); video.currentTime = t; };
    video.addEventListener('seeked', () => { busy = false; if (pending !== null) { const t = pending; pending = null; seek(t); } });
    video.addEventListener('error', () => { busy = false; pending = null; if (video.id === 'hero' || video.id === 'marche') video.parentElement.classList.add('video-failed'); else if (!video.id) video.remove(); });
    return seek;
  }
  const TACTILE = matchMedia('(pointer: coarse)').matches;
  // Un film = une version légère, prête en une ou deux secondes, puis (sur ordinateur) la pleine qualité qui se pose par-dessus dès qu'elle est arrivée.
  function doubleFilm(video, classe) {
    const leger = scrub(video); let hd = null, seekHd = null, hdPret = false, hdSeul = false, voulu = 0;
    return {
      seek(t) { voulu = t; if (!hdSeul) leger(t); if (hdPret) seekHd(t); },
      source() { return hdSeul && hd ? hd : video; },
      actif(on) { if (hd) hd.classList.toggle('actif', on); },
      creeHd() { hd = video.cloneNode(false); hd.removeAttribute('id'); hd.className = 'hd' + (classe ? ' ' + classe : ''); if (video.classList.contains('actif')) hd.classList.add('actif'); video.after(hd); seekHd = scrub(hd); return hd; },
      hdArrive() { hd.addEventListener('seeked', () => { hdPret = true; hd.classList.add('pret'); setTimeout(() => { hdSeul = true; }, 900); sale = true; reveille(); }, { once: true }); hd.currentTime = Math.max(0.05, Math.min(voulu, (hd.duration || 1) - 0.05)); },
    };
  }
  const fFilm = doubleFilm(vFilm), fMarche = doubleFilm(vMarche), fArrivee = doubleFilm(vArrivee, 'hd-arrivee');
  const seekFilm = fFilm.seek, seekMarche = fMarche.seek, seekArrivee = fArrivee.seek;
  // si le téléphone a refusé le lancement automatique (mode économie d'énergie), le premier toucher déverrouille les films
  if (TACTILE) addEventListener('touchstart', () => { [vFilm, vMarche, vArrivee].forEach((v) => { if (v.src && v.paused && v.readyState < 2) { const pr = v.play(); if (pr && pr.then) pr.then(() => v.pause()).catch(() => {}); } }); }, { passive: true });

  // Le voile : un filtre sombre devant la porte, et le scroll retenu le temps que la version légère du film arrive. Personne ne reste coincé :
  // un bouton "Entrer sans attendre" apparaît au bout de 7 s, tout se déverrouille seul à 25 s, et un clic dans le menu lève le voile.
  const voile = $('.voile'), voileTitre = $('.voile-titre'), passer = $('.voile-passer'), jaugeMsg = $('.chargement-msg'), jaugePct = $('.chargement-pct span'), jaugeBarre = $('.chargement-barre'), filet = $('.filet');
  const MSGS = ["J'allume les appliques", 'Je redresse les cadres', 'Un coup de chiffon sur le laiton', "J'arrose les plantes", "C'est presque ouvert"];
  const TOUCHES = [' ', 'Spacebar', 'PageDown', 'PageUp', 'End', 'Home', 'ArrowDown', 'ArrowUp'];
  let verrou = false, voileT = [], msgI = 0, msgT = null, pctVu = -1;
  const retient = (e) => { if (verrou) e.preventDefault(); };
  const retientClavier = (e) => { if (verrou && TOUCHES.includes(e.key) && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.preventDefault(); };
  const retientScroll = () => { if (verrou && scrollY > 2) scrollTo(0, 0); };
  function verrouille() {
    if (verrou || vFilm.classList.contains('pret') || scrollY > innerHeight * 0.4 || location.hash.length > 1) return;
    verrou = true; cue.classList.add('attend');
    addEventListener('wheel', retient, { passive: false }); addEventListener('touchmove', retient, { passive: false }); addEventListener('keydown', retientClavier); addEventListener('scroll', retientScroll, { passive: true });
    voileT.push(setTimeout(() => { if (verrou) voile.classList.add('on'); }, 250));      // film déjà en cache : le voile n'a même pas le temps d'apparaître
    voileT.push(setTimeout(() => { if (verrou) passer.hidden = false; }, 7000));
    voileT.push(setTimeout(() => deverrouille(), 25000));
    msgT = setInterval(() => { msgI = (msgI + 1) % MSGS.length; jaugeMsg.classList.add('change'); setTimeout(() => { jaugeMsg.textContent = MSGS[msgI]; jaugeMsg.classList.remove('change'); }, 270); }, 2400);
  }
  function deverrouille() {
    if (!verrou) return; verrou = false; voileT.forEach(clearTimeout); voileT = []; clearInterval(msgT);
    removeEventListener('wheel', retient); removeEventListener('touchmove', retient); removeEventListener('keydown', retientClavier); removeEventListener('scroll', retientScroll);
    voile.classList.remove('on'); cue.classList.remove('attend'); t0 = performance.now(); sale = true; reveille();   // le titre s'assemble au moment où le voile se lève
  }
  passer.addEventListener('click', deverrouille);
  document.addEventListener('click', (e) => { if (verrou && e.target.closest('.nav a, .nav button, a[href^="#"]')) deverrouille(); }, true);
  function jaugeDebut(principal, discret) { if (discret) return; filet.style.setProperty('--p', 0); filet.classList.add('on'); }
  function jaugeMaj(f, principal, discret) {
    if (discret) return; const pc = Math.round(f * 100); if (pc === pctVu) return; pctVu = pc; filet.style.setProperty('--p', f.toFixed(3));
    if (principal) { voile.style.setProperty('--p', f.toFixed(3)); jaugePct.textContent = pc; jaugeBarre.setAttribute('aria-valuenow', pc); }
  }
  function jaugeFin(principal, ok, discret) {
    if (discret) return; filet.classList.remove('on'); pctVu = -1; if (!principal) return;
    if (ok && verrou) { clearInterval(msgT); voileTitre.textContent = "C'est ouvert."; jaugeMsg.textContent = 'Entre.'; setTimeout(deverrouille, 650); } else deverrouille();
  }
  async function charge(video, url, octets, o = {}) {
    const ctrl = new AbortController(); let garde = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, priority: o.principal ? "high" : "low" }); if (!r.ok) throw 0;
      const total = Number(r.headers.get("Content-Length")) || octets; const lecteur = r.body.getReader(); const morceaux = []; let recu = 0, dernier = 0;
      const principal = !!o.principal, discret = !!o.hd; jaugeDebut(principal, discret);
      for (;;) {
        const { done, value } = await lecteur.read(); if (done) break;
        clearTimeout(garde); garde = setTimeout(() => ctrl.abort(), 25000);
        morceaux.push(value); recu += value.length; const f = Math.min(1, recu / total), now = performance.now();
        if (now - dernier > 100 || f === 1) { dernier = now; jaugeMaj(f, principal, discret); }
      }
      clearTimeout(garde);
      video.muted = true; video.playsInline = true; video.setAttribute('webkit-playsinline', '');
      video.src = URL.createObjectURL(new Blob(morceaux, { type: "video/mp4" })); video.load();
      await new Promise((ok) => {
        let fini = false; const f = () => { if (!fini) { fini = true; ok(); } };
        video.addEventListener("canplay", f, { once: true }); video.addEventListener("loadeddata", f, { once: true });
        // Safari sur iPhone ne décode aucune image tant que la vidéo n'a pas été lancée une fois : on la lance muette, puis pause aussitôt
        if (TACTILE) { const pr = video.play(); if (pr && pr.then) pr.then(() => { video.pause(); f(); }).catch(() => {}); setTimeout(f, 7000); }
      });
      if (o.hd) { o.hd.hdArrive(); return true; }
      video.parentElement.classList.add("video-ready"); video.classList.add("pret"); jaugeFin(principal, true, false); sale = true; reveille(); return true;
    } catch (e) { clearTimeout(garde); jaugeFin(!!o.principal, false, !!o.hd); if (o.hd) { video.remove(); return false; } if (video.id !== "arrivee") video.parentElement.classList.add("video-failed"); return false; }
  }

  /* --- accrochage de salon : rangées justifiées de hauteurs différentes, décalées, qui remplissent le mur --- */
  // Accrochage pour écran debout : rangées justifiées de même largeur, deux pièces par rangée en général, une seule quand elle est très large.
  function accrocheDebout(items) {
    const W = 5, G = 0.16, rs = items.map((i) => i.ratio || 1.78), cible = (ZONE.w * 16) / (ZONE.h * 9); let best = null;
    for (let R = 1.0; R <= 4.2; R += 0.1) {                 // R = somme des formats visée par rangée : on essaie, on garde le bloc qui remplit le mieux le mur
      const rangs = [[]]; let som = 0;
      rs.forEach((r, i) => { const cur = rangs[rangs.length - 1]; if (cur.length && (som + r > R + 0.35 || cur.length >= 3)) { rangs.push([i]); som = r; } else { cur.push(i); som += r; } });
      const hs = rangs.map((g) => (W - G * (g.length - 1)) / g.reduce((a, i) => a + rs[i], 0)); const H = hs.reduce((a, b) => a + b, 0) + G * (rangs.length - 1);
      const asp = W / H, cout = (1 - Math.min(asp / cible, cible / asp)) + (Math.max(...hs) / Math.min(...hs) - 1) * 0.35;
      if (!best || cout < best.cout - 1e-9) best = { cout, rangs, hs };
    }
    const pl = []; let y = 0;
    best.rangs.forEach((g, r) => { let u = -W / 2; const h = best.hs[r]; g.forEach((i) => { const w = h * rs[i]; pl.push({ it: items[i], u: u + w / 2, t: y, w, h }); u += w + G; }); y += h + G; });
    const bh = y - G; pl.forEach((q) => { q.t -= bh / 2; }); return { pl, bw: W, bh };
  }
  function salon(items) {
    if (DEBOUT) return accrocheDebout(items);
    const n = items.length, W = 5, G = 0.13, portraits = items.every((i) => (i.ratio || 1.78) < 0.9), larg = [0.94, 1, 0.9, 0.96], decal = [-0.04, 0.03, -0.05, 0.04];
    let idx = 0, y = 0; const pl = []; const rs = items.map((i) => i.ratio || 1.78), mixte = !portraits && n >= 4 && Math.max(...rs) / Math.min(...rs) > 1.5;
    const lots = mixte ? [] : portraits ? [items] : REPART[Math.min(n, 12)].map((c) => items.slice(idx, (idx += c)));
    if (mixte) mosaique(items, rs, W, G).forEach((p) => pl.push(p));
    lots.forEach((lot, r) => {
      const Wr = W * (lots.length > 1 ? larg[r % 4] : 1), som = lot.reduce((a, i) => a + (i.ratio || 1.78), 0); let h = (Wr - G * (lot.length - 1)) / som; h = Math.min(h, portraits ? 2.7 : 1.55);
      const wr = som * h + G * (lot.length - 1); let u = -wr / 2 + (lots.length > 1 ? decal[r % 4] * W : 0);
      lot.forEach((it, i) => { const w = h * (it.ratio || 1.78), dv = portraits ? [0, 0.1, -0.06, 0.12, -0.04][i % 5] : 0; pl.push({ it, u: u + w / 2, t: y + dv, w, h }); u += w + G; }); y += h + G;
    });
    const x0 = Math.min(...pl.map((p) => p.u - p.w / 2)), x1 = Math.max(...pl.map((p) => p.u + p.w / 2)), y0 = Math.min(...pl.map((p) => p.t)), y1 = Math.max(...pl.map((p) => p.t + p.h));
    pl.forEach((p) => { p.u -= (x0 + x1) / 2; p.t -= (y0 + y1) / 2; }); return { pl, bw: x1 - x0, bh: y1 - y0 };
  }
  // Mur aux formats mélangés (16:9, affiches, bannière, stories) : accrochage en mosaïque. Toutes les rangées font exactement la même largeur,
  // donc deux bords nets, et on répartit les pièces pour que les rangées aient des hauteurs voisines et que le bloc remplisse le mur.
  function mosaique(items, rs, W, G) {
    const n = items.length, cible = (ZONE.w * 16) / (ZONE.h * 9); let best = null;
    for (let k = 2; k <= Math.min(4, Math.floor(n / 2)); k++) {
      const total = Math.pow(k, n - 1);                     // la première pièce reste en rangée 0 : inutile d'essayer les mêmes partages dans un autre ordre
      for (let code = 0; code < total; code++) {
        const som = new Array(k).fill(0), cnt = new Array(k).fill(0); som[0] = rs[0]; cnt[0] = 1;
        for (let i = 1, c = code; i < n; i++, c = Math.floor(c / k)) { const r = c % k; som[r] += rs[i]; cnt[r]++; }
        if (cnt.some((c) => c < 2)) continue;
        let H = G * (k - 1), hmin = 1e9, hmax = 0; for (let r = 0; r < k; r++) { const h = (W - G * (cnt[r] - 1)) / som[r]; H += h; if (h < hmin) hmin = h; if (h > hmax) hmax = h; }
        const asp = W / H, cout = (1 - Math.min(asp / cible, cible / asp)) + (hmax / hmin - 1) * 0.7;
        if (!best || cout < best.cout) best = { cout, k, code };
      }
    }
    const rangs = Array.from({ length: best.k }, () => []); rangs[0].push(0);
    for (let i = 1, c = best.code; i < n; i++, c = Math.floor(c / best.k)) rangs[c % best.k].push(i);
    rangs.sort((a, b) => a.length - b.length);                // les grandes pièces en haut, le détail en bas
    const pl = []; let y = 0;
    rangs.forEach((rang, r) => {
      rang.sort((a, b) => (r % 2 ? rs[a] - rs[b] : rs[b] - rs[a]));   // une rangée commence par sa pièce large, la suivante finit par elle : ça évite les colonnes
      const h = (W - G * (rang.length - 1)) / rang.reduce((a, i) => a + rs[i], 0); let u = -W / 2;
      rang.forEach((i) => { const w = h * rs[i]; pl.push({ it: items[i], u: u + w / 2, t: y, w, h }); u += w + G; }); y += h + G;
    });
    return pl;
  }
  function lots(liste) {
    const rs = liste.map((p) => p.ratio || 1.78), vert = rs.every((r) => r < 0.9), mixte = !vert && Math.max(...rs) / Math.min(...rs) > 1.5;
    // sur téléphone : un mur haut et étroit. 12 pièces en 16:9 le remplissent bien (2 colonnes), mais un mur aux formats mélangés devient illisible au-delà de 6
    const max = DEBOUT ? (vert ? 4 : mixte ? 6 : 12) : (vert ? 4 : 10); if (liste.length <= max) return [liste];
    const n = Math.ceil(liste.length / max), t = Math.ceil(liste.length / n); return Array.from({ length: n }, (_, i) => liste.slice(i * t, (i + 1) * t)).filter((l) => l.length);
  }

  function construitMurs() {
    let num = 0;
    D.ailes.forEach((a, k) => {
      lots(parAile(a.id)).forEach((lot, j) => {
        const cote = num % 2 === 0 ? -1 : 1; const el = document.createElement('div'); el.className = 'mur';
        const plan = document.createElement('div'); plan.className = 'mur-plan' + (num % 4 >= 2 ? ' miroir' : '');
        const fond = document.createElement('img'); fond.className = 'mur-fond'; fond.alt = ''; fond.decoding = 'async'; fond.dataset.src = FONDS[num % FONDS.length];
        const sol = document.createElement('div'); sol.className = 'mur-sol'; const zc = document.createElement('div'); zc.className = 'mur-cadres';
        const { pl, bw, bh } = salon(lot); const m = Math.min(ZONE.w / bw, (ZONE.h * 9 / 16) / bh); const vids = [], imgs = [fond];
        pl.forEach((q, i) => {
          const w = q.w * m, h = q.h * m * 16 / 9, x = ZONE.x + q.u * m - w / 2, y = ZONE.y + q.t * m * 16 / 9, p = q.it;
          const r = document.createElement('div'); r.className = 'reflet'; r.style.cssText = `left:${(x * 100).toFixed(3)}%;top:${((ZONE.sol + (ZONE.sol - (y + h))) * 100).toFixed(3)}%;width:${(w * 100).toFixed(3)}%;height:${(h * 100).toFixed(3)}%`;
          const ir = document.createElement('img'); ir.alt = ''; ir.decoding = 'async'; ir.dataset.src = src(p, DEBOUT ? '-m.jpg' : '-w.jpg'); r.appendChild(ir); zc.appendChild(r); imgs.push(ir);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'cadre'; b.style.cssText = `left:${(x * 100).toFixed(3)}%;top:${(y * 100).toFixed(3)}%;width:${(w * 100).toFixed(3)}%;height:${(h * 100).toFixed(3)}%;--i:${i}`;
          b.setAttribute('aria-label', `Ouvrir : ${p.title}`);
          const im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.dataset.src = src(p, DEBOUT ? '-m.jpg' : '-w.jpg'); b.appendChild(im); imgs.push(im);
          if (p.type === 'video') { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1; v.dataset.src = src(p, '-loop.mp4'); b.appendChild(v); vids.push(v); }
          b.addEventListener('click', () => Fiche.ouvre(p)); b.addEventListener('pointerenter', () => majCartel(p)); b.addEventListener('pointerleave', () => majCartel(null)); b.addEventListener('focus', () => majCartel(p)); b.addEventListener('blur', () => majCartel(null));
          zc.appendChild(b);
        });
        plan.append(fond, zc, sol); el.appendChild(plan); zoneMurs.appendChild(el);
        stations.push({ k, j, cote, el, plan, zc, vids, imgs, e: -1, cle: '', cleD: '', pret: false, joue: false, in0: 0, in1: 0, p0: 0, p1: 0, out0: 0, out1: 0 }); num++;
      });
    });
  }
  // charger et décoder les images d'un mur AVANT d'y arriver, pour qu'il n'y ait aucun à-coup à l'apparition
  function prepare(st) { if (st.pret) return st.promesse; st.pret = true; st.promesse = Promise.all(st.imgs.map((im) => { im.src = im.dataset.src; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); })); st.vids.forEach((v) => { v.preload = 'auto'; v.src = v.dataset.src; }); return st.promesse; }

  /* --- la piste, en vh de scroll. Le film occupe [0, F], le couloir vient ensuite, sans couture. --- */
  function construitPiste() {
    let s = F + 30;
    D.ailes.forEach((a, k) => {
      const murs = stations.filter((st) => st.k === k); sAiles[k] = s; const ta = s + 4; s += 124; sTitres[k] = [ta, s - 4];
      murs.forEach((st, j) => { const dernier = j === murs.length - 1, tIn = j === 0 ? 46 : 60; st.in0 = s; st.in1 = s + tIn; s += tIn; st.p0 = s; s += 120; st.p1 = s; st.out0 = s; st.out1 = s + (dernier ? 46 : 60); if (dernier) s += 46; });
    });
    sAiles[NB] = s; s += 70; sFin = [s - 44, s + 6]; s += 90; S_TOTAL = s;
    trous = []; let g0 = F - 8; const ordre = [...stations].sort((a, b) => a.in0 - b.in0);
    ordre.forEach((st, i) => { if (i === 0 || ordre[i - 1].out0 !== st.in0) trous.push([g0, st.in1]); g0 = st.out0; });
    trous.push([g0, S_TOTAL]);
  }
  const presence = (st, s) => (s <= st.in0 || s >= st.out1 ? 0 : s < st.in1 ? ease((s - st.in0) / (st.in1 - st.in0)) : s <= st.out0 ? 1 : 1 - ease((s - st.out0) / (st.out1 - st.out0)));

  let cartelId = null;
  function majCartel(p) {
    const id = p ? p.id : null; if (id === cartelId) return; cartelId = id; if (!p) { cartelEl.classList.remove('on'); return; }
    const a = aile(p.cat); cartelEl.textContent = ''; const b = document.createElement('b'); b.textContent = p.title; const l = document.createElement('span'); l.textContent = `${p.ligne} · ${a.court}`; const i = document.createElement('i'); i.textContent = `Technique : ${a.technique}`;
    cartelEl.append(b, l, i); cartelEl.classList.add('on');
  }
  let planX = -1, planOn = null;
  function majPlan(s) {
    let k = -1; for (let i = 0; i < NB; i++) if (s >= sAiles[i] - 1) k = i; if (s >= sAiles[NB] + 12 || !surEcran) k = -1;
    let f = 0; if (s >= sAiles[NB]) f = 1; else if (s > sAiles[0]) { const i = Math.max(0, k); f = (i + clamp((s - sAiles[i]) / (sAiles[i + 1] - sAiles[i]), 0, 1)) / NB; }
    const x = f * planLarg; if (Math.abs(x - planX) > 0.4) { planIci.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; planX = x; }
    if (k !== aileActive) { aileActive = k; $$('.plan-ailes button', planEl).forEach((b, i) => b.classList.toggle('actif', i === k)); $$('.nav-ailes a').forEach((a, i) => a.classList.toggle('actif', i === k)); }
    const on = s > F + 16 && s < sFin[0]; if (on !== planOn) { planEl.classList.toggle('on', on); planOn = on; }
  }

  let ensC = '';
  function majEnseigne(pf) {
    if (!enseigne) return;   // l'enseigne suivie au-dessus de la porte n'existe plus : avec Louis en portier, le nom est passé au-dessus du titre
    const t = pf * (vFilm.duration || 8); let i = 0; while (i < PORTE.length - 2 && t > PORTE[i + 1][0]) i++;
    const A = PORTE[i], B = PORTE[i + 1], u = clamp((t - A[0]) / (B[0] - A[0]), 0, 1.4), cx = lerp(A[1], B[1], u), top = lerp(A[2], B[2], u), w = lerp(A[3], B[3], u);
    const W = scene.clientWidth, H = scene.clientHeight, dW = Math.max(W, H * 16 / 9), dH = dW * 9 / 16, k = w / PORTE[0][3], s = k * (dW / 1600);
    const x = (W - dW) / 2 + cx * dW, y = (H - dH) / 2 + (top - 0.014 * k) * dH, o = clamp((y - 46) / 20, 0, 1) * clamp(loadK * 1.5, 0, 1);
    const c = `${x.toFixed(1)}|${y.toFixed(1)}|${s.toFixed(3)}|${o.toFixed(2)}`; if (c === ensC) return; ensC = c;
    enseigne.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${s.toFixed(3)})`; enseigne.style.opacity = o.toFixed(2);
  }

  let mCle = '', filmO = -1, finO = -1, marcheVis = null, cueOn = null, dims = [0, 0];
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now)); lastTick = now; const kk = (r) => 1 - Math.pow(1 - r, dt / 16.667);
    shown += (target - shown) * kk(0.10); mxC += (mx - mxC) * kk(0.06); myC += (my - myC) * kk(0.06);
    if (verrou) t0 = now;
    loadK = clamp((now - t0) / 1400, 0, 1); loadK = loadK * loadK * (3 - 2 * loadK);
    const s = shown * S_TOTAL;

    // 1) le film de la porte, puis un fondu très court vers la marche (mêmes images des deux côtés)
    const fo = 1 - smoothstep(s, F - 10, F + 12);
    if (Math.abs(fo - filmO) > 0.004) { filmEl.style.opacity = fo.toFixed(3); filmEl.style.visibility = fo > 0.001 ? 'visible' : 'hidden'; filmO = fo; }
    if (fo > 0) { seekFilm(clamp(s / F, 0, 1) * ((vFilm.duration || 8) - 0.04)); majEnseigne(vFilm.classList.contains('pret') ? clamp(s / F, 0, 1) : 0); }
    const cu = s < 8; if (cu !== cueOn) { cue.classList.toggle('parti', !cu); cueOn = cu; }

    // 2) les murs : un fondu doux, un léger pas vers le mur, jamais de glissement d'un bord à l'autre
    let somme = 0, signe = 0, face = false;
    for (const st of stations) {
      if (!st.pret && s > st.in0 - 190 && s < st.out1 + 60) prepare(st);
      const e = presence(st, s); somme += e; signe += st.cote * e; if (e > 0.98) face = true;
      if ((e > 0) !== (st.e > 0)) st.el.classList.toggle('on', e > 0);
      if (e > 0) {
        const c = `${e.toFixed(3)}`; if (c !== st.cle) { st.el.style.opacity = e.toFixed(3); st.el.style.transform = `translate3d(${(st.cote * (1 - e) * 5).toFixed(2)}vw,0,0) scale(${(1 + 0.06 * (1 - e)).toFixed(4)})`; st.cle = c; }
        const d = clamp((s - st.p0) / (st.p1 - st.p0), 0, 1) * 2 - 1, bx = -d * 0.9 - mxC * 0.4, fx = -d * 0.45 - mxC * 0.45, fy = -myC * 0.25;
        const cd = `${bx.toFixed(2)}|${fx.toFixed(2)}|${fy.toFixed(2)}`; if (cd !== st.cleD) { st.plan.style.setProperty('--bx', bx.toFixed(2) + '%'); st.zc.style.transform = `translate3d(${fx.toFixed(2)}%,${fy.toFixed(2)}%,0)`; st.cleD = cd; }
      }
      const jouer = e > 0.92; if (jouer !== st.joue) { st.joue = jouer; st.vids.forEach((v) => { if (jouer) { v.play().catch(() => {}); v.classList.add('on'); } else v.pause(); }); }
      st.e = e;
    }

    // 3) la marche : elle avance seulement entre deux murs, et elle se pousse un peu du côté opposé au mur qui arrive
    const vis = somme < 0.999 && fo < 1; if (vis !== marcheVis) { marche.style.visibility = vis ? 'visible' : 'hidden'; marcheVis = vis; }
    if (vis) {
      const c = `${signe.toFixed(3)}|${somme.toFixed(3)}`; if (c !== mCle) { marche.style.transform = somme < 0.001 ? 'none' : `translate3d(${(-signe * 3).toFixed(2)}vw,0,0) scale(${(1 + 0.075 * Math.min(1, somme)).toFixed(4)})`; mCle = c; }
      const tr = trous.find((g) => s >= g[0] && s <= g[1]); const dernier = tr === trous[trous.length - 1] && vArrivee.classList.contains('pret');
      if (dernier !== arriveeOn) { vArrivee.classList.toggle('actif', dernier); fArrivee.actif(dernier); arriveeOn = dernier; }
      if (tr && dernier) seekArrivee(clamp((s - tr[0]) / (sFin[1] - tr[0]), 0, 1) * (vArrivee.duration - 0.05));
      else if (tr && vMarche.duration) seekMarche(clamp((s - tr[0]) / (tr[1] - tr[0]), 0, 1) * (vMarche.duration - 0.05));
    }

    // 4) la porte du fond
    const fn = smoothstep(s, sFin[0], sFin[1]); if (Math.abs(fn - finO) > 0.004) { finEl.style.opacity = fn.toFixed(3); finEl.style.visibility = fn > 0.001 ? 'visible' : 'hidden'; finO = fn; }

    majBandes(bandes, shown, loadK); majPlan(s);
    if (!astuceVue && face) { astuceVue = true; astuce.classList.add('on'); setTimeout(() => { astuceFinie = true; astuce.classList.remove('on'); }, 6500); }
    if (astuceVue && !astuceFinie && !face) { astuceFinie = true; astuce.classList.remove('on'); }
    const calme = Math.abs(target - shown) < 0.00002 && Math.abs(mx - mxC) < 0.002 && Math.abs(my - myC) < 0.002 && loadK >= 1 && !sale; sale = false;
    if (calme) { rafId = null; lastTick = 0; } else rafId = requestAnimationFrame(tick);
  }
  function reveille() { if (rafId === null && surEcran && arme) rafId = requestAnimationFrame(tick); }
  function onScroll() { target = progression(section); reveille(); }
  function recale() { target = progression(section); shown = target; mxC = mx; myC = my; sale = true; reveille(); }
  // Fondu enchaîné : on fige exactement ce qui est à l'écran, on place la page à destination en dessous, puis on dissout l'ancienne vue dans la nouvelle.
  function fantome(dehors) {
    const g = document.createElement("div"); g.className = "fantome" + (dehors ? " dehors" : ""); g.setAttribute("aria-hidden", "true");
    const film = filmO > 0.5, v = film ? fFilm.source() : fMarche.source();
    if (filmO > 0.001 || marcheVis) {
      let img;
      if (v.videoWidth) { img = document.createElement("canvas"); img.width = v.videoWidth; img.height = v.videoHeight; try { img.getContext("2d").drawImage(v, 0, 0); } catch (e) { img = null; } }
      if (!img) { img = document.createElement("div"); img.style.background = (film ? `url(assets/hero-poster${M}.jpg)` : `url(assets/decor/couloir${M}.jpg)`) + " 50% 50%/cover"; }
      img.className = "fantome-image"; if (!film) img.style.transform = marche.style.transform; g.appendChild(img);
    }
    stations.forEach((st) => { if (st.e > 0) { const c = st.el.cloneNode(true); c.querySelectorAll("video").forEach((x) => x.remove()); g.appendChild(c); } });
    if (finO > 0.001) { const f = finEl.cloneNode(false); g.appendChild(f); }
    if (dehors) $$(".band.on", scene).forEach((b) => g.appendChild(b.cloneNode(true)));
    (dehors ? document.body : scene).appendChild(g); return g;
  }
  let saut = false;
  function fondreVers(calculeY, sCible, dehors) {
    if (saut) return; saut = true; const g = fantome(dehors); scene.classList.add("saut");
    scrollTo({ top: calculeY(), behavior: "instant" }); recale();
    const pret = sCible == null ? Promise.resolve() : Promise.all(stations.filter((st) => sCible > st.in0 - 40 && sCible < st.out1 + 40).map(prepare));
    Promise.race([pret, new Promise((r) => setTimeout(r, 1200))]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      g.classList.add("part"); setTimeout(() => { g.remove(); scene.classList.remove("saut"); saut = false; }, 950);
    })));
  }
  const epingle = () => { const r = section.getBoundingClientRect(); return arme && r.top <= 1 && r.bottom >= innerHeight - 1; };
  function allerA(k) { const st = stations.find((x) => x.k === k); const cible = st ? st.p0 + 14 : sAiles[k] + 6; const y = () => section.getBoundingClientRect().top + scrollY + (cible / S_TOTAL) * (section.offsetHeight - innerHeight); if (epingle()) fondreVers(y, cible, false); else Rideau.vers(y, recale); }
  function mesure() { planLarg = planTrace.clientWidth; planX = -1; ensC = ''; sale = true; reveille(); }

  function initOnce() {
    if (init) return true; init = true; t0 = performance.now();
    construitMurs(); construitPiste(); section.style.height = `${Math.round(S_TOTAL + 100)}vh`;
    // les deux bandes du film : leurs plages sont écrites en fraction du film, on les ramène à la piste entière
    $$('.band-film', section).forEach((b) => { b.dataset.a = ((+b.dataset.a * F) / S_TOTAL).toFixed(5); b.dataset.b = ((+b.dataset.b * F) / S_TOTAL).toFixed(5); });
    D.ailes.forEach((a, k) => {
      const b = document.createElement('div'); b.className = 'band'; b.dataset.a = (sTitres[k][0] / S_TOTAL).toFixed(5); b.dataset.b = (sTitres[k][1] / S_TOTAL).toFixed(5); b.dataset.entree = a.entree;
      const n = document.createElement('span'); n.className = 'num'; n.textContent = `Aile ${k + 1} sur ${NB}`; const t = document.createElement('p'); t.className = 'titre split'; t.textContent = a.nom; const su = document.createElement('p'); su.className = 'sub'; su.textContent = a.sous;
      b.append(n, t, su); zoneTitres.appendChild(b);
    });
    const porte = $('.band-porte', section); porte.dataset.a = (sFin[1] / S_TOTAL).toFixed(5); porte.dataset.b = '1';
    $$('.split', section).forEach((el, i) => decoupe(el, 11 + i * 13));
    const rampe = 16 / S_TOTAL; bandes = lireBandes(section, { f: rampe, ramp: rampe * 1.3 });
    bandes.find((b) => b.el.classList.contains('band-f1')).first = true; bandes.find((b) => b.el === porte).last = true;
    const zoneAiles = $('.plan-ailes', planEl);
    D.ailes.forEach((a, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = a.court; b.setAttribute('aria-label', `Aller à l'aile ${a.nom}`); b.addEventListener('click', () => allerA(k)); zoneAiles.appendChild(b); });
    $('.film-poster').style.backgroundImage = `url('assets/hero-poster${M}.jpg')`; $('.marche-poster').style.backgroundImage = `url('assets/decor/couloir${M}.jpg')`; finEl.style.backgroundImage = `url('assets/decor/fin${M}.jpg')`;
    if (DEBOUT) { scene.classList.add('debout'); const a = $('.astuce'); if (a) a.textContent = "Touche un cadre pour l'ouvrir"; }
    const OCTETS_L = [2227405, 2237166, 2332982], leger = DEBOUT ? '-m' : '-l', OL = DEBOUT ? OCTETS_M : OCTETS_L, econome = !!(navigator.connection && navigator.connection.saveData);
    let parti = false; const go = () => { if (parti) return; parti = true;
      charge(vFilm, `assets/hero-scrub${leger}.mp4`, OL[0], { principal: true }).then(() => charge(vMarche, `assets/marche-scrub${leger}.mp4`, OL[1])).then(() => charge(vArrivee, `assets/arrivee-scrub${leger}.mp4`, OL[2]))
        .then(() => { if (DEBOUT || econome) return null; return charge(fFilm.creeHd(), 'assets/hero-scrub.mp4', OCTETS[0], { hd: fFilm }).then(() => charge(fMarche.creeHd(), 'assets/marche-scrub.mp4', OCTETS[1], { hd: fMarche })).then(() => charge(fArrivee.creeHd(), 'assets/arrivee-scrub.mp4', OCTETS[2], { hd: fArrivee })); }); };
    // le voile couvre la scène pendant le chargement : inutile d'attendre l'image de la porte pour lancer le film léger, les deux partent ensemble
    const im = new Image(); im.src = `assets/hero-poster${M}.jpg`; go();
    scene.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; reveille(); }, { passive: true });
    scene.addEventListener('pointerleave', () => { mx = 0; my = 0; reveille(); });
    new IntersectionObserver((es) => { surEcran = es[0].isIntersecting; if (surEcran) { sale = true; reveille(); } else majPlan(shown * S_TOTAL); }).observe(section);
    addEventListener('resize', mesure); mesure();
    return true;
  }

  return {
    pret() { return initOnce(); },
    arme() { if (arme) return; arme = true; verrouille(); bandes.forEach((b) => { b.op = -1; b.k = -1; }); addEventListener('scroll', onScroll, { passive: true }); mesure(); onScroll(); reveille(); },
    desarme() { if (!arme) return; arme = false; deverrouille(); removeEventListener('scroll', onScroll); if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } stations.forEach((st) => st.vids.forEach((v) => v.pause())); },
    allerA, recale, fondreVers, epingle, enMarche: () => arme,
    debug: () => ({ shown: +shown.toFixed(4), s: Math.round(shown * S_TOTAL), S_TOTAL, F, murs: stations.map((st) => `${D.ailes[st.k].id}:${st.zc.querySelectorAll('.cadre').length}${st.cote < 0 ? 'G' : 'D'}@${Math.round(st.p0)}`), tFilm: +vFilm.currentTime.toFixed(2), tMarche: +vMarche.currentTime.toFixed(2) }),
  };
})();

/* ------------------------------------------------------------------ */
/* MODE : les cinq portes du héros fixe, tenues en direct               */
const Mode = (() => {
  const GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)',
  ];
  let sansGL = false;
  // ESSAI : avec ?couloir=1 dans l'adresse, le couloir s'ouvre aussi sur téléphone (seuls "animations réduites" et l'économie de données gardent l'entrée fixe)
  let essai = false; try { if (/[?&]couloir=1/.test(location.search)) sessionStorage.setItem('couloir', '1'); if (/[?&]couloir=0/.test(location.search)) sessionStorage.removeItem('couloir'); essai = sessionStorage.getItem('couloir') === '1'; } catch (e) {}
  const econome = () => !!(navigator.connection && navigator.connection.saveData);
  function applique() {
    const fixe = sansGL || (essai ? (matchMedia('(prefers-reduced-motion: reduce)').matches || econome()) : GATES.some((q) => matchMedia(q).matches));
    if (!fixe && Balade.pret()) { root.classList.add('js3d'); Balade.arme(); }
    else { root.classList.remove('js3d'); Balade.desarme(); }
  }
  const MQLS = GATES.map((q) => matchMedia(q)); MQLS.forEach((m) => m.addEventListener('change', applique));
  return { applique, sansGL() { sansGL = true; applique(); } };
})();

/* ------------------------------------------------------------------ */
/* FICHE PROJET                                                         */
const Fiche = (() => {
  const dlg = $('#fiche'); const media = $('.fiche-media', dlg); const rangee = $('.fiche-rangee', dlg); let courant = null, retour = null;
  function remplit(p) {
    courant = p; const a = aile(p.cat);
    $('.fiche-aile', dlg).textContent = a.nom; $('#fiche-titre').textContent = p.title; $('.fiche-ligne', dlg).textContent = p.ligne; $('.fiche-technique', dlg).textContent = a.technique;
    const lien = $('.fiche-lien', dlg); lien.textContent = '';
    if (p.url) { const l = document.createElement('a'); l.href = p.url; l.target = '_blank'; l.rel = 'noopener'; l.textContent = 'Voir le site en ligne'; lien.appendChild(l); }
    media.textContent = ''; media.classList.toggle('long', p.type === 'site');
    if (p.type === 'video') { const v = document.createElement('video'); v.controls = true; v.playsInline = true; v.preload = 'metadata'; v.poster = src(p, '-poster.jpg'); v.style.aspectRatio = String(p.ratio || 0.5625); v.src = src(p, '.mp4'); media.appendChild(v); }
    else { const im = document.createElement('img'); im.alt = `${p.title}, ${p.ligne}`; im.src = src(p, '-f.jpg'); media.appendChild(im); }
    rangee.textContent = '';
    parAile(p.cat).forEach((q) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', q.title); if (q === p) b.setAttribute('aria-current', 'true'); const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.src = src(q, '-m.jpg'); b.appendChild(im); b.addEventListener('click', () => remplit(q)); rangee.appendChild(b); });
    const cur = $('[aria-current=true]', rangee); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function pas(d) { const l = parAile(courant.cat); remplit(l[(l.indexOf(courant) + d + l.length) % l.length]); }
  $('.fiche-fermer', dlg).addEventListener('click', () => dlg.close());
  $$('[data-pas]', dlg).forEach((b) => b.addEventListener('click', () => pas(+b.dataset.pas)));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => { if (e.target.tagName === 'VIDEO') return; if (e.key === 'ArrowRight') pas(1); if (e.key === 'ArrowLeft') pas(-1); });
  dlg.addEventListener('close', () => { if (dlg.open) return; media.textContent = ''; if (retour && retour.focus) retour.focus(); });   // fermer puis rouvrir très vite : on ne vide pas la nouvelle fiche
  return { ouvre(p) { retour = document.activeElement; remplit(p); if (!dlg.open) dlg.showModal(); } };
})();

/* ------------------------------------------------------------------ */
/* INDEX : les galeries par métier                                      */
(() => {
  const zone = $('.galeries');
  // Sur téléphone la barre du haut n'a pas la place pour les ailes : on les remet ici, en pastilles
  const sauts = document.createElement('nav'); sauts.className = 'sauts'; sauts.setAttribute('aria-label', 'Aller à un métier');
  D.ailes.forEach((a) => { if (!parAile(a.id).length) return; const l = document.createElement('a'); l.href = `#g-${a.id}`; l.textContent = a.court; sauts.appendChild(l); });
  zone.before(sauts);
  D.ailes.forEach((a) => {
    const liste = parAile(a.id); if (!liste.length) return;
    const g = document.createElement('section'); g.className = 'galerie'; g.id = `g-${a.id}`;
    const tete = document.createElement('div'); tete.className = 'galerie-tete';
    const h = document.createElement('h3'); h.textContent = a.nom; const s = document.createElement('p'); s.textContent = a.sous; const c = document.createElement('span'); c.className = 'compte'; c.textContent = `${liste.length} pièce${liste.length > 1 ? 's' : ''}`;
    tete.append(h, s, c);
    const nbHaut = liste.filter((p) => (p.ratio || 1.7) < 0.9).length; const r = document.createElement('div'); r.className = 'rangee' + (nbHaut > 0 && nbHaut < liste.length ? ' mixte' : '');
    liste.forEach((p) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vignette' + (p.type === 'video' ? ' video' : '') + ((p.ratio || 1.7) < 0.9 ? ' haut' : ''); const im = document.createElement('img'); im.loading = 'lazy'; im.decoding = 'async'; im.alt = ''; vignette(im, p); b.setAttribute('aria-label', `Ouvrir : ${p.title}`); b.appendChild(im); b.addEventListener('click', () => Fiche.ouvre(p)); r.appendChild(b); });
    r.dataset.n = liste.length; g.append(tete, r); zone.appendChild(g);
  });
  const colonnes = (nb) => { const max = innerWidth >= 1100 ? 5 : innerWidth >= 860 ? 4 : 3; if (nb <= max) return max; for (let c = max; c >= 3; c--) { const reste = nb % c; if (reste === 0 || reste >= c - 1) return c; } return max; };
  const regle = () => $$('.rangee', zone).forEach((r) => r.style.setProperty('--cols', colonnes(+r.dataset.n)));
  addEventListener('resize', regle); regle();
})();

/* Navigation : en 3D les liens mènent aux ailes du couloir, sinon aux galeries */
$$('.nav-ailes a').forEach((a, k) => a.addEventListener('click', (e) => { if (Balade.enMarche()) { e.preventDefault(); Balade.allerA(k); } }));

/* Les liens internes qui mènent loin passent par le rideau, au lieu de dérouler tout le couloir en accéléré */
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = e.target.closest("a[href^=\"#\"]"); if (!a) return; const cible = document.getElementById(a.getAttribute("href").slice(1)); if (!cible) return;
  const y = () => Math.max(0, cible.getBoundingClientRect().top + scrollY - (cible.id === "haut" ? 0 : 70));
  if (Math.abs(y() - scrollY) < innerHeight * 1.5) return;
  e.preventDefault(); if (Balade.epingle()) Balade.fondreVers(y, null, true); else Rideau.vers(y, () => Balade.recale());
});

/* Apparitions des sections, puis retrait des délais pour que les survols ne traînent pas */
(() => {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); setTimeout(() => e.target.classList.add('fini'), 1700); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.bloc').forEach((b) => io.observe(b));
  const vie = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('vivant', e.isIntersecting)), { threshold: 0.05 });
  $$('.bloc').forEach((b) => vie.observe(b));
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));
})();

/* Formulaire : le message part sur WhatsApp, rien n'est stocké ici */
(() => {
  const form = $('#form-contact'); const retour = $('.retour', form);
  // dès qu'on corrige un champ, son alerte s'efface
  form.addEventListener('input', (e) => { const c = e.target.closest('.champ'); if (c && c.classList.contains('erreur') && String(e.target.value || '').trim()) { c.classList.remove('erreur'); e.target.setAttribute('aria-invalid', 'false'); if (!$('.champ.erreur', form)) retour.textContent = ''; } });
  form.addEventListener('submit', (e) => {
    e.preventDefault(); const f = new FormData(form); let ok = true;
    for (const nom of ['prenom', 'message']) { const champ = form.elements[nom]; const vide = !String(f.get(nom) || '').trim(); champ.closest('.champ').classList.toggle('erreur', vide); champ.setAttribute('aria-invalid', vide ? 'true' : 'false'); if (vide && ok) { champ.focus(); ok = false; } }
    if (!ok) { retour.textContent = 'Il me faut au moins ton prénom et quelques mots sur ton projet.'; return; }
    const besoins = f.getAll('besoin'); const lignes = [`Salut Louis, c'est ${String(f.get('prenom')).trim()}.`];
    if (besoins.length) lignes.push(`Il me faut : ${besoins.join(', ')}.`);
    if (String(f.get('lien') || '').trim()) lignes.push(`Mon lien : ${String(f.get('lien')).trim()}`);
    if (String(f.get('quand') || '').trim()) lignes.push(`C'est pour : ${String(f.get('quand')).trim()}`);
    lignes.push('', String(f.get('message')).trim());
    const url = `https://wa.me/${WA}?text=${encodeURIComponent(lignes.join('\n'))}`;
    const w = window.open(url, '_blank'); if (w) w.opener = null;
    retour.textContent = w === null ? 'WhatsApp ne s’est pas ouvert ? Écris-moi au +33 7 61 47 95 85.' : 'WhatsApp s’ouvre avec ton message tout prêt. Il ne te reste qu’à appuyer sur envoyer.';
  });
})();

$('#annee').textContent = new Date().getFullYear();
window.__PL = { Balade, Mode };
Mode.applique();
})();
