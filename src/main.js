import Phaser from 'phaser';
import AuthScene from './scenes/AuthScene.js';
import BootScene from './scenes/BootScene.js';
import JobSelectScene from './scenes/JobSelectScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import WaitingScene from './scenes/WaitingScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import DungeonScene from './scenes/DungeonScene.js';
import GuildScene from './scenes/GuildScene.js';

// ── 한글 텍스트 상단 클리핑 전역 패치 ───────────────────────────
// Phaser 3는 라틴 문자 기준으로 텍스트 높이를 측정해서
// 한글(상단 획이 높음)이 잘려 보임. factory를 래핑해 패딩을 강제 적용.
const _origAddText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  const s = style ? { ...style } : {};
  if (!s.padding) {
    s.padding = { top: 6, bottom: 2 };
  } else if (typeof s.padding === 'number') {
    s.padding = { left: s.padding, right: s.padding, top: Math.max(s.padding, 6), bottom: s.padding };
  } else {
    s.padding = { ...s.padding };
    if (s.padding.top === undefined && s.padding.y === undefined) s.padding.top = 6;
    if (s.padding.bottom === undefined && s.padding.y === undefined) s.padding.bottom = 2;
  }
  return _origAddText.call(this, x, y, text, s);
};

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  dom: { createContainer: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [AuthScene, BootScene, JobSelectScene, LobbyScene, WaitingScene, GameScene, UIScene, DungeonScene, GuildScene]
};

new Phaser.Game(config);

// 우클릭 컨텍스트 메뉴 비활성화
window.addEventListener('contextmenu', e => e.preventDefault());
