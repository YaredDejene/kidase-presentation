# Speech Highlighting Feature

## Overview

Speech highlighting enables real-time word-by-word text highlighting during presentation mode. The app listens to the reader's voice and automatically highlights matching words with smooth transitions.

## How It Works

1. **During presentation mode**, the reader speaks the liturgical text aloud
2. **Speech recognition** captures the spoken words
3. **Word matching** finds the corresponding text on screen
4. **Highlighting** smoothly transitions from word to word across all displayed languages

## Language Support

| Language | Speech Recognition | Fallback |
|----------|-------------------|----------|
| Ge'ez (Lang1) | Not supported | Manual keyboard control |
| Amharic (Lang2) | Experimental | Cross-language sync |
| English (Lang3) | Excellent | - |
| Tigrinya (Lang4) | Not supported | Cross-language sync |

### Cross-Language Highlighting

For languages without speech recognition (Ge'ez, Tigrinya), the system uses **cross-language highlighting**:
- Reader speaks in a supported language (e.g., English)
- System recognizes the English words
- Highlights corresponding position across ALL displayed languages simultaneously
- Works because liturgical texts have parallel structure

### Manual Fallback Mode

When speech recognition is unavailable or unreliable:
- Press **Space** to advance to next word
- Press **Backspace** to go back one word
- Press **Ctrl+R** (or **Cmd+R** on Mac) to toggle speech recognition

## User Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Speech Highlighting | Turn feature on/off | Off |
| Active Language | Which language to listen for ('auto' detects) | Auto |
| Highlight Color | Background color for highlighted word | Yellow (#FFFF00) |
| Transition Speed | Animation speed between words (ms) | 150ms |

## Technical Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   PresentationView                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              SlideRenderer                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ Word 1  │ │ Word 2  │ │ Word 3  │ ...       │   │
│  │  │ (span)  │ │ (span)  │ │ (span)  │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘           │   │
│  └─────────────────────────────────────────────────┘   │
│                         ▲                               │
│                         │ currentWordIndex              │
│  ┌──────────────────────┴──────────────────────────┐   │
│  │            Speech Recognition Service            │   │
│  │  ┌────────────┐    ┌────────────────────┐      │   │
│  │  │ Web Speech │ OR │ Manual Keyboard    │      │   │
│  │  │    API     │    │    Control         │      │   │
│  │  └────────────┘    └────────────────────┘      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Services

1. **TextSegmentationService** - Breaks text into individual words
   - Handles Ethiopic script (uses `፡` word separator)
   - Handles Latin script (standard word boundaries)
   - Preserves character indices for highlighting

2. **SpeechRecognitionService** - Captures spoken words
   - Uses Web Speech API (works offline in Chrome)
   - Supports English (en-US) and experimental Amharic (am-ET)

3. **WordMatchingService** - Matches speech to displayed text
   - Fuzzy matching using Levenshtein distance
   - Handles pronunciation variations
   - Configurable similarity threshold

### State Management

```typescript
// Highlight state in Zustand store
interface HighlightState {
  isHighlighting: boolean;
  isListening: boolean;
  currentWordIndex: number;
  activeLanguageSlot: 'Lang1' | 'Lang2' | 'Lang3' | 'Lang4' | null;
  segments: WordSegment[];
}

interface WordSegment {
  text: string;
  startIndex: number;
  endIndex: number;
}
```

## CSS Styling

```css
/* Word highlighting styles */
.speech-word {
  transition: background-color 150ms ease-out;
  border-radius: 4px;
  padding: 2px 0;
}

.speech-word.active {
  background-color: var(--highlight-color, #FFFF00);
  animation: pulse 0.3s ease-out;
}

.speech-word.past {
  opacity: 0.7;
}

@keyframes pulse {
  50% { transform: scale(1.02); }
}
```

## Keyboard Shortcuts (Presentation Mode)

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` / `Cmd+R` | Toggle speech recognition on/off |
| `Space` | Advance to next word (manual mode) |
| `Backspace` | Go back one word (manual mode) |
| `Escape` | Exit presentation (existing) |

## Implementation Files

| File | Purpose |
|------|---------|
| `src/domain/entities/AppSettings.ts` | SpeechHighlightSettings interface |
| `src/store/appStore.ts` | Highlight state management |
| `src/services/TextSegmentationService.ts` | Word segmentation |
| `src/services/speech/SpeechRecognitionService.ts` | Recognition abstraction |
| `src/services/speech/WebSpeechService.ts` | Web Speech API wrapper |
| `src/services/speech/ManualHighlightService.ts` | Keyboard fallback |
| `src/services/WordMatchingService.ts` | Fuzzy word matching |
| `src/components/presentation/SlideRenderer.tsx` | Word-level rendering |
| `src/components/presentation/PresentationView.tsx` | Integration |
| `src/styles/presentation.css` | Highlight animations |
| `src/components/dialogs/SettingsDialog.tsx` | Settings UI |

## Future Enhancements

- [ ] Audio file synchronization (karaoke-style with pre-recorded timing)
- [ ] Text-to-Speech integration (app reads aloud and highlights)
- [ ] Improved Amharic speech recognition via Google Cloud Speech API
- [ ] Phrase-level highlighting option
- [ ] Presenter preview with upcoming words
