// Centralized notification helper for farm data changes
export function notifyFarmChange() {
  try {
    // Keep the event name consistent with existing code
    window.dispatchEvent(new Event('farmDataChanged'));
  } catch (e) {
    // Fallback: log but don't throw
    // eslint-disable-next-line no-console
    console.warn('notifyFarmChange failed', e);
  }
}
