"use client";

import { useMemo, useState } from "react";

const SANDBOX_PATH = "/catana/dev/sandbox?viewportWall=1";

const VIEWPORTS = [
  {
    id: "wide",
    label: "Extra Wide",
    detail: "2560 x 1440",
    width: 2560,
    height: 1440
  },
  {
    id: "laptop",
    label: "Laptop",
    detail: "1440 x 900",
    width: 1440,
    height: 900
  },
  {
    id: "ipad-landscape",
    label: "iPad Landscape",
    detail: "1024 x 768",
    width: 1024,
    height: 768
  },
  {
    id: "ipad-portrait",
    label: "iPad Portrait",
    detail: "768 x 1024",
    width: 768,
    height: 1024
  },
  {
    id: "phone-landscape",
    label: "Phone Landscape",
    detail: "844 x 390",
    width: 844,
    height: 390
  },
  {
    id: "phone-portrait",
    label: "Phone Portrait",
    detail: "390 x 844",
    width: 390,
    height: 844
  }
];

const SCALE_OPTIONS = [
  { label: "Fit", value: 1 },
  { label: "Large", value: 1.25 },
  { label: "Small", value: 0.75 }
];

const PREVIEW_MAX_WIDTH = 540;
const PREVIEW_MAX_HEIGHT = 380;

const getPreviewScale = (viewport, scaleMultiplier) =>
  Math.min(
    1,
    (PREVIEW_MAX_WIDTH / viewport.width) * scaleMultiplier,
    (PREVIEW_MAX_HEIGHT / viewport.height) * scaleMultiplier
  );

function ViewportPreview({ viewport, scale, reloadToken }) {
  const previewWidth = Math.round(viewport.width * scale);
  const previewHeight = Math.round(viewport.height * scale);
  const sandboxUrl = `${SANDBOX_PATH}&wallViewport=${viewport.id}&reload=${reloadToken}`;

  return (
    <section className="rounded-xl bg-white/25 p-3 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-slate-900">
            {viewport.label}
          </h2>
          <p className="text-xs font-semibold text-slate-600">
            {viewport.detail} / {Math.round(scale * 100)}%
          </p>
        </div>
        <a
          className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-white/60 transition hover:bg-white/85"
          href={sandboxUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open
        </a>
      </div>

      <div
        className="overflow-hidden rounded-lg bg-blue-200/50 shadow-xl ring-2 ring-white/60"
        style={{ width: previewWidth, height: previewHeight }}
      >
        <iframe
          key={sandboxUrl}
          title={`Catana sandbox ${viewport.label}`}
          src={sandboxUrl}
          width={viewport.width}
          height={viewport.height}
          className="block border-0 bg-blue-500"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left"
          }}
        />
      </div>
    </section>
  );
}

export function ViewportWallClient() {
  const [scaleMultiplier, setScaleMultiplier] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const viewports = useMemo(
    () =>
      VIEWPORTS.map((viewport) => ({
        ...viewport,
        scale: getPreviewScale(viewport, scaleMultiplier)
      })),
    [scaleMultiplier]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600 px-5 py-5 text-slate-800">
      <header className="sticky top-4 z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-3 shadow-lg ring-1 ring-white/50 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            Catana Dev
          </p>
          <h1 className="text-xl font-bold text-slate-900">Viewport Wall</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white/50 p-1 shadow-inner ring-1 ring-white/60">
            {SCALE_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  scaleMultiplier === option.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setScaleMultiplier(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-white/60 transition hover:bg-white/85"
            onClick={() => setReloadToken((currentToken) => currentToken + 1)}
          >
            Reload All
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        {viewports.map((viewport) => (
          <ViewportPreview
            key={viewport.id}
            viewport={viewport}
            scale={viewport.scale}
            reloadToken={reloadToken}
          />
        ))}
      </div>
    </main>
  );
}
