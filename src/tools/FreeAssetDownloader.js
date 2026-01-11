// Free Asset Downloader for Cozy Haven
export class FreeAssetDownloader {
    constructor() {
        this.assets = new Map();
        this.totalAssets = 1450;
        this.loadedAssets = 0;
    }

    async downloadAssets(progressCallback) {
        console.log('🎨 Downloading beautiful farm assets...');
        
        // Enhanced asset categories with better descriptions
        const assetTypes = [
            { type: 'crops', count: 20, icon: '🌾', description: 'Growing crops' },
            { type: 'buildings', count: 10, icon: '🏠', description: 'Farm structures' },
            { type: 'tools', count: 9, icon: '🔧', description: 'Farming equipment' },
            { type: 'tiles', count: 5, icon: '🟩', description: 'Ground textures' },
            { type: 'characters', count: 4, icon: '👨‍🌾', description: 'Farm friends' },
            { type: 'ui', count: 7, icon: '🎨', description: 'Interface elements' },
            { type: 'weather', count: 4, icon: '🌦️', description: 'Weather effects' },
            { type: 'mining', count: 8, icon: '⛏️', description: 'Underground treasures' }
        ];

        for (const assetType of assetTypes) {
            await this.downloadAssetType(assetType, progressCallback);
        }

        console.log('🎉 All farm assets ready!');
        return this.assets;
    }

    async downloadAssetType(assetTypeInfo, progressCallback) {
        const { type, count, icon, description } = assetTypeInfo;
        
        for (let i = 0; i < count; i++) {
            // Simulate download delay with variation
            await new Promise(resolve => setTimeout(resolve, 8 + Math.random() * 4));
            
            const assetKey = `${type}_${i}`;
            this.assets.set(assetKey, this.generateMockAsset(type, i));
            this.loadedAssets++;

            if (progressCallback) {
                progressCallback({
                    type: type,
                    icon: icon,
                    description: description,
                    index: i,
                    total: count,
                    loaded: this.loadedAssets,
                    totalAssets: this.totalAssets,
                    progress: this.loadedAssets / this.totalAssets,
                    currentAsset: `${icon} ${description} - Item ${i + 1}/${count}`
                });
            }
        }
    }

    generateMockAsset(type, index) {
        // Generate mock asset data
        return {
            id: `${type}_${index}`,
            type: type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${index}`,
            data: `mock_data_${type}_${index}`,
            size: Math.floor(Math.random() * 1000) + 100,
            loaded: true
        };
    }

    getAsset(key) {
        return this.assets.get(key);
    }

    getAllAssets() {
        return Array.from(this.assets.values());
    }

    getStats() {
        return {
            totalAssets: this.totalAssets,
            loadedAssets: this.loadedAssets,
            progress: this.loadedAssets / this.totalAssets,
            assetTypes: {
                crops: 20,
                buildings: 10,
                tools: 9,
                tiles: 5,
                characters: 4,
                ui: 7,
                weather: 4,
                mining: 8
            }
        };
    }
}
