import * as THREE from "three/webgpu";
import { Experience } from "./Experience";
import { OrbitControls } from "three/examples/jsm/Addons.js";

import normalizeWheel from "normalize-wheel";

export class Mouse {
  constructor() {
    this.experience = Experience.getInstance();
    this.instance = new THREE.Vector2(0, 0);

    this.init();
  }

  init() {
    window.addEventListener("mousemove", (e) => {
      this.instance.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.instance.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }
}
