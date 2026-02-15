import React, { useCallback, useState } from 'react';
import { useVerses } from '../../hooks/useVerses';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/verses-manager.css';

export const VersesManager: React.FC = () => {
  const { records, isLoading, importFromExcel, deleteAll } = useVerses();
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
    return <div className="verses-loading">Loading...</div>;
  }

  return (
    <div className="verses-container">
      {/* Toolbar */}
      <div className="verses-toolbar">
        <div className="verses-toolbar-left">
          <span className="verses-title">Verses</span>
          <span className="verses-count">
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </span>
        </div>
        <div className="verses-toolbar-right">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="verses-btn verses-btn-delete-all"
            disabled={records.length === 0 || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete All'}
          </button>
          <button onClick={handleImportExcel} className="verses-btn verses-btn-import">
            Import Excel
          </button>
        </div>
      </div>

      {/* Content */}
      {records.length === 0 ? (
        <div className="verses-empty">
          <p>No Verse records.</p>
          <p>Import from Excel to get started.</p>
        </div>
      ) : (
        <div className="verses-table-wrapper">
          <table className="verses-table">
            <thead>
              <tr>
                <th>Segment ID</th>
                <th>Text Lang1</th>
                <th>Text Lang2</th>
                <th>Text Lang3</th>
                <th>Text Lang4</th>
              </tr>
            </thead>
            <tbody>
              {records.map((v) => (
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
        title="Delete All Verse Records"
        message={`Delete all ${records.length} Verse records? This cannot be undone.`}
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};
