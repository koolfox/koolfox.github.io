import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";

const PALETTE = ["#087b73", "#245cb7", "#a95015", "#7555a1", "#ae4f70"];

/** Split observed backbones at gaps; never create missing atom coordinates. */
export function splitBackbone(residues, kind = "protein_ca") {
  const cutoff = kind === "dna_phosphate" ? 8 : 4.5;
  const segments = [];
  let current = [];
  for (const residue of residues) {
    const point = new THREE.Vector3(...residue.xyz);
    if (current.length && current.at(-1).distanceTo(point) > cutoff) {
      segments.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length) segments.push(current);
  return segments;
}

/**
 * Reusable experimental-coordinate viewer.
 * Coordinates remain in Å. Only the camera moves; chains share one translation.
 * Events: inspect, statechange, visibilitychange, spinningchange, viewererror.
 */
export class MolecularScene extends EventTarget {
  constructor(container, {
    background = "#f8fafc",
    descriptionIds = "viewer-help model-caption",
  } = {}) {
    super();
    if (!(container instanceof HTMLElement)) throw new TypeError("A stage element is required");
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(background);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(background);
    this.canvas = this.renderer.domElement;
    this.canvas.className = "molecular-canvas";
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "نمای سه‌بعدی مولکول؛ کلیدهای جهتی برای چرخش، مثبت و منفی برای بزرگ‌نمایی");
    if (descriptionIds) this.canvas.setAttribute("aria-describedby", descriptionIds);
    container.prepend(this.canvas);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = false;
    this.controls.enablePan = true;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.addEventListener("change", () => this.requestRender());
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#a8b7cd", 2.3));
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.6);
    keyLight.position.set(80, 130, 100);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#d5e5ff", 1.4);
    fillLight.position.set(-90, 30, -80);
    this.scene.add(fillLight);
    this.beadGeometry = new THREE.SphereGeometry(0.40, 10, 8);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.chains = new Map();
    this.pickTargets = [];
    this.spinning = false;
    this.visible = true;
    this.disposed = false;
    this.failed = false;
    this.raf = null;
    this.lastFrame = null;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this._onReducedMotion = () => {
      if (this.reducedMotion.matches) this.setSpinning(false);
    };
    this.reducedMotion.addEventListener("change", this._onReducedMotion);
    this._onVisibility = () => this._updateActivity();
    document.addEventListener("visibilitychange", this._onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this._updateActivity();
    }, { threshold: 0.01 });
    this.intersectionObserver.observe(container);
    this._onKey = (event) => this._handleKey(event);
    this.canvas.addEventListener("keydown", this._onKey);
    this._onPointerDown = (event) => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
    };
    this._onPointerUp = (event) => {
      const start = this.pointerStart;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) {
        this.inspectAt(event.clientX, event.clientY);
      }
      this.pointerStart = null;
    };
    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this._onContextLost = (event) => {
      event.preventDefault();
      this.failed = true;
      this.setSpinning(false);
      this.container.dataset.state = "error";
      this.dispatchEvent(new CustomEvent("viewererror", {
        detail: "ارتباط مرورگر با پردازندهٔ گرافیکی قطع شد. صفحه را دوباره بارگذاری کنید؛ تصویر ثابت در دسترس است.",
      }));
    };
    this.canvas.addEventListener("webglcontextlost", this._onContextLost);
    this.resize();
  }

  setStructure(structure) {
    if (!structure?.id || !Array.isArray(structure.chains) || !structure.chains.length) {
      throw new TypeError("Structure has no observed chains");
    }
    for (const chain of structure.chains) {
      if (!["protein_ca", "dna_phosphate"].includes(chain.kind)) {
        throw new TypeError("Unsupported trace representation");
      }
      if (!Array.isArray(chain.residues) || !chain.residues.length) {
        throw new TypeError("Chain has no observed coordinates");
      }
      for (const residue of chain.residues) {
        if (!Array.isArray(residue.xyz) || residue.xyz.length !== 3 || !residue.xyz.every(Number.isFinite)) {
          throw new TypeError("Non-finite or malformed coordinates");
        }
      }
    }
    this.container.dataset.state = "loading";
    this._clearModel();
    this.structure = structure;
    this.model = new THREE.Group();
    this.scene.add(this.model);
    this.interface = new Set((structure.interface || []).map((r) => this._residueKey(r)));
    const bounds = new THREE.Box3();
    const matrix = new THREE.Matrix4();
    this.gapCount = 0;
    structure.chains.forEach((chain, index) => {
      const color = this._defaultColor(structure.id, chain, index);
      const group = new THREE.Group();
      group.name = chain.id;
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.03 });
      const beadMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.65 });
      const beads = new THREE.InstancedMesh(this.beadGeometry, beadMaterial, chain.residues.length);
      beads.userData = { chain: chain.id, kind: chain.kind, residues: chain.residues };
      const segments = splitBackbone(chain.residues, chain.kind);
      this.gapCount += Math.max(0, segments.length - 1);
      for (const segment of segments) {
        if (segment.length < 2) continue;
        const curve = segment.length === 2
          ? new THREE.LineCurve3(segment[0], segment[1])
          : new THREE.CatmullRomCurve3(segment, false, "centripetal");
        const geometry = new THREE.TubeGeometry(
          curve, Math.max(8, Math.min(segment.length * 5, 4096)),
          chain.kind === "dna_phosphate" ? 0.43 : 0.32, 8, false,
        );
        group.add(new THREE.Mesh(geometry, material));
      }
      chain.residues.forEach((residue, atomIndex) => {
        const position = new THREE.Vector3(...residue.xyz);
        bounds.expandByPoint(position);
        matrix.makeTranslation(...residue.xyz);
        beads.setMatrixAt(atomIndex, matrix);
        beads.setColorAt(atomIndex, new THREE.Color(color));
      });
      beads.instanceMatrix.needsUpdate = true;
      beads.instanceColor.needsUpdate = true;
      beads.computeBoundingSphere();
      group.add(beads);
      this.model.add(group);
      this.pickTargets.push(beads);
      this.chains.set(chain.id, { group, material, beads, data: chain, color, defaultColor: color });
    });
    this.center = bounds.getCenter(new THREE.Vector3());
    this.radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 5);
    this.model.position.copy(this.center).multiplyScalar(-1);
    this.markerGeometry = new THREE.SphereGeometry(0.86, 12, 8);
    this.markerMaterial = new THREE.MeshStandardMaterial({ color: "#bf3159", roughness: 0.5 });
    this.interfaceMarkers = new THREE.Group();
    this._buildInterfaceMarkers();
    this.interfaceMarkers.visible = false;
    this.model.add(this.interfaceMarkers);
    this.selectionMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: "#111827", wireframe: true }),
    );
    this.selectionMarker.visible = false;
    this.model.add(this.selectionMarker);
    this.setSpinning(false);
    this.resetView();
    this.canvas.setAttribute("aria-label", "ساختار " + structure.id + "؛ کلیدهای جهتی برای چرخش، مثبت و منفی برای بزرگ‌نمایی");
    this.container.dataset.state = "ready";
    this.container.dataset.structureId = structure.id;
    this._syncState();
    this.renderer.render(this.scene, this.camera);
    this.dispatchEvent(new CustomEvent("inspect", { detail: null }));
    this.dispatchEvent(new CustomEvent("statechange", { detail: this.getState() }));
    return this.getState();
  }

  _defaultColor(id, chain, index) {
    if (id === "3WD5") return { A: "#087b73", H: "#a95015", L: "#245cb7" }[chain.id] || PALETTE[index % PALETTE.length];
    if (id === "1TNF") return { A: "#087b73", B: "#245cb7", C: "#a95015" }[chain.id] || PALETTE[index % PALETTE.length];
    if (id === "4FM9") return { A: "#7555a1", C: "#aa6408", D: "#245cb7" }[chain.id] || PALETTE[index % PALETTE.length];
    return PALETTE[index % PALETTE.length];
  }

  _residueKey(residue) {
    return residue.chain + ":" + residue.number + ":" + (residue.insertion || "");
  }

  setChainVisible(id, visible) {
    const chain = this.chains.get(id);
    if (!chain) return;
    chain.group.visible = Boolean(visible);
    for (const marker of this.interfaceMarkers.children) {
      if (marker.userData.chain === id) marker.visible = Boolean(visible);
    }
    if (this.selected?.chain === id && !visible) {
      this.selected = null;
      this.selectionMarker.visible = false;
      this.dispatchEvent(new CustomEvent("inspect", { detail: null }));
    }
    this._syncState();
    this.requestRender();
    this.dispatchEvent(new CustomEvent("visibilitychange", { detail: this.getState() }));
  }

  setChainColor(id, color) {
    const chain = this.chains.get(id);
    if (!chain || !/^#[0-9a-f]{6}$/i.test(color)) return;
    chain.color = color;
    chain.material.color.set(color);
    for (let index = 0; index < chain.beads.count; index++) {
      chain.beads.setColorAt(index, new THREE.Color(color));
    }
    chain.beads.instanceColor.needsUpdate = true;
    this.requestRender();
  }

  _buildInterfaceMarkers() {
    this.interfaceMarkers.clear();
    for (const chain of this.structure.chains) {
      const visible = this.chains.get(chain.id)?.group.visible ?? true;
      for (const residue of chain.residues) {
        if (!this.interface.has(this._residueKey({ ...residue, chain: chain.id }))) continue;
        const marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
        marker.position.set(...residue.xyz);
        marker.userData.chain = chain.id;
        marker.visible = visible;
        this.interfaceMarkers.add(marker);
      }
    }
  }

  /** Replace highlighted residues ({chain, number, insertion}) without resetting the view. */
  setInterfaceResidues(residues) {
    if (!this.model) return;
    this.interface = new Set((residues || []).map((r) => this._residueKey(r)));
    this._buildInterfaceMarkers();
    this.requestRender();
  }

  setInterfaceHighlight(enabled) {
    if (!this.interfaceMarkers) return;
    this.interfaceMarkers.visible = Boolean(enabled) && this.interface.size > 0;
    this.requestRender();
  }

  selectResidue(chainId, number, insertion = "") {
    const chain = this.chains.get(chainId);
    if (!chain?.group.visible) return false;
    const residue = chain.data.residues.find((r) => r.number === number && (r.insertion || "") === insertion);
    if (!residue) return false;
    this.selected = { ...residue, chain: chainId, kind: chain.data.kind };
    this.selectionMarker.position.set(...residue.xyz);
    this.selectionMarker.visible = true;
    this.requestRender();
    this.dispatchEvent(new CustomEvent("inspect", { detail: this.selected }));
    return true;
  }

  inspectAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = this.pickTargets.filter((mesh) => mesh.parent.visible);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (hit && Number.isInteger(hit.instanceId)) {
      const residue = hit.object.userData.residues[hit.instanceId];
      this.selectResidue(hit.object.userData.chain, residue.number, residue.insertion || "");
    }
  }

  rotateBy(horizontal = 0, vertical = 0) {
    if (!this.model || this.failed) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, 0.05, Math.PI - 0.05);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    this.controls.update();
    this.requestRender();
  }

  zoomBy(factor) {
    if (!this.model || this.failed || !Number.isFinite(factor) || factor <= 0) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.setLength(distance));
    this.controls.update();
    this.requestRender();
  }

  resetView() {
    if (!this.model || this.failed) return;
    this.controls.target.set(0, 0, 0);
    const angle = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const direction = new THREE.Vector3(0.27, 0.20, 1).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tangent = Math.tan(angle);
    let requiredDistance = this.radius * 1.1;
    for (const chain of this.structure.chains) {
      for (const residue of chain.residues) {
        const point = new THREE.Vector3(...residue.xyz).sub(this.center);
        const depth = point.dot(direction);
        requiredDistance = Math.max(
          requiredDistance,
          Math.abs(point.dot(up)) / tangent + depth,
          Math.abs(point.dot(right)) / (tangent * this.camera.aspect) + depth,
        );
      }
    }
    const distance = requiredDistance * 1.16;
    this.camera.near = Math.max(0.1, distance / 1000);
    this.camera.far = distance * 15;
    this.camera.position.copy(direction.multiplyScalar(distance));
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = this.radius * 1.05;
    this.controls.maxDistance = distance * 4;
    this.controls.update();
    this.requestRender();
  }

  setSpinning(enabled) {
    this.spinning = Boolean(enabled);
    this._updateActivity();
    this.dispatchEvent(new CustomEvent("spinningchange", { detail: this.spinning }));
  }

  _handleKey(event) {
    const actions = {
      ArrowLeft: () => this.rotateBy(-0.12),
      ArrowRight: () => this.rotateBy(0.12),
      ArrowUp: () => this.rotateBy(0, -0.12),
      ArrowDown: () => this.rotateBy(0, 0.12),
      "+": () => this.zoomBy(0.88),
      "=": () => this.zoomBy(0.88),
      "-": () => this.zoomBy(1.14),
      "0": () => this.resetView(),
    };
    if (actions[event.key]) {
      event.preventDefault();
      actions[event.key]();
    }
  }

  _updateActivity() {
    this.controls.autoRotate = this.spinning && this.visible && !document.hidden && !this.failed;
    if (!this.visible || document.hidden || this.failed) {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.lastFrame = null;
    } else this.requestRender();
  }

  requestRender() {
    if (this.raf !== null || this.disposed || this.failed || !this.visible || document.hidden) return;
    this.raf = requestAnimationFrame((time) => {
      this.raf = null;
      const delta = this.lastFrame === null ? 0 : Math.min((time - this.lastFrame) / 1000, 0.05);
      this.lastFrame = time;
      this.controls.update(delta);
      this.renderer.render(this.scene, this.camera);
      if (this.controls.autoRotate) this.requestRender();
    });
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height || this.disposed) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  _syncState() {
    const state = this.getState();
    this.container.dataset.visibleChains = state.visibleChains.join(",");
    this.container.dataset.pointCount = String(state.pointCount);
    this.container.dataset.visiblePointCount = String(state.visiblePointCount);
  }

  getState() {
    const chains = [...this.chains.entries()].map(([id, chain]) => ({
      id, kind: chain.data.kind, color: chain.color, visible: chain.group.visible,
      pointCount: chain.data.residues.length,
    }));
    return {
      structureId: this.structure?.id || null,
      coordinateUnits: "angstrom",
      chains,
      visibleChains: chains.filter((c) => c.visible).map((c) => c.id),
      pointCount: chains.reduce((sum, c) => sum + c.pointCount, 0),
      visiblePointCount: chains.filter((c) => c.visible).reduce((sum, c) => sum + c.pointCount, 0),
      gapCount: this.gapCount || 0,
      spinning: this.spinning,
    };
  }

  _clearModel() {
    if (!this.model) return;
    const geometries = new Set();
    const materials = new Set();
    this.model.traverse((object) => {
      if (object.geometry && object.geometry !== this.beadGeometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.scene.remove(this.model);
    this.chains.clear();
    this.pickTargets = [];
    this.model = null;
    this.selected = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this._onVisibility);
    this.reducedMotion.removeEventListener("change", this._onReducedMotion);
    this.canvas.removeEventListener("keydown", this._onKey);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
    this.controls.dispose();
    this._clearModel();
    this.beadGeometry.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
