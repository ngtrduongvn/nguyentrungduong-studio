import * as THREE from 'three';

// --- 1. CẤU HÌNH & DỮ LIỆU MÊ CUNG (Từ maze.js) ---
const CELL_SIZE = 4;
const PLAYER_HEIGHT = 1.6;

function generateLargeMaze(width, height) {
    let map = Array.from({ length: height }, () => Array(width).fill(1));
    function walk(x, y) {
        map[y][x] = 0;
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && map[ny][nx] === 1) {
                map[y + dy / 2][x + dx / 2] = 0;
                walk(nx, ny);
            }
        }
    }
    walk(1, 1);
    map[1][1] = 0; map[1][2] = 0; map[2][1] = 0;
    addDistancedExit(map, width, height);
    return map;
}

function addDistancedExit(map, width, height) {
    const edgeCells = [];
    const minDistance = 45; 
    for (let i = 1; i < width - 1; i++) {
        if (map[1][i] === 0) edgeCells.push({x: i, y: 0}); 
        if (map[height - 2][i] === 0) edgeCells.push({x: i, y: height - 1});
    }
    for (let j = 1; j < height - 1; j++) {
        if (map[j][1] === 0) edgeCells.push({x: 0, y: j});
        if (map[j][width - 2] === 0) edgeCells.push({x: width - 1, y: j});
    }
    const farCells = edgeCells.filter(cell => {
        const dist = Math.sqrt(Math.pow(cell.x - 1, 2) + Math.pow(cell.y - 1, 2));
        return dist > minDistance;
    });
    const candidates = farCells.length > 0 ? farCells : edgeCells;
    const exit = candidates[Math.floor(Math.random() * candidates.length)];
    if (exit) {
        map[exit.y][exit.x] = 2;
        if (exit.y === 0) map[1][exit.x] = 0;
        if (exit.y === height - 1) map[height - 2][exit.x] = 0;
        if (exit.x === 0) map[exit.y][1] = 0;
        if (exit.x === width - 1) map[exit.y][width - 2] = 0;
    }
}
const maze = generateLargeMaze(64, 64);

// --- 2. VẬT LÝ (Từ physics.js) ---
function checkCollision(nx, nz) {
    const padding = 0.6; 
    const checkPoints = [
        {x: nx + padding, z: nz + padding}, {x: nx - padding, z: nz + padding},
        {x: nx + padding, z: nz - padding}, {x: nx - padding, z: nz - padding}
    ];
    for(let p of checkPoints) {
        const gx = Math.floor((p.x + CELL_SIZE/2) / CELL_SIZE);
        const gz = Math.floor((p.z + CELL_SIZE/2) / CELL_SIZE);
        if (maze[gz] && maze[gz][gx] === 1) return true;
    }
    return false;
}

// --- 3. QUẢN LÝ THỂ LỰC (Từ stamina.js) ---
class StaminaManager {
    constructor() {
        this.maxStamina = 100;
        this.currentStamina = 100;
        this.consumption = 0.2;
        this.recovery = 0.3;
        this.isExhausted = false;
        this.barElement = document.getElementById('stamina-bar');
    }
    update(isMoving, isRunning) {
        if (isMoving && isRunning && !this.isExhausted) {
            this.currentStamina -= this.consumption;
            if (this.currentStamina <= 0) { this.currentStamina = 0; this.isExhausted = true; }
        } else {
            this.currentStamina += this.recovery;
            if (this.currentStamina >= this.maxStamina) this.currentStamina = this.maxStamina;
            if (this.isExhausted && this.currentStamina >= 20) this.isExhausted = false;
        }
        if (this.barElement) {
            this.barElement.style.width = `${this.currentStamina}%`;
            this.barElement.style.background = this.isExhausted ? '#ff0000' : '#00ff00';
        }
    }
    canRun() { return this.currentStamina > 0 && !this.isExhausted; }
}

// --- 4. BẢN ĐỒ THU NHỎ (Từ minimap.js) ---
class MiniMap {
    constructor() {
        this.canvas = document.getElementById('minimap');
        this.ctx = this.canvas.getContext('2d');
        this.size = 200;
        this.canvas.width = this.size;
        this.canvas.height = this.size;
    }
    update(playerX, playerZ, playerRotation) {
        this.ctx.clearRect(0, 0, this.size, this.size);
        const scale = 15;
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const pX = (playerX + CELL_SIZE / 2) / CELL_SIZE;
        const pZ = (playerZ + CELL_SIZE / 2) / CELL_SIZE;

        for (let r = 0; r < maze.length; r++) {
            for (let c = 0; c < maze[r].length; c++) {
                if (maze[r][c] === 1 || maze[r][c] === 2) {
                    const drawX = centerX + (c - pX) * scale;
                    const drawZ = centerY + (r - pZ) * scale;
                    if (drawX > -scale && drawX < this.size && drawZ > -scale && drawZ < this.size) {
                        this.ctx.fillStyle = maze[r][c] === 1 ? "rgba(100,100,100,0.7)" : "#ffffff";
                        if(maze[r][c] === 2) { this.ctx.shadowBlur = 15; this.ctx.shadowColor = "#ffffff"; }
                        this.ctx.fillRect(drawX, drawZ, scale, scale);
                        this.ctx.shadowBlur = 0;
                    }
                }
            }
        }
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(-playerRotation);
        this.ctx.fillStyle = "#00FFFF";
        this.ctx.beginPath();
        this.ctx.moveTo(0, -6); this.ctx.lineTo(4, 4); this.ctx.lineTo(-4, 4);
        this.ctx.closePath(); this.ctx.fill();
        this.ctx.restore();
    }
}

// --- 5. KHỞI TẠO THREE.JS & GAME LOGIC ---
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 1, 20);
const ambient = new THREE.AmbientLight(0x222222); 
scene.add(ambient);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Âm thanh
const listener = new THREE.AudioListener();
camera.add(listener);
const sounds = {
    walk: new THREE.Audio(listener), run: new THREE.Audio(listener),
    lightOn: new THREE.Audio(listener), lightOff: new THREE.Audio(listener)
};
const audioLoader = new THREE.AudioLoader();
audioLoader.load('sounds/walk.wav', (b) => { sounds.walk.setBuffer(b); sounds.walk.setLoop(true); sounds.walk.setVolume(0.4); });
audioLoader.load('sounds/run.wav', (b) => { sounds.run.setBuffer(b); sounds.run.setLoop(true); sounds.run.setVolume(0.6); });
audioLoader.load('sounds/flashlight_on.wav', (b) => { sounds.lightOn.setBuffer(b); });
audioLoader.load('sounds/flashlight_off.wav', (b) => { sounds.lightOff.setBuffer(b); });

const stamina = new StaminaManager();
const minimap = new MiniMap();
let startTime = null; 
let gameEnded = false;
const timerElement = document.getElementById('timer');

function formatTime(ms) {
    let d = Math.floor(ms / 86400000);
    let h = Math.floor((ms % 86400000) / 3600000);
    let m = Math.floor((ms % 3600000) / 60000) ;
    let s = Math.floor((ms % 60000) / 1000);
    let msStr = Math.floor((ms % 1000) / 10);
    let res = d > 0 ? d + ":" : "";
    res += (h < 10 ? "0"+h : h) + ":" + (m < 10 ? "0"+m : m) + ":" + (s < 10 ? "0"+s : s) + "." + (msStr < 10 ? "0"+msStr : msStr);
    return res;
}

// Đèn pin
const flashlight = new THREE.SpotLight(0xffffff, 15, 25, Math.PI / 4.5, 0.6, 1);
const flashlightTarget = new THREE.Object3D();
camera.add(flashlight, flashlightTarget);
flashlightTarget.position.set(0, 0, -3); 
flashlight.target = flashlightTarget;
scene.add(camera);

// Build Maze 3D
const loader = new THREE.TextureLoader();
const wallMat = new THREE.MeshStandardMaterial({ map: loader.load('textures/wall.jpg') });
const floorMat = new THREE.MeshStandardMaterial({ map: loader.load('textures/floor.jpg') });
floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping;
floorMat.map.repeat.set(32, 32);

const wallGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
maze.forEach((row, r) => {
    row.forEach((cell, c) => {
        if (cell === 1) {
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(c * CELL_SIZE, CELL_SIZE / 2, r * CELL_SIZE);
            scene.add(wall);
        } else if (cell === 2) {
            const exitMesh = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE*2, CELL_SIZE), 
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }));
            exitMesh.position.set(c * CELL_SIZE, CELL_SIZE, r * CELL_SIZE);
            scene.add(exitMesh);
        }
    });
});

const mazeWorldSize = 64 * CELL_SIZE;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(mazeWorldSize, mazeWorldSize), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(mazeWorldSize/2 - CELL_SIZE/2, 0, mazeWorldSize/2 - CELL_SIZE/2);
scene.add(floor);

camera.position.set(CELL_SIZE, PLAYER_HEIGHT, CELL_SIZE);
const keys = {};

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if(e.key.toLowerCase() === 'f') {
        flashlight.visible = !flashlight.visible;
        if (flashlight.visible) { if(sounds.lightOn.buffer) sounds.lightOn.play(); }
        else { if(sounds.lightOff.buffer) sounds.lightOff.play(); }
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
document.addEventListener('click', () => { renderer.domElement.requestPointerLock(); });
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) camera.rotation.y -= e.movementX * 0.002;
});

let stepCounter = 0;

function update() {
    if (gameEnded) return;

    let isMoving = !!(keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || keys['ArrowUp'] || keys['ArrowDown']);
    if (!startTime && isMoving) startTime = Date.now();

    const isRunning = (keys['ShiftLeft'] || keys['ShiftRight']) && stamina.canRun();
    stamina.update(isMoving, isRunning);

    const moveSpeed = isRunning ? 0.12 : 0.045; 
    const stepFreq = isMoving ? (isRunning ? 0.25 : 0.12) : 0.02;
    let moveX = 0, moveZ = 0;
    const rot = camera.rotation.y;

    if (keys['KeyW'] || keys['ArrowUp']) { moveX -= Math.sin(rot) * moveSpeed; moveZ -= Math.cos(rot) * moveSpeed; }
    if (keys['KeyS'] || keys['ArrowDown']) { moveX += Math.sin(rot) * moveSpeed; moveZ += Math.cos(rot) * moveSpeed; }
    if (keys['KeyA'] || keys['ArrowLeft']) { moveX -= Math.cos(rot) * moveSpeed; moveZ += Math.sin(rot) * moveSpeed; }
    if (keys['KeyD'] || keys['ArrowRight']) { moveX += Math.cos(rot) * moveSpeed; moveZ -= Math.sin(rot) * moveSpeed; }

    if (isMoving) {
        if (!checkCollision(camera.position.x + moveX, camera.position.z)) camera.position.x += moveX;
        if (!checkCollision(camera.position.x, camera.position.z + moveZ)) camera.position.z += moveZ;
        
        if (isRunning) { if(!sounds.run.isPlaying) sounds.run.play(); sounds.walk.stop(); } 
        else { if(!sounds.walk.isPlaying) sounds.walk.play(); sounds.run.stop(); }
        stepCounter += stepFreq;
    } else {
        sounds.walk.stop(); sounds.run.stop();
        stepCounter += 0.02;
    }

    camera.position.y = PLAYER_HEIGHT + Math.sin(stepCounter) * (isMoving ? (isRunning ? 0.07 : 0.035) : 0.01);
    flashlight.position.x = Math.cos(stepCounter * 0.5) * (isMoving ? (isRunning ? 0.08 : 0.03) : 0.01);
    
    if (startTime && timerElement) timerElement.innerText = `TIME: ${formatTime(Date.now() - startTime)}`;
    else if (timerElement) timerElement.innerText = "MOVE TO START";

    const pGX = Math.floor((camera.position.x + CELL_SIZE/2) / CELL_SIZE);
    const pGZ = Math.floor((camera.position.z + CELL_SIZE/2) / CELL_SIZE);
    if (maze[pGZ] && maze[pGZ][pGX] === 2) {
        gameEnded = true;
        alert(`Escaped! Time: ${formatTime(Date.now() - startTime)}`);
        location.reload();
    }
    minimap.update(camera.position.x, camera.position.z, camera.rotation.y);
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});