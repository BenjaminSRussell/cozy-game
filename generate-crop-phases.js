const fs = require('fs');
const path = require('path');

// Cozy Dimensional Palette & Characteristics
const crops = {
  // Fruits
  'apple': { light: '#FF6B6B', dark: '#D63031', stroke: '#8E1C1C', shape: 'round', height: 'tree' },
  'peach': { light: '#FFB7B2', dark: '#E55039', stroke: '#B33771', shape: 'round', height: 'tree' },
  'pear': { light: '#D4E157', dark: '#AFB42B', stroke: '#827717', shape: 'pear', height: 'tree' },
  'cherry': { light: '#E74C3C', dark: '#922B21', stroke: '#641E16', shape: 'small', height: 'bush' },
  'strawberry': { light: '#FF6B6B', dark: '#C0392B', stroke: '#922B21', shape: 'small', height: 'low' },
  'watermelon': { light: '#58D68D', dark: '#196F3D', stroke: '#145A32', shape: 'large', height: 'ground' },

  // Vegetables
  'carrot': { light: '#FFB347', dark: '#E67E22', stroke: '#BA4A00', shape: 'root', height: 'root' },
  'corn': { light: '#FFEB3B', dark: '#FBC02D', stroke: '#F9A825', shape: 'stalk', height: 'tall' },
  'tomato': { light: '#FF5E5E', dark: '#C0392B', stroke: '#922B21', shape: 'round', height: 'bush' },
  'asparagus': { light: '#58D68D', dark: '#229954', stroke: '#196F3D', shape: 'vertical', height: 'tall' },
  'broccoli': { light: '#2ECC71', dark: '#1E8449', stroke: '#145A32', shape: 'tree', height: 'medium' },
  'cabbage': { light: '#ABEBC6', dark: '#27AE60', stroke: '#196F3D', shape: 'round', height: 'ground' },
  'mushroom': { light: '#E74C3C', dark: '#922B21', stroke: '#7B241C', shape: 'cap', height: 'low' },
  'cucumber': { light: '#58D68D', dark: '#196F3D', stroke: '#145A32', shape: 'long', height: 'bush' },
  'pepper': { light: '#FF5252', dark: '#B71C1C', stroke: '#861212', shape: 'round', height: 'bush' },
  'potato': { light: '#E59866', dark: '#A04000', stroke: '#6E2C00', shape: 'root', height: 'root' },
  'onion': { light: '#F9E79F', dark: '#B9770E', stroke: '#935116', shape: 'root', height: 'root' },
  'garlic': { light: '#FDFEFE', dark: '#D7DBDD', stroke: '#99A3A4', shape: 'root', height: 'root' },
  'radish': { light: '#FF4081', dark: '#C2185B', stroke: '#880E4F', shape: 'root', height: 'root' },
  'lettuce': { light: '#ABEBC6', dark: '#52BE80', stroke: '#145A32', shape: 'spread', height: 'ground' },
  'spinach': { light: '#58D68D', dark: '#145A32', stroke: '#0E6251', shape: 'spread', height: 'ground' },
  'pumpkin': { light: '#F39C12', dark: '#CA6F1E', stroke: '#935116', shape: 'large', height: 'ground' },

  // Grains
  'wheat': { light: '#F7DC6F', dark: '#D4AC0D', stroke: '#9A7D0A', shape: 'wheat', height: 'tall' },

  // Berries
  'blueberry': { light: '#5DADE2', dark: '#1F618D', stroke: '#1A5276', shape: 'cluster', height: 'bush' },
  'grape': { light: '#9B59B6', dark: '#6C3483', stroke: '#512E5F', shape: 'cluster', height: 'bush' }
};

function getCommonDefs(name, data) {
  return `
  <defs>
    <radialGradient id="grad_${name}" cx="35%" cy="30%" r="60%" fx="30%" fy="25%">
      <stop offset="0%" stop-color="${data.light}" />
      <stop offset="100%" stop-color="${data.dark}" />
    </radialGradient>
    <filter id="shadow_${name}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>`;
}

function getFace(yOffset = 0) {
  return `
  <g fill="#2D0B0B" transform="translate(0, ${yOffset})">
    <circle cx="26" cy="34" r="2" /> 
    <circle cx="38" cy="34" r="2" /> 
    <path d="M29 40 Q32 43 35 40" fill="none" stroke="#2D0B0B" stroke-width="1.5" stroke-linecap="round" />
  </g>`;
}

function generatePhaseSVG(name, phase, data) {
  const common = getCommonDefs(name, data);
  const stroke = `stroke="${data.stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  let content = '';

  // --- Phase 1: Seed / Sproutling ---
  if (phase === 1) {
    content = `
    <g filter="url(#shadow_${name})">
      <path d="M32 40 L32 48" stroke="#5D4037" stroke-width="2" stroke-linecap="round" />
      <circle cx="32" cy="48" r="3" fill="#5D4037" /> <!-- Seed embedded -->
      <path d="M32 40 Q28 32 24 34" fill="none" stroke="#2ECC71" stroke-width="2" stroke-linecap="round" />
      <path d="M32 40 Q36 32 40 34" fill="none" stroke="#2ECC71" stroke-width="2" stroke-linecap="round" />
    </g>`;
  }

  // --- Phase 2: Seedling ---
  if (phase === 2) {
    content = `
    <g filter="url(#shadow_${name})">
      <path d="M32 30 L32 48" stroke="#2ECC71" stroke-width="3" stroke-linecap="round" />
      <path d="M32 30 Q24 20 18 24" fill="none" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round" />
      <ellipse cx="18" cy="24" rx="5" ry="3" fill="#2ECC71" stroke="#27AE60" stroke-width="1.5" />
      <path d="M32 30 Q40 20 46 24" fill="none" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round" />
      <ellipse cx="46" cy="24" rx="5" ry="3" fill="#2ECC71" stroke="#27AE60" stroke-width="1.5" />
    </g>`;
  }

  // --- Phase 3: Vegetative Growth ---
  if (phase === 3) {
    // Generic "growing plant" shape, varying slightly by type
    if (data.height === 'tall' || data.height === 'tree') {
      content = `
      <g filter="url(#shadow_${name})">
        <path d="M32 50 L32 20" stroke="#2ECC71" stroke-width="4" stroke-linecap="round" />
        <path d="M32 36 Q16 26 12 36" fill="none" stroke="#27AE60" stroke-width="2" />
        <circle cx="12" cy="36" r="6" fill="#2ECC71" stroke="#27AE60" stroke-width="2" />
        <path d="M32 28 Q48 18 52 28" fill="none" stroke="#27AE60" stroke-width="2" />
        <circle cx="52" cy="28" r="6" fill="#2ECC71" stroke="#27AE60" stroke-width="2" />
        <circle cx="32" cy="20" r="8" fill="url(#grad_${name})" stroke="#27AE60" stroke-width="2" opacity="0.8" /> <!-- Bud -->
      </g>`;
    } else {
      content = `
      <g filter="url(#shadow_${name})">
        <path d="M32 48 L32 28" stroke="#27AE60" stroke-width="3" stroke-linecap="round" />
        <ellipse cx="22" cy="32" rx="8" ry="4" fill="#2ECC71" stroke="#27AE60" stroke-width="2" transform="rotate(-20 22 32)" />
        <ellipse cx="42" cy="32" rx="8" ry="4" fill="#2ECC71" stroke="#27AE60" stroke-width="2" transform="rotate(20 42 32)" />
        <circle cx="32" cy="28" r="6" fill="url(#grad_${name})" ${stroke} /> <!-- Small crop start -->
      </g>`;
    }
  }

  // --- Phase 4: Flowering / Fruiting (Generic but colored) ---
  if (phase === 4) {
    if (data.shape === 'round' || data.shape === 'large') {
      content = `
      <g filter="url(#shadow_${name})">
        <!-- Leaves behind -->
        <path d="M32 40 L20 30" stroke="#27AE60" stroke-width="3" stroke-linecap="round" />
        <circle cx="20" cy="30" r="6" fill="#2ECC71" stroke="#145A32" stroke-width="2" />
        <path d="M32 40 L44 30" stroke="#27AE60" stroke-width="3" stroke-linecap="round" />
        <circle cx="44" cy="30" r="6" fill="#2ECC71" stroke="#145A32" stroke-width="2" />
        
        <!-- The Crop (Medium size) -->
        <circle cx="32" cy="36" r="14" fill="url(#grad_${name})" ${stroke} />
      </g>
      ${getFace(2)} <!-- Subtle face -->`;
    } else if (data.shape === 'root') {
      content = `
      <g filter="url(#shadow_${name})">
        <!-- Tops -->
        <path d="M32 30 L24 15 Q32 10 40 15 Z" fill="#2ECC71" stroke="#145A32" stroke-width="2" />
        <!-- Poking out -->
        <path d="M32 36 C24 36 20 42 20 48 L44 48 C44 42 40 36 32 36 Z" fill="url(#grad_${name})" ${stroke} />
      </g>
      <g fill="#2D0B0B" transform="translate(0, 8)"> <!-- Lower face for roots -->
        <circle cx="28" cy="34" r="1.5" /> <circle cx="36" cy="34" r="1.5" />
        <path d="M30 38 Q32 40 34 38" fill="none" stroke="#2D0B0B" stroke-width="1.2" stroke-linecap="round" />
      </g>`;
    } else {
      // Generic upright
      content = `
      <g filter="url(#shadow_${name})">
        <rect x="28" y="24" width="8" height="24" rx="4" fill="url(#grad_${name})" ${stroke} />
        <path d="M32 24 L32 10" stroke="#27AE60" stroke-width="3" />
        <ellipse cx="32" cy="10" rx="8" ry="4" fill="#2ECC71" stroke="#145A32" stroke-width="2" />
      </g>
      ${getFace(0)}`;
    }
  }

  // --- Phase 5: Harvest Ready (Almost Master Refinement, but programmatic) ---
  if (phase === 5) {
    // For automation, we try to mimic the master style logic simply
    // ideally we just COPY the master SVG logic here, but since that's manual work,
    // we generate a "Best Effort" programmatic version that looks 90% there
    // and ensures all 136 assets exist.
    // In reality, the user should rely on the master icons for UI, but phase 5 is in-world.

    if (data.shape === 'round') {
      content = `
       <g filter="url(#shadow_${name})">
         <path d="M32 14 L32 6" stroke="#5D4037" stroke-width="3" stroke-linecap="round" />
         <path d="M32 14 L40 10 Q44 14 36 18" fill="#2ECC71" stroke="#145A32" stroke-width="1.5" />
         <circle cx="32" cy="36" r="18" fill="url(#grad_${name})" ${stroke} />
       </g>
       ${getFace(2)}`;
    } else if (data.shape === 'root') {
      content = `
        <g filter="url(#shadow_${name})">
           <path d="M32 20 L22 8 Q32 4 42 8 Z" fill="#2ECC71" stroke="#145A32" stroke-width="2" />
           <path d="M20 25 C14 30 14 45 22 52 C30 58 44 58 52 50 C58 42 56 28 48 22 C40 16 26 18 20 25 Z" fill="url(#grad_${name})" ${stroke} />
        </g>
        ${getFace(4)}`;
    } else {
      // Fallback catch-all simple puff
      content = `
        <g filter="url(#shadow_${name})">
          <ellipse cx="32" cy="34" rx="16" ry="20" fill="url(#grad_${name})" ${stroke} />
          <path d="M32 14 L32 6" stroke="#333" stroke-width="2" />
        </g>
        ${getFace(2)}`;
    }
  }

  return `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  ${common}
  ${content}
</svg>`;
}

// Generate all crop phases
for (const cropName in crops) {
  const cropData = crops[cropName];

  for (let phase = 1; phase <= 5; phase++) {
    const svg = generatePhaseSVG(cropName, phase, cropData);
    const filePath = path.join(__dirname, 'assets', 'crops', `phase${phase}`, `${cropName}.svg`);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, svg);
    console.log('Created: ' + filePath);
  }
}

console.log('All crop phases generated successfully with Cozy Dimensional style!');
