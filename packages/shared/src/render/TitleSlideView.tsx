import React, { useLayoutEffect, useRef } from 'react';
import type { TemplateDefinition } from '../domain/entities/Template';
import { SITE_URL, type TitleSlideInfo } from '../domain/titleSlide';
import { SLIDE_FONT } from './SlideView';

interface Props {
  definition: TemplateDefinition;
  info: TitleSlideInfo;
  /** Container size relative to the 1920x1080 design size. */
  scale?: number;
}

/** Shrink everything evenly when a long gitsawe name or note would overflow the slide. */
function fit(root: HTMLElement) {
  const box = root.firstElementChild as HTMLElement | null;
  if (!box) return;
  root.style.setProperty('--fit', '1');
  const room = root.clientHeight - parseFloat(getComputedStyle(root).paddingTop) * 2;
  if (box.offsetHeight > room) root.style.setProperty('--fit', String((room / box.offsetHeight) * 0.97));
}

/**
 * The generated first slide: liturgy, anaphora, date, readings and the gitsawe name,
 * drawn in the presentation template's colors. Shared by desktop and web.
 */
export const TitleSlideView: React.FC<Props> = React.memo(({ definition: def, info, scale = 1 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const px = (n: number) => `calc(var(--fit) * ${n * scale}px)`;
  const accent = def.title.color;
  const body = def.languages[0]?.color ?? '#ffffff';
  const faint = { color: body, opacity: 0.65 };
  const rule = `${Math.max(1, 2 * scale)}px solid ${accent}55`;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    fit(root);
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) fit(root); });
    return () => { cancelled = true; };
  }, [info, scale]);

  const tags = [info.dayType, ...info.tags].filter((t): t is string => !!t);

  return (
    <div
      ref={ref}
      style={{
        ['--fit' as string]: 1,
        position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
        padding: `${60 * scale}px ${140 * scale}px`,
        background: def.background.color, color: body, fontFamily: `${SLIDE_FONT}, serif`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}
    >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: px(14), marginBottom: px(22) }}>
            {tags.map(t => (
              <span key={t} style={{ fontSize: px(28), lineHeight: 1.2, padding: `${px(6)} ${px(22)}`, border: rule, borderRadius: px(40), color: accent }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ fontSize: px(88), fontWeight: 700, lineHeight: 1.15, color: accent }}>{info.liturgy}</div>
        {info.anaphora && <div style={{ fontSize: px(56), lineHeight: 1.3, marginTop: px(6) }}>{info.anaphora}</div>}
        <div style={{ fontSize: px(36), lineHeight: 1.3, marginTop: px(16), ...faint }}>
          {info.ethDate}<span style={{ margin: `0 ${px(18)}` }}>·</span>{info.gregorian}
        </div>

        {info.readings.length > 0 && (
          // Centered as a block: labels end and references start at the middle gap.
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: px(48), width: '84%', marginTop: px(44) }}>
            {info.readings.map(r => (
              <React.Fragment key={r.labelEn}>
                <div data-page={r.slide} style={{ padding: `${px(10)} 0`, textAlign: 'right' }}>
                  <div style={{ fontSize: px(34), lineHeight: 1.2, color: accent }}>{r.label}</div>
                  <div style={{ fontSize: px(20), lineHeight: 1.2, ...faint }}>{r.labelEn}</div>
                </div>
                <div data-page={r.slide} style={{ padding: `${px(10)} 0`, fontSize: px(36), lineHeight: 1.2, display: 'flex', alignItems: 'center', textAlign: 'left' }}>{r.value}</div>
              </React.Fragment>
            ))}
          </div>
        )}

        {(info.name || info.note) && (
          <div style={{ marginTop: px(56), maxWidth: '85%' }}>
            <div style={{ fontSize: px(40), fontWeight: 700, lineHeight: 1.25, color: accent }}>{info.name ?? info.note}</div>
            {info.name && info.note && <div style={{ fontSize: px(30), lineHeight: 1.3, marginTop: px(6), ...faint }}>{info.note}</div>}
          </div>
        )}
      </div>
      {/* Not an <a>: a click would navigate the desktop webview away. PDF exports turn data-href into a link. */}
      <span data-href={SITE_URL} style={{ position: 'absolute', left: 40 * scale, bottom: 20 * scale, fontSize: 28 * scale, lineHeight: 1, ...faint }}>
        {SITE_URL.replace(/^https?:\/\//, '')}
      </span>
    </div>
  );
});
