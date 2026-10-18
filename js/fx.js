/* Magic 8: effects and sound.
     M8.sfx     - this toy's sounds, built on Kit.sound.tone / hiss (sparkle, slosh, reveal, yes, maybe, no...)
     M8.voice   - says the answers: recorded clips (js/voices.js), else the browser's voice; quiet when muted
     M8.Flyers  - emoji sprites that pop, float and fade (✌️ ⭐ 💥 ❓)
     M8.Sparkles- glowing dots that burst around the ball
     M8.Confetti- 2D confetti over the whole page, for YES answers
     M8.Court   - a pop-up hoop and a 🏀 for Teddy's jump shot */
(function () {
  'use strict';
  const T = THREE;
  const M8 = (window.M8 = window.M8 || {});
  const Kit = window.Kit;
  const S = Kit.sound;
  const { rand, pick } = Kit.gfx;

  // ---------------------------------------------------------------- sounds
  const SPARKLE = [1568, 1760, 2093, 2349, 2637, 3136, 3520];
  M8.sfx = {
    sparkle(n = 6, at = 0) {
      for (let i = 0; i < n; i++) S.tone({ type: i % 2 ? 'sine' : 'triangle', f: pick(SPARKLE), at: at + i * 0.055 + rand(0, 0.02), dur: 0.45, vol: 0.05 });
    },
    // liquid sloshing inside the ball
    slosh() {
      S.hiss({ filter: 'lowpass', f: rand(500, 800), to: rand(1300, 1900), dur: 0.22, vol: 0.12, q: 2 });
      S.tone({ f: rand(140, 190), to: rand(90, 120), dur: 0.16, vol: 0.06 });
      if (Math.random() < 0.6) S.tone({ f: rand(700, 1000), to: rand(1500, 2200), dur: 0.06, vol: 0.03, at: rand(0.03, 0.12) });
    },
    // the triangle floating up: a rising shimmer
    reveal() {
      S.tone({ f: 330, to: 990, dur: 0.9, vol: 0.05, attack: 0.25 });
      S.tone({ type: 'triangle', f: 495, to: 1480, dur: 0.9, vol: 0.03, attack: 0.25 });
      M8.sfx.sparkle(7, 0.55);
    },
    yes() {
      S.powerup();
      M8.sfx.sparkle(8, 0.3);
    },
    // a curious "hmm?"
    maybe() {
      S.tone({ type: 'triangle', f: 392, to: 466, dur: 0.22, vol: 0.12 });
      S.tone({ type: 'triangle', f: 466, to: 392, dur: 0.22, vol: 0.1, at: 0.24 });
      S.tone({ type: 'triangle', f: 523, to: 622, dur: 0.3, vol: 0.12, at: 0.5 });
    },
    // a soft cartoon "wah-wah", silly rather than sad
    no() {
      S.tone({ type: 'triangle', f: 392, to: 370, dur: 0.3, vol: 0.12 });
      S.tone({ type: 'triangle', f: 349, to: 294, dur: 0.5, vol: 0.12, at: 0.32 });
      S.tone({ f: 600, to: 300, dur: 0.18, vol: 0.05, at: 0.85 });
    },
    pop() { S.tone({ f: rand(500, 700), to: rand(1200, 1600), dur: 0.08, vol: 0.06 }); },
    whoosh() { S.hiss({ f: 600, to: 2600, dur: 0.3, vol: 0.12, q: 0.8 }); },
    treat() { S.coin(6); },
    arrive() { S.powerup(); },
    click() { S.click(); },
    punch() { S.punch(); },
    swish() { S.swish(); },
    bounce() { S.tone({ f: 220, to: 120, dur: 0.12, vol: 0.18 }); },
  };

  // ---------------------------------------------------------------- reading answers aloud
  // First choice: the brothers' recorded clips in js/voices.js (made by tools/make_voices.py with the local voice
  // model), played through Web Audio so they also work on iOS long after the tap. A line without a clip is read by
  // the browser's own speechSynthesis instead. Everything is quiet while muted.

  // Novelty system voices that would make an answer sound scary or silly in the wrong way.
  const SKIP = /bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|fred|junior|ralph|kathy/i;
  const LIKE = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Moira', 'Tessa', 'Serena', 'Daniel', 'Google UK English Female'];
  const VOICE = { teddy: { pitch: 1.25, rate: 1.04 }, tommy: { pitch: 1.6, rate: 1.0 } };
  let chosen = null;
  function chooseVoice() {
    const ss = window.speechSynthesis;
    if (!ss) return null;
    const all = ss.getVoices().filter((v) => /^en/i.test(v.lang) && !SKIP.test(v.name));
    for (const name of LIKE) {
      const v = all.find((x) => x.name.indexOf(name) === 0);
      if (v) return (chosen = v);
    }
    return (chosen = all.find((v) => /en[-_]US/i.test(v.lang)) || all[0] || null);
  }
  if (window.speechSynthesis) {
    chooseVoice();
    try { window.speechSynthesis.addEventListener('voiceschanged', chooseVoice); } catch (e) { /* old Safari */ }
  }
  // emoji and pauses out, shouted words in lower case (so "YES" is read as a word, not spelled)
  const forSpeech = (text) => String(text)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\.\.\./g, ', ')
    .replace(/\b([A-Z]{2,})\b/g, (w) => w.toLowerCase())
    .trim();

  function speakSynth(text, who, queue) {
    const ss = window.speechSynthesis;
    const words = forSpeech(text);
    if (!ss || !words) return;
    try {
      if (!queue) ss.cancel();
      const u = new SpeechSynthesisUtterance(words);
      const v = chosen || chooseVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || 'en-US';
      const o = VOICE[who] || VOICE.teddy;
      u.pitch = o.pitch;
      u.rate = o.rate;
      ss.speak(u);
    } catch (e) { /* no speech */ }
  }

  // the recorded clips
  const clips = { ctx: null, out: null, buffers: {}, playing: [], endsAt: 0, gen: 0 };
  const clipFor = (who, text) => (window.M8Voices || {})[`${who}|${text}`] || null;
  function audio() {
    if (!clips.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      clips.ctx = new AC();
      clips.out = clips.ctx.createGain();
      clips.out.gain.value = 0.95;
      clips.out.connect(clips.ctx.destination);
    }
    if (clips.ctx.state === 'suspended') clips.ctx.resume();
    return clips.ctx;
  }
  function decode(key, url) {
    if (!clips.buffers[key]) {
      const bin = atob(url.slice(url.indexOf(',') + 1));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      clips.buffers[key] = new Promise((ok, fail) => clips.ctx.decodeAudioData(bytes.buffer, ok, fail));
    }
    return clips.buffers[key];
  }

  M8.voice = {
    on: () => !S.isMuted(),
    // iOS only plays sound after a user gesture: call this from every tap (cheap after the first)
    unlock() {
      audio();
      const ss = window.speechSynthesis;
      if (!ss || M8.voice.unlocked) return;
      M8.voice.unlocked = true;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        ss.speak(u);
      } catch (e) { /* no speech */ }
    },
    // does this line have a recorded clip?
    has: (text, who) => !!clipFor(who, text),
    // decode a clip ahead of time (the answer is picked while the ball shakes)
    prepare(text, who) {
      const url = clipFor(who, text);
      if (url && audio()) decode(`${who}|${text}`, url).catch(() => {});
    },
    // say a line as `who`; queue: wait for whatever is playing instead of cutting it off
    say(text, who, queue) {
      if (S.isMuted()) return;
      if (!queue) M8.voice.stop();
      const url = clipFor(who, text);
      if (!url || !audio()) return speakSynth(text, who, queue);
      const gen = clips.gen, ctx = clips.ctx;
      decode(`${who}|${text}`, url)
        .then((buf) => {
          if (gen !== clips.gen || S.isMuted()) return; // stopped or muted while decoding
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(clips.out);
          const at = Math.max(ctx.currentTime + 0.02, queue ? clips.endsAt + 0.2 : 0);
          src.start(at);
          clips.endsAt = at + buf.duration;
          clips.playing.push(src);
          src.onended = () => { clips.playing = clips.playing.filter((s) => s !== src); };
        })
        .catch(() => speakSynth(text, who, queue));
    },
    stop() {
      clips.gen++;
      clips.endsAt = 0;
      for (const s of clips.playing) {
        try { s.stop(); } catch (e) { /* already stopped */ }
      }
      clips.playing = [];
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* no speech */ }
    },
  };

  // ---------------------------------------------------------------- emoji flyers
  class Flyers {
    constructor(scene) {
      this.scene = scene;
      this.list = [];
      this.pool = [];
    }
    // emoji at (x, y, z), moving (vx, vy) m/s, `size` m, alive `life` s, spinning, falling with `grav`
    add(emoji, x, y, z, vx, vy, size, life, spin = 0, grav = 0) {
      let s = this.pool.pop();
      if (!s) {
        s = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false }));
        s.renderOrder = 8;
      }
      s.material.map = Kit.gfx.emojiTexture(emoji);
      s.material.needsUpdate = true;
      s.material.opacity = 1;
      s.material.rotation = 0;
      s.position.set(x, y, z);
      s.visible = true;
      this.scene.add(s);
      this.list.push({ s, vx, vy, size, life, age: 0, spin, grav });
      return s;
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const f = this.list[i];
        f.age += dt;
        const u = f.age / f.life;
        if (u >= 1) {
          this.scene.remove(f.s);
          this.pool.push(f.s);
          this.list.splice(i, 1);
          continue;
        }
        f.vy -= f.grav * dt;
        f.s.position.x += f.vx * dt;
        f.s.position.y += f.vy * dt;
        f.s.material.rotation += f.spin * dt;
        const pop = Math.min(1, f.age / 0.12);
        f.s.scale.setScalar(f.size * (pop < 1 ? pop * (1.3 - 0.3 * pop) : 1));
        f.s.material.opacity = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      }
    }
  }
  M8.Flyers = Flyers;

  // ---------------------------------------------------------------- sparkles around the ball
  class Sparkles {
    constructor(scene, n = 90) {
      this.items = [];
      const tex = Kit.gfx.dotTexture();
      for (let i = 0; i < n; i++) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
        s.visible = false;
        s.renderOrder = 9;
        scene.add(s);
        this.items.push({ s, v: new T.Vector3(), life: 0, age: 0, size: 0.1 });
      }
      this.next = 0;
    }
    // a ring of sparkles bursting out from `c` (a Vector3), radius r
    burst(c, r, count, colors) {
      for (let i = 0; i < count; i++) {
        const it = this.items[this.next++ % this.items.length];
        const a = rand(0, Math.PI * 2), b = rand(-0.9, 0.9);
        const dir = new T.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b) * 0.5 + 0.5);
        it.s.position.copy(c).addScaledVector(dir, r);
        it.v.copy(dir).multiplyScalar(rand(0.6, 2.2));
        it.v.y += 0.6;
        it.life = rand(0.6, 1.3);
        it.age = 0;
        it.size = rand(0.08, 0.2);
        it.s.material.color.set(pick(colors));
        it.s.visible = true;
      }
    }
    update(dt) {
      for (const it of this.items) {
        if (!it.s.visible) continue;
        it.age += dt;
        if (it.age >= it.life) {
          it.s.visible = false;
          continue;
        }
        it.v.multiplyScalar(Math.exp(-2.2 * dt));
        it.s.position.addScaledVector(it.v, dt);
        const u = it.age / it.life;
        it.s.material.opacity = (1 - u) * (0.7 + 0.3 * Math.sin(it.age * 30));
        it.s.scale.setScalar(it.size * (1 - u * 0.5));
      }
    }
  }
  M8.Sparkles = Sparkles;

  // ---------------------------------------------------------------- confetti (a 2D canvas over the page)
  class Confetti {
    constructor(canvas) {
      this.c = canvas;
      this.g = canvas.getContext('2d');
      this.bits = [];
      this.resize();
    }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.dpr = dpr;
      this.c.width = Math.max(1, Math.round(window.innerWidth * dpr));
      this.c.height = Math.max(1, Math.round(window.innerHeight * dpr));
    }
    burst(x, y, n = 140) {
      const COLORS = ['#ffd400', '#ff3d7f', '#18d4ff', '#3fe0b0', '#ff8a1f', '#b48cff', '#ffffff'];
      for (let i = 0; i < n; i++) {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05), sp = rand(350, 1050);
        this.bits.push({
          x: x + rand(-30, 30), y: y + rand(-20, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: rand(0, 6), vr: rand(-12, 12), w: rand(7, 14), h: rand(4, 8), col: pick(COLORS),
          round: Math.random() < 0.25, life: rand(2.2, 3.6), age: 0, wob: rand(0, 6),
        });
      }
    }
    get busy() { return this.bits.length > 0; }
    update(dt) {
      const g = this.g, d = this.dpr;
      if (!this.bits.length && !this.dirty) return;
      g.clearRect(0, 0, this.c.width, this.c.height);
      this.dirty = this.bits.length > 0;
      for (let i = this.bits.length - 1; i >= 0; i--) {
        const b = this.bits[i];
        b.age += dt;
        if (b.age > b.life || b.y > window.innerHeight + 40) {
          this.bits.splice(i, 1);
          continue;
        }
        b.vy += 900 * dt;
        b.vx *= Math.exp(-1.6 * dt);
        b.vy *= Math.exp(-1.2 * dt);
        b.x += (b.vx + Math.sin(b.age * 6 + b.wob) * 40) * dt;
        b.y += b.vy * dt;
        b.r += b.vr * dt;
        g.save();
        g.globalAlpha = Math.min(1, (b.life - b.age) * 2);
        g.translate(b.x * d, b.y * d);
        g.rotate(b.r);
        g.scale(1, Math.abs(Math.cos(b.age * 7 + b.wob)) * 0.8 + 0.2);
        g.fillStyle = b.col;
        if (b.round) {
          g.beginPath();
          g.arc(0, 0, b.h * 0.7 * d, 0, Math.PI * 2);
          g.fill();
        } else g.fillRect((-b.w / 2) * d, (-b.h / 2) * d, b.w * d, b.h * d);
        g.restore();
      }
    }
  }
  M8.Confetti = Confetti;

  // ---------------------------------------------------------------- Teddy's jump shot: a hoop over the ball
  const RIM = { y: -0.28, z: 0.42, r: 0.36 }; // rim centre relative to the backboard
  const SHOT = 0.75; // seconds from release to the rim

  function buildHoop() {
    const g = new T.Group();
    const [c, x] = Kit.gfx.makeCanvas(160, 112);
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 160, 112);
    x.lineWidth = 8;
    x.strokeStyle = '#ff5a1f';
    x.strokeRect(6, 6, 148, 100);
    x.lineWidth = 6;
    x.strokeRect(52, 46, 56, 44);
    const white = Kit.gfx.std('#f4f4f4'), front = Kit.gfx.std('#ffffff', { map: Kit.gfx.toTexture(c) });
    g.add(new T.Mesh(new T.BoxGeometry(1.3, 0.9, 0.06), [white, white, white, white, front, white]));
    const orange = Kit.gfx.std('#ff5a1f', { roughness: 0.4, metalness: 0.3 });
    const bracket = new T.Mesh(new T.BoxGeometry(0.12, 0.06, RIM.z - RIM.r), orange);
    bracket.position.set(0, RIM.y, (RIM.z - RIM.r) / 2);
    g.add(bracket);
    const rim = new T.Mesh(new T.TorusGeometry(RIM.r, 0.035, 8, 28), orange);
    rim.rotation.x = Math.PI / 2 - 0.45; // nearly flat, tipped toward the camera
    rim.position.set(0, RIM.y, RIM.z);
    g.add(rim);
    const [nc, nx] = Kit.gfx.makeCanvas(128, 64);
    nx.strokeStyle = '#ffffff';
    nx.lineWidth = 3;
    for (let i = -8; i < 16; i++) {
      nx.beginPath();
      nx.moveTo(i * 16, 0);
      nx.lineTo(i * 16 + 64, 64);
      nx.moveTo(i * 16 + 64, 0);
      nx.lineTo(i * 16, 64);
      nx.stroke();
    }
    const net = new T.Mesh(
      new T.CylinderGeometry(RIM.r, RIM.r * 0.62, 0.42, 16, 1, true),
      new T.MeshBasicMaterial({ map: Kit.gfx.toTexture(nc), transparent: true, side: T.DoubleSide, depthWrite: false }),
    );
    net.rotation.x = -0.45;
    net.position.set(0, RIM.y - 0.2, RIM.z + 0.09);
    g.add(net);
    g.visible = false;
    return g;
  }

  class Court {
    constructor(scene) {
      this.hoop = buildHoop();
      scene.add(this.hoop);
      this.ball = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.emojiTexture('🏀'), transparent: true, depthWrite: false }));
      this.ball.renderOrder = 7;
      this.ball.visible = false;
      scene.add(this.ball);
      this.t = -1;
      this.hoopT = 9;
      this.v = new T.Vector3();
      this.rim = new T.Vector3();
      this.a = new T.Vector3();
      this.b = new T.Vector3();
      this.onSwish = null;
    }
    // where the rim should be (the hoop pops up there)
    place(x, y, z) {
      this.hoop.position.set(x, y - RIM.y, z - RIM.z);
    }
    // person: a Kit person (his hands carry the ball until it leaves them); s: his size
    shoot(person, s = 1) {
      this.p = person;
      this.s = s;
      this.t = 0;
      this.swished = this.bounced = false;
      this.hoopT = 0;
      this.hoop.visible = true;
    }
    update(dt, centre, R) {
      if (this.hoop.visible) {
        this.hoopT += dt;
        const k = this.hoopT < 0.25 ? this.hoopT / 0.25 : this.hoopT > 2.4 ? Math.max(0, 1 - (this.hoopT - 2.4) / 0.25) : 1;
        this.hoop.scale.setScalar(Math.max(0.001, k < 1 ? k * (1.25 - 0.25 * k) : 1));
        if (this.hoopT > 2.65) this.hoop.visible = false;
      }
      if (this.t < 0) return;
      this.t += dt;
      const ball = this.ball, g = 9, size = 0.5 * this.s;
      this.hoop.updateMatrixWorld(true);
      this.rim.set(0, RIM.y, RIM.z).applyMatrix4(this.hoop.matrixWorld);
      ball.scale.setScalar(size);
      ball.visible = true;
      if (this.t < 0.38) {
        // riding up in his hands
        Kit.people.handWorld(this.p, -1, this.a);
        Kit.people.handWorld(this.p, 1, this.b);
        ball.position.copy(this.a).add(this.b).multiplyScalar(0.5);
        ball.position.y += size * 0.45;
        ball.position.z += 0.25;
        // aim for a ball-radius above the rim centre, SHOT seconds after release
        this.v.set((this.rim.x - ball.position.x) / SHOT, (this.rim.y + 0.12 - ball.position.y) / SHOT + 0.5 * g * SHOT, (this.rim.z - ball.position.z) / SHOT);
        return;
      }
      this.v.y -= g * dt;
      ball.position.addScaledVector(this.v, dt);
      ball.material.rotation -= 7 * dt;
      if (!this.swished && this.t > 0.38 + SHOT) {
        this.swished = true;
        this.v.x *= 0.15; // the net catches it
        this.v.z *= 0.15;
        this.v.y *= 0.5;
        M8.sfx.swish();
        if (this.onSwish) this.onSwish(this.rim);
      }
      // through the net and a bounce off the top of the magic ball
      if (this.swished && !this.bounced && centre && this.v.y < 0 && ball.position.distanceTo(centre) < R + size * 0.4) {
        this.bounced = true;
        const n = this.a.copy(ball.position).sub(centre).normalize();
        this.v.reflect(n).multiplyScalar(0.6);
        this.v.x += (n.x >= 0 ? 1 : -1) * 1.6;
        this.v.y = Math.max(this.v.y, 3);
        M8.sfx.bounce();
      }
      if (this.t > 2.6) {
        ball.visible = false;
        this.t = -1;
      }
    }
    hide() {
      this.t = -1;
      this.ball.visible = false;
      this.hoop.visible = false;
    }
  }
  M8.Court = Court;
})();
