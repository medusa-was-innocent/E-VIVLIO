import gsap from "gsap";

export class Modal {
  static _openCount = 0;
  static get anyOpen() { return Modal._openCount > 0; }

  constructor() {
    this._overlay = document.createElement("div");
    this._overlay.className = "modal-overlay";

    this._el = document.createElement("div");
    this._el.className = "modal";
    this._el.setAttribute("role", "dialog");
    this._el.setAttribute("aria-modal", "true");
    this._el.setAttribute("aria-hidden", "true");
    this._el.inert = true;
    this._opened = false;
    this._el.innerHTML = `
      <button class="modal__close-button" aria-label="Close dialog">&#x2715;</button>
      <h2 class="modal__title"></h2>
      <p class="modal__paragraph"></p>
    `;

    document.body.appendChild(this._overlay);
    document.body.appendChild(this._el);

    // Let GSAP own the transform so it can compose xPercent + scale cleanly
    gsap.set(this._el, { xPercent: -50, yPercent: -50 });

    this._overlay.addEventListener("click", () => this.close());
    this._el.querySelector(".modal__close-button").addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => {
      if (!this._opened) return;
      if (e.key === "Escape") this.close();
      if (e.key === "Tab") {
        const items = [...this._el.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
  }

  open(title, text) {
    this._el.setAttribute("aria-label", title);
    this._el.querySelector(".modal__title").textContent = title;
    this._el.querySelector(".modal__paragraph").textContent = text;
    this._show();
  }

  openHTML(title, html) {
    this._el.setAttribute("aria-label", title);
    this._el.querySelector(".modal__title").textContent = title;
    this._el.querySelector(".modal__paragraph").innerHTML = html;
    this._show();
  }

  _show() {

    gsap.killTweensOf([this._overlay, this._el]);
    this._overlay.style.pointerEvents = "auto";
    this._el.style.pointerEvents = "auto";
    if (!this._opened) {
      this._previousFocus = document.activeElement;
      Modal._openCount++;
    }
    this._opened = true;
    this._el.inert = false;
    this._el.setAttribute("aria-hidden", "false");
    this._el.querySelector(".modal__close-button").focus({ preventScroll: true });

    gsap.fromTo(this._overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: "power2.out" }
    );
    gsap.fromTo(this._el,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.4)" }
    );
  }

  close() {
    if (!this._opened) return;
    this._opened = false;
    Modal._openCount = Math.max(0, Modal._openCount - 1);
    this._previousFocus?.focus?.({ preventScroll: true });
    this._el.inert = true;
    this._el.setAttribute("aria-hidden", "true");
    gsap.killTweensOf([this._overlay, this._el]);
    gsap.to(this._overlay, {
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        this._overlay.style.pointerEvents = "none";
      },
    });
    gsap.to(this._el, {
      opacity: 0,
      scale: 0.94,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => { this._el.style.pointerEvents = "none"; },
    });
  }

  get isOpen() {
    return parseFloat(gsap.getProperty(this._el, "opacity")) > 0.1;
  }
}
