/* ─────────────────────────────────────────────────────────
   THREE.JS PARTICLE SYSTEM — small distinct dots
   Positioned right-side, subtle, non-intrusive
───────────────────────────────────────────────────────── */
(function () {
  if (window.innerWidth < 768) return; // skip on mobile

  const COUNT  = 1400;
  const RADIUS = 0.9;

  /* ── Scene ── */
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('bg-canvas'),
    antialias: false,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  /* ── Fibonacci sphere ── */
  const posArr  = new Float32Array(COUNT * 3);
  const colArr  = new Float32Array(COUNT * 3);
  const sizeArr = new Float32Array(COUNT);
  const randArr = new Float32Array(COUNT);
  const phi     = Math.PI * (3 - Math.sqrt(5));

  // Mostly violet/purple with rare gold accents — like Dala
  const palette = [
    new THREE.Color('#6d28d9'), // deep violet  — 30%
    new THREE.Color('#6d28d9'),
    new THREE.Color('#6d28d9'),
    new THREE.Color('#8b5cf6'), // mid violet   — 30%
    new THREE.Color('#8b5cf6'),
    new THREE.Color('#8b5cf6'),
    new THREE.Color('#a78bfa'), // light violet — 20%
    new THREE.Color('#a78bfa'),
    new THREE.Color('#c4b5fd'), // pale violet  — 10%
    new THREE.Color('#d4a017'), // gold accent  — 10%
  ];

  for (let i = 0; i < COUNT; i++) {
    const y   = 1 - (i / (COUNT - 1)) * 2;
    const r   = Math.sqrt(Math.max(0, 1 - y * y));
    const ang = phi * i;
    const rad = RADIUS + (Math.random() - 0.5) * 0.3;

    posArr[i*3]   = Math.cos(ang) * r * rad;
    posArr[i*3+1] = y * rad;
    posArr[i*3+2] = Math.sin(ang) * r * rad;

    const c = palette[Math.floor(Math.random() * palette.length)];
    colArr[i*3]   = c.r;
    colArr[i*3+1] = c.g;
    colArr[i*3+2] = c.b;

    sizeArr[i] = 1.2 + Math.random() * 2.0; // 1.2–3.2px — visible but distinct
    randArr[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizeArr, 1));
  geo.setAttribute('aRand',    new THREE.BufferAttribute(randArr, 1));

  /* ── Material — crisp small dots, normal blend ── */
  const mat = new THREE.ShaderMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime:    { value: 0 },
      uScroll:  { value: 0 },
      uMouse:   { value: new THREE.Vector2() },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aRand;
      varying vec3  vColor;
      varying float vAlpha;
      uniform float uTime;
      uniform float uScroll;
      uniform vec2  uMouse;

      #define TAU 6.28318

      void main() {
        vColor = color;

        vec3 p = position;

        /* gentle individual float */
        float phase = aRand * TAU;
        float freq  = 0.25 + aRand * 0.35;
        p += normalize(p) * sin(uTime * freq + phase) * 0.05;

        /* scroll: particles drift outward + gentle twist */
        float t   = uScroll;
        vec3 radial = normalize(p) * t * (1.0 + aRand * 0.8);
        vec3 perp   = normalize(cross(p, vec3(0.0, 1.0, 0.001)));
        p += radial + perp * t * (aRand - 0.5) * 0.6;

        /* mouse parallax — each particle shifts by different amount */
        p.x += uMouse.x * (0.25 + aRand * 0.35);
        p.y += uMouse.y * (0.20 + aRand * 0.28);

        /* fade particles that drift far */
        float dist = length(position);
        vAlpha = smoothstep(2.8, 1.0, dist) * (0.7 + aRand * 0.3);

        vec4 mv      = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (250.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3  vColor;
      varying float vAlpha;
      uniform float uOpacity;

      void main() {
        vec2  uv = gl_PointCoord - 0.5;
        float d  = length(uv);
        if (d > 0.5) discard;

        /* hard-ish dot with soft edge — no glow bloom */
        float a = smoothstep(0.5, 0.25, d);
        gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
      }
    `,
  });

  const mesh = new THREE.Points(geo, mat);
  mesh.position.x = 1.6;
  mesh.position.y = 0.2;
  scene.add(mesh);

  /* ── State ── */
  let scroll = 0, targetScroll = 0;
  const mouse  = new THREE.Vector2();
  const tMouse = new THREE.Vector2();
  const clock  = new THREE.Clock();
  /* base position — sphere drifts toward cursor */
  const baseX = 1.6, baseY = 0.2;

  /* fade in via GSAP */
  gsap.to(mat.uniforms.uOpacity, { value: 1, duration: 1.5, ease: 'power2.out' });

  window.addEventListener('mousemove', e => {
    mouse.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* use Lenis scroll for accurate scroll progress */
  if (window.lenis) {
    window.lenis.on('scroll', ({ scroll, limit }) => {
      targetScroll = limit > 0 ? scroll / limit : 0;
    });
  } else {
    window.addEventListener('scroll', () => {
      const max = document.body.scrollHeight - window.innerHeight;
      targetScroll = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let animFrameId;

  function tick() {
    animFrameId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    scroll  += (targetScroll - scroll)  * 0.05;
    tMouse.x += (mouse.x - tMouse.x) * 0.05;
    tMouse.y += (mouse.y - tMouse.y) * 0.05;

    /* sphere position follows cursor — maps [-1,1] mouse to world offset */
    mesh.position.x += (baseX + tMouse.x * 1.8 - mesh.position.x) * 0.04;
    mesh.position.y += (baseY + tMouse.y * 1.2 - mesh.position.y) * 0.04;

    /* base rotation + scroll-driven spin */
    mesh.rotation.y = t * 0.05 + scroll * Math.PI * 2;
    mesh.rotation.x = Math.sin(t * 0.02) * 0.3 + scroll * 0.5;

    mat.uniforms.uTime.value   = t;
    mat.uniforms.uScroll.value = scroll;
    mat.uniforms.uMouse.value.copy(tMouse);

    renderer.render(scene, camera);
  }
  tick();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrameId);
    } else {
      clock.start();
      tick();
    }
  });
})();
