import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { vehicles } from './carsData.js';
import { initBackgroundParticles } from './particles.js';

// Inicializa o fundo dinâmico de partículas em Vanilla JS
initBackgroundParticles();

// ESTADO GLOBAL
let currentMode = 'single'; // 'single' ou 'compare'
let currentIndex = 4; // GEN4 por padrão
let compareTray = []; // Veículos selecionados (máx 2)

// Contentores do Canvas
const hostSingle = document.querySelector('#canvas-host-single');
const hostCompare = document.querySelector('#canvas-host-compare');

// ELEMENTOS DO DOM - VIEWS
const singleView = document.querySelector('#single-view');
const compareView = document.querySelector('#compare-view');

// ELEMENTOS - SINGLE VIEW
const carSeason = document.querySelector('#car-season');
const carTitle = document.querySelector('#car-title');
const statsCarName = document.querySelector('#stats-car-name');
const statsIndex = document.querySelector('#stats-index');
const specsList = document.querySelector('#specs-list');
const btnAddCompare = document.querySelector('#btn-add-compare');
const trayCount = document.querySelector('#tray-count');
const slot0 = document.querySelector('#slot-0');
const slot1 = document.querySelector('#slot-1');
const selectorIndex = document.querySelector('#selector-index');
const vehicleTabsContainer = document.querySelector('#vehicle-tabs');
const btnPrev = document.querySelector('#btn-prev');
const btnNext = document.querySelector('#btn-next');

// ELEMENTOS - COMPARE VIEW
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

// THREE.JS SETUP CONFINADO AO CONTAINER //

const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

function getActiveContainer() {
  return currentMode === 'single' ? hostSingle : hostCompare;
}

const activeHost = getActiveContainer();
const initWidth = activeHost?.clientWidth || window.innerWidth;
const initHeight = activeHost?.clientHeight || 400;

// Câmera teleobjetiva (FOV 24°) para eliminar distorções de perspectiva nas extremidades
const camera = new THREE.PerspectiveCamera(24, initWidth / initHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(initWidth, initHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

// Luz ambiente neutra omnidirecional em branco puro para iluminar todas as faces
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

// Luz direcional principal limpa vinda de cima e da frente
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 12, 8);
scene.add(dirLight);

// Luz secundária frontal suave para eliminar sombras duras na carroceria
const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
frontLight.position.set(-5, 4, 6);
scene.add(frontLight);

// PÓS-PROCESSAMENTO: SHADER DE ABERRAÇÃO CROMÁTICA// 

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0022 } // Dispersão óptica suave que preserva a nitidez no centro
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
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
composer.addPass(chromaticAberrationPass);

// -------------------------------------------------------------
// SISTEMA DE GRUPOS & CARREGAMENTO GLTF
// -------------------------------------------------------------
const carGroup1 = new THREE.Group();
const carGroup2 = new THREE.Group();
scene.add(carGroup1);
scene.add(carGroup2);

const gltfLoader = new GLTFLoader();
const modelCache = {};

async function loadVehicleModel(vehicle) {
  if (modelCache[vehicle.id]) {
    return modelCache[vehicle.id].clone();
  }

  return new Promise((resolve) => {
    gltfLoader.load(
      vehicle.modelPath,
      (gltf) => {
        const root = gltf.scene;

        // Auto-centralização pelo BoundingBox (alinhando com o piso y = 0)
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= box.min.y;
        
        const MODEL_SCALE = 0.75;
        root.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);

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
      (err) => {
        console.warn(`Não foi possível carregar ${vehicle.modelPath}. Usando fallback temporário.`, err);
        // Fallback procedural temporário enquanto os .glb estão sendo gerados no Blender
        const fallbackGeom = new THREE.BoxGeometry(2.2, 0.6, 1.1);
        const fallbackMat = new THREE.MeshStandardMaterial({
          color: 0xffcc00,
          roughness: 0.35,
          metalness: 0.7
        });
        const fallbackMesh = new THREE.Mesh(fallbackGeom, fallbackMat);
        resolve(fallbackMesh);
      }
    );
  });
}

// Cálculo do plano Z=0 para ancorar os modelos aos lados proporcionalmente
function getVisibleWidthAtZ0() {
  const fovInRad = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovInRad / 2) * camera.position.z;
  return visibleHeight * camera.aspect;
}

function updateCompareCarPositions() {
  if (currentMode !== 'compare') return;

  const visibleWidth = getVisibleWidthAtZ0();
  const isMobile = window.innerWidth <= 900;
  const sideRatio = isMobile ? 0.22 : 0.25;
  const separation = visibleWidth * sideRatio;

  carGroup1.position.set(-separation, -0.3, 0);
  carGroup2.position.set(separation, -0.3, 0);
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

  if (currentMode === 'single') {
    camera.position.set(0, 1.1, 8.5);
    camera.lookAt(0, 0, 0);
  } else {
    camera.position.set(0, 1.4, 11.2);
    camera.lookAt(0, 0.05, 0);
    updateCompareCarPositions();
  }
}

window.addEventListener('resize', () => {
  updateCanvasSizeAndCamera();
  if (currentMode === 'single') {
    updateSingleUI();
  } else {
    updateCompareCarPositions();
  }
});

// SINGLE VIEW LOGIC //

function renderTabs() {
  vehicleTabsContainer.innerHTML = '';
  vehicles.forEach((car, index) => {
    const tab = document.createElement('div');
    tab.className = `vehicle-tab ${index === currentIndex ? 'active' : ''}`;

    const slotIdx = compareTray.findIndex((item) => item.id === car.id);
    let badgeHtml = slotIdx !== -1 ? `<span class="slot-badge">${slotIdx + 1}</span>` : '';

    tab.innerHTML = `
      ${badgeHtml}
      <span class="tab-num">${car.num}</span>
      <span class="tab-name">${car.name}</span>
    `;

    tab.addEventListener('click', () => {
      currentIndex = index;
      updateSingleUI();
    });

    vehicleTabsContainer.appendChild(tab);
  });
}

function renderSingleSpecs(car) {
  specsList.innerHTML = '';
  const specEntries = [
    { label: 'PEAK POWER', val: car.specs.power, pct: (parseInt(car.specs.power) / 600) * 100 || 80, max: 'class max 600 kW' },
    { label: 'TOP SPEED', val: car.specs.topSpeed, pct: (parseInt(car.specs.topSpeed) / 335) * 100 || 80, max: 'class max 335 km/h' },
    { label: 'BATTERY / ENERGY', val: car.specs.energy, pct: 75, max: 'class max 71.2 kWh' },
    { label: '0-100 KM/H', val: car.specs.acceleration, pct: 85, max: 'class max 12.5 s' },
    { label: 'MAX REGEN', val: car.specs.regen, pct: car.specs.regen === 'not published' ? 0 : 80, max: 'class max 700 kW' },
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

function updateTraySlots() {
  trayCount.textContent = `COMPARE TRAY, ${compareTray.length} OF 2`;

  [slot0, slot1].forEach((slot, i) => {
    if (compareTray[i]) {
      slot.className = 'slot filled';
      slot.innerHTML = `<span>${compareTray[i].name}</span><div class="badge-remove" data-remove="${i}">✕</div>`;
    } else {
      slot.className = 'slot empty';
      slot.innerHTML = `<span>Empty<br/>slot ${i + 1}</span>`;
    }
  });

  document.querySelectorAll('.badge-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-remove'), 10);
      compareTray.splice(idx, 1);
      updateSingleUI();
    });
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
  renderTabs();
  updateTraySlots();

  const isInTray = compareTray.some((c) => c.id === currentCar.id);
  if (isInTray) {
    btnAddCompare.textContent = 'Added, pick a second vehicle';
    btnAddCompare.style.backgroundColor = '#475569';
    btnAddCompare.style.color = '#ffffff';
  } else {
    btnAddCompare.textContent = 'Add to compare';
    btnAddCompare.style.backgroundColor = 'var(--yellow)';
    btnAddCompare.style.color = '#0b0f19';
  }

  // Carrega e substitui o modelo no container 1
  const model = await loadVehicleModel(currentCar);
  carGroup1.clear();
  carGroup1.add(model);
  carGroup1.position.set(0, -0.3, 0);
  carGroup1.visible = true;

  // Esconde o slot 2 na visualização única
  carGroup2.visible = false;
  carGroup2.clear();

  updateCanvasSizeAndCamera();
}

// COMPARE VIEW LOGIC //

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

  const rows = [
    { label: 'Peak power', v1: carA.specs.power, v2: carB.specs.power },
    { label: 'Top speed', v1: carA.specs.topSpeed, v2: carB.specs.topSpeed },
    { label: 'Race energy / battery', v1: carA.specs.energy, v2: carB.specs.energy },
    { label: '0-100 km/h', v1: carA.specs.acceleration, v2: carB.specs.acceleration },
    { label: 'Max regeneration', v1: carA.specs.regen, v2: carB.specs.regen },
    { label: 'Minimum weight', v1: carA.specs.weight, v2: carB.specs.weight }
  ];

  compareTbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-attr">${r.label}</td>
      <td class="col-c1">${r.v1}</td>
      <td class="col-c2 ${r.v2 === 'not published' ? 'val-muted' : ''}">${r.v2}</td>
    `;
    compareTbody.appendChild(tr);
  });

  updateCanvasSizeAndCamera();

  // Carrega simultaneamente ambos os veículos para evitar atrasos na troca
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

//EVENTOS & LOOP DE RENDERIZAÇÃO//

btnAddCompare.addEventListener('click', () => {
  const currentCar = vehicles[currentIndex];
  const alreadyIn = compareTray.find((c) => c.id === currentCar.id);

  if (!alreadyIn) {
    compareTray.push(currentCar);
  }

  if (compareTray.length === 2) {
    enterCompareView();
  } else {
    updateSingleUI();
  }
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

  // Rotação sutil contínua dos modelos para visualização 360° fluida
  if (carGroup1.visible) {
    carGroup1.rotation.y += 0.005;
  }
  if (carGroup2.visible) {
    carGroup2.rotation.y += 0.005;
  }

  // Renderização através do composer com aberração cromática
  composer.render();
}

// Inicializa a cena
updateSingleUI();
animate();