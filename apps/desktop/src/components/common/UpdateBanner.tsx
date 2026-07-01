import { useTranslation } from 'react-i18next';
import '../../styles/update-banner.css';

interface UpdateBannerProps {
  version: string;
  installing: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, installing, onInstall, onDismiss }: UpdateBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="update-banner">
      <span className="update-banner-text">
        {t('settings:updateAvailable', { version })}
      </span>
      <div className="update-banner-actions">
        <button
          className="update-banner-install"
          onClick={onInstall}
          disabled={installing}
        >
          {installing ? t('settings:updating') : t('settings:installUpdate')}
        </button>
        <button
          className="update-banner-dismiss"
          onClick={onDismiss}
          disabled={installing}
        >
          {t('common:dismiss')}
        </button>
      </div>
    </div>
  );
}
