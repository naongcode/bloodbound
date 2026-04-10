// Supabase 클라이언트 설정
// ⚠️ Supabase 대시보드 → Settings → API 에서 복사해 넣으세요
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:    true,   // localStorage에 세션 저장
    autoRefreshToken:  true,   // 만료 전 자동 갱신
    detectSessionInUrl: true,  // OAuth 리다이렉트 후 URL에서 세션 추출
  },
});
