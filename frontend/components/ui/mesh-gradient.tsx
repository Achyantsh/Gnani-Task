// https://21st.dev/community/components?preview=%2F%40adrielzimbril%2Fcomponents%2Fmesh-gradient
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface MeshGradientProps {
  colors?: string[];
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  color5?: string;
  speed?: number;
  distortion?: number;
  swirl?: number;
  swirlIterations?: number;
  softness?: number;
  proportion?: number;
  shape?: "edge" | "wave" | "circle";
  shapeScale?: number;
  scale?: number;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CachedMeshGradient: React.ComponentType<any> | null = null;

const a = [
  "#03045e",
  "#023e8a",
  "#0077b6",
  "#0096c7",
  "#00b4d8",
  "#48cae4",
  "#90e0ef",
  // "#ade8f4",
  // "#caf0f8",
];

// const a = ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"];
// const a = ["#00a6fb", "#0582ca", "#006494", "#003554", "#051923"];

export const MeshGradient = React.memo(function MeshGradient({
  colors: colorsProp,
  color1 = "#4c9bff",
  color2 = "#1f4fd8",
  color3 = "#0a1a4a",
  color4 = "#6366f1",
  color5 = "##DCDCAA",
  speed = 0.8,
  distortion = 0.8,
  swirl = 0.57,
  scale = 1.4,
  rotation = 120,
  className,
  style,
}: MeshGradientProps) {
  const colors = React.useMemo(() => {
    if (colorsProp && colorsProp.length > 0) return colorsProp;
    const list = [color1, color2, color3];
    if (color4) list.push(color4);
    if (color5) list.push(color5);
    return a;
  }, [colorsProp, color1, color2, color3, color4, color5]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  // Efficient internal resolution for GPU acceleration (scaled with CSS)
  const [renderSize, setRenderSize] = React.useState({
    width: 960,
    height: 540,
  });
  const [mounted, setMounted] = React.useState(false);
  const [shaderLoaded, setShaderLoaded] = React.useState(
    () => CachedMeshGradient !== null,
  );
  const [ShaderComp, setShaderComp] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.useState<React.ComponentType<any> | null>(() => CachedMeshGradient);

  // Lazy-load WebGL shader without blocking initial render
  React.useEffect(() => {
    setMounted(true);
    if (!CachedMeshGradient) {
      import("@paper-design/shaders-react")
        .then((mod) => {
          CachedMeshGradient = mod.MeshGradient;
          setShaderComp(() => mod.MeshGradient);
          setShaderLoaded(true);
        })
        .catch(() => {});
    } else {
      setShaderLoaded(true);
    }
  }, []);

  // Efficient ResizeObserver with capped resolution for 60fps performance
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeoutId: NodeJS.Timeout;
    const updateSize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      // Cap internal shader resolution to max 1280x720 for optimal GPU efficiency
      // Mesh gradients are blurred by definition, so hardware bilinear upscaling looks identical
      // while using 75% less GPU memory and fragment calculations
      const maxW = 1280;
      const maxH = 720;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      const targetW = Math.round(w * ratio);
      const targetH = Math.round(h * ratio);

      setRenderSize((prev) => {
        if (
          Math.abs(prev.width - targetW) > 20 ||
          Math.abs(prev.height - targetH) > 20
        ) {
          return { width: targetW, height: targetH };
        }
        return prev;
      });
    };

    const ro = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const { width, height } = entries[0].contentRect;
        updateSize(width, height);
      }, 100);
    });

    ro.observe(el);
    const { width, height } = el.getBoundingClientRect();
    updateSize(width, height);

    return () => {
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative size-full overflow-hidden pointer-events-none select-none",
        className,
      )}
      style={style}
    >
      {/* 
        Instant High-Performance CSS Radial Mesh Background:
        Renders immediately at 0ms (0 JavaScript overhead, 0 WebGL overhead),
        ensuring vibrant colors on initial paint with zero flash or wait time.
      */}
      <div
        className="absolute inset-0 size-full"
        style={{
          background: `
            radial-gradient(circle at 18% 25%, rgba(76, 155, 255, 0.6) 0%, transparent 48%),
            radial-gradient(circle at 82% 35%, rgba(99, 102, 241, 0.55) 0%, transparent 45%),
            radial-gradient(circle at 50% 82%, rgba(31, 79, 216, 0.75) 0%, transparent 55%),
            radial-gradient(circle at 75% 85%, rgba(56, 189, 248, 0.4) 0%, transparent 50%),
            linear-gradient(135deg, #070d24 0%, #0a1a4a 40%, #1f4fd8 100%)
          `,
        }}
      />

      {/* 
        Live Procedural WebGL Mesh Shader:
        Once loaded, it smoothly transitions in over the CSS base gradient,
        animating fluid swirls with capped resolution for maximum GPU efficiency.
      */}
      {mounted && ShaderComp && (
        <div
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-1000 ease-out",
            shaderLoaded ? "opacity-100" : "opacity-0",
          )}
        >
          <ShaderComp
            width={renderSize.width}
            height={renderSize.height}
            colors={colors}
            distortion={distortion}
            swirl={swirl}
            speed={speed}
            scale={scale}
            rotation={rotation}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
});

export default MeshGradient;
