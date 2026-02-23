import React from 'react';
import { TemplateDefinition } from '../../domain/entities/Template';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const VERTICAL_ALIGN_TO_JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

const PLACEHOLDER_TEXTS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
  'Duis aute irure dolor in reprehenderit in voluptate velit.',
];

function renderLanguageBlocks(def: TemplateDefinition, scale: number) {
  const justify = VERTICAL_ALIGN_TO_JUSTIFY[def.layout.verticalAlign ?? 'center'];

  if (def.layout.columns > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: `${def.layout.gap * scale}px`, overflow: 'hidden' }}>
        {/* Header row: first language spans full width when rows > 1 */}
        {def.layout.rows > 1 && def.languages[0] && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: justify,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: `${def.languages[0].fontSize * scale}px`,
                fontFamily: def.languages[0].fontFamily,
                color: def.languages[0].color,
                textAlign: def.languages[0].alignment,
                lineHeight: def.languages[0].lineHeight,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflow: 'hidden',
              }}
            >
              {PLACEHOLDER_TEXTS[0]}
            </div>
          </div>
        )}
        {/* Column grid for remaining languages */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            gap: `${def.layout.gap * scale}px`,
            overflow: 'hidden',
          }}
        >
          {(def.layout.rows > 1 ? def.languages.slice(1) : def.languages).map((lang, index) => (
            <div
              key={lang.slot}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: justify,
              }}
            >
              <div
                style={{
                  fontSize: `${lang.fontSize * scale}px`,
                  fontFamily: lang.fontFamily,
                  color: lang.color,
                  textAlign: lang.alignment,
                  lineHeight: lang.lineHeight,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                }}
              >
                {PLACEHOLDER_TEXTS[(def.layout.rows > 1 ? index + 1 : index) % PLACEHOLDER_TEXTS.length]}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: justify,
        gap: `${def.layout.gap * scale}px`,
        overflow: 'hidden',
      }}
    >
      {def.languages.map((lang, index) => (
        <div
          key={lang.slot}
          style={{
            fontSize: `${lang.fontSize * scale}px`,
            fontFamily: lang.fontFamily,
            color: lang.color,
            textAlign: lang.alignment,
            lineHeight: lang.lineHeight,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
          }}
        >
          {PLACEHOLDER_TEXTS[index % PLACEHOLDER_TEXTS.length]}
        </div>
      ))}
    </div>
  );
}

interface TemplatePreviewProps {
  definition: TemplateDefinition;
  width?: number;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  definition: def,
  width = 480,
}) => {
  const scale = width / DESIGN_WIDTH;
  const height = width * (DESIGN_HEIGHT / DESIGN_WIDTH);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: def.background.color,
        padding: `${def.margins.top * scale}px ${def.margins.right * scale}px ${def.margins.bottom * scale}px ${def.margins.left * scale}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '2px solid #333',
      }}
    >
      {/* Title */}
      {def.title.show && (
        <div
          style={{
            fontSize: `${def.title.fontSize * scale}px`,
            color: def.title.color,
            textAlign: def.title.alignment,
            fontWeight: 'bold',
            marginBottom: `${2 * scale}px`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 0,
          }}
        >
          Title Preview
        </div>
      )}

      {/* Language blocks */}
      {renderLanguageBlocks(def, scale)}
    </div>
  );
};
