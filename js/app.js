const elements = {
  container: document.querySelector("#ar-container"),
  switchButton: document.querySelector("#btn-switch"),
  photoButton: document.querySelector("#btn-photo"),
  retryButton: document.querySelector("#btn-retry"),
  filterName: document.querySelector("#filter-name"),
  filterDots: document.querySelector("#filter-dots"),
  trackingText: document.querySelector("#tracking-text"),
  loadingText: document.querySelector("#loading-text"),
  intro: document.querySelector(".intro-card"),
  error: document.querySelector("#error-message"),
  errorTitle: document.querySelector("#error-title"),
  errorDetail: document.querySelector("#error-detail"),
  toast: document.querySelector("#toast"),
  flash: document.querySelector("#capture-flash"),
};

let THREE;
let GLTFLoader;
let filtersConfig = [];
let currentFilterIndex = 0;
let filterLoadVersion = 0;
let mindarThree;
let renderer;
let scene;
let camera;
let clock;
let gltfLoader;
let isReady = false;
let lastFaceState = null;
let toastTimeout;
let stage = "config";

const anchors = new Map();
const activeAccessories = [];
const activeMixers = [];

// Muat konfigurasi filter sebelum membuat scene dan anchor.
async function init() {
  try {
    const configUrl = new URL("data/filters.json", document.baseURI);
    const response = await fetch(configUrl);
    if (!response.ok) throw new Error(`Konfigurasi filter: HTTP ${response.status}`);

    filtersConfig = await response.json();
    if (!Array.isArray(filtersConfig.filters) || filtersConfig.filters.length === 0) {
      throw new Error("Konfigurasi filter kosong atau tidak valid.");
    }

    currentFilterIndex = readLastFilter(filtersConfig.filters.length);
    updateFilterUI();

    stage = "dependencies";
    THREE = await import("three");
    ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
    await import("mindar-face-three");

    if (!window.MINDAR?.FACE?.MindARThree) {
      throw new Error("MindARThree tidak tersedia.");
    }

    stage = "camera";
    if (!window.isSecureContext) {
      throw new Error("Halaman harus dibuka melalui HTTPS.");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Kamera tidak didukung browser ini.");
    }

    elements.loadingText.textContent = "Menyiapkan kamera dan filter 3D Anda…";
    mindarThree = new window.MINDAR.FACE.MindARThree({
      container: elements.container,
      uiLoading: "no",
      uiScanning: "no",
      uiError: "no",
      filterMinCF: 0.001,
      filterBeta: 1,
    });

    ({ renderer, scene, camera } = mindarThree);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    const keyLight = new THREE.DirectionalLight(0xfff3d6, 2.6);
    keyLight.position.set(2, 4, 5);
    scene.add(ambientLight, keyLight);

    gltfLoader = new GLTFLoader();
    clock = new THREE.Clock();

    for (const filter of filtersConfig.filters) {
      for (const accessory of filter.accessories) {
        if (!anchors.has(accessory.landmark)) {
          anchors.set(accessory.landmark, mindarThree.addAnchor(accessory.landmark));
        }
      }
    }

    await loadFilterAccessories(filtersConfig.filters[currentFilterIndex], ++filterLoadVersion);

    elements.loadingText.textContent = "Mohon izinkan akses kamera…";
    await mindarThree.start();

    const updateTracking = mindarThree.controller.onUpdate;
    mindarThree.controller.onUpdate = (update) => {
      updateTracking(update);
      updateFaceStatus(update.hasFace);
    };

    renderer.setAnimationLoop(animate);

    isReady = true;
    elements.switchButton.disabled = false;
    elements.photoButton.disabled = false;
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-running");
    updateFaceStatus(false);
  } catch (error) {
    console.warn("Inisialisasi AR dihentikan:", error);
    showError(error);
  }
}

// Model dimuat dari JSON; placeholder tetap terlihat jika GLB gagal.
async function loadFilterAccessories(filter, version) {
  const loads = filter.accessories.map(async (accessory) => {
    const anchor = anchors.get(accessory.landmark);
    const holder = new THREE.Group();
    holder.name = `accessory-${accessory.name}`;
    holder.position.fromArray(accessory.position);
    if (accessory.rotation) holder.rotation.fromArray(accessory.rotation);
    holder.scale.fromArray(accessory.scale);

    const placeholder = createPlaceholder(accessory.name);
    holder.add(placeholder);
    anchor.group.add(holder);
    activeAccessories.push(holder);

    if (accessory.animation?.type === "sway") {
      activeMixers.push(createSwayMixer(holder, accessory.animation.speed ?? 1));
    }

    try {
      const modelUrl = new URL(accessory.model, document.baseURI).href;
      const gltf = await gltfLoader.loadAsync(modelUrl);

      if (version !== filterLoadVersion) {
        disposeObject(gltf.scene);
        return;
      }

      holder.remove(placeholder);
      disposeObject(placeholder);
      holder.add(gltf.scene);

      gltf.scene.traverse((object) => {
        if (object.isMesh) object.castShadow = true;
      });

      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(gltf.animations[0]).play();
        activeMixers.push(mixer);
      }
    } catch (error) {
      console.warn(`GLB ${accessory.model} gagal dimuat; menggunakan placeholder.`, error);
    }
  });

  await Promise.all(loads);
}

// Placeholder asli dari BoxGeometry, termasuk detail toga dan kacamata.
function createPlaceholder(name) {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf2c66d,
    metalness: 0.72,
    roughness: 0.26,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x172334,
    metalness: 0.25,
    roughness: 0.3,
  });

  const addBox = (size, position, material = gold) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.fromArray(position);
    group.add(mesh);
    return mesh;
  };

  if (name.includes("glasses")) {
    addBox([0.58, 0.42, 0.08], [-0.36, 0, 0], dark);
    addBox([0.58, 0.42, 0.08], [0.36, 0, 0], dark);
    addBox([0.68, 0.08, 0.1], [-0.36, 0.19, 0.01]);
    addBox([0.68, 0.08, 0.1], [-0.36, -0.19, 0.01]);
    addBox([0.68, 0.08, 0.1], [0.36, 0.19, 0.01]);
    addBox([0.68, 0.08, 0.1], [0.36, -0.19, 0.01]);
    addBox([0.08, 0.42, 0.1], [-0.68, 0, 0.01]);
    addBox([0.08, 0.42, 0.1], [-0.04, 0, 0.01]);
    addBox([0.08, 0.42, 0.1], [0.68, 0, 0.01]);
    addBox([0.08, 0.42, 0.1], [0.04, 0, 0.01]);
    addBox([0.14, 0.08, 0.1], [0, 0.04, 0.01]);
    addBox([0.08, 0.1, 0.7], [-0.68, 0.08, -0.31]);
    addBox([0.08, 0.1, 0.7], [0.68, 0.08, -0.31]);
  } else {
    addBox([1.05, 0.5, 0.82], [0, 0.27, 0]);
    addBox([1.55, 0.1, 1.12], [0, 0.61, 0]);
    addBox([0.07, 0.62, 0.07], [0.68, 0.34, 0.02]);
    addBox([0.13, 0.18, 0.13], [0.68, -0.01, 0.02]);
  }

  return group;
}

// Clip loop dibuat saat runtime jika model tidak memiliki animasi sendiri.
function createSwayMixer(holder, speed) {
  const baseRotation = holder.quaternion.clone();
  const angles = [0, 0.14, 0, -0.14, 0];
  const times = [0, 0.6, 1.2, 1.8, 2.4];
  const values = angles.flatMap((angle) => {
    const rotation = baseRotation.clone().multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle)),
    );
    return rotation.toArray();
  });

  const track = new THREE.QuaternionKeyframeTrack(".quaternion", times, values);
  const clip = new THREE.AnimationClip("accessory-sway", 2.4, [track]);
  const mixer = new THREE.AnimationMixer(holder);
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.timeScale = speed;
  action.play();
  return mixer;
}

// Animasi dan rendering memakai loop Three.js, bukan requestAnimationFrame manual.
function animate() {
  const delta = clock.getDelta();
  for (const mixer of activeMixers) mixer.update(delta);
  renderer.render(scene, camera);
}

// Ganti filter, bersihkan resource lama, dan simpan pilihan terakhir.
async function switchFilter() {
  if (!isReady) return;

  currentFilterIndex = (currentFilterIndex + 1) % filtersConfig.filters.length;
  saveLastFilter(currentFilterIndex);
  filterLoadVersion += 1;
  clearAllAccessories();
  updateFilterUI();

  await loadFilterAccessories(filtersConfig.filters[currentFilterIndex], filterLoadVersion);
  showToast(filtersConfig.filters[currentFilterIndex].name);
}

function clearAllAccessories() {
  for (const mixer of activeMixers) {
    mixer.stopAllAction();
    mixer.uncacheRoot(mixer.getRoot());
  }
  activeMixers.length = 0;

  for (const accessory of activeAccessories) {
    accessory.removeFromParent();
    disposeObject(accessory);
  }
  activeAccessories.length = 0;
}

function disposeObject(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    if (!child.material) return;

    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });

  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

// Gabungkan video dan canvas dengan crop cover yang sama seperti pratinjau.
function capturePhoto() {
  if (!isReady || !mindarThree.video || mindarThree.video.readyState < 2) {
    showToast("Kamera belum siap. Coba lagi sebentar.");
    return;
  }

  try {
    renderer.render(scene, camera);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const outputScale = Math.min(
      window.devicePixelRatio || 1,
      1920 / viewportWidth,
      1920 / viewportHeight,
    );
    const output = document.createElement("canvas");
    output.width = Math.round(viewportWidth * outputScale);
    output.height = Math.round(viewportHeight * outputScale);

    const context = output.getContext("2d");
    drawCover(context, mindarThree.video, viewportWidth, viewportHeight, output.width, output.height);
    drawCover(context, renderer.domElement, viewportWidth, viewportHeight, output.width, output.height);

    const link = document.createElement("a");
    link.href = output.toDataURL("image/png");
    link.download = `umsu-filter-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    elements.flash.classList.remove("flash");
    void elements.flash.offsetWidth;
    elements.flash.classList.add("flash");
    showToast("Foto berhasil disimpan.");
  } catch (error) {
    console.warn("Foto gagal dibuat:", error);
    showToast("Foto gagal dibuat. Silakan coba lagi.");
  }
}

function drawCover(context, source, viewportWidth, viewportHeight, outputWidth, outputHeight) {
  const sourceWidth = source.videoWidth || source.width;
  const sourceHeight = source.videoHeight || source.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const viewportRatio = viewportWidth / viewportHeight;

  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > viewportRatio) {
    cropWidth = sourceHeight * viewportRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / viewportRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  context.save();
  context.translate(outputWidth, 0);
  context.scale(-1, 1);
  context.drawImage(
    source,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  context.restore();
}

function updateFaceStatus(hasFace) {
  if (lastFaceState === hasFace) return;
  lastFaceState = hasFace;
  document.body.classList.toggle("face-found", hasFace);
  elements.trackingText.textContent = hasFace
    ? "Wajah terdeteksi — filter aktif"
    : "Posisikan wajah di dalam kamera";
}

function updateFilterUI() {
  const filter = filtersConfig.filters[currentFilterIndex];
  if (!filter) return;

  elements.filterName.textContent = filter.name;
  elements.filterDots.replaceChildren();

  filtersConfig.filters.forEach((item, index) => {
    const dot = document.createElement("span");
    dot.className = `filter-dot${index === currentFilterIndex ? " active" : ""}`;
    dot.setAttribute("aria-hidden", "true");
    elements.filterDots.appendChild(dot);
  });

  elements.filterDots.setAttribute(
    "aria-label",
    `Filter ${currentFilterIndex + 1} dari ${filtersConfig.filters.length}`,
  );
}

function readLastFilter(filterCount) {
  try {
    const saved = Number(localStorage.getItem("lastFilter"));
    return Number.isInteger(saved) && saved >= 0 && saved < filterCount ? saved : 0;
  } catch {
    return 0;
  }
}

function saveLastFilter(index) {
  try {
    localStorage.setItem("lastFilter", String(index));
  } catch {
    // Filter tetap berfungsi jika penyimpanan browser dibatasi.
  }
}

function showError(error) {
  isReady = false;
  elements.switchButton.disabled = true;
  elements.photoButton.disabled = true;
  elements.intro.hidden = true;
  document.body.classList.remove("is-running", "face-found", "is-loading");

  let title = "Aplikasi belum dapat dimuat";
  let detail = "Periksa koneksi internet Anda, lalu muat ulang halaman.";

  if (!window.isSecureContext) {
    title = "HTTPS diperlukan";
    detail = "Kamera hanya dapat diakses melalui HTTPS. Buka aplikasi menggunakan link GitHub Pages atau localhost.";
  } else if (stage === "dependencies") {
    title = "Pustaka AR gagal dimuat";
    detail = "Periksa koneksi internet dan pastikan CDN dapat diakses, lalu muat ulang halaman.";
  } else if (stage === "config") {
    title = "Filter belum dapat dimuat";
    detail = "File data/filters.json tidak dapat dibaca. Periksa file proyek dan koneksi internet, lalu muat ulang halaman.";
  } else if (stage === "camera") {
    title = "Kamera belum dapat digunakan";
    detail = "Izin kamera diperlukan. Silakan izinkan akses kamera di pengaturan browser Anda, lalu muat ulang halaman. Pastikan kamera tidak sedang digunakan aplikasi lain.";
  }

  elements.errorTitle.textContent = title;
  elements.errorDetail.textContent = detail;
  elements.error.hidden = false;
  console.warn("Detail kesalahan:", error);
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2400);
}

// Event dipasang setelah DOM tersedia karena module berada di akhir body.
elements.switchButton.addEventListener("click", () => {
  void switchFilter();
});
elements.photoButton.addEventListener("click", capturePhoto);
elements.retryButton.addEventListener("click", () => window.location.reload());

window.addEventListener("pagehide", () => {
  if (renderer) renderer.setAnimationLoop(null);
  mindarThree?.controller?.stopProcessVideo?.();
  mindarThree?.video?.srcObject?.getTracks().forEach((track) => track.stop());
});

void init();
