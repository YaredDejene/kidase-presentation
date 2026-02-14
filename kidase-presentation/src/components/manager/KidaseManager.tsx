import React, { useCallback, useEffect, useState } from 'react';
import { Presentation } from '../../domain/entities/Presentation';
import {
  presentationRepository,
  slideRepository,
  templateRepository,
  variableRepository,
  ruleRepository,
} from '../../repositories';
import { createRuleDefinition } from '../../domain/entities/RuleDefinition';
import { excelImportService } from '../../services/ExcelImportService';
import { presentationService } from '../../services/PresentationService';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../store/toastStore';
import { open } from '@tauri-apps/plugin-dialog';
import { Template } from '../../domain/entities/Template';
import { ConfirmDialog } from '../common/ConfirmDialog';
import '../../styles/manager.css';

interface PresentationRow {
  presentation: Presentation;
  slideCount: number;
}

export const KidaseManager: React.FC = () => {
  const [rows, setRows] = useState<PresentationRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const {
    currentPresentation,
    setCurrentPresentation,
    setCurrentSlides,
    setCurrentTemplate,
    setCurrentVariables,
    setCurrentView,
    clearPresentationData,
  } = useAppStore();

  const loadPresentations = useCallback(async () => {
    try {
      const presentations = await presentationRepository.getAll();
      const rowsWithCount = await Promise.all(
        presentations.map(async (p) => ({
          presentation: p,
          slideCount: await slideRepository.count(p.id),
        }))
      );
      setRows(rowsWithCount);
    } catch (error) {
      console.error('Failed to load presentations:', error);
      toast.error('Failed to load presentations');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const loadedTemplates = await templateRepository.getAll();
      setTemplates(loadedTemplates);
      await loadPresentations();
      setIsLoading(false);
    };
    init();
  }, [loadPresentations]);

  const handleOpenPresentation = useCallback(async (id: string) => {
    try {
      const loaded = await presentationService.loadPresentation(id);
      if (!loaded) return;

      setCurrentPresentation(loaded.presentation);
      setCurrentSlides(loaded.slides);
      setCurrentTemplate(loaded.template);
      setCurrentVariables(loaded.variables);
      await presentationRepository.setActive(id);
      setCurrentView('presentation');
    } catch (error) {
      console.error('Failed to open presentation:', error);
      toast.error('Failed to open presentation');
    }
  }, [setCurrentPresentation, setCurrentSlides, setCurrentTemplate, setCurrentVariables, setCurrentView]);

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
      toast.success(`"${name}" deleted`);
    } catch (error) {
      console.error('Failed to delete presentation:', error);
      toast.error('Failed to delete presentation');
    }
    setDeletingId(null);
  }, [confirmDelete, currentPresentation, clearPresentationData, loadPresentations]);

  const handleImportExcel = useCallback(async () => {
    const filePath = await open({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!filePath || typeof filePath !== 'string') return;

    const defaultTemplate = templates[0];
    if (!defaultTemplate) {
      toast.error('No template available. Please create a template first.');
      return;
    }

    try {
      const result = await excelImportService.importFromPath(
        filePath,
        defaultTemplate.id,
      );

      // Create presentation
      const presentation = await presentationRepository.create(result.presentation);

      // Create slides
      const slidesWithId = result.slides.map(s => ({
        ...s,
        presentationId: presentation.id,
      }));
      const createdSlides = await slideRepository.createMany(slidesWithId);

      // Create variables
      for (const variable of result.variables) {
        await variableRepository.create({
          ...variable,
          presentationId: presentation.id,
        });
      }

      // Create display rules linked to slides
      for (const displayRule of result.displayRules) {
        const slide = createdSlides[displayRule.slideIndex];
        if (!slide) continue;

        const ruleDef = createRuleDefinition(
          displayRule.name,
          'slide',
          displayRule.ruleJson,
          {
            presentationId: presentation.id,
            slideId: slide.id,
            isEnabled: true,
          },
        );
        await ruleRepository.create(ruleDef);
      }

      // Skip gitsawe and verses import — handled from their own pages

      await loadPresentations();
      toast.success(`Imported "${presentation.name}"`);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import: ' + (error as Error).message);
    }
  }, [templates, loadPresentations]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLanguages = (p: Presentation) => {
    const langs = Object.values(p.languageMap).filter(Boolean);
    return langs.length > 0 ? langs.join(', ') : '--';
  };

  if (isLoading) {
    return <div className="manager-loading">Loading...</div>;
  }

  return (
    <div className="manager-container">
      {/* Toolbar */}
      <div className="manager-toolbar">
        <div className="manager-toolbar-left">
          <span className="manager-count">
            {rows.length} {rows.length === 1 ? 'presentation' : 'presentations'}
          </span>
        </div>
        <div className="manager-toolbar-right">
          <button onClick={handleImportExcel} className="manager-btn manager-btn-import">
            Import Excel
          </button>
        </div>
      </div>

      {/* Content */}
      {rows.length === 0 ? (
        <div className="manager-empty">
          <p>No presentations yet.</p>
          <p>Import from Excel to get started.</p>
        </div>
      ) : (
        <div className="manager-table-wrapper">
          <table className="manager-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Slides</th>
                <th>Languages</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ presentation: p, slideCount }) => (
                <tr
                  key={p.id}
                  className={`manager-row ${currentPresentation?.id === p.id ? 'manager-row--active' : ''}`}
                  onClick={() => handleOpenPresentation(p.id)}
                >
                  <td className="manager-cell-name">{p.name}</td>
                  <td>{p.type}</td>
                  <td>{slideCount}</td>
                  <td className="manager-cell-langs">{getLanguages(p)}</td>
                  <td className="manager-cell-date">{formatDate(p.createdAt)}</td>
                  <td className="manager-cell-actions">
                    <button
                      className="manager-btn-delete"
                      title="Delete"
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
        title="Delete Presentation"
        message={confirmDelete ? `Delete "${confirmDelete.name}" and all its slides? This cannot be undone.` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
