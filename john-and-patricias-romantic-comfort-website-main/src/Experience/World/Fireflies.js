import * as THREE from "three/webgpu";
import {
  uniform,
  time,
  sin,
  cos,
  smoothstep,
  instanceIndex,
  uv,
  float,
} from "three/tsl";
import { Experience } from "../Experience";

// WebGPU points are fixed at 1px — use instanced billboard quads instead.

const DUMMY = new THREE.Object3D();

export class Fireflies {
  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    this.cfg = {
      count: 21,
      minX: -33,
      maxX: 35.5,
      minY: -13.7,
      maxY: 20,
      minZ: -27.5,
      maxZ: -10,
      size: 2.0,
      driftAmount: 1.0,
      showBox: false,
    };

    // Live uniforms (shader-side)
    this.uColor = uniform(new THREE.Color("#fec158"));
    this.uOpacity = uniform(0.0);
    this.uBlinkSlow = uniform(0.8);
    this.uBlinkFast = uniform(3.0);

    this._spawnPos = null;
    this._scales = null;

    this._build();
    this._buildBoxHelper();
    this._initGui();
  }

  _build() {
    const { count, minX, maxX, minY, maxY, minZ, maxZ, size } = this.cfg;

    this._spawnPos = new Float32Array(count * 3);
    this._scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._spawnPos[i * 3 + 0] = minX + Math.random() * (maxX - minX);
      this._spawnPos[i * 3 + 1] = minY + Math.random() * (maxY - minY);
      this._spawnPos[i * 3 + 2] = minZ + Math.random() * (maxZ - minZ);
      this._scales[i] = Math.random();
    }

    // Per-instance phase via golden-ratio sequence — no extra buffer needed
    const uniquePhase = instanceIndex.toFloat().mul(0.618033988749895).fract().mul(Math.PI * 2);
    const fragTime = time.mul(0.5).add(uniquePhase);

    const slowBlink = sin(fragTime.mul(this.uBlinkSlow)).mul(0.5).add(0.5);
    const fastBlink = sin(fragTime.mul(this.uBlinkFast)).mul(0.5).add(0.5);
    const blink = smoothstep(0.3, 0.7, slowBlink.mul(fastBlink));

    // uv() on PlaneGeometry goes 0→1; center is 0.5,0.5
    const dist = uv().sub(0.5).length();
    const strength = float(0.05).div(dist.max(0.001)).sub(0.1).max(0);

    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    material.colorNode = this.uColor;
    material.opacityNode = strength.mul(blink).mul(this.uOpacity);

    const geo = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.InstancedMesh(geo, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < count; i++) {
      DUMMY.position.set(
        this._spawnPos[i * 3],
        this._spawnPos[i * 3 + 1],
        this._spawnPos[i * 3 + 2],
      );
      DUMMY.scale.setScalar(this._scales[i] * size);
      DUMMY.updateMatrix();
      this.mesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.mesh);
  }

  _buildBoxHelper() {
    const { minX, maxX, minY, maxY, minZ, maxZ } = this.cfg;
    const box = new THREE.Box3(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ),
    );
    this._boxHelper = new THREE.Box3Helper(box, new THREE.Color(1.0, 0.7, 0.4));
    this._boxHelper.visible = this.cfg.showBox;
    this.scene.add(this._boxHelper);
  }

  _updateBoxHelper() {
    const { minX, maxX, minY, maxY, minZ, maxZ } = this.cfg;
    this._boxHelper.box.set(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ),
    );
    // Box3Helper doesn't auto-update its geometry — force it
    this._boxHelper.updateMatrixWorld(true);
  }

  _rebuild() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.scene.remove(this.mesh);
    }
    this._build();
    this._updateBoxHelper();
  }

  update() {
    if (!this.mesh) return;

    const { count, size, driftAmount } = this.cfg;
    const camera = this.experience.camera.instance;
    const t = performance.now() * 0.0005; // seconds × 0.5, matches TSL time × 0.5

    for (let i = 0; i < count; i++) {
      const sx = this._spawnPos[i * 3];
      const sy = this._spawnPos[i * 3 + 1];
      const sz = this._spawnPos[i * 3 + 2];
      const s = this._scales[i];
      const uo = sx * 0.3 + sz * 0.7;

      DUMMY.position.set(
        sx + Math.sin(t + uo) * s * 0.3 * driftAmount,
        sy + Math.cos(t * 0.5 + uo) * s * 0.15 * driftAmount,
        sz + Math.sin(t * 0.7 + uo) * s * 0.2 * driftAmount,
      );
      DUMMY.scale.setScalar(s * size);
      DUMMY.lookAt(camera.position);
      DUMMY.updateMatrix();
      this.mesh.setMatrixAt(i, DUMMY.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _initGui() {
    const folder = this.experience.gui.addFolder("Fireflies");

    // --- Spawn domain ---
    const spawn = folder.addFolder("Spawn Domain");

    const rebuildAndUpdateBox = () => {
      this._updateBoxHelper();
      this._rebuild();
    };

    // Show the box toggle lives here so it's obvious
    spawn.add(this.cfg, "showBox").name("Show Box").onChange((v) => {
      this._boxHelper.visible = v;
    });

    spawn.add(this.cfg, "count", 10, 500, 1).name("Count").onFinishChange(rebuildAndUpdateBox);
    spawn.add(this.cfg, "minX", -60, 60, 0.5).name("Min X").onChange(() => this._updateBoxHelper()).onFinishChange(rebuildAndUpdateBox);
    spawn.add(this.cfg, "maxX", -60, 60, 0.5).name("Max X").onChange(() => this._updateBoxHelper()).onFinishChange(rebuildAndUpdateBox);
    spawn.add(this.cfg, "minY", -20, 20, 0.1).name("Min Y").onChange(() => this._updateBoxHelper()).onFinishChange(rebuildAndUpdateBox);
    spawn.add(this.cfg, "maxY", -5, 20, 0.1).name("Max Y").onChange(() => this._updateBoxHelper()).onFinishChange(rebuildAndUpdateBox);
    spawn.add(this.cfg, "minZ", -80, 20, 0.5).name("Min Z").onChange(() => this._updateBoxHelper()).onFinishChange(rebuildAndUpdateBox);
    spawn.add(this.cfg, "maxZ", -80, 20, 0.5).name("Max Z").onChange(() => this._updateBoxHelper()).onFinishChange(rebuildAndUpdateBox);

    // --- Live controls ---
    const proxy = {
      opacity: 0.0,
      size: this.cfg.size,
      drift: this.cfg.driftAmount,
      blinkSlow: 0.8,
      blinkFast: 3.0,
      color: "#fec158",
    };

    folder.add(proxy, "opacity", 0, 1, 0.01).name("Opacity").onChange((v) => (this.uOpacity.value = v));
    folder.add(proxy, "size", 0.1, 10, 0.1).name("Size").onChange((v) => (this.cfg.size = v));
    folder.add(proxy, "drift", 0, 3, 0.01).name("Drift").onChange((v) => (this.cfg.driftAmount = v));
    folder.add(proxy, "blinkSlow", 0.05, 3, 0.01).name("Blink Slow").onChange((v) => (this.uBlinkSlow.value = v));
    folder.add(proxy, "blinkFast", 0.5, 10, 0.1).name("Blink Fast").onChange((v) => (this.uBlinkFast.value = v));
    folder.addColor(proxy, "color").name("Color").onChange((v) => {
      this.uColor.value.set(v);
      this._boxHelper.material.color.set(v);
    });

    folder.close();
  }

  destroy() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.scene.remove(this.mesh);
    }
    if (this._boxHelper) {
      this._boxHelper.geometry.dispose();
      this._boxHelper.material.dispose();
      this.scene.remove(this._boxHelper);
    }
  }
}
