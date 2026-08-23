export function originAllowed(origin: string | null | undefined, allowed: string[]) { return Boolean(origin && allowed.includes(origin)); }
