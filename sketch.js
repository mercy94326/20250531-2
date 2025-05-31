let video;
let handpose;
let predictions = [];

let gameStarted = true;
let currentGame = "fruit";

let questionIndex = 0;
let timer = 10;
let score = 0;

let blockStack = [];
let fallingBlock;

let fruits = [];
let fruitImages = {};
let bombImg;

let vrGlassesImg;
let vrOn = false;

function preload() {
  fruitImages['watermelon'] = loadImage('pngtree-cute-anthropomorphic-fruit-watermelon-png-image_2844683-removebg-preview.png');
  fruitImages['watermelon_half'] = loadImage('b248b63a1961e1f38d33f42e2b10066a-removebg-preview.png');
  bombImg = loadImage('pngtree-ignite-the-bomb-image_2233752-removebg-preview.png');
  vrGlassesImg = loadImage('istockphoto-831337754-612x612-removebg-preview.png');
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, () => console.log("模型已載入"));
  handpose.on("predict", results => predictions = results);

  textAlign(CENTER, CENTER);

  setInterval(() => {
    if (gameStarted && timer > 0 && currentGame === "quiz") timer--;
  }, 1000);

  let switchBtn = createButton("切換遊戲模式");
  switchBtn.position(10, 10);
  switchBtn.mousePressed(() => {
    if (currentGame === "quiz") currentGame = "blocks";
    else if (currentGame === "blocks") currentGame = "fruit";
    else currentGame = "quiz";
    resetGame();
  });

  let vrBtn = createButton("VR眼鏡");
  vrBtn.position(130, 10);
  vrBtn.mousePressed(() => {
    vrOn = !vrOn;
  });

  resetGame();
}

function resetGame() {
  if (currentGame === "quiz") {
    questionIndex = 0;
    timer = 10;
    score = 0;
  } else if (currentGame === "blocks") {
    blockStack = [];
    fallingBlock = new Block(width / 2, 0);
  } else if (currentGame === "fruit") {
    fruits = [];
    for (let i = 0; i < 3; i++) {
      fruits.push(new Fruit());
    }
  }
}

function draw() {
  image(video, 0, 0, width, height);
  drawHandAndDetect();

  fill(0, 150);
  noStroke();
  rect(0, 0, width, 40);
  fill(255);
  textSize(20);
  text(currentGame === "quiz" ? `分數: ${score} 時間: ${timer}` : `分數: ${score}`, width / 2, 20);

  if (!gameStarted) return;

  if (currentGame === "quiz") drawQuizGame();
  else if (currentGame === "blocks") drawBlockGame();
  else if (currentGame === "fruit") drawFruitGame();
}

function drawQuizGame() {
  let q = questions[questionIndex];
  textSize(24);
  text(q.question, width / 2, height / 2 - 40);
  textSize(20);
  text(q.options[0], width / 4, height / 2 + 20);
  text(q.options[1], 3 * width / 4, height / 2 + 20);
}

function drawBlockGame() {
  fallingBlock.update();
  fallingBlock.show();

  for (let block of blockStack) {
    block.show();
  }

  if (fallingBlock.y > height - 20 || blockStack.some(b => dist(b.x, b.y, fallingBlock.x, fallingBlock.y) < 40)) {
    blockStack.push(fallingBlock);
    fallingBlock = new Block(random(width), 0);
    score++;
  }
}

function drawFruitGame() {
  for (let i = fruits.length - 1; i >= 0; i--) {
    fruits[i].update();
    fruits[i].show();
    if (fruits[i].isOffScreen()) {
      fruits.splice(i, 1);
      fruits.push(new Fruit());
    }
  }
}

function drawHandAndDetect() {
  if (predictions.length > 0) {
    let hand = predictions[0].landmarks;
    fill(0, 255, 0);
    for (let pt of hand) {
      ellipse(width - pt[0], pt[1], 10);
    }

    if (currentGame === "quiz") {
      if (hand[8][0] < width / 2) {
        checkAnswer(0);
      } else {
        checkAnswer(1);
      }
    } else if (currentGame === "blocks") {
      fallingBlock.x = width - hand[8][0];
    } else if (currentGame === "fruit") {
      for (let fruit of fruits) {
        if (!fruit.sliced && dist(width - hand[8][0], hand[8][1], fruit.x, fruit.y) < fruit.r) {
          fruit.sliced = true;
          score += fruit.isBomb ? -5 : 1;
        }
      }
    }

    if (vrOn) {
      let leftEye = hand[2];
      let rightEye = hand[5];

      let eyeX = (leftEye[0] + rightEye[0]) / 2;
      let eyeY = (leftEye[1] + rightEye[1]) / 2;
      let eyeDist = dist(leftEye[0], leftEye[1], rightEye[0], rightEye[1]);

      let drawX = width - eyeX;
      let drawY = eyeY;

      let glassesWidth = eyeDist * 3;
      let glassesHeight = glassesWidth * 0.6;

      image(vrGlassesImg, drawX - glassesWidth / 2, drawY - glassesHeight / 2, glassesWidth, glassesHeight);
    }
  }
}

function checkAnswer(ans) {
  if (timer === 0) return;
  if (ans === questions[questionIndex].answer) score++;
  questionIndex = (questionIndex + 1) % questions.length;
  timer = 10;
}

class Block {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  update() {
    this.y += 2;
  }
  show() {
    fill(255, 0, 0);
    rect(this.x, this.y, 40, 40);
  }
}

class Fruit {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.r = 40;
    this.isBomb = random(1) < 0.2;
    this.sliced = false;
  }
  update() {
    this.y += 2;
  }
  show() {
    if (this.sliced) {
      image(fruitImages['watermelon_half'], this.x, this.y, this.r * 2, this.r * 2);
    } else {
      let img = this.isBomb ? bombImg : fruitImages['watermelon'];
      image(img, this.x, this.y, this.r * 2, this.r * 2);
    }
  }
  isOffScreen() {
    return this.y > height + this.r;
  }
}

const questions = [
  {
    question: "刺蝟是什麼動物？",
    options: ["哺乳類", "爬蟲類"],
    answer: 0
  },
  {
    question: "刺蝟的刺是？",
    options: ["毛髮", "牙齒"],
    answer: 0
  },
  {
    question: "刺蝟主要在什麼時候活動？",
    options: ["白天", "夜晚"],
    answer: 1
  }
];
