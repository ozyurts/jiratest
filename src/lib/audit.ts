/**
 * Audit helpers — populates NFR §5.2 mandatory audit columns automatically.
 */

export type AuditOperation = "CREATE" | "UPDATE" | "DELETE";

export interface AuditFields {
  createdBy: string;
  lastUpdater: string;
  lastOperation: AuditOperation;
  isDeleted: "YES" | "NO";
}

export function createAudit(actorEmail: string): AuditFields {
  return {
    createdBy: actorEmail,
    lastUpdater: actorEmail,
    lastOperation: "CREATE",
    isDeleted: "NO",
  };
}

export function updateAudit(actorEmail: string): Pick<AuditFields, "lastUpdater" | "lastOperation"> {
  return {
    lastUpdater: actorEmail,
    lastOperation: "UPDATE",
  };
}

export function deleteAudit(actorEmail: string): Pick<AuditFields, "lastUpdater" | "lastOperation" | "isDeleted"> {
  return {
    lastUpdater: actorEmail,
    lastOperation: "DELETE",
    isDeleted: "YES",
  };
}
