import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 20, 'Get To The Treasure', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 30, 'Game loading...', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff8e0',
    }).setOrigin(0.5);
  }
}
