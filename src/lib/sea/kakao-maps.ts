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

  if (window.kakao?.maps) {
    return Promise.resolve();
  }

  if (window.__blueMarinaKakaoMapPromise) {
    return window.__blueMarinaKakaoMapPromise;
  }

  window.__blueMarinaKakaoMapPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    let readyTimeout: ReturnType<typeof setTimeout> | null = null;

    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
        readyTimeout = null;
      }
      resolve();
    };

    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
        readyTimeout = null;
      }
      reject(error);
    };

    const existingScript = document.getElementById(KAKAO_SDK_ID) as HTMLScriptElement | null;

    const handleLoaded = () => {
      if (!window.kakao?.maps) {
        rejectOnce(new Error("Kakao Maps SDK loaded without maps namespace."));
        return;
      }

      readyTimeout = setTimeout(() => {
        resolveOnce();
      }, 700);

      try {
        window.kakao.maps.load(() => resolveOnce());
      } catch {
        resolveOnce();
      }
    };

    if (existingScript) {
      if (window.kakao?.maps) {
        resolveOnce();
        return;
      }

      existingScript.addEventListener("load", handleLoaded, { once: true });
      existingScript.addEventListener(
        "error",
        () => rejectOnce(new Error("Kakao Maps SDK load failed.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SDK_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = handleLoaded;
    script.onerror = () => rejectOnce(new Error("Kakao Maps SDK load failed."));
    document.head.appendChild(script);
  }).catch((error) => {
    window.__blueMarinaKakaoMapPromise = undefined;
    throw error;
  });

  return window.__blueMarinaKakaoMapPromise;
}
