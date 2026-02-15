import React, { useCallback, useEffect, useState } from 'react';
import { Verse } from '../../domain/entities/Verse';
import {
  verseRepository,
  templateRepository,
} from '../../repositories';
import { excelImportService } from '../../services/ExcelImportService';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../store/toastStore';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/verses-manager.css';

export const VersesManager: React.FC = () => {
  const [records, setRecords] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { setVerses } = useAppStore();

  const loadRecords = useCallback(async () => {
    try {
      const all = await verseRepository.getAll();
      setRecords(all);
      return all;
    } catch (error) {
      console.error('Failed to load Verse records:', error);
      toast.error('Failed to load Verse records');
      return [];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadRecords();
      setIsLoading(false);
    };
    init();
  }, [loadRecords]);

  const handleImportExcel = useCallback(async () => {
    const filePath = await open({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!filePath || typeof filePath !== 'string') return;

    // Need a templateId for the import service (required param, but we only use verses data)
    const templates = await templateRepository.getAll();
    const dummyTemplateId = templates[0]?.id;
    if (!dummyTemplateId) {
      toast.error('No template available. Please create a template first.');
      return;
    }

    try {
      const result = await excelImportService.importFromPath(filePath, dummyTemplateId);

      if (result.verses.length === 0) {
        toast.error('No Verses data found in the Excel file. Make sure there is a "Verses" sheet.');
        return;
      }

      // Clear existing verses
      const existing = await verseRepository.getAll();
      for (const v of existing) {
        await verseRepository.delete(v.id);
      }

      // Create new records
      await verseRepository.createMany(result.verses);

      const loaded = await loadRecords();
      setVerses(loaded);
      toast.success(`Imported ${result.verses.length} Verse records`);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import: ' + (error as Error).message);
    }
  }, [loadRecords, setVerses]);

  const handleDeleteAllConfirm = useCallback(async () => {
    setShowConfirmDelete(false);

    setIsDeleting(true);
    try {
      for (const v of records) {
        await verseRepository.delete(v.id);
      }
      await loadRecords();
      setVerses([]);
      toast.success('All Verse records deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete Verse records');
    }
    setIsDeleting(false);
  }, [records, loadRecords, setVerses]);

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
