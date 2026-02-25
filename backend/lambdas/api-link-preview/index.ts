import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

function corsResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle) return ogTitle;

  const twitterTitle = extractMetaContent(html, 'twitter:title');
  if (twitterTitle) return twitterTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }

  return null;
}

function extractDescription(html: string): string | null {
  const ogDesc = extractMetaContent(html, 'og:description');
  if (ogDesc) return ogDesc;

  const twitterDesc = extractMetaContent(html, 'twitter:description');
  if (twitterDesc) return twitterDesc;

  const metaDesc = extractMetaContent(html, 'description');
  if (metaDesc) return metaDesc;

  return null;
}

function extractImage(html: string, baseUrl: string): string | null {
  const ogImage = extractMetaContent(html, 'og:image');
  if (ogImage) return resolveUrl(ogImage, baseUrl);

  const twitterImage = extractMetaContent(html, 'twitter:image');
  if (twitterImage) return resolveUrl(twitterImage, baseUrl);

  return null;
}

function extractSiteName(html: string, baseUrl: string): string | null {
  const ogSiteName = extractMetaContent(html, 'og:site_name');
  if (ogSiteName) return ogSiteName;

  try {
    const url = new URL(baseUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const iconPatterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of iconPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveUrl(match[1], baseUrl);
    }
  }

  try {
    const url = new URL(baseUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return corsResponse(400, { error: 'Missing url parameter' });
  }

  try {
    new URL(url);
  } catch {
    return corsResponse(400, { error: 'Invalid URL' });
  }

  console.log('Fetching link preview for:', url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentSocial/1.0; +https://example.com/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('Fetch failed with status:', response.status);
      return corsResponse(200, {
        url,
        title: null,
        description: null,
        image: null,
        siteName: null,
        favicon: null,
      } as LinkPreviewData);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      console.log('Non-HTML content type:', contentType);
      return corsResponse(200, {
        url,
        title: null,
        description: null,
        image: null,
        siteName: null,
        favicon: null,
      } as LinkPreviewData);
    }

    const html = await response.text();
    const finalUrl = response.url;

    const preview: LinkPreviewData = {
      url: finalUrl,
      title: extractTitle(html),
      description: extractDescription(html),
      image: extractImage(html, finalUrl),
      siteName: extractSiteName(html, finalUrl),
      favicon: extractFavicon(html, finalUrl),
    };

    if (preview.description && preview.description.length > 200) {
      preview.description = preview.description.slice(0, 200) + '...';
    }

    console.log('Preview extracted:', preview.title);

    return corsResponse(200, preview);
  } catch (err) {
    console.error('Error fetching link preview:', err);
    return corsResponse(200, {
      url,
      title: null,
      description: null,
      image: null,
      siteName: null,
      favicon: null,
    } as LinkPreviewData);
  }
};
