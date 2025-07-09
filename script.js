// Wait for the DOM to be fully loaded before running the game script.
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Variables ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameClearScreen = document.getElementById('gameClearScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const nextLevelButton = document.getElementById('nextLevelButton');
    const finalScoreEl = document.getElementById('finalScore');
    const clearScoreEl = document.getElementById('clearScore');
    const newGameButton = document.getElementById('newGameButton');
    const pauseButton = document.getElementById('pauseButton');
    const controlsInfo = document.getElementById('controlsInfo');

    // --- Game State Variables ---
    let score, lives, gameActive, isPaused, animationFrameId;
    let paddleX, x, y, dx, dy;
    let bricks = [];
    let rightPressed = false;
    let leftPressed = false;

    // --- Audio Variables ---
    let audioCtx;
    let audioInitialized = false;

    // --- Constants ---
    const PADDLE_HEIGHT = 15;
    const PADDLE_WIDTH = 120;
    const BALL_RADIUS = 12;
    const BRICK_ROW_COUNT = 5;
    const BRICK_COLUMN_COUNT = 8;
    const BRICK_WIDTH = 80;
    const BRICK_HEIGHT = 25;
    const BRICK_PADDING = 15;
    const BRICK_OFFSET_TOP = 40;
    const BRICK_OFFSET_LEFT = 35;

    // --- Core Functions ---

    function init() {
        score = 0;
        lives = 3;
        isPaused = false;
        rightPressed = false;
        leftPressed = false;
        
        updateScore();
        updateLives();
        createBricks();
        resetBallAndPaddle();

        pauseButton.textContent = 'Pause';
        if(controlsInfo) controlsInfo.style.display = 'block';
    }

    function startGame() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        init();
        gameActive = true;

        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameClearScreen.style.display = 'none';

        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        draw();
    }

    function draw() {
        if (!gameActive) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();

        if (isPaused) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
            ctx.restore();
            return;
        }

        collisionDetection();

        if (rightPressed && paddleX < canvas.width - PADDLE_WIDTH) {
            paddleX += 7;
        } else if (leftPressed && paddleX > 0) {
            paddleX -= 7;
        }

        x += dx;
        y += dy;

        animationFrameId = requestAnimationFrame(draw);
    }

    function togglePause() {
        if (!gameActive) return;
        isPaused = !isPaused;
        if (isPaused) {
            if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
            pauseButton.textContent = 'Resume';
        } else {
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            pauseButton.textContent = 'Pause';
            draw();
        }
    }

    // --- Helper Functions ---

    function resetBallAndPaddle() {
        x = canvas.width / 2;
        y = canvas.height - 50;
        dx = (Math.random() < 0.5 ? 1 : -1) * 4;
        dy = -4;
        paddleX = (canvas.width - PADDLE_WIDTH) / 2;
    }

    function createBricks() {
        bricks = [];
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            bricks[c] = [];
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                bricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    type: (r < 2) ? 'special' : 'normal'
                };
            }
        }
    }

    function collisionDetection() {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    if (x > b.x && x < b.x + BRICK_WIDTH && y > b.y && y < b.y + BRICK_HEIGHT) {
                        dy = -dy;
                        b.status = 0;
                        score += (b.type === 'special' ? 20 : 10);
                        playSound('brick');
                        updateScore();
                        checkWinCondition();
                    }
                }
            }
        }

        if (x + dx > canvas.width - BALL_RADIUS || x + dx < BALL_RADIUS) {
            dx = -dx;
            playSound('wall');
        }

        if (y + dy < BALL_RADIUS) {
            dy = -dy;
            playSound('wall');
        } else if (y + dy > canvas.height - BALL_RADIUS) {
            if (x > paddleX && x < paddleX + PADDLE_WIDTH) {
                dy = -dy;
                playSound('paddle');
            } else {
                lives--;
                playSound('loseLife');
                updateLives();
                if (lives > 0) {
                    resetBallAndPaddle();
                } else {
                    gameOver();
                }
            }
        }
    }

    function updateScore() { scoreEl.textContent = score; }
    function updateLives() { livesEl.textContent = lives; }

    function checkWinCondition() {
        const remainingBricks = bricks.flat().filter(b => b.status === 1).length;
        if (remainingBricks === 0) {
            gameClear();
        }
    }

    function gameOver() {
        gameActive = false;
        playSound('gameOver');
        finalScoreEl.textContent = score;
        gameOverScreen.style.display = 'flex';
        if(controlsInfo) controlsInfo.style.display = 'none';
    }

    function gameClear() {
        gameActive = false;
        playSound('win');
        clearScoreEl.textContent = score;
        gameClearScreen.style.display = 'flex';
        if(controlsInfo) controlsInfo.style.display = 'none';
    }

    // --- Drawing Functions ---

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddleX, canvas.height - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.fillStyle = "#03dac6";
        ctx.fill();
        ctx.closePath();
    }

    function drawBall() {
        ctx.beginPath();
        ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#03dac6";
        ctx.fill();
        ctx.closePath();
    }

    function drawBricks() {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                    const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    ctx.beginPath();
                    ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                    ctx.fillStyle = bricks[c][r].type === 'special' ? "#ff4081" : "#03a9f4";
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    // --- Audio Functions ---

    function initAudio() {
        if (audioInitialized) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
        } catch (e) {
            console.error("Web Audio API is not supported.");
        }
    }

    function playSound(type) {
        if (!audioInitialized || !audioCtx) return;
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        let freq = 440, duration = 0.1, waveType = 'sine';
        switch (type) {
            case 'paddle': freq = 261.63; waveType = 'square'; break;
            case 'brick': freq = 523.25; duration = 0.05; break;
            case 'wall': freq = 110; waveType = 'triangle'; duration = 0.05; break;
            case 'loseLife': freq = 130.81; waveType = 'sawtooth'; duration = 0.3; break;
            case 'gameOver': playSoundSequence([[174.61, 0.15], [164.81, 0.15], [155.56, 0.15], [146.83, 0.2]]); return;
            case 'win': playSoundSequence([[523.25, 0.1], [659.25, 0.1], [783.99, 0.1], [1046.50, 0.2]]); return;
        }
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }
    
    function playSoundSequence(notes) {
        if (!audioInitialized || !audioCtx) return;
        let startTime = audioCtx.currentTime;
        notes.forEach(([freq, duration]) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0.5, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
            startTime += duration;
        });
    }

    // --- Event Handlers ---

    function keyDownHandler(e) {
        const key = e.key.toLowerCase();
        if (key === 'right' || key === 'arrowright' || key === 'd') rightPressed = true;
        else if (key === 'left' || key === 'arrowleft' || key === 'a') leftPressed = true;
        else if (key === 'p') togglePause();
    }

    function keyUpHandler(e) {
        const key = e.key.toLowerCase();
        if (key === 'right' || key === 'arrowright' || key === 'd') rightPressed = false;
        else if (key === 'left' || key === 'arrowleft' || key === 'a') leftPressed = false;
    }

    function mouseMoveHandler(e) {
        const relativeX = e.clientX - canvas.getBoundingClientRect().left;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddleX = relativeX - PADDLE_WIDTH / 2;
            if (paddleX < 0) paddleX = 0;
            if (paddleX + PADDLE_WIDTH > canvas.width) paddleX = canvas.width - PADDLE_WIDTH;
        }
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    newGameButton.addEventListener('click', startGame);
    nextLevelButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    document.addEventListener('mousemove', mouseMoveHandler);

    // --- Initial Setup ---
    init(); // Set the initial state of the game variables.
});
