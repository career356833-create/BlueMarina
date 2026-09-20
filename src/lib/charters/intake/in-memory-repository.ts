import type { IntakeAuditEvent, IntakeReviewRecord, PromotionCandidateRecord, StoredSupplySubmission, SupplyIntakeRepository } from "./types";

const clone = <T>(value: T): T => structuredClone(value);
export class InMemorySupplyIntakeRepository implements SupplyIntakeRepository {
  submissions = new Map<string, StoredSupplySubmission>();
  reviews: IntakeReviewRecord[] = [];
  audit: IntakeAuditEvent[] = [];
  promotions: PromotionCandidateRecord[] = [];
  async find(id: string) { const value = this.submissions.get(id); return value ? clone(value) : null; }
  async findByIdempotency(submittedBy: string, key: string) { return [...this.submissions.values()].find((value) => value.submittedBy === submittedBy && value.idempotencyKey === key) ?? null; }
  async findByContentHash(submittedBy: string, hash: string) { return [...this.submissions.values()].find((value) => value.submittedBy === submittedBy && value.contentHash === hash) ?? null; }
  async list(limit: number) { return [...this.submissions.values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, limit).map(clone); }
  async create(value: StoredSupplySubmission) { this.submissions.set(value.id, clone(value)); return clone(value); }
  async update(value: StoredSupplySubmission) { const prior = this.submissions.get(value.id); if (!prior) throw new Error("MISSING"); if (JSON.stringify(prior.rawPayload) !== JSON.stringify(value.rawPayload)) throw new Error("IMMUTABLE_SOURCE"); this.submissions.set(value.id, clone(value)); return clone(value); }
  async appendReview(value: IntakeReviewRecord) { this.reviews.push(clone(value)); }
  async appendAudit(value: IntakeAuditEvent) { this.audit.push(clone(value)); }
  async savePromotionCandidate(value: PromotionCandidateRecord) { if (!this.promotions.some((item) => item.submissionId === value.submissionId)) this.promotions.push(clone(value)); }
}
