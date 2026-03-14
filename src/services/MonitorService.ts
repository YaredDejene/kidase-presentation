import { availableMonitors, primaryMonitor, currentMonitor } from '@tauri-apps/api/window';
import type { Monitor } from '@tauri-apps/api/window';

export { type Monitor };

class MonitorService {
  async getAvailableMonitors(): Promise<Monitor[]> {
    try {
      return await availableMonitors();
    } catch (err) {
      console.warn('MonitorService: availableMonitors() failed:', err);
      return [];
    }
  }

  /**
   * Returns a monitor that is NOT the one the app window is currently on.
   * Uses currentMonitor() to find where the app is, then picks a different one.
   * Falls back to primaryMonitor() comparison if currentMonitor() fails.
   */
  async getExternalMonitor(): Promise<Monitor | null> {
    try {
      const monitors = await availableMonitors();
      console.log('MonitorService: detected monitors:', monitors.length, monitors.map(m => ({
        name: m.name,
        size: m.size,
        position: m.position,
        scaleFactor: m.scaleFactor,
      })));

      if (monitors.length <= 1) {
        console.log('MonitorService: only 1 monitor, no external available');
        return null;
      }

      // Try to identify where the app window currently is
      let appMonitor: Monitor | null = null;
      try {
        appMonitor = await currentMonitor();
        console.log('MonitorService: current monitor:', appMonitor?.name, appMonitor?.position);
      } catch (err) {
        console.warn('MonitorService: currentMonitor() failed:', err);
      }

      // If we know the current monitor, find one that differs
      if (appMonitor) {
        const external = monitors.find(m =>
          m.position.x !== appMonitor!.position.x || m.position.y !== appMonitor!.position.y
        );
        if (external) {
          console.log('MonitorService: selected external monitor:', external.name, external.position);
          return external;
        }
      }

      // Fallback: compare with primary monitor
      try {
        const primary = await primaryMonitor();
        console.log('MonitorService: primary monitor:', primary?.name, primary?.position);
        if (primary) {
          const external = monitors.find(m =>
            m.position.x !== primary.position.x || m.position.y !== primary.position.y
          );
          if (external) {
            console.log('MonitorService: selected external (via primary):', external.name);
            return external;
          }
        }
      } catch (err) {
        console.warn('MonitorService: primaryMonitor() failed:', err);
      }

      // Last resort: just return the second monitor
      console.log('MonitorService: fallback to second monitor in list');
      return monitors[1] ?? null;
    } catch (err) {
      console.warn('MonitorService: getExternalMonitor() failed:', err);
      return null;
    }
  }

  async hasExternalMonitor(): Promise<boolean> {
    const ext = await this.getExternalMonitor();
    return ext !== null;
  }

  async getCurrentMonitor(): Promise<Monitor | null> {
    try {
      return await currentMonitor();
    } catch {
      return null;
    }
  }
}

export const monitorService = new MonitorService();
