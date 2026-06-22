import type { ServiceErrorCode } from "@observatory/types";

export class ObservationError extends Error {
  constructor(readonly code: ServiceErrorCode) {
    super(code);
    this.name = "ObservationError";
  }
}
