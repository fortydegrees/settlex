"use client";

import { useMemo, useState } from "react";
import { Button } from "../../../ui/Button";

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
    <section className="settlex-ui-pane p-ui-3">
      <div className="mb-ui-3 flex items-center justify-between gap-ui-3">
        <div className="min-w-0">
          <h2 className="type-section truncate text-ink-primary">
            {viewport.label}
          </h2>
          <p className="type-code-caption text-ink-secondary">
            {viewport.detail} / {Math.round(scale * 100)}%
          </p>
        </div>
        <a
          className="settlex-ui-button settlex-ui-button-utility settlex-ui-focus type-action-small shrink-0 px-ui-3 py-ui-1"
          href={sandboxUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open
        </a>
      </div>

      <div
        className="overflow-hidden rounded-small bg-surface-inset shadow-xl ring-2 ring-white/60"
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
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600 px-ui-5 py-ui-5 text-ink-primary">
      <header className="settlex-ui-pane sticky top-4 z-10 mb-ui-5 flex flex-wrap items-center justify-between gap-ui-3 px-ui-4 py-ui-3">
        <div>
          <p className="type-caption uppercase text-ink-secondary">
            Catana Dev
          </p>
          <h1 className="type-title text-ink-primary">Viewport Wall</h1>
        </div>

        <div className="flex flex-wrap items-center gap-ui-2">
          <div className="settlex-ui-inset flex p-ui-1">
            {SCALE_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`settlex-ui-segment settlex-ui-focus type-action-small rounded-pill px-ui-3 py-ui-1 transition ${
                  scaleMultiplier === option.value
                    ? "bg-surface-selected text-ink-primary shadow-sm"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
                onClick={() => setScaleMultiplier(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button variant="utility" size="sm" onClick={() => setReloadToken((currentToken) => currentToken + 1)}>
            Reload All
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-ui-5">
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
