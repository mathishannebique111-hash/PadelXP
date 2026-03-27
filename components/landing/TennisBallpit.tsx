"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const CONFIG = {
  count: 80,
  minSize: 0.75,
  maxSize: 1.5,
  size0: 1,
  gravity: 0,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  // repulsion replaces controlSphere0
  repulsionRadius: 3.5,
  repulsionStrength: 0.08,
};

class Physics {
  config: typeof CONFIG;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;

  constructor(cfg: typeof CONFIG) {
    this.config = cfg;
    this.positionData = new Float32Array(3 * cfg.count).fill(0);
    this.velocityData = new Float32Array(3 * cfg.count).fill(0);
    this.sizeData = new Float32Array(cfg.count).fill(1);
    this._initPositions();
    this._initSizes();
  }

  _initPositions() {
    const { config, positionData } = this;
    for (let i = 0; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx]     = THREE.MathUtils.randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = THREE.MathUtils.randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = THREE.MathUtils.randFloatSpread(2 * config.maxZ);
    }
  }

  _initSizes() {
    const { config, sizeData } = this;
    for (let i = 0; i < config.count; i++) {
      sizeData[i] = THREE.MathUtils.randFloat(config.minSize, config.maxSize);
    }
  }

  applyRepulsion(cursorPos: THREE.Vector3) {
    const { config, positionData, velocityData, sizeData } = this;
    for (let i = 0; i < config.count; i++) {
      const b = 3 * i;
      const pos = new THREE.Vector3().fromArray(positionData, b);
      const diff = pos.clone().sub(cursorPos);
      const dist = diff.length();
      if (dist < config.repulsionRadius && dist > 0.01) {
        const force = (1 - dist / config.repulsionRadius) * config.repulsionStrength;
        const vel = new THREE.Vector3().fromArray(velocityData, b);
        vel.add(diff.normalize().multiplyScalar(force));
        vel.clampLength(0, config.maxVelocity * 3);
        vel.toArray(velocityData, b);
      }
    }
  }

  update(dt: { delta: number }) {
    const { config, positionData, sizeData, velocityData } = this;

    for (let i = 0; i < config.count; i++) {
      const b = 3 * i;
      const pos = new THREE.Vector3().fromArray(positionData, b);
      const vel = new THREE.Vector3().fromArray(velocityData, b);
      vel.y -= dt.delta * config.gravity * sizeData[i];
      vel.multiplyScalar(config.friction);
      vel.clampLength(0, config.maxVelocity);
      pos.add(vel);
      pos.toArray(positionData, b);
      vel.toArray(velocityData, b);
    }

    for (let i = 0; i < config.count; i++) {
      const b = 3 * i;
      const pos = new THREE.Vector3().fromArray(positionData, b);
      const vel = new THREE.Vector3().fromArray(velocityData, b);
      const r = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const ob = 3 * j;
        const oPos = new THREE.Vector3().fromArray(positionData, ob);
        const oVel = new THREE.Vector3().fromArray(velocityData, ob);
        const diff = new THREE.Vector3().copy(oPos).sub(pos);
        const dist = diff.length();
        const sumR = r + sizeData[j];
        if (dist < sumR) {
          const overlap = sumR - dist;
          const corr = diff.normalize().multiplyScalar(0.5 * overlap);
          const velCorr = corr.clone().multiplyScalar(Math.max(vel.length(), 1));
          pos.sub(corr); vel.sub(velCorr);
          pos.toArray(positionData, b); vel.toArray(velocityData, b);
          oPos.add(corr);
          oVel.add(corr.clone().multiplyScalar(Math.max(oVel.length(), 1)));
          oPos.toArray(positionData, ob); oVel.toArray(velocityData, ob);
        }
      }

      if (Math.abs(pos.x) + r > config.maxX) { pos.x = Math.sign(pos.x) * (config.maxX - r); vel.x = -vel.x * config.wallBounce; }
      if (Math.abs(pos.y) + r > config.maxY) { pos.y = Math.sign(pos.y) * (config.maxY - r); vel.y = -vel.y * config.wallBounce; }
      const maxB = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(pos.z) + r > maxB) { pos.z = Math.sign(pos.z) * (config.maxZ - r); vel.z = -vel.z * config.wallBounce; }
      pos.toArray(positionData, b); vel.toArray(velocityData, b);
    }
  }
}

export default function TennisBallpit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = window.innerWidth < 768;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        powerPreference: isMobile ? "default" : "high-performance",
        antialias: !isMobile,
        alpha: true,
      });
    } catch (e) {
      console.warn("[TennisBallpit] init failed:", e);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = !isMobile;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    const cfg = { ...CONFIG };
    const physics = new Physics(cfg);

    const resize = () => {
      const parent = canvas.parentElement!;
      const w = parent.offsetWidth, h = parent.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const fovRad = (camera.fov * Math.PI) / 180;
      const wH = 2 * Math.tan(fovRad / 2) * camera.position.length();
      cfg.maxX = (wH * camera.aspect) / 2;
      cfg.maxY = wH / 2;
    };

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envMap;
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pointLight = new THREE.PointLight(0xCDFF00, 50);
    pointLight.position.set(0, 0, 5);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const rotations: THREE.Quaternion[] = [];
    const spinAxes: THREE.Vector3[] = [];
    for (let i = 0; i < cfg.count; i++) {
      const q = new THREE.Quaternion();
      q.setFromEuler(new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2));
      rotations.push(q);
      spinAxes.push(new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1)).normalize());
    }

    const tmpObj = new THREE.Object3D();
    const spinQ = new THREE.Quaternion();
    let instancedMeshes: THREE.InstancedMesh[] = [];
    let animId = 0;
    const clock = new THREE.Clock();
    let elapsed = 0;
    const cursorPos = new THREE.Vector3(9999, 9999, 0);

    const loop = () => {
      animId = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      elapsed += delta;

      physics.applyRepulsion(cursorPos);
      physics.update({ delta });

      for (let i = 0; i < cfg.count; i++) {
        tmpObj.position.fromArray(physics.positionData, 3 * i);
        const vel = new THREE.Vector3().fromArray(physics.velocityData, 3 * i);
        const speed = vel.length();
        if (speed > 0.001) { spinQ.setFromAxisAngle(spinAxes[i], speed * 2); rotations[i].premultiply(spinQ); }
        tmpObj.quaternion.copy(rotations[i]);
        tmpObj.scale.setScalar(physics.sizeData[i]);
        tmpObj.updateMatrix();
        for (const im of instancedMeshes) im.setMatrixAt(i, tmpObj.matrix);
      }
      pointLight.position.set(Math.sin(elapsed * 0.5) * 3, Math.cos(elapsed * 0.3) * 2, 5);
      for (const im of instancedMeshes) im.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const loader = new GLTFLoader();
    loader.load("/tennis_ball_model/scene.gltf", (gltf) => {
      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((child) => { if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh); });
      const container = new THREE.Group();
      for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, false);
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld);
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.envMap = envMap; mat.envMapIntensity = 0.5; mat.needsUpdate = true;
        const im = new THREE.InstancedMesh(geo, mat, cfg.count);
        im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
        instancedMeshes.push(im); container.add(im);
      }
      scene.add(container);
      resize(); clock.start(); loop();
    });

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const nPos = new THREE.Vector2();
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      nPos.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(nPos, camera);
      camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, cursorPos);
    };
    const onPointerLeave = () => { cursorPos.set(9999, 9999, 0); };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none", userSelect: "none" }} />;
}
