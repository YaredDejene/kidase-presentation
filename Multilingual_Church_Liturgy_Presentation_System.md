
# Multilingual Church Liturgy Presentation System
## Comprehensive Technical and Functional Design Document

---

## 1. Introduction

This document describes the design and architecture of an **offline first multilingual presentation system** built specifically for **church liturgy programs**.

The system is designed to:
- Display liturgical text in multiple languages simultaneously
- Ensure high readability on large TVs
- Operate fully offline
- Support structured liturgy flow
- Be simple and reliable for church use
- Allow future expansion to mobile and cloud without refactoring

This is not a general purpose slide tool.

---

## 2. Core principles

- Offline first
- One active presentation at a time
- Language agnostic templates
- Consistent layout and colors
- Zero internet dependency
- Predictable presentation behavior
- Future ready through abstraction

---

## 3. High level architecture

The system is a **desktop application** with clean layering.

```
User Interface (React)
│
Application Services (Use cases)
│
Domain Model
│
Repository Interfaces (Abstraction)
│
SQLite Repository Implementations
│
Local File System
```

No external backend or server in phase 1.

---

## 4. Technology stack

### Desktop shell
- Tauri

### Frontend
- React
- TypeScript
- HTML and CSS for rendering
- Fullscreen Web API

### Storage
- SQLite
- Single local database file

### Data access
- Abstract repository layer
- SQLite implementation behind interfaces

### Import and export
- Excel import
- PDF export via headless rendering

---

## 5. Core domain entities

### 5.1 Template (language agnostic)

A Template defines **how content is displayed**, not what language it is.

**Responsibilities**
- Layout rules
- Font and spacing
- Colors
- Title behavior
- Margins and safe areas

**Properties**
- Id
- Name
- MaxLangCount
- DefinitionJson
- CreatedAt

Templates use generic language slots:
- Lang1
- Lang2
- Lang3
- Lang4

---

### 5.2 Presentation

A Presentation represents a full liturgy program.

**Properties**
- Id
- Name
- Type
- TemplateId
- LanguageMap
- IsActive
- CreatedAt

Only one presentation can be active.

---

### 5.3 Slide

Each slide corresponds to one full screen page.

**Properties**
- Id
- PresentationId
- SlideOrder
- LineId
- TitleJson
- BlocksJson
- Notes
- IsDisabled

---

### 5.4 Variables

Used for placeholder replacement.

**Properties**
- Id
- PresentationId
- Name
- Value

---

## 6. SQLite schema

### Templates table
```
templates
---------
id
name
max_lang_count
definition_json
created_at
```

### Presentations table
```
presentations
-------------
id
name
type
template_id
language_map
is_active
created_at
```

### Slides table
```
slides
------
id
presentation_id
slide_order
line_id
title_json
blocks_json
notes
is_disabled
```

### Variables table
```
variables
---------
id
presentation_id
name
value
```

---

## 7. Template definition JSON

Templates are stored as JSON and are language agnostic.

---

## 8. Language mapping

Languages are mapped at **presentation level**, not template level.

---

## 9. Excel import specification

### Metadata sheet
- PresentationName
- PresentationType
- TemplateName (optional)
- Lang1Name
- Lang2Name
- Lang3Name
- Lang4Name

### Main content sheet
Each row equals one slide.

---

## 10. Placeholder system

Supported placeholder types:
- Simple text
- Full slide
- Multi slide expansion

---

## 11. Edit mode

- Table based editor
- One row per slide
- Live preview
- Reorder slides
- Disable slides

---

## 12. Presentation mode

- Fullscreen
- Keyboard and presenter navigation
- One slide per screen
- Notes hidden from audience

---

## 13. PDF export

- One slide per page
- Black background preserved
- Template rules respected

---

## 14. Repository abstraction

Interfaces:
- ITemplateRepository
- IPresentationRepository
- ISlideRepository
- IVariableRepository

---

## 15. Offline first behavior

- No internet required
- Local storage only
- Easy backup

---

## 16. Future expansion

- Mobile read only app
- Local API
- Cloud sync
- Speech highlighting

---

## 17. Non goals

- No animations
- No transitions
- No online dependency
- No multi user editing

---

## 18. Success criteria

- Readable on large TVs
- Stable during service
- Easy to use
- Consistent layout

---

## 19. Final note

This system prioritizes **reliability, clarity, and reverence** over complexity.
