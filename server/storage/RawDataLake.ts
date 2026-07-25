import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface RawMetadata {
  provider: string;
  resource_type: string;
  source_entity_id: string;
  requested_url: string;
  requested_url_hash: string;
  http_status: number;
  fetched_at: string;
  content_hash: string;
  file_extension: string;
}

export class RawDataLake {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.raw-lake');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public saveRawResponse(
    provider: string,
    resourceType: string,
    sourceEntityId: string,
    url: string,
    content: string,
    httpStatus: number,
    fileExtension: string = 'html'
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlHash = crypto.createHash('sha256').update(url).digest('hex');
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    const entityDir = path.join(this.baseDir, provider, resourceType, sourceEntityId);
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }

    const filePrefix = timestamp;
    const contentPath = path.join(entityDir, `${filePrefix}.${fileExtension}`);
    const metadataPath = path.join(entityDir, `${filePrefix}.metadata.json`);

    fs.writeFileSync(contentPath, content, 'utf8');

    const metadata: RawMetadata = {
      provider,
      resource_type: resourceType,
      source_entity_id: sourceEntityId,
      requested_url: url,
      requested_url_hash: `sha256:${urlHash}`,
      http_status: httpStatus,
      fetched_at: new Date().toISOString(),
      content_hash: `sha256:${contentHash}`,
      file_extension: fileExtension
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    return contentPath;
  }
}

export const dataLake = new RawDataLake();
