import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGitsawe } from '../../hooks/useGitsawe';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/gitsawe-manager.css';

export const GitsaweManager: React.FC = () => {
  const { t } = useTranslation('manager');
  const { gitsawes, isLoading, importFromExcel, deleteAll } = useGitsawe();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleImportExcel = useCallback(async () => {
    const filePath = await open({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!filePath || typeof filePath !== 'string') return;
    await importFromExcel(filePath);
  }, [importFromExcel]);

  const handleDeleteAllConfirm = useCallback(async () => {
    setShowConfirmDelete(false);
    setIsDeleting(true);
    await deleteAll();
    setIsDeleting(false);
  }, [deleteAll]);

  if (isLoading) {
    return <div className="gitsawe-loading">{t('common:loading')}</div>;
  }

  return (
    <div className="gitsawe-container">
      {/* Toolbar */}
      <div className="gitsawe-toolbar">
        <div className="gitsawe-toolbar-left">
          <span className="gitsawe-title">{t('gitsawe')}</span>
          <span className="gitsawe-count">
            {t('recordCount', { count: gitsawes.length })}
          </span>
        </div>
        <div className="gitsawe-toolbar-right">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="gitsawe-btn gitsawe-btn-delete-all"
            disabled={gitsawes.length === 0 || isDeleting}
          >
            {isDeleting ? t('deleting') : t('deleteAll')}
          </button>
          <button onClick={handleImportExcel} className="gitsawe-btn gitsawe-btn-import">
            {t('importExcel')}
          </button>
        </div>
      </div>

      {/* Content */}
      {gitsawes.length === 0 ? (
        <div className="gitsawe-empty">
          <p>{t('noGitsaweRecords')}</p>
          <p>{t('importToStart')}</p>
        </div>
      ) : (
        <div className="gitsawe-table-wrapper">
          <table className="gitsawe-table">
            <thead>
              <tr>
                <th>{t('lineId')}</th>
                <th>{t('messageStPaul')}</th>
                <th>{t('messageApostle')}</th>
                <th>{t('messageBookOfActs')}</th>
                <th>{t('misbak')}</th>
                <th>{t('wengel')}</th>
                <th>{t('kidaseType')}</th>
                <th>{t('messageApostleEvangelist')}</th>
                <th>{t('gitsaweType')}</th>
                <th>{t('priority')}</th>
              </tr>
            </thead>
            <tbody>
              {gitsawes.map((g) => (
                <tr key={g.id} className="gitsawe-row">
                  <td className="gitsawe-cell-lineid">{g.lineId}</td>
                  <td className="gitsawe-cell-text">{g.messageStPaul || '--'}</td>
                  <td className="gitsawe-cell-text">{g.messageApostle || '--'}</td>
                  <td className="gitsawe-cell-text">{g.messageBookOfActs || '--'}</td>
                  <td className="gitsawe-cell-text">{g.misbak || '--'}</td>
                  <td className="gitsawe-cell-text">{g.wengel || '--'}</td>
                  <td className="gitsawe-cell-type">{g.kidaseType || '--'}</td>
                  <td className="gitsawe-cell-text">{g.messageApostleEvangelist || '--'}</td>
                  <td className="gitsawe-cell-type">{g.gitsaweType || '--'}</td>
                  <td className="gitsawe-cell-priority">{g.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title={t('deleteAllGitsawe')}
        message={t('deleteAllGitsaweConfirm', { count: gitsawes.length })}
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};
