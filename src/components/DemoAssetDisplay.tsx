/**
 * Demo Asset Display - IMMEDIATE visual demo of all assets
 * 
 * Shows every demo asset working instantly without any loading
 * Perfect for testing and demo purposes.
 */

import React, { useEffect, useState } from 'react';
import { DemoAssets } from '../assets/DemoAssets';
import { BuildingSystem } from '../rendering/BuildingSystem';

// ============================================================================
// DEMO ASSET DISPLAY COMPONENT
// ============================================================================

export const DemoAssetDisplay: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('characters');
  const [selectedAsset, setSelectedAsset] = useState('player_idle');
  const buildingSystem = new BuildingSystem();

  const categories = [
    { id: 'characters', name: 'Characters', assets: ['player_idle', 'player_walk', 'npc_shopkeeper', 'npc_villager'] },
    { id: 'items', name: 'Items', assets: ['wood', 'stone', 'wheat', 'carrot', 'tomato', 'corn', 'diamond', 'gold'] },
    { id: 'tiles', name: 'Tiles', assets: ['grass', 'dirt', 'stone', 'water', 'path'] },
    { id: 'tools', name: 'Tools', assets: ['hoe', 'watering_can', 'axe', 'pickaxe', 'shovel', 'scythe'] },
    { id: 'buildings', name: 'Buildings', assets: ['house', 'barn', 'shed', 'windmill', 'greenhouse', 'well', 'fence', 'tower', 'bridge', 'market'] },
    { id: 'ui', name: 'UI Elements', assets: ['inventory_slot', 'button_primary', 'button_secondary', 'panel', 'icon_heart', 'icon_coin', 'icon_star'] },
  ];

  const currentCategory = categories.find(cat => cat.id === selectedCategory);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🎨 Demo Assets - INSTANT ACCESS</h2>
      <p style={{ color: '#666' }}>No loading required! All assets work immediately.</p>
      
      {/* Category Selector */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Categories:</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedCategory === category.id ? '#4169E1' : '#CCC',
                color: selectedCategory === category.id ? '#FFF' : '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      <div style={{ marginBottom: '20px' }}>
        <h3>{currentCategory?.name}:</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: '15px',
          backgroundColor: '#F5F5F5',
          padding: '15px',
          borderRadius: '8px'
        }}>
          {currentCategory?.assets.map(assetName => (
            <AssetCard 
              key={assetName}
              category={selectedCategory}
              assetName={assetName}
              isSelected={selectedAsset === assetName}
              onSelect={() => setSelectedAsset(assetName)}
            />
          ))}
        </div>
      </div>

      {/* Selected Asset Preview */}
      <div>
        <h3>Selected Asset: {selectedAsset}</h3>
        <div style={{
          backgroundColor: '#FFF',
          border: '2px solid #CCC',
          borderRadius: '8px',
          padding: '20px',
          display: 'inline-block'
        }}>
          <AssetPreview category={selectedCategory} assetName={selectedAsset} />
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <h4>Usage Code:</h4>
          <pre style={{ 
            backgroundColor: '#F0F0F0', 
            padding: '10px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto'
          }}>
{`// Import the assets
import { DemoAssets } from '../assets/DemoAssets';

// Get the asset instantly
const assetUrl = DemoAssets.getAsset('${selectedCategory}', '${selectedAsset}');

// Use in React
<img src={assetUrl} alt="${selectedAsset}" />

// Or as CSS background
<div style={{ backgroundImage: \`url(\${assetUrl})\` }} />

// Or create image element
const img = DemoAssets.createImageElement('${selectedCategory}', '${selectedAsset}');
document.body.appendChild(img);`}
          </pre>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ASSET CARD COMPONENT
// ============================================================================

interface AssetCardProps {
  category: string;
  assetName: string;
  isSelected: boolean;
  onSelect: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ category, assetName, isSelected, onSelect }) => {
  const assetUrl = DemoAssets.getAsset(category, assetName);
  const buildingSystem = new BuildingSystem();
  
  const getResourceInfo = () => {
    if (category === 'buildings') {
      return buildingSystem.getResourceString(assetName);
    }
    return '';
  };
  
  const resourceInfo = getResourceInfo();
  
  return (
    <div
      onClick={onSelect}
      style={{
        border: isSelected ? '3px solid #4169E1' : '2px solid #CCC',
        borderRadius: '8px',
        padding: '10px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#E6F3FF' : '#FFF',
        textAlign: 'center',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div style={{ 
        width: '60px', 
        height: '60px', 
        margin: '0 auto 8px',
        backgroundImage: `url(${assetUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }} />
      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{assetName}</div>
      <div style={{ fontSize: '10px', color: '#666' }}>{category}</div>
      {resourceInfo && (
        <div style={{ 
          fontSize: '9px', 
          color: '#8B4513', 
          marginTop: '4px',
          fontWeight: 'bold'
        }}>
          {resourceInfo}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ASSET PREVIEW COMPONENT
// ============================================================================

interface AssetPreviewProps {
  category: string;
  assetName: string;
}

const AssetPreview: React.FC<AssetPreviewProps> = ({ category, assetName }) => {
  const assetUrl = DemoAssets.getAsset(category, assetName);
  const buildingSystem = new BuildingSystem();
  
  // Determine preview size based on category
  const getPreviewSize = () => {
    switch (category) {
      case 'characters': return { width: 64, height: 96 };
      case 'tiles': return { width: 80, height: 80 };
      case 'buildings': return { width: 128, height: 128 };
      case 'ui': return { width: 120, height: 60 };
      default: return { width: 48, height: 48 };
    }
  };

  const size = getPreviewSize();
  
  const getResourceInfo = () => {
    if (category === 'buildings') {
      return buildingSystem.getResourceString(assetName);
    }
    return '';
  };
  
  const resourceInfo = getResourceInfo();

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: size.width,
        height: size.height,
        margin: '0 auto',
        backgroundImage: `url(${assetUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        border: '1px dashed #CCC'
      }} />
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        {size.width}x{size.height}px
      </div>
      {resourceInfo && (
        <div style={{ 
          marginTop: '10px', 
          fontSize: '14px', 
          color: '#8B4513',
          fontWeight: 'bold',
          backgroundColor: '#FFF8DC',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #DEB887'
        }}>
          Requirements: {resourceInfo}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// QUICK DEMO COMPONENT - Minimal usage example
// ============================================================================

export const QuickDemo: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h3>🚀 Quick Demo - All Assets Working</h3>
      
      {/* Character Demo */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Characters:</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <img src={DemoAssets.getAsset('character', 'player_idle')} alt="Player" style={{ width: 32, height: 48 }} />
          <img src={DemoAssets.getAsset('character', 'npc_shopkeeper')} alt="Shopkeeper" style={{ width: 32, height: 48 }} />
          <img src={DemoAssets.getAsset('character', 'npc_villager')} alt="Villager" style={{ width: 32, height: 48 }} />
        </div>
      </div>

      {/* Items Demo */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Items:</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <img src={DemoAssets.getAsset('item', 'wood')} alt="Wood" style={{ width: 24, height: 24 }} />
          <img src={DemoAssets.getAsset('item', 'stone')} alt="Stone" style={{ width: 24, height: 24 }} />
          <img src={DemoAssets.getAsset('item', 'wheat')} alt="Wheat" style={{ width: 24, height: 24 }} />
          <img src={DemoAssets.getAsset('item', 'diamond')} alt="Diamond" style={{ width: 24, height: 24 }} />
        </div>
      </div>

      {/* Tools Demo */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Tools:</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <img src={DemoAssets.getAsset('tool', 'hoe')} alt="Hoe" style={{ width: 24, height: 24 }} />
          <img src={DemoAssets.getAsset('tool', 'watering_can')} alt="Watering Can" style={{ width: 24, height: 24 }} />
          <img src={DemoAssets.getAsset('tool', 'axe')} alt="Axe" style={{ width: 24, height: 24 }} />
        </div>
      </div>

      {/* Tiles Demo */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Tiles:</h4>
        <div style={{ display: 'flex', gap: '2px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <img 
              key={i} 
              src={DemoAssets.getAsset('tile', ['grass', 'dirt', 'stone', 'water'][i % 4])} 
              alt="Tile" 
              style={{ width: 16, height: 16 }} 
            />
          ))}
        </div>
      </div>

      {/* Buildings Demo */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Buildings:</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <img src={DemoAssets.getAsset('building', 'house')} alt="House" style={{ width: 64, height: 64 }} />
          <img src={DemoAssets.getAsset('building', 'barn')} alt="Barn" style={{ width: 64, height: 64 }} />
          <img src={DemoAssets.getAsset('building', 'windmill')} alt="Windmill" style={{ width: 64, height: 64 }} />
          <img src={DemoAssets.getAsset('building', 'market')} alt="Market" style={{ width: 64, height: 64 }} />
        </div>
      </div>

      {/* UI Demo */}
      <div style={{ marginBottom: '20px' }}>
        <h4>UI Elements:</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <img src={DemoAssets.getAsset('ui', 'inventory_slot')} alt="Slot" style={{ width: 32, height: 32 }} />
          <img src={DemoAssets.getAsset('ui', 'icon_coin')} alt="Coin" style={{ width: 16, height: 16 }} />
          <img src={DemoAssets.getAsset('ui', 'icon_heart')} alt="Heart" style={{ width: 16, height: 16 }} />
          <img src={DemoAssets.getAsset('ui', 'button_primary')} alt="Button" style={{ width: 64, height: 24 }} />
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#E8F5E8', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <strong>✅ All assets loaded instantly!</strong> No waiting, no loading screens.
      </div>
    </div>
  );
};

// ============================================================================
// INTEGRATION EXAMPLE - How to use in your game
// ============================================================================

export const IntegrationExample: React.FC = () => {
  // Example: Create inventory display
  const inventoryItems = [
    { id: 'wood', quantity: 10 },
    { id: 'stone', quantity: 5 },
    { id: 'wheat', quantity: 3 },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h3>🎮 Game Integration Example</h3>
      
      {/* Inventory Display */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Inventory:</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          {inventoryItems.map(item => (
            <div key={item.id} style={{ 
              border: '2px solid #CCC', 
              borderRadius: '4px',
              padding: '5px',
              textAlign: 'center',
              backgroundColor: '#FFF'
            }}>
              <img 
                src={DemoAssets.getAsset('item', item.id)} 
                alt={item.id} 
                style={{ width: 24, height: 24, display: 'block' }}
              />
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>×{item.quantity}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tool Bar */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Tools:</h4>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['hoe', 'watering_can', 'axe', 'pickaxe'].map(tool => (
            <button
              key={tool}
              style={{
                width: 40,
                height: 40,
                border: '2px solid #CCC',
                borderRadius: '4px',
                backgroundColor: '#FFF',
                backgroundImage: `url(${DemoAssets.getAsset('tool', tool)})`,
                backgroundSize: '24px 24px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                cursor: 'pointer'
              }}
              title={tool}
            />
          ))}
        </div>
      </div>

      {/* Mini Map */}
      <div>
        <h4>Mini Map:</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(10, 16px)', 
          gap: '1px',
          backgroundColor: '#CCC',
          padding: '1px',
          borderRadius: '4px'
        }}>
          {Array.from({ length: 50 }).map((_, i) => {
            const tileTypes = ['grass', 'dirt', 'stone', 'water'];
            const tileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
            return (
              <img
                key={i}
                src={DemoAssets.getAsset('tile', tileType)}
                alt={tileType}
                style={{ width: 16, height: 16 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DemoAssetDisplay;
