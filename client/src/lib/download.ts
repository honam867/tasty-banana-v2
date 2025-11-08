export function triggerImageDownload(url: string, filename?: string) {
  if (!url) return;

  const params = new URLSearchParams({
    url,
  });

  if (filename) {
    params.append('filename', filename);
  }

  const link = document.createElement('a');
  link.href = `/api/download?${params.toString()}`;
  link.download = filename || 'image';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
