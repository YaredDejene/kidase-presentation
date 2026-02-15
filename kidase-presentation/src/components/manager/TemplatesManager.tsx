import React, { useCallback, useState } from 'react';
import { Template } from '../../domain/entities/Template';
import { useTemplates } from '../../hooks/useTemplates';
import { presentationService } from '../../services/PresentationService';
import { formatDate } from '../../domain/formatting';
import { toast } from '../../store/toastStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TemplateEditorDialog } from '../dialogs/TemplateEditorDialog';
import '../../styles/templates-manager.css';

export const TemplatesManager: React.FC = () => {
  const { templates, isLoading, createTemplate, deleteTemplate, updateTemplate } = useTemplates();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleCreate = useCallback(async () => {
    const count = templates.length;
    const created = await createTemplate(`Template ${count + 1}`);
    if (created) {
      toast.success('Template created');
    } else {
      toast.error('Failed to create template');
    }
  }, [templates.length, createTemplate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    if (templates.length <= 1) {
      toast.error('Cannot delete the last template.');
      return;
    }

    const { canDelete, usedByCount } = await presentationService.canDeleteTemplate(id);
    if (!canDelete) {
      toast.error(`Cannot delete: template is used by ${usedByCount} presentation(s).`);
      return;
    }

    setDeletingId(id);
    const success = await deleteTemplate(id);
    if (success) {
      toast.success(`"${name}" deleted`);
    } else {
      toast.error('Failed to delete template');
    }
    setDeletingId(null);
  }, [confirmDelete, templates.length, deleteTemplate]);

  if (isLoading) {
    return <div className="templates-loading">Loading...</div>;
  }

  return (
    <div className="templates-container">
      {/* Toolbar */}
      <div className="templates-toolbar">
        <div className="templates-toolbar-left">
          <span className="templates-title">Templates</span>
          <span className="templates-count">
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </span>
        </div>
        <div className="templates-toolbar-right">
          <button onClick={handleCreate} className="templates-btn templates-btn-create">
            Create Template
          </button>
        </div>
      </div>

      {/* Content */}
      {templates.length === 0 ? (
        <div className="templates-empty">
          <p>No templates.</p>
          <p>Create one to get started.</p>
        </div>
      ) : (
        <div className="templates-table-wrapper">
          <table className="templates-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Max Languages</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="templates-row templates-row-clickable"
                  onClick={() => setEditingTemplate(t)}
                >
                  <td className="templates-cell-name">{t.name}</td>
                  <td className="templates-cell-langs">{t.maxLangCount}</td>
                  <td className="templates-cell-date">{formatDate(t.createdAt)}</td>
                  <td className="templates-cell-actions">
                    <button
                      className="templates-btn-delete"
                      title="Delete"
                      disabled={deletingId === t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: t.id, name: t.name });
                      }}
                    >
                      {deletingId === t.id ? '...' : (
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
        title="Delete Template"
        message={confirmDelete ? `Delete "${confirmDelete.name}"? This cannot be undone.` : ''}
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
