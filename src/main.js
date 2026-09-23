import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { vehicles } from './carsData.js';
import { initBackgroundParticles } from './particles.js';

// Inicializa partículas de fundo
initBackgroundParticles();

// Estado global
let currentMode = 'single';
let currentIndex = 4; // GEN4 por padrão
let compareTray = [];
let compareDisplayMode = 'difference';

// Contêineres de viewport
const hostSingle = document.querySelector('#canvas-host-single');
const hostCompare = document.querySelector('#canvas-host-compare');
const singleView = document.querySelector('#single-view');
const compareView = document.querySelector('#compare-view');

// Elementos - Single View
const carSeason = document.querySelector('#car-season');
const carTitle = document.querySelector('#car-title');
const statsCarName = document.querySelector('#stats-car-name');
const statsIndex = document.querySelector('#stats-index');
const specsList = document.querySelector('#specs-list');
const selectorIndex = document.querySelector('#selector-index');
const vehicleTabsDesktop = document.querySelector('#vehicle-tabs-desktop');
const vehicleTabsMobile = document.querySelector('#vehicle-tabs-mobile');
const btnPrev = document.querySelector('#btn-prev');
const btnNext = document.querySelector('#btn-next');
const btnToggleDesktop = document.querySelector('#btn-toggle-compare-desktop');
const btnToggleMobile = document.querySelector('#btn-toggle-compare-mobile');

// Elementos - Compare View
const cmpCat1 = document.querySelector('#cmp-cat-1');
const cmpTitle1 = document.querySelector('#cmp-title-1');
const thCar1 = document.querySelector('#th-car-1');

const cmpCat2 = document.querySelector('#cmp-cat-2');
const cmpTitle2 = document.querySelector('#cmp-title-2');
const thCar2 = document.querySelector('#th-car-2');

const compareTbody = document.querySelector('#compare-tbody');
const btnExitCompare = document.querySelector('#btn-exit-compare');
const btnSwap1 = document.querySelector('#btn-swap-1');
const btnSwap2 = document.querySelector('#btn-swap-2');
const btnSwapM1 = document.querySelector('#btn-swap-m1');
const btnSwapM2 = document.querySelector('#btn-swap-m2');
const btnSwitchPositions = document.querySelector('#btn-switch-positions');

const tabBtnAttribute = document.querySelector('#tab-btn-attribute');
const tabBtnDifference = document.querySelector('#tab-btn-difference');

// Setup Three.js
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

function getActiveContainer() {
  return currentMode === 'single' ? hostSingle : hostCompare;
}

const activeHost = getActiveContainer();
const initWidth = activeHost?.clientWidth || window.innerWidth;
const initHeight = activeHost?.clientHeight || 400;

const camera = new THREE.PerspectiveCamera(24, initWidth / initHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(initWidth, initHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

// Iluminação
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 12, 8);
scene.add(dirLight);

const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
frontLight.position.set(-5, 4, 6);
scene.add(frontLight);

// Shader de aberração cromática
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0022 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;

    void main() {
      vec2 offset = (vUv - 0.5) * amount;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      float a = texture2D(tDiffuse, vUv).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(ChromaticAberrationShader));

const carGroup1 = new THREE.Group();
const carGroup2 = new THREE.Group();
scene.add(carGroup1);
scene.add(carGroup2);

const gltfLoader = new GLTFLoader();
const modelCache = {};

function getVehicleScale() {
  const isMobile = window.innerWidth <= 900;
  return isMobile ? 0.52 : 0.75;
}

function updateModelsScale() {
  const targetScale = getVehicleScale();
  [carGroup1, carGroup2].forEach((group) => {
    group.children.forEach((child) => {
      child.scale.set(targetScale, targetScale, targetScale);
    });
  });
}

async function loadVehicleModel(vehicle) {
  if (modelCache[vehicle.id]) {
    const clone = modelCache[vehicle.id].clone();
    const currentScale = getVehicleScale();
    clone.scale.set(currentScale, currentScale, currentScale);
    return clone;
  }

  return new Promise((resolve) => {
    gltfLoader.load(
      vehicle.modelPath,
      (gltf) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= box.min.y;

        const currentScale = getVehicleScale();
        root.scale.set(currentScale, currentScale, currentScale);

        root.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        modelCache[vehicle.id] = root;
        resolve(root.clone());
      },
      undefined,
      () => {
        const fallbackGeom = new THREE.BoxGeometry(2.2, 0.6, 1.1);
        const fallbackMat = new THREE.MeshStandardMaterial({
          color: 0xffcc00,
          roughness: 0.35,
          metalness: 0.7
        });
        const mesh = new THREE.Mesh(fallbackGeom, fallbackMat);
        const currentScale = getVehicleScale();
        mesh.scale.set(currentScale, currentScale, currentScale);
        resolve(mesh);
      }
    );
  });
}

function getVisibleWidthAtZ0() {
  const fovInRad = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovInRad / 2) * camera.position.z;
  return visibleHeight * camera.aspect;
}

function updateCompareCarPositions() {
  if (currentMode !== 'compare') return;

  const isMobile = window.innerWidth <= 900;
  const visibleWidth = getVisibleWidthAtZ0();

  // Ajuste fino para os carros se manterem na mesma linha horizontal em mobile e desktop
  const separation = isMobile ? visibleWidth * 0.28 : visibleWidth * 0.25;
  const baseY = isMobile ? -0.6 : -0.3;

  carGroup1.position.set(-separation, baseY, 0);
  carGroup2.position.set(separation, baseY, 0);
}

function updateCanvasSizeAndCamera() {
  const container = getActiveContainer();
  if (!container) return;

  if (canvas.parentElement !== container) {
    container.appendChild(canvas);
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(width, height);

  const isMobile = window.innerWidth <= 900;

  if (currentMode === 'single') {
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 0, 0);
  } else {
    if (isMobile) {
      camera.position.set(0, 2, 9.8);
      camera.lookAt(0, 0.0, 0);
    } else {
      camera.position.set(0, 2, 12);
      camera.lookAt(0, 0.05, 0);
    }
    updateCompareCarPositions();
  }
}

window.addEventListener('resize', () => {
  updateCanvasSizeAndCamera();
  updateModelsScale();

  if (currentMode === 'single') {
    updateSingleUI();
  } else {
    updateCompareCarPositions();
  }
});

// Renderização das abas de seleção de veículos
function renderTabsTo(container) {
  if (!container) return;
  container.innerHTML = '';

  vehicles.forEach((car, index) => {
    const isSelectedTab = index === currentIndex;
    const isMarkedInTray = compareTray.some((c) => c.id === car.id);

    const tab = document.createElement('div');
    tab.className = `vehicle-tab ${isSelectedTab ? 'active' : ''} ${isMarkedInTray ? 'marked' : ''}`;

    let checkmarkHtml = '';
    if (isMarkedInTray) {
      checkmarkHtml = `
        <div class="tab-mark-badge">
          <img src="/src/assets/TwoArrowsMark.svg" alt="Marked" class="icon-two-arrows" />
        </div>
      `;
    }

    tab.innerHTML = `
      ${checkmarkHtml}
      <span class="tab-num">${car.num}</span>
      <span class="tab-name">${car.name}</span>
    `;

    tab.addEventListener('click', () => {
      currentIndex = index;
      updateSingleUI();
    });

    container.appendChild(tab);
  });
}

function renderTabs() {
  renderTabsTo(vehicleTabsDesktop);
  renderTabsTo(vehicleTabsMobile);
}

function renderSingleSpecs(car) {
  specsList.innerHTML = '';
  const specEntries = [
    { label: 'PEAK POWER', val: car.specs.power, pct: (car.specs.powerVal / 600) * 100 || 80, max: 'class max 600 kW' },
    { label: 'TOP SPEED', val: car.specs.topSpeed, pct: (car.specs.speedVal / 335) * 100 || 80, max: 'class max 335 km/h' },
    { label: 'RACE ENERGY', val: `${car.specs.energy}`, pct: 75, max: 'class max 71.2 kWh' },
    { label: '0-100 KM/H', val: car.specs.acceleration, pct: 85, max: 'class max 12.5 s' },
    { label: 'MAX REGEN', val: car.specs.regen, pct: car.specs.regenVal ? 85 : 0, max: 'class max 700 kW' },
    { label: 'MIN WEIGHT', val: car.specs.weight, pct: 80, max: 'class max 950 kg' }
  ];

  specEntries.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'spec-item';
    el.innerHTML = `
      <div class="spec-labels">
        <span class="spec-title">${item.label}</span>
        <span class="spec-val">${item.val}</span>
      </div>
      <div class="spec-bar-bg"><div class="spec-bar-fill" style="width: ${item.pct}%;"></div></div>
      <span class="spec-max">${item.max}</span>
    `;
    specsList.appendChild(el);
  });
}

function updateToggleButtons(isMarked) {
  [btnToggleDesktop, btnToggleMobile].forEach((btn) => {
    if (!btn) return;
    if (isMarked) {
      btn.textContent = 'Remove from compare';
      btn.classList.add('btn-remove-mode');
    } else {
      btn.textContent = 'Add to compare';
      btn.classList.remove('btn-remove-mode');
    }
  });
}

async function updateSingleUI() {
  const currentCar = vehicles[currentIndex];

  carSeason.textContent = currentCar.category;
  carTitle.textContent = currentCar.name;
  statsCarName.textContent = currentCar.name;
  statsIndex.textContent = `${currentCar.num} / 06`;
  selectorIndex.textContent = `${currentCar.num} / 06`;

  renderSingleSpecs(currentCar);

  const isMarked = compareTray.some((c) => c.id === currentCar.id);
  updateToggleButtons(isMarked);

  renderTabs();

  const model = await loadVehicleModel(currentCar);
  carGroup1.clear();
  carGroup1.add(model);
  carGroup1.position.set(0, -0.8, 0);
  carGroup1.visible = true;

  carGroup2.visible = false;
  carGroup2.clear();

  updateCanvasSizeAndCamera();
}

function handleCompareToggle() {
  const currentCar = vehicles[currentIndex];
  const existingIndex = compareTray.findIndex((c) => c.id === currentCar.id);

  if (existingIndex !== -1) {
    compareTray.splice(existingIndex, 1);
  } else {
    compareTray.push(currentCar);
    if (compareTray.length === 2) {
      enterCompareView();
      return;
    }
  }
  updateSingleUI();
}

btnToggleDesktop.addEventListener('click', handleCompareToggle);
btnToggleMobile.addEventListener('click', handleCompareToggle);

function formatDifference(c1, c2, key) {
  const v1 = c1.specs[key + 'Val'];
  const v2 = c2.specs[key + 'Val'];

  if (v1 === null || v2 === null || v1 === undefined || v2 === undefined) {
    return `<span class="diff-muted">no ${c2.name.includes('Kia') ? 'PV5' : 'car'} figure</span>`;
  }

  const diff = v1 - v2;

  if (key === 'power') {
    const abs = Math.abs(Math.round(diff));
    return diff >= 0
      ? `<span class="diff-up">↑ ${abs} kW more</span>`
      : `<span class="diff-down">↓ ${abs} kW less</span>`;
  }

  if (key === 'speed') {
    const abs = Math.abs(Math.round(diff));
    return diff >= 0
      ? `<span class="diff-up">↑ ${abs} km/h faster</span>`
      : `<span class="diff-down">↓ ${abs} km/h slower</span>`;
  }

  if (key === 'energy') {
    const abs = Math.abs(diff.toFixed(1));
    return diff >= 0
      ? `<span class="diff-up">↑ ${abs} kWh more</span>`
      : `<span class="diff-down">↓ ${abs} kWh less</span>`;
  }

  if (key === 'accel') {
    const abs = Math.abs((v2 - v1).toFixed(1));
    return diff <= 0
      ? `<span class="diff-up">↑ ${abs} s quicker</span>`
      : `<span class="diff-down">↓ ${abs} s slower</span>`;
  }

  if (key === 'regen') {
    const abs = Math.abs(Math.round(diff));
    return diff >= 0
      ? `<span class="diff-up">↑ ${abs} kW more</span>`
      : `<span class="diff-down">↓ ${abs} kW less</span>`;
  }

  if (key === 'weight') {
    const abs = Math.abs(Math.round(diff));
    return diff <= 0
      ? `<span class="diff-up">↑ ${abs} kg lighter</span>`
      : `<span class="diff-down">↓ ${abs} kg heavier</span>`;
  }

  return '—';
}

function renderCompareTable() {
  const carA = compareTray[0];
  const carB = compareTray[1];
  if (!carA || !carB) return;

  const rowConfigs = [
    { label: 'PEAK POWER', key: 'power', v1: carA.specs.power, v2: carB.specs.power },
    { label: 'TOP SPEED', key: 'speed', v1: carA.specs.topSpeed, v2: carB.specs.topSpeed },
    {
      label: 'RACE ENERGY / BATTERY',
      key: 'energy',
      v1: `${carA.specs.energy} <span class="val-sub">${carA.specs.energySub || ''}</span>`,
      v2: `${carB.specs.energy} <span class="val-sub">${carB.specs.energySub || ''}</span>`
    },
    { label: '0-100 KM/H', key: 'accel', v1: carA.specs.acceleration, v2: carB.specs.acceleration },
    { label: 'MAX REGENERATION', key: 'regen', v1: carA.specs.regen, v2: carB.specs.regen },
    { label: 'MINIMUM WEIGHT', key: 'weight', v1: carA.specs.weight, v2: carB.specs.weight }
  ];

  compareTbody.innerHTML = '';
  rowConfigs.forEach((r) => {
    const tr = document.createElement('tr');

    const middleContent =
      compareDisplayMode === 'difference'
        ? formatDifference(carA, carB, r.key)
        : `<span class="attr-label-text">${r.label}</span>`;

    const c2Muted = r.v2.includes('not published') ? 'val-muted' : '';

    tr.innerHTML = `
      <td class="col-c1">${r.v1}</td>
      <td class="col-center">${middleContent}</td>
      <td class="col-c2 ${c2Muted}">${r.v2}</td>
    `;
    compareTbody.appendChild(tr);
  });
}

function switchVehiclesOrder() {
  if (compareTray.length < 2) return;
  compareTray = [compareTray[1], compareTray[0]];

  carGroup1.clear();
  carGroup2.clear();

  enterCompareView();
}

btnSwitchPositions.addEventListener('click', switchVehiclesOrder);

async function enterCompareView() {
  currentMode = 'compare';
  singleView.classList.remove('active');
  compareView.classList.add('active');

  const carA = compareTray[0];
  const carB = compareTray[1];

  cmpCat1.textContent = carA.category;
  cmpTitle1.textContent = carA.name;
  thCar1.textContent = carA.name.toUpperCase();

  cmpCat2.textContent = carB.category;
  cmpTitle2.textContent = carB.name;
  thCar2.textContent = carB.name.toUpperCase();

  renderCompareTable();
  updateCanvasSizeAndCamera();

  const [modelA, modelB] = await Promise.all([
    loadVehicleModel(carA),
    loadVehicleModel(carB)
  ]);

  carGroup1.clear();
  carGroup1.add(modelA);
  carGroup1.visible = true;

  carGroup2.clear();
  carGroup2.add(modelB);
  carGroup2.visible = true;

  updateCompareCarPositions();
}

function exitCompareView() {
  currentMode = 'single';
  compareTray = [];
  compareView.classList.remove('active');
  singleView.classList.add('active');
  updateSingleUI();
}

function swapVehicle(slotIndex) {
  const otherSlotIndex = slotIndex === 0 ? 1 : 0;
  const currentOtherCar = compareTray[otherSlotIndex];
  const currentThisCar = compareTray[slotIndex];

  const currentVehicleIdx = vehicles.findIndex((v) => v.id === currentThisCar.id);

  for (let step = 1; step < vehicles.length; step++) {
    const nextIdx = (currentVehicleIdx + step) % vehicles.length;
    const candidateCar = vehicles[nextIdx];

    if (!currentOtherCar || candidateCar.id !== currentOtherCar.id) {
      compareTray[slotIndex] = candidateCar;
      enterCompareView();
      break;
    }
  }
}

tabBtnAttribute.addEventListener('click', () => {
  compareDisplayMode = 'attribute';
  tabBtnAttribute.classList.add('active');
  tabBtnDifference.classList.remove('active');
  renderCompareTable();
});

tabBtnDifference.addEventListener('click', () => {
  compareDisplayMode = 'difference';
  tabBtnDifference.classList.add('active');
  tabBtnAttribute.classList.remove('active');
  renderCompareTable();
});

btnPrev.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + vehicles.length) % vehicles.length;
  updateSingleUI();
});

btnNext.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % vehicles.length;
  updateSingleUI();
});

btnExitCompare.addEventListener('click', exitCompareView);

[btnSwap1, btnSwapM1].forEach((btn) => btn?.addEventListener('click', () => swapVehicle(0)));
[btnSwap2, btnSwapM2].forEach((btn) => btn?.addEventListener('click', () => swapVehicle(1)));

function animate() {
  requestAnimationFrame(animate);

  if (carGroup1.visible) carGroup1.rotation.y += 0.005;
  if (carGroup2.visible) carGroup2.rotation.y += 0.005;

  composer.render();
}

updateSingleUI();
animate();