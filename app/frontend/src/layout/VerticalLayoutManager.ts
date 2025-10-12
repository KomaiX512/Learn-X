/**
 * VERTICAL LAYOUT MANAGER
 * 
 * Manages spatial organization of visuals in vertical sections
 * Prevents overlapping and ensures clean visual hierarchy
 */

export interface VisualZone {
  id: string;
  type: 'title' | 'heading' | 'diagram' | 'description' | 'annotation';
  startY: number;
  height: number;
  usedHeight: number;
  padding: number;
  elements: Set<string>;
}

export interface LayoutConfig {
  canvasWidth: number;
  canvasHeight: number;
  minZoneHeight: number;
  maxZoneHeight: number;
  zonePadding: number;
  titleHeight: number;
  headingHeight: number;
  diagramHeight: number;
  descriptionHeight: number;
}

export class VerticalLayoutManager {
  private zones: Map<string, VisualZone> = new Map();
  private currentY: number = 0;
  private config: LayoutConfig;
  private canvasWidth: number;
  private canvasHeight: number;
  
  // Visual hierarchy settings
  private readonly HIERARCHY = {
    title: { fontSize: 36, spacing: 60, color: '#ffffff', fontWeight: 'bold' },
    heading1: { fontSize: 28, spacing: 40, color: '#e0e0e0', fontWeight: 'bold' },
    heading2: { fontSize: 22, spacing: 30, color: '#d0d0d0', fontWeight: '600' },
    heading3: { fontSize: 18, spacing: 24, color: '#c0c0c0', fontWeight: '600' },
    body: { fontSize: 16, spacing: 20, color: '#b0b0b0', fontWeight: 'normal' },
    annotation: { fontSize: 14, spacing: 16, color: '#a0a0a0', fontWeight: 'normal' },
    label: { fontSize: 16, spacing: 18, color: '#ffffff', fontWeight: 'normal' }
  };
  
  constructor(canvasWidth: number, canvasHeight: number, config?: Partial<LayoutConfig>) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    this.config = {
      canvasWidth,
      canvasHeight,
      minZoneHeight: config?.minZoneHeight || 150,
      maxZoneHeight: config?.maxZoneHeight || 600,
      zonePadding: config?.zonePadding || 40,
      titleHeight: config?.titleHeight || 120,
      headingHeight: config?.headingHeight || 80,
      diagramHeight: config?.diagramHeight || 400,
      descriptionHeight: config?.descriptionHeight || 100
    };
    
    this.currentY = 40; // Start with top padding
  }
  
  /**
   * Create a new vertical zone for a visual group
   */
  public createZone(
    id: string,
    type: 'title' | 'heading' | 'diagram' | 'description' | 'annotation',
    customHeight?: number
  ): VisualZone {
    // Check if zone already exists
    if (this.zones.has(id)) {
      return this.zones.get(id)!;
    }
    
    // Determine height based on type
    let height: number;
    if (customHeight) {
      height = Math.min(customHeight, this.config.maxZoneHeight);
    } else {
      switch (type) {
        case 'title':
          height = this.config.titleHeight;
          break;
        case 'heading':
          height = this.config.headingHeight;
          break;
        case 'diagram':
          height = this.config.diagramHeight;
          break;
        case 'description':
          height = this.config.descriptionHeight;
          break;
        case 'annotation':
          height = 60;
          break;
        default:
          height = this.config.minZoneHeight;
      }
    }
    
    const zone: VisualZone = {
      id,
      type,
      startY: this.currentY,
      height,
      usedHeight: 0,
      padding: this.config.zonePadding,
      elements: new Set()
    };
    
    this.zones.set(id, zone);
    this.currentY += height + this.config.zonePadding;
    
    console.log(`[LayoutManager] Created ${type} zone "${id}" at Y=${zone.startY}, height=${height}`);
    
    return zone;
  }
  
  /**
   * Transform normalized coordinates (0-1) to absolute canvas coordinates within a zone
   */
  public transformCoordinates(
    zoneId: string,
    normalizedX: number,
    normalizedY: number
  ): { x: number; y: number } {
    const zone = this.zones.get(zoneId);
    
    if (!zone) {
      console.warn(`[LayoutManager] Zone "${zoneId}" not found, using canvas coordinates`);
      return {
        x: normalizedX * this.canvasWidth,
        y: normalizedY * this.canvasHeight
      };
    }
    
    // Transform to zone coordinates
    // X: Use full canvas width (horizontal is static)
    // Y: Map to zone's vertical space
    return {
      x: normalizedX * this.canvasWidth,
      y: zone.startY + (normalizedY * zone.height)
    };
  }
  
  /**
   * Get visual hierarchy settings for text elements
   */
  public getHierarchyStyle(level: keyof typeof this.HIERARCHY) {
    return this.HIERARCHY[level];
  }
  
  /**
   * Track element placement to prevent overlaps
   */
  public registerElement(zoneId: string, elementId: string, height: number): void {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.elements.add(elementId);
      zone.usedHeight += height;
      
      // Auto-expand zone if content exceeds initial height
      if (zone.usedHeight > zone.height * 0.9) {
        const expansion = Math.min(zone.height * 0.5, this.config.maxZoneHeight - zone.height);
        zone.height += expansion;
        this.currentY += expansion;
        console.log(`[LayoutManager] Expanded zone "${zoneId}" by ${expansion}px`);
      }
    }
  }
  
  /**
   * Get next available Y position within a zone
   */
  public getNextYInZone(zoneId: string): number {
    const zone = this.zones.get(zoneId);
    if (!zone) return 0;
    
    return zone.startY + zone.usedHeight + 10; // 10px spacing
  }
  
  /**
   * Get all zones
   */
  public getZones(): VisualZone[] {
    return Array.from(this.zones.values());
  }
  
  /**
   * Get zone by ID
   */
  public getZone(id: string): VisualZone | undefined {
    return this.zones.get(id);
  }
  
  /**
   * Get total canvas height needed
   */
  public getTotalHeight(): number {
    return this.currentY + 40; // Add bottom padding
  }
  
  /**
   * Clear all zones (for new step)
   */
  public reset(): void {
    console.log(`[LayoutManager] Resetting layout (had ${this.zones.size} zones)`);
    this.zones.clear();
    this.currentY = 40;
  }
  
  /**
   * Calculate optimal zone height based on content
   */
  public calculateZoneHeight(contentItems: number, itemHeight: number = 30): number {
    const calculatedHeight = (contentItems * itemHeight) + this.config.zonePadding;
    return Math.min(
      Math.max(calculatedHeight, this.config.minZoneHeight),
      this.config.maxZoneHeight
    );
  }
  
  /**
   * Create standard layout for a step with multiple visuals
   */
  public createStandardLayout(stepTitle: string, visualCount: number): {
    titleZone: VisualZone;
    visualZones: VisualZone[];
  } {
    // Create title zone
    const titleZone = this.createZone('step-title', 'title');
    
    // Create zones for each visual with descriptions
    const visualZones: VisualZone[] = [];
    for (let i = 0; i < visualCount; i++) {
      // Heading for visual
      const headingZone = this.createZone(`visual-${i}-heading`, 'heading');
      
      // Diagram zone for visual
      const diagramZone = this.createZone(`visual-${i}-diagram`, 'diagram');
      
      // Description zone
      const descZone = this.createZone(`visual-${i}-description`, 'description');
      
      visualZones.push(headingZone, diagramZone, descZone);
    }
    
    return { titleZone, visualZones };
  }
  
  /**
   * Check if point is within a zone
   */
  public isInZone(x: number, y: number, zoneId: string): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone) return false;
    
    return y >= zone.startY && y <= (zone.startY + zone.height);
  }
  
  /**
   * Get zone at Y coordinate
   */
  public getZoneAtY(y: number): VisualZone | null {
    for (const zone of this.zones.values()) {
      if (y >= zone.startY && y <= (zone.startY + zone.height)) {
        return zone;
      }
    }
    return null;
  }
  
  /**
   * Update canvas dimensions (for resize)
   */
  public updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.config.canvasWidth = width;
    this.config.canvasHeight = height;
  }
}
