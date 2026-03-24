"use client";

import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef } from 'react';
import './CircularGallery.css';

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance: object) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach((key) => {
    if (key !== 'constructor' && typeof (instance as Record<string, unknown>)[key] === 'function') {
      (instance as Record<string, unknown>)[key] = ((instance as Record<string, unknown>)[key] as () => void).bind(instance);
    }
  });
}

function createTextTexture(
  gl: WebGLRenderingContext,
  text: string,
  font = 'bold 28px monospace',
  color = '#7DC828'
) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + 24;
  canvas.height = Math.ceil(parseInt(font, 10) * 1.2) + 16;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl as unknown as Parameters<typeof Texture>[0], { generateMipmaps: false });
  (texture as unknown as { image: HTMLCanvasElement }).image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

interface TitleOptions {
  gl: WebGLRenderingContext;
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor?: string;
  font?: string;
}

class Title {
  gl: WebGLRenderingContext;
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor: string;
  font: string;
  mesh!: Mesh;

  constructor({ gl, plane, renderer, text, textColor = '#7DC828', font = 'bold 28px sans-serif' }: TitleOptions) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl as unknown as Parameters<typeof Plane>[0]);
    const program = new Program(this.gl as unknown as Parameters<typeof Program>[0], {
      vertex: `attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragment: `precision highp float;uniform sampler2D tMap;varying vec2 vUv;void main(){vec4 c=texture2D(tMap,vUv);if(c.a<0.1)discard;gl_FragColor=c;}`,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(this.gl as unknown as Parameters<typeof Mesh>[0], { geometry, program });
    const aspect = width / height;
    const textH = (this.plane.scale as unknown as { y: number }).y * 0.14;
    const textW = textH * aspect;
    (this.mesh.scale as unknown as { set: (x: number, y: number, z: number) => void }).set(textW, textH, 1);
    (this.mesh.position as unknown as { y: number }).y = -(this.plane.scale as unknown as { y: number }).y * 0.5 - textH * 0.5 - 0.05;
    (this.mesh as unknown as { setParent: (p: Mesh) => void }).setParent(this.plane);
  }
}

interface MediaOptions {
  geometry: Plane;
  gl: WebGLRenderingContext;
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: { width: number; height: number };
  text: string;
  viewport: { width: number; height: number };
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  planeScale: number;
}

class Media {
  extra: number;
  geometry: Plane;
  gl: WebGLRenderingContext;
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: { width: number; height: number };
  text: string;
  viewport: { width: number; height: number };
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  planeScale: number;
  program!: Program;
  plane!: Mesh;
  title!: Title;
  speed = 0;
  x = 0;
  width = 0;
  widthTotal = 0;
  padding = 0;
  isBefore = false;
  isAfter = false;

  constructor(opts: MediaOptions) {
    this.extra = 0;
    Object.assign(this, opts);
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl as unknown as Parameters<typeof Texture>[0], { generateMipmaps: true });
    this.program = new Program(this.gl as unknown as Parameters<typeof Program>[0], {
      depthTest: false,
      depthWrite: false,
      vertex: `precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragment: `precision highp float;uniform vec2 uImageSizes;uniform vec2 uPlaneSizes;uniform sampler2D tMap;uniform float uBorderRadius;varying vec2 vUv;float rboxSDF(vec2 p,vec2 b,float r){vec2 d=abs(p)-b;return length(max(d,vec2(0.0)))+min(max(d.x,d.y),0.0)-r;}void main(){vec2 ratio=vec2(min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.0),min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.0));vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5,vUv.y*ratio.y+(1.0-ratio.y)*0.5);vec4 color=texture2D(tMap,uv);float d=rboxSDF(vUv-0.5,vec2(0.5-uBorderRadius),uBorderRadius);float alpha=1.0-smoothstep(-0.002,0.002,d);gl_FragColor=vec4(color.rgb,color.a*alpha);}`,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      (texture as unknown as { image: HTMLImageElement }).image = img;
      (this.program.uniforms as Record<string, { value: unknown }>).uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl as unknown as Parameters<typeof Mesh>[0], { geometry: this.geometry, program: this.program });
    (this.plane as unknown as { setParent: (s: Transform) => void }).setParent(this.scene);
  }

  createTitle() {
    this.title = new Title({ gl: this.gl, plane: this.plane, renderer: this.renderer, text: this.text, textColor: this.textColor, font: this.font });
  }

  update(scroll: { current: number; last: number }, direction: string) {
    (this.plane.position as unknown as { x: number }).x = this.x - scroll.current - this.extra;
    const x = (this.plane.position as unknown as { x: number }).x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      (this.plane.position as unknown as { y: number }).y = 0;
      (this.plane.rotation as unknown as { z: number }).z = 0;
    } else {
      const B = Math.abs(this.bend);
      const R = (H * H + B * B) / (2 * B);
      const ex = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - ex * ex);
      if (this.bend > 0) {
        (this.plane.position as unknown as { y: number }).y = -arc;
        (this.plane.rotation as unknown as { z: number }).z = -Math.sign(x) * Math.asin(ex / R);
      } else {
        (this.plane.position as unknown as { y: number }).y = arc;
        (this.plane.rotation as unknown as { z: number }).z = Math.sign(x) * Math.asin(ex / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    (this.program.uniforms as Record<string, { value: unknown }>).uTime.value = ((this.program.uniforms as Record<string, { value: unknown }>).uTime.value as number) + 0.04;
    (this.program.uniforms as Record<string, { value: unknown }>).uSpeed.value = this.speed;

    const po = (this.plane.scale as unknown as { x: number }).x / 2;
    const vo = this.viewport.width / 2;
    this.isBefore = (this.plane.position as unknown as { x: number }).x + po < -vo;
    this.isAfter = (this.plane.position as unknown as { x: number }).x - po > vo;
    if (direction === 'right' && this.isBefore) { this.extra -= this.widthTotal; this.isBefore = this.isAfter = false; }
    if (direction === 'left' && this.isAfter) { this.extra += this.widthTotal; this.isBefore = this.isAfter = false; }
  }

  onResize({ screen, viewport }: { screen?: { width: number; height: number }; viewport?: { width: number; height: number } } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    const scale = this.screen.height / 1500;
    (this.plane.scale as unknown as { y: number }).y = (this.viewport.height * (900 * scale * this.planeScale)) / this.screen.height;
    (this.plane.scale as unknown as { x: number }).x = (this.viewport.width * (560 * scale * this.planeScale)) / this.screen.width;
    (this.program.uniforms as Record<string, { value: unknown }>).uPlaneSizes.value = [(this.plane.scale as unknown as { x: number }).x, (this.plane.scale as unknown as { y: number }).y];
    this.padding = 2;
    this.width = (this.plane.scale as unknown as { x: number }).x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

export interface GalleryItem {
  image: string;
  text: string;
}

class App {
  container: HTMLElement;
  scrollSpeed: number;
  scroll: { ease: number; current: number; target: number; last: number; position: number };
  onCheckDebounce: ReturnType<typeof debounce>;
  renderer!: Renderer;
  gl!: WebGLRenderingContext;
  camera!: Camera;
  scene!: Transform;
  screen!: { width: number; height: number };
  viewport!: { width: number; height: number };
  planeGeometry!: Plane;
  mediasImages!: GalleryItem[];
  medias!: Media[];
  raf!: number;
  isDown = false;
  start = 0;
  boundOnResize!: () => void;
  boundOnWheel!: (e: WheelEvent) => void;
  boundOnTouchDown!: (e: MouseEvent | TouchEvent) => void;
  boundOnTouchMove!: (e: MouseEvent | TouchEvent) => void;
  boundOnTouchUp!: () => void;
  onSnap?: (index: number) => void;

  constructor(
    container: HTMLElement,
    {
      items,
      bend = 1,
      textColor = '#7DC828',
      borderRadius = 0.05,
      font = 'bold 28px sans-serif',
      scrollSpeed = 2,
      scrollEase = 0.05,
      planeScale = 1,
      onSnap,
    }: {
      items?: GalleryItem[];
      bend?: number;
      textColor?: string;
      borderRadius?: number;
      font?: string;
      scrollSpeed?: number;
      scrollEase?: number;
      planeScale?: number;
      onSnap?: (index: number) => void;
    } = {}
  ) {
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.onSnap = onSnap;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0, position: 0 };
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font, planeScale);
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl as unknown as WebGLRenderingContext;
    (this.renderer.gl as unknown as { clearColor: (r: number, g: number, b: number, a: number) => void }).clearColor(0, 0, 0, 0);
    this.container.appendChild((this.renderer.gl as unknown as { canvas: HTMLCanvasElement }).canvas);
  }

  createCamera() {
    this.camera = new Camera(this.renderer.gl);
    (this.camera as unknown as { fov: number }).fov = 45;
    (this.camera.position as unknown as { z: number }).z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.renderer.gl, { heightSegments: 50, widthSegments: 100 });
  }

  createMedias(items?: GalleryItem[], bend = 1, textColor = '#7DC828', borderRadius = 0.05, font = 'bold 28px sans-serif', planeScale = 1) {
    const defaultItems: GalleryItem[] = [
      { image: 'https://picsum.photos/seed/padel1/800/600', text: 'Classement ELO' },
      { image: 'https://picsum.photos/seed/padel2/800/600', text: 'Challenges' },
      { image: 'https://picsum.photos/seed/padel3/800/600', text: 'Badges' },
      { image: 'https://picsum.photos/seed/padel4/800/600', text: 'Dashboard' },
      { image: 'https://picsum.photos/seed/padel5/800/600', text: 'App Mobile' },
      { image: 'https://picsum.photos/seed/padel6/800/600', text: 'Analytics' },
    ];
    const galleryItems = items?.length ? items : defaultItems;
    this.mediasImages = [...galleryItems, ...galleryItems];
    this.medias = this.mediasImages.map((data, index) =>
      new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font,
        planeScale,
      })
    );
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = 'touches' in e ? e.touches[0].clientX : e.clientX;
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    this.scroll.target = this.scroll.position + (this.start - x) * (this.scrollSpeed * 0.025);
  }

  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }

  onWheel(e: WheelEvent) {
    const delta = e.deltaY || (e as unknown as { wheelDelta: number }).wheelDelta;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }

  onCheck() {
    if (!this.medias?.[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
    this.onSnap?.(itemIndex);
  }

  onResize() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    (this.renderer as unknown as { setSize: (w: number, h: number) => void }).setSize(this.screen.width, this.screen.height);
    (this.camera as unknown as { perspective: (opts: { aspect: number }) => void }).perspective({ aspect: this.screen.width / this.screen.height });
    const fov = ((this.camera as unknown as { fov: number }).fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * (this.camera.position as unknown as { z: number }).z;
    const width = height * (this.camera as unknown as { aspect: number }).aspect;
    this.viewport = { width, height };
    this.medias?.forEach((m) => m.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    this.medias?.forEach((m) => m.update(this.scroll, direction));
    (this.renderer as unknown as { render: (opts: { scene: Transform; camera: Camera }) => void }).render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.update.bind(this));
  }

  addEventListeners() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    window.addEventListener('resize', this.boundOnResize);
    // Only drag triggers the gallery (no wheel)
    this.container.addEventListener('mousedown', this.boundOnTouchDown as EventListener);
    window.addEventListener('mousemove', this.boundOnTouchMove as EventListener);
    window.addEventListener('mouseup', this.boundOnTouchUp);
    window.addEventListener('touchstart', this.boundOnTouchDown as EventListener);
    window.addEventListener('touchmove', this.boundOnTouchMove as EventListener);
    window.addEventListener('touchend', this.boundOnTouchUp);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundOnResize);
    this.container.removeEventListener('mousedown', this.boundOnTouchDown as EventListener);
    window.removeEventListener('mousemove', this.boundOnTouchMove as EventListener);
    window.removeEventListener('mouseup', this.boundOnTouchUp);
    window.removeEventListener('touchstart', this.boundOnTouchDown as EventListener);
    window.removeEventListener('touchmove', this.boundOnTouchMove as EventListener);
    window.removeEventListener('touchend', this.boundOnTouchUp);
    const canvas = (this.renderer?.gl as unknown as { canvas?: HTMLCanvasElement })?.canvas;
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
  }
}

interface CircularGalleryProps {
  items?: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  planeScale?: number;
  onSnap?: (index: number) => void;
}

export default function CircularGallery({
  items,
  bend = 1,
  textColor = '#7DC828',
  borderRadius = 0.05,
  font = 'bold 28px sans-serif',
  scrollSpeed = 2,
  scrollEase = 0.05,
  planeScale = 1,
  onSnap,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new App(containerRef.current, { items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, planeScale, onSnap });
    return () => app.destroy();
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, planeScale, onSnap]);

  return <div className="circular-gallery" ref={containerRef} />;
}
