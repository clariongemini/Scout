import axios from 'axios';
import * as cheerio from 'cheerio';
import { cacheManager } from '../storage/CacheManager';
import { dataLake } from '../storage/RawDataLake';
import crypto from 'crypto';

export interface FetchContext {
  provider: string;
  resourceType: string;
  sourceEntityId: string;
  ttlHours?: number;
  parserVersion?: string;
}

export interface SourceRawSnapshot {
  schemaVersion: string;
  recordType: string;
  snapshotId: string;
  provider: string;
  resourceType: string;
  sourceEntityId: string;
  requestedUrl: string;
  requestedUrlHash: string;
  httpStatus: number;
  retrievedAt: string;
  contentHash: string;
  contentType: 'html' | 'json';
  parserVersion: string;
  rawFilePath: string;
  metadata: {
    userAgent?: string;
    responseTime?: number;
    cacheStatus?: 'hit' | 'miss';
  };
}

export abstract class BaseAdapter {
  protected parserVersion: string = '1.0.0';

  protected async fetchHtml(url: string, context: FetchContext, headers?: any) {
    const cacheKey = crypto.createHash('sha256').update(url).digest('hex');
    const cachedContent = cacheManager.getCache(cacheKey);

    if (cachedContent) {
      console.log(`[Cache Hit] ${context.provider} - ${url}`);
      return cheerio.load(cachedContent);
    }

    try {
      console.log(`[Cache Miss] Fetching ${context.provider} - ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          ...headers
        },
        timeout: 10000
      });

      const content = response.data;
      const rawPath = dataLake.saveRawResponse(
        context.provider,
        context.resourceType,
        context.sourceEntityId,
        url,
        content,
        response.status,
        'html'
      );

      cacheManager.setCache(
        cacheKey,
        context.provider,
        context.resourceType,
        context.sourceEntityId,
        rawPath,
        context.ttlHours || 24
      );

      return cheerio.load(content);
    } catch (error: any) {
      console.error(`BaseAdapter Error fetching HTML from ${url}:`, error.message);
      return null;
    }
  }

  protected async fetchJson(url: string, context: FetchContext, headers?: any) {
    const cacheKey = crypto.createHash('sha256').update(url).digest('hex');
    const cachedContent = cacheManager.getCache(cacheKey);

    if (cachedContent) {
      console.log(`[Cache Hit] ${context.provider} - ${url}`);
      return JSON.parse(cachedContent);
    }

    try {
      console.log(`[Cache Miss] Fetching JSON ${context.provider} - ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ...headers
        },
        timeout: 10000
      });

      const contentStr = JSON.stringify(response.data);
      const rawPath = dataLake.saveRawResponse(
        context.provider,
        context.resourceType,
        context.sourceEntityId,
        url,
        contentStr,
        response.status,
        'json'
      );

      cacheManager.setCache(
        cacheKey,
        context.provider,
        context.resourceType,
        context.sourceEntityId,
        rawPath,
        context.ttlHours || 24
      );

      return response.data;
    } catch (error: any) {
      console.error(`BaseAdapter Error fetching JSON from ${url}:`, error.message);
      return null;
    }
  }

  /**
   * FSRS_v4 Standardı: Başarısız alanları null bırakır, tahmin etmez
   */
  protected nullIfEmpty(value: any): any {
    if (value === null || value === undefined || value === '' || value === '-') {
      return null;
    }
    return value;
  }

  /**
   * FSRS_v4 Standardı: 0 ve null ayrımı
   */
  protected zeroOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === '-') {
      return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
}
