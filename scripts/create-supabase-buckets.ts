// scripts/create-supabase-buckets.ts

/**
 * Run this script (node) to ensure all required Supabase Storage buckets exist.
 * It uses the Supabase REST admin endpoint with the service role key.
 *
 * Usage: `ts-node scripts/create-supabase-buckets.ts`
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

interface BucketConfig {
  name: string;
  public: boolean;
}

const buckets: BucketConfig[] = [
  { name: 'public-documents', public: true },
  { name: 'private-documents', public: false },
  { name: 'avatars', public: true },
  { name: 'thumbnails', public: true },
  { name: 'ocr-temp', public: false },
  { name: 'ai-chat-attachments', public: false },
  { name: 'reports', public: false },
  { name: 'moderation', public: false },
  { name: 'ai-system', public: false },
  { name: 'cdn-cache', public: true },
];

async function createBucket(bucket: BucketConfig) {
  const url = `${SUPABASE_URL}/storage/v1/bucket`;
  const body = {
    id: bucket.name,
    public: bucket.public,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log(`✅ Bucket "${bucket.name}" created (public=${bucket.public})`);
  } else if (res.status === 400) {
    const data = await res.json();
    if (data?.message?.includes('already exists')) {
      console.log(`⚠️ Bucket "${bucket.name}" already exists.`);
    } else {
      console.error(`❌ Failed to create bucket ${bucket.name}:`, data);
    }
  } else {
    console.error(`❌ Unexpected error creating bucket ${bucket.name}:`, await res.text());
  }
}

(async () => {
  for (const bucket of buckets) {
    await createBucket(bucket);
  }
  console.log('Bucket creation script finished.');
})();
