"use client";

import { useEffect, useRef } from 'react';
import {
  Vector3,
  MeshPhysicalMaterial,
  InstancedMesh,
  Clock,
  AmbientLight,
  SphereGeometry,
  ShaderChunk,
  Scene,
  Color,
  Object3D,
  SRGBColorSpace,
  MathUtils,
  PMREMGenerator,
  Vector2,
  WebGLRenderer,
  PerspectiveCamera,
  PointLight,
  ACESFilmicToneMapping,
  Plane,
  Raycaster
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ─── Three.js Scene ───────────────────────────────────────────────────────────

class ThreeScene {
  #config: any;
  canvas!: HTMLCanvasElement;
  camera!: PerspectiveCamera;
  cameraMinAspect?: number;
  cameraMaxAspect?: number;
  cameraFov!: number;
  maxPixelRatio?: number;
  minPixelRatio?: number;
  scene!: Scene;
  renderer!: WebGLRenderer;
  #postprocessing: any;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#renderScene;
  onBeforeRender: (time: any) => void = () => {};
  onAfterRender: (time: any) => void = () => {};
  onAfterResize: (size: any) => void = () => {};
  #isIntersecting = false;
  #isAnimating = false;
  isDisposed = false;
  #intersectionObserver?: IntersectionObserver;
  #resizeObserver?: ResizeObserver;
  #resizeTimeout: any;
  #clock = new Clock();
  #time = { elapsed: 0, delta: 0 };
  #animationFrameId?: number;

  constructor(config: any) {
    this.#config = { ...config };
    this.#initCamera();
    this.#initScene();
    this.#initRenderer();
    this.resize();
    this.#addEventListeners();
  }

  #initCamera() {
    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
  }

  #initScene() {
    this.scene = new Scene();
  }

  #initRenderer() {
    if (this.#config.canvas) {
      this.canvas = this.#config.canvas;
    } else if (this.#config.id) {
      this.canvas = document.getElementById(this.#config.id) as HTMLCanvasElement;
    } else {
      throw new Error('Three: Missing canvas or id parameter');
    }
    this.canvas.style.display = 'block';
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      powerPreference: 'high-performance',
      ...(this.#config.rendererOptions ?? {})
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
  }

  #addEventListeners() {
    if (!(this.#config.size instanceof Object)) {
      window.addEventListener('resize', this.#debouncedResize.bind(this));
      if (this.#config.size === 'parent' && this.canvas.parentNode) {
        this.#resizeObserver = new ResizeObserver(this.#debouncedResize.bind(this));
        this.#resizeObserver.observe(this.canvas.parentNode as Element);
      }
    }
    this.#intersectionObserver = new IntersectionObserver(this.#handleIntersection.bind(this), {
      root: null,
      rootMargin: '0px',
      threshold: 0
    });
    this.#intersectionObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.#handleVisibilityChange.bind(this));
  }

  #removeEventListeners() {
    window.removeEventListener('resize', this.#debouncedResize.bind(this));
    this.#resizeObserver?.disconnect();
    this.#intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.#handleVisibilityChange.bind(this));
  }

  #handleIntersection(entries: IntersectionObserverEntry[]) {
    this.#isIntersecting = entries[0].isIntersecting;
    this.#isIntersecting ? this.#startAnimation() : this.#stopAnimation();
  }

  #handleVisibilityChange() {
    if (this.#isIntersecting) {
      document.hidden ? this.#stopAnimation() : this.#startAnimation();
    }
  }

  #debouncedResize() {
    if (this.#resizeTimeout) clearTimeout(this.#resizeTimeout);
    this.#resizeTimeout = setTimeout(this.resize.bind(this), 100);
  }

  resize() {
    let width: number, height: number;
    if (this.#config.size instanceof Object) {
      width = this.#config.size.width;
      height = this.#config.size.height;
    } else if (this.#config.size === 'parent' && this.canvas.parentNode) {
      width = (this.canvas.parentNode as HTMLElement).offsetWidth;
      height = (this.canvas.parentNode as HTMLElement).offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;
    this.#updateCamera();
    this.#updateRendererSize();
    this.onAfterResize(this.size);
  }

  #updateCamera() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.#adjustFov(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.#adjustFov(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  #adjustFov(aspect: number) {
    const t = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / aspect);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(t));
  }

  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const fovRad = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(fovRad / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    }
  }

  #updateRendererSize() {
    this.renderer.setSize(this.size.width, this.size.height);
    this.#postprocessing?.setSize(this.size.width, this.size.height);
    let pixelRatio = window.devicePixelRatio;
    if (this.maxPixelRatio && pixelRatio > this.maxPixelRatio) pixelRatio = this.maxPixelRatio;
    else if (this.minPixelRatio && pixelRatio < this.minPixelRatio) pixelRatio = this.minPixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.size.pixelRatio = pixelRatio;
  }

  #startAnimation() {
    if (this.#isAnimating) return;
    const animate = () => {
      this.#animationFrameId = requestAnimationFrame(animate);
      this.#time.delta = this.#clock.getDelta();
      this.#time.elapsed += this.#time.delta;
      this.onBeforeRender(this.#time);
      this.render();
      this.onAfterRender(this.#time);
    };
    this.#isAnimating = true;
    this.#clock.start();
    animate();
  }

  #stopAnimation() {
    if (this.#isAnimating && this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#isAnimating = false;
      this.#clock.stop();
    }
  }

  #renderScene() {
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.scene.traverse((object: any) => {
      if (object.isMesh && object.material) {
        Object.keys(object.material).forEach(key => {
          const prop = object.material[key];
          if (prop && typeof prop.dispose === 'function') prop.dispose();
        });
        object.material.dispose();
        object.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    this.#removeEventListeners();
    this.#stopAnimation();
    this.clear();
    this.#postprocessing?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.isDisposed = true;
  }
}

// ─── Interaction ──────────────────────────────────────────────────────────────

const activeInteractions = new Map<Element, any>();
const mousePosition = new Vector2();
let isListening = false;

function setupInteraction(config: any) {
  const interaction = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    touching: false,
    onEnter() {},
    onMove() {},
    onClick() {},
    onLeave() {},
    ...config
  };

  if (!activeInteractions.has(config.domElement)) {
    activeInteractions.set(config.domElement, interaction);
    if (!isListening) {
      document.body.addEventListener('pointermove', onPointerMove);
      document.body.addEventListener('pointerleave', onPointerLeave);
      document.body.addEventListener('click', onClickEvent);
      document.body.addEventListener('touchstart', onTouchStart, { passive: false });
      document.body.addEventListener('touchmove', onTouchMove, { passive: false });
      document.body.addEventListener('touchend', onTouchEnd, { passive: false });
      document.body.addEventListener('touchcancel', onTouchEnd, { passive: false });
      isListening = true;
    }
  }

  interaction.dispose = () => {
    activeInteractions.delete(config.domElement);
    if (activeInteractions.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeave);
      document.body.removeEventListener('click', onClickEvent);
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);
      isListening = false;
    }
  };
  return interaction;
}

function onPointerMove(e: PointerEvent) {
  mousePosition.set(e.clientX, e.clientY);
  processInteractions();
}

function processInteractions() {
  for (const [elem, interaction] of activeInteractions) {
    const rect = elem.getBoundingClientRect();
    if (isInsideRect(rect)) {
      updatePosition(interaction, rect);
      if (!interaction.hover) { interaction.hover = true; interaction.onEnter(interaction); }
      interaction.onMove(interaction);
    } else if (interaction.hover && !interaction.touching) {
      interaction.hover = false;
      interaction.onLeave(interaction);
    }
  }
}

function onClickEvent(e: MouseEvent) {
  mousePosition.set(e.clientX, e.clientY);
  for (const [elem, interaction] of activeInteractions) {
    const rect = elem.getBoundingClientRect();
    updatePosition(interaction, rect);
    if (isInsideRect(rect)) interaction.onClick(interaction);
  }
}

function onPointerLeave() {
  for (const interaction of activeInteractions.values()) {
    if (interaction.hover) { interaction.hover = false; interaction.onLeave(interaction); }
  }
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    e.preventDefault();
    mousePosition.set(e.touches[0].clientX, e.touches[0].clientY);
    for (const [elem, interaction] of activeInteractions) {
      const rect = elem.getBoundingClientRect();
      if (isInsideRect(rect)) {
        interaction.touching = true;
        updatePosition(interaction, rect);
        if (!interaction.hover) { interaction.hover = true; interaction.onEnter(interaction); }
        interaction.onMove(interaction);
      }
    }
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    e.preventDefault();
    mousePosition.set(e.touches[0].clientX, e.touches[0].clientY);
    for (const [elem, interaction] of activeInteractions) {
      const rect = elem.getBoundingClientRect();
      updatePosition(interaction, rect);
      if (isInsideRect(rect)) {
        if (!interaction.hover) { interaction.hover = true; interaction.touching = true; interaction.onEnter(interaction); }
        interaction.onMove(interaction);
      } else if (interaction.hover && interaction.touching) {
        interaction.onMove(interaction);
      }
    }
  }
}

function onTouchEnd() {
  for (const interaction of activeInteractions.values()) {
    if (interaction.touching) {
      interaction.touching = false;
      if (interaction.hover) { interaction.hover = false; interaction.onLeave(interaction); }
    }
  }
}

function updatePosition(interaction: any, rect: DOMRect) {
  interaction.position.x = mousePosition.x - rect.left;
  interaction.position.y = mousePosition.y - rect.top;
  interaction.nPosition.x = (interaction.position.x / rect.width) * 2 - 1;
  interaction.nPosition.y = (-interaction.position.y / rect.height) * 2 + 1;
}

function isInsideRect(rect: DOMRect) {
  return (
    mousePosition.x >= rect.left && mousePosition.x <= rect.left + rect.width &&
    mousePosition.y >= rect.top && mousePosition.y <= rect.top + rect.height
  );
}

// ─── Physics ──────────────────────────────────────────────────────────────────

const { randFloat, randFloatSpread } = MathUtils;
const v1 = new Vector3(), v2 = new Vector3(), v3 = new Vector3();
const v4 = new Vector3(), v5 = new Vector3(), v6 = new Vector3();
const v7 = new Vector3(), v8 = new Vector3(), v9 = new Vector3(), v10 = new Vector3();

class Physics {
  config: any;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;
  center: Vector3;

  constructor(config: any) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new Vector3();
    this.#initPositions();
    this.setSizes();
  }

  #initPositions() {
    const { config, positionData, velocityData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      // Spread balls across the whole arena
      positionData[idx]     = randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = randFloatSpread(2 * config.maxZ);
      // Give every ball a random kick so they're already in motion
      velocityData[idx]     = randFloatSpread(0.18);
      velocityData[idx + 1] = randFloat(-0.08, 0.22); // slight upward bias
      velocityData[idx + 2] = randFloatSpread(0.06);
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = randFloat(config.minSize, config.maxSize);
    }
  }

  update(time: { delta: number }) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let start = 0;

    if (config.controlSphere0) {
      start = 1;
      v1.fromArray(positionData, 0);
      v1.lerp(center, 0.1).toArray(positionData, 0);
      v4.set(0, 0, 0).toArray(velocityData, 0);
    }

    // Apply gravity + friction
    for (let i = start; i < config.count; i++) {
      const base = 3 * i;
      v2.fromArray(positionData, base);
      v5.fromArray(velocityData, base);
      v5.y -= time.delta * config.gravity * sizeData[i];
      v5.multiplyScalar(config.friction);
      v5.clampLength(0, config.maxVelocity);
      v2.add(v5);
      v2.toArray(positionData, base);
      v5.toArray(velocityData, base);
    }

    // Collision resolution
    for (let i = start; i < config.count; i++) {
      const base = 3 * i;
      v2.fromArray(positionData, base);
      v5.fromArray(velocityData, base);
      const radius = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const otherBase = 3 * j;
        v3.fromArray(positionData, otherBase);
        v6.fromArray(velocityData, otherBase);
        const otherRadius = sizeData[j];
        v7.copy(v3).sub(v2);
        const dist = v7.length();
        const sumR = radius + otherRadius;
        if (dist < sumR) {
          const overlap = sumR - dist;
          v8.copy(v7).normalize().multiplyScalar(0.5 * overlap);
          v9.copy(v8).multiplyScalar(Math.max(v5.length(), 1));
          v10.copy(v8).multiplyScalar(Math.max(v6.length(), 1));
          v2.sub(v8); v5.sub(v9);
          v2.toArray(positionData, base); v5.toArray(velocityData, base);
          v3.add(v8); v6.add(v10);
          v3.toArray(positionData, otherBase); v6.toArray(velocityData, otherBase);
        }
      }

      // Cursor sphere collision
      if (config.controlSphere0) {
        v7.copy(v1).sub(v2);
        const dist = v7.length();
        const sumR0 = radius + sizeData[0];
        if (dist < sumR0) {
          const diff = sumR0 - dist;
          v8.copy(v7.normalize()).multiplyScalar(diff);
          v9.copy(v8).multiplyScalar(Math.max(v5.length(), 2));
          v2.sub(v8); v5.sub(v9);
        }
      }

      // Wall collisions
      if (Math.abs(v2.x) + radius > config.maxX) {
        v2.x = Math.sign(v2.x) * (config.maxX - radius);
        v5.x = -v5.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(v2.y) + radius > config.maxY) {
          v2.y = Math.sign(v2.y) * (config.maxY - radius);
          v5.y = -v5.y * config.wallBounce;
        }
      } else if (v2.y - radius < -config.maxY) {
        v2.y = -config.maxY + radius;
        v5.y = -v5.y * config.wallBounce;
      }
      const maxZ = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(v2.z) + radius > maxZ) {
        v2.z = Math.sign(v2.z) * (maxZ - radius);
        v5.z = -v5.z * config.wallBounce;
      }

      v2.toArray(positionData, base);
      v5.toArray(velocityData, base);
    }
  }
}

// ─── Subsurface scattering material ──────────────────────────────────────────

class TennisMaterial extends MeshPhysicalMaterial {
  uniforms: any;
  onBeforeCompile2?: (shader: any) => void;

  constructor(options: any) {
    super(options);
    this.uniforms = {
      thicknessDistortion: { value: 0.15 },
      thicknessAmbient:    { value: 0.05 },
      thicknessAttenuation:{ value: 0.2  },
      thicknessPower:      { value: 2    },
      thicknessScale:      { value: 12   }
    };
    this.defines.USE_UV = '';
    this.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader =
        `uniform float thicknessPower;
        uniform float thicknessScale;
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
        ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor.xyz;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }
        void main() {`
      );
      const replaced = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        `RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);`
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', replaced);
      if (this.onBeforeCompile2) this.onBeforeCompile2(shader);
    };
  }
}

// ─── Default config (tennis balls) ───────────────────────────────────────────

const defaultConfig = {
  count: 100,
  // PadelXP green palette — matches brand identity
  colors: [0x7DC828, 0x6ab422, 0x9adf3a],
  ambientColor: 0xeeffcc,
  ambientIntensity: 1.4,
  lightIntensity: 160,
  materialParams: {
    metalness: 0.0,
    roughness: 0.88,
    clearcoat: 0.05,
    clearcoatRoughness: 0.5
  },
  minSize: 0.55,
  maxSize: 0.8,
  size0: 1,
  gravity: 0.45,        // gentle gravity — balls fall slowly and bounce high
  friction: 0.9995,     // near-zero air resistance so balls keep bouncing
  wallBounce: 0.92,     // tennis balls are very bouncy
  maxVelocity: 0.35,    // enough headroom for energetic bouncing
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: false
};

// ─── Color gradient helper ───────────────────────────────────────────────────

function makeGradient(hexColors: number[]) {
  const colors = hexColors.map(h => new Color(h));
  return {
    getColorAt(ratio: number, out = new Color()) {
      const scaled = Math.max(0, Math.min(1, ratio)) * (colors.length - 1);
      const idx = Math.floor(scaled);
      const start = colors[idx];
      if (idx >= colors.length - 1) { out.copy(start); return out; }
      const alpha = scaled - idx;
      const end = colors[idx + 1];
      out.r = start.r + alpha * (end.r - start.r);
      out.g = start.g + alpha * (end.g - start.g);
      out.b = start.b + alpha * (end.b - start.b);
      return out;
    }
  };
}

// ─── Instanced spheres ────────────────────────────────────────────────────────

const dummy = new Object3D();

class BallpitSpheres extends InstancedMesh {
  config: any;
  physics: Physics;
  ambientLight!: AmbientLight;
  light!: PointLight;

  constructor(renderer: WebGLRenderer, options: any = {}) {
    const config = { ...defaultConfig, ...options };
    const envTexture = new PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;
    const geometry = new SphereGeometry(1, 32, 32);
    const material = new TennisMaterial({ envMap: envTexture, ...config.materialParams });
    material.envMapRotation.x = -Math.PI / 2;
    super(geometry, material, config.count);
    this.config = config;
    this.physics = new Physics(config);
    this.#initLights();
    this.setColors(config.colors);
  }

  #initLights() {
    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new PointLight(this.config.colors[0], this.config.lightIntensity);
    this.add(this.light);
  }

  setColors(hexColors: number[]) {
    if (!Array.isArray(hexColors) || hexColors.length < 2) return;
    const gradient = makeGradient(hexColors);
    for (let i = 0; i < this.count; i++) {
      this.setColorAt(i, gradient.getColorAt(i / this.count));
      if (i === 0) this.light.color.copy(gradient.getColorAt(0));
    }
    if (this.instanceColor) this.instanceColor.needsUpdate = true;
  }

  update(time: { delta: number }) {
    this.physics.update(time);
    for (let i = 0; i < this.count; i++) {
      dummy.position.fromArray(this.physics.positionData, 3 * i);
      if (i === 0 && !this.config.followCursor) {
        dummy.scale.setScalar(0);
      } else {
        dummy.scale.setScalar(this.physics.sizeData[i]);
      }
      dummy.updateMatrix();
      this.setMatrixAt(i, dummy.matrix);
      if (i === 0) this.light.position.copy(dummy.position);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

// ─── Scene factory ────────────────────────────────────────────────────────────

function createBallpit(canvas: HTMLCanvasElement, options: any = {}) {
  const three = new ThreeScene({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });

  let spheres: BallpitSpheres;
  three.renderer.toneMapping = ACESFilmicToneMapping;
  three.camera.position.set(0, 0, 20);
  three.camera.lookAt(0, 0, 0);
  three.cameraMaxAspect = 1.5;
  three.resize();
  init(options);

  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  let paused = false;

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';

  const interaction = setupInteraction({
    domElement: canvas,
    onMove() {
      raycaster.setFromCamera(interaction.nPosition, three.camera);
      three.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, hit);
      spheres.physics.center.copy(hit);
      spheres.config.controlSphere0 = true;
    },
    onLeave() {
      spheres.config.controlSphere0 = false;
    }
  });

  function init(config: any) {
    if (spheres) { three.clear(); three.scene.remove(spheres); }
    spheres = new BallpitSpheres(three.renderer, config);
    three.scene.add(spheres);
  }

  three.onBeforeRender = (time) => { if (!paused) spheres.update(time); };
  three.onAfterResize = (size) => {
    spheres.config.maxX = size.wWidth / 2;
    spheres.config.maxY = size.wHeight / 2;
  };

  return {
    three,
    get spheres() { return spheres; },
    togglePause() { paused = !paused; },
    dispose() { interaction.dispose(); three.dispose(); }
  };
}

// ─── React component ──────────────────────────────────────────────────────────

interface BallpitProps {
  className?: string;
  followCursor?: boolean;
  count?: number;
  gravity?: number;
  friction?: number;
  wallBounce?: number;
  colors?: number[];
}

export default function Ballpit({ className = '', followCursor = true, ...props }: BallpitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    instanceRef.current = createBallpit(canvas, { followCursor, ...props });
    return () => { instanceRef.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      className={className}
      ref={canvasRef}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}
