import * as THREE from "three/webgpu";
import { uv, vec3, float, mix, time, uniform, mx_noise_float } from "three/tsl";
import { Experience } from "../Experience";

// Blender: (-0.7378, 29.9419, 9.3322)  →  Three.js: x=B_x, y=B_z, z=-B_y
const CANDLE_POS = new THREE.Vector3(-0.7377529, 9.3321953, -29.9419174);

export class Candle {
  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;
    this._build();
  }

  _build() {
    this._buildFlame();
    this._buildGlow();

    this.light = new THREE.PointLight(0xff7722, 2.2, 2.8);
    this.light.position.copy(CANDLE_POS);
    this.light.position.y += 0.5;
    this.scene.add(this.light);
  }

  _buildFlame() {
    const geo = new THREE.PlaneGeometry(0.45, 0.9);
    geo.translate(0, 0.45, 0);

    const mat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const fuv = uv();
    const cx  = fuv.x.sub(0.5);
    const h   = fuv.y;

    const n1 = mx_noise_float(
      vec3(cx.mul(4.0), h.mul(3.5).sub(time.mul(5.0)), time.mul(0.8))
    ).mul(0.5).add(0.5);

    const sway = mx_noise_float(vec3(float(0.0), h.mul(2.0).sub(time.mul(2.5)), time.mul(0.4)))
      .mul(0.18).mul(h);
    const cxWaved = cx.sub(sway);

    const halfW  = float(0.48).sub(h.mul(0.44));
    const inside = float(1.0).sub(cxWaved.abs().div(halfW.max(float(0.01)))).clamp(float(0.0), float(1.0));
    const shape  = inside.mul(inside);
    const fade   = float(1.0).sub(h.mul(h));
    const alpha  = shape.mul(fade).mul(n1.mul(0.5).add(0.5));

    const white  = vec3(1.0, 0.95, 0.7);
    const orange = vec3(1.0, 0.42, 0.02);
    const dark   = vec3(0.55, 0.05, 0.0);

    const color = mix(
      mix(white, orange, h.mul(1.6).clamp(float(0.0), float(1.0))),
      dark,
      h.sub(0.5).mul(2.2).clamp(float(0.0), float(1.0))
    );

    mat.colorNode = color.mul(alpha);

    this.flame = new THREE.Mesh(geo, mat);
    this.flame.position.copy(CANDLE_POS);
    this.flame.renderOrder = 1;
    this.scene.add(this.flame);
  }

  _buildGlow() {
    this.uNight = uniform(0.0);

    const geo = new THREE.PlaneGeometry(6, 6);

    const mat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const dist = uv().sub(0.5).length();
    const glow = float(1.0).sub(dist.mul(2.4)).clamp(float(0.0), float(1.0));
    const soft = glow.mul(glow).mul(glow);

    mat.colorNode = vec3(1.0, 0.38, 0.04).mul(soft).mul(this.uNight);

    this.glow = new THREE.Mesh(geo, mat);
    this.glow.position.copy(CANDLE_POS);
    this.glow.position.y += 0.3;
    this.glow.renderOrder = 1;
    this.scene.add(this.glow);
  }

  update() {
    const camera = this.experience.camera.instance;
    this.flame.lookAt(camera.position);
    this.glow.lookAt(camera.position);

    const nightBlend = this.experience.world.room?.uDayNight?.value ?? 0;
    const t = Date.now() * 0.001;

    const flickerFast = 0.82 + 0.18 * Math.sin(t * 11.3) * Math.sin(t * 7.1 + 1.4);
    const flickerSlow = 0.90 + 0.10 * Math.sin(t * 2.7) * Math.sin(t * 1.9 + 0.8);
    const flicker = flickerFast * flickerSlow;

    this.uNight.value = nightBlend * flicker;

    const sizeFlicker = 0.97 + 0.065 * Math.sin(t * 3.1) * Math.sin(t * 5.3 + 2.1);
    this.glow.scale.setScalar(nightBlend * sizeFlicker + (1 - nightBlend));

    const flameFlicker = 0.96 + 0.04 * Math.sin(t * 8.7 + 0.5) * Math.sin(t * 4.1);
    this.flame.scale.setScalar(flameFlicker);

    this.light.intensity = (2.2 + nightBlend * 9.0) * flicker;
    this.light.distance  =  2.8 + nightBlend * 7.5;
  }
}
