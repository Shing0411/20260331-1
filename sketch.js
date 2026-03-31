/**
 * Cyber-Grid Runner Pro
 * 高質感、全自適應、幾何判定版
 */

let gameState = 'MENU'; 
let playStatus = 'WAITING'; 
let difficulty = 'EASY';
const diffLevels = ['EASY', 'MEDIUM', 'HARD', 'INSANE'];

// 虛擬解析度 (16:9 比例)
const V_W = 1200;
const V_H = 675;
let s = 1, offX = 0, offY = 0;

let pathPoints = []; 
let playerSize = 15; 
let pathWidth = 60;
let obstacles = [];
let particles = [];
let trail = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateLevel('EASY');
}

function draw() {
  // 自適應比例計算
  s = min(width / V_W, height / V_H);
  offX = (width - V_W * s) / 2;
  offY = (height - V_H * s) / 2;

  background(7, 7, 15); // 極深藍底色
  
  // 繪製背景動態網格 (不受介面縮放影響，鋪滿全螢幕)
  drawBackgroundGrid();

  push();
  translate(offX, offY);
  scale(s);

  if (gameState === 'MENU') drawMenu();
  else if (gameState === 'PLAY') drawGame();
  else if (gameState === 'WIN') drawEndScreen("MISSION CLEAR", color(0, 255, 200));
  else if (gameState === 'LOSE') drawEndScreen("SYSTEM FAILURE", color(255, 50, 100));
  pop();
}

// --- 視覺引擎：動態背景 ---
function drawBackgroundGrid() {
  stroke(30, 30, 80, 100);
  strokeWeight(1);
  let move = (frameCount * 0.5) % 40;
  for (let x = move; x < width; x += 40) line(x, 0, x, height);
  for (let y = move; y < height; y += 40) line(0, y, width, y);
  
  // 頂部掃描線效果
  noStroke();
  fill(255, 255, 255, 5);
  rect(0, (frameCount * 2) % height, width, 2);
}

// --- 核心幾何判定 ---
function distToSegment(px, py, x1, y1, x2, y2) {
  let l2 = distSq(x1, y1, x2, y2);
  if (l2 === 0) return dist(px, py, x1, y1);
  let t = max(0, min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
  return dist(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}
function distSq(x1, y1, x2, y2) { return (x1 - x2)**2 + (y1 - y2)**2; }

// --- 關卡生成 ---
function generateLevel(diff) {
  pathPoints = [];
  let startX = 100, startY = V_H / 2;
  pathPoints.push({x: startX, y: startY});

  let segments = (diff === 'EASY') ? 5 : (diff === 'MEDIUM' ? 12 : 22);
  pathWidth = (diff === 'EASY') ? 90 : (diff === 'MEDIUM') ? 65 : 45;
  playerSize = (diff === 'EASY') ? 14 : (diff === 'MEDIUM') ? 20 : 28;

  for (let i = 1; i <= segments; i++) {
    pathPoints.push({
      x: startX + (1000 / segments) * i,
      y: constrain(startY + random(-220, 220), 100, V_H - 100)
    });
    startY = pathPoints[i].y;
  }
  
  obstacles = [];
  if (diff === 'INSANE') {
    for (let i = 0; i < 10; i++) {
      obstacles.push({
        x: random(250, 950), y: random(100, 575),
        vx: random(-3, 3), vy: random(-3, 3), size: random(20, 40)
      });
    }
  }
}

// --- 遊戲邏輯與繪圖 ---
function drawGame() {
  let vMX = (mouseX - offX) / s;
  let vMY = (mouseY - offY) / s;
  let startP = pathPoints[0], endP = pathPoints[pathPoints.length - 1];

  // 1. 繪製路徑
  drawStyledPath();

  // 2. 終點節點
  drawNode(endP.x, endP.y, color(255, 0, 100), "GOAL");

  if (playStatus === 'WAITING') {
    drawNode(startP.x, startP.y, color(0, 255, 150), "START");
    if (mouseIsPressed && dist(vMX, vMY, startP.x, startP.y) < 35) {
      playStatus = 'ACTIVE';
      trail = [];
    }
    drawNeonText("CLICK START NODE TO ACTIVATE", V_W/2, V_H - 40, 20, color(255, 200, 0));
  } else {
    // 3. 玩家與判定
    drawPlayer(vMX, vMY);
    
    let minD = 999;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      minD = min(minD, distToSegment(vMX, vMY, pathPoints[i].x, pathPoints[i].y, pathPoints[i+1].x, pathPoints[i+1].y));
    }

    if (minD > (pathWidth/2 - playerSize/2 + 2)) gameState = 'LOSE';
    
    if (difficulty === 'INSANE') {
      for (let o of obstacles) {
        o.x += o.vx; o.y += o.vy;
        if (o.x < 50 || o.x > V_W-50) o.vx *= -1;
        if (o.y < 50 || o.y > V_H-50) o.vy *= -1;
        fill(255, 255, 0);
        noStroke();
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'yellow';
        ellipse(o.x, o.y, o.size);
        if (dist(vMX, vMY, o.x, o.y) < (o.size/2 + playerSize/2)) gameState = 'LOSE';
      }
    }
    if (dist(vMX, vMY, endP.x, endP.y) < 30) {
      gameState = 'WIN';
      createWinParticles();
    }
  }
}

function drawStyledPath() {
  noFill();
  strokeJoin(ROUND);
  strokeCap(ROUND);
  
  // 外層發光體
  drawingContext.shadowBlur = 25;
  drawingContext.shadowColor = 'rgba(0, 150, 255, 0.5)';
  stroke(20, 20, 50);
  strokeWeight(pathWidth);
  beginShape();
  for (let p of pathPoints) vertex(p.x, p.y);
  endShape();
  
  // 核心霓虹線
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = '#00ffff';
  stroke(0, 255, 255);
  strokeWeight(4);
  beginShape();
  for (let p of pathPoints) vertex(p.x, p.y);
  endShape();
  drawingContext.shadowBlur = 0;
}

function drawNode(x, y, col, txt) {
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = col;
  fill(col);
  ellipse(x, y, 50 + sin(frameCount*0.1)*10);
  fill(255);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(txt, x, y);
  drawingContext.shadowBlur = 0;
}

function drawPlayer(x, y) {
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'white';
  fill(255);
  ellipse(x, y, playerSize);
  
  // 玻璃尾跡
  trail.push({x, y, a: 200});
  if (trail.length > 20) trail.shift();
  for (let i = 0; i < trail.length; i++) {
    fill(0, 255, 255, (i/trail.length)*150);
    ellipse(trail[i].x, trail[i].y, playerSize * (i/trail.length));
  }
  drawingContext.shadowBlur = 0;
}

// --- 高質感 UI 組件 ---

function drawMenu() {
  drawNeonText("CYBER RUNNER", V_W/2, 180, 80, color(0, 255, 255));
  drawNeonText("NEURAL LINK ESTABLISHED", V_W/2, 240, 18, color(255, 255, 255, 150));

  let bY = 400;
  drawGlassBtn(V_W/2 - 240, bY, "EASY", 'EASY');
  drawGlassBtn(V_W/2 - 80, bY, "MEDIUM", 'MEDIUM');
  drawGlassBtn(V_W/2 + 80, bY, "HARD", 'HARD');
  drawGlassBtn(V_W/2 + 240, bY, "INSANE", 'INSANE');
}

function drawGlassBtn(x, y, label, diff) {
  let vMX = (mouseX - offX) / s;
  let vMY = (mouseY - offY) / s;
  let isHover = abs(vMX - x) < 70 && abs(vMY - y) < 30;
  
  push();
  rectMode(CENTER);
  translate(x, y);
  if (isHover) scale(1.1);
  
  // 玻璃背景
  fill(isHover ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)');
  stroke(isHover ? '#00ffff' : 'rgba(0, 255, 255, 0.3)');
  strokeWeight(2);
  rect(0, 0, 140, 60, 5);
  
  // 文字
  noStroke();
  fill(isHover ? 255 : 200);
  textSize(18);
  text(label, 0, 0);
  pop();

  if (isHover && mouseIsPressed) {
    difficulty = diff; playStatus = 'WAITING';
    generateLevel(diff); gameState = 'PLAY';
    mouseIsPressed = false;
  }
}

function drawEndScreen(title, col) {
  drawNeonText(title, V_W/2, 250, 70, col);
  drawGlassBtn(V_W/2, 400, "RETRY", difficulty);
  drawGlassBtn(V_W/2, 480, "MENU", 'MENU_ACTION');
  
  if (difficulty === 'MENU_ACTION') { gameState = 'MENU'; difficulty = 'EASY'; }

  // 粒子效果
  for (let p of particles) {
    p.x += p.vx; p.y += p.vy; p.a -= 5;
    fill(col.levels[0], col.levels[1], col.levels[2], p.a);
    ellipse(p.x, p.y, 4);
  }
}

function drawNeonText(txt, x, y, size, col) {
  push();
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = col;
  fill(col);
  textSize(size);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text(txt, x, y);
  pop();
}

function createWinParticles() {
  particles = [];
  for (let i = 0; i < 80; i++) 
    particles.push({x: V_W/2, y: V_H/2, vx: random(-8,8), vy: random(-8,8), a: 255});
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }