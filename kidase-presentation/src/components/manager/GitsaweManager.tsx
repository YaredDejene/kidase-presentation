import React, { useCallback, useEffect, useState } from 'react';
import { Gitsawe } from '../../domain/entities/Gitsawe';
import {
  gitsaweRepository,
  ruleRepository,
  templateRepository,
} from '../../repositories';
import { excelImportService } from '../../services/ExcelImportService';
import { createRuleDefinition } from '../../domain/entities/RuleDefinition';
import { toast } from '../../store/toastStore';
import { open } from '@tauri-apps/plugin-dialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/gitsawe-manager.css';

export const GitsaweManager: React.FC = () => {
  const [records, setRecords] = useState<Gitsawe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const all = await gitsaweRepository.getAll();
      setRecords(all);
    } catch (error) {
      console.error('Failed to load Gitsawe records:', error);
      toast.error('Failed to load Gitsawe records');
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

    // Need a templateId for the import service (required param, but we only use gitsawe data)
    const templates = await templateRepository.getAll();
    const dummyTemplateId = templates[0]?.id;
    if (!dummyTemplateId) {
      toast.error('No template available. Please create a template first.');
      return;
    }

    try {
      const result = await excelImportService.importFromPath(filePath, dummyTemplateId);

      if (result.gitsawes.length === 0) {
        toast.error('No Gitsawe data found in the Excel file. Make sure there is a "Gitsawe" sheet.');
        return;
      }

      // Clear existing gitsawe records + their rules
      const existing = await gitsaweRepository.getAll();
      for (const g of existing) {
        await ruleRepository.deleteByGitsaweId(g.id);
        await gitsaweRepository.delete(g.id);
      }

      // Create new records + selection rules
      for (const imported of result.gitsawes) {
        const created = await gitsaweRepository.create(imported.gitsawe);
        if (imported.selectionRule) {
          const ruleDef = createRuleDefinition(
            imported.selectionRule.name,
            'gitsawe',
            imported.selectionRule.ruleJson,
            {
              gitsaweId: created.id,
              isEnabled: true,
            }
          );
          await ruleRepository.create(ruleDef);
        }
      }

      await loadRecords();
      toast.success(`Imported ${result.gitsawes.length} Gitsawe records`);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import: ' + (error as Error).message);
    }
  }, [loadRecords]);

  const handleDeleteAllConfirm = useCallback(async () => {
    setShowConfirmDelete(false);

    setIsDeleting(true);
    try {
      for (const g of records) {
        await ruleRepository.deleteByGitsaweId(g.id);
        await gitsaweRepository.delete(g.id);
      }
      await loadRecords();
      toast.success('All Gitsawe records deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete Gitsawe records');
    }
    setIsDeleting(false);
  }, [records, loadRecords]);

  if (isLoading) {
    return <div className="gitsawe-loading">Loading...</div>;
  }

  return (
    <div className="gitsawe-container">
      {/* Toolbar */}
      <div className="gitsawe-toolbar">
        <div className="gitsawe-toolbar-left">
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
