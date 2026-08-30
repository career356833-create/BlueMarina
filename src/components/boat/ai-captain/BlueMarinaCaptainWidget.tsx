"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, Bot, Compass, Fish, Map, MessageCircle, X } from "lucide-react";

type Point = {
  x: number;
  y: number;
};

type PointerState = Point & {
  dx: number;
  dy: number;
  speed: number;
  active: boolean;
};

const quickLinks = [
  { href: "/today-sea", label: "오늘의 바다", icon: Compass },
  { href: "/sea", label: "바다 지도", icon: Map },
  { href: "/fish", label: "어종 도감", icon: Fish },
  { href: "/fishing-spots", label: "출조 포인트", icon: Anchor }
] as const;

const captainAssets = {
  body: "/characters/longtail-rudderfish-captain-v2-body.png",
  tail: "/characters/longtail-rudderfish-captain-v2-tail.png"
} as const;

const defaultCaptainName = "바다의 흑기사";
const defaultCaptainSpecies = "긴꼬리벵에돔";

const CAPTAIN_WIDTH = 190;
const CAPTAIN_HEIGHT = 130;
const SAFE_MARGIN = 24;
const FOLLOW_EASE = 0.072;
const TRAILING_DISTANCE = 126;
const MOBILE_BREAKPOINT = 640;

function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(Math.max(SAFE_MARGIN, width - CAPTAIN_WIDTH - SAFE_MARGIN), Math.max(SAFE_MARGIN, point.x)),
    y: Math.min(Math.max(SAFE_MARGIN, height - CAPTAIN_HEIGHT - SAFE_MARGIN), Math.max(SAFE_MARGIN, point.y))
  };
}

function chooseTarget(width: number, height: number): Point {
  return {
    x: SAFE_MARGIN + Math.random() * Math.max(1, width - CAPTAIN_WIDTH - SAFE_MARGIN * 2),
    y: SAFE_MARGIN + Math.random() * Math.max(1, height - CAPTAIN_HEIGHT - SAFE_MARGIN * 2)
  };
}

function easeInOutSine(progress: number) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function movementDuration(from: Point, to: Point) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.min(10_000, Math.max(5_000, 4_600 + distance * 8));
}

export function BlueMarinaCaptainWidget() {
  const pathname = usePathname();
  const [position, setPosition] = useState<Point>({ x: 28, y: 104 });
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(false);
  const [lurePosition, setLurePosition] = useState<Point | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const positionRef = useRef(position);
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, dx: 0, dy: 0, speed: 0, active: false });
  const animationRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followModeRef = useRef(false);
  const isFishSession = pathname?.startsWith("/fish") ?? false;
  const panelTitle = isFishSession ? "어종 도감 안내" : `${defaultCaptainName} · ${defaultCaptainSpecies}`;
  const paused = isOpen || isHovered || (reducedMotion && !isFollowMode);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    followModeRef.current = isFollowMode;
  }, [isFollowMode]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => clampPoint(current, window.innerWidth, window.innerHeight));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!followModeRef.current || window.innerWidth < MOBILE_BREAKPOINT) return;

      const previous = pointerRef.current;
      const dx = previous.active ? event.clientX - previous.x : 0;
      const dy = previous.active ? event.clientY - previous.y : 0;
      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        dx,
        dy,
        speed: Math.hypot(dx, dy),
        active: true
      };
      setLurePosition({ x: event.clientX, y: event.clientY });
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
      setLurePosition(null);
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const selection = window.getSelection();
      if (
        target?.closest("a, button, input, textarea, select, [contenteditable='true'], .blue-captain-panel") ||
        (selection && !selection.isCollapsed)
      ) {
        return;
      }

      event.preventDefault();
      pointerRef.current = { x: event.clientX, y: event.clientY, dx: 0, dy: 0, speed: 0, active: true };
      setLurePosition({ x: event.clientX, y: event.clientY });
      setIsFollowMode((current) => {
        const next = !current;
        followModeRef.current = next;
        if (!next) {
          pointerRef.current.active = false;
          setLurePosition(null);
        }
        return next;
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (paused) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      return;
    }

    let disposed = false;

    if (isFollowMode) {
      const followFrame = () => {
        if (disposed) return;
        const pointer = pointerRef.current;

        if (pointer.active) {
          const current = positionRef.current;
          const centerX = current.x + CAPTAIN_WIDTH / 2;
          const centerY = current.y + CAPTAIN_HEIGHT / 2;
          let vectorX = pointer.speed > 0.5 ? pointer.dx : pointer.x - centerX;
          let vectorY = pointer.speed > 0.5 ? pointer.dy : pointer.y - centerY;
          const vectorLength = Math.hypot(vectorX, vectorY) || 1;
          vectorX /= vectorLength;
          vectorY /= vectorLength;

          const target = clampPoint(
            {
              x: pointer.x - vectorX * TRAILING_DISTANCE - CAPTAIN_WIDTH / 2,
              y: pointer.y - vectorY * TRAILING_DISTANCE - CAPTAIN_HEIGHT / 2
            },
            window.innerWidth,
            window.innerHeight
          );
          const next = {
            x: current.x + (target.x - current.x) * FOLLOW_EASE,
            y: current.y + (target.y - current.y) * FOLLOW_EASE
          };
          if (Math.abs(pointer.x - centerX) > 8) {
            setDirection(pointer.x >= centerX ? "right" : "left");
          }
          positionRef.current = next;
          setPosition(next);
        }

        animationRef.current = requestAnimationFrame(followFrame);
      };

      animationRef.current = requestAnimationFrame(followFrame);
      return () => {
        disposed = true;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }

    const swim = () => {
      if (disposed) return;
      const from = positionRef.current;
      const to = chooseTarget(window.innerWidth, window.innerHeight);
      setDirection(to.x >= from.x ? "right" : "left");
      const duration = movementDuration(from, to);
      const startedAt = performance.now();

      const frame = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = easeInOutSine(progress);
        const next = {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased
        };
        positionRef.current = next;
        setPosition(next);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(frame);
        } else {
          pauseTimerRef.current = setTimeout(swim, 350 + Math.random() * 650);
        }
      };

      animationRef.current = requestAnimationFrame(frame);
    };

    pauseTimerRef.current = setTimeout(swim, 500);

    return () => {
      disposed = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [isFollowMode, paused]);

  const openPanel = useCallback(() => {
    setPosition((current) => {
      const clamped = clampPoint(current, window.innerWidth, window.innerHeight);
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        return { ...clamped, y: Math.max(392, clamped.y) };
      }
      return { ...clamped, y: Math.min(clamped.y, Math.max(24, window.innerHeight * 0.22 - CAPTAIN_HEIGHT / 2)) };
    });
    setIsOpen(true);
  }, []);

  return (
    <>
      {isFollowMode && lurePosition ? (
        <span
          className="blue-captain-lure"
          style={{ left: `${lurePosition.x}px`, top: `${lurePosition.y}px` }}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className="blue-captain-widget"
        data-open={isOpen}
        data-follow={isFollowMode ? "true" : "false"}
        data-facing={direction}
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        aria-label={`Blue Marina AI Captain ${defaultCaptainSpecies}`}
      >
      {isOpen ? (
        <section className="blue-captain-panel" role="dialog" aria-label="Blue Marina AI Captain 미리보기">
          <header className="blue-captain-panel-header">
            <div className="blue-captain-panel-mark">
              <Bot size={18} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <p>BLUE MARINA AI CAPTAIN</p>
              <strong>{panelTitle}</strong>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="AI Captain 닫기">
              <X size={17} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </header>

          <div className="blue-captain-message">
            <p>바다의 흑기사 긴꼬리벵에돔이 오늘 바다 정보, 어종 도감, 출조 포인트를 안내할 준비 중입니다.</p>
            <span>Prototype · No live AI API connected</span>
          </div>

          <div className="blue-captain-links" aria-label="빠른 이동">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <Icon size={15} strokeWidth={1.55} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {isFishSession ? <p className="blue-captain-context-note">어종 선택은 도감 화면의 SPECIMEN 영역에서 확인할 수 있습니다.</p> : null}
        </section>
      ) : null}

      <button
        type="button"
        className="blue-captain-launcher"
        onClick={openPanel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        aria-label={`${defaultCaptainName} ${defaultCaptainSpecies} 열기`}
        aria-expanded={isOpen}
      >
        <span className="blue-captain-glow" aria-hidden="true" />
        <span className="blue-captain-fish" aria-hidden="true">
          <span className="blue-captain-tail">
            <Image src={captainAssets.tail} alt="" fill sizes="150px" priority />
          </span>
          <span className="blue-captain-body">
            <Image src={captainAssets.body} alt="" fill sizes="320px" priority />
          </span>
        </span>
        <span className="blue-captain-badge">
          <MessageCircle size={14} strokeWidth={1.7} aria-hidden="true" />
          {isFollowMode ? "Following" : defaultCaptainName}
        </span>
      </button>
      </aside>
    </>
  );
}
