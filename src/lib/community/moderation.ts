export const COMMUNITY_SAFETY_FLAGS = ["ILLEGAL_TRADE", "WEAPON_OR_DRUG", "PROTECTED_SPECIES", "PERSONAL_INFORMATION", "HARASSMENT", "FRAUD", "MISLEADING_SAFETY", "ILLEGAL_FISHING"] as const;

const rules: Array<[typeof COMMUNITY_SAFETY_FLAGS[number], RegExp]> = [
  ["ILLEGAL_TRADE", /불법\s*(거래|판매)|장물|위조품/i],
  ["WEAPON_OR_DRUG", /총기|탄약|폭발물|마약|불법\s*약물/i],
  ["PROTECTED_SPECIES", /보호종\s*(포획|판매|거래)/i],
  ["PERSONAL_INFORMATION", /주민등록번호|계좌번호|집\s*주소|전화번호를\s*공개/i],
  ["HARASSMENT", /죽여버|협박|신상\s*털/i],
  ["FRAUD", /선입금만|무조건\s*수익|사기\s*판매/i],
  ["MISLEADING_SAFETY", /구명조끼\s*필요\s*없|태풍에도\s*안전|통제구역.*안전/i],
  ["ILLEGAL_FISHING", /금어기.*잡아|불법\s*조업|금지어구.*사용/i],
];

export function detectCommunitySafetyFlags(value: string) {
  return rules.filter(([, pattern]) => pattern.test(value)).map(([flag]) => flag);
}
