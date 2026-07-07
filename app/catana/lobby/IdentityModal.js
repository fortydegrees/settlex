"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import { Input } from "../../ui/Input";
import { Popover } from "../../ui/Popover";
import { SwatchPicker } from "../../ui/SwatchPicker";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  getPlayerColorOption,
  normalizePlayerColorId,
} from "../theme/playerColors";
import {
  EMOJI_OPTIONS,
  buildSuggestedGuestIdentity,
} from "./playerIdentityStorage";

export function EmojiPicker({ value, onChange, colorGradient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [slideDir, setSlideDir] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const idx = EMOJI_OPTIONS.indexOf(value);
  const currentIdx = idx >= 0 ? idx : 0;

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
        <IconButton
          aria-label="Previous emoji"
          onClick={() => navigate(-1)}
          className="backdrop-blur-sm"
        >
          &#8249;
        </IconButton>

        <Popover
          open={isOpen}
          onOpenChange={setIsOpen}
          triggerAriaLabel="Browse emoji options"
          triggerClassName="group relative flex flex-col items-center"
          triggerContent={
            <>
              <span
                className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.4rem] bg-gradient-to-t ring-4 ring-white shadow-[0_20px_36px_-24px_rgba(15,23,42,0.5)] ${colorGradient || ""}`}
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
            </>
          }
        >
          <div className="grid grid-cols-4 gap-1.5">
            {EMOJI_OPTIONS.map((emojiOption) => (
              <Button
                key={emojiOption}
                type="button"
                variant={value === emojiOption ? "accent" : "subtle"}
                size="sm"
                onClick={() => {
                  onChange(emojiOption);
                  setIsOpen(false);
                }}
                className="h-12 w-12 rounded-[1rem] p-0 text-2xl"
              >
                {emojiOption}
              </Button>
            ))}
          </div>
        </Popover>

        <IconButton
          aria-label="Next emoji"
          onClick={() => navigate(1)}
          className="backdrop-blur-sm"
        >
          &#8250;
        </IconButton>
      </div>
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
  const [name, setName] = useState(initialName || suggestedIdentity.name);
  const [emoji, setEmoji] = useState(() => initialEmoji || suggestedIdentity.emoji);
  const [color, setColor] = useState(
    () =>
      (initialColor ? normalizePlayerColorId(initialColor) : "") ||
      suggestedIdentity.color
  );
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      usernameSource:
        name.trim() === suggestedIdentity.name ? "generated" : "custom",
      emoji,
      color: normalizePlayerColorId(color),
    });
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog
      open
      onOpenChange={handleOpenChange}
      title="Pick a username"
      description="Choose the emoji, color, and name you want to take into the match."
      maxWidthClassName="max-w-sm"
    >
      <form onSubmit={handleSubmit}>
        <div className="mt-1">
          <EmojiPicker
            value={emoji}
            onChange={setEmoji}
            colorGradient={getPlayerColorOption(color).gradient}
          />
        </div>

        <SwatchPicker
          options={PLAYER_COLOR_PICKER_OPTIONS}
          value={color}
          onChange={setColor}
          className="mt-6"
        />

        <Input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Player name"
          placeholder="Your name"
          autoComplete="nickname"
          maxLength={28}
          className="mt-6 text-center text-sm font-semibold"
        />

        <Button
          type="submit"
          disabled={!name.trim()}
          size="lg"
          className="mt-4 w-full"
        >
          Let&apos;s go!
        </Button>
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
    </Dialog>
  );
}
