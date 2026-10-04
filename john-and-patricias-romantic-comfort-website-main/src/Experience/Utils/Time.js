import { EventEmitter } from "events";

export class Time extends EventEmitter {
  constructor() {
    super();

    this.start = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16;

    this.stepFPS = 6;
    this.stepInterval = 1000 / this.stepFPS; // ms
    this.lastStepTime = 0;
    this.isStepFrame = false;
    this.stepDelta = 0;

    this.active = true;
    this.frame = null;
    const sync = () => {
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
      if (this.active && !document.hidden) {
        this.current = performance.now();
        this.start = this.current - this.elapsed;
        this.lastStepTime = this.elapsed;
        this.frame = requestAnimationFrame(() => this.tick());
      }
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("message", event => {
      if (event.source !== parent || event.origin !== location.origin || event.data?.type !== "ecosystem-view") return;
      this.active = !!event.data.active;
      sync();
    });
    sync();
  }

  setStepFPS(fps) {
    this.stepFPS = fps;
    this.stepInterval = 1000 / fps;
  }

  shouldStep() {
    return this.isStepFrame;
  }

  tick() {
    const currentTime = performance.now();
    this.delta = currentTime - this.current;
    this.current = currentTime;
    this.elapsed = currentTime - this.start;

    if (this.elapsed - this.lastStepTime >= this.stepInterval) {
      this.isStepFrame = true;
      this.stepDelta = this.elapsed - this.lastStepTime;
      this.lastStepTime = this.elapsed;
    } else {
      this.isStepFrame = false;
    }

    this.emit("update");

    this.frame = window.requestAnimationFrame(() => this.tick());
  }
}
