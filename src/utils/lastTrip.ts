// Remembers the trip this browser looked at last, so reopening the app lands there.
const KEY = 'lastTripId';

export function getLastTripId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastTripId(tripId: string) {
  try {
    localStorage.setItem(KEY, tripId);
  } catch {
    // Storage can be unavailable (private mode); nothing to do.
  }
}
