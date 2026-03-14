import { getDatabase } from '../../lib/database';
import { AppSettings, defaultAppSettings } from '../../domain/entities/AppSettings';

interface SettingRow {
  key: string;
  value: string;
}

export class AppSettingsRepository {
  async get(): Promise<AppSettings> {
    const db = await getDatabase();
    const rows = await db.select<SettingRow[]>('SELECT * FROM app_settings');

    const settings: AppSettings = { ...defaultAppSettings };

    for (const row of rows) {
      switch (row.key) {
        case 'theme':
          settings.theme = row.value as 'dark' | 'light';
          break;
        case 'showSlideNumbers':
          settings.showSlideNumbers = row.value === 'true';
          break;
        case 'showSidebarLabels':
          settings.showSidebarLabels = row.value === 'true';
          break;
        case 'presentationDisplay': {
          // Migrate old values
          const val = row.value;
          if (val === 'currentWindow' || val === 'presenterView') {
            settings.presentationDisplay = val;
          } else {
            // Old values: 'primary'/'secondary'/'auto' → map to new
            settings.presentationDisplay = (val === 'auto' || val === 'secondary') ? 'presenterView' : 'currentWindow';
          }
          break;
        }
      }
    }

    return settings;
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const db = await getDatabase();
    const stringValue = String(value);

    await db.execute(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, stringValue]
    );
  }

  async setAll(settings: AppSettings): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key as keyof AppSettings, value);
    }
  }
}
