import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DEFAULT_API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:5000';

/** Backend API path prefix for image files (e.g. logo, avatar). */
export const API_IMAGE_PATH = '/api/v1/image';

/**
 * Universal API file URL resolver.
 * Accepts whatever the backend returns (full URL, path, or filename) and returns a URL.
 *
 * @param {string} path - Value from API: full URL, path like /app/settings/logo/name.png, or filename
 * @param {Object} [options]
 * @param {string} [options.baseUrl] - API base URL (default: NEXT_PUBLIC_API_URL or localhost:5000)
 * @param {string} [options.pathPrefix] - API path before filename (e.g. '/api/v1/image/logo')
 * @param {boolean} [options.proxy] - If true, return same-origin proxy URL to avoid CORS (e.g. /api/image/logo/filename.png)
 * @returns {string} URL to the file (full backend URL or proxy path)
 *
 * @example
 * getApiFileUrl('/app/settings/logo/foo.png', { pathPrefix: '/api/v1/image/logo' })
 * // => 'http://localhost:5000/api/v1/image/logo/foo.png'
 * getApiFileUrl('foo.png', { pathPrefix: '/api/v1/image/logo', proxy: true })
 * // => '/api/image/logo/foo.png' (same-origin, no CORS)
 */
export function getApiFileUrl(path, options = {}) {
  if (!path) return '';
  const pathPrefix = (options.pathPrefix || '').replace(/\/$/, '');

  let filename = path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      filename = new URL(path).pathname;
    } catch {
      filename = path;
    }
  }
  filename = filename.split('/').filter(Boolean).pop() || filename;

  if (options.proxy && pathPrefix) {
    const segment = pathPrefix.replace(/^.*\/image\/?/, '') || 'file';
    return `/api/image/${segment}/${filename}`;
  }

  const baseUrl = options.baseUrl || DEFAULT_API_BASE;
  const apiOrigin = baseUrl.replace(/\/$/, '');
  return pathPrefix ? `${apiOrigin}${pathPrefix}/${filename}` : `${apiOrigin}/${filename}`;
}

/**
 * Resolve logo path to URL. By default returns same-origin proxy URL to avoid CORS.
 */
export function getLogoUrl(path, baseUrl, useProxy = true) {
  return getApiFileUrl(path, {
    baseUrl,
    pathPrefix: `${API_IMAGE_PATH}/logo`,
    proxy: useProxy,
  });
}

/**
 * Resolve uploaded image path to display URL.
 * Backend stores path from upload (e.g. "students/xyz.jpg"); images are served at GET /api/v1/image/<path>.
 * Use this for student.image and any upload/single response data.path.
 *
 * @param {string} path - Stored path from API (e.g. "students/xyz.jpg")
 * @param {string} [baseUrl] - API base (default NEXT_PUBLIC_API_URL)
 * @param {boolean} [useProxy] - If true, return same-origin proxy URL (default true)
 */
export function getUploadedImageUrl(path, baseUrl, useProxy = true) {
  if (!path) return '';
  const normalized = path.replace(/^\//, '');
  if (useProxy) {
    return `/api/image/${normalized}`;
  }
  const base = (baseUrl || DEFAULT_API_BASE).replace(/\/$/, '');
  const imageBase = base.endsWith('/api/v1') ? `${base}/image` : `${base}/api/v1/image`;
  return `${imageBase}/${normalized}`;
}

/**
 * Resolve student image path to URL (alias for getUploadedImageUrl; student.image is upload path).
 */
export function getStudentPhotoUrl(path, baseUrl, useProxy = true) {
  return getUploadedImageUrl(path, baseUrl, useProxy);
}

/**
 * Resolve staff image path to URL (alias for getUploadedImageUrl; staff.image is upload path).
 */
export function getStaffPhotoUrl(path, baseUrl, useProxy = true) {
  return getUploadedImageUrl(path, baseUrl, useProxy);
}
