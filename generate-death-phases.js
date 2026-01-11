const fs = require('fs');
const path = require('path');

// Create death phase directory
const deathDir = path.join(__dirname, 'assets/crops/death');
if (!fs.existsSync(deathDir)) {
    fs.mkdirSync(deathDir, { recursive: true });
}

// All crop types
const crops = [
    'wheat', 'carrot', 'tomato', 'corn', 'potato', 'lettuce', 'pumpkin',
    'strawberry', 'blueberry', 'apple', 'pear', 'peach', 'cherry', 'grape',
    'watermelon', 'cabbage', 'broccoli', 'onion', 'garlic', 'pepper',
    'cucumber', 'radish', 'spinach', 'asparagus', 'mushroom'
];

// Sad-Cute Characteristics (Desaturated versions of main colors)
const deathCharacteristics = {
    wheat: { color: '#C0B283', stroke: '#8D805B', shape: 'droop' },
    carrot: { color: '#D68910', stroke: '#935116', shape: 'wilt' },
    corn: { color: '#F0E68C', stroke: '#BDB76B', shape: 'droop' },
    tomato: { color: '#CD6155', stroke: '#922B21', shape: 'wilt' },
    potato: { color: '#A1887F', stroke: '#5D4037', shape: 'wilt' },
    onion: { color: '#D7CCC8', stroke: '#8D6E63', shape: 'wilt' },
    lettuce: { color: '#A9DFBF', stroke: '#7DCEA0', shape: 'flat' },
    spinach: { color: '#7DCEA0', stroke: '#27AE60', shape: 'flat' },
    // Default fallback
    default: { color: '#95A5A6', stroke: '#7F8C8D', shape: 'wilt' }
};

function getCommonDefs(color) {
    return `
  <defs>
    <filter id="shadowDeath" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.2"/>
    </filter>
  </defs>`;
}

function getSadFace() {
    return `
  <g fill="#424949" transform="translate(0, 4)">
    <circle cx="26" cy="34" r="1.5" /> 
    <circle cx="38" cy="34" r="1.5" /> 
    <!-- Inverted curve for sad mouth -->
    <path d="M29 42 Q32 39 35 42" fill="none" stroke="#424949" stroke-width="1.2" stroke-linecap="round" />
    <!-- Tear drop -->
    <path d="M39 36 Q40 40 39 42 L38 38 Z" fill="#3498DB" opacity="0.6" />
  </g>`;
}

function generateDeathSVG(name, chars) {
    const color = chars.color || '#95A5A6';
    const stroke = chars.stroke || '#7F8C8D';
    const common = getCommonDefs(color);

    let content = '';

    // "Sad-Cute" logic: Retain rounded shapes but squish/rotate them to look tired

    if (chars.shape === 'droop') {
        // Drooping stalk
        content = `
    <g filter="url(#shadowDeath)">
      <!-- Bent stalk -->
      <path d="M32 58 C32 40 28 30 16 20" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" />
      <!-- Drooping head -->
      <ellipse cx="16" cy="20" rx="6" ry="8" fill="${color}" stroke="${stroke}" stroke-width="2" transform="rotate(-30 16 20)" />
      <!-- Fallen leaf -->
      <ellipse cx="40" cy="54" rx="6" ry="3" fill="${color}" stroke="${stroke}" stroke-width="1.5" />
    </g>
    ${getSadFace()}`;
    } else if (chars.shape === 'flat') {
        // Flattened pile (lettuce/spinach)
        content = `
    <g filter="url(#shadowDeath)">
      <ellipse cx="32" cy="50" rx="16" ry="6" fill="${color}" stroke="${stroke}" stroke-width="2" />
      <ellipse cx="32" cy="46" rx="12" ry="5" fill="${color}" stroke="${stroke}" stroke-width="2" opacity="0.8" />
    </g>
    <g fill="#424949" transform="translate(0, 14)">
       <circle cx="28" cy="34" r="1.5" /> <circle cx="36" cy="34" r="1.5" />
       <path d="M30 40 Q32 38 34 40" fill="none" stroke="#424949" stroke-width="1.2" stroke-linecap="round" />
    </g>`;
    } else {
        // Generic wilt - squashed round
        content = `
    <g filter="url(#shadowDeath)">
      <ellipse cx="32" cy="44" rx="14" ry="10" fill="${color}" stroke="${stroke}" stroke-width="2" />
      <!-- Wrinkle lines -->
      <path d="M24 44 Q32 48 40 44" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.5" />
      <path d="M32 34 L32 38" stroke="${stroke}" stroke-width="2" />
    </g>
    ${getSadFace()}`;
    }

    return `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  ${common}
  ${content}
</svg>`;
}

crops.forEach(crop => {
    const chars = deathCharacteristics[crop] || deathCharacteristics.default;
    const svg = generateDeathSVG(crop, chars);
    const filePath = path.join(deathDir, `${crop}.svg`);
    fs.writeFileSync(filePath, svg);
    // console.log(\`Generated death phase for \${crop}\`);
});

console.log('All death phase SVGs generated successfully with Sad-Cute style!');
