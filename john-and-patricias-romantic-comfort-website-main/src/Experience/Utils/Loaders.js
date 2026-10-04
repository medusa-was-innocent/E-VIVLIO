import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

import * as THREE from "three/webgpu";
import { Experience } from "../Experience";

export class Loaders {
  constructor() {
    this.init();
  }

  init() {
    this.loaders = {};
    this.loaders.gltfLoader = new GLTFLoader();
    this.loaders.dracoLoader = new DRACOLoader();
    this.loaders.dracoLoader.setWorkerLimit(2);
    this.loaders.dracoLoader.setDecoderPath("/draco/");
    this.loaders.gltfLoader.setDRACOLoader(this.loaders.dracoLoader);
    this.loaders.imageBitmapLoader = new THREE.ImageBitmapLoader();
    this.loaders.imageBitmapLoader.setOptions({ imageOrientation: "flipY" });
    this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader();
    this.loaders.textureLoader = new THREE.TextureLoader();

    const experience = Experience.getInstance();
    {
      this.loaders.ktx2Loader = new KTX2Loader();
      this.loaders.ktx2Loader.setWorkerLimit(2);
      this.loaders.ktx2Loader.setTranscoderPath("/basis/");
      this.loaders.ktx2Loader.detectSupport(experience.renderer.renderer);
    }
  }
}
