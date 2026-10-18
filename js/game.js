/* Magic 8: the toy. Ask a question (or don't), shake the ball, and Teddy or Tommy answers.
   Flow of one question:
     shake   - the answering brother steps up and shakes the ball (longer if you keep dragging it)
     reveal  - he steps back, the ball turns its window to you, the triangle floats up
     react   - yes: his signature move + confetti; maybe: a shrug or head scratch; no: a playful head shake
   One brother is on stage at a time. In 'both' they take turns: after each answer he waves and runs off, and the
   other runs in for the next question.
   The companion (the brother who isn't on stage, Kit.roster.buddyFor) comes when you call him: he gives a second
   opinion, does his signature move, hands over a treat and waves bye. Call him as often as you like.
   Test hooks for the Browser pane are at the bottom (window.magic8). */
(function () {
  'use strict';
  const T = THREE;
  const M8 = window.M8;
  const Kit = window.Kit;
  const ANSWERS = window.M8Answers;
  const { rand, pick } = Kit.gfx;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('magic8.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('magic8.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };

  const TITLE = window.M8_TITLE || 'Magic 8';
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const nice = (name) => name[0] + name.slice(1).toLowerCase();
  const R = 1; // ball radius

  // ---------------------------------------------------------------- renderer, scene, camera
  const canvas = $('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 120);

  function skyTexture() {
    const [c, g] = Kit.gfx.makeCanvas(8, 512);
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#120a35');
    gr.addColorStop(0.45, '#2b1c6e');
    gr.addColorStop(0.78, '#55328f');
    gr.addColorStop(1, '#7a4396');
    g.fillStyle = gr;
    g.fillRect(0, 0, 8, 512);
    return Kit.gfx.toTexture(c);
  }
  scene.background = skyTexture();

  scene.add(new T.HemisphereLight('#e2d6ff', '#3a2552', 0.85));
  const key = new T.DirectionalLight('#fff1dc', 1.05);
  key.position.set(-4, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rimLight = new T.DirectionalLight('#9fc0ff', 0.4);
  rimLight.position.set(5, 4, -6);
  scene.add(rimLight);

  // ---------------------------------------------------------------- the stage
  function rugTexture() {
    const [c, g] = Kit.gfx.makeCanvas(512, 512);
    g.fillStyle = '#3a2370';
    g.fillRect(0, 0, 512, 512);
    const ring = (r, w, col) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.arc(256, 256, r, 0, Math.PI * 2);
      g.stroke();
    };
    ring(246, 12, '#ffcf4a');
    ring(226, 4, '#ffcf4a');
    ring(150, 3, 'rgba(255,207,74,0.6)');
    g.fillStyle = '#ffcf4a';
    const star = (x, y, r) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      star(256 + Math.cos(a) * 188, 256 + Math.sin(a) * 188, i % 2 ? 9 : 14);
    }
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2), r = rand(20, 140);
      g.beginPath();
      g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, rand(1.5, 3.5), 0, Math.PI * 2);
      g.fill();
    }
    return Kit.gfx.toTexture(c);
  }

  const floor = new T.Mesh(new T.CircleGeometry(40, 48), Kit.gfx.std('#2a1a52', { roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const rug = new T.Mesh(new T.CircleGeometry(3.9, 64), Kit.gfx.std('#ffffff', { map: rugTexture(), roughness: 0.9 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.006;
  rug.receiveShadow = true;
  scene.add(rug);

  // pedestal: a purple column with gold rings, and a gold ring cup the ball sits in
  const pedestal = new T.Group();
  scene.add(pedestal);
  const gold = Kit.gfx.std('#ffc93a', { roughness: 0.3, metalness: 0.6 });
  const column = new T.Mesh(new T.CylinderGeometry(0.36, 0.5, 1, 32), Kit.gfx.std('#5b3aa8', { roughness: 0.55 }));
  column.castShadow = column.receiveShadow = true;
  pedestal.add(column);
  const base = new T.Mesh(new T.CylinderGeometry(0.75, 0.85, 0.16, 40), Kit.gfx.std('#4a2d8f', { roughness: 0.6 }));
  base.position.y = 0.08;
  base.castShadow = base.receiveShadow = true;
  pedestal.add(base);
  const baseRing = new T.Mesh(new T.TorusGeometry(0.78, 0.04, 10, 48), gold);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.16;
  pedestal.add(baseRing);
  const cup = new T.Mesh(new T.TorusGeometry(0.55, 0.075, 14, 56), gold);
  cup.rotation.x = Math.PI / 2;
  cup.castShadow = true;
  pedestal.add(cup);

  // twinkling stars and a moon in the sky
  const stars = [];
  for (let i = 0; i < 70; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.dotTexture(), color: Math.random() < 0.25 ? '#ffe28a' : '#ffffff', transparent: true, depthWrite: false }));
    s.position.set(rand(-22, 22), rand(3, 16), rand(-26, -18));
    s.scale.setScalar(rand(0.12, 0.34));
    scene.add(s);
    stars.push({ s, ph: rand(0, 6), sp: rand(1, 3) });
  }
  const moon = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.emojiTexture('🌙'), transparent: true, depthWrite: false }));
  moon.scale.setScalar(3);
  moon.position.set(9, 10, -24);
  scene.add(moon);

  // ---------------------------------------------------------------- the ball and effects
  const ball = M8.makeBall(renderer);
  scene.add(ball.root);
  const fx = {
    flyers: new M8.Flyers(scene),
    sparkles: new M8.Sparkles(scene),
    confetti: new M8.Confetti($('confetti')),
    court: new M8.Court(scene),
  };
  fx.court.onSwish = (rim) => {
    fx.sparkles.burst(rim, 0.3, 26, ['#ff9f1c', '#ffd400', '#ffffff']);
    fx.flyers.add('✨', rim.x, rim.y + 0.3, rim.z + 0.2, 0, 1.2, 0.6, 0.8);
    toast('SWISH!');
  };

  // ---------------------------------------------------------------- the brothers
  const thumbs = Kit.portraits([Kit.roster.get('teddy'), Kit.roster.get('tommy')], { size: 152 });
  const stage = { teddy: M8.makeActor(scene, fx), tommy: M8.makeActor(scene, fx) };
  const buddyActor = M8.makeActor(scene, fx); // the companion who runs in when one brother answers alone
  let buddyBuiltFor = null;

  // Where everyone stands. Set by layout() for the screen's shape.
  const L = { portrait: false, ballY: 1.7, left: { x: -2.35, z: 0.35 }, right: { x: 2.35, z: 0.35 }, offX: 7, camZ: 12 };

  const G = {
    who: store.get('who', 'teddy'), // 'teddy' | 'tommy' | 'both'
    pendingWho: null,
    turn: 0, // in 'both' mode: whose turn (even: Teddy, odd: Tommy)
    star: 'teddy', // the brother on stage
    swapAt: null, // 'both': when (G.time) the brothers swap after an answer
    state: 'idle', // idle | shaking | revealing | shown
    q: null, // the question in progress
    last: null, // the last answered question
    recent: [],
    idleT: 0,
    time: 0,
    held: false,
    counts: { yes: { teddy: 0, tommy: 0 }, maybe: 0, no: 0 },
    asked: 0,
    history: store.get('history', []),
  };
  if (!['teddy', 'tommy', 'both'].includes(G.who)) G.who = 'teddy';

  const answererNext = () => (G.who === 'both' ? (G.turn % 2 ? 'tommy' : 'teddy') : G.who);
  // the companion is always the brother who isn't on stage
  const companionId = () => Kit.roster.buddyFor(G.star);

  // The companion's model, rebuilt only when he changes (and never mid-visit).
  function buildBuddy() {
    const bid = companionId();
    if (buddyBuiltFor === bid || buddyActor.visible) return;
    const e = Kit.roster.get(bid);
    buddyActor.set(e, e.buddyScale || 0.8, true);
    buddyBuiltFor = bid;
  }

  // Put the brother whose turn it is on stage.
  function applyWho() {
    dismissVisit();
    G.swapAt = null;
    G.star = answererNext();
    for (const id of ['teddy', 'tommy']) {
      const a = stage[id];
      a.visible = id === G.star;
      if (!a.visible) continue;
      a.set(Kit.roster.get(id), 1, false);
      a.place(L.left.x, L.left.z);
      a.look(0, L.camZ);
    }
    buildBuddy();
    if (G.last && G.last.who !== G.star && G.who !== 'both') G.last = null;
    refreshUI();
  }

  // 'both': the brother on stage waves and runs off, and the one whose turn it is runs in.
  function swapBrothers() {
    G.swapAt = null;
    const next = answererNext();
    if (next === G.star) return null;
    const out = stage[G.star], inn = stage[next];
    out.play('wave', 3);
    out.look(null);
    out.moveTo(-L.offX, out.z, 5, () => { out.visible = false; });
    if (!inn.person || inn.entry.id !== next) inn.set(Kit.roster.get(next), 1, false);
    inn.visible = true;
    inn.place(-L.offX, L.left.z + 0.7); // a lane nearer the camera, so they pass each other
    inn.play('idle', 0);
    inn.look(0, L.camZ);
    inn.moveTo(L.left.x, L.left.z, 5.5, () => {
      inn.play(Kit.roster.signature(inn.entry, 'hello'), 1.5);
      inn.emote('👋', 1.2);
    });
    G.star = next;
    buildBuddy();
    M8.sfx.whoosh();
    refreshUI();
    return inn;
  }

  function setWho(w, fromUser) {
    if (!['teddy', 'tommy', 'both'].includes(w)) return;
    if (G.state === 'shaking' || G.state === 'revealing') {
      G.pendingWho = w;
      refreshUI(w);
      return;
    }
    const changed = w !== G.who;
    G.who = w;
    G.pendingWho = null;
    store.set('who', w);
    if (!changed && fromUser) return;
    G.turn = 0;
    applyWho();
    if (fromUser) {
      M8.sfx.whoosh();
      for (const id of ['teddy', 'tommy']) {
        const a = stage[id];
        if (!a.visible) continue;
        fx.sparkles.burst(a.head(), 0.5, 18, ['#ffffff', '#b48cff', '#5fe3ff']);
        a.play(Kit.roster.signature(a.entry, 'hello'), 1.6);
      }
    }
  }

  // ---------------------------------------------------------------- layout
  const view = { W: 1, H: 1, top: 0, bottom: 0, base: new T.Vector3(), look: new T.Vector3(), zoom: 1 };

  function layout() {
    const W = window.innerWidth, H = window.innerHeight;
    if (!W || !H) return; // the pane can be hidden at boot
    view.W = W;
    view.H = H;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    fx.confetti.resize();
    const portrait = W / H < 0.95;
    document.body.classList.toggle('portrait', portrait);
    L.portrait = portrait;
    const topEl = $('top').getBoundingClientRect(), botEl = $('bottom').getBoundingClientRect();
    let top = topEl.bottom + 6, bottom = H - botEl.top + 6;
    // portrait: keep a strip under the header for the speech bubble
    $('bubbles').style.top = topEl.bottom + 6 + 'px';
    if (portrait) top += Math.min(110, H * 0.13);
    view.top = top;
    view.bottom = bottom;

    L.ballY = 1.7;
    if (portrait) {
      L.left = { x: -1.55, z: 0.8 };
      L.right = { x: 1.55, z: 0.8 };
    } else {
      L.left = { x: -2.35, z: 0.35 };
      L.right = { x: 2.35, z: 0.35 };
    }
    const frame = portrait ? { w: 5.1, y0: -0.2, y1: 3.9 } : { w: 7.0, y0: -0.2, y1: 4.0 };
    const tanH = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const freeH = Math.max(0.3, (H - top - bottom) / H);
    const fh = frame.y1 - frame.y0;
    const d = Math.max(fh / (2 * tanH * freeH), frame.w / (2 * tanH * (W / H))) + 0.6;
    const cy = (frame.y0 + frame.y1) / 2;
    view.base.set(0, cy + d * 0.1, d);
    view.look.set(0, cy, 0);
    L.camZ = d;
    L.offX = (frame.w / 2) * 1.25 + 1.2;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, 0, -(top - bottom) / 2, W, H);
    camera.updateProjectionMatrix();

    ball.root.position.set(0, L.ballY, 0);
    const colH = L.ballY - R * 0.84;
    column.scale.y = colH;
    column.position.y = colH / 2;
    cup.position.y = colH;
    fx.court.place(0, L.ballY + R + 0.75, 0.2);

    // keep everyone on their marks
    const star = stage[G.star];
    if (G.state !== 'shaking' && G.state !== 'revealing' && star.visible && !star.moving) star.place(L.left.x, L.left.z);
    if (visit.on && !visit.leaving && !buddyActor.moving) buddyActor.place(L.right.x, L.right.z);
    for (const a of [stage.teddy, stage.tommy, buddyActor]) a.look(0, L.camZ);
  }

  // ---------------------------------------------------------------- asking
  function pickAnswer(who, mood, i) {
    const set = ANSWERS[who] || ANSWERS.teddy;
    const lists = { yes: set.yes || [], maybe: set.maybe || [], no: set.no || [] };
    if (!lists[mood] || !lists[mood].length) mood = null;
    if (!mood) {
      const total = lists.yes.length + lists.maybe.length + lists.no.length;
      let r = Math.random() * total;
      mood = r < lists.yes.length ? 'yes' : (r -= lists.yes.length) < lists.maybe.length ? 'maybe' : 'no';
    }
    const list = lists[mood].length ? lists[mood] : ['Ask again!'];
    let text = list[0];
    if (i !== undefined) text = list[((i % list.length) + list.length) % list.length];
    else {
      for (let k = 0; k < 12; k++) {
        text = pick(list);
        if (!G.recent.includes(text)) break;
      }
    }
    G.recent.push(text);
    if (G.recent.length > 5) G.recent.shift();
    return { text, mood };
  }

  // the spot next to the ball (on his side of it) where he can reach it
  function shakeSpot() {
    const hx = L.left.x, hz = L.left.z, d = Math.hypot(hx, hz) || 1, r = R + 0.6;
    return { x: (hx / d) * r, z: (hz / d) * r };
  }

  function ask(text, opts = {}) {
    if (G.state === 'revealing') {
      if (!G.q.reacted) return false;
      finish(G.q);
    }
    if (G.state === 'shaking') {
      // more shaking!
      G.q.extra = Math.min(G.q.extra + 0.45, 2);
      ball.jolt(0.6);
      return false;
    }
    if (G.pendingWho) setWho(G.pendingWho);
    // 'both': if it's the other brother's turn and they haven't swapped yet, swap now
    if (G.who === 'both' && answererNext() !== G.star) {
      if (visit.on && visit.id === answererNext()) poofVisit();
      swapBrothers();
    }
    const who = G.star;
    const a = stage[who];
    const ans = pickAnswer(who, opts.mood, opts.i);
    const qText = String(text || '').trim().slice(0, 80);
    G.q = { t: 0, who, a, entry: Kit.roster.get(who), text: qText, answer: ans.text, mood: ans.mood, shakeFor: opts.quick ? 0.6 : 1.6, extra: 0, holding: !!opts.holding, released: 0, slosh: 0 };
    G.state = 'shaking';
    G.asked++;
    M8.voice.prepare(ans.text, who);
    $('q').value = '';
    $('q').blur();
    $('hint').classList.add('gone');
    hideBubble('answer');
    ball.shake(true);
    M8.voice.stop();
    const spot = shakeSpot();
    const far = Math.hypot(spot.x - a.x, spot.z - a.z);
    const speed = far > 1.5 ? 5.5 : 2.2; // still running in from the side: keep running
    G.q.shakeFor = Math.max(G.q.shakeFor, far / (speed * a.scale) + 0.8);
    a.play('idle', 0);
    a.moveTo(spot.x, spot.z, speed, () => a.play('shake', 30));
    a.look(0, 0);
    // everyone else watches the ball
    for (const o of [stage.teddy, stage.tommy, buddyActor]) {
      if (o !== a && o.visible && !o.moving) o.look(0, 0);
    }
    if (qText) showAsked(qText);
    refreshUI();
    return true;
  }

  function flow(dt) {
    const q = G.q;
    if (!q) return;
    q.t += dt;
    if (G.state === 'shaking') {
      q.slosh -= dt;
      if (q.slosh <= 0) {
        q.slosh = 0.19;
        M8.sfx.slosh();
      }
      const until = q.holding ? Infinity : Math.max(q.shakeFor + q.extra, q.released + 0.45);
      if (q.t >= Math.min(until, 9)) {
        ball.shake(false);
        G.state = 'revealing';
        q.t0 = q.t;
        q.a.play('watch', 3.2);
        q.a.moveTo(L.left.x, L.left.z, 2.2);
        q.a.look(0, L.camZ * 0.4);
      }
      return;
    }
    if (G.state === 'revealing') {
      const u = q.t - q.t0;
      if (!q.revealed && u > 0.55) {
        q.revealed = true;
        ball.reveal(q.answer, q.mood);
        M8.sfx.reveal();
        fx.sparkles.burst(ball.centre(), R * 0.9, 30, ['#7fa0ff', '#ffffff', '#b48cff']);
      }
      if (!q.reacted && u > 1.65) {
        q.reacted = true;
        react(q);
      }
      if (u > 3.6) finish(q);
    }
  }

  function react(q) {
    const a = q.a, who = q.who;
    a.look(0, L.camZ);
    if (q.mood === 'yes') {
      const n = G.counts.yes[who]++;
      const pose = Kit.roster.signature(q.entry, n % 2 ? 'goodbye' : 'hello'); // Teddy: boxing, then the jump shot
      a.play(pose, pose === 'jumpshot' ? 1.9 : 2.1);
      M8.sfx.yes();
      const c = toScreen(ball.centre());
      fx.confetti.burst(c.x, c.y - view.H * 0.05, 150);
      fx.sparkles.burst(ball.centre(), R * 1.05, 40, ['#ffd400', '#ffffff', '#ff8fb8', '#5fe3ff']);
    } else if (q.mood === 'maybe') {
      const pose = G.counts.maybe++ % 2 ? 'shrug' : 'think';
      a.play(pose, 2.4);
      a.emote(pose === 'think' ? '🤔' : '❓', 2.3);
      M8.sfx.maybe();
    } else {
      const pose = G.counts.no++ % 2 ? 'folded' : 'nope';
      a.play(pose, 2.2);
      a.emote(pick(['🙅', '😜']), 2.1);
      M8.sfx.no();
    }
    showBubble('answer', q.entry, q.answer, q.mood, q.text);
    M8.voice.say(q.answer, who);
    addHistory({ who, q: q.text, a: q.answer, mood: q.mood, ops: [] });
  }

  function finish(q) {
    G.state = 'shown';
    G.last = q;
    G.q = null;
    G.idleT = 0;
    if (G.who === 'both') {
      G.turn++;
      G.swapAt = G.time + 1.8; // let the answer sink in, then swap (after any second-opinion visit)
    }
    if (G.pendingWho) setWho(G.pendingWho);
    refreshUI();
  }

  // ---------------------------------------------------------------- the companion's visit
  // Times (seconds into his visit) for each beat of it.
  const V = { opinion: 1.4, sig: 3.0, give: 4.8, toss: 5.15, bye: 7.9, leave: 9.6 };
  const visit = { on: false, t: 0, id: null, a: null, said: false, sig: false, giving: false, tossed: false, bye: false, leaving: false };
  const flights = [];

  function callBuddy() {
    M8.sfx.click();
    // the brothers swapped while he was on his way out: this call is for the other one
    if (visit.on && visit.id !== companionId()) dismissVisit();
    if (!visit.on) return summon();
    // tapped again while he's here: another opinion and another treat
    const a = visit.a;
    Object.assign(visit, { t: V.opinion - 0.35, said: false, sig: false, giving: false, tossed: false, bye: false });
    if (visit.leaving) {
      a.play('idle', 0);
      a.moveTo(L.right.x, L.right.z, 5.5);
      visit.t = 0.4;
    }
    visit.leaving = false;
    a.emote('😃', 1);
    toast(`${visit.e.name} AGAIN!`);
    return 'again';
  }

  // He runs in from the right, at his smaller buddy size, with a name tag.
  function summon() {
    buildBuddy();
    const id = companionId();
    const e = Kit.roster.get(id);
    Object.assign(visit, { on: true, t: 0, id, e, a: buddyActor, said: false, sig: false, giving: false, tossed: false, bye: false, leaving: false });
    buddyActor.visible = true;
    buddyActor.place(L.offX, L.right.z);
    buddyActor.play('idle', 0);
    buddyActor.moveTo(L.right.x, L.right.z, 5.5);
    toast(`${e.name}'S HERE!`);
    M8.sfx.arrive();
    refreshUI();
    return 'summoned';
  }

  function dismissVisit() {
    if (!visit.on) return;
    visit.on = false;
    buddyActor.visible = false;
    hideBubble('buddy');
    refreshUI();
  }

  // 'both': it's his turn to answer while he's visiting, so he vanishes in a puff of sparkles (his full-size self
  // runs in to take the turn)
  function poofVisit() {
    fx.sparkles.burst(buddyActor.head(), 0.4, 24, ['#ffffff', '#b48cff', '#ffd400']);
    M8.sfx.pop();
    dismissVisit();
  }

  function secondOpinion() {
    const e = visit.e;
    const lines = (ANSWERS.opinions && ANSWERS.opinions[e.id]) || {};
    const other = Kit.roster.get(Kit.roster.buddyFor(e.id));
    let line, mood = 'maybe';
    // he gives his opinion on the answer of the brother on stage; nothing to comment on yet: he cheers him on
    if (!G.last || G.last.who !== G.star) line = pick(lines.first && lines.first.length ? lines.first : ['Ask the ball something!']);
    else {
      const agree = Math.random() < 0.55;
      const list = (agree ? lines.agree : lines.disagree) || [];
      line = list.length ? pick(list) : agree ? 'I agree!' : 'I say something different!';
      mood = agree ? G.last.mood : 'other';
      visit.a.emote(agree ? '👍' : '🙃', 1.6);
      const h = G.history[0];
      if (h && h.a === G.last.answer) {
        h.ops = (h.ops || []).concat({ who: e.id, text: line.replace(/\{name\}/g, nice(other.name)) }).slice(-3);
        saveHistory();
      }
    }
    line = line.replace(/\{name\}/g, nice(other.name));
    showBubble('buddy', e, line, mood);
    M8.voice.say(line, e.id, true);
  }

  function updateVisit(dt) {
    if (!visit.on) return;
    const a = visit.a;
    const busy = G.state === 'shaking' || G.state === 'revealing';
    // he waits for the ball to answer before he gives his opinion
    if (!(busy && !visit.said && visit.t >= V.opinion - 0.05)) visit.t += dt;
    const t = visit.t, e = visit.e;
    const receiver = stage[G.star];
    if (!visit.leaving && !a.moving) {
      if (busy) a.look(0, 0); // watching the ball
      else if (visit.giving && !visit.bye) a.look(receiver.x, receiver.z);
      else a.look(0, L.camZ);
    }
    if (!visit.said && t >= V.opinion) {
      visit.said = true;
      a.look(0, 0);
      a.play('think', 0.9);
      secondOpinion();
    }
    if (!visit.sig && t >= V.sig) {
      visit.sig = true;
      const pose = Kit.roster.signature(e, 'hello');
      a.play(pose, pose === 'jumpshot' ? 1.8 : 1.7);
    }
    if (!visit.giving && t >= V.give) {
      visit.giving = true;
      a.play('give', 0.75);
    }
    if (!visit.tossed && t >= V.toss) {
      visit.tossed = true;
      giveTreat(a, receiver);
    }
    if (!visit.bye && t >= V.bye) {
      visit.bye = true;
      const pose = Kit.roster.signature(e, 'goodbye');
      a.play(pose, pose === 'jumpshot' ? 1.8 : 1.6);
    }
    if (!visit.leaving && t >= V.leave) {
      visit.leaving = true;
      a.play('wave', 4);
      a.moveTo(L.offX, a.z, 5, () => dismissVisit());
    }
  }

  // a treat arcs from his hand into the other brother's hand
  function giveTreat(from, to) {
    const [emoji, label] = pick(TREATS);
    const s = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.emojiTexture(emoji), transparent: true, depthWrite: false }));
    s.renderOrder = 8;
    s.scale.setScalar(0.6);
    scene.add(s);
    const side = to.x < from.x ? -1 : 1; // the hand nearer the giver (he faces the camera)
    flights.push({ s, from: from.hand(1).add(new T.Vector3(0, 0, 0.3)), to, side, k: 0, emoji });
    toast(`${emoji} ${label} FROM ${visit.e.name}!`);
    M8.sfx.treat();
  }

  const tmpV = new T.Vector3();
  function updateFlights(dt) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.k = Math.min(1, f.k + dt / 0.6);
      f.to.hand(f.side, tmpV).z += 0.3;
      f.s.position.lerpVectors(f.from, tmpV, f.k);
      f.s.position.y += Math.sin(f.k * Math.PI) * 1.6;
      f.s.position.z += Math.sin(f.k * Math.PI) * 0.9;
      f.s.material.rotation = f.k * Math.PI * 2;
      if (f.k >= 1) {
        scene.remove(f.s);
        f.s.material.dispose();
        flights.splice(i, 1);
        if (f.to.visible) {
          f.to.hold(f.emoji, f.side);
          if (!f.to.busy) f.to.play('cheer', 0.8);
          fx.sparkles.burst(tmpV, 0.2, 12, ['#ffffff', '#ffd400']);
        }
      }
    }
  }

  // ---------------------------------------------------------------- UI: bubbles, toasts, history, buttons
  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 1300);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  }

  const bubbleTimers = {};
  // kind: 'answer' (the answering brother) or 'buddy' (the companion's second opinion)
  function showBubble(kind, entry, text, mood, asked) {
    const id = kind === 'answer' ? 'ansBubble' : 'budBubble';
    let el = $(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      $('bubbles').appendChild(el);
    }
    const side = actorFor(entry.id).x < 0 ? 'left' : 'right';
    el.className = `bubble ${kind} ${side} mood-${mood}`;
    el.innerHTML = '';
    const img = document.createElement('img');
    img.alt = '';
    img.src = thumbs[entry.id];
    img.className = 'face';
    const words = document.createElement('div');
    words.className = 'words';
    if (asked) {
      const sm = document.createElement('small');
      sm.setAttribute('data-no-lang', ''); // the question as the kids typed it, in any language
      sm.textContent = `“${asked}”`;
      words.appendChild(sm);
    }
    const b = document.createElement('b');
    b.textContent = entry.name;
    const span = document.createElement('span');
    span.className = 'text';
    span.textContent = text;
    words.append(b, span);
    el.append(img, words);
    if (kind === 'buddy') $('bubbles').appendChild(el); // under the answer
    clearTimeout(bubbleTimers[kind]);
    if (kind === 'buddy') bubbleTimers[kind] = setTimeout(() => hideBubble('buddy'), 5200);
    $('bubbles').classList.toggle('two', !!($('ansBubble') && $('budBubble')));
  }
  function hideBubble(kind) {
    const el = $(kind === 'answer' ? 'ansBubble' : 'budBubble');
    if (el) el.remove();
    $('bubbles').classList.toggle('two', !!($('ansBubble') && $('budBubble')));
  }
  // the question, briefly, while the ball shakes
  function showAsked(text) {
    const el = document.createElement('div');
    el.className = 'asked';
    el.setAttribute('data-no-lang', ''); // as typed
    el.textContent = `“${text}”`;
    $('bubbles').prepend(el);
    setTimeout(() => el.remove(), 2600);
  }
  const actorFor = (id) => (visit.on && visit.id === id ? buddyActor : stage[id]);

  function addHistory(h) {
    G.history.unshift(h);
    G.history.length = Math.min(G.history.length, 8);
    saveHistory();
  }
  function saveHistory() {
    store.set('history', G.history);
    renderHistory();
  }
  function renderHistory() {
    const ol = $('histList');
    ol.innerHTML = '';
    if (!G.history.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Nothing yet. Ask the ball something!';
      ol.appendChild(li);
    }
    for (const h of G.history) {
      const li = document.createElement('li');
      li.className = 'mood-' + h.mood;
      const img = document.createElement('img');
      img.alt = '';
      img.src = thumbs[h.who] || '';
      const box = document.createElement('div');
      const q = document.createElement('small');
      if (h.q) q.setAttribute('data-no-lang', ''); // as typed
      q.textContent = h.q ? `“${h.q}”` : '🤫 a secret question';
      const a = document.createElement('b');
      a.textContent = h.a;
      box.append(q, a);
      for (const o of h.ops || []) {
        const op = document.createElement('i');
        const e = Kit.roster.get(o.who);
        op.textContent = `${e ? nice(e.name) : ''}: ${o.text}`;
        box.appendChild(op);
      }
      li.append(img, box);
      ol.appendChild(li);
    }
    const n = $('histCount');
    n.textContent = G.history.length || '';
    n.classList.toggle('hidden', !G.history.length);
  }
  function toggleHistory(force) {
    const on = force !== undefined ? force : $('history').classList.contains('hidden');
    $('history').classList.toggle('hidden', !on);
    $('histBtn').classList.toggle('on', on);
  }

  function refreshUI(shownWho) {
    const w = shownWho || G.pendingWho || G.who;
    for (const b of document.querySelectorAll('#who button')) {
      const on = b.dataset.who === w;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    const cid = companionId();
    const ce = Kit.roster.get(cid);
    $('buddyFace').src = thumbs[cid];
    $('buddyName').textContent = ce.name;
    $('buddyBtn').title = `Call ${nice(ce.name)} for a second opinion (T)`;
    $('buddyBtn').setAttribute('aria-label', `Call ${nice(ce.name)}`);
    $('buddyBtn').classList.toggle('here', visit.on);
    $('buddyKey').textContent = nice(ce.name);
    const next = Kit.roster.get(answererNext());
    $('turn').textContent = G.who === 'both' ? `${nice(next.name)}'s turn` : '';
    $('muteBtn').textContent = Kit.sound.isMuted() ? '🔇' : '🔊';
    $('muteBtn').setAttribute('aria-pressed', Kit.sound.isMuted() ? 'true' : 'false');
  }

  function toggleMute() {
    Kit.sound.init();
    const m = Kit.sound.toggleMute();
    if (m) M8.voice.stop();
    refreshUI();
  }

  // ---------------------------------------------------------------- input
  let started = false;
  function gesture() {
    Kit.sound.init();
    M8.voice.unlock();
    started = true;
  }

  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  function rayAt(x, y) {
    ndc.set((x / view.W) * 2 - 1, -(y / view.H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray;
  }
  function toScreen(v) {
    const p = v.clone().project(camera);
    return { x: (p.x + 1) / 2 * view.W, y: (1 - p.y) / 2 * view.H };
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    gesture();
    const r = rayAt(e.clientX, e.clientY);
    if (ball.hit(r)) {
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, path: 0, t0: performance.now(), asked: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      ball.jolt(0.25);
      return;
    }
    for (const a of [buddyActor, stage.teddy, stage.tommy]) {
      if (a.hit(r)) return tapActor(a);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    drag.path += Math.hypot(dx, dy);
    // the ball follows your finger a little
    const perPx = (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * L.camZ) / view.H;
    const clamp = (v) => Math.max(-0.7, Math.min(0.7, v));
    ball.drag(clamp((e.clientX - drag.x0) * perPx), clamp(-(e.clientY - drag.y0) * perPx));
    ball.jolt(Math.min(0.25, Math.hypot(dx, dy) / 300));
    if (!drag.asked && drag.path > 50) {
      drag.asked = true;
      if (G.state === 'shaking') G.q.holding = true;
      else ask($('q').value, { quick: true, holding: true });
    }
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    ball.drag(0, 0);
    if (d.asked) {
      if (G.q && G.state === 'shaking') {
        G.q.holding = false;
        G.q.released = G.q.t;
      }
    } else if (d.path < 50) ask($('q').value);
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function tapActor(a) {
    if (a === buddyActor || (visit.on && visit.a === a)) return callBuddy();
    if (G.state === 'shaking' || G.state === 'revealing' || a.busy) return;
    a.play(Kit.roster.signature(a.entry, Math.random() < 0.5 ? 'hello' : 'goodbye'), 1.8);
    a.emote('👋', 1.2);
  }

  $('askBtn').addEventListener('click', (e) => {
    gesture();
    e.currentTarget.blur();
    ask($('q').value);
  });
  $('q').addEventListener('keydown', (e) => {
    gesture();
    if (e.key === 'Enter') {
      e.preventDefault();
      ask($('q').value);
    } else if (e.key === 'Escape') $('q').blur();
    e.stopPropagation();
  });
  $('buddyBtn').addEventListener('click', (e) => {
    gesture();
    e.currentTarget.blur();
    callBuddy();
  });
  $('muteBtn').addEventListener('click', (e) => {
    gesture();
    e.currentTarget.blur();
    toggleMute();
  });
  $('histBtn').addEventListener('click', (e) => {
    gesture();
    e.currentTarget.blur();
    toggleHistory();
  });
  $('histClose').addEventListener('click', () => toggleHistory(false));
  for (const b of document.querySelectorAll('#who button')) {
    b.addEventListener('click', (e) => {
      gesture();
      e.currentTarget.blur();
      M8.sfx.click();
      setWho(b.dataset.who, true);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    const onButton = e.target && e.target.tagName === 'BUTTON';
    gesture();
    switch (e.key) {
      case ' ':
      case 'Enter':
        if (onButton) return;
        e.preventDefault();
        ask($('q').value);
        break;
      case 't':
      case 'T':
        callBuddy();
        break;
      case 'm':
      case 'M':
        toggleMute();
        break;
      case 'h':
      case 'H':
        toggleHistory();
        break;
      case '1':
        setWho('teddy', true);
        break;
      case '2':
        setWho('both', true);
        break;
      case '3':
        setWho('tommy', true);
        break;
      case 'Escape':
        toggleHistory(false);
        break;
      case '/':
      case '?':
        e.preventDefault();
        $('q').focus();
        break;
    }
  });

  // ---- shaking the phone or iPad (DeviceMotion). iOS asks permission, and only from a tap: the 📳 button.
  const motion = { on: false, prev: null, hits: [], lastAsk: 0 };
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x === null) return;
    const cur = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
    const p = motion.prev;
    motion.prev = cur;
    if (!p) return;
    const jerk = Math.abs(cur.x - p.x) + Math.abs(cur.y - p.y) + Math.abs(cur.z - p.z);
    if (jerk < 14) return;
    const now = performance.now();
    ball.jolt(Math.min(0.5, jerk / 60));
    motion.hits = motion.hits.filter((h) => now - h < 800);
    motion.hits.push(now);
    if (G.state === 'shaking' && G.q) G.q.extra = Math.min(G.q.extra + 0.15, 2);
    else if (motion.hits.length >= 3 && now - motion.lastAsk > 1500 && G.state !== 'revealing') {
      motion.lastAsk = now;
      motion.hits = [];
      ask($('q').value, { quick: true });
    }
  }
  function listenMotion() {
    if (motion.on) return;
    motion.on = true;
    window.addEventListener('devicemotion', onMotion);
  }
  function setupMotion() {
    const DM = window.DeviceMotionEvent;
    const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (!DM || !touch) return;
    if (typeof DM.requestPermission === 'function') {
      const btn = $('motionBtn');
      btn.classList.remove('hidden');
      btn.addEventListener('click', () => {
        gesture();
        DM.requestPermission()
          .then((r) => {
            if (r === 'granted') {
              listenMotion();
              btn.classList.add('hidden');
              toast('📳 SHAKE TO ASK!');
            } else toast('Tap the ball instead!');
          })
          .catch(() => toast('Tap the ball instead!'));
      });
    } else listenMotion();
  }

  // ---------------------------------------------------------------- the loop
  const ballC = new T.Vector3();
  function tick(dt) {
    G.time += dt;
    flow(dt);
    updateVisit(dt);
    ball.update(dt);
    for (const a of [stage.teddy, stage.tommy, buddyActor]) a.update(dt);
    updateFlights(dt);
    ball.centre(ballC);
    fx.court.update(dt, ballC, R);
    fx.flyers.update(dt);
    fx.sparkles.update(dt);
    fx.confetti.update(dt);
    for (const s of stars) s.s.material.opacity = 0.55 + 0.45 * Math.sin(G.time * s.sp + s.ph);
    // 'both': after an answer (and any second-opinion visit) the brothers swap
    if (G.swapAt !== null && G.time >= G.swapAt && (G.state === 'shown' || G.state === 'idle') && !visit.on) swapBrothers();
    // after a while with nothing asked, the ball turns its "8" back to you
    if (G.state === 'shown' && !visit.on) {
      G.idleT += dt;
      if (G.idleT > 25) {
        G.state = 'idle';
        ball.showEight();
        hideBubble('answer');
      }
    }
    // camera: a slow push in while the answer floats up
    const want = G.state === 'revealing' || (G.state === 'shown' && G.idleT < 6) ? 0.93 : 1;
    view.zoom += (want - view.zoom) * (1 - Math.exp(-1.5 * dt));
    // the "tap me" hint
    placeCamera();
    const hint = $('hint');
    if (!hint.classList.contains('gone')) {
      const s = toScreen(tmpV.set(R * 0.55, L.ballY - R * 0.55, R));
      hint.style.transform = `translate(${s.x.toFixed(0)}px, ${s.y.toFixed(0)}px)`;
    }
  }

  function placeCamera() {
    camera.position.copy(view.look).lerp(view.base, view.zoom);
    camera.position.x += Math.sin(G.time * 0.25) * 0.08;
    camera.lookAt(view.look);
    camera.updateMatrixWorld();
  }

  function render() {
    placeCamera();
    renderer.render(scene, camera);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!G.held) tick(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- start
  function boot() {
    const parts = TITLE.split(':');
    $('logo1').textContent = parts[0].trim();
    $('logo2').textContent = parts.slice(1).join(':').trim();
    $('logo2').classList.toggle('hidden', parts.length < 2);
    $('whoTeddy').src = thumbs.teddy;
    $('whoTommy').src = thumbs.tommy;
    $('whoBoth1').src = thumbs.teddy;
    $('whoBoth2').src = thumbs.tommy;
    applyWho();
    layout();
    renderHistory();
    if (Kit.lang) Kit.lang.onChange(() => ball.retext()); // the answer triangle is drawn on a canvas
    setupMotion();
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', () => setTimeout(layout, 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Kit.sound.suspend();
      else if (started) Kit.sound.resume();
    });
    // a hello from the brothers
    for (const id of ['teddy', 'tommy']) {
      if (stage[id].visible) setTimeout(() => stage[id].play(Kit.roster.signature(stage[id].entry, 'hello'), 1.6), 500 + (id === 'tommy' ? 300 : 0));
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hooks (the Browser pane hides the page and
  // throttles requestAnimationFrame, so tests drive time themselves)
  window.magic8 = {
    // advance the toy by `seconds` (in 1/60 s steps) and draw one frame
    step(seconds = 0) {
      const n = Math.max(1, Math.round(seconds * 60));
      for (let i = 0; i < n; i++) tick(1 / 60);
      render();
      return this.state();
    },
    // ask a question; opts: { who, mood: 'yes' | 'maybe' | 'no', i: answer index, quick }
    ask(text, opts) { return ask(text, opts); },
    who(w) { setWho(w, true); return G.who; },
    buddy() { return callBuddy(); },
    tap(id) { return tapActor(id === 'buddy' ? buddyActor : stage[id]); },
    hold(on = true) { G.held = on; return on; },
    mute(on) { if (Kit.sound.isMuted() !== on) toggleMute(); return Kit.sound.isMuted(); },
    history(on) { toggleHistory(on); },
    layout,
    state() {
      return {
        who: G.who, state: G.state, turn: answererNext(), face: ball.face, triangle: +ball.triangle.toFixed(2),
        q: G.q && { who: G.q.who, mood: G.q.mood, answer: G.q.answer, t: +G.q.t.toFixed(2) },
        last: G.last && { who: G.last.who, mood: G.last.mood, answer: G.last.answer },
        star: G.star,
        visit: visit.on ? { id: visit.id, t: +visit.t.toFixed(2), tossed: visit.tossed, leaving: visit.leaving } : null,
        companion: companionId(),
        poses: { teddy: stage.teddy.visible && stage.teddy.pose, tommy: stage.tommy.visible && stage.tommy.pose, buddy: buddyActor.visible && buddyActor.pose },
      };
    },
    G, visit, ball, stage, buddyActor, camera, scene, renderer,
  };

  boot();
})();
