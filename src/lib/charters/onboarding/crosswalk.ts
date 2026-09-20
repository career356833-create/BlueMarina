import type { CharterSupplySubmission, CrosswalkStatus } from "./contracts";

export interface OfficialRegistrationRecord { id: string; portName: string; capacity: number | null; registrationInfo?: string | null }
export interface CrosswalkResult { status: CrosswalkStatus; registrationId: string | null; reasons: string[]; autoApproved: false }
const normalized = (value: string | null | undefined) => (value ?? "").normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase("ko-KR");

export function crosswalkMofBatch001(submission: CharterSupplySubmission, registrations: OfficialRegistrationRecord[]): CrosswalkResult {
  const boat = submission.boats[0]; const port = submission.ports[0];
  const registration = normalized(boat?.registrationInfo);
  if (registration) {
    const exact = registrations.find((row) => normalized(row.registrationInfo) === registration && normalized(row.portName) === normalized(port?.name) && row.capacity === boat?.capacity);
    if (exact) return { status: "EXACT_MATCH", registrationId: exact.id, reasons: ["registration", "port", "capacity"], autoApproved: false };
    const strong = registrations.find((row) => normalized(row.registrationInfo) === registration);
    if (strong) return { status: "HIGH_CONFIDENCE", registrationId: strong.id, reasons: ["registration"], autoApproved: false };
  }
  const candidate = registrations.find((row) => normalized(row.portName) === normalized(port?.name) && row.capacity === boat?.capacity);
  return candidate ? { status: "CANDIDATE", registrationId: candidate.id, reasons: ["port", "capacity"], autoApproved: false } : { status: "NO_MATCH", registrationId: null, reasons: [], autoApproved: false };
}
