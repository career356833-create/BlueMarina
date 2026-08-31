"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, LocateFixed, MapPin, Navigation2, Satellite } from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";
import { fishingSpots, getFishingSpotTypeLabel, type FishingSpot } from "@/data/fishing-spots";
import { fishingVillageRevitalizationProjects, type RevitalizationProject } from "@/data/fishing-village-revitalization-projects";
import { nationalPorts, getNationalPortCoastLabel, type NationalPort } from "@/data/national-ports";
import { localPorts, type LocalPort } from "@/data/local-ports";
import { fixedPorts, type FixedPort } from "@/data/fixed-ports";
import { createCurrentLocationMarkerImage, createFixedPortMarkerImage, createLocalPortMarkerImage, createMarinePlaceGroupMarkerImage, createNationalPortMarkerImage, createSpotMarkerImage } from "@/components/sea/SpotMarker";
import { loadKakaoMaps, type KakaoMapInstance, type KakaoMarkerInstance } from "@/lib/sea/kakao-maps";
import { LocationButton } from "@/components/sea/LocationButton";
import { SeaNavigationLink } from "@/components/boat/navigation/SeaNavigationLink";
import { navigationDestinationFromFishingSpot, navigationDestinationFromMarinePlace } from "@/lib/marine-navigation/adapters/navigation-destination-adapter";

type GPSStatus = "unavailable" | "locating" | "ready" | "denied";
type SDKStatus = "loading" | "ready" | "error";

type SelectedFeature =
  | { kind: "fishing-spot"; id: string }
  | { kind: "national-port"; id: string }
  | { kind: "local-port"; id: string }
  | { kind: "fixed-port"; id: string };

type MarinePlaceLayerKind = "national-port" | "local-port" | "fixed-port";

type MarinePlaceSelectionItem = {
  kind: MarinePlaceLayerKind;
  id: string;
  name: string;
  summary: string;
  latNumber: number;
  lngNumber: number;
  coordinateGroupId: string;
  revitalizationProjects: RevitalizationProjectSummary[];
};

type MarinePlaceCoordinateGroup = {
  coordinateGroupId: string;
  latNumber: number;
  lngNumber: number;
  items: MarinePlaceSelectionItem[];
};

type RevitalizationProjectSummary = {
  id: string;
  projectType: RevitalizationProject["projectType"];
  projectTypeName: string;
  selectedYear?: number;
  sourceName: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  matchMethod?: string;
  matchNote?: string;
};

type MarkerBadge = {
  label: string;
  fill: string;
  text: string;
};

type ParsedFishingSpot = FishingSpot & {
  latNumber: number;
  lngNumber: number;
};

type ParsedNationalPort = NationalPort & {
  latNumber: number;
  lngNumber: number;
};

type ParsedLocalPort = LocalPort & {
  latNumber: number;
  lngNumber: number;
};

type ParsedFixedPort = FixedPort & {
  latNumber: number;
  lngNumber: number;
};

const DEFAULT_CENTER = { lat: 35.1796, lng: 129.0756 };
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";
const MAP_LEVEL = 8;

function isValidLatitude(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 90;
}

function isValidLongitude(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 180;
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

function formatGpsStatus(status: GPSStatus) {
  switch (status) {
    case "locating":
      return "위치 확인 중";
    case "ready":
      return "현재 위치 사용 가능";
    case "denied":
      return "위치 권한 거부";
    default:
      return "위치 정보 없음";
  }
}

function buildFishingSummary(spot: ParsedFishingSpot) {
  return [spot.region, spot.city, spot.address, getFishingSpotTypeLabel(spot.type)].filter(Boolean).join(" · ");
}

function buildPortSummary(port: ParsedNationalPort) {
  return [port.region, getNationalPortCoastLabel(port.coast), port.address].filter(Boolean).join(" · ");
}

function buildLocalPortSummary(port: ParsedLocalPort) {
  return [port.region, port.address].filter(Boolean).join(" · ");
}

function buildFixedPortSummary(port: ParsedFixedPort) {
  return [port.region, port.address].filter(Boolean).join(" · ");
}

function getMarinePlaceLayerLabel(kind: MarinePlaceLayerKind) {
  switch (kind) {
    case "national-port":
      return "국가어항";
    case "local-port":
      return "지방어항";
    case "fixed-port":
      return "어촌정주어항";
    default:
      return "해양 거점";
  }
}

function getCoordinateGroupId(latNumber: number, lngNumber: number) {
  return `${latNumber.toFixed(6)},${lngNumber.toFixed(6)}`;
}

function groupMarinePlaces(items: MarinePlaceSelectionItem[]) {
  const grouped = new Map<string, MarinePlaceCoordinateGroup>();

  items.forEach((item) => {
    const existing = grouped.get(item.coordinateGroupId);
    if (existing) {
      existing.items.push(item);
      return;
    }

    grouped.set(item.coordinateGroupId, {
      coordinateGroupId: item.coordinateGroupId,
      latNumber: item.latNumber,
      lngNumber: item.lngNumber,
      items: [item]
    });
  });

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.latNumber !== right.latNumber) {
      return left.latNumber - right.latNumber;
    }

    if (left.lngNumber !== right.lngNumber) {
      return left.lngNumber - right.lngNumber;
    }

    return left.coordinateGroupId.localeCompare(right.coordinateGroupId);
  });
}

function getRevitalizationTypeShortLabel(projectType: RevitalizationProject["projectType"]) {
  switch (projectType) {
    case "type_1":
      return "경";
    case "type_2":
      return "생";
    case "type_3":
      return "안";
    default:
      return "신";
  }
}

function getRevitalizationBadgeMeta(projectType: RevitalizationProject["projectType"]): MarkerBadge {
  switch (projectType) {
    case "type_1":
      return { label: "경", fill: "#FFB020", text: "#062B5C" };
    case "type_2":
      return { label: "생", fill: "#35D07F", text: "#062B5C" };
    case "type_3":
      return { label: "안", fill: "#00D3C7", text: "#062B5C" };
    default:
      return { label: "신", fill: "#2E8BFF", text: "#FFFFFF" };
  }
}

function layerChipClass(active: boolean) {
  return [
    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-black transition",
    active
      ? "border-[#2E8BFF] bg-[#2E8BFF]/15 text-[#EAF2FF]"
      : "border-[#1F3A50] bg-[#071827] text-[#9FB3C8]"
  ].join(" " );
}

export function SeaMapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const fishingMarkerRefs = useRef<KakaoMarkerInstance[]>([]);
  const marinePlaceMarkerRefs = useRef<KakaoMarkerInstance[]>([]);
  const currentMarkerRef = useRef<KakaoMarkerInstance | null>(null);

  const parsedFishingSpots = useMemo<ParsedFishingSpot[]>(
    () =>
      fishingSpots
        .map((spot) => {
          const latNumber = Number(spot.lat);
          const lngNumber = Number(spot.lng);

          return {
            ...spot,
            latNumber,
            lngNumber
          };
        })
        .filter((spot) => isValidLatitude(spot.latNumber) && isValidLongitude(spot.lngNumber)),
    []
  );

  const parsedNationalPorts = useMemo<ParsedNationalPort[]>(
    () =>
      nationalPorts
        .map((port) => ({
          ...port,
          latNumber: Number(port.lat),
          lngNumber: Number(port.lng)
        }))
        .filter((port) => isValidLatitude(port.latNumber) && isValidLongitude(port.lngNumber)),
    []
  );

  const parsedLocalPorts = useMemo<ParsedLocalPort[]>(
    () =>
      localPorts
        .map((port) => ({
          ...port,
          latNumber: Number(port.lat),
          lngNumber: Number(port.lng)
        }))
        .filter((port) => isValidLatitude(port.latNumber) && isValidLongitude(port.lngNumber)),
    []
  );

  const parsedFixedPorts = useMemo<ParsedFixedPort[]>(
    () =>
      fixedPorts
        .map((port) => ({
          ...port,
          latNumber: Number(port.lat),
          lngNumber: Number(port.lng)
        }))
        .filter((port) => isValidLatitude(port.latNumber) && isValidLongitude(port.lngNumber)),
    []
  );

  const [sdkStatus, setSdkStatus] = useState<SDKStatus>(KAKAO_KEY ? "loading" : "error");
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>("unavailable");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleFishingSpots, setVisibleFishingSpots] = useState<ParsedFishingSpot[]>([]);
  const [visibleNationalPorts, setVisibleNationalPorts] = useState<ParsedNationalPort[]>([]);
  const [visibleLocalPorts, setVisibleLocalPorts] = useState<ParsedLocalPort[]>([]);
  const [visibleFixedPorts, setVisibleFixedPorts] = useState<ParsedFixedPort[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [selectedMarinePlaceGroup, setSelectedMarinePlaceGroup] = useState<MarinePlaceCoordinateGroup | null>(null);
  const [showFishingSpots, setShowFishingSpots] = useState(true);
  const [showNationalPorts, setShowNationalPorts] = useState(true);
  const [showLocalPorts, setShowLocalPorts] = useState(true);
  const [showFixedPorts, setShowFixedPorts] = useState(true);
  const [showRevitalizationProjects, setShowRevitalizationProjects] = useState(true);
  const [isTopPanelExpanded, setIsTopPanelExpanded] = useState(false);
  const showFishingLayer = showFishingSpots;
  const setShowFishingLayer = setShowFishingSpots;
  const showNationalLayer = showNationalPorts;
  const setShowNationalLayer = setShowNationalPorts;
  const showLocalLayer = showLocalPorts;
  const setShowLocalLayer = setShowLocalPorts;
  const showFixedLayer = showFixedPorts;
  const setShowFixedLayer = setShowFixedPorts;
  const activeRevitalizationProjects = useMemo(
    () =>
      fishingVillageRevitalizationProjects.filter(
        (project) =>
          (project.matchStatus === "exact_matched" || project.matchStatus === "matched") && Boolean(project.marinePlaceId)
      ),
    []
  );
  const revitalizationProjectsByMarinePlaceId = useMemo(() => {
    const grouped = new Map<string, RevitalizationProjectSummary[]>();

    activeRevitalizationProjects.forEach((project) => {
      if (!project.marinePlaceId) {
        return;
      }

      const nextProject: RevitalizationProjectSummary = {
        id: project.id,
        projectType: project.projectType,
        projectTypeName: project.projectTypeName,
        selectedYear: project.selectedYear,
        sourceName: project.sourceName,
        sourceUrl: project.sourceUrl,
        sourceCheckedAt: project.sourceCheckedAt,
        matchMethod: project.matchMethod,
        matchNote: project.matchNote
      };

      const existing = grouped.get(project.marinePlaceId);
      if (existing) {
        existing.push(nextProject);
      } else {
        grouped.set(project.marinePlaceId, [nextProject]);
      }
    });

    return grouped;
  }, [activeRevitalizationProjects]);
  const [statusMessage, setStatusMessage] = useState<string>(
    KAKAO_KEY ? "현재 위치와 거점 정보를 지도로 준비하는 중입니다." : "카카오 지도 키를 설정하면 지도가 표시됩니다.",
  );

  const selectedFishingSpot = useMemo(
    () =>
      selectedFeature?.kind === "fishing-spot"
        ? parsedFishingSpots.find((spot) => spot.id === selectedFeature.id) ?? null
        : null,
    [parsedFishingSpots, selectedFeature]
  );

  const selectedNationalPort = useMemo(
    () =>
      selectedFeature?.kind === "national-port"
        ? parsedNationalPorts.find((port) => port.id === selectedFeature.id) ?? null
        : null,
    [parsedNationalPorts, selectedFeature]
  );

  const selectedLocalPort = useMemo(
    () =>
      selectedFeature?.kind === "local-port"
        ? parsedLocalPorts.find((port) => port.id === selectedFeature.id) ?? null
        : null,
    [parsedLocalPorts, selectedFeature]
  );

  const selectedFixedPort = useMemo(
    () =>
      selectedFeature?.kind === "fixed-port"
        ? parsedFixedPorts.find((port) => port.id === selectedFeature.id) ?? null
        : null,
    [parsedFixedPorts, selectedFeature]
  );

  const visibleMarinePlaceItems = useMemo<MarinePlaceSelectionItem[]>(
    () => [
      ...visibleNationalPorts.map((port) => ({
        kind: "national-port" as const,
        id: port.id,
        name: port.name,
        summary: buildPortSummary(port),
        latNumber: port.latNumber,
        lngNumber: port.lngNumber,
        coordinateGroupId: getCoordinateGroupId(port.latNumber, port.lngNumber),
        revitalizationProjects: revitalizationProjectsByMarinePlaceId.get(port.id) ?? []
      })),
      ...visibleLocalPorts.map((port) => ({
        kind: "local-port" as const,
        id: port.id,
        name: port.name,
        summary: buildLocalPortSummary(port),
        latNumber: port.latNumber,
        lngNumber: port.lngNumber,
        coordinateGroupId: getCoordinateGroupId(port.latNumber, port.lngNumber),
        revitalizationProjects: revitalizationProjectsByMarinePlaceId.get(port.id) ?? []
      })),
      ...visibleFixedPorts.map((port) => ({
        kind: "fixed-port" as const,
        id: port.id,
        name: port.name,
        summary: buildFixedPortSummary(port),
        latNumber: port.latNumber,
        lngNumber: port.lngNumber,
        coordinateGroupId: getCoordinateGroupId(port.latNumber, port.lngNumber),
        revitalizationProjects: revitalizationProjectsByMarinePlaceId.get(port.id) ?? []
      }))
    ],
    [revitalizationProjectsByMarinePlaceId, visibleFixedPorts, visibleLocalPorts, visibleNationalPorts]
  );

  const visibleMarinePlaceGroups = useMemo(
    () =>
      groupMarinePlaces(
        visibleMarinePlaceItems.filter((item) => {
          if (item.kind === "national-port") {
            return showNationalLayer;
          }

          if (item.kind === "local-port") {
            return showLocalLayer;
          }

          return showFixedLayer;
        })
      ),
    [showFixedLayer, showLocalLayer, showNationalLayer, visibleMarinePlaceItems]
  );

  const visibleMarinePlaceDuplicateGroupCount = useMemo(
    () => visibleMarinePlaceGroups.filter((group) => group.items.length > 1).length,
    [visibleMarinePlaceGroups]
  );

  const hasMapKey = Boolean(KAKAO_KEY);

  useEffect(() => {
    let mounted = true;

    if (!hasMapKey) {
      setSdkStatus("error");
      setStatusMessage("NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되어야 지도가 열립니다.");
      return () => {
        mounted = false;
      };
    }

    void loadKakaoMaps(KAKAO_KEY)
      .then(() => {
        if (!mounted) return;
        setSdkStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setSdkStatus("error");
        setStatusMessage("카카오 지도 SDK를 불러오지 못했습니다. 환경변수와 등록 도메인을 확인해 주세요.");
      });

    return () => {
      mounted = false;
    };
  }, [hasMapKey]);

  useEffect(() => {
    if (!showFishingLayer && selectedFeature?.kind === "fishing-spot") {
      setSelectedFeature(null);
    }
    if (!showNationalLayer && selectedFeature?.kind === "national-port") {
      setSelectedFeature(null);
    }
    if (!showLocalLayer && selectedFeature?.kind === "local-port") {
      setSelectedFeature(null);
    }
    if (!showFixedLayer && selectedFeature?.kind === "fixed-port") {
      setSelectedFeature(null);
    }
  }, [selectedFeature, showFishingLayer, showFixedLayer, showLocalLayer, showNationalLayer]);

  useEffect(() => {
    if (!selectedMarinePlaceGroup) {
      return;
    }

    const stillVisible = selectedMarinePlaceGroup.items.some((item) => {
      if (item.kind === "national-port") {
        return showNationalLayer;
      }

      if (item.kind === "local-port") {
        return showLocalLayer;
      }

      return showFixedLayer;
    });

    if (!stillVisible) {
      setSelectedMarinePlaceGroup(null);
    }
  }, [selectedMarinePlaceGroup, showFixedLayer, showLocalLayer, showNationalLayer]);

  useEffect(() => {
    if (sdkStatus !== "ready" || !mapContainerRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao.maps;
    const map = new kakao.Map(mapContainerRef.current, {
      center: new kakao.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
      level: MAP_LEVEL
    });

    mapRef.current = map;

    const syncVisibleFeatures = () => {
      const bounds = map.getBounds();

      const nextFishing = parsedFishingSpots.filter((spot) =>
        bounds.contain(new kakao.LatLng(spot.latNumber, spot.lngNumber))
      );
      const nextNationalPorts = parsedNationalPorts.filter((port) =>
        bounds.contain(new kakao.LatLng(port.latNumber, port.lngNumber))
      );
      const nextLocalPorts = parsedLocalPorts.filter((port) =>
        bounds.contain(new kakao.LatLng(port.latNumber, port.lngNumber))
      );
      const nextFixedPorts = parsedFixedPorts.filter((port) =>
        bounds.contain(new kakao.LatLng(port.latNumber, port.lngNumber))
      );

      setVisibleFishingSpots(nextFishing);
      setVisibleNationalPorts(nextNationalPorts);
      setVisibleLocalPorts(nextLocalPorts);
      setVisibleFixedPorts(nextFixedPorts);
    };

    const handleIdle = () => syncVisibleFeatures();

    syncVisibleFeatures();
    kakao.event.addListener(map, "idle", handleIdle);

    return () => {
      kakao.event.removeListener(map, "idle", handleIdle);
      mapRef.current = null;
    };
  }, [parsedFishingSpots, parsedFixedPorts, parsedLocalPorts, parsedNationalPorts, sdkStatus]);

  useEffect(() => {
    if (sdkStatus !== "ready" || !currentLocation || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao.maps;
    const map = mapRef.current;
    const position = new kakao.LatLng(currentLocation.lat, currentLocation.lng);

    map.setCenter(position);
    map.setLevel(6);
  }, [currentLocation, sdkStatus]);

  useEffect(() => {
    if (sdkStatus !== "ready" || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao.maps;
    const map = mapRef.current;
    const fishingMarkerImage = createSpotMarkerImage(kakao);
    const marinePlaceGroupMarkerImage = (count: number, badge?: MarkerBadge) => createMarinePlaceGroupMarkerImage(kakao, count, badge);
    const nationalPortMarkerImage = createNationalPortMarkerImage(kakao);
    const currentLocationMarkerImage = createCurrentLocationMarkerImage(kakao);

    fishingMarkerRefs.current.forEach((marker) => marker.setMap(null));
    marinePlaceMarkerRefs.current.forEach((marker) => marker.setMap(null));
    currentMarkerRef.current?.setMap(null);
    fishingMarkerRefs.current = [];
    marinePlaceMarkerRefs.current = [];
    currentMarkerRef.current = null;

    if (showFishingLayer) {
      fishingMarkerRefs.current = visibleFishingSpots.map((spot) => {
        const marker = new kakao.Marker({
          map,
          position: new kakao.LatLng(spot.latNumber, spot.lngNumber),
          image: fishingMarkerImage,
          title: spot.name,
          clickable: true,
          zIndex: 6
        });

        kakao.event.addListener(marker, "click", () => {
          setSelectedFeature({ kind: "fishing-spot", id: spot.id });
        });

        return marker;
      });
    }

    visibleMarinePlaceGroups.forEach((group) => {
      if (group.items.length === 1) {
        const item = group.items[0];
        let markerImage = nationalPortMarkerImage;
        let zIndex = 5;
        const revitalizationBadge = showRevitalizationProjects && item.revitalizationProjects.length > 0
          ? getRevitalizationBadgeMeta(item.revitalizationProjects[0].projectType)
          : undefined;

        if (item.kind === "local-port") {
          markerImage = createLocalPortMarkerImage(kakao, revitalizationBadge);
          zIndex = 4;
        } else if (item.kind === "fixed-port") {
          markerImage = createFixedPortMarkerImage(kakao, revitalizationBadge);
          zIndex = 3;
        } else {
          markerImage = createNationalPortMarkerImage(kakao, revitalizationBadge);
        }

        const marker = new kakao.Marker({
          map,
          position: new kakao.LatLng(item.latNumber, item.lngNumber),
          image: markerImage,
          title: item.name,
          clickable: true,
          zIndex
        });

        kakao.event.addListener(marker, "click", () => {
          setSelectedMarinePlaceGroup(null);
          setSelectedFeature({ kind: item.kind, id: item.id });
        });

        marinePlaceMarkerRefs.current.push(marker);
        return;
      }

      const groupRevitalizationProjects = group.items.flatMap((item) => item.revitalizationProjects);
      const groupBadge =
        showRevitalizationProjects && groupRevitalizationProjects.length > 0
          ? getRevitalizationBadgeMeta(groupRevitalizationProjects[0].projectType)
          : undefined;

      const marker = new kakao.Marker({
        map,
        position: new kakao.LatLng(group.latNumber, group.lngNumber),
        image: marinePlaceGroupMarkerImage(group.items.length, groupBadge),
        title: `이 위치의 해양 거점 ${group.items.length}개`,
        clickable: true,
        zIndex: 7
      });

      kakao.event.addListener(marker, "click", () => {
        setSelectedFeature(null);
        setSelectedMarinePlaceGroup(group);
      });

      marinePlaceMarkerRefs.current.push(marker);
    });

    if (currentLocation) {
      currentMarkerRef.current = new kakao.Marker({
        map,
        position: new kakao.LatLng(currentLocation.lat, currentLocation.lng),
        image: currentLocationMarkerImage,
        title: "현재 위치",
        clickable: false,
        zIndex: 10
      });
    }

    return () => {
      fishingMarkerRefs.current.forEach((marker) => marker.setMap(null));
      marinePlaceMarkerRefs.current.forEach((marker) => marker.setMap(null));
      currentMarkerRef.current?.setMap(null);
    };
  }, [currentLocation, showFishingLayer, sdkStatus, showRevitalizationProjects, visibleFishingSpots, visibleMarinePlaceGroups]);

  function handleRequestCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      setStatusMessage("브라우저가 위치 기능을 지원하지 않습니다.");
      return;
    }

    setGpsStatus("locating");
    setStatusMessage("현재 위치를 확인하는 중입니다.");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setCurrentLocation(nextLocation);
        setGpsStatus("ready");
        setStatusMessage(`현재 위치를 확인했습니다. (${formatCoordinate(nextLocation.lat)}, ${formatCoordinate(nextLocation.lng)})`);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus("denied");
          setStatusMessage("위치 권한이 거부되었습니다. 권한 허용 후 다시 시도해 주세요.");
          return;
        }

        setGpsStatus("unavailable");
        setStatusMessage("현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
      }
    );
  }

  const visibleMarkerCount = (showFishingLayer ? visibleFishingSpots.length : 0) + visibleMarinePlaceGroups.length;

  function renderRevitalizationProjects(projects: RevitalizationProjectSummary[]) {
    if (projects.length === 0) {
      return null;
    }

    return (
      <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">어촌신활력증진사업 대상지</p>
        <div className="mt-2 space-y-2">
          {projects.map((project) => (
            <div key={project.id} className="rounded-[14px] border border-[#1F3A50] bg-[#071827] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#2E8BFF]/15 px-2.5 py-1 text-[10px] font-black text-[#2E8BFF]">
                  {getRevitalizationTypeShortLabel(project.projectType)}
                </span>
                <span className="rounded-full bg-[#00D3C7]/15 px-2.5 py-1 text-[10px] font-black text-[#00D3C7]">
                  {project.projectTypeName}
                </span>
                {project.selectedYear ? (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-[#D7E4F6]">
                    {project.selectedYear}년
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-black text-white">{project.projectTypeName}</p>
              {project.matchMethod || project.matchNote ? (
                <p className="mt-1 text-[11px] font-semibold leading-5 text-[#9FB3C8]">
                  {project.matchMethod}
                  {project.matchNote ? ` · ${project.matchNote}` : ""}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold leading-5 text-[#9FB3C8]">
                <span>{project.sourceName}</span>
                <span>·</span>
                <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="text-[#2E8BFF] underline decoration-[#2E8BFF]/40 underline-offset-2">
                  공식 출처
                </a>
                <span>·</span>
                <span>{project.sourceCheckedAt.slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#050F19] text-white">
      <div className="absolute inset-0">
        <div
          ref={mapContainerRef}
          className={[
            "h-full w-full",
            sdkStatus === "ready"
              ? ""
              : "bg-[radial-gradient(circle_at_top,rgba(46,139,255,0.16),transparent_42%),linear-gradient(180deg,#071827_0%,#050F19_100%)]"
          ].join(" ")}
        />

        {sdkStatus !== "ready" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            <div className="pointer-events-auto max-w-[320px] rounded-[22px] border border-[#1F3A50] bg-[#071827]/88 px-4 py-3 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2E8BFF]/15 text-[#2E8BFF]">
                  <Satellite size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9FB3C8]">Blue Marina Sea</p>
                  <p className="mt-1 text-sm font-black text-white">{hasMapKey ? "지도를 불러오는 중입니다." : "지도 키가 설정되면 지도가 열립니다."}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-[#9FB3C8]">{statusMessage}</p>
              {!hasMapKey ? (
                <p className="mt-2 rounded-xl bg-[#0E2233] px-3 py-2 text-[11px] font-bold leading-5 text-[#D7E4F6]">
                  환경변수 <span className="font-black text-white">NEXT_PUBLIC_KAKAO_MAP_APP_KEY</span>를 넣으면 실지도가 표시됩니다.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="pointer-events-auto mx-auto max-w-[1280px]">
          <section className="rounded-[20px] border border-white/10 bg-[#071827]/90 p-2.5 backdrop-blur md:rounded-[24px] md:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="hidden text-[11px] font-black uppercase tracking-[0.26em] text-[#9FB3C8] md:block">Blue Marina Sea</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:mt-1">
                  <h1 className="text-[18px] font-black tracking-tight md:text-[26px]">바다 지도</h1>
                  <Link
                    href="/today-sea"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 text-[10px] font-black text-[#D7E4F6] transition hover:border-[#2E8BFF] hover:text-white md:text-[11px]"
                  >
                    오늘의 바다
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-1 hidden text-xs font-semibold leading-5 text-[#D7E4F6] md:block">현재 위치와 거점을 지도에서 바로 확인하세요.</p>
              </div>
              <div className="flex items-center gap-1.5 md:flex-col md:items-end md:gap-2">
                <span className="hidden rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 py-1 text-[11px] font-black text-[#9FB3C8] md:inline-flex">{formatGpsStatus(gpsStatus)}</span>
                <button
                  type="button"
                  onClick={handleRequestCurrentLocation}
                  disabled={gpsStatus === "locating"}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#2E8BFF] px-3 text-[11px] font-black text-white transition hover:bg-[#5aa4ff] disabled:cursor-not-allowed disabled:bg-[#2E8BFF]/55 md:hidden"
                >
                  <LocateFixed size={15} />
                  내 위치
                </button>
                <button
                  type="button"
                  onClick={handleRequestCurrentLocation}
                  disabled={gpsStatus === "locating"}
                  className="hidden min-h-9 items-center gap-1.5 rounded-full bg-[#2E8BFF] px-3 text-[11px] font-black text-white transition hover:bg-[#5aa4ff] disabled:cursor-not-allowed disabled:bg-[#2E8BFF]/55 md:inline-flex"
                >
                  <LocateFixed size={15} />
                  현재 위치
                </button>
                <button
                  type="button"
                  onClick={() => setIsTopPanelExpanded((value) => !value)}
                  className="min-h-9 rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 text-[11px] font-black text-[#EAF2FF] transition hover:border-[#2E8BFF] hover:text-white md:min-h-0 md:py-1"
                  aria-expanded={isTopPanelExpanded}
                >
                  <span className="md:hidden">{isTopPanelExpanded ? "접기" : "레이어"}</span>
                  <span className="hidden md:inline">{isTopPanelExpanded ? "접기" : "펼치기"}</span>
                </button>
              </div>
            </div>

            {isTopPanelExpanded ? (
              <>
                <div className="mt-3 rounded-[18px] border border-[#1F3A50] bg-[#0E2233]/85 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-[#D7E4F6]">
                    <button
                      type="button"
                      onClick={() => setShowFishingLayer((value) => !value)}
                      className={layerChipClass(showFishingLayer)}
                      aria-pressed={showFishingLayer}
                    >
                      낚시포인트
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleFishingSpots.length.toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNationalLayer((value) => !value)}
                      className={layerChipClass(showNationalLayer)}
                      aria-pressed={showNationalLayer}
                    >
                      국가어항
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleNationalPorts.length.toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLocalLayer((value) => !value)}
                      className={layerChipClass(showLocalLayer)}
                      aria-pressed={showLocalLayer}
                    >
                      지방어항
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleLocalPorts.length.toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFixedLayer((value) => !value)}
                      className={layerChipClass(showFixedLayer)}
                      aria-pressed={showFixedLayer}
                    >
                      어촌정주어항
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleFixedPorts.length.toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRevitalizationProjects((value) => !value)}
                      className={layerChipClass(showRevitalizationProjects)}
                      aria-pressed={showRevitalizationProjects}
                    >
                      신활력 사업지
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{activeRevitalizationProjects.length.toLocaleString()}</span>
                    </button>
                    {visibleMarinePlaceDuplicateGroupCount > 0 ? (
                      <span className="rounded-full bg-[#2E8BFF]/15 px-2.5 py-1 text-[10px] font-black text-[#2E8BFF]">
                        동일좌표 {visibleMarinePlaceDuplicateGroupCount.toLocaleString()}그룹
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 hidden gap-2 md:grid md:grid-cols-[1fr_auto]">
                  <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">현재 화면의 거점</p>
                    <p className="mt-1 text-sm font-black text-white">
                      낚시포인트 {visibleFishingSpots.length.toLocaleString()}개 · 국가어항 {visibleNationalPorts.length.toLocaleString()}개 · 지방어항 {visibleLocalPorts.length.toLocaleString()}개 · 어촌정주어항 {visibleFixedPorts.length.toLocaleString()}개
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-[#9FB3C8]">
                      총 {visibleMarkerCount.toLocaleString()}개가 현재 화면 범위에 보입니다. 레이어는 접어서 더 작게 볼 수 있습니다.
                    </p>
                  </div>
                  <LocationButton
                    label="현재 위치 찾기"
                    statusLabel={formatGpsStatus(gpsStatus)}
                    onClick={handleRequestCurrentLocation}
                    disabled={gpsStatus === "locating"}
                  />
                </div>
              </>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-[16px] border border-[#1F3A50] bg-[#0E2233]/85 px-2 py-2 md:mt-3 md:rounded-[18px] md:px-3">
                <div className="flex min-w-max items-center gap-1.5 text-[11px] font-black text-[#D7E4F6] md:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFishingLayer((value) => !value)}
                    className={`${layerChipClass(showFishingLayer)} min-h-9 shrink-0 px-2.5 py-1.5 md:min-h-0 md:px-3 md:py-2`}
                    aria-pressed={showFishingLayer}
                  >
                    <span className="md:hidden">낚시</span><span className="hidden md:inline">낚시포인트</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleFishingSpots.length.toLocaleString()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNationalLayer((value) => !value)}
                    className={`${layerChipClass(showNationalLayer)} min-h-9 shrink-0 px-2.5 py-1.5 md:min-h-0 md:px-3 md:py-2`}
                    aria-pressed={showNationalLayer}
                  >
                    <span className="md:hidden">국가</span><span className="hidden md:inline">국가어항</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleNationalPorts.length.toLocaleString()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLocalLayer((value) => !value)}
                    className={`${layerChipClass(showLocalLayer)} min-h-9 shrink-0 px-2.5 py-1.5 md:min-h-0 md:px-3 md:py-2`}
                    aria-pressed={showLocalLayer}
                  >
                    <span className="md:hidden">지방</span><span className="hidden md:inline">지방어항</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleLocalPorts.length.toLocaleString()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFixedLayer((value) => !value)}
                    className={`${layerChipClass(showFixedLayer)} min-h-9 shrink-0 px-2.5 py-1.5 md:min-h-0 md:px-3 md:py-2`}
                    aria-pressed={showFixedLayer}
                  >
                    <span className="md:hidden">정주</span><span className="hidden md:inline">어촌정주어항</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{visibleFixedPorts.length.toLocaleString()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevitalizationProjects((value) => !value)}
                    className={`${layerChipClass(showRevitalizationProjects)} min-h-9 shrink-0 px-2.5 py-1.5 md:min-h-0 md:px-3 md:py-2`}
                    aria-pressed={showRevitalizationProjects}
                  >
                    <span className="md:hidden">신활력</span><span className="hidden md:inline">신활력 사업지</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{activeRevitalizationProjects.length.toLocaleString()}</span>
                  </button>
                  {visibleMarinePlaceDuplicateGroupCount > 0 ? (
                    <span className="rounded-full bg-[#2E8BFF]/15 px-2.5 py-1 text-[10px] font-black text-[#2E8BFF]">
                      동일좌표 {visibleMarinePlaceDuplicateGroupCount.toLocaleString()}그룹
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] z-20 px-3 sm:px-4">
        <div className="pointer-events-auto mx-auto max-w-[1280px]">
          <section
            className={[
              "rounded-[24px] border border-white/10 bg-[#071827]/92 backdrop-blur",
              selectedFishingSpot || selectedNationalPort
                ? "max-w-[460px] p-4 lg:max-w-[560px]"
                : "max-w-[360px] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] lg:max-w-[420px]"
            ].join(" ")}
          >
            {selectedFishingSpot ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#2E8BFF]/15 px-3 py-1 text-[11px] font-black text-[#2E8BFF]">{getFishingSpotTypeLabel(selectedFishingSpot.type)}</span>
                      <span className="rounded-full bg-[#00D3C7]/15 px-3 py-1 text-[11px] font-black text-[#00D3C7]">선택됨</span>
                    </div>
                    <h2 className="mt-2 break-words text-lg font-black text-white">{selectedFishingSpot.name}</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">{buildFishingSummary(selectedFishingSpot)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 py-1 text-[11px] font-black text-[#D7E4F6]"
                  >
                    닫기
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">지역</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedFishingSpot.region}{selectedFishingSpot.city ? ` · ${selectedFishingSpot.city}` : ""}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">주소</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedFishingSpot.address}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">좌표</p>
                    <p className="mt-1 text-sm font-black text-white">{formatCoordinate(selectedFishingSpot.latNumber)}, {formatCoordinate(selectedFishingSpot.lngNumber)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">상세 보기</p>
                    <Link href="/fishing-spots" className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#2E8BFF]">
                      낚시거점 전체 보기
                      <Navigation2 size={16} />
                    </Link>
                  </div>
                </div>
                <SeaNavigationLink destination={navigationDestinationFromFishingSpot(selectedFishingSpot)} />
              </div>
            ) : selectedNationalPort ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#FFB020]/15 px-3 py-1 text-[11px] font-black text-[#FFB020]">국가어항</span>
                      <span className="rounded-full bg-[#35D07F]/15 px-3 py-1 text-[11px] font-black text-[#35D07F]">선택됨</span>
                    </div>
                    <h2 className="mt-2 break-words text-lg font-black text-white">{selectedNationalPort.name}</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">{buildPortSummary(selectedNationalPort)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 py-1 text-[11px] font-black text-[#D7E4F6]"
                  >
                    닫기
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">연안 구분</p>
                    <p className="mt-1 text-sm font-black text-white">{getNationalPortCoastLabel(selectedNationalPort.coast)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">행정구역</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedNationalPort.region ?? "미확인"}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">주소</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedNationalPort.address ?? "미확인"}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">지정일자</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedNationalPort.designatedAt ?? "미확인"}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">관리/조사기관</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedNationalPort.managementAgency ?? "미확인"}{selectedNationalPort.surveyAgency ? ` · ${selectedNationalPort.surveyAgency}` : ""}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">출처</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedNationalPort.sourceName}<br />{selectedNationalPort.sourceFile}</p>
                  </div>
                </div>

                {renderRevitalizationProjects(revitalizationProjectsByMarinePlaceId.get(selectedNationalPort.id) ?? [])}
                <SeaNavigationLink destination={navigationDestinationFromMarinePlace(selectedNationalPort, "port")} />

                <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">안내</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white">국가어항 정보이며 실제 낚시 가능 여부와 출입 통제는 현장에서 확인해야 합니다.</p>
                </div>
              </div>
            ) : selectedFixedPort ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#00D3C7]/15 px-3 py-1 text-[11px] font-black text-[#00D3C7]">어촌정주어항</span>
                      <span className="rounded-full bg-[#35D07F]/15 px-3 py-1 text-[11px] font-black text-[#35D07F]">선택됨</span>
                    </div>
                    <h2 className="mt-2 break-words text-lg font-black text-white">{selectedFixedPort.name}</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">{buildFixedPortSummary(selectedFixedPort)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 py-1 text-[11px] font-black text-[#D7E4F6]"
                  >
                    닫기
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">행정구역</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedFixedPort.region ?? "미확인"}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">주소</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedFixedPort.address ?? "미확인"}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">좌표</p>
                    <p className="mt-1 text-sm font-black text-white">{formatCoordinate(selectedFixedPort.latNumber)}, {formatCoordinate(selectedFixedPort.lngNumber)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">출처</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedFixedPort.sourceName}<br />{selectedFixedPort.sourceFile}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">관리기관</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedFixedPort.managementAuthority ?? "미확인"}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">지정일</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedFixedPort.designatedAt ?? "미확인"}</p>
                  </div>
                </div>

                {renderRevitalizationProjects(revitalizationProjectsByMarinePlaceId.get(selectedFixedPort.id) ?? [])}
                <SeaNavigationLink destination={navigationDestinationFromMarinePlace(selectedFixedPort, "port")} />

                <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">안내</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white">국가어항 정보가 아니라 어촌정주어항 정보입니다. 실제 출입과 이용 가능 여부는 현장에서 확인해 주세요.</p>
                </div>
              </div>
            ) : selectedLocalPort ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#35D07F]/15 px-3 py-1 text-[11px] font-black text-[#35D07F]">지방어항</span>
                      <span className="rounded-full bg-[#00D3C7]/15 px-3 py-1 text-[11px] font-black text-[#00D3C7]">{selectedLocalPort.coordinateStatus}</span>
                    </div>
                    <h2 className="mt-2 break-words text-lg font-black text-white">{selectedLocalPort.name}</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">{buildLocalPortSummary(selectedLocalPort)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 py-1 text-[11px] font-black text-[#D7E4F6]"
                  >
                    닫기
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">지역</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedLocalPort.region ?? "미확인"}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">주소</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedLocalPort.address ?? "미확인"}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">좌표</p>
                    <p className="mt-1 text-sm font-black text-white">{formatCoordinate(selectedLocalPort.latNumber)}, {formatCoordinate(selectedLocalPort.lngNumber)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">출처</p>
                    <p className="mt-1 text-sm font-black leading-6 text-white">{selectedLocalPort.sourceName}<br />{selectedLocalPort.sourceFile}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">관리기관</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedLocalPort.managementAuthority ?? "미확인"}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">지정일</p>
                    <p className="mt-1 text-sm font-black text-white">{selectedLocalPort.designatedAt ?? "미확인"}</p>
                  </div>
                </div>

                {renderRevitalizationProjects(revitalizationProjectsByMarinePlaceId.get(selectedLocalPort.id) ?? [])}
                <SeaNavigationLink destination={navigationDestinationFromMarinePlace(selectedLocalPort, "port")} />

                <div className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9FB3C8]">안내</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white">지방어항 정보이며 실제 낚시 가능 여부와 출입 통제는 현장에서 확인해야 합니다.</p>
                </div>
              </div>
            ) : selectedMarinePlaceGroup ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#2E8BFF]/15 px-3 py-1 text-[11px] font-black text-[#2E8BFF]">동일 좌표 그룹</span>
                      <span className="rounded-full bg-[#00D3C7]/15 px-3 py-1 text-[11px] font-black text-[#00D3C7]">{selectedMarinePlaceGroup.items.length.toLocaleString()}곳</span>
                      {selectedMarinePlaceGroup.items.some((item) => item.revitalizationProjects.length > 0) ? (
                        <span className="rounded-full bg-[#FFB020]/15 px-3 py-1 text-[11px] font-black text-[#FFB020]">
                          신활력 포함
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 break-words text-lg font-black text-white">이 위치의 해양 거점 {selectedMarinePlaceGroup.items.length.toLocaleString()}개</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">
                      {formatCoordinate(selectedMarinePlaceGroup.latNumber)}, {formatCoordinate(selectedMarinePlaceGroup.lngNumber)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMarinePlaceGroup(null)}
                    className="rounded-full border border-[#1F3A50] bg-[#0E2233] px-3 py-1 text-[11px] font-black text-[#D7E4F6]"
                  >
                    닫기
                  </button>
                </div>

                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                  {selectedMarinePlaceGroup.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-[18px] border border-[#1F3A50] bg-[#0E2233] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{item.name}</p>
                        <p className="mt-1 break-words text-[11px] font-semibold leading-5 text-[#9FB3C8]">{item.summary}</p>
                        {item.revitalizationProjects.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.revitalizationProjects.map((project) => (
                              <span
                                key={project.id}
                                className="rounded-full border border-[#FFB020]/30 bg-[#FFB020]/12 px-2.5 py-1 text-[10px] font-black text-[#FFB020]"
                              >
                                {project.projectTypeName}
                                {project.selectedYear ? ` · ${project.selectedYear}년` : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <span className="mt-2 inline-flex rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-[#D7E4F6]">
                          {getMarinePlaceLayerLabel(item.kind)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFeature({ kind: item.kind, id: item.id });
                          setSelectedMarinePlaceGroup(null);
                        }}
                        className="shrink-0 rounded-full border border-[#1F3A50] bg-[#0B5FD9] px-3.5 py-1.5 text-[11px] font-black text-white"
                      >
                        선택
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-[#1F3A50] bg-[#071827]/90 px-3 py-2 text-[11px] font-black text-[#EAF2FF] shadow-lg backdrop-blur">
                <MapPin size={14} className="shrink-0 text-[#2E8BFF]" />
                <p className="leading-4">마커를 눌러 거점 정보를 확인하세요</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {gpsStatus === "denied" ? (
        <div className="absolute left-3 top-[112px] z-20 max-w-[260px] rounded-[16px] border border-[#FFB020]/30 bg-[#FFB020]/15 p-2.5 text-[11px] font-bold leading-5 text-[#FFE2AB] shadow-lg backdrop-blur sm:left-4 md:top-[168px] md:max-w-[320px] md:p-3 md:text-xs">
          <div className="space-y-2">
            <p className="text-[12px] font-black text-[#FFE2AB] md:text-sm">위치 권한이 거부되었습니다</p>
            <p className="text-[11px] font-semibold leading-4 text-[#FFE8BF] md:text-xs md:leading-5">브라우저 설정에서 위치 권한을 허용한 후 다시 시도해 주세요.</p>
            <div className="space-y-1 rounded-[14px] border border-[#FFB020]/20 bg-black/10 px-2.5 py-2 text-[10px] font-semibold leading-4 text-[#FFE8BF] md:px-3 md:text-[11px]">
              <p>1. 주소창 자자손 아이콘을 눌러 권한을 확인하세요.</p>
              <p>2. 위치 허용 훌 페이지를 다시 불러오세요.</p>
              <p>3. 그래도 안 되면 브라우저 설정에서 위치 권한을 켜 주세요.</p>
            </div>
            <button
              type="button"
              onClick={handleRequestCurrentLocation}
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#FFB020] px-3.5 text-[11px] font-black text-[#071827] md:min-h-10 md:px-4 md:text-[12px]"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : null}

      {sdkStatus === "error" ? (
        <div className="pointer-events-none absolute left-3 top-[168px] z-20 max-w-[320px] rounded-[18px] border border-[#FF5A5F]/30 bg-[#FF5A5F]/15 p-3 text-xs font-bold leading-5 text-[#FFC0C3] shadow-lg backdrop-blur sm:left-4">
          카카오 지도 SDK를 불러오지 못했습니다. 환경변수나 등록 도메인을 확인해 주세요.
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
