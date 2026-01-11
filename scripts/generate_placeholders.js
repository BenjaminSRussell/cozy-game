const fs = require('fs');
const path = require('path');

const ASSET_ROOT = path.join(__dirname, '../assets');

const placeholders = [
    // Animals
    { dir: 'animals', name: 'chicken', color: '#FFFFFF', text: '🐔' },
    { dir: 'animals', name: 'cow', color: '#FFFFFF', text: '🐮' },
    { dir: 'animals', name: 'sheep', color: '#FFFFFF', text: '🐑' },
    { dir: 'animals', name: 'pig', color: '#FFC0CB', text: '🐷' },

    // Goods
    { dir: 'goods', name: 'wine', color: '#800080', text: '🍷' },
    { dir: 'goods', name: 'juice', color: '#FFA500', text: '🧃' },
    { dir: 'goods', name: 'jam', color: '#DC143C', text: '🍯' },
    { dir: 'goods', name: 'pickles', color: '#006400', text: '🥒' },
    { dir: 'goods', name: 'beer', color: '#FFD700', text: '🍺' },
    { dir: 'goods', name: 'flour', color: '#F5DEB3', text: '🌾' },
    { dir: 'goods', name: 'cheese', color: '#FFD700', text: '🧀' },
    { dir: 'goods', name: 'mayonnaise', color: '#FFFFE0', text: '🥚' },
    { dir: 'goods', name: 'truffle_oil', color: '#8B4513', text: '🍄' },
    { dir: 'goods', name: 'cloth', color: '#F0F8FF', text: '🧶' },

    // Fertilizers
    { dir: 'fertilizers', name: 'speed', color: '#00FFFF', text: '⚡' },
    { dir: 'fertilizers', name: 'quality', color: '#FFD700', text: '⭐' },
    { dir: 'fertilizers', name: 'water', color: '#1E90FF', text: '💧' },

    // Automation
    { dir: 'automation', name: 'sprinkler_basic', color: '#C0C0C0', text: '🚿' },
    { dir: 'automation', name: 'sprinkler_quality', color: '#FFD700', text: '🚿' },
    { dir: 'automation', name: 'sprinkler_iridium', color: '#9400D3', text: '🚿' },
    { dir: 'automation', name: 'auto_feeder', color: '#CD853F', text: '🍖' },
    { dir: 'automation', name: 'auto_grabber', color: '#708090', text: '✋' },
    { dir: 'automation', name: 'junimo_hut', color: '#228B22', text: '🏠' },

    // Machines
    { dir: 'machines', name: 'keg', color: '#8B4513', text: '🍺' },
    { dir: 'machines', name: 'preserves', color: '#DEB887', text: '🍯' },
    { dir: 'machines', name: 'cheese_press', color: '#F5DEB3', text: '🧀' },
    { dir: 'machines', name: 'mayo', color: '#FFFFFF', text: '🏺' },
    { dir: 'machines', name: 'loom', color: '#D2691E', text: '🧵' },
    { dir: 'machines', name: 'oil_maker', color: '#8B4513', text: '🌻' },
];

placeholders.forEach(item => {
    const dirPath = path.join(ASSET_ROOT, item.dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const svgContent = `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="${item.color}" stroke="black" stroke-width="2"/>
  <text x="32" y="42" font-size="30" text-anchor="middle" font-family="Arial">${item.text}</text>
</svg>`;

    fs.writeFileSync(path.join(dirPath, `${item.name}.svg`), svgContent.trim());
    console.log(`Generated ${item.dir}/${item.name}.svg`);
});
