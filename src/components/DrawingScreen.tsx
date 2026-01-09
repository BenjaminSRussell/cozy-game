import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { ItemType } from '../types/game';

/** Screen width from device dimensions */
const SCREEN_WIDTH = Dimensions.get('window').width;

/** Canvas width with padding adjustment */
const CANVAS_WIDTH = SCREEN_WIDTH - 20;

/** Canvas height for drawing area */
const CANVAS_HEIGHT = 300;

/**
 * Props for the DrawingScreen component
 */
interface DrawingScreenProps {
  /** Callback function when user closes the drawing screen */
  onClose: () => void;
}

/**
 * Custom furniture drawing component - allows players to design furniture
 *
 * Features:
 * - HTML5 Canvas-based drawing interface
 * - 8-color palette for creative expression
 * - 5 brush size options (3px to 15px)
 * - Touch and mouse input support
 * - 20px grid reference for alignment
 * - Save drawings as furniture items to inventory
 * - Base64 PNG encoding for persistence
 *
 * @param props - Component props
 * @param props.onClose - Callback when drawer is closed or furniture is saved
 * @returns React component displaying the drawing interface
 */
export const DrawingScreen: React.FC<DrawingScreenProps> = ({ onClose }) => {
  const { world, addItem } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [brushSize, setBrushSize] = useState(5);
  const [notification, setNotification] = useState('');

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const brushSizes = [3, 5, 8, 12, 15];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid for reference
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    draw(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(touch.clientX - rect.left, touch.clientY - rect.top, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.fill();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(touch.clientX - rect.left, touch.clientY - rect.top, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.fill();
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.fill();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw grid
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  };

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get canvas image data
    const imageData = canvas.toDataURL('image/png');

    // Add to inventory
    const newItem = {
      id: `furniture_${Date.now()}`,
      name: `Custom Furniture ${Math.floor(Math.random() * 1000)}`,
      type: ItemType.FURNITURE,
      quantity: 1,
      sellValue: 100,
      spriteId: imageData,
      rarity: 'uncommon' as const,
    };

    addItem(newItem);
    setNotification('✨ Furniture saved to inventory!');
    setTimeout(() => setNotification(''), 2000);
    setTimeout(() => onClose(), 2500);
  };

  if (!world) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Furniture Designer</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {notification && <Text style={styles.notification}>{notification}</Text>}

      <View style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            border: '2px solid #8B4513',
            borderRadius: '8px',
            cursor: 'crosshair',
            display: 'block',
            touchAction: 'none',
          }}
        />
      </View>

      <View style={styles.controlsSection}>
        <Text style={styles.controlLabel}>🎨 Colors:</Text>
        <View style={styles.colorGrid}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      <View style={styles.controlsSection}>
        <Text style={styles.controlLabel}>✏️ Brush Size:</Text>
        <View style={styles.brushGrid}>
          {brushSizes.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.brushOption,
                brushSize === size && styles.brushSelected,
              ]}
              onPress={() => setBrushSize(size)}
            >
              <Text style={styles.brushText}>{size}px</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.button} onPress={handleClear}>
          <Text style={styles.buttonEmoji}>🗑️</Text>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveDrawing}>
          <Text style={styles.buttonEmoji}>💾</Text>
          <Text style={styles.buttonText}>Save Furniture</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.closeButtonStyle]} onPress={onClose}>
          <Text style={styles.buttonEmoji}>❌</Text>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Tips:</Text>
        <Text style={styles.tipsText}>• Draw your custom furniture design</Text>
        <Text style={styles.tipsText}>• Choose colors and brush sizes</Text>
        <Text style={styles.tipsText}>• Save to inventory when done</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#D4A574',
  },
  closeText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  notification: {
    backgroundColor: '#90EE90',
    color: '#2D5016',
    padding: 8,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  canvasContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  controlsSection: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#8B4513',
    borderWidth: 3,
  },
  brushGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  brushOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8D7C3',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A0826D',
  },
  brushSelected: {
    backgroundColor: '#D4A574',
    borderColor: '#8B4513',
    borderWidth: 3,
  },
  brushText: {
    fontSize: 11,
    color: '#654321',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#D4A574',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#90EE90',
  },
  closeButtonStyle: {
    backgroundColor: '#FFB6C6',
  },
  buttonEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
  },
  tipsSection: {
    backgroundColor: '#F5DEB3',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 10,
    color: '#654321',
    marginVertical: 2,
  },
});
