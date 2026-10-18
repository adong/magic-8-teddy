/* Magic 8: the ball. A glossy black sphere with the white "8" on the front and a round window on the back. Inside
   the window, dark blue liquid, swirling bubbles, and the blue answer triangle that floats up to the glass.
   M8.makeBall(renderer) returns:
     root       - put it in the scene and set root.position (the ball's centre); radius R = 1
     shake(on)  - start/stop shaking: it wobbles and spins, the liquid goes murky and the bubbles swirl.
                  Stopping turns the window toward the camera.
     reveal(text, mood) - the triangle with `text` (in 中文 when Kit.lang says so) floats up out of the murk
     retext()   - redraw the triangle's text after the language changes
     sink()     - the triangle sinks back into the liquid
     showEight()- turn back to the "8" side
     drag(x, y) - offset the ball (world units) while it's being dragged; drag(0, 0) lets it spring back
     jolt(a)    - a bump of wobble (device shake, taps)
     hit(ray)   - is the ray on the ball? */
(function () {
  'use strict';
  const T = THREE;
  const M8 = (window.M8 = window.M8 || {});
  const Kit = window.Kit;
  const { makeCanvas, toTexture, radialTexture, FONT, EMOJI_FONT } = Kit.gfx;

  const R = 1;
  const CAP8 = 0.6; // angular radius of the white "8" circle
  const CAPW = 0.72; // angular radius of the window
  const RW = R * Math.sin(CAPW); // window radius
  const ZW = R * Math.cos(CAPW); // window rim depth along the axis
  const TRI_DEEP = ZW - 0.55, TRI_FRONT = ZW - 0.07;
  const MOOD_GLOW = { yes: '#ffd84a', maybe: '#5fe3ff', no: '#ff8fb8', idle: '#9b7bff' };

  // A shiny studio for reflections: a purple sky and a few soft boxes, so the black ball gets its highlights.
  function makeEnv(renderer) {
    const pm = new T.PMREMGenerator(renderer);
    const sc = new T.Scene();
    const [c, g] = makeCanvas(8, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#a495ff');
    gr.addColorStop(0.45, '#40308a');
    gr.addColorStop(0.55, '#21164a');
    gr.addColorStop(1, '#0c0820');
    g.fillStyle = gr;
    g.fillRect(0, 0, 8, 256);
    sc.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ map: toTexture(c), side: T.BackSide })));
    const box = (w, h, x, y, z, v, col) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col[0] * v, col[1] * v, col[2] * v), side: T.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      sc.add(m);
    };
    box(3.2, 2.2, -4, 5, 6, 7, [1, 1, 1]); // key soft box: upper left, on the camera side
    box(1.1, 4.5, 6.5, 1, 3, 2.2, [0.85, 0.75, 1]); // strip light on the right
    box(5, 1.2, 0, -6, 3, 0.7, [1, 0.6, 0.9]); // pink floor bounce
    const rt = pm.fromScene(sc, 0.015);
    pm.dispose();
    return rt.texture;
  }

  // A spherical cap around +z with flat (front-on) UVs, so a canvas maps onto it like a sticker.
  function capGeometry(r, angle) {
    const geo = new T.SphereGeometry(r, 64, 14, 0, Math.PI * 2, 0, angle);
    geo.rotateX(Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv, rc = r * Math.sin(angle);
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * rc) + 0.5, pos.getY(i) / (2 * rc) + 0.5);
    return geo;
  }

  function eightTexture() {
    const [c, g] = makeCanvas(256, 256);
    const gr = g.createRadialGradient(110, 100, 10, 128, 128, 140);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#e9e6f2');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#0b0b12';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 196px "Arial Black", "Helvetica Neue", Arial, sans-serif';
    g.fillText('8', 128, 138);
    return toTexture(c);
  }

  function bubbleTexture() {
    const [c, g] = makeCanvas(64, 64);
    g.strokeStyle = 'rgba(200,225,255,0.95)';
    g.lineWidth = 5;
    g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(180,210,255,0.25)';
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.arc(23, 22, 6, 0, Math.PI * 2); g.fill();
    return toTexture(c);
  }

  // ---- the answer triangle: an upward triangle with the text wrapped to fit its shape ----
  const TRI = { size: 512, top: 16, base: 376, half: 207.8 }; // circumcentre at the canvas centre, radius 240
  const triFont = (px) => `800 ${px}px "Rubik", "Arial Rounded MT Bold", ${FONT}, ${EMOJI_FONT}`;

  // The pieces a line can break between: English words (split at spaces), and single Chinese characters, which can
  // break anywhere (their punctuation stays with the character before it). Each piece knows if a space comes first.
  const CJK = '\\u2e80-\\u9fff\\uf900-\\ufaff';
  const PIECE = new RegExp(`\\s+|[${CJK}][\\u3000-\\u303f\\uff00-\\uffef\\u2026\\u2014]*|[^\\s${CJK}]+`, 'g');
  function pieces(text) {
    const out = [];
    let space = false;
    for (const m of String(text).match(PIECE) || []) {
      if (/^\s+$/.test(m)) {
        space = true;
        continue;
      }
      out.push({ s: m, space: space && out.length > 0 });
      space = false;
    }
    return out;
  }

  // Greedy wrap where each line may only be as wide as the triangle is at that height.
  function fitText(g, parts) {
    for (let px = 72; px >= 22; px -= 2) {
      g.font = triFont(px);
      const lh = px * 1.08;
      for (let n = 1; n <= 5; n++) {
        const top = 272 - (n * lh) / 2; // the block sits a little below centre, where the triangle is wide
        if (top - 6 < 104) break;
        const lines = [];
        let pi = 0, ok = true;
        for (let i = 0; i < n && pi < parts.length; i++) {
          const yTop = top + i * lh;
          const w = ((yTop - TRI.top) / (TRI.base - TRI.top)) * TRI.half * 2 - 34;
          let line = parts[pi].s;
          if (g.measureText(line).width > w) { ok = false; break; }
          pi++;
          while (pi < parts.length) {
            const next = line + (parts[pi].space ? ' ' : '') + parts[pi].s;
            if (g.measureText(next).width > w) break;
            line = next;
            pi++;
          }
          lines.push(line);
        }
        if (ok && pi >= parts.length && top + lines.length * lh < TRI.base - 10) return { px, lh, top, lines };
      }
    }
    g.font = triFont(22);
    return { px: 22, lh: 24, top: 200, lines: [parts.map((p, i) => (i && p.space ? ' ' : '') + p.s).join('')] };
  }

  function drawTriangle(g, text) {
    const S = TRI.size;
    g.clearRect(0, 0, S, S);
    const cx = S / 2;
    const path = () => {
      g.beginPath();
      g.moveTo(cx, TRI.top + 14);
      g.lineTo(cx + TRI.half - 12, TRI.base - 7);
      g.lineTo(cx - TRI.half + 12, TRI.base - 7);
      g.closePath();
    };
    g.save();
    g.shadowColor = 'rgba(110,150,255,0.9)';
    g.shadowBlur = 22;
    const gr = g.createLinearGradient(0, TRI.top, 0, TRI.base);
    gr.addColorStop(0, '#4f7dff');
    gr.addColorStop(1, '#1838c8');
    g.fillStyle = gr;
    g.strokeStyle = gr;
    g.lineJoin = 'round';
    g.lineWidth = 26;
    path();
    g.fill();
    g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(170,195,255,0.55)';
    g.lineWidth = 4;
    g.lineJoin = 'round';
    path();
    g.stroke();
    if (!text) return;
    // in 中文 the answer comes from the game's dictionary (Kit.lang); English is shouted, like a real 8-ball
    const shown = Kit.lang ? Kit.lang.t(String(text)) : String(text);
    const f = fitText(g, pieces(shown.toUpperCase()));
    g.font = triFont(f.px);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(10,20,90,0.7)';
    g.shadowBlur = 6;
    f.lines.forEach((line, i) => g.fillText(line, cx, f.top + (i + 0.5) * f.lh));
    g.shadowBlur = 0;
  }

  function makeBall(renderer) {
    const env = makeEnv(renderer);
    const root = new T.Group();
    const spin = new T.Group();
    root.add(spin);

    // halo behind the ball, tinted by the answer's mood
    const halo = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.glowTexture(), color: MOOD_GLOW.idle, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
    halo.position.set(0, 0, -0.6);
    halo.scale.setScalar(4.2);
    root.add(halo);

    const black = new T.MeshPhysicalMaterial({ color: '#0d0c14', roughness: 0.16, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMap: env, envMapIntensity: 1.25 });
    const bodyGeo = new T.SphereGeometry(R, 72, 48, 0, Math.PI * 2, 0, Math.PI - CAPW);
    bodyGeo.rotateX(Math.PI / 2); // the hole (around -y) ends up at -z, the back
    const body = new T.Mesh(bodyGeo, black);
    body.castShadow = true;
    spin.add(body);

    const eight = new T.Mesh(capGeometry(R * 1.003, CAP8), new T.MeshPhysicalMaterial({ color: '#ffffff', map: eightTexture(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 0.5 }));
    spin.add(eight);

    // the window, built facing +z inside a group turned to the back
    const win = new T.Group();
    win.rotation.y = Math.PI;
    spin.add(win);
    const liquid = new T.Mesh(new T.SphereGeometry(R * 0.965, 40, 24), new T.MeshBasicMaterial({ color: '#081040', side: T.BackSide }));
    win.add(liquid);
    const glowDisc = new T.Mesh(
      new T.CircleGeometry(RW * 1.05, 40),
      new T.MeshBasicMaterial({ map: radialTexture(128, [[0, 'rgba(70,110,255,0.85)'], [0.55, 'rgba(30,60,200,0.45)'], [1, 'rgba(10,20,90,0)']]), transparent: true, depthWrite: false }),
    );
    glowDisc.position.z = TRI_DEEP - 0.08;
    glowDisc.renderOrder = 1;
    win.add(glowDisc);

    const [triCanvas, triCtx] = makeCanvas(TRI.size, TRI.size);
    drawTriangle(triCtx, '');
    const triTex = toTexture(triCanvas);
    const triSize = (RW * 0.98 * (TRI.size / 2)) / 240; // half the plane, so the triangle's corners stay inside the window
    const tri = new T.Mesh(new T.PlaneGeometry(triSize * 2, triSize * 2), new T.MeshBasicMaterial({ map: triTex, transparent: true, opacity: 0, depthWrite: false }));
    tri.position.z = TRI_DEEP;
    tri.renderOrder = 2;
    win.add(tri);

    const murk = new T.Mesh(new T.CircleGeometry(RW, 40), new T.MeshBasicMaterial({ color: '#0c1c64', transparent: true, opacity: 0, depthWrite: false }));
    murk.position.z = TRI_FRONT + 0.02;
    murk.renderOrder = 3;
    win.add(murk);

    const bubbleMat = new T.SpriteMaterial({ map: bubbleTexture(), transparent: true, opacity: 0.4, depthWrite: false });
    const bubbles = [];
    for (let i = 0; i < 30; i++) {
      const s = new T.Sprite(bubbleMat);
      const b = { s, x: Kit.gfx.rand(-RW, RW) * 0.8, y: Kit.gfx.rand(-RW, RW) * 0.8, z: Kit.gfx.rand(TRI_DEEP, TRI_FRONT + 0.05), size: Kit.gfx.rand(0.035, 0.09), ph: Math.random() * 6 };
      s.scale.setScalar(b.size);
      s.renderOrder = 4;
      win.add(s);
      bubbles.push(b);
    }

    const glass = new T.Mesh(capGeometry(R, CAPW + 0.03), new T.MeshPhysicalMaterial({ color: '#2a3c8c', transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 2.2, depthWrite: false }));
    glass.renderOrder = 5;
    win.add(glass);
    const rim = new T.Mesh(new T.TorusGeometry(RW, 0.05, 12, 80), new T.MeshPhysicalMaterial({ color: '#2b2935', metalness: 0.7, roughness: 0.25, envMap: env, envMapIntensity: 1.4 }));
    rim.position.z = ZW;
    win.add(rim);

    // ---- motion state ----
    const st = {
      t: 0, shaking: false, shk: 0, face: 'eight',
      yaw: 0, yawV: 0, target: 0, settle: false,
      wobX: 0, wobXV: 0, wobZ: 0, wobZV: 0,
      dragX: 0, dragY: 0, offX: 0, offY: 0, offXV: 0, offYV: 0,
      tri: 0, triGoal: 0, triRot: 0, murk: 0, swirl: 0.2, glow: new T.Color(MOOD_GLOW.idle), glowGoal: new T.Color(MOOD_GLOW.idle), flash: 0,
    };

    // the nearest yaw (ahead of the current spin) that shows the wanted side
    function aim(side, ahead) {
      const base = side === 'window' ? Math.PI : 0;
      const twoPi = Math.PI * 2;
      let k = Math.round((st.yaw + (ahead ? 0.9 * Math.sign(st.yawV || 1) : 0) - base) / twoPi);
      st.target = base + k * twoPi;
      st.face = side;
      st.settle = true;
    }

    function shake(on) {
      if (on === st.shaking) return;
      st.shaking = on;
      if (on) {
        st.settle = false;
        st.yawV = Math.max(Math.abs(st.yawV), 3) * (Math.random() < 0.5 ? -1 : 1);
        sink();
      } else aim('window', true);
    }

    function reveal(text, mood) {
      st.text = text;
      drawTriangle(triCtx, text);
      triTex.needsUpdate = true;
      st.triGoal = 1;
      st.tri = 0;
      st.triRot = Kit.gfx.rand(-0.9, 0.9);
      st.glowGoal.set(MOOD_GLOW[mood] || MOOD_GLOW.idle);
      st.flash = 1;
      if (st.face !== 'window') aim('window', false);
    }

    // redraw the triangle's text (the language changed)
    function retext() {
      if (!st.text) return;
      drawTriangle(triCtx, st.text);
      triTex.needsUpdate = true;
    }

    function sink() {
      st.triGoal = 0;
      st.glowGoal.set(MOOD_GLOW.idle);
    }

    function showEight() {
      sink();
      aim('eight', false);
    }

    function jolt(a) {
      st.wobXV += Kit.gfx.rand(-1, 1) * a * 6;
      st.wobZV += Kit.gfx.rand(-1, 1) * a * 6;
      st.offYV += a * 1.5;
      st.yawV += Kit.gfx.rand(-1, 1) * a * 3;
      if (!st.shaking && st.face) st.settle = true;
    }

    function drag(x, y) {
      st.dragX = x;
      st.dragY = y;
    }

    const spring = (x, v, goal, k, c, dt) => {
      v += (k * (goal - x) - c * v) * dt;
      return [x + v * dt, v];
    };

    function update(dt) {
      st.t += dt;
      const t = st.t;
      st.shk += ((st.shaking ? 1 : 0) - st.shk) * (1 - Math.exp(-(st.shaking ? 8 : 4) * dt));
      const shk = st.shk;

      // spin: tumble while shaking, then settle on a side with a little overshoot
      if (st.shaking) {
        const want = 5.5 * Math.sign(st.yawV || 1);
        st.yawV += (want - st.yawV) * (1 - Math.exp(-3 * dt));
        st.yaw += st.yawV * dt;
      } else if (st.settle) {
        const goal = st.target + Math.sin(t * 0.7) * 0.07;
        [st.yaw, st.yawV] = spring(st.yaw, st.yawV, goal, 46, 6.5, dt);
      }

      // wobble: a rattle while shaking, plus springs that jolts and drags kick
      [st.wobX, st.wobXV] = spring(st.wobX, st.wobXV, 0, 60, 5, dt);
      [st.wobZ, st.wobZV] = spring(st.wobZ, st.wobZV, 0, 60, 5, dt);
      st.wobX = Math.max(-0.5, Math.min(0.5, st.wobX));
      st.wobZ = Math.max(-0.5, Math.min(0.5, st.wobZ));
      spin.rotation.set(st.wobX + Math.sin(t * 17.3) * 0.22 * shk, st.yaw, st.wobZ + Math.sin(t * 13.1 + 1) * 0.28 * shk);

      // position: float, shake jitter, drag
      [st.offX, st.offXV] = spring(st.offX, st.offXV, st.dragX, 90, 9, dt);
      [st.offY, st.offYV] = spring(st.offY, st.offYV, st.dragY, 90, 9, dt);
      spin.position.set(
        st.offX + (Math.sin(t * 23) * 0.06 + Math.sin(t * 37) * 0.03) * shk,
        st.offY + Math.sin(t * 1.5) * 0.035 + Math.abs(Math.sin(t * 19)) * 0.08 * shk,
        0,
      );

      // the liquid: murky while shaking, clear as the triangle comes up
      st.murk += (Math.max(shk, 0) * 0.85 - st.murk) * (1 - Math.exp(-(st.shaking ? 6 : 1.6) * dt));
      murk.material.opacity = st.murk;
      glass.material.opacity = 0.2 + st.murk * 0.25;

      // triangle: float up (slowly) or sink (quickly)
      const rate = st.triGoal > st.tri ? dt / 1.15 : -dt / 0.35;
      st.tri = Math.max(0, Math.min(1, st.tri + rate));
      const e = st.tri * st.tri * (3 - 2 * st.tri);
      tri.material.opacity = Math.pow(e, 1.3);
      tri.position.z = TRI_DEEP + (TRI_FRONT - TRI_DEEP) * e + Math.sin(t * 1.3) * 0.012 * e;
      tri.rotation.z = st.triRot * (1 - e) + Math.sin(t * 0.9) * 0.035;
      tri.scale.setScalar(0.72 + 0.28 * e);
      tri.visible = st.tri > 0.001;

      // bubbles: swirl while shaking, drift up when calm
      st.swirl += ((st.shaking ? 7 : 0.25) - st.swirl) * (1 - Math.exp(-3 * dt));
      bubbleMat.opacity = 0.3 + 0.6 * shk;
      const lim = RW * 0.9;
      for (const b of bubbles) {
        const k = st.swirl * (0.7 + 0.5 * (1 - Math.hypot(b.x, b.y) / RW));
        const vx = -b.y * k + Math.sin(t * 3 + b.ph) * 0.03;
        const vy = b.x * k + 0.1 * (1 - shk);
        b.x += vx * dt;
        b.y += vy * dt;
        const d = Math.hypot(b.x, b.y);
        if (d > lim) {
          if (shk > 0.3) {
            b.x *= lim / d;
            b.y *= lim / d;
          } else {
            b.x = Kit.gfx.rand(-0.6, 0.6) * RW;
            b.y = -Math.sqrt(Math.max(0, lim * lim - b.x * b.x)) * 0.95;
          }
        }
        b.s.position.set(b.x, b.y, b.z);
      }

      // halo: mood tint and a flash on reveal
      st.flash = Math.max(0, st.flash - dt * 0.8);
      st.glow.lerp(st.glowGoal, 1 - Math.exp(-3 * dt));
      halo.material.color.copy(st.glow);
      halo.material.opacity = 0.3 + Math.sin(t * 2.2) * 0.08 + st.flash * 0.6 + shk * 0.25;
      halo.scale.setScalar(4.2 + st.flash * 1.2 + Math.sin(t * 2.2) * 0.1);
    }

    const sphere = new T.Sphere(new T.Vector3(), R * 1.12);
    function hit(ray) {
      spin.getWorldPosition(sphere.center);
      return ray.intersectsSphere(sphere);
    }

    return {
      root, R, update, shake, reveal, retext, sink, showEight, drag, jolt, hit,
      get face() { return st.face; },
      get shaking() { return st.shaking; },
      get triangle() { return st.tri; },
      // world position of the ball's centre (with its wobble), for effects
      centre: (out = new T.Vector3()) => spin.getWorldPosition(out),
    };
  }

  M8.makeBall = makeBall;
  M8.drawTriangle = drawTriangle;
})();
