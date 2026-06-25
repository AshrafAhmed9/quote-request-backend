const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  New: ["In Review", "Needs Info"],
  "In Review": ["Needs Info", "Completed"],
  "Needs Info": ["In Review"],
  Completed: [],
};

export function isValidTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getAllowedTransitions(from: string): string[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
