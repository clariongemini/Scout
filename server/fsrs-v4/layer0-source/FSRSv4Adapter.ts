import axios from 'axios';
import * as cheerio from 'cheerio';
import { cacheManager } from '../../storage/CacheManager';
import { dataLake } from '../../storage/RawDataLake';
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

export abstract class FSRSv4Adapter {
  protected parserVersion: string = '1.0.0';
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000;

  protected async fetchHtml(url: string, context: FetchContext, headers?: any): Promise<SourceRawSnapshot | null> {
    const cacheKey = crypto.createHash('sha256').update(url).digest('hex');
    const cachedContent = cacheManager.getCache(cacheKey);

    if (cachedContent) {
      console.log(`[Cache Hit] ${context.provider} - ${url}`);
      return this.createSnapshot(url, cachedContent, 200, context, 'html', 'hit');
    }

    try {
      console.log(`[Cache Miss] Fetching ${context.provider} - ${url}`);
      const startTime = Date.now();
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          ...headers
        },
        timeout: 10000
      });
      const responseTime = Date.now() - startTime;

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

      return this.createSnapshot(url, content, response.status, context, 'html', 'miss', responseTime);
    } catch (error: any) {
      console.error(`FSRSv4Adapter Error fetching HTML from ${url}:`, error.message);
      return null;
    }
  }

  protected async fetchJson(url: string, context: FetchContext, headers?: any): Promise<SourceRawSnapshot | null> {
    const cacheKey = crypto.createHash('sha256').update(url).digest('hex');
    const cachedContent = cacheManager.getCache(cacheKey);

    if (cachedContent) {
      console.log(`[Cache Hit] ${context.provider} - ${url}`);
      return this.createSnapshot(url, cachedContent, 200, context, 'json', 'hit');
    }

    try {
      console.log(`[Cache Miss] Fetching JSON ${context.provider} - ${url}`);
      const startTime = Date.now();
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ...headers
        },
        timeout: 10000
      });
      const responseTime = Date.now() - startTime;

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

      return this.createSnapshot(url, contentStr, response.status, context, 'json', 'miss', responseTime);
    } catch (error: any) {
      console.error(`FSRSv4Adapter Error fetching JSON from ${url}:`, error.message);
      return null;
    }
  }

  private createSnapshot(
    url: string,
    content: string,
    httpStatus: number,
    context: FetchContext,
    contentType: 'html' | 'json',
    cacheStatus: 'hit' | 'miss',
    responseTime?: number
  ): SourceRawSnapshot {
    const urlHash = crypto.createHash('sha256').update(url).digest('hex');
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const snapshotId = crypto.createHash('sha256').update(`${context.provider}-${context.sourceEntityId}-${Date.now()}`).digest('hex').substring(0, 16);

    return {
      schemaVersion: '4.0.0',
      recordType: 'source_raw_snapshot',
      snapshotId,
      provider: context.provider,
      resourceType: context.resourceType,
      sourceEntityId: context.sourceEntityId,
      requestedUrl: url,
      requestedUrlHash: `sha256:${urlHash}`,
      httpStatus,
      retrievedAt: new Date().toISOString(),
      contentHash: `sha256:${contentHash}`,
      contentType,
      parserVersion: context.parserVersion || this.parserVersion,
      rawFilePath: '', // Will be filled by dataLake
      metadata: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        responseTime,
        cacheStatus
      }
    };
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
