// AuthScene — Google 로그인 화면 (게임 첫 진입점)
import AuthManager from '../systems/AuthManager.js';

const W = 1280, H = 720;

export default class AuthScene extends Phaser.Scene {
  constructor() { super('AuthScene'); }

  create() {
    this._checking = true;

    // 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a18);
    this._drawStars();

    // 타이틀
    this.add.text(W / 2, H / 2 - 180, 'Bloodbound Realm', {
      fontSize: '52px', fill: '#e74c3c', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 - 118, '혈맹의 땅에 오신 것을 환영합니다', {
      fontSize: '16px', fill: '#888',
    }).setOrigin(0.5);

    // 로딩 텍스트 (세션 확인 중)
    this._statusText = this.add.text(W / 2, H / 2, '세션 확인 중...', {
      fontSize: '15px', fill: '#555',
    }).setOrigin(0.5);

    // Google 로그인 버튼 (초기엔 숨김)
    this._loginBtn = this.add.rectangle(W / 2, H / 2 + 60, 320, 52, 0x1a1a1a)
      .setStrokeStyle(2, 0xdd4b39).setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.add.text(W / 2 - 130, H / 2 + 60, 'G', {
      fontSize: '24px', fill: '#dd4b39', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setVisible(false);

    this._loginTxt = this.add.text(W / 2 + 10, H / 2 + 60, 'Google로 로그인', {
      fontSize: '16px', fill: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    this._loginBtn.on('pointerover', () => this._loginBtn.setFillStyle(0x2a2a2a));
    this._loginBtn.on('pointerout',  () => this._loginBtn.setFillStyle(0x1a1a1a));
    this._loginBtn.on('pointerdown', () => this._startGoogleLogin());

    // 하단 안내
    this._hintText = this.add.text(W / 2, H - 40, '', {
      fontSize: '12px', fill: '#444',
    }).setOrigin(0.5);

    // ── 인증 상태 감지 (OAuth 리다이렉트 복귀 포함) ──────
    AuthManager.onAuthChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this._onLoggedIn();
      }
    });

    // 기존 세션 확인
    this._checkSession();

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  async _checkSession() {
    // 5초 타임아웃 — Supabase 프로젝트 일시정지/네트워크 오류 대비
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );

    try {
      const session = await Promise.race([AuthManager.getSession(), timeout]);
      this._checking = false;
      if (session) {
        this._onLoggedIn();
      } else {
        this._showLoginUI();
      }
    } catch (err) {
      console.warn('[AuthScene] 세션 확인 실패:', err.message);
      this._checking = false;
      this._showLoginUI();
    }
  }

  _showLoginUI() {
    this._statusText.setText('');
    this._loginBtn.setVisible(true);
    this._loginTxt.setVisible(true);

    // G 아이콘 텍스트
    this.children.list
      .filter(c => c.type === 'Text' && c.text === 'G')
      .forEach(c => c.setVisible(true));

    this._hintText.setText('계정 정보가 Supabase에 안전하게 저장됩니다');
  }

  async _startGoogleLogin() {
    this._loginBtn.disableInteractive();
    this._loginTxt.setText('로그인 중...');
    this._statusText.setText('Google 인증 페이지로 이동합니다...');
    await AuthManager.signInWithGoogle();
    // 이후 페이지 리다이렉트 발생 → 복귀 시 onAuthChange가 처리
  }

  _onLoggedIn() {
    if (this._transitioning) return;
    this._transitioning = true;

    const name    = AuthManager.getUserName();
    const jobKey  = AuthManager.getJobKey();
    const hasSave = AuthManager.hasSaveData();

    this._statusText.setText(`환영합니다, ${name}!`).setStyle({ fill: '#2ecc71' });
    this._loginBtn.setVisible(false);
    this._loginTxt.setVisible(false);

    this.time.delayedCall(800, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (hasSave) {
          // 저장 데이터 있으면 바로 게임으로
          this.scene.start('BootScene', { fromAuth: true, jobKey });
        } else {
          // 신규 유저 → 직업 선택
          this.scene.start('BootScene', { fromAuth: true, newUser: true });
        }
      });
    });
  }

  _drawStars() {
    for (let i = 0; i < 120; i++) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, Math.random() * 0.25 + 0.03);
      g.fillCircle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Math.random() * 1.4 + 0.3,
      );
    }
  }
}
