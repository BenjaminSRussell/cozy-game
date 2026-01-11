/**
 * Demo Assets - IMMEDIATE placeholder assets for demo
 * 
 * Simple SVG/Canvas-based assets that work instantly without loading
 * Perfect for demo and testing before real assets are ready.
 */

// ============================================================================
// IMMEDIATE DEMO ASSETS - NO LOADING REQUIRED
// ============================================================================

export class DemoAssets {

  // Generate simple SVG assets as data URLs (instant, no loading)
  static getAsset(type: string, name: string): string {
    switch (type) {
      case 'character':
        return this.getCharacterAsset(name);
      case 'item':
        return this.getItemAsset(name);
      case 'tile':
        return this.getTileAsset(name);
      case 'ui':
        return this.getUIAsset(name);
      case 'tool':
        return this.getToolAsset(name);
      case 'building':
        return this.getBuildingAsset(name);
      case 'weather':
        return this.getWeatherAsset(name);
      case 'dam':
        return this.getDamAsset(name);
      case 'mining':
        return this.getMiningAsset(name);
      case 'crop':
        return this.getCropAsset(name);
      default:
        return this.getPlaceholderAsset(name);
    }
  }

  // ============================================================================
  // CHARACTER ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getCharacterAsset(name: string): string {
    const characters: Record<string, string> = {
      'player_idle': this.createPlayerIdle(),
      'player_walk': this.createPlayerWalk(),
      'npc_shopkeeper': this.createShopkeeper(),
      'npc_villager': this.createVillager(),
    };
    return characters[name] || this.createPlaceholderCharacter();
  }

  static createPlayerIdle(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="skinGrad">
            <stop offset="0%" stop-color="#FDBCB4"/>
            <stop offset="100%" stop-color="#F5DEB3"/>
          </radialGradient>
        </defs>
        <!-- Body -->
        <rect x="8" y="20" width="16" height="20" fill="#8B4513" rx="2"/>
        <!-- Head -->
        <circle cx="16" cy="12" r="8" fill="url(#skinGrad)"/>
        <!-- Eyes -->
        <circle cx="12" cy="10" r="1.5" fill="#000"/>
        <circle cx="20" cy="10" r="1.5" fill="#000"/>
        <circle cx="12.5" cy="9.5" r="0.5" fill="#FFF"/>
        <circle cx="20.5" cy="9.5" r="0.5" fill="#FFF"/>
        <!-- Hair -->
        <rect x="10" y="6" width="12" height="4" fill="#654321" rx="1"/>
        <rect x="8" y="7" width="3" height="2" fill="#654321" rx="0.5"/>
        <rect x="21" y="7" width="3" height="2" fill="#654321" rx="0.5"/>
        <!-- Clothes -->
        <rect x="10" y="24" width="12" height="2" fill="#FF6B6B"/>
        <rect x="12" y="26" width="8" height="1" fill="#FF5252"/>
        <!-- Smile -->
        <path d="M 12 14 Q 16 16 20 14" stroke="#000" stroke-width="0.5" fill="none"/>
      </svg>
    `)}`;
  }

  static createPlayerWalk(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="48" xmlns="http://www.w3.org/2000/svg">
        <!-- Body (walking pose) -->
        <rect x="8" y="20" width="16" height="20" fill="#8B4513" rx="2"/>
        <!-- Head -->
        <circle cx="16" cy="12" r="8" fill="#FDBCB4"/>
        <!-- Eyes -->
        <circle cx="12" cy="10" r="1" fill="#000"/>
        <circle cx="20" cy="10" r="1" fill="#000"/>
        <!-- Hair -->
        <rect x="10" y="6" width="12" height="4" fill="#8B4513" rx="1"/>
        <!-- Walking legs -->
        <rect x="10" y="38" width="4" height="8" fill="#654321"/>
        <rect x="18" y="38" width="4" height="8" fill="#654321"/>
        <!-- Clothes -->
        <rect x="10" y="24" width="12" height="2" fill="#FF6B6B"/>
      </svg>
    `)}`;
  }

  static createShopkeeper(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="48" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <rect x="8" y="20" width="16" height="20" fill="#4169E1" rx="2"/>
        <!-- Head -->
        <circle cx="16" cy="12" r="8" fill="#FDBCB4"/>
        <!-- Eyes -->
        <circle cx="12" cy="10" r="1" fill="#000"/>
        <circle cx="20" cy="10" r="1" fill="#000"/>
        <!-- Mustache -->
        <rect x="10" y="14" width="12" height="2" fill="#8B4513" rx="1"/>
        <!-- Apron -->
        <rect x="10" y="24" width="12" height="8" fill="#FFF" stroke="#000" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createVillager(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="48" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <rect x="8" y="20" width="16" height="20" fill="#90EE90" rx="2"/>
        <!-- Head -->
        <circle cx="16" cy="12" r="8" fill="#FDBCB4"/>
        <!-- Eyes -->
        <circle cx="12" cy="10" r="1" fill="#000"/>
        <circle cx="20" cy="10" r="1" fill="#000"/>
        <!-- Hair -->
        <rect x="8" y="6" width="16" height="6" fill="#FFD700" rx="2"/>
        <!-- Smile -->
        <path d="M 12 14 Q 16 16 20 14" stroke="#000" stroke-width="0.5" fill="none"/>
      </svg>
    `)}`;
  }

  // ============================================================================
  // ITEM ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getItemAsset(name: string): string {
    const items: Record<string, string> = {
      'wood': this.createWoodItem(),
      'stone': this.createStoneItem(),
      'wheat': this.createWheatItem(),
      'carrot': this.createCarrotItem(),
      'tomato': this.createTomatoItem(),
      'corn': this.createCornItem(),
      'diamond': this.createDiamondItem(),
      'gold': this.createGoldItem(),
    };
    return items[name] || this.createPlaceholderItem();
  }

  static createWoodItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="50%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#8B4513"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="12" height="12" fill="url(#woodGrad)" rx="1"/>
        <rect x="4" y="4" width="8" height="2" fill="#654321" opacity="0.8"/>
        <rect x="4" y="8" width="8" height="2" fill="#654321" opacity="0.7"/>
        <line x1="3" y1="6" x2="13" y2="6" stroke="#704214" stroke-width="0.5" opacity="0.6"/>
        <line x1="3" y1="10" x2="13" y2="10" stroke="#704214" stroke-width="0.5" opacity="0.5"/>
        <circle cx="5" cy="5" r="0.3" fill="#8B4513" opacity="0.4"/>
      </svg>
    `)}`;
  }

  static createStoneItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="stoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#808080"/>
            <stop offset="50%" stop-color="#A9A9A9"/>
            <stop offset="100%" stop-color="#696969"/>
          </linearGradient>
        </defs>
        <polygon points="8,2 14,8 8,14 2,8" fill="url(#stoneGrad)"/>
        <polygon points="8,4 12,8 8,12 4,8" fill="#C0C0C0" opacity="0.7"/>
        <circle cx="6" cy="6" r="0.5" fill="#D3D3D3" opacity="0.8"/>
        <circle cx="10" cy="10" r="0.3" fill="#F5F5F5" opacity="0.6"/>
      </svg>
    `)}`;
  }

  static createWheatItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="wheatGrad">
            <stop offset="0%" stop-color="#FFD700"/>
            <stop offset="100%" stop-color="#DAA520"/>
          </radialGradient>
        </defs>
        <rect x="7" y="8" width="2" height="8" fill="#8B4513"/>
        <ellipse cx="8" cy="6" rx="4" ry="2" fill="url(#wheatGrad)"/>
        <ellipse cx="8" cy="4" rx="3" ry="1.5" fill="#FFA500" opacity="0.8"/>
        <ellipse cx="8" cy="2" rx="2" ry="1" fill="#FFD700" opacity="0.9"/>
        <line x1="6" y1="5" x2="10" y2="5" stroke="#DAA520" stroke-width="0.5"/>
        <line x1="6" y1="3" x2="10" y2="3" stroke="#FFD700" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createCarrotItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="carrotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FF8C00"/>
            <stop offset="100%" stop-color="#FF6347"/>
          </linearGradient>
        </defs>
        <polygon points="8,2 10,8 8,14 6,8" fill="url(#carrotGrad)"/>
        <rect x="7" y="2" width="2" height="2" fill="#228B22"/>
        <rect x="6" y="1" width="4" height="1" fill="#32CD32" opacity="0.8"/>
        <line x1="7" y1="4" x2="9" y2="4" stroke="#FF7F50" stroke-width="0.5"/>
        <line x1="7" y1="6" x2="9" y2="6" stroke="#FF7F50" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createTomatoItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="tomatoGrad">
            <stop offset="0%" stop-color="#FF6347"/>
            <stop offset="70%" stop-color="#DC143C"/>
            <stop offset="100%" stop-color="#8B0000"/>
          </radialGradient>
        </defs>
        <circle cx="8" cy="8" r="6" fill="url(#tomatoGrad)"/>
        <circle cx="6" cy="6" r="1" fill="#FFA500" opacity="0.7"/>
        <circle cx="10" cy="7" r="0.8" fill="#FFA500" opacity="0.6"/>
        <rect x="7" y="2" width="2" height="2" fill="#228B22"/>
        <rect x="6" y="1" width="4" height="1" fill="#32CD32" opacity="0.8"/>
        <circle cx="7" cy="9" r="0.3" fill="#FFF" opacity="0.4"/>
      </svg>
    `)}`;
  }

  static createCornItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="8" cy="8" rx="4" ry="6" fill="#FFD700"/>
        <rect x="6" y="2" width="4" height="2" fill="#228B22"/>
        <rect x="7" y="10" width="2" height="4" fill="#8B4513"/>
      </svg>
    `)}`;
  }

  static createDiamondItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E0FFFF"/>
            <stop offset="50%" stop-color="#87CEEB"/>
            <stop offset="100%" stop-color="#4682B4"/>
          </linearGradient>
        </defs>
        <polygon points="8,2 12,6 8,14 4,6" fill="url(#diamondGrad)"/>
        <polygon points="8,4 10,6 8,10 6,6" fill="#ADD8E6" opacity="0.8"/>
        <polygon points="8,6 9,7 8,9 7,7" fill="#FFF" opacity="0.9"/>
        <circle cx="7" cy="5" r="0.3" fill="#FFF" opacity="0.7"/>
        <circle cx="9" cy="8" r="0.2" fill="#FFF" opacity="0.6"/>
      </svg>
    `)}`;
  }

  static createGoldItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <polygon points="8,2 12,6 8,14 4,6" fill="#FFD700"/>
        <polygon points="8,4 10,6 8,10 6,6" fill="#FFA500"/>
        <polygon points="8,6 9,7 8,9 7,7" fill="#FFF" opacity="0.4"/>
      </svg>
    `)}`;
  }

  // ============================================================================
  // TILE ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getTileAsset(name: string): string {
    const tiles: Record<string, string> = {
      'grass': this.createGrassTile(),
      'grass_variant1': this.createGrassTileVariant1(),
      'grass_variant2': this.createGrassTileVariant2(),
      'dirt': this.createDirtTile(),
      'dirt_variant1': this.createDirtTileVariant1(),
      'stone': this.createStoneTile(),
      'water': this.createWaterTile(),
      'path': this.createPathTile(),
    };
    return tiles[name] || this.createPlaceholderTile();
  }

  static createGrassTile(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grassGrad">
            <stop offset="0%" stop-color="#98D982"/>
            <stop offset="100%" stop-color="#7CB342"/>
          </radialGradient>
        </defs>
        <rect width="16" height="16" fill="url(#grassGrad)"/>
        <rect x="2" y="2" width="2" height="2" fill="#6B8E23" opacity="0.7"/>
        <rect x="8" y="4" width="2" height="2" fill="#556B2F" opacity="0.6"/>
        <rect x="12" y="8" width="2" height="2" fill="#6B8E23" opacity="0.8"/>
        <rect x="4" y="10" width="2" height="2" fill="#556B2F" opacity="0.5"/>
        <circle cx="6" cy="6" r="0.5" fill="#90EE90" opacity="0.4"/>
        <circle cx="14" cy="3" r="0.5" fill="#7CFC00" opacity="0.3"/>
      </svg>
    `)}`;
  }

  static createDirtTile(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="dirtGrad">
            <stop offset="0%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#8B4513"/>
          </radialGradient>
        </defs>
        <rect width="16" height="16" fill="url(#dirtGrad)"/>
        <rect x="2" y="2" width="3" height="1" fill="#654321" opacity="0.8"/>
        <rect x="8" y="4" width="2" height="1" fill="#704214" opacity="0.7"/>
        <rect x="11" y="8" width="3" height="1" fill="#654321" opacity="0.6"/>
        <rect x="4" y="12" width="2" height="1" fill="#704214" opacity="0.9"/>
        <circle cx="13" cy="13" r="0.5" fill="#8B4513" opacity="0.4"/>
        <circle cx="3" cy="7" r="0.3" fill="#654321" opacity="0.5"/>
      </svg>
    `)}`;
  }

  static createStoneTile(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#808080"/>
        <rect x="2" y="2" width="4" height="4" fill="#696969"/>
        <rect x="8" y="8" width="4" height="4" fill="#696969"/>
        <rect x="12" y="2" width="2" height="2" fill="#A9A9A9"/>
        <rect x="2" y="12" width="2" height="2" fill="#A9A9A9"/>
      </svg>
    `)}`;
  }

  static createWaterTile(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4682B4"/>
            <stop offset="50%" stop-color="#5F9EA0"/>
            <stop offset="100%" stop-color="#4682B4"/>
          </linearGradient>
        </defs>
        <rect width="16" height="16" fill="url(#waterGrad)"/>
        <rect x="0" y="4" width="16" height="2" fill="#87CEEB" opacity="0.4"/>
        <rect x="0" y="10" width="16" height="2" fill="#87CEEB" opacity="0.3"/>
        <circle cx="4" cy="6" r="1" fill="#B0E0E6" opacity="0.5"/>
        <circle cx="12" cy="12" r="1" fill="#B0E0E6" opacity="0.4"/>
        <circle cx="8" cy="3" r="0.5" fill="#FFFFFF" opacity="0.6"/>
        <circle cx="2" cy="14" r="0.5" fill="#FFFFFF" opacity="0.5"/>
      </svg>
    `)}`;
  }

  static createGrassTileVariant1(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grassGrad1">
            <stop offset="0%" stop-color="#7CFC00"/>
            <stop offset="100%" stop-color="#6B8E23"/>
          </radialGradient>
        </defs>
        <rect width="16" height="16" fill="url(#grassGrad1)"/>
        <rect x="1" y="3" width="2" height="2" fill="#556B2F" opacity="0.6"/>
        <rect x="7" y="1" width="2" height="2" fill="#6B8E23" opacity="0.7"/>
        <rect x="11" y="6" width="2" height="2" fill="#556B2F" opacity="0.8"/>
        <rect x="3" y="11" width="2" height="2" fill="#6B8E23" opacity="0.5"/>
        <circle cx="9" cy="8" r="0.5" fill="#90EE90" opacity="0.4"/>
        <circle cx="13" cy="13" r="0.5" fill="#7CFC00" opacity="0.3"/>
      </svg>
    `)}`;
  }

  static createGrassTileVariant2(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grassGrad2">
            <stop offset="0%" stop-color="#ADFF2F"/>
            <stop offset="100%" stop-color="#556B2F"/>
          </radialGradient>
        </defs>
        <rect width="16" height="16" fill="url(#grassGrad2)"/>
        <rect x="3" y="1" width="2" height="2" fill="#6B8E23" opacity="0.7"/>
        <rect x="9" y="3" width="2" height="2" fill="#556B2F" opacity="0.6"/>
        <rect x="13" y="9" width="2" height="2" fill="#6B8E23" opacity="0.8"/>
        <rect x="5" y="12" width="2" height="2" fill="#556B2F" opacity="0.5"/>
        <circle cx="7" cy="7" r="0.5" fill="#98FB98" opacity="0.4"/>
        <circle cx="11" cy="2" r="0.5" fill="#90EE90" opacity="0.3"/>
      </svg>
    `)}`;
  }

  static createDirtTileVariant1(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="dirtGrad1">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="100%" stop-color="#654321"/>
          </radialGradient>
        </defs>
        <rect width="16" height="16" fill="url(#dirtGrad1)"/>
        <rect x="1" y="3" width="3" height="1" fill="#704214" opacity="0.8"/>
        <rect x="7" y="1" width="2" height="1" fill="#654321" opacity="0.7"/>
        <rect x="12" y="6" width="3" height="1" fill="#704214" opacity="0.6"/>
        <rect x="3" y="11" width="2" height="1" fill="#654321" opacity="0.9"/>
        <circle cx="14" cy="14" r="0.5" fill="#8B4513" opacity="0.4"/>
        <circle cx="2" cy="8" r="0.3" fill="#704214" opacity="0.5"/>
      </svg>
    `)}`;
  }

  static createPathTile(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#D2691E"/>
            <stop offset="50%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#8B4513"/>
          </linearGradient>
        </defs>
        <rect width="16" height="16" fill="url(#pathGrad)"/>
        <rect x="2" y="2" width="12" height="12" fill="#8B4513" opacity="0.8"/>
        <rect x="4" y="4" width="8" height="8" fill="#A0522D" opacity="0.9"/>
        <rect x="6" y="6" width="4" height="4" fill="#D2691E" opacity="0.7"/>
        <circle cx="5" cy="5" r="0.5" fill="#654321" opacity="0.4"/>
        <circle cx="11" cy="11" r="0.5" fill="#654321" opacity="0.3"/>
      </svg>
    `)}`;
  }

  // ============================================================================
  // TOOL ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getToolAsset(name: string): string {
    const tools: Record<string, string> = {
      'hoe': this.createHoeTool(),
      'watering_can': this.createWateringCanTool(),
      'axe': this.createAxeTool(),
      'pickaxe': this.createPickaxeTool(),
      'shovel': this.createShovelTool(),
      'scythe': this.createScytheTool(),
      'rake': this.createRakeTool(),
      'snow_shovel': this.createSnowShovelTool(),
      'lawn_mower_basic': this.createBasicLawnMower(),
      'lawn_mower_pro': this.createProLawnMower(),
      'lawn_mower_riding': this.createRidingLawnMower(),
    };
    return tools[name] || this.createPlaceholderTool();
  }

  static createHoeTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="4" height="12" fill="#8B4513"/>
        <rect x="2" y="2" width="12" height="4" fill="#696969"/>
        <rect x="4" y="4" width="8" height="1" fill="#808080"/>
      </svg>
    `)}`;
  }

  static createWateringCanTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="8" cy="8" rx="6" ry="4" fill="#4682B4"/>
        <rect x="6" y="4" width="4" height="6" fill="#5F9EA0"/>
        <rect x="10" y="6" width="4" height="2" fill="#696969"/>
        <rect x="14" y="7" width="2" height="1" fill="#4682B4"/>
      </svg>
    `)}`;
  }

  static createAxeTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="4" height="12" fill="#8B4513"/>
        <polygon points="8,2 12,6 8,8 4,6" fill="#696969"/>
        <polygon points="8,4 10,6 8,7 6,6" fill="#808080"/>
      </svg>
    `)}`;
  }

  static createPickaxeTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="4" height="12" fill="#8B4513"/>
        <polygon points="8,2 12,4 8,6 4,4" fill="#696969"/>
        <polygon points="8,6 12,8 8,10 4,8" fill="#696969"/>
      </svg>
    `)}`;
  }

  static createShovelTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="4" height="12" fill="#8B4513"/>
        <ellipse cx="8" cy="2" rx="4" ry="2" fill="#696969"/>
        <rect x="7" y="12" width="2" height="2" fill="#654321"/>
      </svg>
    `)}`;
  }

  static createScytheTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="4" height="12" fill="#8B4513"/>
        <path d="M 10 2 Q 14 6 10 10" stroke="#696969" stroke-width="2" fill="none"/>
        <path d="M 10 4 Q 12 6 10 8" stroke="#808080" stroke-width="1" fill="none"/>
      </svg>
    `)}`;
  }

  static createRakeTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rakeHandleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="50%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#654321"/>
          </linearGradient>
        </defs>
        <!-- Handle -->
        <rect x="7" y="2" width="2" height="12" fill="url(#rakeHandleGrad)" rx="1"/>
        <!-- Rake head -->
        <rect x="3" y="12" width="10" height="2" fill="#696969" rx="1"/>
        <!-- Tines -->
        <rect x="4" y="14" width="1" height="2" fill="#696969"/>
        <rect x="6" y="14" width="1" height="2" fill="#696969"/>
        <rect x="8" y="14" width="1" height="2" fill="#696969"/>
        <rect x="10" y="14" width="1" height="2" fill="#696969"/>
        <rect x="12" y="14" width="1" height="2" fill="#696969"/>
        <!-- Handle grip -->
        <rect x="6" y="2" width="4" height="2" fill="#654321" rx="1"/>
      </svg>
    `)}`;
  }

  static createSnowShovelTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shovelHandleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="50%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#654321"/>
          </linearGradient>
          <linearGradient id="shovelBladeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#C0C0C0"/>
            <stop offset="50%" stop-color="#808080"/>
            <stop offset="100%" stop-color="#696969"/>
          </linearGradient>
        </defs>
        <!-- Handle -->
        <rect x="7" y="2" width="2" height="8" fill="url(#shovelHandleGrad)" rx="1"/>
        <!-- D-grip -->
        <rect x="5" y="2" width="6" height="3" fill="#654321" rx="2"/>
        <rect x="6" y="3" width="4" height="1" fill="#8B4513" rx="0.5"/>
        <!-- Shovel blade -->
        <path d="M 4 10 L 12 10 L 10 15 L 6 15 Z" fill="url(#shovelBladeGrad)"/>
        <!-- Blade edge -->
        <rect x="6" y="14.5" width="4" height="0.5" fill="#4B4B4B"/>
        <!-- Metal shine -->
        <rect x="6" y="11" width="4" height="2" fill="#E5E5E5" opacity="0.4"/>
      </svg>
    `)}`;
  }

  static createBasicLawnMower(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mowerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#DC143C"/>
            <stop offset="100%" stop-color="#8B0000"/>
          </linearGradient>
        </defs>
        <!-- Mower body -->
        <rect x="4" y="8" width="16" height="8" fill="url(#mowerGrad)" rx="2"/>
        <!-- Handle -->
        <rect x="2" y="4" width="2" height="12" fill="#696969" rx="1"/>
        <rect x="2" y="2" width="8" height="2" fill="#808080" rx="1"/>
        <!-- Wheels -->
        <circle cx="7" cy="16" r="2" fill="#2F4F4F"/>
        <circle cx="17" cy="16" r="2" fill="#2F4F4F"/>
        <circle cx="7" cy="16" r="1" fill="#696969"/>
        <circle cx="17" cy="16" r="1" fill="#696969"/>
        <!-- Motor cover -->
        <rect x="6" y="6" width="12" height="4" fill="#696969" rx="1"/>
        <rect x="8" y="7" width="8" height="2" fill="#808080" rx="0.5"/>
        <!-- Grass catcher -->
        <rect x="18" y="10" width="4" height="6" fill="#228B22" opacity="0.8" rx="1"/>
        <rect x="19" y="11" width="2" height="4" fill="#32CD32" opacity="0.6"/>
        <!-- Blade underneath -->
        <ellipse cx="12" cy="18" rx="6" ry="1" fill="#696969" opacity="0.7"/>
      </svg>
    `)}`;
  }

  static createProLawnMower(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="28" height="22" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="proMowerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FF6347"/>
            <stop offset="50%" stop-color="#DC143C"/>
            <stop offset="100%" stop-color="#8B0000"/>
          </linearGradient>
          <radialGradient id="proWheelGrad">
            <stop offset="0%" stop-color="#696969"/>
            <stop offset="100%" stop-color="#2F4F4F"/>
          </radialGradient>
        </defs>
        <!-- Professional mower body -->
        <rect x="4" y="10" width="20" height="10" fill="url(#proMowerGrad)" rx="3"/>
        <!-- Enhanced handle -->
        <rect x="2" y="4" width="3" height="14" fill="#696969" rx="1.5"/>
        <rect x="1" y="2" width="10" height="3" fill="#808080" rx="1.5"/>
        <rect x="0" y="3" width="2" height="2" fill="#A9A9A9" rx="1"/>
        <rect x="10" y="3" width="2" height="2" fill="#A9A9A9" rx="1"/>
        <!-- Large wheels -->
        <circle cx="8" cy="20" r="3" fill="url(#proWheelGrad)"/>
        <circle cx="20" cy="20" r="3" fill="url(#proWheelGrad)"/>
        <circle cx="8" cy="20" r="1.5" fill="#A9A9A9"/>
        <circle cx="20" cy="20" r="1.5" fill="#A9A9A9"/>
        <!-- Wheel spokes -->
        <line x1="8" y1="17" x2="8" y2="23" stroke="#696969" stroke-width="1"/>
        <line x1="5" y1="20" x2="11" y2="20" stroke="#696969" stroke-width="1"/>
        <line x1="20" y1="17" x2="20" y2="23" stroke="#696969" stroke-width="1"/>
        <line x1="17" y1="20" x2="23" y2="20" stroke="#696969" stroke-width="1"/>
        <!-- Engine housing -->
        <rect x="7" y="7" width="14" height="5" fill="#696969" rx="2"/>
        <rect x="9" y="8" width="10" height="3" fill="#808080" rx="1"/>
        <!-- Air vents -->
        <rect x="10" y="8.5" width="1" height="2" fill="#2F4F4F"/>
        <rect x="12" y="8.5" width="1" height="2" fill="#2F4F4F"/>
        <rect x="14" y="8.5" width="1" height="2" fill="#2F4F4F"/>
        <rect x="16" y="8.5" width="1" height="2" fill="#2F4F4F"/>
        <!-- Grass bag -->
        <rect x="22" y="12" width="5" height="8" fill="#228B22" opacity="0.9" rx="2"/>
        <rect x="23" y="13" width="3" height="6" fill="#32CD32" opacity="0.7" rx="1"/>
        <!-- Bag handle -->
        <rect x="24" y="11" width="1" height="2" fill="#696969"/>
        <!-- Professional blade system -->
        <ellipse cx="14" cy="22" rx="8" ry="1.5" fill="#696969" opacity="0.8"/>
        <ellipse cx="14" cy="22" rx="6" ry="1" fill="#808080" opacity="0.6"/>
        <!-- Brand logo -->
        <circle cx="14" cy="9" r="1.5" fill="#FFD700" opacity="0.8"/>
        <text x="14" y="9.5" text-anchor="middle" fill="#8B0000" font-size="1.5" font-weight="bold">P</text>
      </svg>
    `)}`;
  }

  static createRidingLawnMower(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="48" height="32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ridingMowerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#228B22"/>
            <stop offset="50%" stop-color="#32CD32"/>
            <stop offset="100%" stop-color="#006400"/>
          </linearGradient>
          <radialGradient id="ridingWheelGrad">
            <stop offset="0%" stop-color="#696969"/>
            <stop offset="50%" stop-color="#4B4B4B"/>
            <stop offset="100%" stop-color="#2F4F4F"/>
          </radialGradient>
        </defs>
        <!-- Main body -->
        <rect x="8" y="16" width="32" height="12" fill="url(#ridingMowerGrad)" rx="4"/>
        <!-- Seat -->
        <rect x="28" y="12" width="12" height="8" fill="#8B4513" rx="2"/>
        <rect x="30" y="13" width="8" height="6" fill="#A0522D" rx="1"/>
        <!-- Seat back -->
        <rect x="38" y="8" width="2" height="8" fill="#654321" rx="1"/>
        <!-- Steering wheel -->
        <circle cx="34" cy="10" r="3" fill="#696969" stroke="#2F4F4F" stroke-width="1"/>
        <circle cx="34" cy="10" r="2" fill="#808080"/>
        <circle cx="34" cy="10" r="0.5" fill="#A9A9A9"/>
        <!-- Steering column -->
        <rect x="33.5" y="12" width="1" height="4" fill="#696969"/>
        <!-- Hood/engine cover -->
        <rect x="8" y="12" width="18" height="6" fill="#696969" rx="3"/>
        <rect x="10" y="13" width="14" height="4" fill="#808080" rx="2"/>
        <!-- Grill -->
        <rect x="8" y="14" width="3" height="2" fill="#2F4F4F"/>
        <rect x="8" y="14.5" width="3" height="0.3" fill="#696969"/>
        <rect x="8" y="15.2" width="3" height="0.3" fill="#696969"/>
        <!-- Headlights -->
        <circle cx="6" cy="18" r="1.5" fill="#FFFFE0" opacity="0.9"/>
        <circle cx="6" cy="18" r="1" fill="#FFFF00" opacity="0.8"/>
        <!-- Large rear wheels -->
        <circle cx="14" cy="28" r="4" fill="url(#ridingWheelGrad)"/>
        <circle cx="34" cy="28" r="4" fill="url(#ridingWheelGrad)"/>
        <circle cx="14" cy="28" r="2" fill="#A9A9A9"/>
        <circle cx="34" cy="28" r="2" fill="#A9A9A9"/>
        <!-- Wheel treads -->
        <line x1="14" y1="24" x2="14" y2="32" stroke="#696969" stroke-width="2"/>
        <line x1="10" y1="28" x2="18" y2="28" stroke="#696969" stroke-width="2"/>
        <line x1="34" y1="24" x2="34" y2="32" stroke="#696969" stroke-width="2"/>
        <line x1="30" y1="28" x2="38" y2="28" stroke="#696969" stroke-width="2"/>
        <!-- Front wheels (smaller) -->
        <circle cx="8" cy="28" r="2.5" fill="url(#ridingWheelGrad)"/>
        <circle cx="40" cy="28" r="2.5" fill="url(#ridingWheelGrad)"/>
        <circle cx="8" cy="28" r="1.2" fill="#A9A9A9"/>
        <circle cx="40" cy="28" r="1.2" fill="#A9A9A9"/>
        <!-- Mowing deck underneath -->
        <rect x="6" y="26" width="36" height="4" fill="#696969" opacity="0.8" rx="2"/>
        <rect x="8" y="27" width="32" height="2" fill="#808080" opacity="0.6" rx="1"/>
        <!-- Blade housing -->
        <ellipse cx="24" cy="30" rx="12" ry="2" fill="#2F4F4F" opacity="0.7"/>
        <ellipse cx="24" cy="30" rx="8" ry="1.5" fill="#4B4B4B" opacity="0.5"/>
        <!-- Control panel -->
        <rect x="20" y="14" width="6" height="3" fill="#2F4F4F" rx="1"/>
        <circle cx="21.5" cy="15.5" r="0.5" fill="#00FF00" opacity="0.8"/>
        <circle cx="23" cy="15.5" r="0.5" fill="#FF0000" opacity="0.8"/>
        <circle cx="24.5" cy="15.5" r="0.5" fill="#FFFF00" opacity="0.8"/>
        <!-- Safety flag -->
        <rect x="44" y="4" width="1" height="12" fill="#696969"/>
        <rect x="44" y="4" width="4" height="3" fill="#FF6347" opacity="0.9"/>
        <!-- Brand logo on hood -->
        <circle cx="17" cy="15" r="2" fill="#FFD700" opacity="0.8"/>
        <text x="17" y="16" text-anchor="middle" fill="#006400" font-size="2" font-weight="bold">R</text>
      </svg>
    `)}`;
  }

  // ============================================================================
  // CROP ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getCropAsset(name: string): string {
    const crops: Record<string, string> = {
      'wheat_seed': this.createWheatSeed(),
      'wheat_sprout': this.createWheatSprout(),
      'wheat_growing': this.createWheatGrowing(),
      'wheat_mature': this.createWheatMature(),
      'carrot_seed': this.createCarrotSeed(),
      'carrot_sprout': this.createCarrotSprout(),
      'carrot_growing': this.createCarrotGrowing(),
      'carrot_mature': this.createCarrotMature(),
      'tomato_seed': this.createTomatoSeed(),
      'tomato_sprout': this.createTomatoSprout(),
      'tomato_growing': this.createTomatoGrowing(),
      'tomato_mature': this.createTomatoMature(),
      'corn_seed': this.createCornSeed(),
      'corn_sprout': this.createCornSprout(),
      'corn_growing': this.createCornGrowing(),
      'corn_mature': this.createCornMature(),
      'potato_seed': this.createPotatoSeed(),
      'potato_sprout': this.createPotatoSprout(),
      'potato_growing': this.createPotatoGrowing(),
      'potato_mature': this.createPotatoMature(),
    };
    return crops[name] || this.createPlaceholderCrop();
  }

  static createWheatSeed(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="2" fill="#D2691E"/>
        <circle cx="8" cy="8" r="1" fill="#8B4513"/>
      </svg>
    `)}`;
  }

  static createWheatSprout(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="12" width="2" height="4" fill="#8B4513"/>
        <ellipse cx="8" cy="10" rx="2" ry="3" fill="#90EE90"/>
        <ellipse cx="8" cy="8" rx="1" ry="2" fill="#98FB98"/>
      </svg>
    `)}`;
  }

  static createWheatGrowing(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="8" width="2" height="8" fill="#8B4513"/>
        <ellipse cx="8" cy="6" rx="3" ry="2" fill="#FFD700"/>
        <ellipse cx="8" cy="4" rx="2" ry="1.5" fill="#FFA500"/>
        <line x1="6" y1="5" x2="10" y2="5" stroke="#DAA520" stroke-width="0.5"/>
        <line x1="6" y1="3" x2="10" y2="3" stroke="#FFD700" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createWheatMature(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="6" width="2" height="10" fill="#8B4513"/>
        <ellipse cx="8" cy="4" rx="4" ry="3" fill="#FFD700"/>
        <ellipse cx="8" cy="2" rx="3" ry="2" fill="#FFA500"/>
        <line x1="5" y1="3" x2="11" y2="3" stroke="#DAA520" stroke-width="1"/>
        <line x1="5" y1="1" x2="11" y2="1" stroke="#FFD700" stroke-width="1"/>
        <circle cx="6" cy="2" r="0.5" fill="#FFD700"/>
        <circle cx="10" cy="2" r="0.5" fill="#FFD700"/>
      </svg>
    `)}`;
  }

  static createCarrotSeed(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="8" cy="8" rx="1.5" ry="2" fill="#8B4513"/>
        <ellipse cx="8" cy="8" rx="1" ry="1" fill="#654321"/>
      </svg>
    `)}`;
  }

  static createCarrotSprout(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="12" width="2" height="4" fill="#8B4513"/>
        <ellipse cx="8" cy="10" rx="1.5" ry="2" fill="#32CD32"/>
        <rect x="7" y="8" width="2" height="1" fill="#228B22"/>
      </svg>
    `)}`;
  }

  static createCarrotGrowing(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="10" width="2" height="6" fill="#8B4513"/>
        <polygon points="8,4 10,8 8,10 6,8" fill="#FF8C00"/>
        <rect x="7" y="6" width="2" height="2" fill="#228B22"/>
        <line x1="7" y1="5" x2="9" y2="5" stroke="#FF7F50" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createCarrotMature(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="8" width="2" height="8" fill="#8B4513"/>
        <polygon points="8,2 10,8 8,14 6,8" fill="#FF8C00"/>
        <rect x="7" y="2" width="2" height="2" fill="#228B22"/>
        <rect x="6" y="1" width="4" height="1" fill="#32CD32" opacity="0.8"/>
        <line x1="7" y1="4" x2="9" y2="4" stroke="#FF7F50" stroke-width="0.5"/>
        <line x1="7" y1="6" x2="9" y2="6" stroke="#FF7F50" stroke-width="0.5"/>
        <circle cx="7" cy="9" r="0.3" fill="#FFF" opacity="0.4"/>
      </svg>
    `)}`;
  }

  static createTomatoSeed(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="1.5" fill="#8B0000"/>
        <circle cx="8" cy="8" r="1" fill="#DC143C"/>
      </svg>
    `)}`;
  }

  static createTomatoSprout(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="12" width="2" height="4" fill="#8B4513"/>
        <ellipse cx="8" cy="10" rx="2" ry="2" fill="#90EE90"/>
        <ellipse cx="8" cy="8" rx="1.5" ry="1.5" fill="#98FB98"/>
        <circle cx="6" cy="9" r="0.3" fill="#32CD32"/>
        <circle cx="10" cy="9" r="0.3" fill="#32CD32"/>
      </svg>
    `)}`;
  }

  static createTomatoGrowing(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="10" width="2" height="6" fill="#8B4513"/>
        <ellipse cx="8" cy="8" rx="2.5" ry="2.5" fill="#90EE90"/>
        <ellipse cx="8" cy="6" rx="2" ry="2" fill="#98FB98"/>
        <circle cx="6" cy="7" r="0.5" fill="#32CD32"/>
        <circle cx="10" cy="7" r="0.5" fill="#32CD32"/>
        <circle cx="8" cy="5" r="0.3" fill="#FF6347" opacity="0.7"/>
      </svg>
    `)}`;
  }

  static createTomatoMature(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="8" width="2" height="8" fill="#8B4513"/>
        <circle cx="8" cy="6" r="3" fill="#FF6347"/>
        <circle cx="6" cy="4" r="1" fill="#FFA500" opacity="0.7"/>
        <circle cx="10" cy="5" r="0.8" fill="#FFA500" opacity="0.6"/>
        <rect x="7" y="2" width="2" height="2" fill="#228B22"/>
        <rect x="6" y="1" width="4" height="1" fill="#32CD32" opacity="0.8"/>
        <circle cx="7" cy="7" r="0.3" fill="#FFF" opacity="0.4"/>
        <circle cx="9" cy="6" r="0.2" fill="#FFF" opacity="0.3"/>
      </svg>
    `)}`;
  }

  static createCornSeed(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="8" cy="8" rx="2" ry="1.5" fill="#FFD700"/>
        <ellipse cx="8" cy="8" rx="1" ry="0.8" fill="#DAA520"/>
      </svg>
    `)}`;
  }

  static createCornSprout(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="12" width="2" height="4" fill="#8B4513"/>
        <ellipse cx="8" cy="10" rx="1" ry="3" fill="#90EE90"/>
        <ellipse cx="8" cy="8" rx="0.8" ry="2" fill="#98FB98"/>
      </svg>
    `)}`;
  }

  static createCornGrowing(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="8" width="2" height="8" fill="#8B4513"/>
        <ellipse cx="8" cy="6" rx="2" ry="4" fill="#90EE90"/>
        <ellipse cx="8" cy="4" rx="1.5" ry="3" fill="#98FB98"/>
        <line x1="6" y1="3" x2="10" y2="3" stroke="#228B22" stroke-width="0.5"/>
        <line x1="6" y1="5" x2="10" y2="5" stroke="#228B22" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createCornMature(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="6" width="2" height="10" fill="#8B4513"/>
        <ellipse cx="8" cy="4" rx="3" ry="5" fill="#90EE90"/>
        <ellipse cx="8" cy="2" rx="2" ry="4" fill="#98FB98"/>
        <ellipse cx="8" cy="4" rx="2" ry="3" fill="#FFD700"/>
        <rect x="6" y="2" width="4" height="1" fill="#228B22"/>
        <line x1="5" y1="3" x2="11" y2="3" stroke="#228B22" stroke-width="0.5"/>
        <line x1="5" y1="5" x2="11" y2="5" stroke="#228B22" stroke-width="0.5"/>
      </svg>
    `)}`;
  }

  static createPotatoSeed(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="8" cy="8" rx="2" ry="1.8" fill="#D2691E"/>
        <ellipse cx="8" cy="8" rx="1.5" ry="1.3" fill="#8B4513"/>
        <circle cx="7" cy="7" r="0.2" fill="#654321"/>
        <circle cx="9" cy="9" r="0.2" fill="#654321"/>
      </svg>
    `)}`;
  }

  static createPotatoSprout(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="12" width="4" height="4" fill="#8B4513" opacity="0.8"/>
        <ellipse cx="8" cy="10" rx="2" ry="1.5" fill="#90EE90"/>
        <ellipse cx="8" cy="8" rx="1.5" ry="1" fill="#98FB98"/>
      </svg>
    `)}`;
  }

  static createPotatoGrowing(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="10" width="6" height="6" fill="#8B4513" opacity="0.9"/>
        <ellipse cx="8" cy="8" rx="3" ry="2" fill="#90EE90"/>
        <ellipse cx="8" cy="6" rx="2" ry="1.5" fill="#98FB98"/>
        <circle cx="6" cy="7" r="0.3" fill="#32CD32"/>
        <circle cx="10" cy="7" r="0.3" fill="#32CD32"/>
      </svg>
    `)}`;
  }

  static createPotatoMature(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="8" height="8" fill="#8B4513" opacity="0.9"/>
        <ellipse cx="8" cy="6" rx="4" ry="3" fill="#90EE90"/>
        <ellipse cx="8" cy="4" rx="3" ry="2" fill="#98FB98"/>
        <circle cx="5" cy="5" r="0.5" fill="#32CD32"/>
        <circle cx="11" cy="5" r="0.5" fill="#32CD32"/>
        <circle cx="8" cy="3" r="0.3" fill="#228B22"/>
        <circle cx="6" cy="9" r="0.3" fill="#654321"/>
        <circle cx="10" cy="10" r="0.3" fill="#654321"/>
      </svg>
    `)}`;
  }

  static createPlaceholderCrop(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#CCC"/>
        <text x="8" y="12" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">?</text>
      </svg>
    `)}`;
  }

  // ============================================================================
  // BUILDING ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getBuildingAsset(name: string): string {
    const buildings: Record<string, string> = {
      'barn': this.createBarnBuilding(),
      'shed': this.createShedBuilding(),
      'house': this.createHouseBuilding(),
      'fence': this.createFenceBuilding(),
      'cottage': this.createPlaceholderBuilding(),
      'ranch_house': this.createPlaceholderBuilding(),
      'forest_cabin': this.createPlaceholderBuilding(),
      'victorian_house': this.createPlaceholderBuilding(),
      'farmhouse': this.createPlaceholderBuilding(),
      'lake_house': this.createPlaceholderBuilding(),
      'mansion': this.createPlaceholderBuilding(),
      'treehouse_estate': this.createPlaceholderBuilding(),
      'beach_villa': this.createPlaceholderBuilding(),
      'greenhouse_home': this.createPlaceholderBuilding(),
      'windmill_residence': this.createPlaceholderBuilding(),
      'wizard_tower': this.createPlaceholderBuilding(),
    };
    return buildings[name] || this.createPlaceholderBuilding();
  }

  static createHouseBuilding(): string {
    return '/assets/buildings/house.svg';
  }

  static createBarnBuilding(): string {
    return '/assets/buildings/barn.svg';
  }

  static createShedBuilding(): string {
    return '/assets/buildings/shed.svg';
  }

  static createWindmillBuilding(): string {
    return '/assets/buildings/windmill.svg';
  }

  static createGreenhouseBuilding(): string {
    return '/assets/buildings/greenhouse.svg';
  }

  static createWellBuilding(): string {
    return '/assets/buildings/well.svg';
  }

  static createFenceBuilding(): string {
    return '/assets/buildings/fence.svg';
  }

  static createTowerBuilding(): string {
    return '/assets/buildings/tower.svg';
  }

  static createBridgeBuilding(): string {
    return '/assets/buildings/bridge.svg';
  }

  static createMarketBuilding(): string {
    return '/assets/buildings/market.svg';
  }

  static createPlaceholderBuilding(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#CCC"/>
        <text x="64" y="70" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">?</text>
      </svg>
    `)}`;
  }

  // ============================================================================
  // UI ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getUIAsset(name: string): string {
    const ui: Record<string, string> = {
      'inventory_slot': this.createInventorySlot(),
      'button_primary': this.createPrimaryButton(),
      'button_secondary': this.createSecondaryButton(),
      'panel': this.createPanel(),
      'icon_heart': this.createHeartIcon(),
      'icon_coin': this.createCoinIcon(),
      'icon_star': this.createStarIcon(),
    };
    return ui[name] || this.createPlaceholderUI();
  }

  static createInventorySlot(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#FFF" stroke="#000" stroke-width="2"/>
        <rect x="2" y="2" width="28" height="28" fill="#F5F5DC"/>
      </svg>
    `)}`;
  }

  static createPrimaryButton(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="64" height="24" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="24" fill="#4169E1" rx="4"/>
        <rect x="2" y="2" width="60" height="20" fill="#5F9EA0" rx="3"/>
        <text x="32" y="16" text-anchor="middle" fill="#FFF" font-family="Arial" font-size="12">BUTTON</text>
      </svg>
    `)}`;
  }

  static createSecondaryButton(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="64" height="24" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="24" fill="#90EE90" rx="4"/>
        <rect x="2" y="2" width="60" height="20" fill="#7CB342" rx="3"/>
        <text x="32" y="16" text-anchor="middle" fill="#FFF" font-family="Arial" font-size="12">BUTTON</text>
      </svg>
    `)}`;
  }

  static createPanel(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="96" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="96" fill="#F5F5F5" stroke="#000" stroke-width="2"/>
        <rect x="2" y="2" width="124" height="92" fill="#FFF" opacity="0.9"/>
        <rect x="4" y="4" width="120" height="88" fill="#F0F8FF" opacity="0.5"/>
      </svg>
    `)}`;
  }

  static createHeartIcon(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <path d="M 8 14 C 8 14 2 8 2 5 C 2 3 3 2 5 2 C 6 2 7 3 8 4 C 9 3 10 2 11 2 C 13 2 14 3 14 5 C 14 8 8 14 8 14" fill="#FF6B6B"/>
      </svg>
    `)}`;
  }

  static createCoinIcon(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" fill="#FFD700"/>
        <circle cx="8" cy="8" r="4" fill="#FFA500"/>
        <text x="8" y="10" text-anchor="middle" fill="#FFF" font-family="Arial" font-size="8" font-weight="bold">$</text>
      </svg>
    `)}`;
  }

  static createStarIcon(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <polygon points="8,2 10,6 14,6 11,9 12,13 8,11 4,13 5,9 2,6 6,6" fill="#FFD700"/>
        <polygon points="8,4 9,6 11,6 9,8 10,10 8,9 6,10 7,8 5,6 7,6" fill="#FFA500"/>
      </svg>
    `)}`;
  }

  // ============================================================================
  // WEATHER EFFECT ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getWeatherAsset(name: string): string {
    const weather: Record<string, string> = {
      'heat_wave': this.createHeatWaveEffect(),
      'water_overlay': this.createWaterOverlayEffect(),
      'rain_effect': this.createRainEffect(),
      'storm_cloud': this.createStormCloudEffect(),
    };
    return weather[name] || this.createPlaceholderWeather();
  }

  static createHeatWaveEffect(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="heatGrad">
            <stop offset="0%" stop-color="#FFD700" stop-opacity="0.3"/>
            <stop offset="50%" stop-color="#FFA500" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#FF6347" stop-opacity="0.1"/>
          </radialGradient>
        </defs>
        <rect width="128" height="128" fill="url(#heatGrad)"/>
        <path d="M 20 40 Q 40 30 60 40 T 100 40" stroke="#FF8C00" stroke-width="2" fill="none" opacity="0.4"/>
        <path d="M 30 60 Q 50 50 70 60 T 110 60" stroke="#FFA500" stroke-width="2" fill="none" opacity="0.3"/>
        <path d="M 10 80 Q 30 70 50 80 T 90 80" stroke="#FF6347" stroke-width="2" fill="none" opacity="0.3"/>
        <circle cx="64" cy="64" r="40" fill="#FFD700" opacity="0.1"/>
      </svg>
    `)}`;
  }

  static createWaterOverlayEffect(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="waterOverlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4682B4" stop-opacity="0.4"/>
            <stop offset="50%" stop-color="#5F9EA0" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#4682B4" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" fill="url(#waterOverlayGrad)"/>
        <ellipse cx="64" cy="64" rx="50" ry="30" fill="#4682B4" opacity="0.2"/>
        <ellipse cx="64" cy="64" rx="35" ry="20" fill="#5F9EA0" opacity="0.3"/>
        <path d="M 20 40 Q 40 35 60 40 T 100 40" stroke="#87CEEB" stroke-width="3" fill="none" opacity="0.4"/>
        <path d="M 30 80 Q 50 75 70 80 T 110 80" stroke="#87CEEB" stroke-width="3" fill="none" opacity="0.3"/>
      </svg>
    `)}`;
  }

  static createRainEffect(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rainGrad">
            <stop offset="0%" stop-color="#87CEEB" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#4682B4" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" fill="url(#rainGrad)"/>
        <line x1="20" y1="10" x2="15" y2="30" stroke="#87CEEB" stroke-width="2" opacity="0.6"/>
        <line x1="40" y1="5" x2="35" y2="25" stroke="#87CEEB" stroke-width="2" opacity="0.5"/>
        <line x1="60" y1="15" x2="55" y2="35" stroke="#87CEEB" stroke-width="2" opacity="0.7"/>
        <line x1="80" y1="8" x2="75" y2="28" stroke="#87CEEB" stroke-width="2" opacity="0.4"/>
        <line x1="100" y1="12" x2="95" y2="32" stroke="#87CEEB" stroke-width="2" opacity="0.6"/>
        <line x1="30" y1="40" x2="25" y2="60" stroke="#87CEEB" stroke-width="2" opacity="0.5"/>
        <line x1="70" y1="45" x2="65" y2="65" stroke="#87CEEB" stroke-width="2" opacity="0.7"/>
        <line x1="90" y1="50" x2="85" y2="70" stroke="#87CEEB" stroke-width="2" opacity="0.4"/>
        <line x1="50" y1="70" x2="45" y2="90" stroke="#87CEEB" stroke-width="2" opacity="0.6"/>
        <line x1="110" y1="75" x2="105" y2="95" stroke="#87CEEB" stroke-width="2" opacity="0.5"/>
      </svg>
    `)}`;
  }

  static createStormCloudEffect(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="stormGrad">
            <stop offset="0%" stop-color="#696969" stop-opacity="0.5"/>
            <stop offset="50%" stop-color="#808080" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#A9A9A9" stop-opacity="0.1"/>
          </radialGradient>
        </defs>
        <rect width="128" height="128" fill="url(#stormGrad)"/>
        <ellipse cx="40" cy="40" rx="25" ry="15" fill="#696969" opacity="0.6"/>
        <ellipse cx="80" cy="35" rx="30" ry="18" fill="#808080" opacity="0.5"/>
        <ellipse cx="60" cy="50" rx="35" ry="20" fill="#696969" opacity="0.4"/>
        <ellipse cx="90" cy="60" rx="20" ry="12" fill="#A9A9A9" opacity="0.3"/>
        <path d="M 30 80 L 35 90 L 25 90 Z" fill="#FFD700" opacity="0.8"/>
        <path d="M 70 85 L 75 95 L 65 95 Z" fill="#FFD700" opacity="0.7"/>
        <path d="M 100 90 L 105 100 L 95 100 Z" fill="#FFD700" opacity="0.6"/>
      </svg>
    `)}`;
  }

  // ============================================================================
  // DAM BUILDING ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getDamAsset(name: string): string {
    const dams: Record<string, string> = {
      'small_dam_sprite': this.createPlaceholderDam(),
      'medium_dam_sprite': this.createMediumDamSprite(),
      'large_dam_sprite': this.createLargeDamSprite(),
    };
    return dams[name] || this.createPlaceholderDam();
  }

  static getRoadAsset(name: string): string {
    // Expected format: road_[grade]_[lanes]_mask[connections]
    // Example: road_gravel_1_mask15
    const parts = name.split('_');
    if (parts.length >= 4) {
      const grade = parts[1] as any;
      const lanes = parseInt(parts[2]) as any;
      const maskStr = parts[3].replace('mask', '');
      const connections = parseInt(maskStr);
      return this.createRoadAsset(grade, lanes, connections);
    }
    return this.createPlaceholderTile();
  }

  static createRoadAsset(grade: 'gravel' | 'paved', lanes: 1 | 2, connections: number): string {
    const baseColor = grade === 'gravel' ? '#8D6E63' : '#333333';
    const lineColor = '#FFD700'; // Yellow for double lane
    const roadWidth = lanes === 1 ? 40 : 60;
    const center = 64;

    // Helper to draw a segment
    const drawSegment = (targetX: number, targetY: number) => {
      return `<line x1="${center}" y1="${center}" x2="${targetX}" y2="${targetY}" stroke="${baseColor}" stroke-width="${roadWidth}" stroke-linecap="butt" />`;
    };

    // Helper to draw lines
    const drawLines = (targetX: number, targetY: number) => {
      if (grade === 'paved' && lanes === 2) {
        return `<line x1="${center}" y1="${center}" x2="${targetX}" y2="${targetY}" stroke="${lineColor}" stroke-width="2" stroke-dasharray="8,4" />`;
      }
      return '';
    };

    let segments = '';
    let markings = '';

    // Draw central hub
    segments += `<circle cx="${center}" cy="${center}" r="${roadWidth / 2}" fill="${baseColor}" />`;

    // Top (1)
    if (connections & 1) {
      segments += drawSegment(center, 0);
      markings += drawLines(center, 0);
    }
    // Right (2)
    if (connections & 2) {
      segments += drawSegment(128, center);
      markings += drawLines(128, center);
    }
    // Bottom (4)
    if (connections & 4) {
      segments += drawSegment(center, 128);
      markings += drawLines(center, 128);
    }
    // Left (8)
    if (connections & 8) {
      segments += drawSegment(0, center);
      markings += drawLines(0, center);
    }

    // Curved smoothing for corners
    // If (1 & 2), (2 & 4), (4 & 8), or (8 & 1)
    const corners = [
      { mask: 3, cx: 128, cy: 0 },   // Top-Right
      { mask: 6, cx: 128, cy: 128 }, // Right-Bottom
      { mask: 12, cx: 0, cy: 128 },  // Bottom-Left
      { mask: 9, cx: 0, cy: 0 }      // Left-Top
    ];

    let curves = '';
    corners.forEach(c => {
      if ((connections & c.mask) === c.mask) {
        // Draw a filled arc/circle at inner corner?
        // Actually, for isometric, it's better to just overlap the straight segments
        // But the user specifically asked for "curved".
        // Let's add a circle at the junction for better flow
        curves += `<circle cx="${center}" cy="${center}" r="${roadWidth / 2}" fill="${baseColor}" />`;
      }
    });

    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="none" />
        ${segments}
        ${curves}
        ${markings}
      </svg>
    `)}`;
  }


  static createMediumDamSprite(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="96" height="64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mediumDamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="50%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#654321"/>
          </linearGradient>
        </defs>
        <!-- Dam structure -->
        <rect x="0" y="28" width="96" height="36" fill="url(#mediumDamGrad)"/>
        <rect x="0" y="32" width="96" height="6" fill="#654321" opacity="0.8"/>
        <rect x="0" y="42" width="96" height="6" fill="#654321" opacity="0.8"/>
        <!-- Water on top -->
        <rect x="0" y="12" width="96" height="16" fill="#4682B4" opacity="0.7"/>
        <rect x="0" y="14" width="96" height="3" fill="#87CEEB" opacity="0.5"/>
        <!-- Support beams -->
        <rect x="12" y="28" width="6" height="36" fill="#696969"/>
        <rect x="36" y="28" width="6" height="36" fill="#696969"/>
        <rect x="60" y="28" width="6" height="36" fill="#696969"/>
        <rect x="84" y="28" width="6" height="36" fill="#696969"/>
        <!-- Control tower -->
        <rect x="40" y="8" width="16" height="20" fill="#808080"/>
        <rect x="42" y="10" width="12" height="4" fill="#87CEEB" opacity="0.7"/>
      </svg>
    `)}`;
  }

  static createLargeDamSprite(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="largeDamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="50%" stop-color="#A0522D"/>
            <stop offset="100%" stop-color="#654321"/>
          </linearGradient>
        </defs>
        <!-- Dam structure -->
        <rect x="0" y="36" width="128" height="44" fill="url(#largeDamGrad)"/>
        <rect x="0" y="40" width="128" height="8" fill="#654321" opacity="0.8"/>
        <rect x="0" y="52" width="128" height="8" fill="#654321" opacity="0.8"/>
        <!-- Water on top -->
        <rect x="0" y="16" width="128" height="20" fill="#4682B4" opacity="0.7"/>
        <rect x="0" y="18" width="128" height="4" fill="#87CEEB" opacity="0.5"/>
        <!-- Support beams -->
        <rect x="16" y="36" width="8" height="44" fill="#696969"/>
        <rect x="48" y="36" width="8" height="44" fill="#696969"/>
        <rect x="80" y="36" width="8" height="44" fill="#696969"/>
        <rect x="112" y="36" width="8" height="44" fill="#696969"/>
        <!-- Control towers -->
        <rect x="32" y="8" width="20" height="28" fill="#808080"/>
        <rect x="34" y="10" width="16" height="6" fill="#87CEEB" opacity="0.7"/>
        <rect x="76" y="8" width="20" height="28" fill="#808080"/>
        <rect x="78" y="10" width="16" height="6" fill="#87CEEB" opacity="0.7"/>
        <!-- Spillway -->
        <rect x="54" y="44" width="20" height="36" fill="#4682B4" opacity="0.6"/>
      </svg>
    `)}`;
  }

  static createProtectionArea(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="protectionGrad">
            <stop offset="0%" stop-color="#00FF00" stop-opacity="0.2"/>
            <stop offset="50%" stop-color="#32CD32" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#228B22" stop-opacity="0.05"/>
          </radialGradient>
        </defs>
        <circle cx="64" cy="64" r="60" fill="url(#protectionGrad)"/>
        <circle cx="64" cy="64" r="50" fill="none" stroke="#00FF00" stroke-width="2" opacity="0.3" stroke-dasharray="5,5"/>
        <circle cx="64" cy="64" r="40" fill="none" stroke="#32CD32" stroke-width="1" opacity="0.2" stroke-dasharray="3,3"/>
        <!-- Shield icon in center -->
        <path d="M 64 30 L 74 35 L 74 50 Q 74 65 64 70 Q 54 65 54 50 L 54 35 Z" fill="#00FF00" opacity="0.4"/>
        <path d="M 64 35 L 69 37 L 69 47 Q 69 55 64 58 Q 59 55 59 47 L 59 37 Z" fill="#32CD32" opacity="0.6"/>
      </svg>
    `)}`;
  }

  static createPlaceholderDam(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="64" height="48" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" fill="#CCC" opacity="0.5"/>
        <text x="32" y="24" text-anchor="middle" fill="#666" font-family="Arial" font-size="12">DAM</text>
      </svg>
    `)}`;
  }

  static createPlaceholderWeather(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#CCC" opacity="0.3"/>
        <text x="64" y="64" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">?</text>
      </svg>
    `)}`;
  }

  static createPlaceholderCharacter(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="48" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="48" fill="#CCC"/>
        <text x="16" y="28" text-anchor="middle" fill="#666" font-family="Arial" font-size="12">?</text>
      </svg>
    `)}`;
  }

  static createPlaceholderItem(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#CCC"/>
        <text x="8" y="12" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">?</text>
      </svg>
    `)}`;
  }

  static createPlaceholderTile(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#CCC"/>
        <text x="8" y="12" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">?</text>
      </svg>
    `)}`;
  }

  static createPlaceholderTool(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#CCC"/>
        <text x="8" y="12" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">?</text>
      </svg>
    `)}`;
  }

  static createPlaceholderUI(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#CCC"/>
        <text x="16" y="20" text-anchor="middle" fill="#666" font-family="Arial" font-size="12">?</text>
      </svg>
    `)}`;
  }

  static getPlaceholderAsset(name: string): string {
    return this.createPlaceholderItem();
  }

  // ============================================================================
  // CANVAS-BASED ASSETS (for more complex rendering)
  // ============================================================================

  static createCanvasAsset(type: string, name: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'character':
        this.drawCharacterCanvas(ctx, name, canvas);
        break;
      case 'item':
        this.drawItemCanvas(ctx, name, canvas);
        break;
      case 'tile':
        this.drawTileCanvas(ctx, name, canvas);
        break;
      default:
        this.drawPlaceholderCanvas(ctx, canvas);
    }

    return canvas;
  }

  static drawCharacterCanvas(ctx: CanvasRenderingContext2D, name: string, canvas: HTMLCanvasElement): void {
    canvas.width = 32;
    canvas.height = 48;

    // Simple character drawing
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(8, 20, 16, 20); // Body

    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath();
    ctx.arc(16, 12, 8, 0, Math.PI * 2); // Head
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.fillRect(12, 10, 2, 2); // Left eye
    ctx.fillRect(18, 10, 2, 2); // Right eye
  }

  static drawItemCanvas(ctx: CanvasRenderingContext2D, name: string, canvas: HTMLCanvasElement): void {
    canvas.width = 16;
    canvas.height = 16;

    // Simple item drawing
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(2, 2, 12, 12);

    ctx.fillStyle = '#654321';
    ctx.fillRect(4, 4, 8, 2);
    ctx.fillRect(4, 8, 8, 2);
  }

  static drawTileCanvas(ctx: CanvasRenderingContext2D, name: string, canvas: HTMLCanvasElement): void {
    canvas.width = 16;
    canvas.height = 16;

    // Simple tile drawing
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = '#7CB342';
    ctx.fillRect(2, 2, 2, 2);
    ctx.fillRect(8, 4, 2, 2);
    ctx.fillRect(12, 8, 2, 2);
  }

  static drawPlaceholderCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    canvas.width = 16;
    canvas.height = 16;

    ctx.fillStyle = '#CCC';
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', 8, 12);
  }

  // ============================================================================
  // MINING ASSETS (SVG data URLs - instant)
  // ============================================================================

  static getMiningAsset(name: string): string {
    const mining: Record<string, string> = {
      'pickaxe': this.createPickaxeTool(),
      'shovel': this.createShovelTool(),
      'mining_cart': this.createMiningCart(),
      'ore_iron': this.createIronOre(),
      'ore_copper': this.createCopperOre(),
      'ore_gold': this.createGoldOre(),
      'ore_diamond': this.createDiamondOre(),
      'mine_entrance': this.createMineEntrance(),
      'mine_tunnel': this.createMineTunnel(),
      'mining_lamp': this.createMiningLamp(),
    };
    return mining[name] || this.createPlaceholderMining();
  }

  static createMiningCart(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#8B4513"/>
            <stop offset="100%" stop-color="#654321"/>
          </linearGradient>
        </defs>
        <!-- Cart body -->
        <rect x="4" y="8" width="24" height="12" fill="url(#cartGrad)" rx="2"/>
        <rect x="6" y="10" width="20" height="2" fill="#654321" opacity="0.7"/>
        <!-- Wheels -->
        <circle cx="8" cy="20" r="2" fill="#696969"/>
        <circle cx="24" cy="20" r="2" fill="#696969"/>
        <circle cx="8" cy="20" r="1" fill="#A9A9A9"/>
        <circle cx="24" cy="20" r="1" fill="#A9A9A9"/>
        <!-- Handle -->
        <rect x="28" y="10" width="4" height="8" fill="#696969" rx="1"/>
        <rect x="30" y="8" width="2" height="4" fill="#808080"/>
      </svg>
    `)}`;
  }

  static createIronOre(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ironGrad">
            <stop offset="0%" stop-color="#C0C0C0"/>
            <stop offset="50%" stop-color="#808080"/>
            <stop offset="100%" stop-color="#696969"/>
          </radialGradient>
        </defs>
        <polygon points="8,2 14,8 8,14 2,8" fill="url(#ironGrad)"/>
        <polygon points="8,4 12,8 8,12 4,8" fill="#A9A9A9" opacity="0.7"/>
        <circle cx="6" cy="6" r="0.5" fill="#D3D3D3" opacity="0.8"/>
        <circle cx="10" cy="10" r="0.3" fill="#F5F5F5" opacity="0.6"/>
      </svg>
    `)}`;
  }

  static createCopperOre(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="copperGrad">
            <stop offset="0%" stop-color="#B87333"/>
            <stop offset="50%" stop-color="#CD7F32"/>
            <stop offset="100%" stop-color="#8B4513"/>
          </radialGradient>
        </defs>
        <polygon points="8,2 14,8 8,14 2,8" fill="url(#copperGrad)"/>
        <polygon points="8,4 12,8 8,12 4,8" fill="#D2691E" opacity="0.7"/>
        <circle cx="6" cy="6" r="0.5" fill="#FF8C00" opacity="0.8"/>
        <circle cx="10" cy="10" r="0.3" fill="#FFA500" opacity="0.6"/>
      </svg>
    `)}`;
  }

  static createGoldOre(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="goldOreGrad">
            <stop offset="0%" stop-color="#FFD700"/>
            <stop offset="50%" stop-color="#FFA500"/>
            <stop offset="100%" stop-color="#B8860B"/>
          </radialGradient>
        </defs>
        <polygon points="8,2 14,8 8,14 2,8" fill="url(#goldOreGrad)"/>
        <polygon points="8,4 12,8 8,12 4,8" fill="#FFD700" opacity="0.7"/>
        <circle cx="6" cy="6" r="0.5" fill="#FFFF00" opacity="0.9"/>
        <circle cx="10" cy="10" r="0.3" fill="#FFFACD" opacity="0.8"/>
      </svg>
    `)}`;
  }

  static createDiamondOre(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="diamondOreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E0FFFF"/>
            <stop offset="50%" stop-color="#87CEEB"/>
            <stop offset="100%" stop-color="#4682B4"/>
          </linearGradient>
        </defs>
        <polygon points="8,2 12,6 8,14 4,6" fill="url(#diamondOreGrad)"/>
        <polygon points="8,4 10,6 8,10 6,6" fill="#ADD8E6" opacity="0.8"/>
        <polygon points="8,6 9,7 8,9 7,7" fill="#FFF" opacity="0.9"/>
        <circle cx="7" cy="5" r="0.3" fill="#FFF" opacity="0.8"/>
        <circle cx="9" cy="8" r="0.2" fill="#FFF" opacity="0.7"/>
      </svg>
    `)}`;
  }

  static createMineEntrance(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="64" height="48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#696969"/>
            <stop offset="50%" stop-color="#808080"/>
            <stop offset="100%" stop-color="#A9A9A9"/>
          </linearGradient>
        </defs>
        <!-- Rock formation -->
        <polygon points="0,0 64,0 64,48 32,32 0,48" fill="url(#mineGrad)"/>
        <!-- Mine entrance -->
        <rect x="20" y="20" width="24" height="28" fill="#2F4F4F"/>
        <rect x="22" y="22" width="20" height="24" fill="#1C1C1C"/>
        <!-- Support beams -->
        <rect x="20" y="20" width="2" height="28" fill="#8B4513"/>
        <rect x="42" y="20" width="2" height="28" fill="#8B4513"/>
        <rect x="20" y="30" width="24" height="2" fill="#8B4513"/>
        <!-- Mine cart tracks -->
        <rect x="24" y="44" width="16" height="2" fill="#696969"/>
        <rect x="25" y="45" width="2" height="2" fill="#A9A9A9"/>
        <rect x="37" y="45" width="2" height="2" fill="#A9A9A9"/>
      </svg>
    `)}`;
  }

  static createMineTunnel(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tunnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#696969"/>
            <stop offset="100%" stop-color="#2F4F4F"/>
          </linearGradient>
        </defs>
        <!-- Tunnel walls -->
        <rect x="0" y="0" width="32" height="32" fill="url(#tunnelGrad)"/>
        <!-- Tunnel opening -->
        <rect x="4" y="8" width="24" height="16" fill="#1C1C1C"/>
        <!-- Support beams -->
        <rect x="4" y="8" width="2" height="16" fill="#8B4513"/>
        <rect x="26" y="8" width="2" height="16" fill="#8B4513"/>
        <rect x="4" y="14" width="24" height="2" fill="#8B4513"/>
      </svg>
    `)}`;
  }

  static createMiningLamp(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="lampGrad">
            <stop offset="0%" stop-color="#FFFF00" stop-opacity="0.8"/>
            <stop offset="50%" stop-color="#FFD700" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#FFA500" stop-opacity="0.2"/>
          </radialGradient>
        </defs>
        <!-- Lamp body -->
        <circle cx="8" cy="8" r="6" fill="#696969"/>
        <circle cx="8" cy="8" r="4" fill="url(#lampGrad)"/>
        <!-- Light beam -->
        <polygon points="8,4 12,2 16,0" fill="#FFFF00" opacity="0.6"/>
        <polygon points="8,4 4,2 0,0" fill="#FFFF00" opacity="0.6"/>
        <!-- Handle -->
        <rect x="7" y="14" width="2" height="2" fill="#696969"/>
      </svg>
    `)}`;
  }

  static createPlaceholderMining(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#CCC"/>
        <text x="8" y="12" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">?</text>
      </svg>
    `)}`;
  }

  // ============================================================================
  // QUICK ACCESS METHODS
  // ============================================================================

  // Get all demo assets as a map
  static getAllDemoAssets(): Record<string, string> {
    return {
      // Characters
      'player_idle': this.getAsset('character', 'player_idle'),
      'player_walk': this.getAsset('character', 'player_walk'),
      'npc_shopkeeper': this.getAsset('character', 'npc_shopkeeper'),
      'npc_villager': this.getAsset('character', 'npc_villager'),

      // Items
      'wood': this.getAsset('item', 'wood'),
      'stone': this.getAsset('item', 'stone'),
      'wheat': this.getAsset('item', 'wheat'),
      'carrot': this.getAsset('item', 'carrot'),
      'tomato': this.getAsset('item', 'tomato'),
      'corn': this.getAsset('item', 'corn'),
      'diamond': this.getAsset('item', 'diamond'),
      'gold': this.getAsset('item', 'gold'),

      // Tiles
      'grass': this.getAsset('tile', 'grass'),
      'dirt': this.getAsset('tile', 'dirt'),
      'stone_tile': this.getAsset('tile', 'stone'),
      'water': this.getAsset('tile', 'water'),
      'path': this.getAsset('tile', 'path'),

      // Tools
      'hoe': this.getAsset('tool', 'hoe'),
      'watering_can': this.getAsset('tool', 'watering_can'),
      'axe': this.getAsset('tool', 'axe'),
      'pickaxe': this.getAsset('tool', 'pickaxe'),
      'shovel': this.getAsset('tool', 'shovel'),
      'scythe': this.getAsset('tool', 'scythe'),
      'lawn_mower_basic': this.getAsset('tool', 'lawn_mower_basic'),
      'lawn_mower_pro': this.getAsset('tool', 'lawn_mower_pro'),
      'lawn_mower_riding': this.getAsset('tool', 'lawn_mower_riding'),

      // Crops (all growth stages)
      'wheat_seed': this.getAsset('crop', 'wheat_seed'),
      'wheat_sprout': this.getAsset('crop', 'wheat_sprout'),
      'wheat_growing': this.getAsset('crop', 'wheat_growing'),
      'wheat_mature': this.getAsset('crop', 'wheat_mature'),
      'carrot_seed': this.getAsset('crop', 'carrot_seed'),
      'carrot_sprout': this.getAsset('crop', 'carrot_sprout'),
      'carrot_growing': this.getAsset('crop', 'carrot_growing'),
      'carrot_mature': this.getAsset('crop', 'carrot_mature'),
      'tomato_seed': this.getAsset('crop', 'tomato_seed'),
      'tomato_sprout': this.getAsset('crop', 'tomato_sprout'),
      'tomato_growing': this.getAsset('crop', 'tomato_growing'),
      'tomato_mature': this.getAsset('crop', 'tomato_mature'),
      'corn_seed': this.getAsset('crop', 'corn_seed'),
      'corn_sprout': this.getAsset('crop', 'corn_sprout'),
      'corn_growing': this.getAsset('crop', 'corn_growing'),
      'corn_mature': this.getAsset('crop', 'corn_mature'),
      'potato_seed': this.getAsset('crop', 'potato_seed'),
      'potato_sprout': this.getAsset('crop', 'potato_sprout'),
      'potato_growing': this.getAsset('crop', 'potato_growing'),
      'potato_mature': this.getAsset('crop', 'potato_mature'),

      // Weather
      'heat_wave': this.getAsset('weather', 'heat_wave'),
      'water_overlay': this.getAsset('weather', 'water_overlay'),
      'rain_effect': this.getAsset('weather', 'rain_effect'),
      'storm_cloud': this.getAsset('weather', 'storm_cloud'),

      // Dams
      'small_dam_sprite': this.getAsset('dam', 'small_dam_sprite'),
      'medium_dam_sprite': this.getAsset('dam', 'medium_dam_sprite'),
      'large_dam_sprite': this.getAsset('dam', 'large_dam_sprite'),
      'protection_area': this.getAsset('dam', 'protection_area'),

      // Mining
      'mining_cart': this.getAsset('mining', 'mining_cart'),
      'ore_iron': this.getAsset('mining', 'ore_iron'),
      'ore_copper': this.getAsset('mining', 'ore_copper'),
      'ore_gold': this.getAsset('mining', 'ore_gold'),
      'ore_diamond': this.getAsset('mining', 'ore_diamond'),
      'mine_entrance': this.getAsset('mining', 'mine_entrance'),
      'mine_tunnel': this.getAsset('mining', 'mine_tunnel'),
      'mining_lamp': this.getAsset('mining', 'mining_lamp'),

      // UI
      'inventory_slot': this.getAsset('ui', 'inventory_slot'),
      'button_primary': this.getAsset('ui', 'button_primary'),
      'button_secondary': this.getAsset('ui', 'button_secondary'),
      'panel': this.getAsset('ui', 'panel'),
      'icon_heart': this.getAsset('ui', 'icon_heart'),
      'icon_coin': this.getAsset('ui', 'icon_coin'),
      'icon_star': this.getAsset('ui', 'icon_star'),
    };
  }

  // Create image element from asset
  static createImageElement(assetType: string, assetName: string): HTMLImageElement {
    const img = new Image();
    img.src = this.getAsset(assetType, assetName);
    return img;
  }

  // Get CSS background style
  static getBackgroundStyle(assetType: string, assetName: string): string {
    const dataUrl = this.getAsset(assetType, assetName);
    return `background-image: url('${dataUrl}'); background-size: cover;`;
  }

  // Home asset creation methods
  static createCottage(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#8B4513"/><rect x="4" y="8" width="24" height="20" fill="#DEB887"/><polygon points="2,8 16,2 30,8" fill="#A52A2A"/><rect x="12" y="16" width="8" height="12" fill="#654321"/><rect x="6" y="12" width="6" height="6" fill="#87CEEB"/><rect x="20" y="12" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createRanchHouse(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#D2691E"/><rect x="4" y="10" width="24" height="18" fill="#F4A460"/><polygon points="2,10 16,4 30,10" fill="#8B4513"/><rect x="12" y="18" width="8" height="10" fill="#654321"/><rect x="6" y="14" width="6" height="6" fill="#87CEEB"/><rect x="20" y="14" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createForestCabin(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#654321"/><rect x="4" y="12" width="24" height="16" fill="#8B4513"/><polygon points="2,12 16,6 30,12" fill="#228B22"/><rect x="12" y="20" width="8" height="8" fill="#654321"/><rect x="6" y="16" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createVictorianHouse(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#4B0082"/><rect x="4" y="8" width="24" height="20" fill="#9370DB"/><polygon points="2,8 16,2 30,8" fill="#8B008B"/><rect x="12" y="16" width="8" height="12" fill="#654321"/><rect x="6" y="12" width="6" height="6" fill="#87CEEB"/><rect x="20" y="12" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createFarmhouse(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#CD853F"/><rect x="4" y="10" width="24" height="18" fill="#DEB887"/><polygon points="2,10 16,4 30,10" fill="#8B4513"/><rect x="12" y="18" width="8" height="10" fill="#654321"/><rect x="6" y="14" width="6" height="6" fill="#87CEEB"/><rect x="20" y="14" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createLakeHouse(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#4682B4"/><rect x="4" y="12" width="24" height="16" fill="#87CEEB"/><polygon points="2,12 16,6 30,12" fill="#1E90FF"/><rect x="12" y="20" width="8" height="8" fill="#654321"/><rect x="6" y="16" width="6" height="6" fill="#87CEEB"/><rect x="20" y="16" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createMansion(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#FFD700"/><rect x="4" y="6" width="24" height="22" fill="#FFA500"/><polygon points="2,6 16,0 30,6" fill="#B8860B"/><rect x="12" y="14" width="8" height="14" fill="#654321"/><rect x="6" y="10" width="6" height="6" fill="#87CEEB"/><rect x="20" y="10" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createTreehouseEstate(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#228B22"/><rect x="4" y="8" width="24" height="20" fill="#8FBC8F"/><polygon points="2,8 16,2 30,8" fill="#006400"/><rect x="12" y="16" width="8" height="12" fill="#654321"/><rect x="6" y="12" width="6" height="6" fill="#87CEEB"/><rect x="20" y="12" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createBeachVilla(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#FFA500"/><rect x="4" y="10" width="24" height="18" fill="#FFE4B5"/><polygon points="2,10 16,4 30,10" fill="#FF8C00"/><rect x="12" y="18" width="8" height="10" fill="#654321"/><rect x="6" y="14" width="6" height="6" fill="#87CEEB"/><rect x="20" y="14" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createGreenhouseHome(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#90EE90"/><rect x="4" y="8" width="24" height="20" fill="#98FB98"/><polygon points="2,8 16,2 30,8" fill="#228B22"/><rect x="12" y="16" width="8" height="12" fill="#654321"/><rect x="6" y="12" width="6" height="6" fill="#87CEEB"/><rect x="20" y="12" width="6" height="6" fill="#87CEEB"/></svg>')}`;
  }

  static createWindmillResidence(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#F0E68C"/><rect x="4" y="10" width="24" height="18" fill="#FFDEAD"/><polygon points="2,10 16,4 30,10" fill="#DAA520"/><rect x="12" y="18" width="8" height="10" fill="#654321"/><rect x="6" y="14" width="6" height="6" fill="#87CEEB"/><rect x="20" y="14" width="6" height="6" fill="#87CEEB"/><circle cx="16" cy="8" r="6" fill="none" stroke="#8B4513" stroke-width="1"/></svg>')}`;
  }

  static createWizardTower(): string {
    return `data:image/svg+xml;base64,${btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#4B0082"/><polygon points="8,32 8,4 16,0 24,4 24,32" fill="#663399"/><rect x="12" y="12" width="8" height="8" fill="#87CEEB"/><circle cx="16" cy="8" r="3" fill="#FFD700"/><polygon points="16,0 14,6 18,6" fill="#FF0000"/></svg>')}`;
  }
}
