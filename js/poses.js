/* Magic 8: poses. M8.pose(p, phase, mode, k) works like Kit.people.pose and adds this toy's own moves:
     idle   - standing, breathing
     shake  - hands on the 8-ball, shaking it hard
     watch  - hands together, waiting for the answer to float up
     think  - scratching his head (maybe)
     shrug  - arms out, palms up, head tilted (maybe)
     nope   - arms crossed in a big X, shaking his head (no)
     folded - arms folded, shaking his head (no)
     cheer  - both arms up (he got a treat)
   Every other mode (run, wave, give, peace, boxing, jumpshot...) goes to Kit.people.pose. Standing celebrations get
   their running stride toned down, unless he's on the move. */
(function () {
  'use strict';
  const M8 = (window.M8 = window.M8 || {});
  const Kit = window.Kit;

  const CUSTOM = ['idle', 'shake', 'watch', 'think', 'shrug', 'nope', 'folded', 'cheer'];
  const STANDING = ['peace', 'wave', 'give'];

  // Limb targets for the custom poses. Arms: x swings forward, z swings out (right arm +, left arm -).
  // Legs: x forward, z out. Hips: lean (x, negative = forward), twist (y). Head: x up, y turn, z tilt.
  function targets(mode, ph) {
    const s = Math.sin(ph);
    const t = { ll: 0, rl: 0, llz: -0.03, rlz: 0.03, la: 0.05, ra: 0.05, laz: -0.08, raz: 0.08, lean: -0.04, twist: 0, hx: 0, hy: 0, hz: 0, bob: 0 };
    switch (mode) {
      case 'idle': {
        const b = Math.sin(ph) * 0.03;
        t.laz = -0.08 - b;
        t.raz = 0.08 + b;
        t.hz = Math.sin(ph * 0.5) * 0.04;
        break;
      }
      case 'shake': {
        const j = Math.sin(ph * 9);
        t.la = t.ra = 1.45 + j * 0.2;
        t.laz = -0.06;
        t.raz = 0.06;
        t.llz = -0.16;
        t.rlz = 0.16;
        t.ll = 0.12;
        t.rl = -0.12;
        t.lean = -0.16 + j * 0.03;
        t.twist = Math.sin(ph * 4.5) * 0.12;
        t.bob = -0.04 + Math.abs(j) * 0.03;
        t.hx = 0.1;
        break;
      }
      case 'watch':
        t.la = t.ra = 0.95;
        t.laz = 0.42;
        t.raz = -0.42;
        t.lean = -0.1;
        t.hx = 0.12 + s * 0.03;
        t.bob = Math.abs(s) * 0.015;
        break;
      case 'think':
        t.ra = 2.85;
        t.raz = -0.25 + Math.sin(ph * 6) * 0.07; // scratch, scratch
        t.la = 0.15;
        t.laz = -0.22;
        t.hx = 0.18;
        t.hy = 0.22;
        t.hz = 0.18;
        t.lean = 0.02;
        break;
      case 'shrug': {
        const up = Math.max(0, Math.sin(ph * 1.6));
        t.la = t.ra = 0.55;
        t.laz = -(0.62 + up * 0.28);
        t.raz = 0.62 + up * 0.28;
        t.hz = 0.24 * Math.sin(ph * 0.8);
        t.hx = 0.08;
        t.bob = up * 0.05;
        t.lean = 0.04;
        break;
      }
      case 'nope':
        t.la = t.ra = 1.9;
        t.laz = 0.55;
        t.raz = -0.55;
        t.hy = Math.sin(ph * 4.2) * 0.5;
        t.llz = -0.1;
        t.rlz = 0.1;
        t.bob = Math.abs(Math.sin(ph * 2.1)) * 0.04;
        break;
      case 'folded':
        t.la = t.ra = 1.1;
        t.laz = 0.75;
        t.raz = -0.75;
        t.hy = Math.sin(ph * 3) * 0.42;
        t.hx = 0.12;
        t.lean = 0.06;
        t.llz = -0.08;
        t.rlz = 0.08;
        break;
      case 'cheer':
        t.la = t.ra = 2.75;
        t.laz = -0.4;
        t.raz = 0.4;
        t.hx = 0.15;
        t.bob = Math.abs(s) * 0.05;
        break;
    }
    return t;
  }

  // `moving`: he's walking or running while he poses (waving goodbye on the way out), so keep the stride.
  function pose(p, ph, mode, k, moving) {
    const to = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    if (CUSTOM.includes(mode)) {
      const t = targets(mode, ph);
      to(p.legL.rotation, 'x', t.ll);
      to(p.legR.rotation, 'x', t.rl);
      to(p.legL.rotation, 'z', t.llz);
      to(p.legR.rotation, 'z', t.rlz);
      to(p.armL.rotation, 'x', t.la);
      to(p.armR.rotation, 'x', t.ra);
      to(p.armL.rotation, 'z', t.laz);
      to(p.armR.rotation, 'z', t.raz);
      to(p.hips.rotation, 'x', t.lean);
      to(p.hips.rotation, 'y', t.twist);
      to(p.head.rotation, 'x', t.hx);
      to(p.head.rotation, 'y', t.hy);
      to(p.head.rotation, 'z', t.hz);
      p.hips.position.y += (p.hipY + t.bob - p.hips.position.y) * k;
      if (p.fingers) for (const f of p.fingers) f.visible = false;
      p.rig.scale.setScalar(p.rig.scale.x + (1 - p.rig.scale.x) * k);
      return;
    }
    Kit.people.pose(p, ph, mode, k);
    // the kit doesn't move these: bring them home
    to(p.legL.rotation, 'z', 0);
    to(p.legR.rotation, 'z', 0);
    to(p.head.rotation, 'y', 0);
    to(p.head.rotation, 'z', 0);
    if (!moving && STANDING.includes(mode)) {
      p.legL.rotation.x *= 0.35;
      p.legR.rotation.x *= 0.35;
    }
  }

  M8.pose = pose;
  M8.POSES = CUSTOM;
})();
