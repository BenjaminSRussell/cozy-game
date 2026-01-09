import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage, Item, ItemType } from '../types/game';

const MARKET_ITEMS: { [key: string]: { basePrice: number; demandMultiplier: number; icon: string } } = {
  // Crops - Common crops worth 1-5 bucks
  wheat: { basePrice: 2, demandMultiplier: 1.0, icon: '🌾' },
  carrot: { basePrice: 3, demandMultiplier: 1.2, icon: '🥕' },
  tomato: { basePrice: 4, demandMultiplier: 0.9, icon: '🍅' },
  corn: { basePrice: 5, demandMultiplier: 1.1, icon: '🌽' },
  potato: { basePrice: 3, demandMultiplier: 0.8, icon: '🥔' },
  lettuce: { basePrice: 2, demandMultiplier: 1.3, icon: '🥬' },
  onion: { basePrice: 3, demandMultiplier: 0.9, icon: '🧅' },
  garlic: { basePrice: 4, demandMultiplier: 1.4, icon: '🧄' },
  peppers: { basePrice: 5, demandMultiplier: 1.0, icon: '🌶️' },
  pumpkin: { basePrice: 8, demandMultiplier: 0.7, icon: '🎃' },
  strawberries: { basePrice: 6, demandMultiplier: 1.5, icon: '🍓' },
  blueberries: { basePrice: 7, demandMultiplier: 1.6, icon: '🫐' },
  
  // Ore - More valuable but still reasonable (5-20 bucks)
  copper: { basePrice: 5, demandMultiplier: 1.0, icon: '🟠' },
  iron: { basePrice: 8, demandMultiplier: 0.9, icon: '⚫' },
  silver: { basePrice: 12, demandMultiplier: 1.3, icon: '⚪' },
  gold: { basePrice: 18, demandMultiplier: 1.5, icon: '🟡' },
  diamond: { basePrice: 20, demandMultiplier: 2.0, icon: '💎' },
  coal: { basePrice: 3, demandMultiplier: 0.8, icon: '⚫' },
  
  // Wood - Common materials (1-5 bucks)
  oak: { basePrice: 4, demandMultiplier: 0.8, icon: '🪵' },
  pine: { basePrice: 3, demandMultiplier: 0.9, icon: '🌲' },
  maple: { basePrice: 5, demandMultiplier: 1.1, icon: '🍁' },
  birch: { basePrice: 3, demandMultiplier: 0.9, icon: '🌳' },
  
  // Special items - Premium prices (10-20 bucks)
  honey: { basePrice: 15, demandMultiplier: 1.4, icon: '🍯' },
  eggs: { basePrice: 8, demandMultiplier: 1.2, icon: '🥚' },
  milk: { basePrice: 6, demandMultiplier: 1.1, icon: '🥛' },
  wool: { basePrice: 10, demandMultiplier: 1.3, icon: '🐑' },
};

interface MarketplaceScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({ visible, onClose }) => {
  const { world, addCoins, removeItem, getInventoryItem } = useGameStore();
  const [selectedTab, setSelectedTab] = useState<'crops' | 'ore' | 'wood' | 'all'>('all');
  const [marketPrices, setMarketPrices] = useState(MARKET_ITEMS);
  const [refreshTime, setRefreshTime] = useState(300); // 5 minutes until next price refresh

  // Update market prices periodically
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      updateMarketPrices();
      setRefreshTime(300);
    }, 30000); // Update every 30 seconds for demo (would be 5 minutes in production)

    const countdownInterval = setInterval(() => {
      setRefreshTime(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [visible]);

  const updateMarketPrices = () => {
    setMarketPrices(prev => {
      const newPrices = { ...prev };
      Object.keys(newPrices).forEach(item => {
        // Random price fluctuation ±20%
        const fluctuation = 0.8 + Math.random() * 0.4;
        newPrices[item] = {
          ...newPrices[item],
          demandMultiplier: fluctuation
        };
      });
      return newPrices;
    });
  };

  const getSellableItems = () => {
    if (!world) return [];

    const items: Array<{
      id: string;
      name: string;
      type: 'crop' | 'ore' | 'wood';
      quantity: number;
      basePrice: number;
      currentPrice: number;
      icon: string;
      quality?: number;
    }> = [];

    // Add harvestable crops from farm plots
    world.farmPlots.forEach(plot => {
      if (plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
        const marketItem = marketPrices[plot.crop.type];
        items.push({
          id: `crop_${plot.id}`,
          name: plot.crop.type.charAt(0).toUpperCase() + plot.crop.type.slice(1),
          type: 'crop',
          quantity: 1,
          basePrice: marketItem.basePrice,
          currentPrice: Math.round(marketItem.basePrice * marketItem.demandMultiplier),
          icon: marketItem.icon,
          quality: Math.round(plot.crop.health)
        });
      }
    });

    // Add inventory items
    world.player.inventory.forEach(item => {
      if (item.type === ItemType.CROP || item.type === ItemType.ORE || item.type === ItemType.WOOD) {
        const marketItem = MARKET_ITEMS[item.name.toLowerCase()];
        if (marketItem) {
          items.push({
            id: item.id,
            name: item.name,
            type: item.type.toLowerCase() as 'crop' | 'ore' | 'wood',
            quantity: item.quantity,
            basePrice: marketItem.basePrice,
            currentPrice: Math.round(marketItem.basePrice * marketItem.demandMultiplier),
            icon: marketItem.icon,
            quality: 100 // Default quality for inventory items
          });
        }
      }
    });

    return items;
  };

  const getFilteredItems = () => {
    const allItems = getSellableItems();
    if (selectedTab === 'all') return allItems;
    return allItems.filter(item => item.type === selectedTab);
  };

  const sellItem = (item: any) => {
    if (!world) return;

    const totalPrice = item.currentPrice * item.quantity;
    
    // Quality bonus
    let qualityBonus = 1;
    if (item.quality && item.quality > 80) {
      qualityBonus = 1.2; // 20% bonus for high quality
    } else if (item.quality && item.quality > 60) {
      qualityBonus = 1.1; // 10% bonus for medium quality
    }

    const finalPrice = Math.round(totalPrice * qualityBonus);

    Alert.alert(
      'Confirm Sale',
      `Sell ${item.quantity}x ${item.name} for ${finalPrice} bucks?${qualityBonus > 1 ? `\n\nQuality bonus: +${Math.round((qualityBonus - 1) * 100)}%` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          onPress: () => {
            // Remove from inventory or harvest crop
            if (item.id.startsWith('crop_')) {
              // Harvest the crop
              const plotId = item.id.replace('crop_', '');
              const plot = world.farmPlots.find(p => p.id === plotId);
              if (plot && plot.crop) {
                // Reset plot to empty
                plot.crop = undefined;
              }
            } else {
              // Remove from inventory
              removeItem(item.id, item.quantity);
            }

            // Add coins
            addCoins(finalPrice);
            
            // Show success message
            Alert.alert('Sold!', `Earned ${finalPrice} bucks from selling ${item.quantity}x ${item.name}`);
          }
        }
      ]
    );
  };

  const sellAll = () => {
    const items = getFilteredItems();
    if (items.length === 0) {
      Alert.alert('No Items', 'No items available to sell in this category.');
      return;
    }

    const totalValue = items.reduce((sum, item) => {
      let qualityBonus = 1;
      if (item.quality && item.quality > 80) qualityBonus = 1.2;
      else if (item.quality && item.quality > 60) qualityBonus = 1.1;
      
      return sum + (item.currentPrice * item.quantity * qualityBonus);
    }, 0);

    Alert.alert(
      'Sell All Items',
      `Sell all ${items.length} items for ${Math.round(totalValue)} bucks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell All',
          onPress: () => {
            // Process all sales
            items.forEach(item => {
              if (item.id.startsWith('crop_')) {
                const plotId = item.id.replace('crop_', '');
                const plot = world?.farmPlots.find(p => p.id === plotId);
                if (plot && plot.crop) {
                  plot.crop = undefined;
                }
              } else {
                removeItem(item.id, item.quantity);
              }
            });

            addCoins(Math.round(totalValue));
            Alert.alert('Success!', `Sold all items for ${Math.round(totalValue)} bucks!`);
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriceTrend = (item: any) => {
    const basePrice = item.basePrice;
    const currentPrice = item.currentPrice;
    const trend = currentPrice > basePrice ? '📈' : currentPrice < basePrice ? '📉' : '➡️';
    const percentChange = Math.round(((currentPrice - basePrice) / basePrice) * 100);
    return { trend, percentChange };
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏪 Marketplace</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Market Status */}
        <View style={styles.marketStatus}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Your Bucks:</Text>
            <Text style={styles.statusValue}>💰 {world?.player.coins || 0}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Price Refresh:</Text>
            <Text style={styles.statusValue}>🕐 {formatTime(refreshTime)}</Text>
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.tabs}>
          {(['all', 'crops', 'ore', 'wood'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Items List */}
        <ScrollView style={styles.itemsContainer}>
          {getFilteredItems().length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items to sell in this category</Text>
              <Text style={styles.emptySubtext}>Harvest crops or mine ore to get started!</Text>
            </View>
          ) : (
            getFilteredItems().map(item => {
              const { trend, percentChange } = getPriceTrend(item);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                      {item.quality && (
                        <Text style={styles.itemQuality}>Quality: {item.quality}%</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.priceInfo}>
                    <View style={styles.priceRow}>
                      <Text style={styles.currentPrice}>{item.currentPrice} bucks</Text>
                      <Text style={styles.priceTrend}>
                        {trend} {percentChange}%
                      </Text>
                    </View>
                    <Text style={styles.totalPrice}>
                      Total: {item.currentPrice * item.quantity} bucks
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.sellButton}
                    onPress={() => sellItem(item)}
                  >
                    <Text style={styles.sellButtonText}>Sell</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={updateMarketPrices}>
            <Text style={styles.refreshButtonText}>🔄 Refresh Prices</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sellAllButton} onPress={sellAll}>
            <Text style={styles.sellAllButtonText}>💰 Sell All</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8B4513',
    borderBottomWidth: 2,
    borderBottomColor: '#654321',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  marketStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8B4513',
    backgroundColor: '#F5F5DC',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
  itemsContainer: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  itemQuality: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginRight: 15,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 8,
  },
  priceTrend: {
    fontSize: 12,
    color: '#666666',
  },
  totalPrice: {
    fontSize: 12,
    color: '#666666',
  },
  sellButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  sellButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sellAllButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sellAllButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
