import {
  ACESFilmicToneMapping,
  AmbientLight,
  Clock,
  Color,
  Euler,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Plane,
  PMREMGenerator,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ── Renderer wrapper ──
class ThreeApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.style.display = 'block';
    this.isDisposed = false;
    this._clock = new Clock();
    this._animState = { elapsed: 0, delta: 0 };
    this._isAnimating = false;
    this._isVisible = false;
    this._animFrameId = 0;

    this.onBeforeRender = () => {};
    this.onAfterResize = () => {};

    this.size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 1 };

    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
    this.cameraMaxAspect = undefined;

    this.scene = new Scene();

    this.renderer = new WebGLRenderer({
      canvas,
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true
    });
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.resize();
    this._initObservers();
  }

  _initObservers() {
    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.resize(), 100);
    });

    if (this.canvas.parentNode) {
      this._resizeObs = new ResizeObserver(() => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => this.resize(), 100);
      });
      this._resizeObs.observe(this.canvas.parentNode);
    }

    this._intersectObs = new IntersectionObserver(entries => {
      this._isAnimating = entries[0].isIntersecting;
      this._isAnimating ? this._startAnim() : this._stopAnim();
    }, { threshold: 0 });
    this._intersectObs.observe(this.canvas);

    document.addEventListener('visibilitychange', () => {
      if (this._isAnimating) {
        document.hidden ? this._stopAnim() : this._startAnim();
      }
    });
  }

  resize() {
    const parent = this.canvas.parentNode;
    const w = parent ? parent.offsetWidth || window.innerWidth : window.innerWidth;
    const h = parent ? parent.offsetHeight || window.innerHeight : window.innerHeight;
    this.size.width = w;
    this.size.height = h;
    this.size.ratio = w / h;

    this.camera.aspect = w / h;
    if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
      const tanFov = Math.tan(MathUtils.degToRad(this.cameraFov / 2));
      const newTan = tanFov / (this.camera.aspect / this.cameraMaxAspect);
      this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(newTan));
    } else {
      this.camera.fov = this.cameraFov;
    }
    this.camera.updateProjectionMatrix();
    this._updateWorldSize();

    this.renderer.setSize(w, h);
    let pr = window.devicePixelRatio;
    if (pr > 2) pr = 2;
    this.renderer.setPixelRatio(pr);
    this.size.pixelRatio = pr;

    this.onAfterResize(this.size);
  }

  _updateWorldSize() {
    const fovRad = (this.camera.fov * Math.PI) / 180;
    this.size.wHeight = 2 * Math.tan(fovRad / 2) * this.camera.position.length();
    this.size.wWidth = this.size.wHeight * this.camera.aspect;
  }

  _startAnim() {
    if (this._isVisible) return;
    this._isVisible = true;
    this._clock.start();
    const loop = () => {
      this._animFrameId = requestAnimationFrame(loop);
      this._animState.delta = this._clock.getDelta();
      this._animState.elapsed += this._animState.delta;
      this.onBeforeRender(this._animState);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  _stopAnim() {
    if (this._isVisible) {
      cancelAnimationFrame(this._animFrameId);
      this._isVisible = false;
      this._clock.stop();
    }
  }

  dispose() {
    this._stopAnim();
    this.scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (obj.material) {
          Object.values(obj.material).forEach(v => {
            if (v && typeof v === 'object' && typeof v.dispose === 'function') v.dispose();
          });
          obj.material.dispose();
        }
      }
    });
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this._resizeObs?.disconnect();
    this._intersectObs?.disconnect();
    this.isDisposed = true;
  }
}

// ── Physics ──
class Physics {
  constructor(cfg) {
    this.config = cfg;
    this.positionData = new Float32Array(3 * cfg.count).fill(0);
    this.velocityData = new Float32Array(3 * cfg.count).fill(0);
    this.sizeData = new Float32Array(cfg.count).fill(1);
    this.center = new Vector3();
    this._initPositions();
    this._initSizes();
  }

  _initPositions() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx] = MathUtils.randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = MathUtils.randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = MathUtils.randFloatSpread(2 * config.maxZ);
    }
  }

  _initSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = MathUtils.randFloat(config.minSize, config.maxSize);
    }
  }

  update(dt) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let start = 0;

    if (config.controlSphere0) {
      start = 1;
      const p = new Vector3().fromArray(positionData, 0);
      p.lerp(center, 0.1).toArray(positionData, 0);
      velocityData[0] = velocityData[1] = velocityData[2] = 0;
    }

    for (let i = start; i < config.count; i++) {
      const b = 3 * i;
      const pos = new Vector3().fromArray(positionData, b);
      const vel = new Vector3().fromArray(velocityData, b);
      vel.y -= dt.delta * config.gravity * sizeData[i];
      vel.multiplyScalar(config.friction);
      vel.clampLength(0, config.maxVelocity);
      pos.add(vel);
      pos.toArray(positionData, b);
      vel.toArray(velocityData, b);
    }

    for (let i = start; i < config.count; i++) {
      const b = 3 * i;
      const pos = new Vector3().fromArray(positionData, b);
      const vel = new Vector3().fromArray(velocityData, b);
      const r = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const ob = 3 * j;
        const oPos = new Vector3().fromArray(positionData, ob);
        const oVel = new Vector3().fromArray(velocityData, ob);
        const diff = new Vector3().copy(oPos).sub(pos);
        const dist = diff.length();
        const sumR = r + sizeData[j];
        if (dist < sumR) {
          const overlap = sumR - dist;
          const corr = diff.normalize().multiplyScalar(0.5 * overlap);
          const velCorr = corr.clone().multiplyScalar(Math.max(vel.length(), 1));
          pos.sub(corr);
          vel.sub(velCorr);
          pos.toArray(positionData, b);
          vel.toArray(velocityData, b);
          oPos.add(corr);
          oVel.add(corr.clone().multiplyScalar(Math.max(oVel.length(), 1)));
          oPos.toArray(positionData, ob);
          oVel.toArray(velocityData, ob);
        }
      }

      if (config.controlSphere0) {
        const diff = new Vector3().copy(new Vector3().fromArray(positionData, 0)).sub(pos);
        const d = diff.length();
        const sumR0 = r + sizeData[0];
        if (d < sumR0) {
          const corr = diff.normalize().multiplyScalar(sumR0 - d);
          const velCorr = corr.clone().multiplyScalar(Math.max(vel.length(), 2));
          pos.sub(corr);
          vel.sub(velCorr);
        }
      }

      if (Math.abs(pos.x) + r > config.maxX) {
        pos.x = Math.sign(pos.x) * (config.maxX - r);
        vel.x = -vel.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(pos.y) + r > config.maxY) {
          pos.y = Math.sign(pos.y) * (config.maxY - r);
          vel.y = -vel.y * config.wallBounce;
        }
      } else if (pos.y - r < -config.maxY) {
        pos.y = -config.maxY + r;
        vel.y = -vel.y * config.wallBounce;
      }
      const maxB = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(pos.z) + r > maxB) {
        pos.z = Math.sign(pos.z) * (config.maxZ - r);
        vel.z = -vel.z * config.wallBounce;
      }

      pos.toArray(positionData, b);
      vel.toArray(velocityData, b);
    }
  }
}

// ── Config ──
const CONFIG = {
  count: 150,
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

// ── Pointer tracking ──
function setupPointer(canvas, onMove, onLeave) {
  const nPos = new Vector2();
  const pos = new Vector2();

  function updateNorm(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pos.set(clientX - rect.left, clientY - rect.top);
    nPos.set((pos.x / rect.width) * 2 - 1, (-pos.y / rect.height) * 2 + 1);
    return (
      clientX >= rect.left && clientX <= rect.left + rect.width &&
      clientY >= rect.top && clientY <= rect.top + rect.height
    );
  }

  let hovering = false;

  document.body.addEventListener('pointermove', e => {
    if (updateNorm(e.clientX, e.clientY)) {
      hovering = true;
      onMove(nPos);
    } else if (hovering) {
      hovering = false;
      onLeave();
    }
  });

  document.body.addEventListener('pointerleave', () => {
    if (hovering) {
      hovering = false;
      onLeave();
    }
  });

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
      e.preventDefault();
      if (updateNorm(e.touches[0].clientX, e.touches[0].clientY)) {
        hovering = true;
        onMove(nPos);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length > 0) {
      e.preventDefault();
      if (updateNorm(e.touches[0].clientX, e.touches[0].clientY)) {
        if (!hovering) hovering = true;
        onMove(nPos);
      }
    }
  }, { passive: false });

  const endTouch = () => {
    if (hovering) {
      hovering = false;
      onLeave();
    }
  };
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);
}

// ── Init ──
const canvas = document.getElementById('ballpit');
const app = new ThreeApp(canvas);
app.renderer.toneMapping = ACESFilmicToneMapping;
app.renderer.shadowMap.enabled = true;
app.camera.position.set(0, 0, 20);
app.camera.lookAt(0, 0, 0);
app.cameraMaxAspect = 1.5;
app.resize();

const pmrem = new PMREMGenerator(app.renderer);
const roomEnv = new RoomEnvironment();
const envMap = pmrem.fromScene(roomEnv).texture;
app.scene.environment = envMap;

const ambientLight = new AmbientLight(0xffffff, 0.3);
app.scene.add(ambientLight);

const pointLight = new PointLight(0xCDFF00, 50);
pointLight.position.set(0, 0, 5);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;
pointLight.shadow.radius = 4;
app.scene.add(pointLight);

const physics = new Physics(CONFIG);
const tmpObj = new Object3D();

const rotations = [];
const spinAxes = [];
for (let i = 0; i < CONFIG.count; i++) {
  const q = new Quaternion();
  q.setFromEuler(new Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  ));
  rotations.push(q);
  spinAxes.push(new Vector3(
    MathUtils.randFloatSpread(1),
    MathUtils.randFloatSpread(1),
    MathUtils.randFloatSpread(1)
  ).normalize());
}

const loader = new GLTFLoader();
loader.load('tennis_ball_model/scene.gltf', gltf => {
  const meshes = [];
  gltf.scene.traverse(child => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });

  const container = new Group();
  const instancedMeshes = [];

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);

    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);

    const mat = mesh.material.clone();
    mat.envMap = envMap;
    mat.envMapIntensity = 0.5;
    mat.needsUpdate = true;

    const im = new InstancedMesh(geo, mat, CONFIG.count);
    im.frustumCulled = false;
    im.castShadow = true;
    im.receiveShadow = true;
    instancedMeshes.push(im);
    container.add(im);
  }

  app.scene.add(container);

  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const intersection = new Vector3();

  setupPointer(
    canvas,
    nPos => {
      raycaster.setFromCamera(nPos, app.camera);
      app.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersection);
      physics.center.copy(intersection);
      CONFIG.controlSphere0 = true;
    },
    () => {
      CONFIG.controlSphere0 = false;
    }
  );

  const spinQ = new Quaternion();

  app.onBeforeRender = dt => {
    physics.update(dt);

    for (let i = 0; i < CONFIG.count; i++) {
      tmpObj.position.fromArray(physics.positionData, 3 * i);

      const vel = new Vector3().fromArray(physics.velocityData, 3 * i);
      const speed = vel.length();
      if (speed > 0.001) {
        spinQ.setFromAxisAngle(spinAxes[i], speed * 2);
        rotations[i].premultiply(spinQ);
      }
      tmpObj.quaternion.copy(rotations[i]);

      if (i === 0 && CONFIG.followCursor === false) {
        tmpObj.scale.setScalar(0);
      } else {
        tmpObj.scale.setScalar(physics.sizeData[i]);
      }

      tmpObj.updateMatrix();

      for (const im of instancedMeshes) {
        im.setMatrixAt(i, tmpObj.matrix);
      }

      if (i === 0) pointLight.position.copy(tmpObj.position);
    }

    for (const im of instancedMeshes) {
      im.instanceMatrix.needsUpdate = true;
    }
  };

  app.onAfterResize = size => {
    CONFIG.maxX = size.wWidth / 2;
    CONFIG.maxY = size.wHeight / 2;
  };
});
