import Phaser from 'phaser';

// Simple seeded random so the same chunk always produces the same house
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

const HOUSE_COLORS = [0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xd35400, 0x16a085];
const ROOF_COLORS = [0x7f1d12, 0x1a5276, 0x1e8449, 0x6c3483, 0xa04000, 0x0e6655];
const CHUNK_WIDTH = 350;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    this.roadY = height / 2;
    this.roadHeight = 80;

    // Track generated house chunks so we don't duplicate
    this.generatedChunks = new Set();
    this.houses = [];

    this.generateHouseTextures();
    this.drawRoad(width, this.roadY, this.roadHeight);
    this.drawCar(width, this.roadY, this.roadHeight);

    // Keyboard input — only right arrow
    this.cursors = this.input.keyboard.createCursorKeys();

    // Physics: drag slows the car when we stop pressing right
    this.car.body.setDragX(400);
    this.car.body.setMaxVelocity(300, 0);

    // Allow infinite movement to the right, but block going left past start
    this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, height);
    this.car.body.setCollideWorldBounds(true);

    // Camera follows the car horizontally, keeping it in the left third
    this.cameras.main.startFollow(this.car, false, 1, 0);
    this.cameras.main.setFollowOffset(-width / 3, 0);
  }

  update() {
    if (this.cursors.right.isDown) {
      this.car.body.setAccelerationX(500);
    } else {
      this.car.body.setAccelerationX(0);
    }

    // Prevent any leftward movement
    if (this.car.body.velocity.x < 0) {
      this.car.body.setVelocityX(0);
    }

    // Scroll the yellow dashes with the camera to create movement illusion
    this.dashes.tilePositionX = this.cameras.main.scrollX;

    this.spawnHouses();
    this.cleanupHouses();
  }

  generateHouseTextures() {
    const houseW = 70;
    const houseH = 55;
    const roofH = 25;
    const doorW = 14;
    const doorH = 22;
    const winW = 12;
    const winH = 12;

    for (let i = 0; i < HOUSE_COLORS.length; i++) {
      const gfx = this.add.graphics();

      // Roof — triangle
      gfx.fillStyle(ROOF_COLORS[i]);
      gfx.fillTriangle(
        houseW / 2,
        0, // peak
        -6,
        roofH, // left overhang
        houseW + 6,
        roofH, // right overhang
      );

      // Walls
      gfx.fillStyle(HOUSE_COLORS[i]);
      gfx.fillRect(0, roofH, houseW, houseH);

      // Door — dark brown, centered
      gfx.fillStyle(0x5d3a1a);
      gfx.fillRect((houseW - doorW) / 2, roofH + houseH - doorH, doorW, doorH);

      // Doorknob
      gfx.fillStyle(0xf1c40f);
      gfx.fillCircle((houseW - doorW) / 2 + doorW - 3, roofH + houseH - doorH / 2, 2);

      // Windows — two, on each side of the door
      gfx.fillStyle(0xa8d8ea);
      gfx.fillRect(8, roofH + 10, winW, winH);
      gfx.fillRect(houseW - 8 - winW, roofH + 10, winW, winH);

      // Window crosses
      gfx.lineStyle(1, 0x444444);
      gfx.lineBetween(8 + winW / 2, roofH + 10, 8 + winW / 2, roofH + 10 + winH);
      gfx.lineBetween(8, roofH + 10 + winH / 2, 8 + winW, roofH + 10 + winH / 2);
      gfx.lineBetween(
        houseW - 8 - winW / 2,
        roofH + 10,
        houseW - 8 - winW / 2,
        roofH + 10 + winH,
      );
      gfx.lineBetween(
        houseW - 8 - winW,
        roofH + 10 + winH / 2,
        houseW - 8,
        roofH + 10 + winH / 2,
      );

      gfx.generateTexture(`house_${i}`, houseW + 12, roofH + houseH);
      gfx.destroy();
    }
  }

  spawnHouses() {
    const cam = this.cameras.main;
    const startChunk = Math.floor(cam.scrollX / CHUNK_WIDTH);
    // Generate a couple chunks ahead of what's visible
    const endChunk = Math.floor((cam.scrollX + cam.width) / CHUNK_WIDTH) + 2;

    for (let chunk = startChunk; chunk <= endChunk; chunk++) {
      if (chunk < 0 || this.generatedChunks.has(chunk)) continue;
      this.generatedChunks.add(chunk);

      const rand = seededRandom(chunk * 7 + 1);
      const rand2 = seededRandom(chunk * 13 + 3);
      // Random x offset within the chunk for varied spacing
      const xOffset = seededRandom(chunk * 11 + 5) * (CHUNK_WIDTH - 100);
      const x = chunk * CHUNK_WIDTH + 50 + xOffset;

      const roadTop = this.roadY - this.roadHeight / 2;
      const roadBottom = this.roadY + this.roadHeight / 2;

      // ~60% chance of a house above the road — well clear of the road edge
      if (rand < 0.6) {
        const colorIdx = Math.floor(seededRandom(chunk * 17 + 7) * HOUSE_COLORS.length);
        const yOffset = seededRandom(chunk * 19 + 9) * 30;
        const house = this.add.image(x, roadTop - 24 - yOffset, `house_${colorIdx}`);
        house.setOrigin(0.5, 1);
        this.houses.push(house);
      }
    }
  }

  cleanupHouses() {
    const camLeft = this.cameras.main.scrollX - 400;
    this.houses = this.houses.filter((house) => {
      if (house.x < camLeft) {
        house.destroy();
        return false;
      }
      return true;
    });
  }

  drawRoad(width, roadY, roadHeight) {
    // Road surface — pinned to camera so it always fills the screen
    const road = this.add.graphics();
    road.fillStyle(0x3a3a3a);
    road.fillRect(0, roadY - roadHeight / 2, width, roadHeight);
    road.lineStyle(3, 0x000000);
    road.lineBetween(0, roadY - roadHeight / 2, width, roadY - roadHeight / 2);
    road.lineBetween(0, roadY + roadHeight / 2, width, roadY + roadHeight / 2);
    road.setScrollFactor(0);

    // Yellow dashes — create a tile texture so they repeat and scroll
    const dashLen = 30;
    const gapLen = 20;
    const tileW = dashLen + gapLen;
    const dashGfx = this.add.graphics();
    dashGfx.fillStyle(0xf5d442);
    dashGfx.fillRect(0, 0, dashLen, 3);
    dashGfx.generateTexture('dash', tileW, 3);
    dashGfx.destroy();

    this.dashes = this.add.tileSprite(0, roadY, width, 3, 'dash');
    this.dashes.setOrigin(0, 0.5);
    this.dashes.setScrollFactor(0);
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
    this.car = this.physics.add.sprite(width / 3, roadY - roadHeight / 4 - 2, 'car');
    this.car.setOrigin(0.5, 1);
  }
}
