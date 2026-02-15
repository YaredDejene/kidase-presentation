import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Template } from '../../domain/entities/Template';
import { useTemplates } from '../../hooks/useTemplates';
import { presentationService } from '../../services/PresentationService';
import { formatDate } from '../../domain/formatting';
import { toast } from '../../store/toastStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TemplateEditorDialog } from '../dialogs/TemplateEditorDialog';
import '../../styles/templates-manager.css';

export const TemplatesManager: React.FC = () => {
  const { t } = useTranslation('manager');
  const { templates, isLoading, createTemplate, deleteTemplate, updateTemplate } = useTemplates();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleCreate = useCallback(async () => {
    const count = templates.length;
    const created = await createTemplate(`Template ${count + 1}`);
    if (created) {
      toast.success(t('templateCreated'));
    } else {
      toast.error(t('failedToCreateTemplate'));
    }
  }, [templates.length, createTemplate, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    if (templates.length <= 1) {
      toast.error(t('cannotDeleteLastTemplate'));
      return;
    }

    const { canDelete, usedByCount } = await presentationService.canDeleteTemplate(id);
    if (!canDelete) {
      toast.error(t('cannotDeleteInUse', { count: usedByCount }));
      return;
    }

    setDeletingId(id);
    const success = await deleteTemplate(id);
    if (success) {
      toast.success(t('deletedName', { name }));
    } else {
      toast.error(t('failedToDeleteTemplate'));
    }
    setDeletingId(null);
  }, [confirmDelete, templates.length, deleteTemplate, t]);

  if (isLoading) {
    return <div className="templates-loading">{t('common:loading')}</div>;
  }

  return (
    <div className="templates-container">
      {/* Toolbar */}
      <div className="templates-toolbar">
        <div className="templates-toolbar-left">
          <span className="templates-title">{t('templates')}</span>
          <span className="templates-count">
            {t('templateCount', { count: templates.length })}
          </span>
        </div>
        <div className="templates-toolbar-right">
          <button onClick={handleCreate} className="templates-btn templates-btn-create">
            {t('createTemplate')}
          </button>
        </div>
      </div>

      {/* Content */}
      {templates.length === 0 ? (
        <div className="templates-empty">
          <p>{t('noTemplates')}</p>
          <p>{t('createToStart')}</p>
        </div>
      ) : (
        <div className="templates-table-wrapper">
          <table className="templates-table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('maxLanguages')}</th>
                <th>{t('created')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tmpl) => (
                <tr
                  key={tmpl.id}
                  className="templates-row templates-row-clickable"
                  onClick={() => setEditingTemplate(tmpl)}
                >
                  <td className="templates-cell-name">{tmpl.name}</td>
                  <td className="templates-cell-langs">{tmpl.maxLangCount}</td>
                  <td className="templates-cell-date">{formatDate(tmpl.createdAt)}</td>
                  <td className="templates-cell-actions">
                    <button
                      className="templates-btn-delete"
                      title={t('common:delete')}
                      disabled={deletingId === tmpl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: tmpl.id, name: tmpl.name });
                      }}
                    >
                      {deletingId === tmpl.id ? '...' : (
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
        title={t('deleteTemplate')}
        message={confirmDelete ? t('deleteTemplateConfirm', { name: confirmDelete.name }) : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {editingTemplate && (
        <TemplateEditorDialog
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          template={editingTemplate}
          onSave={updateTemplate}
        />
      )}
    </div>
  );
};
