// AuthManager — Supabase Auth 싱글턴
import { supabase } from './supabase.js';

class AuthManager {
  constructor() {
    this.user    = null;  // supabase auth user 객체
    this.profile = null;  // profiles 테이블 행
  }

  // ── 세션 확인 (앱 시작 시 호출) ───────────────────
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth] getSession 오류:', error.message);
      return null;
    }
    if (session?.user) {
      this.user = session.user;
      try { await this._loadProfile(); } catch (e) {
        console.warn('[Auth] 프로필 로드 실패:', e.message);
      }
    }
    return session;
  }

  // ── Google OAuth 로그인 ───────────────────────────
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('[Auth] Google 로그인 실패:', error.message);
  }

  // ── 로그아웃 ──────────────────────────────────────
  async signOut() {
    await supabase.auth.signOut();
    this.user    = null;
    this.profile = null;
  }

  // ── 인증 상태 변경 리스너 ─────────────────────────
  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        this.user = session.user;
        if (event === 'SIGNED_IN') {
          await this._loadProfile();
        }
      } else if (event === 'SIGNED_OUT') {
        this.user    = null;
        this.profile = null;
      }
      callback(event, session);
    });
  }

  // ── 프로필 로드 ───────────────────────────────────
  async _loadProfile() {
    if (!this.user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.user.id)
      .single();
    this.profile = data;
    return data;
  }

  // ── 세이브 데이터 저장 ────────────────────────────
  async saveGameData(saveData, jobKey, name) {
    if (!this.user) return false;
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id:        this.user.id,
        name:      name ?? this.profile?.name,
        job_key:   jobKey,
        save_data: saveData,
      });
    if (error) { console.warn('[Auth] 저장 실패:', error.message); return false; }
    if (this.profile) {
      this.profile.save_data = saveData;
      this.profile.job_key   = jobKey;
    }
    return true;
  }

  // ── 세이브 데이터 로드 ────────────────────────────
  async loadGameData() {
    const profile = await this._loadProfile();
    return profile?.save_data ?? null;
  }

  // ── 닉네임 업데이트 ───────────────────────────────
  async updateName(name) {
    if (!this.user) return;
    await supabase.from('profiles').update({ name }).eq('id', this.user.id);
    if (this.profile) this.profile.name = name;
  }

  // ── 헬퍼 ──────────────────────────────────────────
  isLoggedIn()   { return !!this.user; }
  getUserName()  { return this.profile?.name ?? this.user?.user_metadata?.full_name ?? ''; }
  getJobKey()    { return this.profile?.job_key ?? 'warrior'; }
  hasSaveData()  { return !!(this.profile?.save_data && Object.keys(this.profile.save_data).length); }
}

export default new AuthManager();
