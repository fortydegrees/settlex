import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Howl } from "howler";

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

const getCenterCardWidth = () => {
  if (typeof window === "undefined") return 140;
  return Math.max(120, Math.min(156, window.innerWidth * 0.12));
};

const getRevealDurations = () => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches
  ) {
    return {
      travelToCenter: 0.14,
      backReveal: 0.08,
      flip: 0.14,
      hold: 0.18,
      travelToHand: 0.34,
    };
  }

  return {
    travelToCenter: 0.22,
    backReveal: 0.12,
    flip: 0.24,
    hold: 0.3,
    travelToHand: 0.5,
  };
};

export function DevCardPurchaseReveal({ reveal, onComplete }) {
  const actorRef = useRef(null);
  const emblemRef = useRef(null);
  const flipRef = useRef(null);
  const popHowlRef = useRef(null);
  const travelHowlRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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
    if (!reveal || !actorNode || !emblemNode || !flipNode) return undefined;
    if (!reveal.triggerRect || !reveal.destinationRect) {
      onCompleteRef.current?.();
      return undefined;
    }

    const startX = reveal.triggerRect.left + reveal.triggerRect.width / 2;
    const startY = reveal.triggerRect.top + reveal.triggerRect.height / 2;
    const endX = reveal.destinationRect.left + reveal.destinationRect.width / 2;
    const endY = reveal.destinationRect.top + reveal.destinationRect.height / 2;
    const centerX =
      typeof window === "undefined" ? startX : window.innerWidth / 2;
    const centerY =
      typeof window === "undefined" ? startY : window.innerHeight / 2;
    const centerCardWidth = getCenterCardWidth();
    const centerCardHeight = centerCardWidth * CARD_ASPECT_RATIO;
    const destinationScale = Math.max(
      0.42,
      Math.min(1, reveal.destinationRect.height / centerCardHeight)
    );
    const durations = getRevealDurations();

    gsap.set(actorNode, {
      x: startX,
      y: startY,
      xPercent: -50,
      yPercent: -50,
      width: centerCardWidth,
      height: centerCardHeight,
      scale: 1,
    });
    gsap.set(emblemNode, {
      autoAlpha: 1,
      scale: 0.92,
    });
    gsap.set(flipNode, {
      autoAlpha: 0,
      scale: 0.92,
      rotationY: 0,
      transformPerspective: 1000,
      transformStyle: "preserve-3d",
    });

    const timeline = gsap.timeline({
      delay: (reveal.launchDelayMs ?? 0) / 1000,
      onComplete: () => onCompleteRef.current?.(),
    });

    timeline.to(actorNode, {
      x: centerX,
      y: centerY,
      duration: durations.travelToCenter,
      ease: "power2.out",
    });
    timeline.call(() => popHowlRef.current?.play(), null, "-=0.06");
    timeline.to(
      flipNode,
      {
        autoAlpha: 1,
        scale: 1,
        duration: durations.backReveal,
        ease: "power2.out",
      },
      "-=0.08"
    );
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
    timeline.to(flipNode, {
      rotationY: 180,
      duration: durations.flip,
      ease: "power1.inOut",
    });
    timeline.to({}, { duration: durations.hold });
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
            src={DEV_CARD_BACK_SVG}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain drop-shadow-lg [backface-visibility:hidden]"
          />
          <img
            src={DEV_CARD_FACE_SVGS[reveal.cardType] ?? DEV_CARD_BACK_SVG}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain drop-shadow-lg [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          />
        </div>
      </div>
    </div>
  );
}
