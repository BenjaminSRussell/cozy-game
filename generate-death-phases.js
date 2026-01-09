const fs = require('fs');
const path = require('path');

// Create death phase directory
const deathDir = path.join(__dirname, 'assets/crops/death');
if (!fs.existsSync(deathDir)) {
    fs.mkdirSync(deathDir, { recursive: true });
}

// All crop types that need death phases
const crops = [
    'wheat', 'carrot', 'tomato', 'corn', 'potato', 'lettuce', 'pumpkin',
    'strawberry', 'blueberry', 'apple', 'pear', 'peach', 'cherry', 'grape',
    'watermelon', 'cabbage', 'broccoli', 'onion', 'garlic', 'pepper',
    'cucumber', 'radish', 'spinach', 'asparagus', 'mushroom'
];

// Death phase characteristics for different crop types
const deathCharacteristics = {
    // Grains - drooping, brown, brittle
    wheat: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'wilted',
        structure: 'drooping'
    },
    
    // Root vegetables - shriveled, rot spots, cracked
    carrot: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'rot',
        structure: 'shriveled'
    },
    potato: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'rot',
        structure: 'collapsed'
    },
    radish: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'rot',
        structure: 'shriveled'
    },
    
    // Fruits - moldy, collapsed, discolored
    tomato: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'collapsed'
    },
    apple: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    pear: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    peach: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'collapsed'
    },
    cherry: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    strawberry: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'collapsed'
    },
    blueberry: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    grape: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    watermelon: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'collapsed'
    },
    
    // Vegetables - wilted, brown, blight
    lettuce: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'wilted',
        structure: 'drooping'
    },
    cabbage: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'wilted',
        structure: 'collapsed'
    },
    broccoli: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'blight',
        structure: 'drooping'
    },
    spinach: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'wilted',
        structure: 'drooping'
    },
    asparagus: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'wilted',
        structure: 'drooping'
    },
    
    // Alliums - wilted tops, discolored bulbs
    onion: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'rot',
        structure: 'shriveled'
    },
    garlic: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'rot',
        structure: 'shriveled'
    },
    
    // Fruiting vegetables - mold, collapse
    pepper: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    cucumber: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'wrinkled'
    },
    pumpkin: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'mold',
        structure: 'collapsed'
    },
    
    // Fungi - decay, discoloration
    mushroom: { 
        primaryColor: '#8B4513', 
        secondaryColor: '#654321', 
        pattern: 'decay',
        structure: 'collapsed'
    },
    
    // Corn - blight, drooping
    corn: { 
        primaryColor: '#8B7355', 
        secondaryColor: '#6B5D54', 
        pattern: 'blight',
        structure: 'drooping'
    }
};

// Generate death SVG for each crop
crops.forEach(crop => {
    const characteristics = deathCharacteristics[crop] || {
        primaryColor: '#8B4513',
        secondaryColor: '#654321',
        pattern: 'wilted',
        structure: 'drooping'
    };
    
    const svg = generateDeathSVG(crop, characteristics);
    const filePath = path.join(deathDir, `${crop}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`Generated death phase for ${crop}`);
});

function generateDeathSVG(crop, chars) {
    const patterns = {
        wilted: `
    <pattern id="wiltedPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <line x1="0" y1="4" x2="8" y2="4" stroke="#4A4A4A" stroke-width="0.5" opacity="0.6"/>
      <line x1="4" y1="0" x2="4" y2="8" stroke="#6B5D54" stroke-width="0.5" opacity="0.4"/>
    </pattern>`,
        rot: `
    <pattern id="rotPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#2F4F4F" opacity="0.6"/>
      <circle cx="4" cy="4" r="0.8" fill="#4A4A4A" opacity="0.5"/>
    </pattern>`,
        mold: `
    <pattern id="moldPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#2F4F4F" opacity="0.7"/>
      <circle cx="6" cy="6" r="1" fill="#4A4A4A" opacity="0.6"/>
      <circle cx="4" cy="4" r="0.8" fill="#696969" opacity="0.5"/>
    </pattern>`,
        blight: `
    <pattern id="blightPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <ellipse cx="3" cy="3" rx="2" ry="1" fill="#2F4F4F" opacity="0.6"/>
      <ellipse cx="7" cy="7" rx="1.5" ry="0.8" fill="#4A4A4A" opacity="0.5"/>
    </pattern>`,
        decay: `
    <pattern id="decayPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#2F4F4F" opacity="0.7"/>
      <circle cx="6" cy="6" r="0.8" fill="#4A4A4A" opacity="0.6"/>
      <circle cx="4" cy="4" r="1" fill="#696969" opacity="0.5"/>
    </pattern>`
    };
    
    const structures = {
        drooping: generateDroopingStructure(chars),
        shriveled: generateShriveledStructure(chars),
        collapsed: generateCollapsedStructure(chars),
        wrinkled: generateWrinkledStructure(chars)
    };
    
    return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Death gradient -->
    <linearGradient id="deathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${chars.primaryColor}"/>
      <stop offset="50%" stop-color="${chars.secondaryColor}"/>
      <stop offset="100%" stop-color="#4A4A4A"/>
    </linearGradient>
    ${patterns[chars.pattern] || patterns.wilted}
  </defs>
  
  ${structures[chars.structure] || structures.drooping}
  
  <!-- Cracked soil indicator -->
  <line x1="10" y1="38" x2="15" y2="38" stroke="#2F4F4F" stroke-width="0.5"/>
  <line x1="25" y1="38" x2="30" y2="38" stroke="#2F4F4F" stroke-width="0.5"/>
  <line x1="17" y1="39" x2="23" y2="39" stroke="#2F4F4F" stroke-width="0.5"/>
</svg>`;
}

function generateDroopingStructure(chars) {
    return `
  <!-- Dead stem -->
  <rect x="19" y="15" width="2" height="20" fill="url(#deathGrad)"/>
  
  <!-- Drooping elements -->
  <ellipse cx="20" cy="25" rx="4" ry="2" fill="${chars.primaryColor}" transform="rotate(-45 20 25)"/>
  <ellipse cx="20" cy="28" rx="3" ry="1.5" fill="${chars.secondaryColor}" transform="rotate(-60 20 28)"/>
  <ellipse cx="20" cy="30" rx="2" ry="1" fill="#4A4A4A" transform="rotate(-75 20 30)"/>
  
  <!-- Dead leaves -->
  <ellipse cx="18" cy="20" rx="2" ry="1" fill="${chars.primaryColor}" transform="rotate(-30 18 20)"/>
  <ellipse cx="22" cy="22" rx="2" ry="1" fill="${chars.secondaryColor}" transform="rotate(-45 22 22)"/>
  
  <!-- Pattern overlay -->
  <rect x="16" y="15" width="8" height="20" fill="url(#${chars.pattern}Pattern)" opacity="0.5"/>`;
}

function generateShriveledStructure(chars) {
    return `
  <!-- Shriveled main body -->
  <polygon points="20,8 22,20 20,32 18,20" fill="url(#deathGrad)"/>
  
  <!-- Rot patches -->
  <rect x="18" y="15" width="4" height="8" fill="url(#${chars.pattern}Pattern)" opacity="0.7"/>
  
  <!-- Dead tops -->
  <rect x="19" y="6" width="2" height="4" fill="#4A4A4A" transform="rotate(-15 20 8)"/>
  
  <!-- Cracks -->
  <line x1="20" y1="12" x2="20" y2="18" stroke="#2F4F4F" stroke-width="0.5"/>
  <line x1="18" y1="20" x2="22" y2="20" stroke="#2F4F4F" stroke-width="0.5"/>`;
}

function generateCollapsedStructure(chars) {
    return `
  <!-- Collapsed base -->
  <ellipse cx="20" cy="22" rx="6" ry="4" fill="#4A4A4A" opacity="0.8"/>
  
  <!-- Main body -->
  <circle cx="20" cy="20" r="8" fill="url(#deathGrad)"/>
  
  <!-- Pattern overlay -->
  <rect x="16" y="16" width="8" height="8" fill="url(#${chars.pattern}Pattern)" opacity="0.7"/>
  
  <!-- Dead stem -->
  <rect x="19" y="10" width="2" height="8" fill="#4A4A4A"/>
  
  <!-- Wilted leaves -->
  <ellipse cx="17" cy="11" rx="2" ry="0.8" fill="#4A4A4A" transform="rotate(-45 17 11)"/>
  <ellipse cx="23" cy="12" rx="2" ry="0.8" fill="#4A4A4A" transform="rotate(-60 23 12)"/>`;
}

function generateWrinkledStructure(chars) {
    return `
  <!-- Wrinkled main body -->
  <ellipse cx="20" cy="20" rx="7" ry="6" fill="url(#deathGrad)"/>
  
  <!-- Wrinkle lines -->
  <line x1="16" y1="18" x2="24" y2="18" stroke="#2F4F4F" stroke-width="0.5"/>
  <line x1="16" y1="22" x2="24" y2="22" stroke="#2F4F4F" stroke-width="0.5"/>
  <line x1="20" y1="16" x2="20" y2="24" stroke="#2F4F4F" stroke-width="0.5"/>
  
  <!-- Pattern overlay -->
  <rect x="16" y="16" width="8" height="8" fill="url(#${chars.pattern}Pattern)" opacity="0.7"/>
  
  <!-- Dead stem -->
  <rect x="19" y="12" width="2" height="6" fill="#4A4A4A"/>`;
}

console.log('Death phase SVGs generated successfully!');
