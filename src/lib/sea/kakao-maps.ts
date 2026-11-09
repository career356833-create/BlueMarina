export type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

export type KakaoBounds = {
  contain(latLng: KakaoLatLng): boolean;
};

export type KakaoMapInstance = {
  setCenter(latLng: KakaoLatLng): void;
  setLevel(level: number): void;
  panTo(latLng: KakaoLatLng): void;
  relayout(): void;
  getBounds(): KakaoBounds;
};

export type KakaoMarkerInstance = {
  setMap(map: KakaoMapInstance | null): void;
  getPosition(): KakaoLatLng;
};

export type KakaoMarkerImage = unknown;

export type KakaoMapsNamespace = {
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Marker: new (options: {
    map?: KakaoMapInstance | null;
    position: KakaoLatLng;
    image?: KakaoMarkerImage;
    title?: string;
    clickable?: boolean;
    zIndex?: number;
  }) => KakaoMarkerInstance;
  MarkerImage: new (src: string, size: KakaoSize, options: { offset: KakaoPoint }) => KakaoMarkerImage;
  Size: new (width: number, height: number) => KakaoSize;
  Point: new (x: number, y: number) => KakaoPoint;
  event: {
    addListener(target: unknown, type: string, handler: () => void): void;
    removeListener(target: unknown, type: string, handler: () => void): void;
  };
  load(callback: () => void): void;
};

export type KakaoSize = {
  width: number;
  height: number;
};

export type KakaoPoint = {
  x: number;
  y: number;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsNamespace;
    };
    __blueMarinaKakaoMapPromise?: Promise<void>;
  }
}

const KAKAO_SDK_ID = "blue-marina-kakao-maps-sdk";

export function loadKakaoMaps(appKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps SDK is only available in the browser."));
  }

  if (!appKey) {
    return Promise.reject(new Error("Kakao Maps API key is not configured."));
  }

  const ready = () => {
    const maps = window.kakao?.maps;
    return maps && [maps.Map, maps.LatLng, maps.Marker, maps.MarkerImage, maps.Size, maps.Point,
      maps.event?.addListener, maps.event?.removeListener].every(value => typeof value === "function");
  };
  if (ready()) return Promise.resolve();
  if (window.__blueMarinaKakaoMapPromise) return window.__blueMarinaKakaoMapPromise;

  window.__blueMarinaKakaoMapPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(KAKAO_SDK_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    let settled = false;
    const timer = setTimeout(() => finish(false), 12000);
    function finish(success: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
      if (success) resolve();
      else {
        script.remove();
        reject(new Error("Kakao Maps SDK load failed: map constructors unavailable."));
      }
    }
    function failed() { finish(false); }
    function loaded() {
      if (settled) return;
      try {
        if (!window.kakao?.maps?.load) return failed();
        window.kakao.maps.load(() => finish(Boolean(ready())));
      } catch { failed(); }
    }
    if (window.kakao?.maps?.load) return loaded();
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", failed, { once: true });
    if (!existing) {
      script.id = KAKAO_SDK_ID;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    window.__blueMarinaKakaoMapPromise = undefined;
    throw error;
  });

  return window.__blueMarinaKakaoMapPromise;
}
