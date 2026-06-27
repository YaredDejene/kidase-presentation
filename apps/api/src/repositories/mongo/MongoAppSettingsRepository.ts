import { Collection } from 'mongodb';
import type { AppSettings, IAppSettingsRepository } from '@kidase/shared';
import { defaultAppSettings } from '@kidase/shared';

interface SettingDoc {
  _id: string;
  value: string;
}

/**
 * App settings as key/value docs (`{ _id: key, value }`), mirroring the desktop
 * SQLite `app_settings` table so the .kidase importer maps 1:1. `get()` ports
 * the desktop assembly + presentationDisplay migration.
 */
export class MongoAppSettingsRepository implements IAppSettingsRepository {
  constructor(private readonly col: Collection) {}

  async get(): Promise<AppSettings> {
    const rows = (await this.col.find().toArray()) as unknown as SettingDoc[];
    const settings: AppSettings = { ...defaultAppSettings };

    for (const row of rows) {
      switch (row._id) {
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
          const val = row.value;
          if (val === 'currentWindow' || val === 'presenterView') {
            settings.presentationDisplay = val;
          } else {
            settings.presentationDisplay = (val === 'auto' || val === 'secondary') ? 'presenterView' : 'currentWindow';
          }
          break;
        }
        case 'locale':
          settings.locale = row.value as 'en' | 'am';
          break;
      }
    }

    return settings;
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.col.updateOne(
      { _id: key as never },
      { $set: { value: String(value) } },
      { upsert: true },
    );
  }

  async setAll(settings: AppSettings): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
    }
  }
}
