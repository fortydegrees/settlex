"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  getPlayerColorOption,
  normalizePlayerColorId,
} from "../theme/playerColors";
import {
  EMOJI_OPTIONS,
  buildSuggestedGuestIdentity,
} from "./playerIdentityStorage";

function EmojiPicker({ value, onChange, colorGradient }) {
  const [showGrid, setShowGrid] = useState(false);
  const [slideDir, setSlideDir] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const gridRef = useRef(null);
  const idx = EMOJI_OPTIONS.indexOf(value);
  const currentIdx = idx >= 0 ? idx : 0;

  useEffect(() => {
    if (!showGrid) return;
    const handler = (event) => {
      if (gridRef.current && !gridRef.current.contains(event.target)) {
        setShowGrid(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showGrid]);

  const navigate = (direction) => {
    const nextIndex = (currentIdx + direction + EMOJI_OPTIONS.length) % EMOJI_OPTIONS.length;
    setSlideDir(direction);
    setSlideKey((current) => current + 1);
    onChange(EMOJI_OPTIONS[nextIndex]);
  };

  const slideAnim =
    slideDir > 0
      ? "emojiSlideFromRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
      : slideDir < 0
      ? "emojiSlideFromLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
      : "none";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-lg text-slate-600 ring-1 ring-white/50 transition hover:bg-white/60 hover:scale-105 active:scale-95"
        >
          &#8249;
        </button>

        <button
          type="button"
          onClick={() => setShowGrid((current) => !current)}
          className="group relative flex flex-col items-center"
        >
          <span
            className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-t ring-4 ring-white shadow-lg ${colorGradient || ""}`}
          >
            <span
              className="relative z-10 block"
              style={{ animation: "emojiBounce 2s ease-in-out infinite" }}
            >
              <span
                key={slideKey}
                className="block text-5xl"
                style={{ animation: slideAnim, display: "inline-block" }}
              >
                {value}
              </span>
            </span>
            <div
              className="absolute bottom-2 inset-x-0 mx-auto h-2 w-10 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)",
                animation: "emojiShadow 2s ease-in-out infinite",
              }}
            />
          </span>
          <span className="mt-1.5 block text-[10px] font-medium text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
            tap to browse
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-lg text-slate-600 ring-1 ring-white/50 transition hover:bg-white/60 hover:scale-105 active:scale-95"
        >
          &#8250;
        </button>
      </div>

      {showGrid && (
        <div
          ref={gridRef}
          className="absolute top-full z-10 mt-2 grid grid-cols-4 gap-1.5 rounded-xl bg-blue-200/95 p-3 shadow-xl ring-2 ring-slate-300"
        >
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e);
                setShowGrid(false);
              }}
              className={`rounded-lg px-1 py-1.5 text-2xl transition-all ${
                value === e
                  ? "bg-amber-400 shadow-md ring-2 ring-amber-300 scale-110"
                  : "hover:bg-white/50 hover:scale-105"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function IdentityModal({
  onSubmit,
  onClose,
  initialName,
  initialEmoji,
  initialColor,
}) {
  const suggestedIdentity = useRef(buildSuggestedGuestIdentity()).current;
  const [name, setName] = useState(initialName || "");
  const [emoji, setEmoji] = useState(() => initialEmoji || suggestedIdentity.emoji);
  const [color, setColor] = useState(
    () =>
      (initialColor ? normalizePlayerColorId(initialColor) : "") ||
      suggestedIdentity.color
  );
  const inputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      emoji,
      color: normalizePlayerColorId(color),
    });
  };

  const handleBackdropClick = (event) => {
    if (formRef.current && !formRef.current.contains(event.target)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-4 w-full max-w-xs rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300"
      >
        <h2 className="text-center text-lg font-bold text-slate-800">
          Pick a username
        </h2>

        <div className="mt-5">
          <EmojiPicker
            value={emoji}
            onChange={setEmoji}
            colorGradient={getPlayerColorOption(color).gradient}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {PLAYER_COLOR_PICKER_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              className={`h-7 w-7 rounded-full ${c.swatch} transition-all ${
                color === c.id
                  ? "ring-2 ring-white ring-offset-2 ring-offset-blue-200 scale-110"
                  : "ring-1 ring-white/40 hover:scale-110"
              }`}
              aria-label={c.id}
            />
          ))}
        </div>

        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoComplete="nickname"
          maxLength={28}
          className="mt-5 w-full rounded-lg bg-white/60 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 focus:outline-none focus:ring-2 focus:ring-white/70"
        />

        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-lg bg-lime-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-lime-600 hover:scale-[1.01] disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
        >
          Let&apos;s go!
        </button>
      </form>

      <style>{`
        @keyframes emojiBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes emojiShadow {
          0%, 100% { transform: scaleX(1); opacity: 1; }
          50% { transform: scaleX(0.7); opacity: 0.5; }
        }
        @keyframes emojiSlideFromRight {
          0% { transform: translateX(24px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes emojiSlideFromLeft {
          0% { transform: translateX(-24px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
