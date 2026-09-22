import './style.css';
import * as THREE from 'three';
import { vehicles } from './carsData.js';

// ESTADO GLOBAL
let currentMode = 'single'; // 'single' ou 'compare'
let currentIndex = 4; // GEN4 por padrão
let compareTray = []; // Veículos selecionados (máx 2)

// ELEMENTOS DO DOM - VIEWS
const singleView = document.querySelector('#single-view');
const compareView = document.querySelector('#compare-view');

// ELEMENTOS - SINGLE VIEW
const carSeason = document.querySelector('#car-season');
const carTitle = document.querySelector('#car-title');
const carDimensions = document.querySelector('#car-dimensions');
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
const cmpDim1 = document.querySelector('#cmp-dim-1');
const thCar1 = document.querySelector('#th-car-1');

const cmpCat2 = document.querySelector('#cmp-cat-2');
const cmpTitle2 = document.querySelector('#cmp-title-2');
const cmpDim2 = document.querySelector('#cmp-dim-2');
const thCar2 = document.querySelector('#th-car-2');

const compareTbody = document.querySelector('#compare-tbody');
const btnExitCompare = document.querySelector('#btn-exit-compare');
const btnSwap1 = document.querySelector('#btn-swap-1');
const btnSwap2 = document.querySelector('#btn-swap-2');
const btnSwapM1 = document.querySelector('#btn-swap-m1');
const btnSwapM2 = document.querySelector('#btn-swap-m2');

// -------------------------------------------------------------
// THREE.JS SETUP COM CÂMERA ELEVADA
// -------------------------------------------------------------
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

function adjustCamera() {
  const isMobile = window.innerWidth <= 900;
  if (isMobile) {
    camera.position.set(0, 1.85, 6.2);
    camera.lookAt(0, 1.35, 0);
  } else {
    // No desktop desloca levemente à esquerda para alinhar com o viewport 3D
    camera.position.set(-0.7, 1.35, 5.2);
    camera.lookAt(-0.7, 0.9, 0);
  }
}
adjustCamera();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(5, 12, 8);
scene.add(dirLight);

// Cubo 1 (Carro Principal)
const geom1 = new THREE.BoxGeometry(1, 1, 1);
const mat1 = new THREE.MeshStandardMaterial({ color: vehicles[currentIndex].color });
const mesh1 = new THREE.Mesh(geom1, mat1);
scene.add(mesh1);

// Cubo 2 (Segundo Carro na Comparação)
const geom2 = new THREE.BoxGeometry(1, 1, 1);
const mat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
const mesh2 = new THREE.Mesh(geom2, mat2);
scene.add(mesh2);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  adjustCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (currentMode === 'single') updateSingleUI();
  else enterCompareView();
});

// -------------------------------------------------------------
// SINGLE VIEW LOGIC
// -------------------------------------------------------------
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

function updateSingleUI() {
  const currentCar = vehicles[currentIndex];

  carSeason.textContent = currentCar.category;
  carTitle.textContent = currentCar.name;
  carDimensions.textContent = `${currentCar.dimensions} · true scale 1 px = 7.7 mm`;
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

  // Posicionamento no frame 3D
  const isMobile = window.innerWidth <= 900;
  const posX = isMobile ? 0 : -0.7;
  const posY = isMobile ? 1.35 : 0.9;

  mesh1.position.set(posX, posY, 0);
  mesh1.scale.set(currentCar.scale.x * 0.85, currentCar.scale.y * 0.85, currentCar.scale.z * 0.85);
  mat1.color.setHex(currentCar.color);
  mat2.opacity = 0;
}

// -------------------------------------------------------------
// COMPARE VIEW LOGIC
// -------------------------------------------------------------
function enterCompareView() {
  currentMode = 'compare';
  singleView.classList.remove('active');
  compareView.classList.add('active');

  const carA = compareTray[0];
  const carB = compareTray[1];

  cmpCat1.textContent = carA.category;
  cmpTitle1.textContent = carA.name;
  cmpDim1.textContent = carA.dimensions;
  thCar1.textContent = carA.name.toUpperCase();

  cmpCat2.textContent = carB.category;
  cmpTitle2.textContent = carB.name;
  cmpDim2.textContent = carB.dimensions;
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

  const isMobile = window.innerWidth <= 900;
  const posY = isMobile ? 1.35 : 0.95; // Acima da régua métrica
  const separation = isMobile ? 1.25 : 1.75;

  // Carro 1 (esquerda)
  mesh1.position.set(-separation, posY, 0);
  mesh1.scale.set(carA.scale.x * 0.75, carA.scale.y * 0.75, carA.scale.z * 0.75);
  mat1.color.setHex(carA.color);

  // Carro 2 (direita)
  mesh2.position.set(separation, posY, 0);
  mesh2.scale.set(carB.scale.x * 0.75, carB.scale.y * 0.75, carB.scale.z * 0.75);
  mat2.color.setHex(carB.color);
  mat2.opacity = 1;
}

function exitCompareView() {
  currentMode = 'single';
  compareTray = []; // Reseta a bandeja para evitar bugs
  compareView.classList.remove('active');
  singleView.classList.add('active');
  updateSingleUI();
}

function swapVehicle(slotIndex) {
  const nextCar = vehicles.find((v) => !compareTray.some((c) => c.id === v.id));
  if (nextCar) {
    compareTray[slotIndex] = nextCar;
    enterCompareView();
  }
}

// -------------------------------------------------------------
// LISTENERS & ANIMATION
// -------------------------------------------------------------
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
  mesh1.rotation.y += 0.008;
  if (mat2.opacity > 0) {
    mesh2.rotation.y += 0.008;
  }
  renderer.render(scene, camera);
}

// Inicia
updateSingleUI();
animate();
