// 기존 base64(data URL) 다이어리 사진을 Supabase Storage로 이전하는 백필 스크립트.
//
// 선행 조건: 20260728120000_feeding_log_photo_storage.sql 마이그레이션 적용.
// 실행: SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 를 .env 또는 환경변수로 준 뒤
//   node scripts/backfill-feeding-log-photos.mjs           # 실제 이전
//   node scripts/backfill-feeding-log-photos.mjs --dry-run # 대상 개수만 확인
//
// 동작: pet_feeding_logs.image_url 이 'data:image/...' 인 행의 id 스냅샷을 먼저
//   수집한 뒤, 행마다 <user_id>/backfill-<log_id>.<ext> 경로로 업로드하고
//   image_url을 공개 URL로 교체한다. 실패/형식불가 행은 건너뛰고 요약을
//   출력한다. 이미 이전된 행은 다시 조회되지 않으므로 재실행해도 안전하다.

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'feeding-log-photos';
const PAGE = 1000;

if (!url || !serviceKey) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. (.env 참고)');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const extMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  const ext = extMap[mime];
  if (!ext) return null; // 버킷 allowed_mime_types 밖 형식은 수동 정리 대상으로 남긴다
  return { mime, ext, buffer: Buffer.from(match[2], 'base64') };
}

// 1) 대상 id 스냅샷 수집 (본문 제외 — payload 최소화)
const targetIds = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from('pet_feeding_logs')
    .select('id')
    .like('image_url', 'data:image/%')
    .order('id', { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error('대상 조회 실패:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;
  targetIds.push(...data.map((r) => r.id));
  if (data.length < PAGE) break;
}

console.log(`이전 대상: ${targetIds.length}건`);
if (DRY_RUN || targetIds.length === 0) process.exit(0);

// 2) 행 단위 이전
let migrated = 0;
let skipped = 0;
let failed = 0;

for (const id of targetIds) {
  const { data: row, error } = await supabase
    .from('pet_feeding_logs')
    .select('id, user_id, image_url')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) {
    console.error(`행 조회 실패 log=${id}:`, error?.message ?? 'not found');
    failed += 1;
    continue;
  }

  const parsed = parseDataUrl(row.image_url ?? '');
  if (!parsed) {
    console.warn(`건너뜀(형식 불가) log=${id}`);
    skipped += 1;
    continue;
  }

  const path = `${row.user_id}/backfill-${row.id}.${parsed.ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, parsed.buffer, { contentType: parsed.mime, upsert: true, cacheControl: '31536000' });
  if (upErr) {
    console.error(`업로드 실패 log=${id}:`, upErr.message);
    failed += 1;
    continue;
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error: updErr } = await supabase
    .from('pet_feeding_logs')
    .update({ image_url: pub.publicUrl })
    .eq('id', id);
  if (updErr) {
    console.error(`URL 갱신 실패 log=${id}:`, updErr.message);
    failed += 1;
    continue;
  }

  migrated += 1;
  console.log(`이전 완료 log=${id} → ${path}`);
}

console.log(`완료: 이전 ${migrated}건, 건너뜀 ${skipped}건, 실패 ${failed}건`);
