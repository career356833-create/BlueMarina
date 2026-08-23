import type { FishRoleRevocationClock } from "../worker/types";
export class FakeFishRoleRevocationClock implements FishRoleRevocationClock {
  constructor(private value = new Date("2026-08-04T00:00:00.000Z")) {}
  now() { return new Date(this.value); }
  set(value: Date) { this.value = new Date(value); }
  advance(milliseconds: number) { this.value = new Date(this.value.getTime() + milliseconds); }
}
