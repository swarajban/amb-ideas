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
const CHUNK_WIDTH = 500;
const HOUSE_TEX_W = 82;
const HOUSE_TEX_H = 80;
const CAR_W = 60;
const CHEST_W = 30;
const CHEST_H = 28;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    this.roadY = height / 2;
    this.roadHeight = 80;

    // Track generated chunks so we don't duplicate
    this.generatedChunks = new Set();
    this.generatedTreasureChunks = new Set();
    this.houses = [];
    this.treasures = [];
    this.treasureCount = 0;

    // House interaction state
    this.insideHouse = null;
    this.isAnimating = false;
    this.nearbyHouse = null;

    this.generateHouseTextures();
    this.createTreasureTextures();
    this.drawRoad(width, this.roadY, this.roadHeight);
    this.drawCar(width, this.roadY, this.roadHeight);
    this.createIndicators();
    this.createHUD(width);

    // Keyboard input
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

    this.setupWeather(width, height);
  }

  // ─── Treasure Chest Textures ───────────────────────────────────

  createTreasureTextures() {
    const gfx = this.add.graphics();
    const w = CHEST_W;
    const h = CHEST_H;

    // Soft golden ground glow
    gfx.fillStyle(0xffd700, 0.12);
    gfx.fillEllipse(w / 2, h - 2, w + 10, 8);

    // Chest body — rich wood brown
    gfx.fillStyle(0x8b4513);
    gfx.fillRoundedRect(2, h * 0.45, w - 4, h * 0.52, 3);

    // Wood grain lines on body
    gfx.lineStyle(1, 0x6b3410, 0.4);
    gfx.lineBetween(5, h * 0.6, w - 5, h * 0.6);
    gfx.lineBetween(5, h * 0.75, w - 5, h * 0.75);

    // Chest lid — darker, slightly wider
    gfx.fillStyle(0x6b3410);
    gfx.fillRoundedRect(1, 4, w - 2, h * 0.45, { tl: 5, tr: 5, bl: 0, br: 0 });

    // Gold trim band at junction
    gfx.fillStyle(0xdaa520);
    gfx.fillRect(1, h * 0.42, w - 2, 4);

    // Gold rim on lid top
    gfx.fillStyle(0xdaa520, 0.7);
    gfx.fillRect(1, 4, w - 2, 2);

    // Gold vertical straps
    gfx.fillStyle(0xdaa520, 0.5);
    gfx.fillRect(5, 4, 2, h * 0.9);
    gfx.fillRect(w - 7, 4, 2, h * 0.9);

    // Gold clasp in center
    gfx.fillStyle(0xffd700);
    gfx.fillRoundedRect(w / 2 - 4, h * 0.35, 8, 10, 2);

    // Keyhole
    gfx.fillStyle(0x2a1a00);
    gfx.fillCircle(w / 2, h * 0.42, 2);
    gfx.fillRect(w / 2 - 1, h * 0.42, 2, 4);

    // Golden glow peeking from lid crack
    gfx.fillStyle(0xffe44d, 0.8);
    gfx.fillRect(4, h * 0.43, w - 8, 2);

    gfx.generateTexture('chest', w + 12, h + 4);
    gfx.destroy();

    // Sparkle particle for collection burst
    const sparkGfx = this.add.graphics();
    sparkGfx.fillStyle(0xffd700);
    sparkGfx.fillCircle(3, 3, 3);
    sparkGfx.fillStyle(0xfffacd, 0.9);
    sparkGfx.fillCircle(3, 3, 1.5);
    sparkGfx.generateTexture('sparkle', 6, 6);
    sparkGfx.destroy();

    // Larger star for the idle shimmer
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xffffff, 0.9);
    starGfx.fillCircle(2, 2, 2);
    starGfx.generateTexture('star_tiny', 4, 4);
    starGfx.destroy();
  }

  // ─── HUD ──────────────────────────────────────────────────────

  createHUD(width) {
    // Background pill
    this.hudBg = this.add.graphics();
    this.hudBg.fillStyle(0x000000, 0.4);
    this.hudBg.fillRoundedRect(0, 0, 72, 32, 8);
    this.hudBg.setScrollFactor(0);
    this.hudBg.setPosition(width - 92, 10);
    this.hudBg.setDepth(20);

    // Small chest icon
    this.hudIcon = this.add.image(width - 70, 27, 'chest');
    this.hudIcon.setScale(0.55);
    this.hudIcon.setScrollFactor(0);
    this.hudIcon.setDepth(20);

    // Count text
    this.hudText = this.add.text(width - 60, 16, '×0', {
      fontSize: '16px',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#2a1a00',
      strokeThickness: 3,
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(20);
  }

  updateHUD() {
    this.hudText.setText(`×${this.treasureCount}`);

    // Satisfying punch scale on the icon and text
    this.tweens.add({
      targets: [this.hudIcon, this.hudText],
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.hudIcon.setScale(0.55);
        this.hudText.setScale(1);
      },
    });
  }

  // ─── Treasure Spawning & Collection ────────────────────────────

  spawnTreasures() {
    const cam = this.cameras.main;
    const startChunk = Math.floor(cam.scrollX / CHUNK_WIDTH);
    const endChunk = Math.floor((cam.scrollX + cam.width) / CHUNK_WIDTH) + 2;

    for (let chunk = startChunk; chunk <= endChunk; chunk++) {
      if (chunk < 1 || this.generatedTreasureChunks.has(chunk)) continue;
      this.generatedTreasureChunks.add(chunk);

      // ~12% of chunks get a treasure — rare enough to feel rewarding
      const rand = seededRandom(chunk * 37 + 41);
      if (rand > 0.12) continue;

      const xOffset = seededRandom(chunk * 43 + 47) * (CHUNK_WIDTH - 60);
      const x = chunk * CHUNK_WIDTH + 30 + xOffset;
      const baseY = this.roadY - this.roadHeight / 4 - 6;

      const chest = this.add.image(x, baseY, 'chest');
      chest.setOrigin(0.5, 1);
      chest.setData('baseY', baseY);
      chest.setData('phase', seededRandom(chunk * 53 + 59) * Math.PI * 2);
      this.treasures.push(chest);
    }
  }

  animateTreasures() {
    const now = this.time.now;
    for (const chest of this.treasures) {
      // Gentle bob
      const phase = chest.getData('phase');
      chest.y = chest.getData('baseY') + Math.sin(now / 400 + phase) * 3;

      // Subtle golden shimmer via tint oscillation
      const shimmer = Math.sin(now / 600 + phase) * 0.5 + 0.5;
      const r = 0xff;
      const g = Math.floor(0xd7 + shimmer * 0x28);
      const b = Math.floor(shimmer * 0x40);
      chest.setTint(Phaser.Display.Color.GetColor(r, g, b));
    }
  }

  checkTreasureCollection() {
    if (this.insideHouse || this.isAnimating) return;

    const carLeft = this.car.x - CAR_W / 2;
    const carRight = this.car.x + CAR_W / 2;

    for (let i = this.treasures.length - 1; i >= 0; i--) {
      const chest = this.treasures[i];
      const cLeft = chest.x - CHEST_W / 2;
      const cRight = chest.x + CHEST_W / 2;

      if (carRight > cLeft && carLeft < cRight) {
        this.treasures.splice(i, 1);
        this.collectTreasure(chest);
      }
    }
  }

  collectTreasure(chest) {
    this.treasureCount++;
    this.updateHUD();

    const cx = chest.x;
    const cy = chest.y - CHEST_H / 2;

    // Flash the chest white and scale up before vanishing
    this.tweens.add({
      targets: chest,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onStart: () => chest.setTint(0xffffff),
      onComplete: () => chest.destroy(),
    });

    // Golden sparkle burst
    const burst = this.add.particles(cx, cy, 'sparkle', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      quantity: 20,
      emitting: false,
    });
    burst.explode();
    this.time.delayedCall(800, () => burst.destroy());

    // Upward star rise — a few stars float upward
    const stars = this.add.particles(cx, cy, 'star_tiny', {
      speed: { min: 30, max: 80 },
      angle: { min: 240, max: 300 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 1000,
      quantity: 6,
      emitting: false,
    });
    stars.explode();
    this.time.delayedCall(1100, () => stars.destroy());
  }

  cleanupTreasures() {
    const camLeft = this.cameras.main.scrollX - 400;
    this.treasures = this.treasures.filter((chest) => {
      if (chest.x < camLeft) {
        chest.destroy();
        return false;
      }
      return true;
    });
  }

  // ─── House Indicators ─────────────────────────────────────────

  createIndicators() {
    // Up arrow — shows when car can enter a house
    const upGfx = this.add.graphics();
    upGfx.fillStyle(0xf5d442);
    upGfx.fillTriangle(8, 0, 0, 10, 16, 10);
    upGfx.generateTexture('arrow_up', 16, 10);
    upGfx.destroy();

    this.enterIndicator = this.add.image(0, 0, 'arrow_up');
    this.enterIndicator.setVisible(false);
    this.enterIndicator.setDepth(10);

    // Down arrow — shows when car can exit a house
    const downGfx = this.add.graphics();
    downGfx.fillStyle(0xf5d442);
    downGfx.fillTriangle(8, 10, 0, 0, 16, 0);
    downGfx.generateTexture('arrow_down', 16, 10);
    downGfx.destroy();

    this.exitIndicator = this.add.image(0, 0, 'arrow_down');
    this.exitIndicator.setVisible(false);
    this.exitIndicator.setDepth(10);
  }

  // ─── House Entry/Exit ─────────────────────────────────────────

  findNearbyHouse() {
    const carLeft = this.car.x - CAR_W / 2;
    const carRight = this.car.x + CAR_W / 2;

    for (const house of this.houses) {
      const hLeft = house.x - HOUSE_TEX_W / 2;
      const hRight = house.x + HOUSE_TEX_W / 2;
      if (carRight > hLeft && carLeft < hRight) {
        return house;
      }
    }
    return null;
  }

  enterHouse(house) {
    this.isAnimating = true;
    this.enterIndicator.setVisible(false);
    this.nearbyHouse = null;

    // Stop car completely
    this.car.body.setVelocity(0, 0);
    this.car.body.setAcceleration(0, 0);
    this.car.body.enable = false;

    // Remember road position for exit
    this.carRoadX = this.car.x;
    this.carRoadY = this.car.y;

    // Animate car shrinking up into the house
    this.tweens.add({
      targets: this.car,
      x: house.x,
      y: house.y - HOUSE_TEX_H * 0.45,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.car.setVisible(false);
        this.insideHouse = house;
        this.isAnimating = false;

        // Warm glow on house — tinted windows
        house.setTint(0xffdd88);

        // Show exit indicator
        this.exitIndicator.setVisible(true);
      },
    });
  }

  exitHouse() {
    const house = this.insideHouse;
    this.isAnimating = true;
    this.exitIndicator.setVisible(false);

    // Remove warm glow
    house.clearTint();

    // Position car at house center, tiny and invisible
    this.car.setPosition(house.x, house.y - HOUSE_TEX_H * 0.45);
    this.car.setScale(0.2);
    this.car.setAlpha(0);
    this.car.setVisible(true);

    // Animate car swooping back to road
    this.tweens.add({
      targets: this.car,
      x: this.carRoadX,
      y: this.carRoadY,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.car.body.enable = true;
        this.insideHouse = null;
        this.isAnimating = false;
      },
    });
  }

  // ─── Weather ──────────────────────────────────────────────────

  setupWeather(width, height) {
    this.weatherWidth = width;
    this.weatherHeight = height;
    this.nextWeather = 'rain';
    this.activeEmitter = null;

    this.createWeatherTextures();
    this.scheduleWeather();
  }

  createWeatherTextures() {
    const rainGfx = this.add.graphics();
    rainGfx.fillStyle(0x4a90d9);
    rainGfx.fillRect(0, 0, 2, 8);
    rainGfx.generateTexture('raindrop', 2, 8);
    rainGfx.destroy();

    const snowGfx = this.add.graphics();
    snowGfx.fillStyle(0xffffff);
    snowGfx.fillCircle(4, 4, 4);
    snowGfx.generateTexture('snowflake', 8, 8);
    snowGfx.destroy();
  }

  scheduleWeather() {
    const delay = Phaser.Math.Between(10000, 40000);
    this.time.delayedCall(delay, () => this.startWeather());
  }

  startWeather() {
    const w = this.weatherWidth;
    const type = this.nextWeather;
    this.nextWeather = type === 'rain' ? 'snow' : 'rain';

    if (type === 'rain') {
      this.activeEmitter = this.add.particles(0, 0, 'raindrop', {
        x: { min: 0, max: w },
        y: -10,
        speedY: { min: 300, max: 500 },
        speedX: { min: -30, max: -60 },
        lifespan: 1200,
        quantity: 4,
        frequency: 30,
        alpha: { start: 0.7, end: 0.3 },
        scaleY: { min: 1, max: 1.5 },
      });
    } else {
      this.activeEmitter = this.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: w },
        y: -10,
        speedY: { min: 40, max: 90 },
        speedX: { min: -20, max: 20 },
        lifespan: 6000,
        quantity: 2,
        frequency: 80,
        alpha: { start: 0.9, end: 0.2 },
        scale: { min: 0.3, max: 1.0 },
        rotate: { min: 0, max: 360 },
      });
    }
    this.activeEmitter.setScrollFactor(0);

    const duration = Phaser.Math.Between(20000, 30000);
    this.time.delayedCall(duration, () => this.stopWeather());
  }

  stopWeather() {
    if (this.activeEmitter) {
      this.activeEmitter.stop();
      const cleanup = this.activeEmitter;
      this.time.delayedCall(6000, () => cleanup.destroy());
      this.activeEmitter = null;
    }
    this.scheduleWeather();
  }

  // ─── Update Loop ──────────────────────────────────────────────

  update() {
    if (!this.insideHouse && !this.isAnimating) {
      // Normal driving
      if (this.cursors.right.isDown) {
        this.car.body.setAccelerationX(500);
      } else {
        this.car.body.setAccelerationX(0);
      }

      if (this.car.body.velocity.x < 0) {
        this.car.body.setVelocityX(0);
      }

      // Check for nearby house
      const nearby = this.findNearbyHouse();
      this.nearbyHouse = nearby;

      if (nearby) {
        const bounce = Math.sin(this.time.now / 300) * 4;
        this.enterIndicator.setPosition(nearby.x, nearby.y + 10 + bounce);
        this.enterIndicator.setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
          this.enterHouse(nearby);
        }
      } else {
        this.enterIndicator.setVisible(false);
      }

      // Treasure collection
      this.checkTreasureCollection();
    } else if (this.insideHouse && !this.isAnimating) {
      const bounce = Math.sin(this.time.now / 300) * 4;
      this.exitIndicator.setPosition(
        this.insideHouse.x,
        this.insideHouse.y + 10 + bounce,
      );

      if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.exitHouse();
      }
    }

    // Always running regardless of state
    this.dashes.tilePositionX = this.cameras.main.scrollX;
    this.spawnHouses();
    this.spawnTreasures();
    this.animateTreasures();
    this.cleanupHouses();
    this.cleanupTreasures();
  }

  // ─── House Textures ───────────────────────────────────────────

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

      gfx.fillStyle(ROOF_COLORS[i]);
      gfx.fillTriangle(houseW / 2, 0, -6, roofH, houseW + 6, roofH);

      gfx.fillStyle(HOUSE_COLORS[i]);
      gfx.fillRect(0, roofH, houseW, houseH);

      gfx.fillStyle(0x5d3a1a);
      gfx.fillRect((houseW - doorW) / 2, roofH + houseH - doorH, doorW, doorH);

      gfx.fillStyle(0xf1c40f);
      gfx.fillCircle((houseW - doorW) / 2 + doorW - 3, roofH + houseH - doorH / 2, 2);

      gfx.fillStyle(0xa8d8ea);
      gfx.fillRect(8, roofH + 10, winW, winH);
      gfx.fillRect(houseW - 8 - winW, roofH + 10, winW, winH);

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

  // ─── House Spawning ───────────────────────────────────────────

  spawnHouses() {
    const cam = this.cameras.main;
    const startChunk = Math.floor(cam.scrollX / CHUNK_WIDTH);
    const endChunk = Math.floor((cam.scrollX + cam.width) / CHUNK_WIDTH) + 2;

    for (let chunk = startChunk; chunk <= endChunk; chunk++) {
      if (chunk < 0 || this.generatedChunks.has(chunk)) continue;
      this.generatedChunks.add(chunk);

      const rand = seededRandom(chunk * 7 + 1);
      // Wide random x offset (0 to CHUNK_WIDTH) for truly irregular spacing
      const xOffset = seededRandom(chunk * 11 + 5) * CHUNK_WIDTH;
      const x = chunk * CHUNK_WIDTH + xOffset;

      const roadTop = this.roadY - this.roadHeight / 2;

      if (rand < 0.6) {
        const colorIdx = Math.floor(seededRandom(chunk * 17 + 7) * HOUSE_COLORS.length);
        const yOffset = seededRandom(chunk * 19 + 9) * 30;
        const house = this.add.image(x, roadTop - 23 - yOffset, `house_${colorIdx}`);
        house.setOrigin(0.5, 1);
        this.houses.push(house);
      }
    }
  }

  cleanupHouses() {
    const camLeft = this.cameras.main.scrollX - 400;
    this.houses = this.houses.filter((house) => {
      if (house === this.insideHouse) return true;
      if (house.x < camLeft) {
        house.destroy();
        return false;
      }
      return true;
    });
  }

  // ─── Road & Car ───────────────────────────────────────────────

  drawRoad(width, roadY, roadHeight) {
    const road = this.add.graphics();
    road.fillStyle(0x3a3a3a);
    road.fillRect(0, roadY - roadHeight / 2, width, roadHeight);
    road.lineStyle(3, 0x000000);
    road.lineBetween(0, roadY - roadHeight / 2, width, roadY - roadHeight / 2);
    road.lineBetween(0, roadY + roadHeight / 2, width, roadY + roadHeight / 2);
    road.setScrollFactor(0);

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

    gfx.fillStyle(0xdd3333);
    gfx.fillRoundedRect(0, 0, carW, carH, 6);

    gfx.fillStyle(0xbb2222);
    gfx.fillRoundedRect(12, -14, 30, 16, 4);

    gfx.fillStyle(0xa8d8ea);
    gfx.fillRect(16, -11, 22, 10);

    gfx.fillStyle(0x222222);
    gfx.fillCircle(12, carH, wheelR);
    gfx.fillCircle(carW - 12, carH, wheelR);

    gfx.fillStyle(0x888888);
    gfx.fillCircle(12, carH, 3);
    gfx.fillCircle(carW - 12, carH, 3);

    gfx.fillStyle(0xe8871e);
    gfx.fillCircle(carW - 2, 10, 5);

    gfx.generateTexture('car', carW + 4, carH + wheelR + 2);
    gfx.destroy();

    this.car = this.physics.add.sprite(width / 3, roadY - roadHeight / 4 - 2, 'car');
    this.car.setOrigin(0.5, 1);
  }
}
