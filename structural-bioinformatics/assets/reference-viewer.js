/** A local Mol* polymer cartoon of the deposited model, without assembly expansion. */
const allowed = new Set(["3WD5", "1TNF", "1B09", "4FM9", "1EHZ"]);
const id = new URLSearchParams(location.search).get("pdb") || "3WD5";
const status = document.getElementById("reference-status");
const token = new URLSearchParams(location.search).get("request");
let viewer;

function report(state, detail = {}) {
  document.body.dataset.state = state;
  parent.postMessage({ type: "molecular-reference", state, id, token, ...detail }, location.origin);
}

try {
  if (!allowed.has(id)) throw new Error("شناسهٔ ساختار در این دفتر ثبت نشده است.");
  const response = await fetch(id.toLowerCase() + ".pdb", { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("فایل مختصات در دسترس نیست.");
  const coordinates = await response.text();
  viewer = await molstar.Viewer.create("reference-canvas", {
    extensions: [], customFormats: [],
    layoutIsExpanded: false, layoutShowControls: false,
    layoutShowSequence: false, layoutShowLog: false,
    layoutShowLeftPanel: false, layoutShowRemoteState: false,
    viewportShowExpand: false, viewportShowControls: false,
    viewportShowSettings: false, viewportShowSelectionMode: false,
    viewportShowAnimation: false, viewportShowTrajectoryControls: false,
    viewportShowScreenshotControls: false, viewportShowToggleFullscreen: false,
    viewportShowReset: false, viewportBackgroundColor: "#f8fafc",
    volumeStreamingDisabled: true, allowMajorPerformanceCaveat: true,
    preferWebgl1: false,
  });
  const plugin = viewer.plugin;
  if (!plugin.canvas3d) throw new Error("مرورگر نتوانست نمای نواری WebGL را بسازد.");
  const data = await plugin.builders.data.rawData({ data: coordinates, label: id });
  const trajectory = await plugin.builders.structure.parseTrajectory(data, "pdb");
  const model = await plugin.builders.structure.createModel(trajectory, { modelIndex: 0 });
  // Never use the default assembly preset: e.g. 4FM9's assembly has another protomer.
  const structure = await plugin.builders.structure.createStructure(model, { name: "model", params: {} });
  const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, "polymer");
  if (!polymer) throw new Error("زنجیرهٔ پروتئین، DNA یا RNA در فایل یافت نشد.");
  const colors = id === "4FM9" ? [0x7555a1, 0xaa6408, 0x245cb7]
    : [0x087b73, 0x245cb7, 0xa95015, 0x7555a1, 0xae4f70];
  const representation = await plugin.builders.structure.representation.addRepresentation(polymer, {
    type: "cartoon", color: "chain-id",
    colorParams: { palette: { name: "colors", params: { list: { kind: "set", colors } } } },
  });
  plugin.canvas3d.requestCameraReset({ durationMs: 0 });
  const modelData = model.obj.data;
  const hierarchy = modelData.atomicHierarchy;
  const chainIds = Array.from(hierarchy.chains.auth_asym_id.toArray());
  const polymerResidues = new Set();
  for (const unit of polymer.obj.data.units) {
    for (const atomIndex of unit.elements) {
      polymerResidues.add(unit.model.id + ":" + unit.model.atomicHierarchy.residueAtomSegments.index[atomIndex]);
    }
  }
  const state = {
    structureId: id, representation: "cartoon", scope: "deposited_model",
    atomCount: modelData.atomicConformation.x.length,
    loadedResidueCount: hierarchy.residues._rowCount,
    polymerResidueCount: polymerResidues.size,
    authorChains: [...new Set(chainIds)],
    polymerElementCount: polymer.obj.data.elementCount,
    representationLabel: representation.obj.data.repr.label,
  };
  window.referenceViewer = {
    plugin, state, model: modelData,
    reset: () => plugin.canvas3d.requestCameraReset({ durationMs: 0 }),
    zoom: (factor) => {
      const camera = plugin.canvas3d.camera;
      const { position, target } = camera.state;
      camera.setState({ position: position.map((p, i) => target[i] + (p - target[i]) * factor) }, 0);
      plugin.canvas3d.requestDraw();
    },
  };
  const canvas = document.querySelector("#reference-canvas canvas");
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "مدل نواری؛ چرخش با کلیدهای جهت، بزرگ‌نمایی با مثبت و منفی، بازنشانی با صفر");
  canvas.addEventListener("keydown", (event) => {
    if (["+", "=", "-", "0"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "0") window.referenceViewer.reset();
      else window.referenceViewer.zoom(event.key === "-" ? 1.15 : 1 / 1.15);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const camera = plugin.canvas3d.camera;
    const { position, target, up } = camera.state;
    const offset = position.map((p, i) => p - target[i]);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const axis = event.key === "ArrowLeft" || event.key === "ArrowRight" ? [...up] : cross(up, offset);
    const length = Math.hypot(...axis);
    if (!length) return;
    const unit = axis.map(value => value / length);
    const angle = ["ArrowLeft", "ArrowUp"].includes(event.key) ? 0.12 : -0.12;
    const rotate = vector => {
      const normal = cross(unit, vector);
      const dot = unit.reduce((sum, value, i) => sum + value * vector[i], 0);
      return vector.map((value, i) => value * Math.cos(angle) + normal[i] * Math.sin(angle) + unit[i] * dot * (1 - Math.cos(angle)));
    };
    camera.setState({ position: rotate(offset).map((value, i) => value + target[i]), up: rotate(up) }, 0);
    plugin.canvas3d.requestDraw();
  });
  status.hidden = true;
  report("ready", { stateData: state });
} catch (error) {
  status.textContent = "نمای نواری بارگذاری نشد. از فهرست نوع نمایش، مسیر Cα را انتخاب کنید؛ سپس دوباره تلاش کنید.";
  status.dataset.state = "error";
  report("error", { message: String(error.message || error) });
}

addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== parent || !window.referenceViewer) return;
  if (event.data?.type !== "molecular-command") return;
  if (event.data.command === "reset") window.referenceViewer.reset();
  if (event.data.command === "zoom" && Number.isFinite(event.data.factor) && event.data.factor > 0) {
    window.referenceViewer.zoom(event.data.factor);
  }
});
addEventListener("pagehide", () => viewer?.dispose());
