/** Conservative, explainable suggestions from repeated teaching events. */

export type AdaptationEvent = {
  stepId?: string | null;
  assistanceRequired: number | null;
  assistanceLevel?: string | null;
  retries: number;
  responseTimeMs: number | null;
  caretakerOutcome: string | null;
  performanceOutcome?: string | null;
  source: string | null;
  recordedAt?: string | null;
};

export type AdaptationSuggestion = {
  kind: "shorter_prompt" | "add_visual_support" | "longer_wait" | "simplify_step"
    | "alternative_method" | "reduce_prompt" | "next_step" | "keep_current";
  message: string;
  evidence: string;
  stepId?: string;
};

function outcome(event: AdaptationEvent): string | null {
  if (event.performanceOutcome) return event.performanceOutcome;
  switch (event.caretakerOutcome) {
    case "independent": return "completed_independently";
    case "assisted": return "completed_with_assistance";
    case "not_completed": return "not_completed";
    default: return null;
  }
}

function isAssisted(event: AdaptationEvent): boolean {
  if (event.assistanceLevel) {
    return !["independent", "not_applicable", "insufficient_opportunity"].includes(event.assistanceLevel);
  }
  return event.assistanceRequired === 1 || outcome(event) === "completed_with_assistance";
}

function isIndependent(event: AdaptationEvent): boolean {
  const completedIndependently = outcome(event) === "completed_independently";
  const assistanceLevel = event.assistanceLevel;
  return completedIndependently && (assistanceLevel === "independent" || (!assistanceLevel && event.assistanceRequired !== 1));
}

function deriveForStep(events: AdaptationEvent[], stepId?: string): AdaptationSuggestion[] {
  const ordered = events
    .filter((event) => {
      const result = outcome(event);
      return result !== null && result !== "not_attempted" && result !== "unable_to_determine";
    })
    .slice()
    .sort((left, right) => (left.recordedAt ?? "").localeCompare(right.recordedAt ?? ""));
  const prefix = stepId ? `For step ${stepId}: ` : "";
  const result = (suggestion: AdaptationSuggestion): AdaptationSuggestion => ({
    ...suggestion,
    ...(stepId ? { stepId } : {}),
    message: `${prefix}${suggestion.message}`,
  });

  if (ordered.length < 3) {
    return [result({
      kind: "keep_current",
      message: "Keep collecting attempts for this step before changing the approach.",
      evidence: `${ordered.length} recorded, interpretable attempt(s); not attempted and uncertain outcomes are excluded`,
    })];
  }

  const assisted = ordered.filter(isAssisted).length;
  const notCompleted = ordered.filter((event) =>
    ["partially_completed", "not_completed"].includes(outcome(event) ?? ""),
  ).length;
  const averageRetries = ordered.reduce((sum, event) => sum + event.retries, 0) / ordered.length;
  const responses = ordered.filter((event) => event.responseTimeMs !== null);
  const averageResponse = responses.length
    ? responses.reduce((sum, event) => sum + (event.responseTimeMs ?? 0), 0) / responses.length
    : 0;
  const suggestions: AdaptationSuggestion[] = [];

  if (notCompleted / ordered.length >= 0.67) {
    suggestions.push(result({
      kind: "simplify_step",
      message: "Consider breaking this step into smaller, easier-to-observe parts before practising again.",
      evidence: `${notCompleted} of ${ordered.length} recent attempts were partial or not completed`,
    }));
    suggestions.push(result({
      kind: "alternative_method",
      message: "Consider a different explanation, a visual example, or hands-on practice; ask the caretaker what may suit the child.",
      evidence: `${notCompleted} of ${ordered.length} recent attempts were partial or not completed`,
    }));
  } else if (assisted / ordered.length >= 0.67) {
    suggestions.push(result({
      kind: "add_visual_support",
      message: "Consider adding one simple visual cue or demonstration before the prompt.",
      evidence: `${assisted} of ${ordered.length} recent attempts needed assistance`,
    }));
    suggestions.push(result({
      kind: "simplify_step",
      message: "Consider offering a smaller part of this step while keeping the helpful support available.",
      evidence: `${assisted} of ${ordered.length} recent attempts needed assistance`,
    }));
  }

  if (averageRetries >= 2) {
    suggestions.push(result({
      kind: "shorter_prompt",
      message: "Consider using a shorter, one-part spoken prompt for the next attempts.",
      evidence: `Average retries: ${averageRetries.toFixed(1)} across ${ordered.length} attempts`,
    }));
  }
  if (averageResponse >= 20_000) {
    suggestions.push(result({
      kind: "longer_wait",
      message: "Consider waiting a little longer before repeating the prompt.",
      evidence: `Average recorded response time: ${Math.round(averageResponse / 1000)} seconds`,
    }));
  }

  let independentStreak = 0;
  for (let index = ordered.length - 1; index >= 0 && isIndependent(ordered[index]); index -= 1) {
    independentStreak += 1;
  }
  if (independentStreak >= 3) {
    suggestions.push(result({
      kind: "reduce_prompt",
      message: "Consider gradually reducing one prompt while keeping other helpful support; review the next attempt before changing further.",
      evidence: `${independentStreak} consecutive recorded attempts were completed independently`,
    }));
    suggestions.push(result({
      kind: "next_step",
      message: "Consider offering one small next step, while checking the child's interest and readiness.",
      evidence: `${independentStreak} consecutive recorded attempts were completed independently; this is progress evidence, not proof of mastery`,
    }));
  }

  return suggestions.length ? suggestions : [result({
    kind: "keep_current",
    message: "The recorded attempts do not yet suggest a change. Keep the current approach and review again later.",
    evidence: `${ordered.length} interpretable attempts reviewed; no mastery is inferred`,
  })];
}

export function deriveAdaptationSuggestions(events: AdaptationEvent[]): AdaptationSuggestion[] {
  const groups = new Map<string, AdaptationEvent[]>();
  for (const event of events) {
    const key = event.stepId ?? "";
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.entries()].flatMap(([stepId, groupedEvents]) =>
    deriveForStep(groupedEvents, stepId || undefined),
  );
}
