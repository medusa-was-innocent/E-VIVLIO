import * as THREE from "three/webgpu";
import {
  texture,
  uv,
  positionWorld,
  vec2,
  vec3,
  vec4,
  select,
  uniform,
  time,
  mx_noise_float,
} from "three/tsl";
import { Experience } from "../Experience";
import {
  spotProjectionMatrixUniform,
  spotProjectionMatrixUniform2,
} from "./Environment";

export class Background {
  constructor() {
    this.experience = Experience.getInstance();
    this.model = this.experience.resources.items.loveYou.scene;
    this.goboTex = this.experience.resources.items.goboTexture;
    this.goboTex.colorSpace = THREE.NoColorSpace;
    this.init();
  }

  init() {
    const uGoboStrength = uniform(0.5);
    const uSwayAmount = uniform(0.008);
    const uSwaySpeed = uniform(0.2);

    this.model.traverse((obj) => {
      if (!obj.isMesh) return;

      const old = obj.material;
      const mat = new THREE.MeshBasicNodeMaterial();

      if (old.map) {
        const bakedSample = texture(old.map, uv());

        const clipPos = spotProjectionMatrixUniform.mul(
          vec4(positionWorld, 1.0),
        );
        const projUV = clipPos.xy.div(clipPos.w).mul(0.5).add(0.5);

        const inFrustum = clipPos.w
          .greaterThan(0.0)
          .and(projUV.x.greaterThanEqual(0.0))
          .and(projUV.x.lessThanEqual(1.0))
          .and(projUV.y.greaterThanEqual(0.0))
          .and(projUV.y.lessThanEqual(1.0));

        const t = time.mul(uSwaySpeed);

        // Low spatial frequency → nearby leaves move as a coherent group.
        // Two seeds for X/Y so motion isn't purely diagonal.
        const offsetX = mx_noise_float(
          vec3(projUV.x.mul(2.0), projUV.y.mul(2.0), t),
        );
        const offsetY = mx_noise_float(
          vec3(
            projUV.x.mul(2.0).add(5.2),
            projUV.y.mul(2.0).add(1.3),
            t.add(2.7),
          ),
        );

        // Static noise (no time) gives each region a different intensity multiplier
        // so some areas sway more than others without tearing the pattern apart.
        const areaVariation = mx_noise_float(vec3(projUV.x, projUV.y, 0.0))
          .abs()
          .mul(1.5)
          .add(0.3);

        const distortedUV = projUV.add(
          vec2(offsetX, offsetY).mul(uSwayAmount).mul(areaVariation),
        );

        const goboSample = select(
          inFrustum,
          texture(this.goboTex, distortedUV).rgb,
          vec3(1.0),
        );
        const softGobo = goboSample.oneMinus().mul(uGoboStrength).oneMinus();

        // Second projector light — same gobo, same sway, shifted left 10 units
        const clipPos2 = spotProjectionMatrixUniform2.mul(vec4(positionWorld, 1.0));
        const projUV2 = clipPos2.xy.div(clipPos2.w).mul(0.5).add(0.5);
        const inFrustum2 = clipPos2.w
          .greaterThan(0.0)
          .and(projUV2.x.greaterThanEqual(0.0))
          .and(projUV2.x.lessThanEqual(1.0))
          .and(projUV2.y.greaterThanEqual(0.0))
          .and(projUV2.y.lessThanEqual(1.0));
        const offsetX2 = mx_noise_float(
          vec3(projUV2.x.mul(2.0).add(9.1), projUV2.y.mul(2.0).add(4.7), t),
        );
        const offsetY2 = mx_noise_float(
          vec3(projUV2.x.mul(2.0).add(14.3), projUV2.y.mul(2.0).add(5.9), t.add(2.7)),
        );
        const areaVariation2 = mx_noise_float(
          vec3(projUV2.x.add(7.3), projUV2.y.add(3.1), 0.0),
        ).abs().mul(1.5).add(0.3);
        const distortedUV2 = projUV2.add(
          vec2(offsetX2, offsetY2).mul(uSwayAmount).mul(areaVariation2),
        );
        const goboSample2 = select(
          inFrustum2,
          texture(this.goboTex, distortedUV2).rgb,
          vec3(1.0),
        );
        const softGobo2 = goboSample2.oneMinus().mul(uGoboStrength).oneMinus();

        mat.colorNode = bakedSample.mul(softGobo).mul(softGobo2);
      } else {
        mat.color.copy(old.color);
      }

      old.dispose();
      obj.material = mat;
    });

    this.experience.scene.add(this.model);

    const folder = this.experience.gui.addFolder("Gobo Projection");
    folder
      .add({ strength: 0.4 }, "strength", 0, 1, 0.01)
      .name("Shadow Strength")
      .onChange((v) => {
        uGoboStrength.value = v;
      });
    folder
      .add({ swayAmount: 0.006 }, "swayAmount", 0, 0.03, 0.001)
      .name("Sway Amount")
      .onChange((v) => {
        uSwayAmount.value = v;
      });
    folder
      .add({ swaySpeed: 0.2 }, "swaySpeed", 0, 1, 0.01)
      .name("Sway Speed")
      .onChange((v) => {
        uSwaySpeed.value = v;
      });

  }

  resize() {}
  update() {}
  destroy() {}
}
