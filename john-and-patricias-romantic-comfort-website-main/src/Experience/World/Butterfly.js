import * as THREE from "three/webgpu";
import {
  texture,
  uv,
  vec2,
  vec3,
  vec4,
  select,
  time,
  mx_noise_float,
  positionWorld,
  uniform,
} from "three/tsl";
import { Experience } from "../Experience";
import {
  spotProjectionMatrixUniform,
  spotProjectionMatrixUniform2,
  spotProjectionMatrixUniform3,
} from "./Environment";

const WING_W = 0.5;
const WING_H = 0.38;
const FLAP_RANGE = Math.PI * 0.4;

const DEFAULTS = {
  x: 0,
  y: 2.2,
  z: -22,
  radiusX: 2.0,
  radiusZ: 2.8,
  heightVar: 0.4,
  phase: 0,
  flapSpeed: 20,
  scale: 1.0,
};

function buildGobo(projMat, goboTex, swayT, strength, oxSeedX, oxSeedY, oySeedX, oySeedY, oyT, avSeedX, avSeedY) {
  const clipPos = projMat.mul(vec4(positionWorld, 1.0));
  const projUV  = clipPos.xy.div(clipPos.w).mul(0.5).add(0.5);
  const inFrustum = clipPos.w.greaterThan(0.0)
    .and(projUV.x.greaterThanEqual(0.0))
    .and(projUV.x.lessThanEqual(1.0))
    .and(projUV.y.greaterThanEqual(0.0))
    .and(projUV.y.lessThanEqual(1.0));

  const ox = mx_noise_float(vec3(projUV.x.mul(2.0).add(oxSeedX), projUV.y.mul(2.0).add(oxSeedY), swayT));
  const oy = mx_noise_float(vec3(projUV.x.mul(2.0).add(oySeedX), projUV.y.mul(2.0).add(oySeedY), swayT.add(oyT)));
  const av = mx_noise_float(vec3(projUV.x.add(avSeedX), projUV.y.add(avSeedY), 0.0)).abs().mul(1.5).add(0.3);
  const distUV = projUV.add(vec2(ox, oy).mul(0.008).mul(av));

  const sample = select(inFrustum, texture(goboTex, distUV).rgb, vec3(1.0));
  return sample.oneMinus().mul(strength).oneMinus();
}

export class Butterfly {
  constructor(cfg = {}, label = "Butterfly") {
    this._cfg = { ...DEFAULTS, ...cfg };
    this._angle = 0;
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    this.group = new THREE.Group();
    this._tiltGroup = new THREE.Group();
    this._tiltGroup.rotation.x = 0.3;
    this.group.add(this._tiltGroup);
    this.scene.add(this.group);

    this._init();
    this._initGui(label);
  }

  _init() {
    const wingTex = this.experience.resources.items.butterflyWingTexture;
    wingTex.colorSpace = THREE.SRGBColorSpace;
    wingTex.generateMipmaps = false;
    wingTex.minFilter = THREE.LinearFilter;
    wingTex.needsUpdate = true;

    this.uOpacity = uniform(1.0);

    const goboTex = this.experience.resources.items.goboTexture;
    const uGoboStrength = 0.5;
    const swayT = time.mul(0.2);

    const g1 = buildGobo(spotProjectionMatrixUniform,  goboTex, swayT, uGoboStrength,  0.0,  0.0,  5.2,  1.3, 2.7,  0.0, 0.0);
    const g2 = buildGobo(spotProjectionMatrixUniform2, goboTex, swayT, uGoboStrength,  9.1,  4.7, 14.3,  5.9, 2.7,  7.3, 3.1);
    const g3 = buildGobo(spotProjectionMatrixUniform3, goboTex, swayT, uGoboStrength, 17.5,  8.3, 22.1, 11.7, 2.7, 13.9, 6.4);
    const goboFactor = g1.min(g2).min(g3);

    const rightGeo = new THREE.PlaneGeometry(WING_W, WING_H);
    rightGeo.rotateX(-Math.PI / 2);
    rightGeo.translate(WING_W / 2, 0, 0);

    const rightMat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
    const rightSample = texture(wingTex, vec2(uv().x.oneMinus(), uv().y));
    rightMat.colorNode = rightSample.rgb.mul(goboFactor);
    rightMat.opacityNode = rightSample.a.mul(this.uOpacity);

    this._rightPivot = new THREE.Object3D();
    this._rightPivot.add(new THREE.Mesh(rightGeo, rightMat));

    const leftGeo = new THREE.PlaneGeometry(WING_W, WING_H);
    leftGeo.rotateX(-Math.PI / 2);
    leftGeo.translate(-WING_W / 2, 0, 0);

    const leftMat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
    const leftSample = texture(wingTex, uv());
    leftMat.colorNode = leftSample.rgb.mul(goboFactor);
    leftMat.opacityNode = leftSample.a.mul(this.uOpacity);

    this._leftPivot = new THREE.Object3D();
    this._leftPivot.add(new THREE.Mesh(leftGeo, leftMat));

    this._tiltGroup.add(this._rightPivot);
    this._tiltGroup.add(this._leftPivot);
  }

  _initGui(label) {
    const c = this._cfg;
    const folder = this.experience.gui.addFolder(label);

    folder.add(c, "x", -30, 30, 0.1).name("Spawn X");
    folder.add(c, "y", 0, 10, 0.1).name("Spawn Y");
    folder.add(c, "z", -40, 0, 0.1).name("Spawn Z");
    folder.add(c, "radiusX", 0, 8, 0.1).name("Radius X");
    folder.add(c, "radiusZ", 0, 8, 0.1).name("Radius Z");
    folder.add(c, "heightVar", 0, 2, 0.05).name("Height Variation");
    folder.add(c, "flapSpeed", 5, 50, 1).name("Flap Speed");
    folder.add(c, "scale", 0.1, 5, 0.05).name("Scale");
    folder.close();
  }

  update() {
    const t = this.experience.time.elapsed * 0.001;
    const { x, y, z, radiusX, radiusZ, heightVar, phase, flapSpeed, scale } = this._cfg;
    this.group.scale.setScalar(scale);

    const flapAngle = Math.sin(t * flapSpeed + phase) * FLAP_RANGE;
    this._rightPivot.rotation.z = flapAngle;
    this._leftPivot.rotation.z = -flapAngle;

    this.group.position.x = x + Math.sin(t * 0.31 + phase) * radiusX;
    this.group.position.y = y + Math.sin(t * 0.53 + phase) * heightVar + Math.cos(t * 0.79 + phase) * 0.12;
    this.group.position.z = z + Math.cos(t * 0.19 + phase) * radiusZ + Math.sin(t * 0.67 + phase) * 1.0;

    const vx = Math.cos(t * 0.31 + phase) * 0.31 * radiusX;
    const vz = -Math.sin(t * 0.19 + phase) * 0.19 * radiusZ + Math.cos(t * 0.67 + phase) * 0.67;
    if (Math.abs(vx) + Math.abs(vz) > 0.01) {
      const target = Math.atan2(vx, vz) + Math.PI;
      let diff = target - this._angle;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      this._angle += diff * 0.08;
      this.group.rotation.y = this._angle;
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
