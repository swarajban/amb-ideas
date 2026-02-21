import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const roadY = height / 2;
    const roadHeight = 80;

    this.drawRoad(width, roadY, roadHeight);
    this.drawCar(width, roadY, roadHeight);
  }

  drawRoad(width, roadY, roadHeight) {
    const road = this.add.graphics();

    // Dark gray road surface
    road.fillStyle(0x3a3a3a);
    road.fillRect(0, roadY - roadHeight / 2, width, roadHeight);

    // Road edges — black lines top and bottom, like the drawing
    road.lineStyle(3, 0x000000);
    road.lineBetween(0, roadY - roadHeight / 2, width, roadY - roadHeight / 2);
    road.lineBetween(0, roadY + roadHeight / 2, width, roadY + roadHeight / 2);

    // Yellow dashed center line, just like in the drawing
    road.lineStyle(3, 0xf5d442);
    const dashLen = 30;
    const gapLen = 20;
    for (let x = 0; x < width; x += dashLen + gapLen) {
      road.lineBetween(x, roadY, Math.min(x + dashLen, width), roadY);
    }
  }

  drawCar(width, roadY, roadHeight) {
    const carW = 60;
    const carH = 30;
    const wheelR = 7;

    const gfx = this.add.graphics();

    // Car body — red rectangle
    gfx.fillStyle(0xdd3333);
    gfx.fillRoundedRect(0, 0, carW, carH, 6);

    // Cabin / roof — darker red, smaller rectangle on top
    gfx.fillStyle(0xbb2222);
    gfx.fillRoundedRect(12, -14, 30, 16, 4);

    // Window — light blue
    gfx.fillStyle(0xa8d8ea);
    gfx.fillRect(16, -11, 22, 10);

    // Wheels — black circles
    gfx.fillStyle(0x222222);
    gfx.fillCircle(12, carH, wheelR);
    gfx.fillCircle(carW - 12, carH, wheelR);

    // Hubcaps — gray
    gfx.fillStyle(0x888888);
    gfx.fillCircle(12, carH, 3);
    gfx.fillCircle(carW - 12, carH, 3);

    // Headlight — orange circle on right like the drawing's orange circle
    gfx.fillStyle(0xe8871e);
    gfx.fillCircle(carW - 2, 10, 5);

    // Bake into a texture so we can use it as a sprite
    gfx.generateTexture('car', carW + 4, carH + wheelR + 2);
    gfx.destroy();

    // Place car on road — sitting on top of center line
    this.car = this.physics.add.sprite(
      width / 2,
      roadY - roadHeight / 4 - 2,
      'car'
    );
    this.car.setOrigin(0.5, 1);
  }
}
