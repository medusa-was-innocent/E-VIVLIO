import * as THREE from "three/webgpu";
import { Experience } from "./Experience";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export class Camera {
  constructor() {
    this.experience = Experience.getInstance();

    this.mousePositionStrength = 3;
    this.mouseRotationStrength = 0.05;
    this.baseRotation = new THREE.Euler(0, 0, 0);
    this.basePosition = new THREE.Vector3(
      -1,
      2.3276204297380789,
      10.9035362538756501,
    );
    this.homePosition = this.basePosition.clone();
    this.targetPosition = new THREE.Vector3();
    this.locked = false;

    this.zoomTarget = 0;
    this.zoomOffset = 0;
    this.zoomSpeed = 0.02;
    const zoomBounds = this.getZoomBounds();
    this.zoomMin = zoomBounds.min;
    this.zoomMax = zoomBounds.max;
    this._zoomDir = new THREE.Vector3();
    this._pinchDist0 = null;
    this._pinchZoom0 = 0;
    this._touchPrevX = null;
    this._touchPrevY = null;
    this.touchDragSensitivity = 0.03;
    this.touchBoundsX = 16;
    this.touchBoundsYPos = 3;
    this.touchBoundsYNeg = 7;

    this.init();
    this.setOrbitControls();
    this.setupZoom();
    this.addGuiToggle();
  }

  init() {
    this.instance = new THREE.PerspectiveCamera(
      40,
      this.experience.sizes.aspect,
      0.1,
      1000,
    );

    this.instance.position.copy(this.basePosition);

    this.experience.scene.add(this.instance);
  }

  setOrbitControls() {
    this.controls = new OrbitControls(
      this.instance,
      this.experience.canvasElement,
    );
    this.controls.enableDamping = true;
    this.controls.target.set(0, 7.30654614930856, -0.9060611041720253);
    this.controls.enabled = false;

    // set rotation after OrbitControls constructor (which calls update() internally and overwrites rotation)
    this.instance.rotation.set(0, 0, 0);
  }

  setupZoom() {
    const canvas = this.experience.canvasElement;

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.zoomTarget = Math.max(
        this.zoomMin,
        Math.min(this.zoomMax, this.zoomTarget - e.deltaY * this.zoomSpeed),
      );
    }, { passive: false });

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        this._pinchDist0 = this._getPinchDist(e.touches);
        this._pinchZoom0 = this.zoomTarget;
        this._touchPrevX = null;
        this._touchPrevY = null;
      } else if (e.touches.length === 1) {
        this._touchPrevX = e.touches[0].clientX;
        this._touchPrevY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && this._pinchDist0 != null) {
        e.preventDefault();
        const delta = (this._getPinchDist(e.touches) - this._pinchDist0) * 0.05;
        this.zoomTarget = Math.max(
          this.zoomMin,
          Math.min(this.zoomMax, this._pinchZoom0 + delta),
        );
      } else if (
        e.touches.length === 1 &&
        this._touchPrevX !== null &&
        !this.locked &&
        !this.experience.world?.raycaster?.inFocus &&
        !this.experience.raycaster?.isModalOpen &&
        !this.experience.world?.chalkboard?._isDrawing
      ) {
        e.preventDefault();
        const dx = e.touches[0].clientX - this._touchPrevX;
        const dy = e.touches[0].clientY - this._touchPrevY;

        this.basePosition.x = THREE.MathUtils.clamp(
          this.basePosition.x - dx * this.touchDragSensitivity,
          this.homePosition.x - this.touchBoundsX,
          this.homePosition.x + this.touchBoundsX,
        );
        this.basePosition.y = THREE.MathUtils.clamp(
          this.basePosition.y + dy * this.touchDragSensitivity,
          this.homePosition.y - this.touchBoundsYNeg,
          this.homePosition.y + this.touchBoundsYPos,
        );

        this._touchPrevX = e.touches[0].clientX;
        this._touchPrevY = e.touches[0].clientY;
      }
    }, { passive: false });

    const endTouch = () => {
      this._pinchDist0 = null;
      this._touchPrevX = null;
      this._touchPrevY = null;
    };
    canvas.addEventListener("touchend", endTouch, { passive: true });
    canvas.addEventListener("touchcancel", endTouch, { passive: true });
  }

  _getPinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  addGuiToggle() {
    const folder = this.experience.gui.addFolder("Camera");
    folder.add(this.controls, "enabled").name("Orbit Controls");
    const zoomFolder = folder.addFolder("Zoom");
    zoomFolder.add(this, "zoomMin", -20, 0, 0.5).name("Bound (forward)");
    zoomFolder.add(this, "zoomMax", 0, 20, 0.5).name("Bound (backward)");
    zoomFolder.add(this, "zoomSpeed", 0.001, 0.1, 0.001).name("Speed");
  }

  zoomedDestination(destPos, finalRotX = 0, finalRotY = 0, finalRotZ = 0) {
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(finalRotX, finalRotY, finalRotZ),
    );
    return {
      x: destPos.x + forward.x * this.zoomOffset,
      y: destPos.y + forward.y * this.zoomOffset,
      z: destPos.z + forward.z * this.zoomOffset,
    };
  }

  getZoomBounds() {
    const isSmall =
      this.experience.device.isMobileDevice || window.innerWidth < 768;
    return isSmall ? { min: -12, max: 12 } : { min: -8, max: 4 };
  }

  resize() {
    this.instance.aspect = this.experience.sizes.aspect;
    this.instance.updateProjectionMatrix();
    const zoomBounds = this.getZoomBounds();
    this.zoomMin = zoomBounds.min;
    this.zoomMax = zoomBounds.max;
  }

  update() {
    if (this.controls.enabled) {
      this.controls.update();
      return;
    }

    if (this.locked) return;

    this.zoomOffset = THREE.MathUtils.lerp(this.zoomOffset, this.zoomTarget, 0.1);

    if (this.experience.device.isMobileDevice) {
      this.targetPosition.set(
        this.basePosition.x,
        this.basePosition.y,
        this.basePosition.z,
      );
      this.instance.getWorldDirection(this._zoomDir);
      this.targetPosition.addScaledVector(this._zoomDir, this.zoomOffset);
      this.instance.position.lerp(this.targetPosition, 0.15);
      return;
    }

    const mouse = this.experience.mouse.instance;

    this.targetPosition.set(
      this.basePosition.x + mouse.x * this.mousePositionStrength,
      this.basePosition.y + mouse.y * this.mousePositionStrength,
      this.basePosition.z,
    );

    this.instance.getWorldDirection(this._zoomDir);
    this.targetPosition.addScaledVector(this._zoomDir, this.zoomOffset);

    this.instance.position.lerp(this.targetPosition, 0.15);

    this.instance.rotation.x = THREE.MathUtils.lerp(
      this.instance.rotation.x,
      this.baseRotation.x + mouse.y * this.mouseRotationStrength,
      0.1,
    );
    this.instance.rotation.y = THREE.MathUtils.lerp(
      this.instance.rotation.y,
      this.baseRotation.y + -mouse.x * this.mouseRotationStrength,
      0.1,
    );
  }
}
