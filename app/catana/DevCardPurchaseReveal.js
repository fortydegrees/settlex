import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Howl } from "howler";
import { getDevCardRevealDurations } from "./utils/devCardPurchaseReveal";

const DEV_CARD_FACE_SVGS = Object.freeze({
  knight: "/svgs/cards/development/knight.svg",
  victoryPoint: "/svgs/cards/development/victory_point.svg",
  roadBuilding: "/svgs/cards/development/roadbuilding.svg",
  yearOfPlenty: "/svgs/cards/development/year_of_plenty.svg",
  monopoly: "/svgs/cards/development/monopoly.svg",
});

const DEV_CARD_BACK_SVG = "/svgs/cards/development/card_devcardback.svg";
const DEV_CARD_EMBLEM_SVG = "/svgs/icon_devcard_emblem.svg";
const CARD_ASPECT_RATIO = 72 / 52;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const ACTOR_HANDOFF_LEAD_MS = 128;

const getCenterCardWidth = () => {
  if (typeof window === "undefined") return 140;
  return Math.max(120, Math.min(156, window.innerWidth * 0.12));
};

export function DevCardPurchaseReveal({ reveal, onComplete }) {
  const actorRef = useRef(null);
  const emblemRef = useRef(null);
  const flipRef = useRef(null);
  const cardFaceRef = useRef(null);
  const popHowlRef = useRef(null);
  const travelHowlRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const [displayedCardSrc, setDisplayedCardSrc] = useState(DEV_CARD_BACK_SVG);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayedCardSrc(DEV_CARD_BACK_SVG);
  }, [reveal]);

  useEffect(() => {
    popHowlRef.current = new Howl({
      src: ["/sounds/ui-pop-resource-out.mp3"],
      volume: 0.4,
    });
    travelHowlRef.current = new Howl({
      src: ["/sounds/card_woosh.mp3"],
      volume: 0.4,
    });

    return () => {
      popHowlRef.current?.unload();
      travelHowlRef.current?.unload();
    };
  }, []);

  useEffect(() => {
    const actorNode = actorRef.current;
    const emblemNode = emblemRef.current;
    const flipNode = flipRef.current;
    const cardFaceNode = cardFaceRef.current;
    if (!reveal || !actorNode || !emblemNode || !flipNode || !cardFaceNode) {
      return undefined;
    }
    if (!reveal.triggerRect || !reveal.destinationRect) {
      onCompleteRef.current?.();
      return undefined;
    }

    const revealCardSrc = DEV_CARD_FACE_SVGS[reveal.cardType] ?? DEV_CARD_BACK_SVG;
    const startX = reveal.triggerRect.left + reveal.triggerRect.width / 2;
    const startY = reveal.triggerRect.top + reveal.triggerRect.height / 2;
    const endX = reveal.destinationRect.left + reveal.destinationRect.width / 2;
    const endY = reveal.destinationRect.top + reveal.destinationRect.height / 2;
    const centerX =
      typeof window === "undefined" ? startX : window.innerWidth / 2;
    const centerY =
      typeof window === "undefined" ? startY : window.innerHeight * 0.44;
    const centerCardWidth = getCenterCardWidth();
    const centerCardHeight = centerCardWidth * CARD_ASPECT_RATIO;
    const destinationScale = Math.max(
      0.42,
      Math.min(1, reveal.destinationRect.height / centerCardHeight)
    );
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches;
    const durations = getDevCardRevealDurations(prefersReducedMotion);
    const timelineDelayMs = Math.max(
      0,
      (reveal.launchDelayMs ?? 0) - ACTOR_HANDOFF_LEAD_MS
    );
    const travelHandoffOffset = "<+0.02";

    gsap.set(actorNode, {
      x: startX,
      y: startY,
      xPercent: -50,
      yPercent: -50,
      width: centerCardWidth,
      height: centerCardHeight,
      scale: 0.46,
      autoAlpha: 0,
    });
    gsap.set(emblemNode, {
      autoAlpha: 1,
      scale: 0.92,
    });
    gsap.set(flipNode, {
      autoAlpha: 0,
      scale: 0.92,
      transformPerspective: 1000,
      rotationY: 0,
      transformStyle: "preserve-3d",
      transformOrigin: "50% 50%",
    });
    gsap.set(cardFaceNode, {
      autoAlpha: 1,
    });

    const timeline = gsap.timeline({
      delay: timelineDelayMs / 1000,
      onComplete: () => onCompleteRef.current?.(),
    });

    timeline.set(actorNode, { autoAlpha: 1 });
    timeline.call(() => popHowlRef.current?.play());
    timeline.to(actorNode, {
      y: startY - centerCardHeight * 0.12,
      scale: 0.92,
      duration: durations.releasePop,
      ease: "back.out(1.9)",
    });
    timeline.to(actorNode, {
      x: centerX,
      y: centerY,
      scale: 1,
      duration: durations.travelToCenter,
      ease: "power3.out",
    }, travelHandoffOffset);
    timeline.to({}, { duration: durations.holdAfterTravel });
    timeline.to(flipNode, {
      autoAlpha: 1,
      scale: 1,
      duration: durations.backReveal,
      ease: "power2.out",
    });
    timeline.to(
      emblemNode,
      {
        autoAlpha: 0,
        scale: 0.82,
        duration: durations.backReveal,
        ease: "power2.out",
      },
      "<"
    );
    timeline.to({}, { duration: durations.holdAfterBackReveal });
    timeline.to(flipNode, {
      rotationY: 90,
      duration: durations.flip / 2,
      ease: "power1.in",
    });
    timeline.call(() => {
      setDisplayedCardSrc(revealCardSrc);
    });
    timeline.set(flipNode, { rotationY: -90 });
    timeline.to(flipNode, {
      rotationY: 0,
      duration: durations.flip / 2,
      ease: "power1.out",
    });
    timeline.to({}, { duration: durations.holdOnFace });
    timeline.call(() => travelHowlRef.current?.play());
    timeline.to(actorNode, {
      x: endX,
      y: endY,
      scale: destinationScale,
      duration: durations.travelToHand,
      ease: "power2.out",
    });

    return () => {
      timeline.kill();
    };
  }, [reveal]);

  if (!reveal) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div
        ref={actorRef}
        className="pointer-events-none fixed left-0 top-0"
        style={{ transformOrigin: "50% 50%" }}
      >
        <img
          ref={emblemRef}
          src={DEV_CARD_EMBLEM_SVG}
          alt=""
          draggable={false}
          className="absolute inset-[14%] h-[72%] w-[72%] object-contain drop-shadow-lg"
        />
        <div ref={flipRef} className="absolute inset-0">
          <img
            ref={cardFaceRef}
            src={displayedCardSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain drop-shadow-lg"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          />
        </div>
      </div>
    </div>
  );
}
