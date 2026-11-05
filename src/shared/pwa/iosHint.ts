/**
 * "Add to Home Screen" hint dismissed on iOS: a browser UI flag, not save data (it is not part
 * of the profile and is never synced), so it stays a raw `localStorage` key, in this file only.
 */
const IOS_HINT_KEY = 'cb-ios-hint-seen';

export function readIosHintSeen(): boolean {
  try {
    return localStorage.getItem(IOS_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIosHintSeen(): void {
  try {
    localStorage.setItem(IOS_HINT_KEY, '1');
  } catch {
    // storage unavailable — the hint just reappears next visit.
  }
}
