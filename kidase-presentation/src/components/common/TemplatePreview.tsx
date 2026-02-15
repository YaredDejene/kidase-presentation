import React from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateDefinition } from '../../domain/entities/Template';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const PLACEHOLDER_TEXTS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
  'Duis aute irure dolor in reprehenderit in voluptate velit.',
];

interface TemplatePreviewProps {
  definition: TemplateDefinition;
  width?: number;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  definition: def,
  width = 480,
}) => {
  const { t } = useTranslation('editor');
  const scale = width / DESIGN_WIDTH;
  const height = (width / DESIGN_WIDTH) * DESIGN_HEIGHT;
  const s = (v: number) => v * scale;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: def.background.color,
        padding: `${s(def.margins.top)}px ${s(def.margins.right)}px ${s(def.margins.bottom)}px ${s(def.margins.left)}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '4px',
        border: '1px solid #333',
      }}
    >
      {/* Title */}
      {def.title.show && (
        <div
          style={{
            fontSize: `${s(def.title.fontSize)}px`,
            color: def.title.color,
            textAlign: def.title.alignment,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 0,
            marginBottom: `${s(def.layout.gap)}px`,
          }}
        >
          {t('titlePreview')}
        </div>
      )}

      {/* Language blocks */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: `${s(def.layout.gap)}px`,
          overflow: 'hidden',
        }}
      >
        {def.languages.map((lang, index) => (
          <div
            key={lang.slot}
            style={{
              fontSize: `${s(lang.fontSize)}px`,
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
    </div>
  );
};
