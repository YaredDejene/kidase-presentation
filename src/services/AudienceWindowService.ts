import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import type { Monitor } from '@tauri-apps/api/window';

const AUDIENCE_LABEL = 'audience';

class AudienceWindowService {
  private audienceWindow: WebviewWindow | null = null;

  async openAudienceWindow(monitor: Monitor): Promise<void> {
    // Close existing if any
    await this.closeAudienceWindow();

    const { position, size, scaleFactor } = monitor;

    // Monitor API returns physical pixels, but WebviewWindow options expect logical pixels
    const scale = scaleFactor || 1;
    const logicalX = Math.round(position.x / scale);
    const logicalY = Math.round(position.y / scale);
    const logicalWidth = Math.round(size.width / scale);
    const logicalHeight = Math.round(size.height / scale);

    console.log('AudienceWindow: creating window', {
      physical: { x: position.x, y: position.y, w: size.width, h: size.height },
      logical: { x: logicalX, y: logicalY, w: logicalWidth, h: logicalHeight },
      scaleFactor: scale,
    });

    this.audienceWindow = new WebviewWindow(AUDIENCE_LABEL, {
      url: '/?view=audience',
      title: 'Presentation',
      x: logicalX,
      y: logicalY,
      width: logicalWidth,
      height: logicalHeight,
      fullscreen: true,
      decorations: false,
      alwaysOnTop: true,
      focus: false,
    });

    // Wait for the window to be created
    await new Promise<void>((resolve, reject) => {
      this.audienceWindow!.once('tauri://created', () => {
        console.log('AudienceWindow: created successfully');
        resolve();
      });
      this.audienceWindow!.once('tauri://error', (e) => {
        console.error('AudienceWindow: creation error:', e);
        reject(new Error(String(e.payload)));
      });
    });
  }

  async closeAudienceWindow(): Promise<void> {
    if (this.audienceWindow) {
      try {
        await this.audienceWindow.close();
      } catch {
        // Window may already be closed
      }
      this.audienceWindow = null;
    }
  }

  async emitSlideChange(index: number): Promise<void> {
    try {
      await emit('slide-change', { index });
    } catch {
      // Audience window may not be listening yet
    }
  }

  async emitPresentationStop(): Promise<void> {
    try {
      await emit('presentation-stop');
    } catch {
      // Ignore
    }
  }

  isOpen(): boolean {
    return this.audienceWindow !== null;
  }
}

export const audienceWindowService = new AudienceWindowService();
