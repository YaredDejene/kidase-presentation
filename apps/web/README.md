# Kidase Presentation Viewer (web)

Public, read-only viewer (React + Vite). It calls the API's `GET /presentations`
and `GET /presentations/:id/render`, then renders fully-resolved slides. Font
scaling is computed in the browser (shared `computeFontScaleFactor`) so toggling
translations re-fits instantly with no refetch.

## Run

Start the API first (see `apps/api/README.md`), seeded with data. Then, from the
repo root:

```bash
pnpm --filter web dev      # http://localhost:5174
```

The dev server proxies `/api/*` to the API (default `http://localhost:3001`).
Override with `VITE_API_TARGET=http://host:port`.

```bash
pnpm --filter web build    # static build into apps/web/dist
pnpm --filter web preview  # preview the production build
```

For a deployed static build, set `VITE_API_BASE` (e.g. `https://api.example.com`)
so the client calls the API directly instead of relying on the dev proxy.

## Design

The UI mirrors the Claude Design mock (`Kidase Presentation.dc.html`): exact
dark/light palettes (`theme.ts`), the ቅ logo, the 56px toolbar, the 210px
thumbnail rail (real template-rendered thumbnails), the framed 16:9 stage, the
floating bottom-left nav pill, the right-side **Config drawer** and **Info
panel**, and the **Export**/**Help** dialogs and **fullscreen projection** bar.
The slide stage itself is **template-driven** (`WebSlideRenderer` uses the real
template definition from the API, not the mock's placeholder colors).

## What works

- Presentation switching via the Config drawer (Liturgy select).
- Config: dual Ethiopian/Gregorian date (kept in sync via `kenat`), Mehella
  toggle, per-language **Translations** toggles (client-side), UI language
  (en/am/ti), resolved liturgical context.
- Info panel: date, feast, gitsawe readings with references.
- Stage: `WebSlideRenderer` on a scaled 16:9 stage + thumbnail rail; prev/next,
  slide counter, fullscreen projection with auto-hiding control bar + language
  chips; keyboard nav (←/→/Space/F/I/Esc/?), dark/light theme.

## Deferred (follow-ups)

- Section headers / jump-nav (API returns `sections: []` until sections are
  defined server-side).
- Real file export (PDF currently uses the browser print dialog; PNG/PPTX TBD).
- Admin screens (Phase 4).
