import Konva from 'konva';
import { AnimationEngine } from '../animations/AnimationEngine';

export interface CanvasSection {
  id: string;
  layer: Konva.Layer;
  height: number;
  yPosition: number;
  title?: string;
  isVisible: boolean;
}

export class CanvasManager {
  private stage: Konva.Stage;
  private container: HTMLDivElement;
  private sections: Map<string, CanvasSection> = new Map();
  private animationEngine: AnimationEngine;
  private currentHeight: number = 0;
  private sectionSpacing: number = 50;
  private minSectionHeight: number = 400;
  private scrollContainer: HTMLDivElement | null = null;
  
  constructor(stage: Konva.Stage, container: HTMLElement) {
    this.stage = stage;
    this.container = container as HTMLDivElement;
    this.animationEngine = new AnimationEngine(stage);
    this.setupScrollContainer();
  }

  private setupScrollContainer(): void {
    // Find or create scroll container
    const parent = this.container.parentElement;
    if (parent) {
      // Enable smooth scrolling
      parent.style.overflowY = 'auto';
      parent.style.scrollBehavior = 'smooth';
      parent.style.position = 'relative';
      this.scrollContainer = parent;
      
      // Add scroll event listener for lazy loading
      parent.addEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  private handleScroll(): void {
    if (!this.scrollContainer) return;
    
    const scrollTop = this.scrollContainer.scrollTop;
    const viewportHeight = this.scrollContainer.clientHeight;
    const scrollBottom = scrollTop + viewportHeight;
    
    // Check which sections are visible and update their visibility
    this.sections.forEach((section) => {
      const sectionTop = section.yPosition;
      const sectionBottom = sectionTop + section.height;
      
      // Section is visible if it overlaps with viewport
      const isVisible = sectionBottom > scrollTop && sectionTop < scrollBottom;
      
      if (isVisible !== section.isVisible) {
        section.isVisible = isVisible;
        section.layer.visible(isVisible);
        
        // Trigger entrance animation when section becomes visible
        if (isVisible && section.layer.children.length > 0) {
          this.animateEntrance(section);
        }
      }
    });
    
    this.stage.batchDraw();
  }

  private animateEntrance(section: CanvasSection): void {
    // Fade in animation for newly visible sections
    const children = section.layer.children;
    children.forEach((child, index) => {
      child.opacity(0);
      const tween = new Konva.Tween({
        node: child,
        duration: 0.5,
        opacity: 1,
        delay: index * 0.05,
        easing: Konva.Easings.EaseOut
      });
      tween.play();
    });
  }

  createSection(id: string, title?: string, customHeight?: number): CanvasSection {
    // Check if section already exists
    if (this.sections.has(id)) {
      return this.sections.get(id)!;
    }

    const height = customHeight || this.minSectionHeight;
    const yPosition = this.currentHeight;
    
    // Create new layer for this section
    const layer = new Konva.Layer({
      y: yPosition,
      visible: false // Start invisible, will be shown when scrolled into view
    });
    
    this.stage.add(layer);
    
    // Add section title if provided
    if (title) {
      const titleText = new Konva.Text({
        text: title,
        x: 10,
        y: 10,
        fontSize: 24,
        fontStyle: 'bold',
        fill: '#333',
        width: this.stage.width() - 20,
        align: 'center'
      });
      layer.add(titleText);
      
      // Add separator line
      const separator = new Konva.Line({
        points: [10, 40, this.stage.width() - 10, 40],
        stroke: '#ddd',
        strokeWidth: 1
      });
      layer.add(separator);
    }
    
    const section: CanvasSection = {
      id,
      layer,
      height,
      yPosition,
      title,
      isVisible: false
    };
    
    this.sections.set(id, section);
    
    // Update total canvas height
    this.currentHeight = yPosition + height + this.sectionSpacing;
    this.updateCanvasHeight();
    
    // Check initial visibility
    this.handleScroll();
    
    return section;
  }

  private updateCanvasHeight(): void {
    this.stage.height(this.currentHeight);
    
    // Update container height to enable scrolling
    if (this.container) {
      this.container.style.height = `${this.currentHeight}px`;
    }
  }

  scrollToSection(id: string, smooth: boolean = true): void {
    const section = this.sections.get(id);
    if (!section || !this.scrollContainer) return;
    
    this.scrollContainer.scrollTo({
      top: section.yPosition,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  clearSection(id: string): void {
    const section = this.sections.get(id);
    if (!section) return;
    
    // Animate out before clearing
    const children = section.layer.children;
    children.forEach((child) => {
      const tween = new Konva.Tween({
        node: child,
        duration: 0.3,
        opacity: 0,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          child.destroy();
        }
      });
      tween.play();
    });
    
    setTimeout(() => {
      section.layer.destroyChildren();
      section.layer.batchDraw();
    }, 300);
  }

  removeSection(id: string): void {
    const section = this.sections.get(id);
    if (!section) return;
    
    // Animate out
    const tween = new Konva.Tween({
      node: section.layer,
      duration: 0.5,
      opacity: 0,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        section.layer.destroy();
        this.sections.delete(id);
        this.reorganizeSections();
      }
    });
    tween.play();
  }

  private reorganizeSections(): void {
    let currentY = 0;
    
    // Reorganize remaining sections
    this.sections.forEach((section) => {
      section.yPosition = currentY;
      
      // Animate to new position
      const tween = new Konva.Tween({
        node: section.layer,
        duration: 0.5,
        y: currentY,
        easing: Konva.Easings.EaseInOut
      });
      tween.play();
      
      currentY += section.height + this.sectionSpacing;
    });
    
    this.currentHeight = currentY;
    this.updateCanvasHeight();
  }

  resizeSection(id: string, newHeight: number): void {
    const section = this.sections.get(id);
    if (!section) return;
    
    const heightDiff = newHeight - section.height;
    section.height = newHeight;
    
    // Update positions of sections below
    let foundSection = false;
    this.sections.forEach((s) => {
      if (foundSection) {
        s.yPosition += heightDiff;
        
        // Animate to new position
        const tween = new Konva.Tween({
          node: s.layer,
          duration: 0.3,
          y: s.yPosition,
          easing: Konva.Easings.EaseOut
        });
        tween.play();
      }
      if (s.id === id) {
        foundSection = true;
      }
    });
    
    this.currentHeight += heightDiff;
    this.updateCanvasHeight();
  }

  getSection(id: string): CanvasSection | undefined {
    return this.sections.get(id);
  }

  getAllSections(): CanvasSection[] {
    return Array.from(this.sections.values());
  }

  getAnimationEngine(): AnimationEngine {
    return this.animationEngine;
  }

  // Auto-scroll with content as it's being added
  autoScrollWithContent(section: CanvasSection, duration: number = 1000): void {
    if (!this.scrollContainer) return;
    
    const targetScroll = section.yPosition + section.height - this.scrollContainer.clientHeight + 100;
    
    if (targetScroll > this.scrollContainer.scrollTop) {
      const startScroll = this.scrollContainer.scrollTop;
      const distance = targetScroll - startScroll;
      const startTime = performance.now();
      
      const scrollAnimation = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth scroll
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        if (this.scrollContainer) {
          this.scrollContainer.scrollTop = startScroll + distance * easeProgress;
        }
        
        if (progress < 1) {
          requestAnimationFrame(scrollAnimation);
        }
      };
      
      requestAnimationFrame(scrollAnimation);
    }
  }

  // Create a timeline view for multi-step content
  createTimeline(steps: { id: string; title: string; duration: number }[]): void {
    const timelineHeight = 80;
    const timelineSection = this.createSection('timeline', 'Learning Timeline', timelineHeight);
    
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const width = this.stage.width() - 40;
    const startX = 20;
    const y = 50;
    
    // Draw timeline base
    const timelineLine = new Konva.Line({
      points: [startX, y, startX + width, y],
      stroke: '#666',
      strokeWidth: 2
    });
    timelineSection.layer.add(timelineLine);
    
    // Add step markers
    let currentX = startX;
    steps.forEach((step, index) => {
      const stepWidth = (step.duration / totalDuration) * width;
      
      // Step marker
      const marker = new Konva.Circle({
        x: currentX,
        y: y,
        radius: 6,
        fill: '#0b82f0',
        stroke: '#fff',
        strokeWidth: 2
      });
      
      // Step label
      const label = new Konva.Text({
        text: step.title,
        x: currentX - 30,
        y: y + 15,
        fontSize: 12,
        fill: '#666',
        width: 60,
        align: 'center'
      });
      
      timelineSection.layer.add(marker);
      timelineSection.layer.add(label);
      
      // Animate marker on hover
      marker.on('mouseenter', () => {
        this.animationEngine.createPulse(marker, { scale: 1.5, duration: 0.3, repeat: 1 });
      });
      
      marker.on('click', () => {
        this.scrollToSection(step.id);
      });
      
      currentX += stepWidth;
    });
    
    // Add end marker
    const endMarker = new Konva.Circle({
      x: startX + width,
      y: y,
      radius: 6,
      fill: '#4caf50',
      stroke: '#fff',
      strokeWidth: 2
    });
    timelineSection.layer.add(endMarker);
    
    timelineSection.layer.batchDraw();
  }

  cleanup(): void {
    this.animationEngine.cleanup();
    this.sections.forEach(section => {
      section.layer.destroy();
    });
    this.sections.clear();
    
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll.bind(this));
    }
  }
}
