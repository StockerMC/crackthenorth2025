// Utility functions for managing channelId storage

export function getStoredChannelId(): string | null {
  // Try localStorage first (client-side)
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('youtube_channel_id');
    if (fromStorage) return fromStorage;
  }
  
  // Fallback to cookie (works server-side too)
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'youtube_channel_id') {
        return decodeURIComponent(value);
      }
    }
  }
  
  return null;
}

export function clearStoredChannelId(): void {
  // Clear from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('youtube_channel_id');
  }
  
  // Clear from cookies
  if (typeof document !== 'undefined') {
    document.cookie = 'youtube_channel_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  }
}

// Server-side cookie parsing for NextAuth callbacks
export function getChannelIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'youtube_channel_id') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}