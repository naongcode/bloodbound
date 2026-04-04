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
