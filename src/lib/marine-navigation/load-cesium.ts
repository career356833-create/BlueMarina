import type * as Cesium from "cesium";

type CesiumWindow = Window & { Cesium?: typeof Cesium; CESIUM_BASE_URL?: string };
let loading: Promise<typeof Cesium> | null = null;

// Use the pinned vendor distribution: Next 15's minifier corrupts the embedded
// Wasm byte string in Cesium 1.146's ESM bundle. No eval or CSP relaxation.
export function loadCesium(): Promise<typeof Cesium> {
  const runtime = window as CesiumWindow;
  if (runtime.Cesium) return Promise.resolve(runtime.Cesium);
  if (loading) return loading;
  runtime.CESIUM_BASE_URL = "/cesium/";
  loading = new Promise<typeof Cesium>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/cesium/Cesium.js";
    script.async = true;
    const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error("CESIUM_SCRIPT_UNAVAILABLE")); };
    const timer = setTimeout(fail, 20_000);
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (!runtime.Cesium) { fail(); return; }
      resolve(runtime.Cesium);
    };
    document.head.appendChild(script);
  });
  return loading;
}
