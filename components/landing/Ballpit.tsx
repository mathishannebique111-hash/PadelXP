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
  Raycaster,
  TextureLoader
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

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
  onBeforeRender = (time: any) => {};
  onAfterRender = (time: any) => {};
  onAfterResize = (size: any) => {};
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
    const options = {
      canvas: this.canvas,
      powerPreference: 'high-performance' as const,
      ...(this.#config.rendererOptions ?? {})
    };
    this.renderer = new WebGLRenderer(options);
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
    let width, height;
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
    if (this.maxPixelRatio && pixelRatio > this.maxPixelRatio) {
      pixelRatio = this.maxPixelRatio;
    } else if (this.minPixelRatio && pixelRatio < this.minPixelRatio) {
      pixelRatio = this.minPixelRatio;
    }
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
      if (object.isMesh && typeof object.material === 'object' && object.material !== null) {
        Object.keys(object.material).forEach(key => {
          const prop = object.material[key];
          if (prop !== null && typeof prop === 'object' && typeof prop.dispose === 'function') {
            prop.dispose();
          }
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

const activeInteractions = new Map();
const mousePosition = new Vector2();
let isInteractionListening = false;

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
    if (!isInteractionListening) {
      document.body.addEventListener('pointermove', onPointerMove);
      document.body.addEventListener('pointerleave', onPointerLeave);
      document.body.addEventListener('click', onClick);

      document.body.addEventListener('touchstart', onTouchStart, { passive: false });
      document.body.addEventListener('touchmove', onTouchMove, { passive: false });
      document.body.addEventListener('touchend', onTouchEnd, { passive: false });
      document.body.addEventListener('touchcancel', onTouchEnd, { passive: false });

      isInteractionListening = true;
    }
  }

  interaction.dispose = () => {
    activeInteractions.delete(config.domElement);
    if (activeInteractions.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeave);
      document.body.removeEventListener('click', onClick);

      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);

      isInteractionListening = false;
    }
  };
  return interaction;
}

function onPointerMove(e: PointerEvent) {
  mousePosition.x = e.clientX;
  mousePosition.y = e.clientY;
  processInteractions();
}

function processInteractions() {
  for (const [elem, interaction] of activeInteractions) {
    const rect = elem.getBoundingClientRect();
    if (isInsideRect(rect)) {
      updateInteractionPosition(interaction, rect);
      if (!interaction.hover) {
        interaction.hover = true;
        interaction.onEnter(interaction);
      }
      interaction.onMove(interaction);
    } else if (interaction.hover && !interaction.touching) {
      interaction.hover = false;
      interaction.onLeave(interaction);
    }
  }
}

function onClick(e: MouseEvent) {
  mousePosition.x = e.clientX;
  mousePosition.y = e.clientY;
  for (const [elem, interaction] of activeInteractions) {
    const rect = elem.getBoundingClientRect();
    updateInteractionPosition(interaction, rect);
    if (isInsideRect(rect)) interaction.onClick(interaction);
  }
}

function onPointerLeave() {
  for (const interaction of activeInteractions.values()) {
    if (interaction.hover) {
      interaction.hover = false;
      interaction.onLeave(interaction);
    }
  }
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    mousePosition.x = e.touches[0].clientX;
    mousePosition.y = e.touches[0].clientY;

    for (const [elem, interaction] of activeInteractions) {
      const rect = elem.getBoundingClientRect();
      if (isInsideRect(rect)) {
        interaction.touching = true;
        updateInteractionPosition(interaction, rect);
        if (!interaction.hover) {
          interaction.hover = true;
          interaction.onEnter(interaction);
        }
        interaction.onMove(interaction);
      }
    }
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    //e.preventDefault(); // allow scrolling
    mousePosition.x = e.touches[0].clientX;
    mousePosition.y = e.touches[0].clientY;

    for (const [elem, interaction] of activeInteractions) {
      const rect = elem.getBoundingClientRect();
      updateInteractionPosition(interaction, rect);

      if (isInsideRect(rect)) {
        if (!interaction.hover) {
          interaction.hover = true;
          interaction.touching = true;
          interaction.onEnter(interaction);
        }
        interaction.onMove(interaction);
      } else if (interaction.hover && interaction.touching) {
        interaction.onMove(interaction);
      }
    }
  }
}

function onTouchEnd() {
  for (const [, interaction] of activeInteractions) {
    if (interaction.touching) {
      interaction.touching = false;
      if (interaction.hover) {
        interaction.hover = false;
        interaction.onLeave(interaction);
      }
    }
  }
}

function updateInteractionPosition(interaction: any, rect: DOMRect) {
  const { position, nPosition } = interaction;
  position.x = mousePosition.x - rect.left;
  position.y = mousePosition.y - rect.top;
  nPosition.x = (position.x / rect.width) * 2 - 1;
  nPosition.y = (-position.y / rect.height) * 2 + 1;
}

function isInsideRect(rect: DOMRect) {
  const { x, y } = mousePosition;
  const { left, top, width, height } = rect;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}

const { randFloat, randFloatSpread } = MathUtils;
const vec1 = new Vector3();
const vec2 = new Vector3();
const vec3 = new Vector3();
const vec4 = new Vector3();
const vec5 = new Vector3();
const vec6 = new Vector3();
const vec7 = new Vector3();
const vec8 = new Vector3();
const vec9 = new Vector3();
const vec10 = new Vector3();

class PhysicsSimulation {
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
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    
    // Setup tennis balls in a random distribution initially
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx] = randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = randFloatSpread(1 * config.maxZ); // limit z depth
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = randFloat(config.minSize, config.maxSize);
    }
  }

  update(time: any) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let startIdx = 0;
    
    // The first sphere can be controlled by cursor/touch
    if (config.controlSphere0) {
      startIdx = 1;
      vec1.fromArray(positionData, 0);
      vec1.lerp(center, 0.1).toArray(positionData, 0);
      vec4.set(0, 0, 0).toArray(velocityData, 0);
    }
    
    // Apply gravity and friction
    for (let i = startIdx; i < config.count; i++) {
      const baseIdx = 3 * i;
      vec2.fromArray(positionData, baseIdx);
      vec5.fromArray(velocityData, baseIdx);
      
      // Gravity pulls down
      vec5.y -= time.delta * config.gravity * sizeData[i] * 50; 
      
      vec5.multiplyScalar(config.friction);
      vec5.clampLength(0, config.maxVelocity);
      
      vec2.add(vec5);
      
      vec2.toArray(positionData, baseIdx);
      vec5.toArray(velocityData, baseIdx);
    }

    // Collision detection and response
    for (let i = startIdx; i < config.count; i++) {
      const baseIdx = 3 * i;
      vec2.fromArray(positionData, baseIdx);
      vec5.fromArray(velocityData, baseIdx);
      const radius = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const otherBaseIdx = 3 * j;
        vec3.fromArray(positionData, otherBaseIdx);
        vec6.fromArray(velocityData, otherBaseIdx);
        const otherRadius = sizeData[j];
        
        vec7.copy(vec3).sub(vec2);
        const dist = vec7.length();
        const sumRadius = radius + otherRadius;
        
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          vec8.copy(vec7).normalize().multiplyScalar(0.5 * overlap);
          
          vec9.copy(vec8).multiplyScalar(Math.max(vec5.length(), 0.5));
          vec10.copy(vec8).multiplyScalar(Math.max(vec6.length(), 0.5));
          
          vec2.sub(vec8);
          // Add some bounce energy
          vec5.sub(vec9).multiplyScalar(config.wallBounce);
          
          vec2.toArray(positionData, baseIdx);
          vec5.toArray(velocityData, baseIdx);
          
          vec3.add(vec8);
          // Add some bounce energy
          vec6.add(vec10).multiplyScalar(config.wallBounce);
          
          vec3.toArray(positionData, otherBaseIdx);
          vec6.toArray(velocityData, otherBaseIdx);
        }
      }

      // Cursor interaction
      if (config.controlSphere0) {
        vec7.copy(vec1).sub(vec2);
        const dist = vec7.length();
        const sumRadius0 = radius + sizeData[0];
        if (dist < sumRadius0) {
          const overlap = sumRadius0 - dist;
          vec8.copy(vec7.normalize()).multiplyScalar(overlap);
          vec9.copy(vec8).multiplyScalar(Math.max(vec5.length(), 2));
          vec2.sub(vec8);
          vec5.sub(vec9);
        }
      }

      // Boundary interactions (walls)
      if (Math.abs(vec2.x) + radius > config.maxX) {
        vec2.x = Math.sign(vec2.x) * (config.maxX - radius);
        vec5.x = -vec5.x * config.wallBounce;
      }
      
      // Floor and Ceiling
      if (config.gravity === 0) {
        if (Math.abs(vec2.y) + radius > config.maxY) {
          vec2.y = Math.sign(vec2.y) * (config.maxY - radius);
          vec5.y = -vec5.y * config.wallBounce;
        }
      } else if (vec2.y - radius < -config.maxY) {
        // Floor hit
        vec2.y = -config.maxY + radius;
        vec5.y = -vec5.y * config.wallBounce;
      }

      // Z boundary
      const maxZBoundary = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(vec2.z) + radius > maxZBoundary) {
        vec2.z = Math.sign(vec2.z) * (maxZBoundary - radius);
        vec5.z = -vec5.z * config.wallBounce;
      }

      vec2.toArray(positionData, baseIdx);
      vec5.toArray(velocityData, baseIdx);
    }
  }
}

// Subsurface scattering material inspired by the reference
class SubsurfaceMaterial extends MeshPhysicalMaterial {
  uniforms: any;
  onBeforeCompile2?: (shader: any) => void;

  constructor(options: any) {
    super(options);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    this.defines.USE_UV = '';
    
    this.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader =
        '\n        uniform float thicknessPower;\n        uniform float thicknessScale;\n        uniform float thicknessDistortion;\n        uniform float thicknessAmbient;\n        uniform float thicknessAttenuation;\n      ' +
        shader.fragmentShader;
        
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        '\n        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {\n          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));\n          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;\n          #ifdef USE_COLOR\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;\n          #else\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;\n          #endif\n          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;\n        }\n\n        void main() {\n      '
      );
      
      const replaceString = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        '\n          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);\n        '
      );
      
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', replaceString);
      if (this.onBeforeCompile2) this.onBeforeCompile2(shader);
    };
  }
}

const defaultConfig = {
  count: 100,
  colors: [0xdcf739, 0xc6de33, 0xebfc6f], // Tennis ball colors (yellowish green)
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.1,
    roughness: 0.8, // Tennis balls are rough (felt)
    clearcoat: 0,
    clearcoatRoughness: 0
  },
  minSize: 0.6, // more uniform size for tennis balls
  maxSize: 0.9,
  size0: 1.5, // bigger "cursor" ball
  gravity: 1.2, // increased gravity for more realistic falling
  friction: 0.99, // air resistance
  wallBounce: 0.8, // bounce intensity (bouncy but dampens)
  maxVelocity: 0.4,
  maxX: 10,
  maxY: 10,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

const dummyObject = new Object3D();

class InstancedSpheres extends InstancedMesh {
  config: any;
  physics: PhysicsSimulation;
  ambientLight!: AmbientLight;
  light!: PointLight;

  constructor(renderer: WebGLRenderer, configOptions = {}) {
    const config = { ...defaultConfig, ...configOptions };
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Setup texture loader for the tennis ball look
    const textureLoader = new TextureLoader();
    let texture: any = null;
    try {
        // Attempt to load tennis ball texture, fallback to pure color if fails
        // We assume we have it in public/images/tennis-ball-texture.jpg
        texture = textureLoader.load('/images/tennis_ball_texture.webp');
    } catch(e) {
        console.error("Could not load texture", e);
    }
    
    const geometry = new SphereGeometry(1, 32, 32);
    
    // Customize material for tennis ball
    const materialParams: any = { ...config.materialParams };
    if (texture) {
       materialParams.map = texture;
    }
    
    const material = new SubsurfaceMaterial(materialParams);
    
    super(geometry, material, config.count);
    this.config = config;
    this.physics = new PhysicsSimulation(config);
    this.#initLights();
    this.setColors(config.colors);
    
    // Add random rotations to make the textured balls look natural
    const rotations = new Float32Array(config.count * 3);
    for(let i=0; i<config.count; i++) {
        rotations[i*3] = Math.random() * Math.PI * 2;
        rotations[i*3+1] = Math.random() * Math.PI * 2;
        rotations[i*3+2] = Math.random() * Math.PI * 2;
    }
    this.userData.rotations = rotations;
  }

  #initLights() {
    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new PointLight(this.config.colors[0], this.config.lightIntensity);
    this.add(this.light);
  }

  setColors(colors: any[]) {
    if (Array.isArray(colors) && colors.length > 0) {
      const colorHelper = new Color();
      
      for (let i = 0; i < this.config.count; i++) {
        // Pick a random shade from our tennis ball colors
        const colorVal = colors[Math.floor(Math.random() * colors.length)];
        colorHelper.setHex(colorVal);
        this.setColorAt(i, colorHelper);
      }
      if (this.instanceColor) {
        this.instanceColor.needsUpdate = true;
      }
    }
  }

  update(time: any) {
    this.physics.update(time);
    
    for (let i = 0; i < this.config.count; i++) {
      dummyObject.position.fromArray(this.physics.positionData, 3 * i);
      
      // Update rotation slightly based on velocity to simulate rolling
      const velocity = new Vector3().fromArray(this.physics.velocityData, 3 * i);
      const speed = velocity.length();
      
      if (speed > 0.01) {
          // Axis of rotation is cross product of up vector and velocity
          const axis = new Vector3(0,1,0).cross(velocity).normalize();
          dummyObject.rotateOnWorldAxis(axis, speed * 2);
      }
      
      if (i === 0 && this.config.followCursor === false) {
        dummyObject.scale.setScalar(0);
      } else {
        dummyObject.scale.setScalar(this.physics.sizeData[i]);
      }
      
      dummyObject.updateMatrix();
      this.setMatrixAt(i, dummyObject.matrix);
      
      if (i === 0) {
        this.light.position.copy(dummyObject.position);
      }
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

function initBallpitScene(canvas: HTMLCanvasElement, configOptions = {}) {
  const three = new ThreeScene({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });
  
  let spheres: InstancedSpheres;
  three.renderer.toneMapping = ACESFilmicToneMapping;
  three.camera.position.set(0, 0, 20); // Move camera back
  three.camera.lookAt(0, 0, 0);
  three.cameraMaxAspect = 1.5;
  three.resize();
  
  setupSpheres(configOptions);
  
  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const intersectionPoint = new Vector3();
  let isPaused = false;

  // Prevent default touch actions on canvas
  canvas.style.touchAction = 'none';

  const interaction = setupInteraction({
    domElement: canvas,
    onMove() {
      raycaster.setFromCamera(interaction.nPosition, three.camera);
      three.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersectionPoint);
      spheres.physics.center.copy(intersectionPoint);
      spheres.config.controlSphere0 = true;
    },
    onLeave() {
      spheres.config.controlSphere0 = false;
    }
  });

  function setupSpheres(config: any) {
    if (spheres) {
      three.clear();
      three.scene.remove(spheres);
    }
    spheres = new InstancedSpheres(three.renderer, config);
    three.scene.add(spheres);
  }

  three.onBeforeRender = (time) => {
    if (!isPaused) spheres.update(time);
  };

  three.onAfterResize = (size) => {
    spheres.config.maxX = size.wWidth / 2;
    spheres.config.maxY = size.wHeight / 2;
  };

  return {
    three,
    get spheres() {
      return spheres;
    },
    setCount(count: number) {
      setupSpheres({ ...spheres.config, count });
    },
    togglePause() {
      isPaused = !isPaused;
    },
    dispose() {
      interaction.dispose();
      three.dispose();
    }
  };
}

interface BallpitProps {
  className?: string;
  followCursor?: boolean;
  count?: number;
  gravity?: number;
  friction?: number;
  wallBounce?: number;
}

export default function Ballpit({ 
  className = '', 
  followCursor = true, 
  ...props 
}: BallpitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    instanceRef.current = initBallpitScene(canvas, { followCursor, ...props });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas 
      className={className} 
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} 
    />
  );
}
