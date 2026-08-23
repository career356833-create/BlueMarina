export type RegulationChangeType = "CREATED" | "UPDATED" | "DEPRECATED" | "REPLACED";

export type RegulationChangeEvent = {
  eventId: string;
  sourceId: string;
  previousVersionId?: string;
  nextVersionId: string;
  changeType: RegulationChangeType;
  changedFields: string[];
  detectedAt: string;
};

export function createRegulationChangeEvent(input: Omit<RegulationChangeEvent, "eventId"> & { eventId?: string }): RegulationChangeEvent {
  return {
    eventId: input.eventId ?? `reg-change-${input.sourceId}-${input.nextVersionId}-${input.detectedAt}`,
    sourceId: input.sourceId,
    previousVersionId: input.previousVersionId,
    nextVersionId: input.nextVersionId,
    changeType: input.changeType,
    changedFields: input.changedFields,
    detectedAt: input.detectedAt
  };
}
