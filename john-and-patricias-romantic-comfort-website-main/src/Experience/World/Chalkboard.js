import * as THREE from "three/webgpu";
import { texture, uv } from "three/tsl";
import { Experience } from "../Experience";

const CANVAS_SIZE = 1024;
const MAX_POINTS = 800;  // oldest points evicted when exceeded
const BRUSH_RADIUS = 0.4;
const DOTS_PER_STEP = 6;
const STEP_DIST = 2; // canvas pixels between interpolation steps

export class Chalkboard {
  constructor() {
    this.experience = Experience.getInstance();
    this.camera = this.experience.camera.instance;
    this.canvasEl = this.experience.canvasElement;

    this._mesh = null;
    this._isDrawing = false;
    this._lastUV = null;
    this._raycaster = new THREE.Raycaster();
    // Rolling buffer of { particles[] } — each entry is one interpolated step
    this._buffer = [];
    this._dirty = false;
    this._lastDayNight = -1;

    this._setupCanvas();
    this._findAndPatchMesh();
    this._setupEvents();
  }

  _setupCanvas() {
    this.drawCanvas = document.createElement("canvas");
    this.drawCanvas.width = CANVAS_SIZE;
    this.drawCanvas.height = CANVAS_SIZE;
    this._ctx = this.drawCanvas.getContext("2d");

    this.chalkTex = new THREE.CanvasTexture(this.drawCanvas);
    this.chalkTex.flipY = false;
  }

  _findAndPatchMesh() {
    const room = this.experience.world.room;
    if (!room) return;

    room.model.traverse((obj) => {
      if (!obj.isMesh || obj.name !== "Seventh_Chalkboard") return;
      this._mesh = obj;

      const chalkSample = texture(this.chalkTex, uv());
      const base = obj.material.colorNode;
      obj.material.colorNode = base.add(chalkSample.rgb.mul(chalkSample.a));
      obj.material.needsUpdate = true;
    });
  }

  _setupEvents() {
    this._onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const hitUV = this._getUV(e.clientX, e.clientY);
      if (!hitUV) return;
      this._isDrawing = true;
      this._lastUV = hitUV;
      this._addStep(hitUV, hitUV);
      this.canvasEl.setPointerCapture(e.pointerId);
    };

    this._onMove = (e) => {
      if (!this._isDrawing) return;
      const hitUV = this._getUV(e.clientX, e.clientY);
      if (hitUV && this._lastUV) {
        this._addStep(this._lastUV, hitUV);
        this._lastUV = hitUV;
      }
    };

    this._onUp = () => {
      this._isDrawing = false;
      this._lastUV = null;
    };

    this.canvasEl.addEventListener("pointerdown", this._onDown);
    this.canvasEl.addEventListener("pointermove", this._onMove);
    this.canvasEl.addEventListener("pointerup", this._onUp);
    this.canvasEl.addEventListener("pointercancel", this._onUp);
    this.canvasEl.addEventListener("lostpointercapture", this._onUp);
  }

  _getUV(clientX, clientY) {
    if (!this._mesh) return null;
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    this._raycaster.setFromCamera(mouse, this.camera);
    const hits = this._raycaster.intersectObject(this._mesh);
    if (!hits.length || !hits[0].uv) return null;
    return hits[0].uv.clone();
  }

  _addStep(fromUV, toUV) {
    const w = CANVAS_SIZE;
    const h = CANVAS_SIZE;
    const x0 = fromUV.x * w;
    const y0 = fromUV.y * h;
    const x1 = toUV.x * w;
    const y1 = toUV.y * h;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / STEP_DIST));

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      this._buffer.push(this._makeParticles(x0 + dx * t, y0 + dy * t));
    }

    // Evict oldest points to stay within the rolling window
    while (this._buffer.length > MAX_POINTS) {
      this._buffer.shift();
    }

    this._dirty = true;
  }

  _makeParticles(cx, cy) {
    const particles = [];
    for (let i = 0; i < DOTS_PER_STEP; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * BRUSH_RADIUS;
      const dotSize = Math.random() * 2.5 + 0.5;
      const base = Math.floor(Math.random() * 20 + 190); // slightly less white
      particles.push({
        px: cx + Math.cos(angle) * r,
        py: cy + Math.sin(angle) * r,
        dotSize,
        // tiny orange tint: red stays high, green dips a little, blue dips more
        pr: Math.min(255, base + 6),
        pg: base - 6,
        pb: base - 20,
        alpha: Math.random() * 0.45 + 0.2,
      });
    }
    return particles;
  }

  _redrawCanvas() {
    const dayNight = this.experience.world.room?.uDayNight?.value ?? 0;
    // At night (dayNight=1), chalk dims to ~45% of day brightness
    const dim = 0.65 - dayNight * 0.6;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    for (const particles of this._buffer) {
      for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `rgb(${Math.round(p.pr * dim)},${Math.round(p.pg * dim)},${Math.round(p.pb * dim)})`;
        ctx.fillRect(p.px - p.dotSize * 0.5, p.py - p.dotSize * 0.5, p.dotSize, p.dotSize);
      }
    }
    ctx.globalAlpha = 1;
    this.chalkTex.needsUpdate = true;
  }

  update() {
    if (!this._mesh) return;
    // Re-render during day/night transitions even without new strokes
    const dayNight = this.experience.world.room?.uDayNight?.value ?? 0;
    if (dayNight !== this._lastDayNight) {
      this._lastDayNight = dayNight;
      this._dirty = true;
    }
    if (!this._dirty) return;
    this._redrawCanvas();
    this._dirty = false;
  }

  destroy() {
    this.canvasEl.removeEventListener("pointerdown", this._onDown);
    this.canvasEl.removeEventListener("pointermove", this._onMove);
    this.canvasEl.removeEventListener("pointerup", this._onUp);
    this.canvasEl.removeEventListener("pointercancel", this._onUp);
    this.canvasEl.removeEventListener("lostpointercapture", this._onUp);
    this.chalkTex.dispose();
  }
}
