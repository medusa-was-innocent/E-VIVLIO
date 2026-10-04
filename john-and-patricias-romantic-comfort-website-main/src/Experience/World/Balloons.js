import * as THREE from "three/webgpu";
import { lights } from "three/tsl";
import { Experience } from "../Experience";

// Baloons_Empty world pos in Blender (-1.357, 26.582, 1.964) → Three.js Y-up
const ANCHOR = new THREE.Vector3(-1.357, 1.964, -26.582);

const BALLOON_RADIUS = 0.35;
const COLLISION_DIST = BALLOON_RADIUS * 2.4;
const STRING_LENGTH = 2.8;
const STRING_SEGMENTS = 14;

const SPRING_K = 3.5;
const REPULSION_K = 10.0;
const DAMPING = 1.8;
const WIND_STR = 0.55;

const COLORS = ["#FF3B30", "#007AFF", "#FFCC00", "#34C759", "#FF2D92"];
const PHASES = [0.0, 1.3, 2.6, 0.9, 2.0];

export class Balloons {
  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this.balloons = [];

    this.group = new THREE.Group();
    this.group.position.copy(ANCHOR);
    this.scene.add(this.group);

    this._init();
  }

  _init() {
    const dirLight = this.experience.world.environment.directionalLight;

    // Private ambient fill — NOT added to the scene, so it only affects balloons.
    // Without this, the shadow side of each balloon is pitch black (one directional
    // light with no fill = harsh half-black spheres).
    const fill = new THREE.AmbientLight("#fff8f0", 0.9);

    this._lightsNode = lights([dirLight, fill]);

    COLORS.forEach((color, i) => this._spawnBalloon(color, PHASES[i], i));
  }

  _spawnBalloon(color, phase, index) {
    const angle = (index / COLORS.length) * Math.PI * 2;
    const r = 0.12;
    const startPos = new THREE.Vector3(
      Math.cos(angle) * r,
      STRING_LENGTH + index * 0.04,
      Math.sin(angle) * r,
    );
    const restPos = new THREE.Vector3(0, STRING_LENGTH, 0);

    // Balloon
    const geo = new THREE.SphereGeometry(BALLOON_RADIUS, 32, 24);
    geo.applyMatrix4(new THREE.Matrix4().makeScale(1.0, 1.22, 1.0));

    const c = new THREE.Color(color);

    const mat = new THREE.MeshPhysicalNodeMaterial({
      color: c,
      roughness: 0.12,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
    });
    mat.lightsNode = this._lightsNode;

    const balloon = new THREE.Mesh(geo, mat);
    balloon.position.copy(startPos);
    balloon.castShadow = true;
    this.group.add(balloon);

    // Knot
    const knotGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const knotMat = new THREE.MeshPhysicalNodeMaterial({
      color: c,
      roughness: 0.45,
    });
    knotMat.lightsNode = this._lightsNode;
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.set(
      startPos.x,
      startPos.y - BALLOON_RADIUS * 1.25,
      startPos.z,
    );
    this.group.add(knot);

    // String
    const origin = new THREE.Vector3();
    const pts = this._curvePoints(origin, knot.position.clone(), origin);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({ color: "#cccccc" });
    const string = new THREE.Line(lineGeo, lineMat);
    this.group.add(string);

    this.balloons.push({
      pos: startPos.clone(),
      vel: new THREE.Vector3(),
      rest: restPos,
      phase,
      balloon,
      knot,
      string,
    });
  }

  _curvePoints(from, to, lateralOffset) {
    const mid = from.clone().lerp(to, 0.5);
    mid.x += lateralOffset.x * 0.35;
    mid.z += lateralOffset.z * 0.35;
    return new THREE.CatmullRomCurve3([from, mid, to]).getPoints(
      STRING_SEGMENTS,
    );
  }

  update() {
    const t = this.experience.time.elapsed * 0.001;
    const dt = Math.min(this.experience.time.delta * 0.001, 0.033);

    const forces = this.balloons.map(() => new THREE.Vector3());

    // Spring toward rest + wind
    this.balloons.forEach((b, i) => {
      forces[i].addScaledVector(b.rest.clone().sub(b.pos), SPRING_K);
      forces[i].x += Math.sin(t * 0.55 + b.phase) * WIND_STR;
      forces[i].z += Math.cos(t * 0.42 + b.phase * 1.3) * WIND_STR * 0.8;
      forces[i].y += Math.sin(t * 0.72 + b.phase) * WIND_STR * 0.35;
    });

    // Balloon–balloon repulsion
    for (let i = 0; i < this.balloons.length; i++) {
      for (let j = i + 1; j < this.balloons.length; j++) {
        const diff = this.balloons[i].pos.clone().sub(this.balloons[j].pos);
        const dist = diff.length();
        if (dist < COLLISION_DIST && dist > 0.001) {
          const mag = (COLLISION_DIST - dist) * REPULSION_K;
          diff.normalize();
          forces[i].addScaledVector(diff, mag);
          forces[j].addScaledVector(diff, -mag);
        }
      }
    }

    const origin = new THREE.Vector3();

    this.balloons.forEach((b, i) => {
      b.vel.addScaledVector(forces[i], dt);
      b.vel.multiplyScalar(1 - DAMPING * dt);
      if (b.vel.lengthSq() > 25) b.vel.setLength(5);

      b.pos.addScaledVector(b.vel, dt);

      if (b.pos.y < 0.4) {
        b.pos.y = 0.4;
        b.vel.y = Math.abs(b.vel.y) * 0.4;
      }

      b.balloon.position.copy(b.pos);
      b.knot.position.set(b.pos.x, b.pos.y - BALLOON_RADIUS * 1.25, b.pos.z);

      b.string.geometry.setFromPoints(
        this._curvePoints(origin, b.knot.position.clone(), b.pos),
      );
    });
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
