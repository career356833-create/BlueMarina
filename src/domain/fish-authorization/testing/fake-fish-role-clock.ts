import type { FishRoleClock } from "../ports/fish-role-clock";
export class FakeFishRoleClock implements FishRoleClock { constructor(private value = new Date("2026-08-04T00:00:00.000Z")) {} now() { return this.value; } set(value: Date) { this.value = value; } }
