import { ItemType, Season } from '../types/game';

// ============================================================================
// ECONOMIC TYPES
// ============================================================================

export interface MarketItem {
    id: string;
    name: string;
    basePrice: number;
    elasticity: number; // 0.1 (inelastic/stubborn) to 2.0 (elastic/volatile)
    volatility: number; // Random noise factor
    category: 'staple' | 'luxury' | 'material';
}

export interface MarketState {
    inventory: Record<string, number>; // Total market liquidity
    prices: Record<string, number>;
    trend: Record<string, 'up' | 'down' | 'stable'>;
    history: Record<string, number[]>; // Last 7 days
}

export interface NewsEvent {
    id: string;
    headline: string;
    description: string;
    effect: (market: EconomySystem) => void;
    duration: number; // Days
    active: boolean;
}

export interface Contract {
    id: string;
    requester: string;
    item: string;
    quantity: number;
    qualityMin: number;
    reward: number;
    deadline: number; // Game day
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MARKET_ITEMS: Record<string, MarketItem> = {
    // Staples (Low elasticity, high volume)
    wheat: { id: 'wheat', name: 'Wheat', basePrice: 5, elasticity: 0.3, volatility: 0.1, category: 'staple' },
    corn: { id: 'corn', name: 'Corn', basePrice: 8, elasticity: 0.4, volatility: 0.1, category: 'staple' },
    potato: { id: 'potato', name: 'Potato', basePrice: 6, elasticity: 0.3, volatility: 0.1, category: 'staple' },

    // Materials (Medium elasticity)
    wood: { id: 'wood', name: 'Wood', basePrice: 4, elasticity: 0.8, volatility: 0.2, category: 'material' },
    stone: { id: 'stone', name: 'Stone', basePrice: 3, elasticity: 0.7, volatility: 0.2, category: 'material' },
    iron: { id: 'iron', name: 'Iron', basePrice: 15, elasticity: 0.9, volatility: 0.3, category: 'material' },

    // Luxuries (High elasticity, prone to crashes/spikes)
    pumpkin: { id: 'pumpkin', name: 'Pumpkin', basePrice: 25, elasticity: 1.5, volatility: 0.5, category: 'luxury' },
    strawberry: { id: 'strawberry', name: 'Strawberry', basePrice: 18, elasticity: 1.4, volatility: 0.4, category: 'luxury' },
    diamond: { id: 'diamond', name: 'Diamond', basePrice: 300, elasticity: 2.0, volatility: 0.8, category: 'luxury' },
};

/** In-game days of player sales that still move the sell price. */
export const DEMAND_WINDOW_DAYS = 7;

/**
 * Multiplier for units already sold in the window.
 * No sales stay at 1. Each unit trims 2 points, and the price never falls below half.
 */
export function demandMultiplierForVolume(volume: number): number {
    if (!Number.isFinite(volume) || volume <= 0) return 1;
    const trimmed = 1 - Math.floor(volume) * 0.02;
    return Math.max(0.5, Math.round(trimmed * 100) / 100);
}

/** Sum of quantities whose age is 0 .. windowDays-1. Older sales and future days are ignored. */
export function volumeSoldInWindow(
    sales: readonly { day: number; quantity: number }[],
    today: number,
    windowDays = DEMAND_WINDOW_DAYS,
): number {
    let total = 0;
    for (const sale of sales) {
        if (!Number.isFinite(sale.quantity) || sale.quantity <= 0) continue;
        const age = today - sale.day;
        if (age >= 0 && age < windowDays) total += sale.quantity;
    }
    return total;
}

// ============================================================================
// SYSTEM CLASS
// ============================================================================

export class EconomySystem {
    private static instance: EconomySystem;
    private state: MarketState;
    private news: NewsEvent[] = [];
    private activeContracts: Contract[] = [];

    // Simulation factors
    private day: number = 1;
    private season: Season = 'spring';
    /** Player sales kept for the demand window. Not applied in getSellableItems. */
    private sales: { itemId: string; day: number; quantity: number }[] = [];

    private constructor() {
        this.state = {
            inventory: {},
            prices: {},
            trend: {},
            history: {}
        };
        this.initializeMarket();
    }

    public static getInstance(): EconomySystem {
        if (!EconomySystem.instance) {
            EconomySystem.instance = new EconomySystem();
        }
        return EconomySystem.instance;
    }

    // --------------------------------------------------------------------------
    // CORE SIMULATION
    // --------------------------------------------------------------------------

    private initializeMarket() {
        Object.values(MARKET_ITEMS).forEach(item => {
            this.state.inventory[item.id] = 1000; // Initial market depth
            this.state.prices[item.id] = item.basePrice;
            this.state.trend[item.id] = 'stable';
            this.state.history[item.id] = [item.basePrice];
        });
    }

    /**
     * Advances the economic simulation by one day.
     * Simulates NPC trades, consumption, and news effects.
     */
    public advanceDay(currentSeason: Season) {
        this.day++;
        this.season = currentSeason;

        // 1. Simulate NPC Consumption (Demand)
        this.simulateConsumption();

        // 2. Simulate NPC Production (Supply)
        this.simulateProduction();

        // 3. Process Active Events
        this.processEvents();

        // 4. Recalculate Prices
        this.updatePrices();

        // 5. Generate New Contracts
        this.generateContracts();

        // 6. Generate News (Rarely)
        if (Math.random() < 0.1) this.generateNewsEvent();
    }

    private simulateConsumption() {
        // Defines how much the town "eats/uses" per day
        // Staples are consumed heavily, luxuries rarely
        Object.values(MARKET_ITEMS).forEach(item => {
            let consumption = 0;
            if (item.category === 'staple') consumption = 50 + Math.random() * 20;
            else if (item.category === 'material') consumption = 30 + Math.random() * 15;
            else if (item.category === 'luxury') consumption = 5 + Math.random() * 5;

            // Reduce market inventory (Demand reduces supply, increasing price pressure)
            this.state.inventory[item.id] = Math.max(0, this.state.inventory[item.id] - consumption);
        });
    }

    private simulateProduction() {
        // Defines what rival farmers bring to market
        // Seasonality affects production volume
        Object.values(MARKET_ITEMS).forEach(item => {
            let production = 0;

            // Seasonal Logic
            const isInSeason = this.checkSeasonality(item.id, this.season);

            if (item.category === 'staple') production = 55 + (Math.random() * 20); // Slightly more than consumption usually
            else if (item.category === 'luxury' && isInSeason) production = 20; // High influx in season

            // Add to inventory (Supply increases stock, decreasing price pressure)
            this.state.inventory[item.id] += production;
        });
    }

    private updatePrices() {
        Object.values(MARKET_ITEMS).forEach(item => {
            const currentInv = this.state.inventory[item.id];
            const baselineInv = 1000; // equilibrium point

            // Price Elasticity Formula:
            // Price moves opposite to Inventory delta, scaled by Elasticity
            // NewPrice = Base * (1 + ( (BaseInv - CurrInv) / BaseInv ) * Elasticity )

            const inventoryDeltaRatio = (baselineInv - currentInv) / baselineInv;
            const priceChange = inventoryDeltaRatio * item.elasticity;

            // Add random volatility noise
            const noise = (Math.random() - 0.5) * item.volatility;

            let newPrice = item.basePrice * (1 + priceChange + noise);

            // Clamp prices (min 10% of base, max 500% of base)
            newPrice = Math.max(item.basePrice * 0.1, Math.min(item.basePrice * 5, newPrice));

            // Trend Detection
            const oldPrice = this.state.prices[item.id];
            if (newPrice > oldPrice * 1.05) this.state.trend[item.id] = 'up';
            else if (newPrice < oldPrice * 0.95) this.state.trend[item.id] = 'down';
            else this.state.trend[item.id] = 'stable';

            this.state.prices[item.id] = Math.round(newPrice);

            // Log History
            this.state.history[item.id].push(Math.round(newPrice));
            if (this.state.history[item.id].length > 7) this.state.history[item.id].shift();
        });
    }

    // --------------------------------------------------------------------------
    // PLAYER INTERACTION
    // --------------------------------------------------------------------------

    public getPrice(itemId: string): number {
        return this.state.prices[itemId] || 0;
    }

    public getTrend(itemId: string): 'up' | 'down' | 'stable' {
        return this.state.trend[itemId] || 'stable';
    }

    /**
     * Player sells an item to the market.
     * Immediately affects simulated inventory, potentially crashing the price for next tick.
     */
    public sellItem(itemId: string, quantity: number): number {
        // Price uses sales already on the books. This sale counts toward the next quote.
        const price = this.getPrice(itemId) * this.getDemandMultiplier(itemId);
        const totalValue = price * quantity;
        this.noteSale(itemId, quantity);

        // Player dumping stock increases market inventory
        if (this.state.inventory[itemId]) {
            this.state.inventory[itemId] += quantity;

            // If player dumps a HUGE amount (e.g. > 10% of market depth), 
            // apply instantaneous slippage (price drop during sale)
            // For now, we'll keep it simple and just affect next day's price.
        }

        return totalValue;
    }

    /** Record a completed player sale on the current in-game day. */
    public noteSale(itemId: string, quantity: number): void {
        const qty = Math.floor(quantity);
        if (!itemId || qty <= 0) return;
        this.sales.push({ itemId, day: this.day, quantity: qty });
        this.sales = this.sales.filter((sale) => this.day - sale.day < DEMAND_WINDOW_DAYS);
    }

    public getRecentSoldVolume(itemId: string): number {
        return volumeSoldInWindow(
            this.sales.filter((sale) => sale.itemId === itemId),
            this.day,
        );
    }

    /** 1 when the crop was not sold in the window; lower after heavy sales. */
    public getDemandMultiplier(itemId: string): number {
        return demandMultiplierForVolume(this.getRecentSoldVolume(itemId));
    }

    // --------------------------------------------------------------------------
    // HELPERS
    // --------------------------------------------------------------------------

    private checkSeasonality(itemId: string, season: Season): boolean {
        // Simple mock logic for seasonality
        if (season === 'autumn' && itemId === 'pumpkin') return true;
        if (season === 'summer' && itemId === 'strawberry') return true;
        return false;
    }

    private generateNewsEvent() {
        // Placeholder for news generation
        this.news.push({
            id: Date.now().toString(),
            headline: "Bumper Harvest!",
            description: "Local farmers report record wheat yields. Expect prices to drop.",
            effect: (sys) => sys.state.inventory['wheat'] += 500,
            duration: 3,
            active: true
        });
    }

    private processEvents() {
        this.news.forEach(event => {
            if (event.active) {
                event.effect(this);
                event.duration--;
                if (event.duration <= 0) event.active = false;
            }
        });
        this.news = this.news.filter(n => n.active);
    }

    private generateContracts() {
        if (this.activeContracts.length < 3 && Math.random() > 0.7) {
            // Generate a new simple contract
            // In real impl, would pick random item
        }
    }

    // --------------------------------------------------------------------------
    // PERSISTENCE
    // --------------------------------------------------------------------------

    public getSaveData() {
        return {
            inventory: this.state.inventory,
            prices: this.state.prices,
            history: this.state.history,
            sales: this.sales,
            day: this.day,
        };
    }

    public loadSaveData(data: any) {
        if (data) {
            if (data.inventory) this.state.inventory = data.inventory;
            if (data.prices) this.state.prices = data.prices;
            if (data.history) this.state.history = data.history;
            if (Array.isArray(data.sales)) this.sales = data.sales;
            if (typeof data.day === 'number') this.day = data.day;
        }
    }
}
