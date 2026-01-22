import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize URL to ensure it's a valid absolute path for fetch/audio/video elements
 * Handles relative paths, Windows file paths, and various URL formats
 * @param url The URL to normalize
 * @returns Normalized absolute URL path
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;
  
  const originalUrl = url;
  
  // Extract fragment if present (e.g., #t=0,11.7)
  let fragment = '';
  const fragmentIndex = url.indexOf('#');
  if (fragmentIndex !== -1) {
    fragment = url.substring(fragmentIndex);
    url = url.substring(0, fragmentIndex);
  }
  
  // Fix malformed URLs like "http://results/..." or "http://localhost:3000/resultsvideo..." (missing slashes)
  // Convert to "/results/..."
  if (url.startsWith('http://results/') || url.startsWith('https://results/')) {
    const normalized = url.replace(/^https?:\/\/results\//, '/results/') + fragment;
    console.log(`[normalizeUrl] Fixed http://results/...: ${originalUrl} -> ${normalized}`);
    return normalized;
  }
  
  // Fix URLs like "http://localhost:3000/resultsvideo..." (missing slash between results and video)
  // This happens when browser incorrectly interprets relative paths
  // Check for both patterns: with slash and without slash after domain
  if (url.includes('://') && url.match(/results(video|audio)/)) {
    // Pattern 1: http://localhost:3000/resultsvideo... (with slash before results)
    const match1 = url.match(/(https?:\/\/[^\/]+)\/results(video|audio)(.+)/);
    if (match1) {
      const [, , type, rest] = match1;
      const normalized = `/results/${type}${rest}` + fragment;
      console.log(`[normalizeUrl] Fixed resultsvideo/audio (with slash): ${originalUrl} -> ${normalized}`);
      return normalized;
    }
    // Pattern 2: http://localhost:3000resultsvideo... (no slash after domain)
    const match2 = url.match(/(https?:\/\/[^\/]+)results(video|audio)(.+)/);
    if (match2) {
      const [, , type, rest] = match2;
      const normalized = `/results/${type}${rest}` + fragment;
      console.log(`[normalizeUrl] Fixed resultsvideo/audio (no slash): ${originalUrl} -> ${normalized}`);
      return normalized;
    }
  }
  
  // Fix URLs that start with "results/" (relative path)
  // Convert to "/results/"
  if (url.startsWith('results/') && !url.startsWith('/results/')) {
    return '/' + url + fragment;
  }
  
  // Fix URLs that start with "resultsvideo" or "resultsaudio" (missing slashes)
  if (url.match(/^results(video|audio)/)) {
    const match = url.match(/^results(video|audio)(.+)/);
    if (match) {
      const [, type, rest] = match;
      const normalized = `/results/${type}${rest}` + fragment;
      console.log(`[normalizeUrl] Fixed resultsvideo/audio: ${originalUrl} -> ${normalized}`);
      return normalized;
    }
  }
  
  // Already absolute URLs (http, https, blob, data) - but only if valid
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if it's a valid absolute URL (has domain)
    // If it's just "http://results/..." it's malformed, handle above
    if (url.includes('://')) {
      const afterProtocol = url.split('://')[1];
      // If it doesn't have a domain (no dot or localhost), it's malformed
      if (afterProtocol && !afterProtocol.includes('.') && 
          !afterProtocol.startsWith('localhost') && 
          !afterProtocol.startsWith('127.0.0.1') &&
          !afterProtocol.startsWith('[')) { // IPv6 addresses
        // Extract path part and convert to absolute path
        const pathPart = afterProtocol.split('/').slice(1).join('/');
        return '/' + pathPart + fragment;
      }
    }
    return url + fragment;
  }
  
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url + fragment;
  }
  
  // Windows file path (C:\Users\... or \\server\...)
  if (url.match(/^[A-Za-z]:\\/) || url.startsWith('\\\\')) {
    // Windows file paths cannot be fetched directly in browser
    // This should not happen in normal flow, but handle gracefully
    console.warn('Windows file path detected, cannot fetch directly:', url);
    return url + fragment;
  }
  
  // Fix Windows path separators in web paths (e.g., /\results\audio\... -> /results/audio/...)
  // This can happen when Windows path.join() is used and not properly converted
  if (url.includes('\\') && (url.startsWith('/') || url.startsWith('http'))) {
    const normalized = url.replace(/\\/g, '/');
    console.log(`[normalizeUrl] Fixed Windows path separators: ${originalUrl} -> ${normalized}`);
    url = normalized;
  }
  
  // Already absolute web path (starts with /)
  if (url.startsWith('/')) {
    return url + fragment;
  }
  
  // Relative path - convert to absolute by adding leading /
  // e.g., "results/audio/file.mp3" -> "/results/audio/file.mp3"
  return '/' + url.replace(/^\/+/, '') + fragment; // Remove any existing leading slashes, then add one
}