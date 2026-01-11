/**
 * Inventory Manager - Player storage and item management
 * 
 * Handles player inventory, storage, item stacking, and organization
 * based on cozy game patterns from Animal Crossing and Stardew Valley.
 */

import { Item, ItemType } from '../types/game';

// ============================================================================
// INVENTORY SYSTEM TYPES
// ============================================================================

export interface InventorySlot {
  id: string;
  item: Item | null;
  quantity: number;
  maxStack: number;
  locked: boolean; // Prevents item from being moved/sold
}

export interface Inventory {
  id: string;
  name: string;
  slots: InventorySlot[];
  maxSlots: number;
  type: InventoryType;
}

export enum InventoryType {
  PLAYER = 'player',
  STORAGE = 'storage',
  SHOP = 'shop',
  REFRIGERATOR = 'refrigerator',
  CHEST = 'chest',
}

export interface InventoryTransaction {
  type: 'add' | 'remove' | 'move' | 'swap';
  itemId: string;
  quantity: number;
  fromSlot?: string;
  toSlot?: string;
  timestamp: number;
  success: boolean;
  reason?: string;
}

export interface InventoryStats {
  totalItems: number;
  uniqueItems: number;
  usedSlots: number;
  freeSlots: number;
  totalValue: number;
  mostValuableItem: Item | null;
}

// ============================================================================
// INVENTORY MANAGER CLASS
// ============================================================================

export class InventoryManager {
  private inventories: Map<string, Inventory> = new Map();
  private transactions: InventoryTransaction[] = [];
  private readonly DEFAULT_MAX_SLOTS = 30;
  private readonly DEFAULT_MAX_STACK = 99;

  constructor() {
    this.initializePlayerInventory();
  }

  /**
   * Initialize player inventory with default slots
   */
  private initializePlayerInventory(): void {
    const playerInventory: Inventory = {
      id: 'player_main',
      name: 'Player Inventory',
      slots: this.createEmptySlots(this.DEFAULT_MAX_SLOTS),
      maxSlots: this.DEFAULT_MAX_SLOTS,
      type: InventoryType.PLAYER,
    };

    this.inventories.set('player_main', playerInventory);
  }

  /**
   * Create empty inventory slots
   */
  private createEmptySlots(count: number): InventorySlot[] {
    const slots: InventorySlot[] = [];
    for (let i = 0; i < count; i++) {
      slots.push({
        id: `slot_${i}`,
        item: null,
        quantity: 0,
        maxStack: this.DEFAULT_MAX_STACK,
        locked: false,
      });
    }
    return slots;
  }

  /**
   * Add item to inventory
   */
  public addItem(inventoryId: string, item: Item, quantity: number = 1): boolean {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) {
      this.recordTransaction('add', item.id, quantity, undefined, undefined, false, 'Inventory not found');
      return false;
    }

    // Try to stack with existing items first
    const remainingQuantity = this.stackItem(inventory, item, quantity);

    // If still have items, add to empty slots
    if (remainingQuantity > 0) {
      const success = this.addToEmptySlot(inventory, item, remainingQuantity);
      if (!success) {
        this.recordTransaction('add', item.id, quantity, undefined, undefined, false, 'No available slots');
        return false;
      }
    }

    this.recordTransaction('add', item.id, quantity, undefined, undefined, true);
    return true;
  }

  /**
   * Stack item with existing items in inventory
   */
  private stackItem(inventory: Inventory, item: Item, quantity: number): number {
    let remainingQuantity = quantity;

    for (const slot of inventory.slots) {
      if (remainingQuantity <= 0) break;

      if (slot.item && slot.item.id === item.id && !slot.locked) {
        const canAdd = Math.min(remainingQuantity, slot.maxStack - slot.quantity);
        slot.quantity += canAdd;
        remainingQuantity -= canAdd;
      }
    }

    return remainingQuantity;
  }

  /**
   * Add item to empty slot
   */
  private addToEmptySlot(inventory: Inventory, item: Item, quantity: number): boolean {
    const emptySlot = inventory.slots.find(slot => !slot.item && !slot.locked);
    if (!emptySlot) return false;

    emptySlot.item = { ...item };
    emptySlot.quantity = Math.min(quantity, emptySlot.maxStack);
    return true;
  }

  /**
   * Remove item from inventory
   */
  public removeItem(inventoryId: string, itemId: string, quantity: number = 1): boolean {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) {
      this.recordTransaction('remove', itemId, quantity, undefined, undefined, false, 'Inventory not found');
      return false;
    }

    let remainingQuantity = quantity;

    // Remove from slots starting from the end
    for (let i = inventory.slots.length - 1; i >= 0 && remainingQuantity > 0; i--) {
      const slot = inventory.slots[i];
      if (slot.item && slot.item.id === itemId && !slot.locked) {
        const canRemove = Math.min(remainingQuantity, slot.quantity);
        slot.quantity -= canRemove;
        remainingQuantity -= canRemove;

        // Clear slot if empty
        if (slot.quantity === 0) {
          slot.item = null;
        }
      }
    }

    const success = remainingQuantity === 0;
    this.recordTransaction('remove', itemId, quantity, undefined, undefined, success,
      success ? undefined : 'Insufficient items');

    return success;
  }

  /**
   * Move item between slots
   */
  public moveItem(inventoryId: string, fromSlotId: string, toSlotId: string): boolean {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return false;

    const fromSlot = inventory.slots.find(s => s.id === fromSlotId);
    const toSlot = inventory.slots.find(s => s.id === toSlotId);

    if (!fromSlot || !toSlot || fromSlot.locked || toSlot.locked) {
      return false;
    }

    // If target slot is empty, move item
    if (!toSlot.item) {
      toSlot.item = fromSlot.item;
      toSlot.quantity = fromSlot.quantity;
      fromSlot.item = null;
      fromSlot.quantity = 0;
    }
    // If target slot has same item, stack
    else if (fromSlot.item && toSlot.item && toSlot.item.id === fromSlot.item.id) {
      const canStack = Math.min(fromSlot.quantity, toSlot.maxStack - toSlot.quantity);
      toSlot.quantity += canStack;
      fromSlot.quantity -= canStack;

      if (fromSlot.quantity === 0) {
        fromSlot.item = null;
      }
    }
    // If target slot has different item, swap
    else {
      const tempItem = toSlot.item;
      const tempQuantity = toSlot.quantity;

      toSlot.item = fromSlot.item;
      toSlot.quantity = fromSlot.quantity;

      fromSlot.item = tempItem;
      fromSlot.quantity = tempQuantity;
    }

    this.recordTransaction('move', fromSlot.item?.id || '', 0, fromSlotId, toSlotId, true);
    return true;
  }

  /**
   * Get item quantity in inventory
   */
  public getItemQuantity(inventoryId: string, itemId: string): number {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return 0;

    return inventory.slots.reduce((total, slot) => {
      if (slot.item && slot.item.id === itemId) {
        return total + slot.quantity;
      }
      return total;
    }, 0);
  }

  /**
   * Check if inventory has space for item
   */
  public hasSpace(inventoryId: string, itemId: string, quantity: number = 1): boolean {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return false;

    // Check if can stack with existing items
    let stackableSpace = 0;
    for (const slot of inventory.slots) {
      if (slot.item && slot.item.id === itemId && !slot.locked) {
        stackableSpace += slot.maxStack - slot.quantity;
      }
    }

    if (stackableSpace >= quantity) return true;

    // Check empty slots
    const emptySlots = inventory.slots.filter(slot => !slot.item && !slot.locked).length;
    const remainingQuantity = Math.max(0, quantity - stackableSpace);
    const neededSlots = Math.ceil(remainingQuantity / this.DEFAULT_MAX_STACK);

    return emptySlots >= neededSlots;
  }

  /**
   * Get inventory statistics
   */
  public getInventoryStats(inventoryId: string): InventoryStats | null {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return null;

    const usedSlots = inventory.slots.filter(slot => slot.item !== null).length;
    const totalItems = inventory.slots.reduce((total, slot) => total + slot.quantity, 0);
    const uniqueItems = new Set(inventory.slots.filter(slot => slot.item).map(slot => slot.item!.id)).size;
    const totalValue = inventory.slots.reduce((total, slot) => {
      if (slot.item) {
        return total + (slot.item.sellValue * slot.quantity);
      }
      return total;
    }, 0);

    const mostValuableItem = inventory.slots.reduce((mostValuable, slot) => {
      if (!slot.item) return mostValuable;
      if (!mostValuable || slot.item.sellValue > mostValuable.sellValue) {
        return slot.item;
      }
      return mostValuable;
    }, null as Item | null);

    return {
      totalItems,
      uniqueItems,
      usedSlots,
      freeSlots: inventory.maxSlots - usedSlots,
      totalValue,
      mostValuableItem,
    };
  }

  /**
   * Get items by type
   */
  public getItemsByType(inventoryId: string, itemType: ItemType): Item[] {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return [];

    const items: Item[] = [];
    inventory.slots.forEach(slot => {
      if (slot.item && slot.item.type === itemType) {
        // Add multiple copies for quantity
        for (let i = 0; i < slot.quantity; i++) {
          items.push({ ...slot.item });
        }
      }
    });

    return items;
  }

  /**
   * Sort inventory by item property
   */
  public sortInventory(inventoryId: string, sortBy: 'name' | 'type' | 'value' | 'quantity'): void {
    const inventory = this.inventories.get(inventoryId);
    if (!inventory) return;

    // Extract all items from slots
    const itemsWithSlots: Array<{ item: Item; quantity: number; slotIndex: number }> = [];

    inventory.slots.forEach((slot, index) => {
      if (slot.item) {
        itemsWithSlots.push({
          item: slot.item,
          quantity: slot.quantity,
          slotIndex: index,
        });
        slot.item = null;
        slot.quantity = 0;
      }
    });

    // Sort items
    itemsWithSlots.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.item.name.localeCompare(b.item.name);
        case 'type':
          return a.item.type.localeCompare(b.item.type);
        case 'value':
          return b.item.sellValue - a.item.sellValue;
        case 'quantity':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

    // Place items back in slots
    itemsWithSlots.forEach(({ item, quantity }) => {
      this.addToEmptySlot(inventory, item, quantity);
    });
  }

  /**
   * Create new inventory
   */
  public createInventory(id: string, name: string, type: InventoryType, maxSlots: number = this.DEFAULT_MAX_SLOTS): boolean {
    if (this.inventories.has(id)) return false;

    const inventory: Inventory = {
      id,
      name,
      slots: this.createEmptySlots(maxSlots),
      maxSlots,
      type,
    };

    this.inventories.set(id, inventory);
    return true;
  }

  /**
   * Get inventory
   */
  public getInventory(inventoryId: string): Inventory | null {
    return this.inventories.get(inventoryId) || null;
  }

  /**
   * Get all inventories
   */
  public getAllInventories(): Inventory[] {
    return Array.from(this.inventories.values());
  }

  /**
   * Record transaction for history/auditing
   */
  private recordTransaction(
    type: 'add' | 'remove' | 'move' | 'swap',
    itemId: string,
    quantity: number,
    fromSlot?: string,
    toSlot?: string,
    success: boolean = true,
    reason?: string
  ): void {
    const transaction: InventoryTransaction = {
      type,
      itemId,
      quantity,
      fromSlot,
      toSlot,
      timestamp: Date.now(),
      success,
      reason,
    };

    this.transactions.push(transaction);

    // Keep only last 1000 transactions
    if (this.transactions.length > 1000) {
      this.transactions = this.transactions.slice(-1000);
    }
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(inventoryId?: string, limit: number = 50): InventoryTransaction[] {
    let transactions = [...this.transactions];

    // Filter by inventory if specified
    if (inventoryId) {
      // This is a simplified filter - in a real implementation, we'd need to track
      // which inventory each transaction affects
      transactions = transactions.slice(-limit);
    } else {
      transactions = transactions.slice(-limit);
    }

    return transactions.reverse(); // Most recent first
  }

  /**
   * Save inventory system state
   */
  public save(): { inventories: Record<string, Inventory>; transactions: InventoryTransaction[] } {
    const inventories: Record<string, Inventory> = {};
    this.inventories.forEach((inventory, id) => {
      inventories[id] = JSON.parse(JSON.stringify(inventory));
    });

    return {
      inventories,
      transactions: [...this.transactions],
    };
  }

  /**
   * Load inventory system state
   */
  public load(data: { inventories: Record<string, Inventory>; transactions: InventoryTransaction[] }): void {
    this.inventories.clear();
    Object.entries(data.inventories).forEach(([id, inventory]) => {
      this.inventories.set(id, inventory);
    });

    this.transactions = [...data.transactions];
  }
}
