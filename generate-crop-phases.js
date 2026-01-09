const fs = require('fs');
const path = require('path');

// Crop data with growth characteristics
const crops = {
  'corn': { color: '#FFD700', height: 'tall', shape: 'stalk' },
  'potato': { color: '#8B4513', height: 'low', shape: 'round' },
  'lettuce': { color: '#90EE90', height: 'low', shape: 'spread' },
  'pumpkin': { color: '#FF8C00', height: 'low', shape: 'large' },
  'strawberry': { color: '#DC143C', height: 'low', shape: 'small' },
  'blueberry': { color: '#4169E1', height: 'low', shape: 'cluster' },
  'apple': { color: '#FF0000', height: 'medium', shape: 'round' },
  'pear': { color: '#9ACD32', height: 'medium', shape: 'pear' },
  'peach': { color: '#FFDAB9', height: 'medium', shape: 'round' },
  'cherry': { color: '#DC143C', height: 'medium', shape: 'small' },
  'grape': { color: '#800080', height: 'medium', shape: 'cluster' },
  'watermelon': { color: '#00FF00', height: 'low', shape: 'large' },
  'cabbage': { color: '#008000', height: 'low', shape: 'round' },
  'broccoli': { color: '#006400', height: 'medium', shape: 'tree' },
  'onion': { color: '#8B4513', height: 'low', shape: 'round' },
  'garlic': { color: '#F0E68C', height: 'low', shape: 'cluster' },
  'pepper': { color: '#FF0000', height: 'medium', shape: 'triangle' },
  'cucumber': { color: '#008000', height: 'low', shape: 'long' },
  'radish': { color: '#8B0000', height: 'low', shape: 'round' },
  'spinach': { color: '#228B22', height: 'low', shape: 'spread' },
  'asparagus': { color: '#32CD32', height: 'tall', shape: 'vertical' },
  'mushroom': { color: '#8B4513', height: 'low', shape: 'cap' }
};

// Generate SVG for each crop phase
function generateCropSVG(cropName, phase, cropData) {
  const { color, height, shape } = cropData;
  
  const phaseTemplates = {
    1: () => `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Phase 1: Seed -->
  <circle cx="16" cy="24" r="2" fill="#8B4513"/>
  <ellipse cx="16" cy="25" rx="1" ry="0.5" fill="#654321"/>
</svg>`,
    
    2: () => `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Phase 2: Sprout -->
  <rect x="15" y="20" width="2" height="4" fill="#90EE90"/>
  <ellipse cx="16" cy="20" rx="2" ry="1" fill="#7CFC00"/>
  <circle cx="16" cy="24" r="1" fill="${color}"/>
</svg>`,
    
    3: () => {
      let svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Phase 3: Young plant -->`;
      
      if (height === 'tall') {
        svg += `
  <rect x="15" y="12" width="2" height="12" fill="#32CD32"/>
  <ellipse cx="16" cy="12" rx="3" ry="2" fill="#90EE90"/>`;
      } else if (shape === 'tree') {
        svg += `
  <rect x="15" y="16" width="2" height="8" fill="#8B4513"/>
  <circle cx="16" cy="12" r="4" fill="#90EE90"/>`;
      } else {
        svg += `
  <rect x="15" y="16" width="2" height="8" fill="#32CD32"/>
  <ellipse cx="16" cy="16" rx="3" ry="2" fill="#90EE90"/>`;
      }
      
      svg += `
</svg>`;
      return svg;
    },
    
    4: () => {
      let svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Phase 4: Growing -->`;
      
      if (shape === 'cluster') {
        svg += `
  <rect x="15" y="12" width="2" height="12" fill="#228B22"/>
  <circle cx="12" cy="12" r="2" fill="${color}"/>
  <circle cx="20" cy="12" r="2" fill="${color}"/>
  <circle cx="16" cy="16" r="2" fill="${color}"/>`;
      } else if (shape === 'round') {
        svg += `
  <rect x="15" y="12" width="2" height="12" fill="#228B22"/>
  <circle cx="16" cy="12" r="4" fill="${color}"/>`;
      } else if (shape === 'tree') {
        svg += `
  <rect x="15" y="16" width="2" height="8" fill="#8B4513"/>
  <circle cx="16" cy="12" r="6" fill="${color}"/>`;
      } else {
        svg += `
  <rect x="15" y="12" width="2" height="12" fill="#228B22"/>
  <ellipse cx="16" cy="12" rx="4" ry="3" fill="${color}"/>`;
      }
      
      svg += `
</svg>`;
      return svg;
    },
    
    5: () => {
      let svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Phase 5: Mature -->`;
      
      if (shape === 'cluster') {
        svg += `
  <rect x="15" y="8" width="2" height="16" fill="#228B22"/>
  <circle cx="12" cy="8" r="3" fill="${color}"/>
  <circle cx="20" cy="8" r="3" fill="${color}"/>
  <circle cx="16" cy="12" r="3" fill="${color}"/>
  <circle cx="12" cy="16" r="2" fill="${color}"/>
  <circle cx="20" cy="16" r="2" fill="${color}"/>`;
      } else if (shape === 'round') {
        svg += `
  <rect x="15" y="8" width="2" height="16" fill="#228B22"/>
  <circle cx="16" cy="8" r="6" fill="${color}"/>
  <circle cx="14" cy="6" r="1" fill="#000"/>
  <circle cx="18" cy="6" r="1" fill="#000"/>`;
      } else if (shape === 'tree') {
        svg += `
  <rect x="15" y="16" width="2" height="8" fill="#8B4513"/>
  <circle cx="16" cy="8" r="8" fill="${color}"/>
  <circle cx="12" cy="8" r="3" fill="#32CD32"/>
  <circle cx="20" cy="8" r="3" fill="#32CD32"/>`;
      } else if (shape === 'cap') {
        svg += `
  <rect x="15" y="16" width="2" height="8" fill="#F5DEB3"/>
  <ellipse cx="16" cy="12" rx="8" ry="4" fill="${color}"/>
  <circle cx="12" cy="12" r="2" fill="#D2691E"/>
  <circle cx="20" cy="12" r="2" fill="#D2691E"/>`;
      } else {
        svg += `
  <rect x="15" y="8" width="2" height="16" fill="#228B22"/>
  <ellipse cx="16" cy="8" rx="6" ry="4" fill="${color}"/>`;
      }
      
      svg += `
</svg>`;
      return svg;
    }
  };
  
  return phaseTemplates[phase]();
}

// Create all crop phases
for (const cropName in crops) {
  const cropData = crops[cropName];
  
  for (let phase = 1; phase <= 5; phase++) {
    const svg = generateCropSVG(cropName, phase, cropData);
    const filePath = path.join(__dirname, 'assets', 'crops', `phase${phase}`, `${cropName}.svg`);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, svg);
    console.log(`Created: ${filePath}`);
  }
}

console.log('All crop phases generated successfully!');
