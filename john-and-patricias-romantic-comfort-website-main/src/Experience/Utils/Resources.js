import * as THREE from "three/webgpu";
import { EventEmitter } from "events";
import { Loaders } from "./Loaders";
import assets, { nightAssets } from "./assets";

export class Resources extends EventEmitter {
  constructor() {
    super();
    this.loaders = new Loaders().loaders;
    this.assets = assets;
    this.items = {};
    this.queue = assets.length;
    this.loaded = 0;
    this.startLoading();
  }

  async loadAsset(asset) {
    if (this.items[asset.name]) return this.items[asset.name];
    const loader = this.loaders[{ glbModel: 'gltfLoader', texture: 'textureLoader', ktx2: 'ktx2Loader', skybox: 'cubeTextureLoader' }[asset.type]];
    const file = await loader.loadAsync(asset.path);
    if (asset.type === 'texture' || asset.type === 'ktx2') file.colorSpace = THREE.SRGBColorSpace;
    this.items[asset.name] = file;
    return file;
  }

  async loadQueue(list, onLoaded = () => {}) {
    let cursor = 0;
    const workers = Array.from({length: Math.min(4, list.length)}, async () => {
      while (cursor < list.length) {
        const asset = list[cursor++];
        await this.loadAsset(asset);
        onLoaded();
      }
    });
    // Settle every worker before allowing retry; avoid overlapping downloads.
    const results = await Promise.allSettled(workers);
    const failure = results.find(r => r.status === 'rejected');
    if (failure) throw failure.reason;
  }

  async startLoading() {
    if (this.loading) return;
    this.loading = true;
    this.loaded = 0;
    try {
      await this.loadQueue(this.assets, () => {
        this.loaded++;
        this.emit('progress', this.loaded / this.queue);
      });
      this.emit('ready');
    } catch {
      this.emit('asset-error');
    } finally { this.loading = false; }
  }

  async loadNightTextures() {
    if (!this.nightLoading) this.nightLoading = this.loadQueue(nightAssets).catch(error => {
      this.nightLoading = null;
      throw error;
    });
    await this.nightLoading;
  }
}
