interface HandwritingServiceError {
  status: 502 | 503 | 504;
  message: string;
}

const SERVICE_UNAVAILABLE_MESSAGE =
  "Handwriting analysis is unavailable because its local service is not running. Start it with `npm run handwriting:start`, or use `npm run dev:handwriting` to start both NeuroSync and the handwriting service.";

export function getHandwritingServiceError(error: unknown): HandwritingServiceError {
  const errorName = error instanceof Error ? error.name : "";
  const errorMessage = error instanceof Error ? error.message : "";
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
  const causeCode = cause && typeof cause === "object" && "code" in cause
    ? cause.code
    : null;

  if (errorName === "AbortError" || errorName === "TimeoutError") {
    return {
      status: 504,
      message: "Handwriting analysis timed out. Please try again with a smaller or clearer image.",
    };
  }

  if (
    errorMessage === "fetch failed" ||
    causeCode === "ECONNREFUSED" ||
    causeCode === "ECONNRESET" ||
    causeCode === "ENOTFOUND" ||
    causeCode === "EHOSTUNREACH"
  ) {
    return { status: 503, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  return {
    status: 502,
    message: "Could not communicate with the handwriting analysis service. Please try again.",
  };
}

export function getHandwritingServiceUrl(): string {
  return process.env.HANDWRITING_SERVICE_URL ?? "http://127.0.0.1:8001";
}
