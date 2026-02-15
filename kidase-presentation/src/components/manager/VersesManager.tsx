import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVerses } from '../../hooks/useVerses';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/verses-manager.css';

export const VersesManager: React.FC = () => {
  const { t } = useTranslation('manager');
  const { verses, isLoading, importFromExcel, deleteAll } = useVerses();
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

  const truncate = (text: string | undefined, max: number) => {
    if (!text) return '--';
    return text.length > max ? text.slice(0, max) + '...' : text;
  };

  if (isLoading) {
    return <div className="verses-loading">{t('common:loading')}</div>;
  }

  return (
    <div className="verses-container">
      {/* Toolbar */}
      <div className="verses-toolbar">
        <div className="verses-toolbar-left">
          <span className="verses-title">{t('verses')}</span>
          <span className="verses-count">
            {t('recordCount', { count: verses.length })}
          </span>
        </div>
        <div className="verses-toolbar-right">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="verses-btn verses-btn-delete-all"
            disabled={verses.length === 0 || isDeleting}
          >
            {isDeleting ? t('deleting') : t('deleteAll')}
          </button>
          <button onClick={handleImportExcel} className="verses-btn verses-btn-import">
            {t('importExcel')}
          </button>
        </div>
      </div>

      {/* Content */}
      {verses.length === 0 ? (
        <div className="verses-empty">
          <p>{t('noVerseRecords')}</p>
          <p>{t('importToStart')}</p>
        </div>
      ) : (
        <div className="verses-table-wrapper">
          <table className="verses-table">
            <thead>
              <tr>
                <th>{t('segmentId')}</th>
                <th>{t('textLang1')}</th>
                <th>{t('textLang2')}</th>
                <th>{t('textLang3')}</th>
                <th>{t('textLang4')}</th>
              </tr>
            </thead>
            <tbody>
              {verses.map((v) => (
                <tr key={v.id} className="verses-row">
                  <td className="verses-cell-segment">{v.segmentId}</td>
                  <td className="verses-cell-text">{truncate(v.textLang1, 60)}</td>
                  <td className="verses-cell-text">{truncate(v.textLang2, 60)}</td>
                  <td className="verses-cell-text">{truncate(v.textLang3, 60)}</td>
                  <td className="verses-cell-text">{truncate(v.textLang4, 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title={t('deleteAllVerses')}
        message={t('deleteAllVersesConfirm', { count: verses.length })}
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};
