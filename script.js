const FPS = 30; // frames per second
const friction = 0.5; // friction coefficient of space
const shipBlinkDuration = 0.1; // in seconds
const shipExplodeDuration = 0.3;
const shipInvisibilityDuration = 3; // in seconds
const shipSize = 30; // height in pixels
const shipThrust = 5; // acceleration of the ship px per sec
const shipTurnSpeed = 360; // degrees per second
const laserDist = 0.4; // max distance laser can travel
const laserExplodeDuration = 0.1;
const laserMax = 10; // max num of lasers on screen at once
const laserSpeed = 500; // px per sec
const roidsJag = 0.3; //jaggedness of the asteroids
const roidsNum = 1; // starting nb of asteroids
const roidsSize = 100; // starting size of asteroids in px
const roidsSpeed = 50; // max px per second
const roidsVert = 10; // average nb of vertices on each asteroid
const gameLives = 3; //starting num of lives
const textFadeTime = 3; // in seconds
const textSize = 40; // in px
const roidsLargePts = 20; // points scored for large asteroid
const roidsMediumPts = 50; // points scored for medium asteroid
const roidsSmallPts = 100; // points scored for small asteroid
const saveScore = "highScore"; // save key for local storage
let soundOn = false;
let musicOn = false;

let canvas = document.getElementById("gameCanvas");
let context = canvas.getContext("2d");
document.querySelector("main").focus();


// SOUND EFFECTS
function Sound(src, maxStreams = 1, vol = 1.0) {
	this.streamNum = 0;
	this.streams = [];
	for (let i = 0; i < maxStreams; i++) {
		this.streams.push(new Audio(src));
		this.streams[i].volume = vol;
	}
	this.play = function () {
		if (soundOn) {
		this.streamNum = (this.streamNum + 1) % maxStreams;
		this.streams[this.streamNum].play();
		}
	}
	this.stop = function () {
		this.streams[this.streamNum].pause();
		this.streams[this.streamNum].currentTime = 0;
	}
}
let laserSound = new Sound("https://margaux-dev.github.io/asteroids-game/asteroids-game-sounds/pew.m4a", 5, 0.4);
let thrustSound = new Sound("https://margaux-dev.github.io/asteroids-game/asteroids-game-sounds/thrust.m4a");
let hitSound = new Sound("https://margaux-dev.github.io/asteroids-game/asteroids-game-sounds/hit.m4a", 5, 0.8);
let explosionSound = new Sound("https://margaux-dev.github.io/asteroids-game/asteroids-game-sounds/explosion.m4a", 1, 0.7);


//MUSIC
let music = new Music("https://margaux-dev.github.io/asteroids-game/asteroids-game-sounds/music-high.m4a","https://margaux-dev.github.io/asteroids-game/asteroids-game-sounds/music-low.m4a");
let roidsLeft, roidsTotal;
function Music (srcA, srcB) {
	this.soundA = new Audio(srcA);
	this.soundB = new Audio(srcB);
	this.a = true;
	this.tempo = 1.0;
	this.beatTime = 0;
	this.play = function () {
		if (musicOn) {
			if (this.a) {
				this.soundA.play();
			} else {
				this.soundB.play();
			}
			this.a = !this.a;
		}
	}
	this.setAsteroidRatio = function (ratio) {
		this.tempo = 1 - 0.75 * (1 - ratio);
	}
	this.tick = function () {
		if (this.beatTime === 0) {
			this.play();
			this.beatTime = Math.ceil(this.tempo * FPS);
		} else {
			this.beatTime--;
		}
	}
}


// SET UP THE GAME LOOP
setInterval(update, 1000 / FPS);


// SET UP GAME PARAMETERS
let level, roids, ship, lives, score, highScore, text, textAlpha;


// START THE GAME
	// Background
context.fillStyle = "rgba(44,44,44,1.00)";
context.fillRect(0, 0, canvas.width, canvas.height);
	// Title
context.fillStyle = "rgba(193,193,193,1.00)";
context.font = "normal small-caps 100 " + (textSize + 30) + "px VT323";
context.textAlign   = "center";
context.textBaseline = "middle";
context.fillText("ASTEROIDS", canvas.width / 2, canvas.height * 0.48);
	// subtitke
context.font = "small-caps " + (textSize - 15) + "px VT323";
context.fillText("PRESS ANY KEY TO START", canvas.width / 2, canvas.height * 0.58);
document.addEventListener("keydown", newGame);



// BUILD AN ASTEROID
function newAsteroid (x, y, r) {
	let lvlMultiply = 1 + 0.1 * level;
	let roid = {
		x: x,
		y:y,
		xv: Math.random() * roidsSpeed * lvlMultiply / FPS * (Math.random() < 0.5 ? 1 : -1),
		yv: Math.random() * roidsSpeed * lvlMultiply / FPS * (Math.random() < 0.5 ? 1 : -1),
		r: r,
		a: Math.random() * Math.PI * 2, // in radians
		vert: Math.floor(Math.random() * (roidsVert + 1) + roidsVert / 2),
		offs : []
	};
	
	// Create the vertex offets array
	for (let i = 0; i < roid.vert; i++) {
		roid.offs.push(Math.random() * roidsJag * 2 + 1 - roidsJag);
	}
	
	return roid;
}

// CREATE THE ASTEROID BELT
function createAsteroidBelt () {
	roids = [];
	roidsTotal = (roidsNum + level) * 7;
	roidsLeft = roidsTotal;
	let x, y;
	for (let i = 0; i < roidsNum + level; i++) {
		do { 
			x = Math.floor(Math.random() * canvas.width);
			y = Math.floor(Math.random() * canvas.height);
		} while (distBetweenPoints(ship.x, ship.y, x, y) < roidsSize * 2 + ship.r);
		roids.push(newAsteroid(x, y, Math.ceil(roidsSize / 2)));
	}
}


// DESTROY AN ASTEROID
function destroyAsteroid (index) {
	let x = roids[index].x;
	let y = roids[index].y;
	let r = roids[index].r;
	
	// Split the asteroid in 2 
	if (r === Math.ceil(roidsSize / 2)) {
		roids.push(newAsteroid(x, y, Math.ceil(roidsSize / 4)));
		roids.push(newAsteroid(x, y, Math.ceil(roidsSize / 4)));
		score += roidsLargePts;
	} else if (r == Math.ceil(roidsSize / 4)) {
		roids.push(newAsteroid(x, y, Math.ceil(roidsSize / 8)));
		roids.push(newAsteroid(x, y, Math.ceil(roidsSize / 8)));
		score += roidsMediumPts;
	} else {
		score += roidsSmallPts;
	}
	
	// Check high score
	if (score > highScore) {
		highScore = score;
		localStorage.setItem(saveScore, highScore);
	}
	
	// Destroy the last fragment of asteroid
	roids.splice(index, 1);
	hitSound.play();
	
	// Ratio of remaining asteroids for music tempo
	roidsLeft--;
	music.setAsteroidRatio(roidsLeft === 0 ? 1 : roidsLeft / roidsTotal);
	
	// Then new level starts
	if (roids.length === 0){
		level++;
		newLevel();
	}
}


// GET THE DISTANCE BETWEEN TWO POINTS
function distBetweenPoints(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}


// BUILD A NEW SHIP
function newShip () {
	return {
		x: canvas.width / 2,
		y: canvas.height / 2,
		r: shipSize / 2,
		a: 90 / 180 * Math.PI, // radiant
		blinkNumber: Math.ceil(shipInvisibilityDuration / shipBlinkDuration),
		blinkTime: Math.ceil(shipBlinkDuration * FPS),
		canShoot: true,
		dead: false,
		explodeTime: 0,
		lasers:[],
		rotation: 0,
		thrusting: false,
		thrust : {
			x: 0,
			y: 0
		}
	}
}


// DRAW A NEW SHIP
function drawShip(x, y, a, color = "#fff") {
	context.strokeStyle = color;
	context.lineWidth = shipSize / 20;
	context.beginPath();
	context.moveTo(
		x + 5 / 3 * ship.r * Math.cos(a),
		y - 5 / 3 * ship.r * Math.sin(a)
	);
	context.lineTo(
		x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
	);
	context.lineTo(
		x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
	);
	context.closePath();
	context.stroke();
}


// SHOOT LASERS
function shootLaser () {
	// Create a laser
	if (ship.canShoot && ship.lasers.length < laserMax) {
		ship.lasers.push({
			x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
			y : ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
			xv : laserSpeed * Math.cos(ship.a) / FPS,
			yv : -laserSpeed * Math.sin(ship.a) / FPS, 
			dist: 0,
			explodeTime: 0
		});
		laserSound.play();
	}
	// Prevent further shooting
	ship.canShoot = false;
}


// MAKE THE SHIP EXPLODE
function explodeShip () {
	ship.explodeTime = Math.ceil(shipExplodeDuration * FPS);
	explosionSound.play();
}


// DRAW THE EXPLOSITION
function drawExplosion (ex, ey, spikes, r) {
	let rot = Math.PI / 2 * 3;
	let x = ex;
	let y = ey;
	let step = Math.PI / spikes;
	context.beginPath();
	context.moveTo(
		ex, ey - r
	);
	for (let i = 0; i < spikes; i++) {
		x = ex + Math.cos(rot) * r;
		y = ey + Math.sin(rot) * r;
		context.lineTo(x, y);
		rot += step;
		x = ex + Math.cos(rot);
		y = ey + Math.sin(rot);
		context.lineTo(x, y);
		rot += step
	}
	context.lineTo(ex, ey - r);
	context.closePath();
	context.lineWidth = 3.5;
	context.strokeStyle = "rgba(179,62,0,1.00)";
	context.stroke();
	context.fillStyle = "rgba(255,235,0,1.00)";
	context.fill();
	
	context.fillStyle = "rgba(198,77,0,1.00)";
	context.beginPath();
	context.arc(ex, ey, r * 0.7, Math.PI * 2, false);
	context.fill();
	context.fillStyle =  "rgba(252,99,0,1.00)";
	context.beginPath();
	context.arc(ex, ey, r * 0.6, Math.PI * 2, false);
	context.fill();
	context.fillStyle =  "rgba(255,140,65,1.00)";
	context.beginPath();
	context.arc(ex, ey, r * 0.5, Math.PI * 2, false);
	context.fill();
	context.fillStyle = "rgba(255,169,65,1.00)";
	context.beginPath();
	context.arc(ex, ey, r * 0.4, Math.PI * 2, false);
	context.fill();
	context.fillStyle = "rgba(255,206,65,1.00)";
	context.beginPath();
	context.arc(ex, ey, r * 0.3, Math.PI * 2, false);
	context.fill();
	context.fillStyle = "rgba(255,233,66,1.00)";
	context.beginPath();
	context.arc(ex, ey, r * 0.2, 0, Math.PI * 2, false);
	context.fill();
}


// MAKE THE GAME WORKS
function update () {
	let blinkOn = ship.blinkNumber % 2 === 0;
	let exploding = ship.explodeTime > 0;
	
	//MUSIC
	music.tick();
	
	// BACKGROUND
	context.fillStyle = "rgba(44,44,44,1.00)";
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	// DRAW THE ASTEROIDS
	let x, y, r, a, vert, offs;
	for (let i = 0; i < roids.length; i++) {
		context.strokeStyle = "rgba(217,241,189,1.00)";
		context.lineWidth = shipSize / 20;
		
		// Get the asteroid props
		x = roids[i].x;
		y = roids[i].y;
		r = roids[i].r;
		a = roids[i].a;
		vert = roids[i].vert;
		offs = roids[i].offs;
		
		// Draw a path
		context.beginPath();
		context.moveTo(
			x + r * offs[0] * Math.cos(a),
			y + r * offs[0] * Math.sin(a)
		);
		
		// Draw the polygon
		for (let j = 1; j < vert; j++) {
			context.lineTo(
				x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
				y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
			);
		}
		context.closePath();
		context.stroke();
	}
	
	
	// THRUST THE SHIP
	if (ship.thrusting && !ship.dead) {
		ship.thrust.x += shipThrust * Math.cos(ship.a) / FPS;
		ship.thrust.y -= shipThrust * Math.sin(ship.a) / FPS;
		thrustSound.play();
		
		// Draw the thruster
		if (!exploding && blinkOn) {
			context.fillStyle= "rgba(255,86,0,1.00)";
			context.strokeStyle = "rgba(255,169,78,1.00)"; 
			context.lineWidth = shipSize / 10;
			context.beginPath();
			context.moveTo(
				//left
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
			);
			context.lineTo(
				//center, behind the ship
				ship.x - ship.r * (5 / 3 * Math.cos(ship.a)),
				ship.y + ship.r * (5 / 3 * Math.sin(ship.a))
			);
			context.lineTo(
				//right
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5* Math.cos(ship.a))
			);
			context.closePath();
			context.fill();
			context.stroke();
		}
	} else {
		// Apply space friction when no thrusting
		ship.thrust.x -= friction * ship.thrust.x / FPS;
		ship.thrust.y -= friction * ship.thrust.y / FPS;
		thrustSound.stop()
	}
	
	// DRAW THE SHIP
	if (!exploding) {
		if (blinkOn && !ship.dead) {
			drawShip(ship.x, ship.y, ship.a);
		}
		// Handle blinking
		if (ship.blinkNumber > 0) {
			// Reduce blink time
			ship.blinkTime--;
			// Reduce blink number
			if (ship.blinkTime === 0) {
				ship.blinkTime = Math.ceil(shipBlinkDuration * FPS);
				ship.blinkNumber--;
			}
		}
	} else {
		// Draw the explosion
		drawExplosion(ship.x, ship.y, 20, ship.r);
	}
	
	
	// DRAW THE LASERS
	for (let i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explodeTime == 0) {
			context.fillStyle = "rgba(251,143,129,1.00)";
			context.beginPath();
			context.arc(ship.lasers[i].x, ship.lasers[i].y, shipSize / 15, 0, Math.PI * 2, false);
			context.fill();
		} else {
			// Draw the explosion
			drawExplosion(ship.lasers[i].x, ship.lasers[i].y, 20, shipSize * 0.75);
		}
	}
	
	
	// DRAW THE GAME TEXT
	if (textAlpha >= 0) {
		context.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
		context.font = "small-caps " + (textSize + 20) + "px VT323";
		context.textAlign   = "center";
		context.fillText(text, canvas.width / 2, canvas.height * 0.7);
		textAlpha -= (1.0 / textFadeTime / FPS);
	} else if (ship.dead) {
		context.fillStyle = "rgba(215,215,215,1.00)";
		context.font = "small-caps " + (textSize - 5) + "px VT323";
		context.textAlign   = "center";
		context.textBaseline = "middle";
		context.fillText("PRESS ANY KEY TO PLAY AGAIN", canvas.width / 2, canvas.height * 0.5);
		document.addEventListener("keydown", newGame);
		
	}
	
	
	// DRAW THE LIVES 
	let lifeColors;
	for (let i = 0; i < lives; i++) {
		lifeColors = exploding && i === lives - 1 ? "red" : "#fff";
		drawShip((shipSize + i * shipSize * 1.2), shipSize, 0.5 * Math.PI, lifeColors);
	}
	
	
	// DRAW THE SCORE
	context.fillStyle = "#C9C9C9";
	context.font = (textSize + 5) + "px VT323";
	context.textAlign = "right";
	context.textBaseline = "middle";
	context.fillText(score, canvas.width - shipSize / 2, shipSize);
	
	
	// DRAW THE HIGH SCORE
	context.fillStyle = "#C9C9C9";
	context.font = (textSize * 0.9) + "px VT323";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText("BEST SCORE: " + highScore, canvas.width / 2, shipSize);
	
	
	//DETECT LASER HITS ON ASTEROID
	let ax, ay, ar, lx, ly;
	for (let i = roids.length - 1; i >= 0; i--) {
		//grab the asteroids props
		ax = roids[i].x;
		ay = roids[i].y;
		ar = roids[i].r;
		//loop over the lasers
		for (let j = ship.lasers.length - 1; j >= 0; j--) {
			//gradb the laser props
			lx = ship.lasers[j].x;
			ly = ship.lasers[j].y;
			
			//detect hits
			if (ship.lasers[j].explodeTime === 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {
				
				//destroy the asteroid + laser explositoon
				destroyAsteroid(i);
				ship.lasers[j].explodeTime = Math.ceil(laserExplodeDuration * FPS);
				break;
			}
		}
	}
	
	
	//CHECK FOR ASTEROID COLLISIONS
	if (!exploding) {
		if (ship.blinkNumber === 0 && !ship.dead) {
			for (let i = 0; i < roids.length; i++) {
				if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
					explodeShip();
					destroyAsteroid(i);
					break;
				}
			}
		}

			// ROTATE THE SHIP
			ship.a += ship.rotation; 

			// MOVE THE SHIP
			ship.x += ship.thrust.x;
			ship.y += ship.thrust.y;
		
	} else {
		ship.explodeTime --;
		// Reset the ship after an explosion
		if (ship.explodeTime == 0) {
			lives--;
			if (lives === 0) {
				gameOver();
			} else {
				ship = newShip();
			}
		}
	}
	
	// HANDLE EDGE OF SCREEN
	if (ship.x < 0 - ship.r) {
		ship.x = canvas.width + ship.r;
	} else if (ship.x > canvas.width + ship.r) {
		ship.x = 0 - ship.r;
	}
	if (ship.y < 0 - ship.r) {
		ship.y = canvas.height + ship.r;
	} else if (ship.y > canvas.height + ship.r) {
		ship.y = 0 - ship.r;
	} 
	
	
	// MOVE THE LASERS
	for (let i = ship.lasers.length - 1; i >= 0; i--) {
		
		// Checked distance travelled
		if (ship.lasers[i].dist > laserDist * canvas.width) {
			ship.lasers.splice(i, 1);
			continue;
		} 
		
		// Handle the explosion
		if (ship.lasers[i].explodeTime > 0) {
			ship.lasers[i].explodeTime --;
			
			// Destroy the laser after duration
			if (ship.lasers[i].explodeTime == 0) {
				ship.lasers.splice(i, 1);
				continue;
			}
		} else {
			//Move the laser
		ship.lasers[i].x += ship.lasers[i].xv;
		ship.lasers[i].y += ship.lasers[i].yv;
		
		// Calculate the distance travelled
		ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));
		}
		
		
		
		// Handle edge of screen
		if (ship.lasers[i].x < 0) {
			ship.lasers[i].x = canvas.width;
		} else if (ship.lasers[i].x > canvas.width) {
			ship.lasers[i].x = 0;
		}
		if (ship.lasers[i].y < 0) {
			ship.lasers[i].y = canvas.height;
		} else if (ship.lasers[i].y > canvas.height) {
			ship.lasers[i].y = 0;
		}
	}
	
	
	//MOVE THE ASTEROIDS
	for  (let i = 0; i < roids.length; i++) {
		roids[i].x += roids[i].xv;
		roids[i].y += roids[i].yv;
		
		//handle edge of screen
		if (roids[i].x < 0 - roids[i].r) {
			roids[i].x = canvas.width + roids[i].r;
		} else if (roids[i].x > canvas.width + roids[i].r){
			roids[i].x = 0 - roids[i].r
		}
		if (roids[i].y < 0 - roids[i].r) {
			roids[i].y = canvas.height + roids[i].r;
		} else if (roids[i].y > canvas.height + roids[i].r){
			roids[i].y = 0 - roids[i].r
		}
	}
}


// START A NEW GAME
function newGame () {
	level = 0;
	score = 0;
	lives = gameLives;
	ship = newShip();
	
	document.removeEventListener("keydown", newGame);
	
	//High score from local storage
	let scoreStr = localStorage.getItem(saveScore);
	if (scoreStr === null) {
		highScore = 0;
	} else {
		highScore = parseInt(scoreStr);
	}
	
	newLevel();
}


// NEW LEVEL
function newLevel () {
	text = "Level " + (level + 1);
	textAlpha = 1.0;
	createAsteroidBelt();
}


// GAME OVER
function gameOver () {
	ship.dead = true;
	text = "Game Over";
	textAlpha = 1.0;
	musicOn = false;
}


// MOVE THE SHIP AND SHOOT THE LASERS ON KEYDOWN
function keyDown (e) {
	if (ship.dead) {
		return;
	}
	switch (e.keyCode) {
		//Space Bar	
		case 32:
			shootLaser();
			break;
		// Left arrow
		case 37:
			ship.rotation = shipTurnSpeed / 180 * Math.PI / FPS;
			break;
		// Up arrow
		case 38:
			ship.thrusting = true;
			break;
		// Right arrow
		case 39:
			ship.rotation = -shipTurnSpeed / 180 * Math.PI / FPS;
			break;
	}
}


// STOP THE ACTIONS ON KEYUP
function keyUp (e) {

	switch (e.keyCode) {
		//Space Bar	
		case 32:
			ship.canShoot = true;
			break;
		// Left arrow
		case 37:
			ship.rotation = 0;
			break;
		// Up arrow
		case 38:
			ship.thrusting = false;
			break;
		// Right arrow
		case 39:
			ship.rotation = 0;
			break;
	}
}


// SWITCH ON/OFF THE SOUND EFFECTS
function soundToggle () {
	if(soundOn === false) {
		soundOn = true;
		document.querySelector("#sound").innerHTML = '<i class="fas fa-volume-up" aria-hidden="true" aria-label="sound on"></i>'
	} else {
		soundOn = false;
		document.querySelector("#sound").innerHTML = '<i class="fas fa-volume-mute" aria-hidden="true" aria-label="sound off"></i>'
	}
}


// SWITCH ON/OFF THE MUSIC
function musicToggle () {
	if(musicOn === false) {
		musicOn = true;
		document.querySelector("#music").classList.remove("mute");
	} else {
		musicOn = false;
		document.querySelector("#music").classList.add("mute");
	}
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);
document.querySelector("#sound").addEventListener("click", soundToggle);
document.querySelector("#music").addEventListener("click", musicToggle);
