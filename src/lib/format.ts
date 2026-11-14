export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(meters >= 100000 ? 0 : 1)} km`;
}
