export const vehicles = [
  {
    id: 'gen1',
    num: '01',
    name: 'GEN1',
    category: 'SEASON 1-4 RACE CAR',
    dimensions: '5,000 x 1,800 x 1,250 mm',
    lengthLabel: 'GEN1 · 5,000 mm',
    color: 0x0072ce,
    scale: { x: 2.2, y: 0.5, z: 1.1 },
    specs: {
      power: '200 kW',
      topSpeed: '225 km/h',
      energy: '28 kWh battery',
      acceleration: 'approx. 3.0 s',
      regen: '150 kW',
      weight: '900 kg'
    }
  },
  {
    id: 'gen2',
    num: '02',
    name: 'GEN2',
    category: 'SEASON 5-8 RACE CAR',
    dimensions: '5,160 x 1,770 x 1,050 mm',
    lengthLabel: 'GEN2 · 5,160 mm',
    color: 0x00a3e0,
    scale: { x: 2.3, y: 0.5, z: 1.1 },
    specs: {
      power: '250 kW',
      topSpeed: '280 km/h',
      energy: '54 kWh battery',
      acceleration: '2.8 s',
      regen: '250 kW',
      weight: '903 kg'
    }
  },
  {
    id: 'gen3',
    num: '03',
    name: 'GEN3',
    category: 'SEASON 9-10 RACE CAR',
    dimensions: '5,016 x 1,700 x 1,023 mm',
    lengthLabel: 'GEN3 · 5,016 mm',
    color: 0x2dd4bf,
    scale: { x: 2.2, y: 0.5, z: 1.05 },
    specs: {
      power: '350 kW',
      topSpeed: '320 km/h',
      energy: '47 kWh battery',
      acceleration: 'approx. 2.0 s',
      regen: '600 kW',
      weight: '856 kg'
    }
  },
  {
    id: 'gen3evo',
    num: '04',
    name: 'GEN3 Evo',
    category: 'SEASON 11-12 RACE CAR',
    dimensions: '5,016 x 1,700 x 1,023 mm',
    lengthLabel: 'GEN3 Evo · 5,016 mm',
    color: 0x10b981,
    scale: { x: 2.2, y: 0.5, z: 1.05 },
    specs: {
      power: '350 kW',
      topSpeed: '322 km/h',
      energy: '47 kWh battery',
      acceleration: '1.86 s',
      regen: '600 kW',
      weight: '856 kg'
    }
  },
  {
    id: 'gen4',
    num: '05',
    name: 'GEN4',
    category: 'SEASON 13 RACE CAR',
    dimensions: '5,540 x 1,790 x 1,113 mm',
    lengthLabel: 'GEN4 · 5,540 mm',
    color: 0xffcc00,
    scale: { x: 2.5, y: 0.55, z: 1.1 },
    specs: {
      power: '600 kW',
      topSpeed: '335 km/h',
      energy: '55 kWh race energy',
      acceleration: 'approx. 1.8 s',
      regen: '700 kW',
      weight: '950 kg'
    }
  },
  {
    id: 'kiapv5',
    num: '06',
    name: 'Kia PV5 Cargo L2H1',
    category: 'DHL DELIVERY FLEET',
    dimensions: '4,695 x 1,895 x 1,923 mm',
    lengthLabel: 'PV5 · 4,695 mm',
    color: 0xffffff,
    scale: { x: 2.1, y: 1.1, z: 1.2 }, // Mais alto como a van da imagem
    specs: {
      power: '160 kW',
      topSpeed: '135 km/h',
      energy: '71.2 kWh battery',
      acceleration: '12.5 s',
      regen: 'not published',
      weight: 'not published'
    }
  }
];
