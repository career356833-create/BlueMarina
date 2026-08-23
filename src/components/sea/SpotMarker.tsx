import type { KakaoMapsNamespace, KakaoMarkerImage } from "@/lib/sea/kakao-maps";

function createMarkerDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

type MarkerBadge = {
  label: string;
  fill: string;
  text: string;
};

function renderBadge(badge?: MarkerBadge, x = 31, y = 7, width = 14, height = 12) {
  if (!badge) {
    return "";
  }

  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${badge.fill}" stroke="white" stroke-width="0.8" />
      <text x="${x + width / 2}" y="${y + height - 3.2}" text-anchor="middle" font-size="6.4" font-family="Arial, sans-serif" font-weight="800" fill="${badge.text}">${badge.label}</text>
    </g>
  `;
}

function createMarkerImage(kakao: KakaoMapsNamespace, color: string, label: string, badge?: MarkerBadge): KakaoMarkerImage {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="46" height="58" viewBox="0 0 46 58" fill="none">
      <path d="M23 55C23 55 38 36.5 38 23C38 14.7157 31.2843 8 23 8C14.7157 8 8 14.7157 8 23C8 36.5 23 55 23 55Z" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="23" cy="23" r="8.5" fill="white" fill-opacity="0.95"/>
      <text x="23" y="26.5" text-anchor="middle" font-size="8" font-family="Arial, sans-serif" font-weight="700" fill="${color}">${label}</text>
      ${renderBadge(badge)}
    </svg>
  `;

  return new kakao.MarkerImage(createMarkerDataUri(svg), new kakao.Size(46, 58), {
    offset: new kakao.Point(23, 54)
  });
}

export function createSpotMarkerImage(kakao: KakaoMapsNamespace) {
  return createMarkerImage(kakao, "#2E8BFF", "SP");
}

export function createNationalPortMarkerImage(kakao: KakaoMapsNamespace, badge?: MarkerBadge) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="62" viewBox="0 0 50 62" fill="none">
      <path d="M25 58C25 58 41 39 41 25C41 16.1634 33.8366 9 25 9C16.1634 9 9 16.1634 9 25C9 39 25 58 25 58Z" fill="#FFB020" stroke="#FFFFFF" stroke-width="2.5"/>
      <path d="M18 28L25 17L32 28" stroke="#062B5C" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M25 17V42" stroke="#062B5C" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="25" cy="28" r="3.5" fill="#062B5C"/>
      <circle cx="25" cy="28" r="10.5" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5"/>
      ${renderBadge(badge, 31, 7, 15, 12)}
    </svg>
  `;

  return new kakao.MarkerImage(createMarkerDataUri(svg), new kakao.Size(50, 62), {
    offset: new kakao.Point(25, 58)
  });
}

export function createLocalPortMarkerImage(kakao: KakaoMapsNamespace, badge?: MarkerBadge) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="62" viewBox="0 0 50 62" fill="none">
      <path d="M25 58C25 58 41 39 41 25C41 16.1634 33.8366 9 25 9C16.1634 9 9 16.1634 9 25C9 39 25 58 25 58Z" fill="#35D07F" stroke="#FFFFFF" stroke-width="2.5"/>
      <path d="M17 27.5H33" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <path d="M17 33.5H33" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 21.5V39.5" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 21.5V39.5" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <circle cx="25" cy="28" r="3.5" fill="#062B5C"/>
      <circle cx="25" cy="28" r="10.5" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5"/>
      <text x="25" y="44.2" text-anchor="middle" font-size="7" font-family="Arial, sans-serif" font-weight="700" fill="#062B5C">LP</text>
      ${renderBadge(badge, 31, 7, 15, 12)}
    </svg>
  `;

  return new kakao.MarkerImage(createMarkerDataUri(svg), new kakao.Size(50, 62), {
    offset: new kakao.Point(25, 58)
  });
}

export function createFixedPortMarkerImage(kakao: KakaoMapsNamespace, badge?: MarkerBadge) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="62" viewBox="0 0 50 62" fill="none">
      <path d="M25 58C25 58 41 39 41 25C41 16.1634 33.8366 9 25 9C16.1634 9 9 16.1634 9 25C9 39 25 58 25 58Z" fill="#00D3C7" stroke="#FFFFFF" stroke-width="2.5"/>
      <path d="M17 27H33" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 21.5V39.5" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 21.5V39.5" stroke="#062B5C" stroke-width="3" stroke-linecap="round"/>
      <path d="M25 18C22.6 21.2 21.2 23.6 21.2 26.5C21.2 29.5 23.2 32 25 32C26.8 32 28.8 29.5 28.8 26.5C28.8 23.6 27.4 21.2 25 18Z" fill="#062B5C"/>
      <circle cx="25" cy="28" r="10.5" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5"/>
      <text x="25" y="44.2" text-anchor="middle" font-size="7" font-family="Arial, sans-serif" font-weight="700" fill="#062B5C">FP</text>
      ${renderBadge(badge, 31, 7, 15, 12)}
    </svg>
  `;

  return new kakao.MarkerImage(createMarkerDataUri(svg), new kakao.Size(50, 62), {
    offset: new kakao.Point(25, 58)
  });
}

export function createCurrentLocationMarkerImage(kakao: KakaoMapsNamespace) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="82" viewBox="0 0 64 82" fill="none">
      <circle cx="32" cy="32" r="18" fill="#00D3C7" fill-opacity="0.18"/>
      <circle cx="32" cy="32" r="13" fill="#00D3C7" fill-opacity="0.35"/>
      <path d="M32 76C32 76 52 52 52 32C52 20.9543 43.0457 12 32 12C20.9543 12 12 20.9543 12 32C12 52 32 76 32 76Z" fill="#00D3C7" stroke="white" stroke-width="3"/>
      <circle cx="32" cy="32" r="9" fill="white" fill-opacity="0.98"/>
      <text x="32" y="35.5" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" font-weight="700" fill="#00D3C7">ME</text>
    </svg>
  `;

  return new kakao.MarkerImage(createMarkerDataUri(svg), new kakao.Size(64, 82), {
    offset: new kakao.Point(32, 74)
  });
}

export function createMarinePlaceGroupMarkerImage(kakao: KakaoMapsNamespace, count: number, badge?: MarkerBadge) {
  const badgeLabel = count > 99 ? "99+" : `${count}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="58" height="72" viewBox="0 0 58 72" fill="none">
      <path d="M29 67C29 67 46 47.5 46 31.5C46 21.2827 37.7173 13 27.5 13C17.2827 13 9 21.2827 9 31.5C9 47.5 29 67 29 67Z" fill="#2E8BFF" stroke="#EAF2FF" stroke-width="2.8"/>
      <circle cx="29" cy="31.5" r="15" fill="#0B5FD9" fill-opacity="0.22"/>
      <circle cx="29" cy="31.5" r="10.5" fill="#EAF2FF" fill-opacity="0.98"/>
      <text x="29" y="35" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" font-weight="800" fill="#0B5FD9">${badgeLabel}</text>
      <circle cx="22" cy="25" r="2" fill="#00D3C7"/>
      <circle cx="36" cy="25" r="2" fill="#FFB020"/>
      <path d="M22 40H36" stroke="#0B5FD9" stroke-width="2.5" stroke-linecap="round"/>
      ${renderBadge(badge, 38, 8, 14, 12)}
    </svg>
  `;

  return new kakao.MarkerImage(createMarkerDataUri(svg), new kakao.Size(58, 72), {
    offset: new kakao.Point(29, 66)
  });
}
