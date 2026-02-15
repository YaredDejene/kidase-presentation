# Multilingual Church Liturgy Presentation System
## Step-by-Step Implementation Guide

---

## Phase 1: Project Setup and Foundation

### Step 1.1: Install Prerequisites

```bash
# Install Rust (required for Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (v18 or higher recommended)
# Download from https://nodejs.org or use nvm

# Verify installations
rustc --version
node --version
npm --version
```

### Step 1.2: Create Tauri + React Project

```bash
# Create new Tauri project with React template
npm create tauri-app@latest kidase-presentation -- --template react-ts

# Navigate to project
cd kidase-presentation

# Install dependencies
npm install
```

### Step 1.3: Install Required Dependencies

```bash
# Frontend dependencies
npm install @tanstack/react-table    # Table-based editor
npm install react-router-dom         # Navigation
npm install zustand                  # State management
npm install xlsx                     # Excel import
npm install jspdf html2canvas        # PDF export

# Tauri plugins (in src-tauri folder)
cd src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add serde --features derive
cargo add serde_json
cd ..
```

### Step 1.4: Project Structure

Create the following folder structure:

```
kidase-presentation/
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   ├── SlideEditor.tsx
│   │   │   ├── SlideRow.tsx
│   │   │   ├── SlidePreview.tsx
│   │   │   └── TemplateSelector.tsx
│   │   ├── presentation/
│   │   │   ├── PresentationView.tsx
│   │   │   ├── SlideRenderer.tsx
│   │   │   └── PresenterControls.tsx
│   │   ├── templates/
│   │   │   ├── TemplateManager.tsx
│   │   │   └── TemplateEditor.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── LanguageInput.tsx
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Template.ts
│   │   │   ├── Presentation.ts
│   │   │   ├── Slide.ts
│   │   │   └── Variable.ts
│   │   └── interfaces/
│   │       ├── ITemplateRepository.ts
│   │       ├── IPresentationRepository.ts
│   │       ├── ISlideRepository.ts
│   │       └── IVariableRepository.ts
│   ├── repositories/
│   │   ├── sqlite/
│   │   │   ├── TemplateRepository.ts
│   │   │   ├── PresentationRepository.ts
│   │   │   ├── SlideRepository.ts
│   │   │   └── VariableRepository.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── ExcelImportService.ts
│   │   ├── PdfExportService.ts
│   │   ├── PlaceholderService.ts
│   │   └── PresentationService.ts
│   ├── hooks/
│   │   ├── usePresentation.ts
│   │   ├── useSlides.ts
│   │   └── useTemplates.ts
│   ├── store/
│   │   └── appStore.ts
│   ├── styles/
│   │   ├── global.css
│   │   ├── editor.css
│   │   └── presentation.css
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   └── main.rs
│   └── Cargo.toml
└── package.json
```

---

## Phase 2: Database Setup

### Step 2.1: Configure Tauri SQL Plugin

Update `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Step 2.2: Initialize Database in Rust

Update `src-tauri/src/main.rs`:

```rust
use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    max_lang_count INTEGER NOT NULL DEFAULT 4,
                    definition_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS presentations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    language_map TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (template_id) REFERENCES templates(id)
                );

                CREATE TABLE IF NOT EXISTS slides (
                    id TEXT PRIMARY KEY,
                    presentation_id TEXT NOT NULL,
                    slide_order INTEGER NOT NULL,
                    line_id TEXT,
                    title_json TEXT,
                    blocks_json TEXT NOT NULL,
                    notes TEXT,
                    is_disabled INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (presentation_id) REFERENCES presentations(id)
                );

                CREATE TABLE IF NOT EXISTS variables (
                    id TEXT PRIMARY KEY,
                    presentation_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    value TEXT NOT NULL,
                    FOREIGN KEY (presentation_id) REFERENCES presentations(id)
                );

                CREATE INDEX IF NOT EXISTS idx_slides_presentation
                    ON slides(presentation_id, slide_order);

                CREATE INDEX IF NOT EXISTS idx_variables_presentation
                    ON variables(presentation_id);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kidase.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 2.3: Create Database Connection Utility

Create `src/lib/database.ts`:

```typescript
import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:kidase.db');
  }
  return db;
}
```

---

## Phase 3: Domain Entities

### Step 3.1: Template Entity

Create `src/domain/entities/Template.ts`:

```typescript
export interface TemplateDefinition {
  layout: {
    columns: number;
    rows: number;
    gap: number;
  };
  title: {
    show: boolean;
    fontSize: number;
    color: string;
    alignment: 'left' | 'center' | 'right';
  };
  languages: {
    slot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4';
    fontSize: number;
    fontFamily: string;
    color: string;
    alignment: 'left' | 'center' | 'right';
    lineHeight: number;
  }[];
  background: {
    color: string;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  safeArea: {
    horizontal: number;
    vertical: number;
  };
}

export interface Template {
  id: string;
  name: string;
  maxLangCount: number;
  definitionJson: TemplateDefinition;
  createdAt: string;
}

export function createDefaultTemplate(): TemplateDefinition {
  return {
    layout: { columns: 2, rows: 1, gap: 40 },
    title: {
      show: true,
      fontSize: 32,
      color: '#FFD700',
      alignment: 'center',
    },
    languages: [
      {
        slot: 'Lang1',
        fontSize: 28,
        fontFamily: 'Nyala, serif',
        color: '#FFFFFF',
        alignment: 'center',
        lineHeight: 1.5,
      },
      {
        slot: 'Lang2',
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        alignment: 'center',
        lineHeight: 1.4,
      },
    ],
    background: { color: '#000000' },
    margins: { top: 40, right: 60, bottom: 40, left: 60 },
    safeArea: { horizontal: 5, vertical: 5 },
  };
}
```

### Step 3.2: Presentation Entity

Create `src/domain/entities/Presentation.ts`:

```typescript
export interface LanguageMap {
  Lang1?: string; // e.g., "Ge'ez"
  Lang2?: string; // e.g., "Amharic"
  Lang3?: string; // e.g., "English"
  Lang4?: string; // e.g., "Tigrinya"
}

export interface Presentation {
  id: string;
  name: string;
  type: string; // e.g., "Kidase", "Mahlet", "Seatat"
  templateId: string;
  languageMap: LanguageMap;
  isActive: boolean;
  createdAt: string;
}

export type PresentationType =
  | 'Kidase'
  | 'Mahlet'
  | 'Seatat'
  | 'Tselot'
  | 'Mezmur'
  | 'Custom';
```

### Step 3.3: Slide Entity

Create `src/domain/entities/Slide.ts`:

```typescript
export interface SlideTitle {
  Lang1?: string;
  Lang2?: string;
  Lang3?: string;
  Lang4?: string;
}

export interface SlideBlock {
  Lang1?: string;
  Lang2?: string;
  Lang3?: string;
  Lang4?: string;
}

export interface Slide {
  id: string;
  presentationId: string;
  slideOrder: number;
  lineId?: string;
  titleJson?: SlideTitle;
  blocksJson: SlideBlock[];
  notes?: string;
  isDisabled: boolean;
}
```

### Step 3.4: Variable Entity

Create `src/domain/entities/Variable.ts`:

```typescript
export interface Variable {
  id: string;
  presentationId: string;
  name: string;
  value: string;
}

// Common liturgical variables
export const COMMON_VARIABLES = [
  '{{PRIEST_NAME}}',
  '{{DEACON_NAME}}',
  '{{DATE_ETHIOPIAN}}',
  '{{DATE_GREGORIAN}}',
  '{{SAINT_NAME}}',
  '{{FEAST_NAME}}',
];
```

---

## Phase 4: Repository Interfaces

### Step 4.1: Template Repository Interface

Create `src/domain/interfaces/ITemplateRepository.ts`:

```typescript
import { Template } from '../entities/Template';

export interface ITemplateRepository {
  getAll(): Promise<Template[]>;
  getById(id: string): Promise<Template | null>;
  create(template: Omit<Template, 'id' | 'createdAt'>): Promise<Template>;
  update(id: string, template: Partial<Template>): Promise<Template>;
  delete(id: string): Promise<void>;
}
```

### Step 4.2: Presentation Repository Interface

Create `src/domain/interfaces/IPresentationRepository.ts`:

```typescript
import { Presentation } from '../entities/Presentation';

export interface IPresentationRepository {
  getAll(): Promise<Presentation[]>;
  getById(id: string): Promise<Presentation | null>;
  getActive(): Promise<Presentation | null>;
  setActive(id: string): Promise<void>;
  create(presentation: Omit<Presentation, 'id' | 'createdAt'>): Promise<Presentation>;
  update(id: string, presentation: Partial<Presentation>): Promise<Presentation>;
  delete(id: string): Promise<void>;
}
```

### Step 4.3: Slide Repository Interface

Create `src/domain/interfaces/ISlideRepository.ts`:

```typescript
import { Slide } from '../entities/Slide';

export interface ISlideRepository {
  getByPresentationId(presentationId: string): Promise<Slide[]>;
  getById(id: string): Promise<Slide | null>;
  create(slide: Omit<Slide, 'id'>): Promise<Slide>;
  createMany(slides: Omit<Slide, 'id'>[]): Promise<Slide[]>;
  update(id: string, slide: Partial<Slide>): Promise<Slide>;
  updateOrder(slides: { id: string; slideOrder: number }[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByPresentationId(presentationId: string): Promise<void>;
}
```

### Step 4.4: Variable Repository Interface

Create `src/domain/interfaces/IVariableRepository.ts`:

```typescript
import { Variable } from '../entities/Variable';

export interface IVariableRepository {
  getByPresentationId(presentationId: string): Promise<Variable[]>;
  getById(id: string): Promise<Variable | null>;
  create(variable: Omit<Variable, 'id'>): Promise<Variable>;
  update(id: string, variable: Partial<Variable>): Promise<Variable>;
  delete(id: string): Promise<void>;
  deleteByPresentationId(presentationId: string): Promise<void>;
}
```

---

## Phase 5: SQLite Repository Implementations

### Step 5.1: Template Repository

Create `src/repositories/sqlite/TemplateRepository.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Template, TemplateDefinition } from '../../domain/entities/Template';
import { ITemplateRepository } from '../../domain/interfaces/ITemplateRepository';

interface TemplateRow {
  id: string;
  name: string;
  max_lang_count: number;
  definition_json: string;
  created_at: string;
}

export class TemplateRepository implements ITemplateRepository {
  private mapRowToEntity(row: TemplateRow): Template {
    return {
      id: row.id,
      name: row.name,
      maxLangCount: row.max_lang_count,
      definitionJson: JSON.parse(row.definition_json),
      createdAt: row.created_at,
    };
  }

  async getAll(): Promise<Template[]> {
    const db = await getDatabase();
    const rows = await db.select<TemplateRow[]>(
      'SELECT * FROM templates ORDER BY name'
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Template | null> {
    const db = await getDatabase();
    const rows = await db.select<TemplateRow[]>(
      'SELECT * FROM templates WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async create(template: Omit<Template, 'id' | 'createdAt'>): Promise<Template> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO templates (id, name, max_lang_count, definition_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        template.name,
        template.maxLangCount,
        JSON.stringify(template.definitionJson),
        createdAt,
      ]
    );

    return { ...template, id, createdAt };
  }

  async update(id: string, template: Partial<Template>): Promise<Template> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Template not found');

    const updated = { ...existing, ...template };

    await db.execute(
      `UPDATE templates
       SET name = ?, max_lang_count = ?, definition_json = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.maxLangCount,
        JSON.stringify(updated.definitionJson),
        id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM templates WHERE id = ?', [id]);
  }
}
```

### Step 5.2: Presentation Repository

Create `src/repositories/sqlite/PresentationRepository.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Presentation, LanguageMap } from '../../domain/entities/Presentation';
import { IPresentationRepository } from '../../domain/interfaces/IPresentationRepository';

interface PresentationRow {
  id: string;
  name: string;
  type: string;
  template_id: string;
  language_map: string;
  is_active: number;
  created_at: string;
}

export class PresentationRepository implements IPresentationRepository {
  private mapRowToEntity(row: PresentationRow): Presentation {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      templateId: row.template_id,
      languageMap: JSON.parse(row.language_map),
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  async getAll(): Promise<Presentation[]> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations ORDER BY created_at DESC'
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Presentation | null> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getActive(): Promise<Presentation | null> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE is_active = 1 LIMIT 1'
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async setActive(id: string): Promise<void> {
    const db = await getDatabase();
    // Deactivate all presentations first
    await db.execute('UPDATE presentations SET is_active = 0');
    // Activate the selected one
    await db.execute('UPDATE presentations SET is_active = 1 WHERE id = ?', [id]);
  }

  async create(
    presentation: Omit<Presentation, 'id' | 'createdAt'>
  ): Promise<Presentation> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO presentations
       (id, name, type, template_id, language_map, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        presentation.name,
        presentation.type,
        presentation.templateId,
        JSON.stringify(presentation.languageMap),
        presentation.isActive ? 1 : 0,
        createdAt,
      ]
    );

    return { ...presentation, id, createdAt };
  }

  async update(id: string, presentation: Partial<Presentation>): Promise<Presentation> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Presentation not found');

    const updated = { ...existing, ...presentation };

    await db.execute(
      `UPDATE presentations
       SET name = ?, type = ?, template_id = ?, language_map = ?, is_active = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.type,
        updated.templateId,
        JSON.stringify(updated.languageMap),
        updated.isActive ? 1 : 0,
        id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM presentations WHERE id = ?', [id]);
  }
}
```

### Step 5.3: Slide Repository

Create `src/repositories/sqlite/SlideRepository.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Slide, SlideTitle, SlideBlock } from '../../domain/entities/Slide';
import { ISlideRepository } from '../../domain/interfaces/ISlideRepository';

interface SlideRow {
  id: string;
  presentation_id: string;
  slide_order: number;
  line_id: string | null;
  title_json: string | null;
  blocks_json: string;
  notes: string | null;
  is_disabled: number;
}

export class SlideRepository implements ISlideRepository {
  private mapRowToEntity(row: SlideRow): Slide {
    return {
      id: row.id,
      presentationId: row.presentation_id,
      slideOrder: row.slide_order,
      lineId: row.line_id ?? undefined,
      titleJson: row.title_json ? JSON.parse(row.title_json) : undefined,
      blocksJson: JSON.parse(row.blocks_json),
      notes: row.notes ?? undefined,
      isDisabled: row.is_disabled === 1,
    };
  }

  async getByPresentationId(presentationId: string): Promise<Slide[]> {
    const db = await getDatabase();
    const rows = await db.select<SlideRow[]>(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY slide_order',
      [presentationId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Slide | null> {
    const db = await getDatabase();
    const rows = await db.select<SlideRow[]>(
      'SELECT * FROM slides WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async create(slide: Omit<Slide, 'id'>): Promise<Slide> {
    const db = await getDatabase();
    const id = uuidv4();

    await db.execute(
      `INSERT INTO slides
       (id, presentation_id, slide_order, line_id, title_json, blocks_json, notes, is_disabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        slide.presentationId,
        slide.slideOrder,
        slide.lineId ?? null,
        slide.titleJson ? JSON.stringify(slide.titleJson) : null,
        JSON.stringify(slide.blocksJson),
        slide.notes ?? null,
        slide.isDisabled ? 1 : 0,
      ]
    );

    return { ...slide, id };
  }

  async createMany(slides: Omit<Slide, 'id'>[]): Promise<Slide[]> {
    const db = await getDatabase();
    const createdSlides: Slide[] = [];

    for (const slide of slides) {
      const id = uuidv4();
      await db.execute(
        `INSERT INTO slides
         (id, presentation_id, slide_order, line_id, title_json, blocks_json, notes, is_disabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          slide.presentationId,
          slide.slideOrder,
          slide.lineId ?? null,
          slide.titleJson ? JSON.stringify(slide.titleJson) : null,
          JSON.stringify(slide.blocksJson),
          slide.notes ?? null,
          slide.isDisabled ? 1 : 0,
        ]
      );
      createdSlides.push({ ...slide, id });
    }

    return createdSlides;
  }

  async update(id: string, slide: Partial<Slide>): Promise<Slide> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Slide not found');

    const updated = { ...existing, ...slide };

    await db.execute(
      `UPDATE slides
       SET slide_order = ?, line_id = ?, title_json = ?, blocks_json = ?,
           notes = ?, is_disabled = ?
       WHERE id = ?`,
      [
        updated.slideOrder,
        updated.lineId ?? null,
        updated.titleJson ? JSON.stringify(updated.titleJson) : null,
        JSON.stringify(updated.blocksJson),
        updated.notes ?? null,
        updated.isDisabled ? 1 : 0,
        id,
      ]
    );

    return updated;
  }

  async updateOrder(slides: { id: string; slideOrder: number }[]): Promise<void> {
    const db = await getDatabase();
    for (const slide of slides) {
      await db.execute(
        'UPDATE slides SET slide_order = ? WHERE id = ?',
        [slide.slideOrder, slide.id]
      );
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM slides WHERE id = ?', [id]);
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM slides WHERE presentation_id = ?', [presentationId]);
  }
}
```

### Step 5.4: Variable Repository

Create `src/repositories/sqlite/VariableRepository.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Variable } from '../../domain/entities/Variable';
import { IVariableRepository } from '../../domain/interfaces/IVariableRepository';

interface VariableRow {
  id: string;
  presentation_id: string;
  name: string;
  value: string;
}

export class VariableRepository implements IVariableRepository {
  private mapRowToEntity(row: VariableRow): Variable {
    return {
      id: row.id,
      presentationId: row.presentation_id,
      name: row.name,
      value: row.value,
    };
  }

  async getByPresentationId(presentationId: string): Promise<Variable[]> {
    const db = await getDatabase();
    const rows = await db.select<VariableRow[]>(
      'SELECT * FROM variables WHERE presentation_id = ? ORDER BY name',
      [presentationId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Variable | null> {
    const db = await getDatabase();
    const rows = await db.select<VariableRow[]>(
      'SELECT * FROM variables WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async create(variable: Omit<Variable, 'id'>): Promise<Variable> {
    const db = await getDatabase();
    const id = uuidv4();

    await db.execute(
      `INSERT INTO variables (id, presentation_id, name, value)
       VALUES (?, ?, ?, ?)`,
      [id, variable.presentationId, variable.name, variable.value]
    );

    return { ...variable, id };
  }

  async update(id: string, variable: Partial<Variable>): Promise<Variable> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Variable not found');

    const updated = { ...existing, ...variable };

    await db.execute(
      `UPDATE variables SET name = ?, value = ? WHERE id = ?`,
      [updated.name, updated.value, id]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM variables WHERE id = ?', [id]);
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM variables WHERE presentation_id = ?', [presentationId]);
  }
}
```

### Step 5.5: Repository Index

Create `src/repositories/index.ts`:

```typescript
import { TemplateRepository } from './sqlite/TemplateRepository';
import { PresentationRepository } from './sqlite/PresentationRepository';
import { SlideRepository } from './sqlite/SlideRepository';
import { VariableRepository } from './sqlite/VariableRepository';

// Singleton instances
export const templateRepository = new TemplateRepository();
export const presentationRepository = new PresentationRepository();
export const slideRepository = new SlideRepository();
export const variableRepository = new VariableRepository();
```

---

## Phase 6: Application Services

### Step 6.1: Excel Import Service

Create `src/services/ExcelImportService.ts`:

```typescript
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Presentation, LanguageMap } from '../domain/entities/Presentation';
import { Slide, SlideBlock, SlideTitle } from '../domain/entities/Slide';
import { Variable } from '../domain/entities/Variable';

interface ImportMetadata {
  presentationName: string;
  presentationType: string;
  templateName?: string;
  lang1Name?: string;
  lang2Name?: string;
  lang3Name?: string;
  lang4Name?: string;
}

interface ImportedSlideRow {
  LineID?: string;
  Title_Lang1?: string;
  Title_Lang2?: string;
  Title_Lang3?: string;
  Title_Lang4?: string;
  Lang1?: string;
  Lang2?: string;
  Lang3?: string;
  Lang4?: string;
  Notes?: string;
}

interface ImportResult {
  presentation: Omit<Presentation, 'id' | 'createdAt'>;
  slides: Omit<Slide, 'id'>[];
  variables: Omit<Variable, 'id'>[];
}

export class ExcelImportService {
  async importFromFile(filePath: string, templateId: string): Promise<ImportResult> {
    const workbook = XLSX.readFile(filePath);

    // Read metadata sheet
    const metadataSheet = workbook.Sheets['Metadata'];
    if (!metadataSheet) {
      throw new Error('Metadata sheet not found in Excel file');
    }

    const metadata = this.parseMetadata(metadataSheet);

    // Read content sheet
    const contentSheet = workbook.Sheets['Content'] || workbook.Sheets[workbook.SheetNames[1]];
    if (!contentSheet) {
      throw new Error('Content sheet not found in Excel file');
    }

    const rows = XLSX.utils.sheet_to_json<ImportedSlideRow>(contentSheet);

    // Build language map
    const languageMap: LanguageMap = {};
    if (metadata.lang1Name) languageMap.Lang1 = metadata.lang1Name;
    if (metadata.lang2Name) languageMap.Lang2 = metadata.lang2Name;
    if (metadata.lang3Name) languageMap.Lang3 = metadata.lang3Name;
    if (metadata.lang4Name) languageMap.Lang4 = metadata.lang4Name;

    // Build presentation
    const presentation: Omit<Presentation, 'id' | 'createdAt'> = {
      name: metadata.presentationName,
      type: metadata.presentationType,
      templateId: templateId,
      languageMap: languageMap,
      isActive: false,
    };

    // Build slides
    const slides = this.parseSlides(rows);

    // Extract variables from content
    const variables = this.extractVariables(rows);

    return { presentation, slides, variables };
  }

  private parseMetadata(sheet: XLSX.WorkSheet): ImportMetadata {
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { header: 1 });
    const metadata: Record<string, string> = {};

    for (const row of data as string[][]) {
      if (row.length >= 2) {
        metadata[row[0]] = row[1];
      }
    }

    return {
      presentationName: metadata['PresentationName'] || 'Untitled',
      presentationType: metadata['PresentationType'] || 'Custom',
      templateName: metadata['TemplateName'],
      lang1Name: metadata['Lang1Name'],
      lang2Name: metadata['Lang2Name'],
      lang3Name: metadata['Lang3Name'],
      lang4Name: metadata['Lang4Name'],
    };
  }

  private parseSlides(rows: ImportedSlideRow[]): Omit<Slide, 'id'>[] {
    const presentationId = ''; // Will be set after presentation is created

    return rows.map((row, index) => {
      const title: SlideTitle = {};
      if (row.Title_Lang1) title.Lang1 = row.Title_Lang1;
      if (row.Title_Lang2) title.Lang2 = row.Title_Lang2;
      if (row.Title_Lang3) title.Lang3 = row.Title_Lang3;
      if (row.Title_Lang4) title.Lang4 = row.Title_Lang4;

      const block: SlideBlock = {};
      if (row.Lang1) block.Lang1 = row.Lang1;
      if (row.Lang2) block.Lang2 = row.Lang2;
      if (row.Lang3) block.Lang3 = row.Lang3;
      if (row.Lang4) block.Lang4 = row.Lang4;

      return {
        presentationId,
        slideOrder: index + 1,
        lineId: row.LineID,
        titleJson: Object.keys(title).length > 0 ? title : undefined,
        blocksJson: [block],
        notes: row.Notes,
        isDisabled: false,
      };
    });
  }

  private extractVariables(rows: ImportedSlideRow[]): Omit<Variable, 'id'>[] {
    const variablePattern = /\{\{([A-Z_]+)\}\}/g;
    const foundVariables = new Set<string>();
    const presentationId = ''; // Will be set after presentation is created

    for (const row of rows) {
      const allText = [
        row.Lang1, row.Lang2, row.Lang3, row.Lang4,
        row.Title_Lang1, row.Title_Lang2, row.Title_Lang3, row.Title_Lang4
      ].filter(Boolean).join(' ');

      let match;
      while ((match = variablePattern.exec(allText)) !== null) {
        foundVariables.add(match[0]);
      }
    }

    return Array.from(foundVariables).map(name => ({
      presentationId,
      name,
      value: '',
    }));
  }
}

export const excelImportService = new ExcelImportService();
```

### Step 6.2: Placeholder Service

Create `src/services/PlaceholderService.ts`:

```typescript
import { Variable } from '../domain/entities/Variable';
import { SlideBlock, SlideTitle } from '../domain/entities/Slide';

export class PlaceholderService {
  /**
   * Replace all placeholders in text with variable values
   */
  replaceInText(text: string, variables: Variable[]): string {
    let result = text;

    for (const variable of variables) {
      const pattern = new RegExp(this.escapeRegex(variable.name), 'g');
      result = result.replace(pattern, variable.value);
    }

    return result;
  }

  /**
   * Replace placeholders in a slide block
   */
  replaceInBlock(block: SlideBlock, variables: Variable[]): SlideBlock {
    const result: SlideBlock = {};

    if (block.Lang1) result.Lang1 = this.replaceInText(block.Lang1, variables);
    if (block.Lang2) result.Lang2 = this.replaceInText(block.Lang2, variables);
    if (block.Lang3) result.Lang3 = this.replaceInText(block.Lang3, variables);
    if (block.Lang4) result.Lang4 = this.replaceInText(block.Lang4, variables);

    return result;
  }

  /**
   * Replace placeholders in a slide title
   */
  replaceInTitle(title: SlideTitle, variables: Variable[]): SlideTitle {
    const result: SlideTitle = {};

    if (title.Lang1) result.Lang1 = this.replaceInText(title.Lang1, variables);
    if (title.Lang2) result.Lang2 = this.replaceInText(title.Lang2, variables);
    if (title.Lang3) result.Lang3 = this.replaceInText(title.Lang3, variables);
    if (title.Lang4) result.Lang4 = this.replaceInText(title.Lang4, variables);

    return result;
  }

  /**
   * Find all placeholders in text
   */
  findPlaceholders(text: string): string[] {
    const pattern = /\{\{([A-Z_]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (!matches.includes(match[0])) {
        matches.push(match[0]);
      }
    }

    return matches;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const placeholderService = new PlaceholderService();
```

### Step 6.3: PDF Export Service

Create `src/services/PdfExportService.ts`:

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Slide } from '../domain/entities/Slide';
import { Template } from '../domain/entities/Template';

export class PdfExportService {
  async exportToPdf(
    slides: Slide[],
    template: Template,
    outputPath: string
  ): Promise<void> {
    // Create PDF in landscape orientation (16:9 ratio)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080],
    });

    const enabledSlides = slides.filter(s => !s.isDisabled);

    for (let i = 0; i < enabledSlides.length; i++) {
      const slide = enabledSlides[i];

      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.style.width = '1920px';
      container.style.height = '1080px';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.backgroundColor = template.definitionJson.background.color;

      // Render slide content
      this.renderSlideToElement(container, slide, template);
      document.body.appendChild(container);

      // Convert to canvas
      const canvas = await html2canvas(container, {
        width: 1920,
        height: 1080,
        backgroundColor: template.definitionJson.background.color,
      });

      // Add page (except for first slide)
      if (i > 0) {
        pdf.addPage();
      }

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);

      // Clean up
      document.body.removeChild(container);
    }

    // Save the PDF
    pdf.save(outputPath);
  }

  private renderSlideToElement(
    container: HTMLElement,
    slide: Slide,
    template: Template
  ): void {
    const def = template.definitionJson;

    // Apply margins
    container.style.padding = `${def.margins.top}px ${def.margins.right}px ${def.margins.bottom}px ${def.margins.left}px`;
    container.style.boxSizing = 'border-box';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Render title if present
    if (slide.titleJson && def.title.show) {
      const titleEl = document.createElement('div');
      titleEl.style.fontSize = `${def.title.fontSize}px`;
      titleEl.style.color = def.title.color;
      titleEl.style.textAlign = def.title.alignment;
      titleEl.style.marginBottom = '20px';

      // Get first available title language
      const titleText = slide.titleJson.Lang1 || slide.titleJson.Lang2 ||
                       slide.titleJson.Lang3 || slide.titleJson.Lang4 || '';
      titleEl.textContent = titleText;
      container.appendChild(titleEl);
    }

    // Render content blocks
    const contentWrapper = document.createElement('div');
    contentWrapper.style.display = 'grid';
    contentWrapper.style.gridTemplateColumns = `repeat(${def.layout.columns}, 1fr)`;
    contentWrapper.style.gap = `${def.layout.gap}px`;
    contentWrapper.style.flex = '1';

    for (const langDef of def.languages) {
      const block = slide.blocksJson[0];
      const text = block[langDef.slot as keyof typeof block];

      if (text) {
        const langEl = document.createElement('div');
        langEl.style.fontSize = `${langDef.fontSize}px`;
        langEl.style.fontFamily = langDef.fontFamily;
        langEl.style.color = langDef.color;
        langEl.style.textAlign = langDef.alignment;
        langEl.style.lineHeight = String(langDef.lineHeight);
        langEl.textContent = text;
        contentWrapper.appendChild(langEl);
      }
    }

    container.appendChild(contentWrapper);
  }
}

export const pdfExportService = new PdfExportService();
```

---

## Phase 7: State Management

### Step 7.1: App Store with Zustand

Create `src/store/appStore.ts`:

```typescript
import { create } from 'zustand';
import { Presentation } from '../domain/entities/Presentation';
import { Slide } from '../domain/entities/Slide';
import { Template } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';

interface AppState {
  // Current presentation
  currentPresentation: Presentation | null;
  currentSlides: Slide[];
  currentTemplate: Template | null;
  currentVariables: Variable[];

  // Presentation mode
  isPresenting: boolean;
  currentSlideIndex: number;

  // Edit mode
  isEditing: boolean;
  selectedSlideId: string | null;

  // Actions
  setCurrentPresentation: (presentation: Presentation | null) => void;
  setCurrentSlides: (slides: Slide[]) => void;
  setCurrentTemplate: (template: Template | null) => void;
  setCurrentVariables: (variables: Variable[]) => void;

  // Presentation controls
  startPresentation: () => void;
  stopPresentation: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;

  // Edit controls
  startEditing: () => void;
  stopEditing: () => void;
  selectSlide: (id: string | null) => void;
  updateSlide: (id: string, updates: Partial<Slide>) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentPresentation: null,
  currentSlides: [],
  currentTemplate: null,
  currentVariables: [],
  isPresenting: false,
  currentSlideIndex: 0,
  isEditing: false,
  selectedSlideId: null,

  // Setters
  setCurrentPresentation: (presentation) => set({ currentPresentation: presentation }),
  setCurrentSlides: (slides) => set({ currentSlides: slides }),
  setCurrentTemplate: (template) => set({ currentTemplate: template }),
  setCurrentVariables: (variables) => set({ currentVariables: variables }),

  // Presentation controls
  startPresentation: () => {
    const slides = get().currentSlides.filter(s => !s.isDisabled);
    if (slides.length > 0) {
      set({ isPresenting: true, currentSlideIndex: 0 });
      // Enter fullscreen
      document.documentElement.requestFullscreen?.();
    }
  },

  stopPresentation: () => {
    set({ isPresenting: false, currentSlideIndex: 0 });
    document.exitFullscreen?.();
  },

  nextSlide: () => {
    const { currentSlideIndex, currentSlides } = get();
    const enabledSlides = currentSlides.filter(s => !s.isDisabled);
    if (currentSlideIndex < enabledSlides.length - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },

  previousSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },

  goToSlide: (index) => {
    const enabledSlides = get().currentSlides.filter(s => !s.isDisabled);
    if (index >= 0 && index < enabledSlides.length) {
      set({ currentSlideIndex: index });
    }
  },

  // Edit controls
  startEditing: () => set({ isEditing: true }),
  stopEditing: () => set({ isEditing: false, selectedSlideId: null }),
  selectSlide: (id) => set({ selectedSlideId: id }),

  updateSlide: (id, updates) => {
    const slides = get().currentSlides.map(slide =>
      slide.id === id ? { ...slide, ...updates } : slide
    );
    set({ currentSlides: slides });
  },

  reorderSlides: (fromIndex, toIndex) => {
    const slides = [...get().currentSlides];
    const [removed] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, removed);

    // Update slide orders
    const reorderedSlides = slides.map((slide, index) => ({
      ...slide,
      slideOrder: index + 1,
    }));

    set({ currentSlides: reorderedSlides });
  },
}));
```

---

## Phase 8: Core UI Components

### Step 8.1: Slide Renderer Component

Create `src/components/presentation/SlideRenderer.tsx`:

```typescript
import React from 'react';
import { Slide, SlideBlock } from '../../domain/entities/Slide';
import { Template, TemplateDefinition } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { placeholderService } from '../../services/PlaceholderService';
import { LanguageMap } from '../../domain/entities/Presentation';

interface SlideRendererProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  template,
  variables,
  languageMap,
}) => {
  const def = template.definitionJson;

  const getProcessedBlock = (block: SlideBlock): SlideBlock => {
    return placeholderService.replaceInBlock(block, variables);
  };

  const renderLanguageContent = (
    langSlot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4',
    langDef: TemplateDefinition['languages'][0]
  ) => {
    const block = slide.blocksJson[0];
    const processedBlock = getProcessedBlock(block);
    const text = processedBlock[langSlot];
    const langName = languageMap[langSlot];

    if (!text) return null;

    return (
      <div
        key={langSlot}
        style={{
          fontSize: `${langDef.fontSize}px`,
          fontFamily: langDef.fontFamily,
          color: langDef.color,
          textAlign: langDef.alignment,
          lineHeight: langDef.lineHeight,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    );
  };

  const renderTitle = () => {
    if (!slide.titleJson || !def.title.show) return null;

    const processedTitle = placeholderService.replaceInTitle(slide.titleJson, variables);
    const titleText = processedTitle.Lang1 || processedTitle.Lang2 ||
                     processedTitle.Lang3 || processedTitle.Lang4;

    if (!titleText) return null;

    return (
      <div
        style={{
          fontSize: `${def.title.fontSize}px`,
          color: def.title.color,
          textAlign: def.title.alignment,
          marginBottom: '30px',
          fontWeight: 'bold',
        }}
      >
        {titleText}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: def.background.color,
        padding: `${def.margins.top}px ${def.margins.right}px ${def.margins.bottom}px ${def.margins.left}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderTitle()}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${def.layout.columns}, 1fr)`,
          gap: `${def.layout.gap}px`,
          flex: 1,
          alignContent: 'center',
        }}
      >
        {def.languages.map((langDef) =>
          renderLanguageContent(langDef.slot, langDef)
        )}
      </div>
    </div>
  );
};
```

### Step 8.2: Presentation View Component

Create `src/components/presentation/PresentationView.tsx`:

```typescript
import React, { useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { SlideRenderer } from './SlideRenderer';

export const PresentationView: React.FC = () => {
  const {
    currentSlides,
    currentTemplate,
    currentPresentation,
    currentVariables,
    currentSlideIndex,
    isPresenting,
    nextSlide,
    previousSlide,
    stopPresentation,
    goToSlide,
  } = useAppStore();

  const enabledSlides = currentSlides.filter(s => !s.isDisabled);
  const currentSlide = enabledSlides[currentSlideIndex];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
        event.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        previousSlide();
        break;
      case 'Escape':
        event.preventDefault();
        stopPresentation();
        break;
      case 'Home':
        event.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        event.preventDefault();
        goToSlide(enabledSlides.length - 1);
        break;
    }
  }, [nextSlide, previousSlide, stopPresentation, goToSlide, enabledSlides.length]);

  useEffect(() => {
    if (isPresenting) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPresenting, handleKeyDown]);

  if (!isPresenting || !currentSlide || !currentTemplate || !currentPresentation) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        cursor: 'none',
      }}
      onClick={nextSlide}
    >
      <SlideRenderer
        slide={currentSlide}
        template={currentTemplate}
        variables={currentVariables}
        languageMap={currentPresentation.languageMap}
      />

      {/* Slide counter (hidden from audience, visible on hover) */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          color: 'rgba(255, 255, 255, 0.3)',
          fontSize: '14px',
          fontFamily: 'monospace',
        }}
      >
        {currentSlideIndex + 1} / {enabledSlides.length}
      </div>
    </div>
  );
};
```

### Step 8.3: Slide Editor Component

Create `src/components/editor/SlideEditor.tsx`:

```typescript
import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { SlideRow } from './SlideRow';
import { SlidePreview } from './SlidePreview';
import { slideRepository } from '../../repositories';

export const SlideEditor: React.FC = () => {
  const {
    currentSlides,
    currentTemplate,
    currentPresentation,
    currentVariables,
    selectedSlideId,
    selectSlide,
    updateSlide,
    reorderSlides,
  } = useAppStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderSlides(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      // Persist reordering to database
      const updates = currentSlides.map((slide, index) => ({
        id: slide.id,
        slideOrder: index + 1,
      }));
      await slideRepository.updateOrder(updates);
    }
    setDraggedIndex(null);
  };

  const handleToggleDisable = async (slideId: string) => {
    const slide = currentSlides.find(s => s.id === slideId);
    if (slide) {
      const updated = await slideRepository.update(slideId, {
        isDisabled: !slide.isDisabled,
      });
      updateSlide(slideId, { isDisabled: updated.isDisabled });
    }
  };

  const selectedSlide = currentSlides.find(s => s.id === selectedSlideId);

  if (!currentPresentation || !currentTemplate) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No presentation loaded. Please open or create a presentation.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Slide list */}
      <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #333' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', position: 'sticky', top: 0 }}>
              <th style={{ padding: '10px', textAlign: 'left', width: '40px' }}>#</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Content</th>
              <th style={{ padding: '10px', textAlign: 'center', width: '80px' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentSlides.map((slide, index) => (
              <SlideRow
                key={slide.id}
                slide={slide}
                index={index}
                isSelected={slide.id === selectedSlideId}
                languageMap={currentPresentation.languageMap}
                onSelect={() => selectSlide(slide.id)}
                onToggleDisable={() => handleToggleDisable(slide.id)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview panel */}
      <div style={{ width: '400px', padding: '20px', backgroundColor: '#0a0a0a' }}>
        <h3 style={{ marginBottom: '10px' }}>Preview</h3>
        {selectedSlide ? (
          <SlidePreview
            slide={selectedSlide}
            template={currentTemplate}
            variables={currentVariables}
            languageMap={currentPresentation.languageMap}
          />
        ) : (
          <p style={{ color: '#666' }}>Select a slide to preview</p>
        )}
      </div>
    </div>
  );
};
```

### Step 8.4: Slide Row Component

Create `src/components/editor/SlideRow.tsx`:

```typescript
import React from 'react';
import { Slide } from '../../domain/entities/Slide';
import { LanguageMap } from '../../domain/entities/Presentation';

interface SlideRowProps {
  slide: Slide;
  index: number;
  isSelected: boolean;
  languageMap: LanguageMap;
  onSelect: () => void;
  onToggleDisable: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const SlideRow: React.FC<SlideRowProps> = ({
  slide,
  index,
  isSelected,
  languageMap,
  onSelect,
  onToggleDisable,
  onDragStart,
  onDragOver,
  onDragEnd,
}) => {
  const block = slide.blocksJson[0] || {};
  const previewText = block.Lang1 || block.Lang2 || block.Lang3 || block.Lang4 || '';
  const truncatedText = previewText.length > 80
    ? previewText.substring(0, 80) + '...'
    : previewText;

  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={{
        backgroundColor: isSelected ? '#2a2a4a' : slide.isDisabled ? '#1a1a1a' : 'transparent',
        opacity: slide.isDisabled ? 0.5 : 1,
        cursor: 'pointer',
        borderBottom: '1px solid #333',
      }}
    >
      <td style={{ padding: '10px', color: '#888' }}>
        {index + 1}
      </td>
      <td style={{ padding: '10px' }}>
        {slide.titleJson?.Lang1 && (
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#FFD700' }}>
            {slide.titleJson.Lang1}
          </div>
        )}
        <div style={{ color: '#ccc', fontSize: '14px' }}>
          {truncatedText}
        </div>
        {slide.notes && (
          <div style={{ color: '#888', fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>
            Note: {slide.notes}
          </div>
        )}
      </td>
      <td style={{ padding: '10px', textAlign: 'center' }}>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: slide.isDisabled ? '#660000' : '#006600',
          color: 'white',
        }}>
          {slide.isDisabled ? 'Disabled' : 'Active'}
        </span>
      </td>
      <td style={{ padding: '10px', textAlign: 'center' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDisable();
          }}
          style={{
            padding: '4px 8px',
            cursor: 'pointer',
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: 'white',
          }}
        >
          {slide.isDisabled ? 'Enable' : 'Disable'}
        </button>
      </td>
    </tr>
  );
};
```

### Step 8.5: Slide Preview Component

Create `src/components/editor/SlidePreview.tsx`:

```typescript
import React from 'react';
import { Slide } from '../../domain/entities/Slide';
import { Template } from '../../domain/entities/Template';
import { Variable } from '../../domain/entities/Variable';
import { LanguageMap } from '../../domain/entities/Presentation';
import { SlideRenderer } from '../presentation/SlideRenderer';

interface SlidePreviewProps {
  slide: Slide;
  template: Template;
  variables: Variable[];
  languageMap: LanguageMap;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  template,
  variables,
  languageMap,
}) => {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        border: '2px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }}
      >
        <SlideRenderer
          slide={slide}
          template={template}
          variables={variables}
          languageMap={languageMap}
        />
      </div>
    </div>
  );
};
```

---

## Phase 9: Main Application

### Step 9.1: App Component

Create `src/App.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { SlideEditor } from './components/editor/SlideEditor';
import { PresentationView } from './components/presentation/PresentationView';
import {
  templateRepository,
  presentationRepository,
  slideRepository,
  variableRepository
} from './repositories';
import { Template, createDefaultTemplate } from './domain/entities/Template';
import { Presentation } from './domain/entities/Presentation';
import { excelImportService } from './services/ExcelImportService';
import { pdfExportService } from './services/PdfExportService';
import { open, save } from '@tauri-apps/plugin-dialog';
import './styles/global.css';

function App() {
  const {
    currentPresentation,
    currentSlides,
    currentTemplate,
    currentVariables,
    isPresenting,
    setCurrentPresentation,
    setCurrentSlides,
    setCurrentTemplate,
    setCurrentVariables,
    startPresentation,
  } = useAppStore();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load all templates
        let loadedTemplates = await templateRepository.getAll();

        // Create default template if none exist
        if (loadedTemplates.length === 0) {
          const defaultTemplate = await templateRepository.create({
            name: 'Default Template',
            maxLangCount: 4,
            definitionJson: createDefaultTemplate(),
          });
          loadedTemplates = [defaultTemplate];
        }
        setTemplates(loadedTemplates);

        // Load all presentations
        const loadedPresentations = await presentationRepository.getAll();
        setPresentations(loadedPresentations);

        // Load active presentation if exists
        const active = await presentationRepository.getActive();
        if (active) {
          await loadPresentation(active.id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  const loadPresentation = async (id: string) => {
    const presentation = await presentationRepository.getById(id);
    if (!presentation) return;

    const slides = await slideRepository.getByPresentationId(id);
    const template = await templateRepository.getById(presentation.templateId);
    const variables = await variableRepository.getByPresentationId(id);

    setCurrentPresentation(presentation);
    setCurrentSlides(slides);
    setCurrentTemplate(template);
    setCurrentVariables(variables);

    await presentationRepository.setActive(id);
  };

  const handleImportExcel = async () => {
    const filePath = await open({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!filePath || typeof filePath !== 'string') return;

    try {
      const result = await excelImportService.importFromFile(
        filePath,
        templates[0].id // Use first template as default
      );

      // Create presentation
      const presentation = await presentationRepository.create(result.presentation);

      // Create slides with presentation ID
      const slidesWithId = result.slides.map(s => ({
        ...s,
        presentationId: presentation.id,
      }));
      await slideRepository.createMany(slidesWithId);

      // Create variables with presentation ID
      for (const variable of result.variables) {
        await variableRepository.create({
          ...variable,
          presentationId: presentation.id,
        });
      }

      // Refresh and load the new presentation
      setPresentations(await presentationRepository.getAll());
      await loadPresentation(presentation.id);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import Excel file: ' + (error as Error).message);
    }
  };

  const handleExportPdf = async () => {
    if (!currentPresentation || !currentTemplate) return;

    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${currentPresentation.name}.pdf`,
    });

    if (!filePath) return;

    try {
      await pdfExportService.exportToPdf(
        currentSlides,
        currentTemplate,
        filePath
      );
      alert('PDF exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF: ' + (error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#fff',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#fff',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #333',
        backgroundColor: '#1a1a1a',
      }}>
        <h1 style={{ fontSize: '18px', margin: 0 }}>
          Kidase Presentation
        </h1>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Presentation selector */}
          <select
            value={currentPresentation?.id || ''}
            onChange={(e) => e.target.value && loadPresentation(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: 'white',
              minWidth: '200px',
            }}
          >
            <option value="">Select Presentation</option>
            {presentations.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={handleImportExcel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2a4a2a',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Import Excel
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!currentPresentation}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPresentation ? '#4a2a4a' : '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: currentPresentation ? 'pointer' : 'not-allowed',
            }}
          >
            Export PDF
          </button>

          <button
            onClick={startPresentation}
            disabled={!currentPresentation || currentSlides.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPresentation && currentSlides.length > 0
                ? '#4a4a2a'
                : '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: currentPresentation && currentSlides.length > 0
                ? 'pointer'
                : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Present (F5)
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <SlideEditor />
      </main>

      {/* Presentation overlay */}
      {isPresenting && <PresentationView />}
    </div>
  );
}

export default App;
```

### Step 9.2: Global Styles

Create `src/styles/global.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #0a0a0a;
  color: #ffffff;
  overflow: hidden;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* Table styling */
table {
  color: inherit;
}

th, td {
  color: inherit;
}

/* Button focus */
button:focus {
  outline: 2px solid #4a4a8a;
  outline-offset: 2px;
}

/* Input styling */
input, select, textarea {
  font-family: inherit;
}

/* Fullscreen presentation mode */
:-webkit-full-screen {
  background-color: #000000;
}

:fullscreen {
  background-color: #000000;
}
```

---

## Phase 10: Testing and Validation

### Step 10.1: Create Sample Excel File

Create a sample Excel file with the following structure for testing:

**Sheet: Metadata**
| Key | Value |
|-----|-------|
| PresentationName | Sunday Kidase |
| PresentationType | Kidase |
| Lang1Name | Ge'ez |
| Lang2Name | Amharic |
| Lang3Name | English |

**Sheet: Content**
| LineID | Title_Lang1 | Title_Lang2 | Title_Lang3 | Lang1 | Lang2 | Lang3 | Notes |
|--------|-------------|-------------|-------------|-------|-------|-------|-------|
| 1 | ቅዳሴ | ቅዳሴ | Liturgy | ብስመ አብ... | በአብ ስም... | In the name... | Opening |
| 2 | | | | ቅዱስ ቅዱስ | ቅዱስ ቅዱስ | Holy Holy | Trisagion |

### Step 10.2: Run Development Server

```bash
# Start development
npm run tauri dev
```

### Step 10.3: Test Checklist

- [ ] Application launches successfully
- [ ] Default template is created on first run
- [ ] Excel import works correctly
- [ ] Slides display in editor
- [ ] Slide preview shows correctly
- [ ] Presentation mode enters fullscreen
- [ ] Keyboard navigation works (arrows, space, escape)
- [ ] Slide reordering works via drag and drop
- [ ] Disable/enable slide toggle works
- [ ] PDF export generates correctly
- [ ] Data persists after restart

---

## Phase 11: Build and Distribution

### Step 11.1: Configure Tauri for Production

Update `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Kidase Presentation",
  "version": "1.0.0",
  "identifier": "com.church.kidase",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "app": {
    "windows": [
      {
        "title": "Kidase Presentation",
        "width": 1280,
        "height": 720,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

### Step 11.2: Build for Production

```bash
# Build for current platform
npm run tauri build

# Output will be in src-tauri/target/release/bundle/
```

---

## Summary

This implementation guide covers:

1. **Project Setup** - Tauri + React + TypeScript scaffolding
2. **Database Layer** - SQLite with migrations
3. **Domain Entities** - Template, Presentation, Slide, Variable
4. **Repository Pattern** - Abstract interfaces with SQLite implementations
5. **Services** - Excel import, PDF export, placeholder replacement
6. **State Management** - Zustand store for app state
7. **UI Components** - Editor, preview, and presentation views
8. **Main Application** - Full integration with header and controls

### Key Features Implemented:
- Offline-first SQLite storage
- Multi-language support (up to 4 languages)
- Excel import for bulk content
- PDF export for printing
- Fullscreen presentation mode
- Keyboard navigation
- Slide reordering and management
- Variable/placeholder system
- Template-based styling

### Next Steps for Enhancement:
- Add template editor UI
- Add inline slide editing
- Add variable management UI
- Add backup/restore functionality
- Add custom font loading
- Add presenter notes view (dual monitor)
