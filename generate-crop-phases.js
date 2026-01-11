const fs = require('fs');
const path = require('path');

// Cozy 2.5D Palette & Characteristics
// Designed to match the 'theme.ts' soft aesthetic
const crops = {
  // Fruits (Trees/Bushes)
  'apple': { light: '#FF6B6B', dark: '#D63031', stroke: '#8E1C1C', foliage: '#2ECC71', shape: 'round', height: 'tree' },
  'peach': { light: '#FFB7B2', dark: '#E55039', stroke: '#B33771', foliage: '#81C784', shape: 'round', height: 'tree' },
  'pear': { light: '#D4E157', dark: '#AFB42B', stroke: '#827717', foliage: '#AED581', shape: 'pear', height: 'tree' },
  'cherry': { light: '#E74C3C', dark: '#922B21', stroke: '#641E16', foliage: '#27AE60', shape: 'small', height: 'bush' },
  'strawberry': { light: '#FF6B6B', dark: '#C0392B', stroke: '#922B21', foliage: '#2ECC71', shape: 'small', height: 'low' },
  'watermelon': { light: '#58D68D', dark: '#196F3D', stroke: '#145A32', foliage: '#27AE60', shape: 'large', height: 'ground' },

  // Vegetables
  'carrot': { light: '#FFB347', dark: '#E67E22', stroke: '#BA4A00', foliage: '#2ECC71', shape: 'root', height: 'root' },
  'corn': { light: '#FFEB3B', dark: '#FBC02D', stroke: '#F9A825', foliage: '#4CAF50', shape: 'stalk', height: 'tall' },
  'tomato': { light: '#FF5E5E', dark: '#C0392B', stroke: '#922B21', foliage: '#2ECC71', shape: 'round', height: 'bush' },
  'asparagus': { light: '#58D68D', dark: '#229954', stroke: '#196F3D', foliage: '#2ECC71', shape: 'vertical', height: 'tall' },
  'broccoli': { light: '#2ECC71', dark: '#1E8449', stroke: '#145A32', foliage: '#27AE60', shape: 'tree', height: 'medium' },
  'cabbage': { light: '#ABEBC6', dark: '#27AE60', stroke: '#196F3D', foliage: '#2ECC71', shape: 'round', height: 'ground' },
  'mushroom': { light: '#E74C3C', dark: '#922B21', stroke: '#7B241C', foliage: '#F5F5F5', shape: 'cap', height: 'low' },
  'cucumber': { light: '#58D68D', dark: '#196F3D', stroke: '#145A32', foliage: '#27AE60', shape: 'long', height: 'bush' },
  'pepper': { light: '#FF5252', dark: '#B71C1C', stroke: '#861212', foliage: '#27AE60', shape: 'round', height: 'bush' },
  'potato': { light: '#E59866', dark: '#A04000', stroke: '#6E2C00', foliage: '#27AE60', shape: 'root', height: 'root' },
  'onion': { light: '#F9E79F', dark: '#B9770E', stroke: '#935116', foliage: '#2ECC71', shape: 'root', height: 'root' },
  'garlic': { light: '#FDFEFE', dark: '#D7DBDD', stroke: '#99A3A4', foliage: '#2ECC71', shape: 'root', height: 'root' },
  'radish': { light: '#FF4081', dark: '#C2185B', stroke: '#880E4F', foliage: '#2ECC71', shape: 'root', height: 'root' },
  'lettuce': { light: '#ABEBC6', dark: '#52BE80', stroke: '#145A32', foliage: '#2ECC71', shape: 'spread', height: 'ground' },
  'spinach': { light: '#58D68D', dark: '#145A32', stroke: '#0E6251', foliage: '#27AE60', shape: 'spread', height: 'ground' },
  'pumpkin': { light: '#F39C12', dark: '#CA6F1E', stroke: '#935116', foliage: '#27AE60', shape: 'large', height: 'ground' },

  // Grains
  'wheat': { light: '#F7DC6F', dark: '#D4AC0D', stroke: '#9A7D0A', foliage: '#F7DC6F', shape: 'wheat', height: 'tall' },

  // Berries
  'blueberry': { light: '#5DADE2', dark: '#1F618D', stroke: '#1A5276', foliage: '#27AE60', shape: 'cluster', height: 'bush' },
  'grape': { light: '#9B59B6', dark: '#6C3483', stroke: '#512E5F', foliage: '#27AE60', shape: 'cluster', height: 'bush' }
};

function getCommonDefs(name, data) {
  return `
  <defs>
    <!-- Crop Body Gradient (Spherical Volume) -->
    <radialGradient id="grad_${name}" cx="30%" cy="30%" r="70%" fx="30%" fy="30%">
      <stop offset="0%" stop-color="${data.light}" />
      <stop offset="100%" stop-color="${data.dark}" />
    </radialGradient>
    
    <!-- Foliage Gradient -->
    <linearGradient id="foliage_${name}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${data.foliage}" style="stop-opacity:1" />
      <stop offset="100%" stop-color="#1B5E20" style="stop-opacity:1" /> <!-- Darker green bottom -->
    </linearGradient>

    <!-- Soft Drop Shadow for Grounding -->
    <filter id="shadow_${name}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>`;
}

function getFace(yOffset = 0) {
  // Cozy face: wide set eyes, small mouth
  return `
  <g fill="#3E2723" transform="translate(0, ${yOffset})">
    <circle cx="26" cy="34" r="2.5" /> 
    <circle cx="38" cy="34" r="2.5" /> 
    <path d="M29 39 Q32 42 35 39" fill="none" stroke="#3E2723" stroke-width="1.8" stroke-linecap="round" />
    <!-- Cheeks -->
    <circle cx="24" cy="38" r="2" fill="#FF8A80" opacity="0.6"/>
    <circle cx="40" cy="38" r="2" fill="#FF8A80" opacity="0.6"/>
  </g>`;
}

function generatePhaseSVG(name, phase, data) {
  const common = getCommonDefs(name, data);
  const stroke = `stroke="${data.stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  let content = '';
  let showFace = false;

  // --- Phase 1: Seed / Mounded Earth ---
  // Just a disturbed patch of soil, maybe a tiny green speck.
  if (phase === 1) {
    content = `
      <g filter="url(#shadow_${name})">
        <!-- Mound of dirt -->
        <ellipse cx="32" cy="48" rx="14" ry="6" fill="#795548" stroke="#3E2723" stroke-width="2" />
        <ellipse cx="32" cy="46" rx="10" ry="4" fill="#8D6E63" />
        <!-- Tiny speck -->
        <circle cx="32" cy="44" r="1.5" fill="#C5E1A5" />
      </g>`;
  }

  // --- Phase 2: Sprout ---
  // A distinct "V" shape or two small leaves. NO FRUIT.
  else if (phase === 2) {
    content = `
      <g filter="url(#shadow_${name})">
         <!-- Stem -->
         <path d="M32 50 L32 40" stroke="#558B2F" stroke-width="2" stroke-linecap="round" />
         <!-- Left Leaf -->
         <path d="M32 40 Q24 35 22 42" fill="none" stroke="#7CB342" stroke-width="3" stroke-linecap="round" />
         <ellipse cx="22" cy="42" rx="4" ry="2" fill="#81C784" stroke="#558B2F" stroke-width="1" />
         <!-- Right Leaf -->
         <path d="M32 40 Q40 35 42 42" fill="none" stroke="#7CB342" stroke-width="3" stroke-linecap="round" />
         <ellipse cx="42" cy="42" rx="4" ry="2" fill="#81C784" stroke="#558B2F" stroke-width="1" />
      </g>`;
  }

  // --- Phase 3: Growing (Vegetative) ---
  // Significant height difference based on crop type
  // --- Phase 3: Vegetative ---
  // Bushy, leafy, taller. NO FRUIT.
  else if (phase === 3) {
    if (data.height === 'tall' || data.height === 'tree') {
      // Growing tall
      content = `
        <g filter="url(#shadow_${name})">
          <path d="M32 50 L32 25" stroke="#558B2F" stroke-width="4" stroke-linecap="round" />
          <path d="M32 40 L20 30" stroke="#558B2F" stroke-width="3" stroke-linecap="round" />
          <path d="M32 35 L44 25" stroke="#558B2F" stroke-width="3" stroke-linecap="round" />
          <!-- Leaves -->
          <circle cx="20" cy="30" r="5" fill="#7CB342" ${stroke} />
          <circle cx="44" cy="25" r="5" fill="#7CB342" ${stroke} />
          <circle cx="32" cy="20" r="6" fill="#7CB342" ${stroke} />
        </g>`;
    } else {
      // Bushy round
      content = `
        <g filter="url(#shadow_${name})">
          <path d="M32 50 L32 35" stroke="#558B2F" stroke-width="3" />
          <circle cx="25" cy="40" r="8" fill="#81C784" stroke="#2E7D32" stroke-width="1"/>
          <circle cx="39" cy="40" r="8" fill="#81C784" stroke="#2E7D32" stroke-width="1"/>
          <circle cx="32" cy="32" r="10" fill="#66BB6A" stroke="#2E7D32" stroke-width="1"/>
        </g>`;
    }
  }

  // --- Phase 4: Fruiting / Flowering ---
  // Distinct shapes emerge
  // --- Phase 4: Flowering / Immature Fruit ---
  // Small buds, flowers, or green/small fruits.
  else if (phase === 4) {
    let fruitContent = '';
    // Small version of fruit
    if (['round', 'small', 'large'].includes(data.shape)) {
      fruitContent = `<circle cx="32" cy="30" r="8" fill="#C5E1A5" stroke="#33691E" stroke-width="1" />`;
    } else if (data.shape === 'stalk') {
      fruitContent = `<rect x="28" y="20" width="8" height="20" rx="4" fill="#C5E1A5" stroke="#33691E" stroke-width="1" />`;
    }

    content = `
      <g filter="url(#shadow_${name})">
        <path d="M32 50 L32 30" stroke="#33691E" stroke-width="3" />
        <!-- Big foliage as backdrop -->
        <circle cx="32" cy="35" r="12" fill="#81C784" stroke="#2E7D32" stroke-width="1" />
        ${fruitContent}
      </g>
      ${getFace(2)} <!-- Happy Face Appears -->
    `;
    showFace = false; // Manually added above
  }

  // --- Phase 5: Harvest Ready ---
  // Maximum size, shiny, vibrant
  else if (phase === 5) {
    let mainShape = '';

    if (data.shape === 'round') {
      mainShape = `<circle cx="32" cy="30" r="18" fill="url(#grad_${name})" ${stroke} />
                   <path d="M32 12 L32 4" stroke="#5D4037" stroke-width="3" stroke-linecap="round"/>
                   <leaf d="M32 12 Q20 8 18 16" fill="#4CAF50" stroke="#1B5E20"/>`;
    } else if (data.shape === 'large') {
      mainShape = `<ellipse cx="32" cy="32" rx="22" ry="16" fill="url(#grad_${name})" ${stroke} />`;
    } else if (data.shape === 'stalk' || data.shape === 'wheat') {
      mainShape = `<rect x="24" y="10" width="16" height="40" rx="8" fill="url(#grad_${name})" ${stroke} />
                    <path d="M32 50 L32 6" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`;
    } else if (data.shape === 'root') {
      mainShape = `<path d="M32 15 L20 5 Q32 0 44 5 Z" fill="#4CAF50" stroke="#1B5E20" stroke-width="2" />
                    <path d="M20 25 C14 30 14 45 22 55 C32 62 42 62 50 55 C58 45 58 30 44 25" fill="url(#grad_${name})" ${stroke} />`;
    } else {
      // Small/Cluster
      mainShape = `<circle cx="22" cy="30" r="8" fill="url(#grad_${name})" ${stroke} />
                    <circle cx="42" cy="30" r="8" fill="url(#grad_${name})" ${stroke} />
                    <circle cx="32" cy="40" r="8" fill="url(#grad_${name})" ${stroke} />`;
    }

    content = `
      <g filter="url(#shadow_${name})">
         <!-- Foliage Base -->
         <path d="M32 54 L32 45" stroke="#33691E" stroke-width="4" />
         ${mainShape}
         <!-- Highlight Shine -->
         <ellipse cx="40" cy="28" rx="4" ry="2" fill="white" opacity="0.4" transform="rotate(-45 40 28)"/>
      </g>`;

    showFace = true;
  }

  // Append face if needed
  if (showFace) {
    content += getFace(3); // 3 = Very Happy
  }

  return `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  ${common}
  ${content}
</svg>`;
}

// Keep track of all generated assets for the manifest
const assetManifest = [];

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

    // Add to manifest
    assetManifest.push({
      id: `crop_${cropName}_phase${phase}`,
      path: `../../assets/crops/phase${phase}/${cropName}.svg`
    });
  }
}

// Generate Static Asset Map (TypeScript) for Metro Bundler
const manifestPath = path.join(__dirname, 'src', 'assets', 'GeneratedCrops.ts');
const manifestContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated by generate-crop-phases.js
 */

export const GeneratedCrops: Record<string, any> = {
${assetManifest.map(a => `  '${a.id}': require('${a.path}'),`).join('\n')}
};
`;

// Ensure src/assets exists
const srcAssetsDir = path.dirname(manifestPath);
if (!fs.existsSync(srcAssetsDir)) {
  fs.mkdirSync(srcAssetsDir, { recursive: true });
}

fs.writeFileSync(manifestPath, manifestContent);

console.log('Generated Cozy 2.5D assets and static manifest for ' + Object.keys(crops).length + ' crops.');
