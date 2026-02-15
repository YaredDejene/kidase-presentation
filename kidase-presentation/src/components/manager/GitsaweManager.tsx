import React, { useCallback, useState } from 'react';
import { useGitsawe } from '../../hooks/useGitsawe';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/gitsawe-manager.css';

export const GitsaweManager: React.FC = () => {
  const { records, isLoading, importFromExcel, deleteAll } = useGitsawe();
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
    return <div className="gitsawe-loading">Loading...</div>;
  }

  return (
    <div className="gitsawe-container">
      {/* Toolbar */}
      <div className="gitsawe-toolbar">
        <div className="gitsawe-toolbar-left">
          <span className="gitsawe-title">Gitsawe</span>
          <span className="gitsawe-count">
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </span>
        </div>
        <div className="gitsawe-toolbar-right">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="gitsawe-btn gitsawe-btn-delete-all"
            disabled={records.length === 0 || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete All'}
          </button>
          <button onClick={handleImportExcel} className="gitsawe-btn gitsawe-btn-import">
            Import Excel
          </button>
        </div>
      </div>

      {/* Content */}
      {records.length === 0 ? (
        <div className="gitsawe-empty">
          <p>No Gitsawe records.</p>
          <p>Import from Excel to get started.</p>
        </div>
      ) : (
        <div className="gitsawe-table-wrapper">
          <table className="gitsawe-table">
            <thead>
              <tr>
                <th>Line ID</th>
                <th>Message StPaul</th>
                <th>Message Apostle</th>
                <th>Message BookOfActs</th>
                <th>Misbak</th>
                <th>Wengel</th>
                <th>Kidase Type</th>
                <th>Message Apostle Evangelist</th>
                <th>Gitsawe Type</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {records.map((g) => (
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
        title="Delete All Gitsawe Records"
        message={`Delete all ${records.length} Gitsawe records? This cannot be undone.`}
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};
