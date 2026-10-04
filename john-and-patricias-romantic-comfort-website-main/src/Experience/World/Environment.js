import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import { Experience } from "../Experience";

export const spotProjectionMatrixUniform = uniform(new THREE.Matrix4());
export const spotProjectionMatrixUniform2 = uniform(new THREE.Matrix4());
export const spotProjectionMatrixUniform3 = uniform(new THREE.Matrix4());

export class Environment {
  constructor() {
    this.experience = Experience.getInstance();

    this.init();
  }

  init() {
    this.gui = this.experience.gui.addFolder("Environment");

    this.setupScene();
    this.setupDirectionalLight();
    this.setupProjectorLight();
    this.setupProjectorLight2();
    this.setupProjectorLight3();
  }

  setupScene() {
    const defaultColor = "#ffffff";
    // this.experience.scene.background = new THREE.Color(defaultColor);
    // this.experience.scene.background = this.experience.resources.items.skybox;
    // this.experience.scene.backgroundIntensity = 0.45;
    this.gui
      .addColor({ color: defaultColor }, "color")
      .name("Background")
      .onChange((val) => {
        this.experience.scene.background.set(val);
        // Keep fog synced with background for seamless blending
        if (this._fogMatchesBackground && this.experience.scene.fog) {
          this.experience.scene.fog.color.set(val);
          this._fogColorCtrl?.setValue(val);
        }
      });
  }

  setupDirectionalLight() {
    this.directionalLight = new THREE.DirectionalLight("#ffffff", 2.56);
    this.directionalLight.position.set(60, 75, 50);
    this.directionalLight.target.position.set(8, 10, -23);
    this.experience.scene.add(this.directionalLight);
    this.experience.scene.add(this.directionalLight.target);

    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -80;
    this.directionalLight.shadow.camera.right = 80;
    this.directionalLight.shadow.camera.top = 80;
    this.directionalLight.shadow.camera.bottom = -80;
    this.directionalLight.shadow.normalBias = 0.01;

    this.directionalLightHelper = new THREE.DirectionalLightHelper(
      this.directionalLight,
      0.5,
    );
    this.directionalLightHelper.visible = false;
    this.experience.scene.add(this.directionalLightHelper);

    this.shadowCameraHelper = new THREE.CameraHelper(
      this.directionalLight.shadow.camera,
    );
    this.shadowCameraHelper.visible = false;
    this.experience.scene.add(this.shadowCameraHelper);

    // Push the initial direction into the hatch uniform.

    const folder = this.gui.addFolder("Directional Light");
    folder
      .addColor({ color: "#ffffff" }, "color")
      .name("Color")
      .onChange((val) => this.directionalLight.color.set(val));
    folder
      .add(this.directionalLight, "intensity", 0, 5, 0.01)
      .name("Intensity");
    folder.add(this.directionalLight, "visible").name("Visible");

    const onMove = () => {
      this.directionalLightHelper.update();
      this.shadowCameraHelper.update();
    };

    const pos = folder.addFolder("Position");
    pos
      .add(this.directionalLight.position, "x", -20, 20, 0.1)
      .name("X")
      .onChange(onMove);
    pos
      .add(this.directionalLight.position, "y", -20, 20, 0.1)
      .name("Y")
      .onChange(onMove);
    pos
      .add(this.directionalLight.position, "z", -20, 20, 0.1)
      .name("Z")
      .onChange(onMove);

    const target = folder.addFolder("Target");
    target
      .add(this.directionalLight.target.position, "x", -10, 10, 0.1)
      .name("X")
      .onChange(onMove);
    target
      .add(this.directionalLight.target.position, "y", -10, 10, 0.1)
      .name("Y")
      .onChange(onMove);
    target
      .add(this.directionalLight.target.position, "z", -10, 10, 0.1)
      .name("Z")
      .onChange(onMove);

    folder.add(this.directionalLightHelper, "visible").name("Show Helper");
    folder.add(this.shadowCameraHelper, "visible").name("Show Shadow Frustum");
  }

  setupProjectorLight() {
    this.projectorLight = new THREE.SpotLight("#ffffff", 50);
    this.projectorLight.position.set(59.2, 75, 50);
    this.projectorLight.angle = Math.PI / 8;
    this.projectorLight.penumbra = 0.1;
    this.projectorLight.decay = 0;
    this.projectorLight.distance = 0;
    this.projectorLight.castShadow = true;
    this.projectorLight.shadow.mapSize.width = 1024;
    this.projectorLight.shadow.mapSize.height = 1024;
    this.projectorLight.shadow.camera.near = 0.1;
    this.projectorLight.shadow.camera.far = 200;
    this.projectorLight.shadow.focus = 1;
    this.experience.scene.add(this.projectorLight);

    this.projectorLight.target.position.set(35.4, 22.3, -23);
    this.experience.scene.add(this.projectorLight.target);

    this.projectorLightHelper = new THREE.SpotLightHelper(this.projectorLight);
    this.projectorLightHelper.visible = false;
    this.experience.scene.add(this.projectorLightHelper);

    this.projectorShadowHelper = new THREE.CameraHelper(
      this.projectorLight.shadow.camera,
    );
    this.projectorShadowHelper.visible = false;
    this.experience.scene.add(this.projectorShadowHelper);

    const folder = this.gui.addFolder("Projector Light");

    const onMove = () => {
      this.projectorLightHelper.update();
      this.projectorShadowHelper.update();
    };

    folder
      .addColor({ color: "#ffffff" }, "color")
      .name("Color")
      .onChange((val) => this.projectorLight.color.set(val));
    folder.add(this.projectorLight, "intensity", 0, 500, 1).name("Intensity");
    folder
      .add(this.projectorLight, "angle", 0, Math.PI / 3, 0.01)
      .name("Angle");
    folder.add(this.projectorLight, "penumbra", 0, 1, 0.01).name("Penumbra");
    folder.add(this.projectorLight, "decay", 0, 4, 0.01).name("Decay");
    folder.add(this.projectorLight, "distance", 0, 500, 1).name("Distance");
    folder
      .add(this.projectorLight.shadow, "focus", 0, 1, 0.01)
      .name("Shadow Focus");
    folder.add(this.projectorLight, "visible").name("Visible");

    const pos = folder.addFolder("Position");
    pos
      .add(this.projectorLight.position, "x", -100, 100, 0.1)
      .name("X")
      .onChange(onMove);
    pos
      .add(this.projectorLight.position, "y", -100, 100, 0.1)
      .name("Y")
      .onChange(onMove);
    pos
      .add(this.projectorLight.position, "z", -100, 100, 0.1)
      .name("Z")
      .onChange(onMove);

    const tgt = folder.addFolder("Target");
    tgt
      .add(this.projectorLight.target.position, "x", -50, 50, 0.1)
      .name("X")
      .onChange(onMove);
    tgt
      .add(this.projectorLight.target.position, "y", -50, 50, 0.1)
      .name("Y")
      .onChange(onMove);
    tgt
      .add(this.projectorLight.target.position, "z", -50, 50, 0.1)
      .name("Z")
      .onChange(onMove);

    folder
      .add(this.projectorLightHelper, "visible")
      .name("Show Helper")
      .setValue(false);
    folder
      .add(this.projectorShadowHelper, "visible")
      .name("Show Shadow Frustum")
      .setValue(false);
  }

  setupProjectorLight2() {
    this.projectorLight2 = new THREE.SpotLight("#ffffff", 50);
    this.projectorLight2.position.set(15.6, 62.2, 56.3);
    this.projectorLight2.angle = Math.PI / 8;
    this.projectorLight2.penumbra = 0.1;
    this.projectorLight2.decay = 0;
    this.projectorLight2.distance = 0;
    this.projectorLight2.castShadow = true;
    this.projectorLight2.shadow.mapSize.width = 1024;
    this.projectorLight2.shadow.mapSize.height = 1024;
    this.projectorLight2.shadow.camera.near = 0.1;
    this.projectorLight2.shadow.camera.far = 200;
    this.projectorLight2.shadow.focus = 1;
    this.experience.scene.add(this.projectorLight2);

    this.projectorLight2.target.position.set(-19.9, 32.5, -23);
    this.experience.scene.add(this.projectorLight2.target);

    this.projectorLightHelper2 = new THREE.SpotLightHelper(
      this.projectorLight2,
    );
    this.projectorLightHelper2.visible = false;
    this.experience.scene.add(this.projectorLightHelper2);

    this.projectorShadowHelper2 = new THREE.CameraHelper(
      this.projectorLight2.shadow.camera,
    );
    this.projectorShadowHelper2.visible = false;
    this.experience.scene.add(this.projectorShadowHelper2);

    const folder = this.gui.addFolder("Projector Light 2");

    const onMove = () => {
      this.projectorLightHelper2.update();
      this.projectorShadowHelper2.update();
    };

    folder
      .addColor({ color: "#ffffff" }, "color")
      .name("Color")
      .onChange((val) => this.projectorLight2.color.set(val));
    folder.add(this.projectorLight2, "intensity", 0, 500, 1).name("Intensity");
    folder
      .add(this.projectorLight2, "angle", 0, Math.PI / 3, 0.01)
      .name("Angle");
    folder.add(this.projectorLight2, "penumbra", 0, 1, 0.01).name("Penumbra");
    folder.add(this.projectorLight2, "decay", 0, 4, 0.01).name("Decay");
    folder.add(this.projectorLight2, "distance", 0, 500, 1).name("Distance");
    folder
      .add(this.projectorLight2.shadow, "focus", 0, 1, 0.01)
      .name("Shadow Focus");
    folder.add(this.projectorLight2, "visible").name("Visible");

    const pos = folder.addFolder("Position");
    pos
      .add(this.projectorLight2.position, "x", -100, 100, 0.1)
      .name("X")
      .onChange(onMove);
    pos
      .add(this.projectorLight2.position, "y", -100, 100, 0.1)
      .name("Y")
      .onChange(onMove);
    pos
      .add(this.projectorLight2.position, "z", -100, 100, 0.1)
      .name("Z")
      .onChange(onMove);

    const tgt = folder.addFolder("Target");
    tgt
      .add(this.projectorLight2.target.position, "x", -50, 50, 0.1)
      .name("X")
      .onChange(onMove);
    tgt
      .add(this.projectorLight2.target.position, "y", -50, 50, 0.1)
      .name("Y")
      .onChange(onMove);
    tgt
      .add(this.projectorLight2.target.position, "z", -50, 50, 0.1)
      .name("Z")
      .onChange(onMove);

    folder
      .add(this.projectorLightHelper2, "visible")
      .name("Show Helper")
      .setValue(false);
    folder
      .add(this.projectorShadowHelper2, "visible")
      .name("Show Shadow Frustum")
      .setValue(false);
  }

  setupProjectorLight3() {
    this.projectorLight3 = new THREE.SpotLight("#ffffff", 50);
    this.projectorLight3.position.set(-28.1, -36.8, 56.3);
    this.projectorLight3.angle = 0.44;
    this.projectorLight3.penumbra = 0.08;
    this.projectorLight3.decay = 0;
    this.projectorLight3.distance = 0;
    this.projectorLight3.castShadow = true;
    this.projectorLight3.shadow.mapSize.width = 1024;
    this.projectorLight3.shadow.mapSize.height = 1024;
    this.projectorLight3.shadow.camera.near = 0.1;
    this.projectorLight3.shadow.camera.far = 200;
    this.projectorLight3.shadow.focus = 1;
    this.experience.scene.add(this.projectorLight3);

    this.projectorLight3.target.position.set(-25.7, -33, -37.3);
    this.experience.scene.add(this.projectorLight3.target);

    this.projectorLightHelper3 = new THREE.SpotLightHelper(
      this.projectorLight3,
    );
    this.projectorLightHelper3.visible = false;
    this.experience.scene.add(this.projectorLightHelper3);

    this.projectorShadowHelper3 = new THREE.CameraHelper(
      this.projectorLight3.shadow.camera,
    );
    this.projectorShadowHelper3.visible = false;
    this.experience.scene.add(this.projectorShadowHelper3);

    const folder = this.gui.addFolder("Projector Light 3");

    const onMove = () => {
      this.projectorLightHelper3.update();
      this.projectorShadowHelper3.update();
    };

    folder
      .addColor({ color: "#ffffff" }, "color")
      .name("Color")
      .onChange((val) => this.projectorLight3.color.set(val));
    folder.add(this.projectorLight3, "intensity", 0, 500, 1).name("Intensity");
    folder
      .add(this.projectorLight3, "angle", 0, Math.PI / 3, 0.01)
      .name("Angle");
    folder.add(this.projectorLight3, "penumbra", 0, 1, 0.01).name("Penumbra");
    folder.add(this.projectorLight3, "decay", 0, 4, 0.01).name("Decay");
    folder.add(this.projectorLight3, "distance", 0, 500, 1).name("Distance");
    folder
      .add(this.projectorLight3.shadow, "focus", 0, 1, 0.01)
      .name("Shadow Focus");
    folder.add(this.projectorLight3, "visible").name("Visible");

    const pos = folder.addFolder("Position");
    pos
      .add(this.projectorLight3.position, "x", -100, 100, 0.1)
      .name("X")
      .onChange(onMove);
    pos
      .add(this.projectorLight3.position, "y", -100, 100, 0.1)
      .name("Y")
      .onChange(onMove);
    pos
      .add(this.projectorLight3.position, "z", -100, 100, 0.1)
      .name("Z")
      .onChange(onMove);

    const tgt = folder.addFolder("Target");
    tgt
      .add(this.projectorLight3.target.position, "x", -50, 50, 0.1)
      .name("X")
      .onChange(onMove);
    tgt
      .add(this.projectorLight3.target.position, "y", -50, 50, 0.1)
      .name("Y")
      .onChange(onMove);
    tgt
      .add(this.projectorLight3.target.position, "z", -50, 50, 0.1)
      .name("Z")
      .onChange(onMove);

    folder
      .add(this.projectorLightHelper3, "visible")
      .name("Show Helper")
      .setValue(false);
    folder
      .add(this.projectorShadowHelper3, "visible")
      .name("Show Shadow Frustum")
      .setValue(false);
  }

  resize() {}

  update() {
    this._syncProjectorMatrix(this.projectorLight, spotProjectionMatrixUniform);
    this._syncProjectorMatrix(
      this.projectorLight2,
      spotProjectionMatrixUniform2,
    );
    this._syncProjectorMatrix(
      this.projectorLight3,
      spotProjectionMatrixUniform3,
    );
  }

  _syncProjectorMatrix(light, matrixUniform) {
    if (!light) return;

    const shadowCam = light.shadow.camera;

    shadowCam.position.copy(light.position);
    shadowCam.lookAt(light.target.position);

    const fov = THREE.MathUtils.RAD2DEG * 2 * light.angle * light.shadow.focus;
    if (shadowCam.fov !== fov) {
      shadowCam.fov = fov;
      shadowCam.updateProjectionMatrix();
    }

    shadowCam.updateMatrixWorld(true);

    matrixUniform.value.multiplyMatrices(
      shadowCam.projectionMatrix,
      shadowCam.matrixWorldInverse,
    );
  }
}
