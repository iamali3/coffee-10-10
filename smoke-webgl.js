import * as THREE from './assets/vendor/three.module.min.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 600px)').matches;
const clockIntro = document.querySelector('#timeIntro');

function webGLAvailable() {
  try {
    const test = document.createElement('canvas');
    return Boolean(test.getContext('webgl2') || test.getContext('webgl'));
  } catch {
    return false;
  }
}

function makeSmokeSystem(canvas, { hero = false } = {}) {
  if (!canvas || reducedMotion || !webGLAvailable()) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.z = 7;
  const texture = new THREE.TextureLoader().load('./assets/effects/smoke-01.png');
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const palette = hero ? [0x4f4f4f, 0x4a4545, 0x554d4d] : [0x5a5a5a, 0x4f4f4f, 0x554d4d, 0x3f3f3f];
  const baseOpacity = hero ? 0.2 : 0.25;
  const materials = palette.map(color => new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent: true,
    opacity: baseOpacity,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  }));

  const density = mobile ? (hero ? 8 : 14) : (hero ? 15 : 30);
  const particles = [];
  const group = new THREE.Group();
  scene.add(group);

  function reset(particle, initial = false) {
    const top = Math.random() < 0.68;
    particle.mesh.position.set(
      top ? THREE.MathUtils.randFloat(-0.92, 0.92) : (Math.random() < 0.5 ? THREE.MathUtils.randFloat(-1.72, -1.25) : THREE.MathUtils.randFloat(1.25, 1.72)),
      top ? THREE.MathUtils.randFloat(0.72, 1.28) : THREE.MathUtils.randFloat(-0.72, 0.48),
      THREE.MathUtils.randFloat(-1.6, 0.55),
    );
    if (initial) particle.mesh.position.y += THREE.MathUtils.randFloat(0, 3.2);
    particle.velocity.set(THREE.MathUtils.randFloat(-0.05, 0.05), THREE.MathUtils.randFloat(0.13, 0.25), THREE.MathUtils.randFloat(-0.025, 0.025));
    particle.phase = Math.random() * Math.PI * 2;
    particle.spin = THREE.MathUtils.randFloat(-0.12, 0.12);
    particle.life = initial ? Math.random() : 0;
    particle.maxLife = THREE.MathUtils.randFloat(5.5, 9.5);
    particle.baseScale = THREE.MathUtils.randFloat(hero ? 0.9 : 1.05, hero ? 1.55 : 1.9);
    particle.mesh.scale.set(particle.baseScale * 1.3, particle.baseScale, 1);
    particle.mesh.rotation.z = Math.random() * Math.PI * 2;
  }

  for (let i = 0; i < density; i += 1) {
    const mesh = new THREE.Mesh(geometry, materials[i % materials.length]);
    mesh.frustumCulled = true;
    mesh.renderOrder = mesh.position.z > 0 ? 2 : 0;
    const particle = { mesh, velocity: new THREE.Vector3(), phase: 0, spin: 0, life: 0, maxLife: 1, baseScale: 1 };
    reset(particle, true);
    particles.push(particle);
    group.add(mesh);
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let last = performance.now();
  function render(now) {
    const delta = Math.min(0.034, (now - last) / 1000);
    last = now;
    const rect = clockIntro.getBoundingClientRect();
    const progress = hero ? 0.48 : Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
    const densityLevel = hero ? 0.52 : 0.2 + progress * 0.8;
    const turbulence = hero ? 0.07 : 0.025 + progress * 0.12;
    const lockedBoost = !hero && progress > 0.92 ? Math.sin((progress - 0.92) / 0.08 * Math.PI) * 0.09 : 0;
    materials.forEach(material => { material.opacity = baseOpacity * densityLevel; });

    particles.forEach((particle, index) => {
      particle.life += delta;
      if (particle.life >= particle.maxLife || particle.mesh.position.y > 3.8) reset(particle);
      const age = particle.life / particle.maxLife;
      const curl = Math.sin(now * 0.00055 + particle.phase + index * 0.31);
      particle.mesh.position.x += (particle.velocity.x + curl * (turbulence + lockedBoost)) * delta;
      particle.mesh.position.y += (particle.velocity.y + lockedBoost) * delta;
      particle.mesh.position.z += particle.velocity.z * delta;
      particle.mesh.rotation.z += particle.spin * delta;
      const expand = particle.baseScale * (1 + age * 0.75);
      particle.mesh.scale.set(expand * 1.35, expand, 1);
      particle.mesh.visible = index / density < Math.max(0.28, densityLevel);
    });

    group.rotation.z = Math.sin(now * 0.00012) * 0.035;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  return { renderer, scene, particles };
}

try {
  makeSmokeSystem(document.querySelector('.intro-live-smoke'));
  makeSmokeSystem(document.querySelector('.hero-live-smoke'), { hero: true });
  document.documentElement.classList.add('webgl-smoke-ready');
} catch (error) {
  console.warn('WebGL smoke unavailable; using CSS fallback.', error);
  document.documentElement.classList.add('webgl-smoke-fallback');
}
