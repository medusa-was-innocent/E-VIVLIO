import * as THREE from "three/webgpu";

import { EventEmitter } from "events";
import { Experience } from "./Experience";

import gsap from "gsap";

export class Preloader extends EventEmitter {
  constructor() {
    super();
    this.experience = Experience.getInstance();
    this.resources = this.experience.resources;

    this.preloader = document.querySelector(".preloader");
    this.progressBar = document.querySelector(".preloader__progress-bar");
    this.percentText = document.querySelector(".preloader__percent");
    this.progressWrapper = document.querySelector(
      ".preloader__progress-wrapper",
    );
    this.introEl = document.querySelector(".preloader__intro");

    document.getElementById("enter-btn").addEventListener("click", () => {
      this.experience.world.raycaster?.toggleMusic();
      this._dismiss();
    });

    document.getElementById("enter-silent-btn").addEventListener("click", () => {
      this._dismiss();
    });

    this.resources.on("progress", (value) => {
      this.onLoad(value);
    });

    this.resources.on("asset-error", () => {
      this.percentText.textContent = "The cottage could not load. Retry, or open an app below.";
      document.getElementById("retry-cottage").hidden = false;
    });
    document.getElementById("retry-cottage").onclick = () => {
      document.getElementById("retry-cottage").hidden = true;
      this.resources.startLoading();
    };
    this.resources.on("ready", () => {
      this.playOutro();
    });
  }

  onLoad(value) {
    const pct = Math.round(value * 100);
    this.progressBar.style.width = `${pct}%`;
    this.percentText.textContent = `${pct}%`;
  }

  playOutro() {
    try { if (sessionStorage.getItem("cottage-entered")) { this._dismiss(); return; } } catch {}
    gsap.to([this.progressWrapper, this.percentText], {
      opacity: 0,
      duration: 0.3,
      delay: 0.5,
      onComplete: () => {
        this.progressWrapper.style.display = "none";
        this.percentText.style.display = "none";
        this.introEl.style.display = "flex";
        gsap.fromTo(
          this.introEl,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
        );
      },
    });
  }

  _dismiss() {
    try { sessionStorage.setItem("cottage-entered", "1"); } catch {}
    gsap.to(this.preloader, {
      opacity: 0,
      duration: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        this.preloader.remove();
        this.emit("preloaderfinished");
      },
    });
  }
}
