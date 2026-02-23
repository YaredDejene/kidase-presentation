import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function useUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const update = await check();
        if (!cancelled && update) {
          setUpdateVersion(update.version);
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.error('Failed to check for updates:', e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function installUpdate() {
    try {
      setInstalling(true);
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (e) {
      console.error('Failed to install update:', e);
      setInstalling(false);
    }
  }

  function dismissUpdate() {
    setDismissed(true);
  }

  return {
    updateAvailable: updateAvailable && !dismissed,
    updateVersion,
    installing,
    installUpdate,
    dismissUpdate,
  };
}
