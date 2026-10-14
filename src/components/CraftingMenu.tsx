import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useGameStore, CRAFTING_RECIPES } from '../store/gameStore';
import { countCraftingInput, hasCraftingInputs } from '../store/craftingInputs';
import { ToolType, ToolTier, CraftingRecipe } from '../types/game';
import { filterCraftingRecipesByLevel, recipesAvailableLabel } from './craftingRecipeFilter';

interface CraftingMenuProps {
    onClose: () => void;
}

export const CraftingMenu: React.FC<CraftingMenuProps> = ({ onClose }) => {
    const { world, craftItem, repairTool } = useGameStore();

    const player = world?.player;
    if (!player) return null;

    const availableRecipes = filterCraftingRecipesByLevel(
        CRAFTING_RECIPES,
        world?.player.level,
    );

    const handleCraft = (recipeId: string) => {
        craftItem(recipeId);
    };

    const handleRepair = (toolType: ToolType) => {
        repairTool(toolType);
    };

    const renderRecipeItem = (recipe: CraftingRecipe) => {
        const canCraft = player.level >= recipe.requiredLevel &&
            player.coins >= recipe.cost &&
            hasCraftingInputs(player.inventory, recipe.inputs);

        return (
            <View key={recipe.id} style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeCost}>{recipe.cost} coins</Text>
                </View>
                <Text style={styles.recipeDesc}>{recipe.description}</Text>

                <View style={styles.inputsContainer}>
                    {Object.entries(recipe.inputs).map(([id, qty]) => {
                        const have = countCraftingInput(player.inventory, id);
                        const hasEnough = have >= qty;
                        return (
                            <Text key={id} style={[styles.inputItem, !hasEnough && styles.missingInput]}>
                                {id}: {have}/{qty}
                            </Text>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[styles.craftButton, !canCraft && styles.disabledButton]}
                    onPress={() => handleCraft(recipe.id)}
                    disabled={!canCraft}
                >
                    <Text style={styles.craftButtonText}>Craft</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Crafting & Upgrades</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>X</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tool Upgrades</Text>
                        <Text style={styles.recipeCount}>{recipesAvailableLabel(availableRecipes.length)}</Text>
                        <ScrollView style={styles.list}>
                            {availableRecipes.map(renderRecipeItem)}
                        </ScrollView>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Repairs</Text>
                        <ScrollView style={styles.list}>
                            {Object.values(player.tools).map(tool => {
                                if (!tool) return null;
                                const missing = tool.maxDurability - tool.durability;
                                const cost = missing; // 1 per point
                                const canRepair = missing > 0 && player.coins >= cost;

                                if (missing <= 0) return null;

                                return (
                                    <View key={tool.id} style={styles.repairRow}>
                                        <Text style={styles.toolName}>{tool.name}</Text>
                                        <Text style={styles.durability}>{(tool.durability / tool.maxDurability * 100).toFixed(0)}%</Text>
                                        <TouchableOpacity
                                            style={[styles.repairButton, !canRepair && styles.disabledButton]}
                                            onPress={() => handleRepair(tool.toolType)}
                                            disabled={!canRepair}
                                        >
                                            <Text style={styles.repairButtonText}>Repair ({cost}c)</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                            {Object.values(player.tools).every(t => t && t.durability === t.maxDurability) && (
                                <Text style={styles.emptyText}>All tools in perfect condition.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    container: {
        width: '80%',
        height: '80%',
        backgroundColor: '#F5DEB3',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderWidth: 4,
        borderColor: '#8B4513',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#D2691E',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8B4513',
        fontFamily: 'System',
    },
    closeButton: {
        padding: 10,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    section: {
        flex: 1,
        padding: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A0522D',
        marginBottom: 10,
    },
    recipeCount: {
        fontSize: 14,
        color: '#5D4037',
        marginBottom: 10,
    },
    separator: {
        width: 2,
        backgroundColor: '#D2691E',
        marginHorizontal: 10,
    },
    list: {
        flex: 1,
    },
    recipeCard: {
        backgroundColor: '#FFF8DC',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#DEB887',
    },
    recipeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    recipeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    recipeCost: {
        fontSize: 14,
        color: '#D4AF37',
        fontWeight: 'bold',
    },
    recipeDesc: {
        fontSize: 12,
        color: '#8D6E63',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    inputsContainer: {
        marginBottom: 8,
    },
    inputItem: {
        fontSize: 12,
        color: '#5D4037',
    },
    missingInput: {
        color: '#D32F2F',
    },
    craftButton: {
        backgroundColor: '#4CAF50',
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    craftButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#BDBDBD',
    },
    repairRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    toolName: {
        fontSize: 14,
        color: '#5D4037',
        flex: 1,
    },
    durability: {
        fontSize: 12,
        color: '#757575',
        marginRight: 10,
    },
    repairButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    repairButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyText: {
        fontStyle: 'italic',
        color: '#9E9E9E',
        textAlign: 'center',
        marginTop: 20,
    }
});
