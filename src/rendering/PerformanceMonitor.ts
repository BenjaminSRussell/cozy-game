/**
 * Performance Monitoring and Optimization System
 * 
 * Tracks rendering performance, identifies bottlenecks, and provides
 * automatic optimization suggestions and adjustments.
 */

export interface PerformanceMetrics {
  frameTime: number;
  fps: number;
  drawCalls: number;
  objectsRendered: number;
  texturesLoaded: number;
  memoryUsage: number;
  gpuMemoryUsage?: number;
  cpuUsage?: number;
}

export interface PerformanceThresholds {
  targetFPS: number;
  minFPS: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metrics: Partial<PerformanceMetrics>;
  suggestions: string[];
}

export interface OptimizationProfile {
  name: string;
  enabled: boolean;
  priority: number;
  apply: (metrics: PerformanceMetrics) => void;
  conditions: (metrics: PerformanceMetrics) => boolean;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private frameHistory: number[] = [];
  private alerts: PerformanceAlert[] = [];
  private optimizationProfiles: OptimizationProfile[] = [];
  private lastUpdateTime: number = 0;
  private frameCount: number = 0;
  private isMonitoring: boolean = false;
  private monitoringInterval: number = 1000; // 1 second
  private maxHistorySize: number = 60; // 60 seconds of history

  private constructor() {
    this.metrics = {
      frameTime: 0,
      fps: 0,
      drawCalls: 0,
      objectsRendered: 0,
      texturesLoaded: 0,
      memoryUsage: 0
    };

    this.thresholds = {
      targetFPS: 60,
      minFPS: 30,
      maxFrameTime: 33.33, // 30 FPS
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      maxDrawCalls: 1000
    };

    this.initializeOptimizationProfiles();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeOptimizationProfiles(): void {
    // Reduce rendering quality when FPS is low
    this.optimizationProfiles.push({
      name: 'reduce_quality',
      enabled: true,
      priority: 1,
      conditions: (metrics) => metrics.fps < this.thresholds.minFPS,
      apply: (metrics) => {
        this.addAlert({
          type: 'warning',
          message: 'Low FPS detected. Consider reducing render quality.',
          metrics: { fps: metrics.fps },
          suggestions: [
            'Reduce particle effects',
            'Lower texture resolution',
            'Enable more aggressive culling',
            'Reduce number of animated objects'
          ]
        });
      }
    });

    // Memory usage optimization
    this.optimizationProfiles.push({
      name: 'memory_cleanup',
      enabled: true,
      priority: 2,
      conditions: (metrics) => metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8,
      apply: (metrics) => {
        this.addAlert({
          type: 'warning',
          message: 'High memory usage detected.',
          metrics: { memoryUsage: metrics.memoryUsage },
          suggestions: [
            'Unload unused textures',
            'Clear texture cache',
            'Reduce texture resolution',
            'Implement texture streaming'
          ]
        });
      }
    });

    // Draw call optimization
    this.optimizationProfiles.push({
      name: 'draw_call_optimization',
      enabled: true,
      priority: 3,
      conditions: (metrics) => metrics.drawCalls > this.thresholds.maxDrawCalls,
      apply: (metrics) => {
        this.addAlert({
          type: 'info',
          message: 'High draw call count. Batching could improve performance.',
          metrics: { drawCalls: metrics.drawCalls },
          suggestions: [
            'Enable sprite batching',
            'Group similar objects',
            'Use texture atlases',
            'Reduce state changes'
          ]
        });
      }
    });
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastUpdateTime = performance.now();
    this.frameCount = 0;
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Update metrics for current frame
   */
  public updateMetrics(frameMetrics: Partial<PerformanceMetrics>): void {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    
    // Update frame time
    this.metrics.frameTime = frameMetrics.frameTime || 0;
    
    // Calculate FPS
    this.frameCount++;
    if (deltaTime >= this.monitoringInterval) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastUpdateTime = currentTime;
      
      // Add to history
      this.frameHistory.push(this.metrics.fps);
      if (this.frameHistory.length > this.maxHistorySize) {
        this.frameHistory.shift();
      }
      
      // Check for performance issues
      this.checkPerformanceIssues();
    }

    // Update other metrics
    Object.assign(this.metrics, frameMetrics);
  }

  /**
   * Check for performance issues and apply optimizations
   */
  private checkPerformanceIssues(): void {
    // Sort optimization profiles by priority
    const sortedProfiles = this.optimizationProfiles
      .filter(profile => profile.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Apply optimizations that meet conditions
    for (const profile of sortedProfiles) {
      if (profile.conditions(this.metrics)) {
        profile.apply(this.metrics);
      }
    }

    // Check for critical performance issues
    if (this.metrics.fps < this.thresholds.minFPS / 2) {
      this.addAlert({
        type: 'error',
        message: 'Critical performance issue detected!',
        metrics: { fps: this.metrics.fps },
        suggestions: [
          'Immediate optimization required',
          'Consider reducing render resolution',
          'Disable non-essential effects',
          'Profile for specific bottlenecks'
        ]
      });
    }
  }

  /**
   * Add a performance alert
   */
  private addAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const fullAlert: PerformanceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };

    this.alerts.push(fullAlert);
    
    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Log to console
    console.warn(`[Performance Alert] ${alert.message}`, alert.metrics);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get FPS history
   */
  public getFPSHistory(): number[] {
    return [...this.frameHistory];
  }

  /**
   * Get recent alerts
   */
  public getAlerts(limit?: number): PerformanceAlert[] {
    const alerts = [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Clear alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    let score = 100;
    
    // FPS score (40% weight)
    const fpsScore = Math.min(100, (this.metrics.fps / this.thresholds.targetFPS) * 100);
    score = score * 0.6 + fpsScore * 0.4;
    
    // Frame time score (30% weight)
    const frameTimeScore = Math.max(0, 100 - (this.metrics.frameTime / this.thresholds.maxFrameTime) * 100);
    score = score * 0.7 + frameTimeScore * 0.3;
    
    // Memory score (20% weight)
    const memoryScore = Math.max(0, 100 - (this.metrics.memoryUsage / this.thresholds.maxMemoryUsage) * 100);
    score = score * 0.8 + memoryScore * 0.2;
    
    // Draw call score (10% weight)
    const drawCallScore = Math.max(0, 100 - (this.metrics.drawCalls / this.thresholds.maxDrawCalls) * 100);
    score = score * 0.9 + drawCallScore * 0.1;
    
    return Math.round(score);
  }

  /**
   * Get performance grade
   */
  public getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const score = this.getPerformanceScore();
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get detailed performance report
   */
  public getPerformanceReport(): {
    summary: {
      grade: string;
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    };
    metrics: PerformanceMetrics;
    trends: {
      fps: 'improving' | 'stable' | 'declining';
      memory: 'stable' | 'increasing' | 'decreasing';
    };
    recommendations: string[];
    alerts: PerformanceAlert[];
  } {
    const score = this.getPerformanceScore();
    const grade = this.getPerformanceGrade();
    
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 80) status = 'good';
    else if (score >= 70) status = 'fair';
    else if (score >= 60) status = 'poor';
    else status = 'critical';

    // Calculate trends
    const recentHistory = this.frameHistory.slice(-10);
    const olderHistory = this.frameHistory.slice(-20, -10);
    
    let fpsTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentHistory.length > 0 && olderHistory.length > 0) {
      const recentAvg = recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length;
      const olderAvg = olderHistory.reduce((a, b) => a + b, 0) / olderHistory.length;
      
      if (recentAvg > olderAvg + 5) fpsTrend = 'improving';
      else if (recentAvg < olderAvg - 5) fpsTrend = 'declining';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (this.metrics.fps < this.thresholds.targetFPS) {
      recommendations.push('Consider optimizing rendering pipeline');
    }
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls * 0.8) {
      recommendations.push('Enable sprite batching to reduce draw calls');
    }
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.7) {
      recommendations.push('Monitor memory usage and consider texture optimization');
    }

    return {
      summary: {
        grade,
        score,
        status
      },
      metrics: this.metrics,
      trends: {
        fps: fpsTrend,
        memory: 'stable' // Would need memory history for accurate trend
      },
      recommendations,
      alerts: this.getAlerts(5)
    };
  }

  /**
   * Set performance thresholds
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    Object.assign(this.thresholds, thresholds);
  }

  /**
   * Add custom optimization profile
   */
  public addOptimizationProfile(profile: OptimizationProfile): void {
    this.optimizationProfiles.push(profile);
  }

  /**
   * Remove optimization profile
   */
  public removeOptimizationProfile(name: string): boolean {
    const index = this.optimizationProfiles.findIndex(p => p.name === name);
    if (index !== -1) {
      this.optimizationProfiles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable optimization profile
   */
  public setOptimizationProfileEnabled(name: string, enabled: boolean): boolean {
    const profile = this.optimizationProfiles.find(p => p.name === name);
    if (profile) {
      profile.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metrics = {
      frameTime: 0,
      fps: 0,
      drawCalls: 0,
      objectsRendered: 0,
      texturesLoaded: 0,
      memoryUsage: 0
    };
    this.frameHistory = [];
    this.alerts = [];
    this.frameCount = 0;
    this.lastUpdateTime = performance.now();
  }

  /**
   * Export performance data
   */
  public exportData(): {
    timestamp: number;
    metrics: PerformanceMetrics;
    history: number[];
    alerts: PerformanceAlert[];
    thresholds: PerformanceThresholds;
  } {
    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      history: this.frameHistory,
      alerts: this.alerts,
      thresholds: this.thresholds
    };
  }
}
