export function getInitials(name: string, lastName: string) {
  const n = name?.trim().split(' ')[0] || '';
  const l = lastName?.trim().split(' ')[0] || '';
  return (n[0] || '').toUpperCase() + (l[0] || '').toUpperCase();
}

export function humanizeDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}
