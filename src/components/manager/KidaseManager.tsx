import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Presentation } from '../../domain/entities/Presentation';
import { presentationService } from '../../services/PresentationService';
import { usePresentation } from '../../hooks/usePresentation';
import { useTemplates } from '../../hooks/useTemplates';
import { useAppStore } from '../../store/appStore';
import { formatDate } from '../../domain/formatting';
import { toast } from '../../store/toastStore';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/manager.css';

interface PresentationRow {
  presentation: Presentation;
  slideCount: number;
}

export const KidaseManager: React.FC = () => {
  const { t } = useTranslation('manager');
  const [rows, setRows] = useState<PresentationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const { currentPresentation, setCurrentView, clearPresentationData } = useAppStore();
  const { loadPresentation } = usePresentation();
  const { templates } = useTemplates();

  const loadPresentations = useCallback(async () => {
    try {
      const rowsWithCount = await presentationService.listPresentationsWithCount();
      setRows(rowsWithCount);
    } catch (error) {
      console.error('Failed to load kidases:', error);
      toast.error(t('failedToLoadKidases'));
    }
  }, [t]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadPresentations();
      setIsLoading(false);
    };
    init();
  }, [loadPresentations]);

  const handleOpenPresentation = useCallback(async (id: string) => {
    try {
      await loadPresentation(id);
      setCurrentView('editor');
    } catch (error) {
      console.error('Failed to open kidase:', error);
      toast.error(t('failedToOpenKidase'));
    }
  }, [loadPresentation, setCurrentView, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    setDeletingId(id);
    try {
      await presentationService.deletePresentation(id);

      if (currentPresentation?.id === id) {
        clearPresentationData();
      }

      await loadPresentations();
      toast.success(t('deletedName', { name }));
    } catch (error) {
      console.error('Failed to delete kidase:', error);
      toast.error(t('failedToDeleteKidase'));
    }
    setDeletingId(null);
  }, [confirmDelete, currentPresentation, clearPresentationData, loadPresentations, t]);

  const handleImportExcel = useCallback(async () => {
    const filePath = await open({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!filePath || typeof filePath !== 'string') return;

    const defaultTemplate = templates[0];
    if (!defaultTemplate) {
      toast.error(t('noTemplateAvailable'));
      return;
    }

    try {
      const loaded = await presentationService.importFromPath(filePath, defaultTemplate.id);
      await loadPresentations();
      toast.success(t('importedName', { name: loaded.presentation.name }));
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('failedToImport', { message: (error as Error).message }));
    }
  }, [templates, loadPresentations, t]);

  const getLanguages = (p: Presentation) => {
    const langs = Object.values(p.languageMap).filter(Boolean);
    return langs.length > 0 ? langs.join(', ') : '--';
  };

  if (isLoading) {
    return <div className="manager-loading">{t('common:loading')}</div>;
  }

  return (
    <div className="manager-container">
      {/* Toolbar */}
      <div className="manager-toolbar">
        <div className="manager-toolbar-left">
          <span className="manager-title">{t('kidases')}</span>
          <span className="manager-count">
            {t('kidaseCount', { count: rows.length })}
          </span>
        </div>
        <div className="manager-toolbar-right">
          <button onClick={handleImportExcel} className="manager-btn manager-btn-import">
            {t('importExcel')}
          </button>
        </div>
      </div>

      {/* Content */}
      {rows.length === 0 ? (
        <div className="manager-empty">
          <p>{t('noKidases')}</p>
          <p>{t('importToStart')}</p>
        </div>
      ) : (
        <div className="manager-table-wrapper">
          <table className="manager-table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('type')}</th>
                <th>{t('slides')}</th>
                <th>{t('languages')}</th>
                <th>{t('created')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => {
                if (a.presentation.id === currentPresentation?.id) return -1;
                if (b.presentation.id === currentPresentation?.id) return 1;
                return 0;
              }).map(({ presentation: p, slideCount }) => (
                <tr
                  key={p.id}
                  className="manager-row"
                  onClick={() => handleOpenPresentation(p.id)}
                >
                  <td className="manager-cell-name">
                    {p.name}
                    {currentPresentation?.id === p.id && (
                      <span className="manager-primary-badge">{t('primary')}</span>
                    )}
                  </td>
                  <td>{p.type}</td>
                  <td>{slideCount}</td>
                  <td className="manager-cell-langs">{getLanguages(p)}</td>
                  <td className="manager-cell-date">{formatDate(p.createdAt)}</td>
                  <td className="manager-cell-actions">
                    <button
                      className="manager-btn-delete"
                      title={t('common:delete')}
                      disabled={deletingId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: p.id, name: p.name });
                      }}
                    >
                      {deletingId === p.id ? '...' : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title={t('deleteKidase')}
        message={confirmDelete ? t('deleteKidaseConfirm', { name: confirmDelete.name }) : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
