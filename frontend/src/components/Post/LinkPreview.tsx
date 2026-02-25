import { useState, useEffect } from 'react';

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface LinkPreviewProps {
  url: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const previewCache = new Map<string, LinkPreviewData | null>();

export function LinkPreview({ url }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setImageError(false);

    async function fetchPreview() {
      if (previewCache.has(url)) {
        const cached = previewCache.get(url);
        setPreview(cached ?? null);
        setLoading(false);
        if (!cached) setError(true);
        return;
      }

      try {
        const apiUrl = `${API_BASE_URL}/link-preview?url=${encodeURIComponent(url)}`;
        console.log('[LinkPreview] Fetching:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('[LinkPreview] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.status}`);
        }
        const data: LinkPreviewData = await response.json();
        console.log('[LinkPreview] Data:', data);

        if (!cancelled) {
          const hasContent = data.title || data.description || data.image;
          if (hasContent) {
            previewCache.set(url, data);
            setPreview(data);
          } else {
            console.log('[LinkPreview] No content in response');
            previewCache.set(url, null);
            setError(true);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[LinkPreview] Error:', err);
        if (!cancelled) {
          previewCache.set(url, null);
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchPreview();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-3 animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex gap-3">
          <div className="h-20 w-20 flex-shrink-0 rounded bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return null;
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:bg-gray-50"
      onClick={(e) => e.stopPropagation()}
    >
      {preview.image && !imageError && (
        <div className="relative h-40 w-full overflow-hidden bg-gray-100">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="h-4 w-4"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span>{preview.siteName || new URL(preview.url).hostname}</span>
        </div>
        {preview.title && (
          <h4 className="mt-1 line-clamp-2 font-medium text-gray-900">
            {preview.title}
          </h4>
        )}
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
