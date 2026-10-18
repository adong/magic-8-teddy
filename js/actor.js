/* Magic 8: an actor is one brother on the stage. M8.makeActor(scene, fx) returns an object that
     set(entry, scale, withTag) - builds him from a Kit.roster entry (a buddy is smaller: entry.buddyScale)
     place(x, z)               - stand there now
     moveTo(x, z, speed, then) - walk or run there (then() on arrival); his pose keeps going, so 'wave' waves on the way
     look(x, z)                - which point he faces while standing (null: keep facing where he's going)
     play(pose, dur, hop)      - any pose from M8.pose for `dur` seconds, then back to idle. Celebrations bring
                                 their own effects: 💥 on each boxing punch, ✌️ and ⭐ from the Y, the 🏀 for the jump shot.
     emote(emoji, dur)         - an emoji bubble over his head
     hold(emoji, side)         - he holds a treat for a while
     hit(ray)                  - did a tap land on him? */
(function () {
  'use strict';
  const T = THREE;
  const M8 = (window.M8 = window.M8 || {});
  const Kit = window.Kit;
  const { rand } = Kit.gfx;

  const SPEED = { idle: 2.2, cheer: 6, boxing: 6, peace: 4.2, wave: 5, jumpshot: 3, run: 13, walk: 9, give: 6, shake: 2.4, watch: 2, think: 2, shrug: 3, nope: 3, folded: 3 };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  let shadowTex = null;
  const shadowTexture = () => shadowTex || (shadowTex = Kit.gfx.radialTexture(128, [[0, 'rgba(20,6,40,0.5)'], [0.6, 'rgba(20,6,40,0.22)'], [1, 'rgba(20,6,40,0)']]));

  function makeActor(scene, fx) {
    const holder = new T.Group();
    holder.visible = false;
    scene.add(holder);
    const shadow = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    holder.add(shadow);
    const emo = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false }));
    emo.visible = false;
    emo.renderOrder = 8;
    holder.add(emo);
    const treat = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false }));
    treat.visible = false;
    treat.renderOrder = 7;

    let p = null, entry = null, tag = null;
    const st = {
      pose: 'idle', t: 0, phase: rand(0, 6), hopY: 0, hopV: 0, face: Math.PI, faceGoal: Math.PI,
      look: { x: 0, z: 20 }, goal: null, speed: 4, then: null, scale: 1,
      beat: -1, since: 0, bursts: 0, emoT: 0, emoDur: 0, treatT: 0, wob: 9, wobAmp: 0,
    };
    const tmp = new T.Vector3();

    function dispose(obj) {
      obj.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
    }

    function set(e, scale = 1, withTag = false) {
      if (p) {
        holder.remove(p.root);
        dispose(p.root);
      }
      if (tag) {
        holder.remove(tag);
        tag.material.map.dispose();
        tag.material.dispose();
        tag = null;
      }
      entry = e;
      p = Kit.people.build(e.look);
      holder.add(p.root);
      holder.scale.setScalar(scale);
      st.scale = scale;
      if (withTag) {
        tag = Kit.gfx.nameTag(e.name, e.tag || '#ffb02e');
        tag.position.y = 2.78;
        holder.add(tag);
      }
      emo.position.y = withTag ? 3.4 : 2.9;
      st.pose = 'idle';
      st.t = 0;
      treat.visible = false;
      st.treatT = 0;
      M8.pose(p, st.phase, 'idle', 1);
      p.root.rotation.y = st.face;
      return p;
    }

    function place(x, z) {
      holder.position.set(x, 0, z);
      st.goal = null;
      st.then = null;
    }

    function moveTo(x, z, speed, then) {
      st.goal = { x, z };
      st.speed = speed * st.scale;
      st.then = then || null;
    }

    function look(x, z) {
      st.look = x === null ? null : { x, z };
    }

    const hopFor = (pose) => (pose === 'jumpshot' ? 5.2 : pose === 'peace' ? 2.6 : pose === 'cheer' ? 3.2 : 0);

    function play(pose, dur, hop) {
      if (!p) return;
      st.pose = pose;
      st.t = dur;
      st.beat = -1;
      st.since = 0;
      st.bursts = 0;
      const h = hop === undefined ? hopFor(pose) : hop;
      if (h) st.hopV = h;
      if (pose === 'jumpshot' && fx.court) fx.court.shoot(p, st.scale);
    }

    function emote(emoji, dur = 1.6) {
      emo.material.map = Kit.gfx.emojiTexture(emoji);
      emo.material.needsUpdate = true;
      emo.visible = true;
      st.emoT = 0;
      st.emoDur = dur;
    }

    // hold a treat in his hand (side -1 left, 1 right), on the camera side of the hand
    function hold(emoji, side = 1, secs = 9) {
      treat.material.map = Kit.gfx.emojiTexture(emoji);
      treat.material.needsUpdate = true;
      (side < 0 ? p.armL : p.armR).add(treat);
      treat.position.set(0, -0.82, -0.32);
      treat.scale.setScalar(0.85);
      treat.visible = true;
      st.treatT = secs;
    }

    function wobble(amount = 0.2) {
      st.wob = 0;
      st.wobAmp = amount;
    }

    function update(dt) {
      if (!p || !holder.visible) return;
      // walking / running
      let moving = false;
      if (st.goal) {
        const dx = st.goal.x - holder.position.x, dz = st.goal.z - holder.position.z, d = Math.hypot(dx, dz);
        const step = st.speed * dt;
        if (d <= step || d < 1e-3) {
          holder.position.x = st.goal.x;
          holder.position.z = st.goal.z;
          st.goal = null;
          const cb = st.then;
          st.then = null;
          if (cb) cb();
        } else {
          holder.position.x += (dx / d) * step;
          holder.position.z += (dz / d) * step;
          st.faceGoal = Math.atan2(-dx, -dz);
          moving = true;
        }
      }
      if (!moving && st.look) {
        st.faceGoal = Math.atan2(-(st.look.x - holder.position.x), -(st.look.z - holder.position.z));
      }
      if (st.t > 0) {
        st.t -= dt;
        if (st.t <= 0) st.pose = 'idle';
      }
      const run = moving && st.speed > 2.4 * st.scale;
      const mode = moving && st.pose !== 'wave' ? (run ? 'run' : 'walk') : st.pose;
      st.phase += dt * (SPEED[mode] || 2.2);
      st.face += wrap(st.faceGoal - st.face) * (1 - Math.exp(-(moving ? 14 : 8) * dt));
      p.root.rotation.y = st.face;
      M8.pose(p, st.phase, mode, 1 - Math.exp(-16 * dt), moving);

      // hop
      st.hopV -= 14 * dt;
      st.hopY = Math.max(0, st.hopY + st.hopV * dt);
      if (st.hopY === 0 && st.hopV < 0) st.hopV = 0;
      p.root.position.y = st.hopY;
      shadow.material.opacity = 1 / (1 + st.hopY * 1.5);
      st.wob += dt;
      holder.rotation.z = st.wobAmp * Math.sin(st.wob * 17) * Math.exp(-st.wob * 3.2);
      holder.updateMatrixWorld(true);

      // celebration effects
      st.since += dt;
      if (mode === 'boxing') {
        const beat = Math.floor((((st.phase / (Math.PI * 2)) % 1) + 1) % 1 * 4);
        if (beat !== st.beat) {
          st.beat = beat;
          if (beat === 0 || beat === 2) {
            M8.sfx.punch();
            Kit.people.handWorld(p, beat === 0 ? -1 : 1, tmp);
            fx.flyers.add('💥', tmp.x, tmp.y, tmp.z + 0.4, rand(-0.6, 0.6), rand(0.4, 1), 0.65 * st.scale, 0.45);
          }
        }
      }
      if (mode === 'peace' && st.bursts < 3 && st.since > 0.15 + st.bursts * 0.55) {
        st.bursts++;
        for (const side of [-1, 1]) {
          Kit.people.handWorld(p, side, tmp);
          fx.flyers.add(Math.random() < 0.7 ? '✌️' : '⭐', tmp.x, tmp.y, tmp.z + 0.4, side * rand(0.3, 0.9), rand(1.6, 2.6), rand(0.45, 0.6) * st.scale, 1.1, rand(-1, 1), 0.15);
        }
      }

      // emoji over his head: pop in, bob, pop out
      if (emo.visible) {
        st.emoT += dt;
        const u = st.emoT / st.emoDur;
        if (u >= 1) emo.visible = false;
        else {
          const pop = Math.min(1, st.emoT / 0.15), out = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1;
          emo.scale.setScalar(0.8 * (pop < 1 ? pop * (1.3 - 0.3 * pop) : 1) * out);
          emo.material.rotation = Math.sin(st.emoT * 5) * 0.15;
          emo.position.x = 0;
          emo.position.z = 0;
          emo.position.y = (tag ? 3.4 : 2.9) + Math.sin(st.emoT * 4) * 0.06 + st.hopY;
        }
      }
      if (st.treatT > 0) {
        st.treatT -= dt;
        const k = Math.min(1, st.treatT / 0.25);
        treat.scale.setScalar(0.85 * k);
        if (st.treatT <= 0) {
          treat.visible = false;
          if (treat.parent) treat.parent.remove(treat);
        }
      }
    }

    // a tap on him: a sphere around his body
    const body = new T.Sphere(new T.Vector3(), 1);
    function hit(ray) {
      if (!holder.visible || !p) return false;
      body.center.set(holder.position.x, (1.05 + st.hopY) * st.scale, holder.position.z);
      body.radius = 0.85 * st.scale;
      return ray.intersectsSphere(body);
    }

    return {
      set, place, moveTo, look, play, emote, hold, wobble, update, hit,
      root: holder,
      get person() { return p; },
      get entry() { return entry; },
      get id() { return entry && entry.id; },
      get scale() { return st.scale; },
      get pose() { return st.pose; },
      get busy() { return st.t > 0; },
      get moving() { return !!st.goal; },
      get x() { return holder.position.x; },
      get z() { return holder.position.z; },
      get visible() { return holder.visible; },
      set visible(v) {
        holder.visible = v;
        if (!v) {
          emo.visible = false;
          st.goal = null;
          st.then = null;
        }
      },
      hand(side, out = new T.Vector3()) {
        holder.updateMatrixWorld(true);
        return Kit.people.handWorld(p, side, out);
      },
      head(out = new T.Vector3()) {
        return out.set(holder.position.x, (2.3 + st.hopY) * st.scale, holder.position.z);
      },
    };
  }

  M8.makeActor = makeActor;
})();
