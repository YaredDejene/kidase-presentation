// Dev-only page behind `pnpm --filter web layout-check`: renders slides at the
// 1920x1080 design size, measures them, and publishes `window.__layoutReport`.
// Default: the fixtures. `?live` (API running): every slide of the primary
// presentation, optionally `&date=YYYY-MM-DD`.
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { TemplateDefinition, LangSlot, SlideBlock, SlideTitle } from '@kidase/shared';
import { measureSlide, checkSlide, SlideMetrics } from '@kidase/shared/render/layoutMetrics';
import { WebSlideRenderer } from '../components/WebSlideRenderer';
import fixtures from './fixtures.json';

interface CheckSlide {
  name: string;
  templateId: string;
  title: SlideTitle | null;
  footer: { title: SlideTitle | null; text: SlideBlock | null } | null;
  block: SlideBlock;
}
interface CheckSet {
  languages: { slot: LangSlot }[];
  templates: Record<string, TemplateDefinition>;
  slides: CheckSlide[];
}
export interface LayoutReport {
  total: number;
  failures: { name: string; problems: string[]; metrics: SlideMetrics }[];
  minFontPx: number;
  maxWordGapEm: number;
  fillUnder60: number;
}

async function loadSet(): Promise<CheckSet> {
  const q = new URLSearchParams(location.search);
  if (!q.has('live')) return fixtures as unknown as CheckSet;
  const list = await (await fetch('/api/v1/presentations')).json();
  const date = q.get('date');
  const payload = await (await fetch(`/api/v1/presentations/${list[0].id}/render${date ? `?date=${date}` : ''}`)).json();
  return { ...payload, slides: payload.slides.map((s: CheckSlide, i: number) => ({ ...s, name: `slide ${i + 1}` })) };
}

async function run(): Promise<LayoutReport> {
  const set = await loadSet();
  const slots = set.languages.map(l => l.slot);
  const host = document.getElementById('root')!;

  flushSync(() => ReactDOM.createRoot(host).render(
    <>
      {set.slides.map((s, i) => (
        <div key={i} data-check-slide={s.name} style={{ width: 1920, height: 1080 }}>
          <WebSlideRenderer definition={set.templates[s.templateId]} activeSlots={slots} block={s.block} title={s.title} footer={s.footer} />
        </div>
      ))}
    </>,
  ));

  // The fit re-runs once the bundled font has loaded; measure after that.
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 200));

  const report: LayoutReport = { total: 0, failures: [], minFontPx: Infinity, maxWordGapEm: 0, fillUnder60: 0 };
  for (const el of host.querySelectorAll<HTMLElement>('[data-check-slide]')) {
    const metrics = measureSlide(el.firstElementChild as HTMLElement);
    if (!metrics) continue; // slide without body text
    report.total++;
    report.minFontPx = Math.min(report.minFontPx, metrics.minFontPx);
    report.maxWordGapEm = Math.max(report.maxWordGapEm, metrics.maxWordGapEm);
    if (metrics.fill < 0.6) report.fillUnder60++;
    const problems = checkSlide(metrics);
    if (problems.length) report.failures.push({ name: el.dataset.checkSlide!, problems, metrics });
  }
  return report;
}

run().then(
  report => { (window as unknown as { __layoutReport: unknown }).__layoutReport = report; },
  err => { (window as unknown as { __layoutReport: unknown }).__layoutReport = { error: String(err) }; },
);
