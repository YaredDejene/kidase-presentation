import { AppSettings } from '../entities/AppSettings';

export interface IAppSettingsRepository {
  get(): Promise<AppSettings>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  setAll(settings: AppSettings): Promise<void>;
}
