const FPS = 30; // frames per second
const friction = 0.7; // friction coefficient of space
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
const showBounding = false; // show or hide collision bounding
const showCenterDot = false;
const gameLives = 3; //starting num of lives
const textFadeTime = 2.5; // in seconds
const textSize = 40; // in px
const roidsLargePts = 20; // points scored for large asteroid
const roidsMediumPts = 50; // points scored for medium asteroid
const roidsSmallPts = 100; // points scored for small asteroid
const saveScore = "highScore"; // save key for local storage

let canvas = document.getElementById("gameCanvas");
let context = canvas.getContext("2d");


// SET UP THE GAME LOOP
setInterval(update, 1000 / FPS);

// SET UP GAME PARAMETERS
let level, roids, ship, lives, score, highScore, text, textAlpha;
newGame();


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
		x + 4 / 3 * ship.r * Math.cos(a),
		y - 4 / 3 * ship.r * Math.sin(a)
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
	}
	// Prevent further shooting
	ship.canShoot = false;
}



// MAKE THE SHIP EXPLODE
function explodeShip () {
	ship.explodeTime = Math.ceil(shipExplodeDuration * FPS);
}



// MAKE THE GAME WORKS
function update () {
	let blinkOn = ship.blinkNumber % 2 === 0;
	let exploding = ship.explodeTime > 0;
	
	// BACKGROUND
	context.fillStyle = "rgba(44,44,44,1.00)";
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	// DRAW THE ASTEROIDS
	let x, y, r, a, vert, offs;
	for (let i = 0; i < roids.length; i++) {
		context.strokeStyle = "slategray";
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
		
		// show asteroid's collision circle
		if (showBounding) {
		context.strokeStyle = "lime";
		context.beginPath();
		context.arc(x, y, r, 0, Math.PI * 2, false);
		context.stroke();
		}	
	}
	
	
	// THRUST THE SHIP
	if (ship.thrusting && !ship.dead) {
		ship.thrust.x += shipThrust * Math.cos(ship.a) / FPS;
		ship.thrust.y -= shipThrust * Math.sin(ship.a) / FPS;
		
		//draw the thruster
		if (!exploding && blinkOn) {
			context.fillStyle= "red";
			context.strokeStyle = "yellow";
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
		// apply space friction when no thrusting
		ship.thrust.x -= friction * ship.thrust.x / FPS;
		ship.thrust.y -= friction * ship.thrust.y / FPS;
	}
	
	// DRAW THE SHIP
	if (!exploding) {
		if (blinkOn && !ship.dead) {
			drawShip(ship.x, ship.y, ship.a);
		}
		
		//handle blinking
		if (ship.blinkNumber > 0) {
			//reduce blink time
			ship.blinkTime--;
			
			//reduc blink number
			if (ship.blinkTime === 0) {
				ship.blinkTime = Math.ceil(shipBlinkDuration * FPS);
				ship.blinkNumber--;
			}
		}
		
	} else {
		// draw the explosion
		context.fillStyle = "darkred";
		context.beginPath();
		context.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
		context.fill();
		context.fillStyle = "red";
		context.beginPath();
		context.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
		context.fill();
		context.fillStyle = "orange";
		context.beginPath();
		context.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
		context.fill();
		context.fillStyle = "yellow";
		context.beginPath();
		context.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
		context.fill();
		context.fillStyle = "#fff";
		context.beginPath();
		context.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
		context.fill();
	}
	
	if (showBounding) {
		context.strokeStyle = "lime";
		context.beginPath();
		context.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
		context.stroke();
	}
	
	
	
	// CENTER DOT
	if(showCenterDot) {
		context.fillStyle = "red";
		context.fillRect(ship.x - 1, ship.y - 1, 2, 2);
	}
	
	// DRAW THE LASERS
	for (let i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explodeTime == 0) {
			context.fillStyle = "salmon";
			context.beginPath();
			context.arc(ship.lasers[i].x, ship.lasers[i].y, shipSize / 15, 0, Math.PI * 2, false);
			context.fill();
		} else {
			// draw the explosion
			context.fillStyle = "salmon";
			context.beginPath();
			context.arc(ship.lasers[i].x, ship.lasers[i].y, shipSize * 0.75, 0, Math.PI * 2, false);
			context.fill();
			context.fillStyle = "orangered";
			context.beginPath();
			context.arc(ship.lasers[i].x, ship.lasers[i].y, shipSize * 0.75, 0, Math.PI * 2, false);
			context.fill();
			context.fillStyle = "salmon";
			context.beginPath();
			context.arc(ship.lasers[i].x, ship.lasers[i].y, shipSize * 0.75, 0, Math.PI * 2, false);
			context.fill();
			context.fillStyle = "pink";
			context.beginPath();
			context.arc(ship.lasers[i].x, ship.lasers[i].y, shipSize * 0.75, 0, Math.PI * 2, false);
			context.fill();
		}
	}
	
	
	// DRAW THE GAME TEXT
	if (textAlpha >= 0) {
		context.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
		context.font = "small-caps " + textSize + "px helvetica";
		context.textAlign   = "center";
		context.fillText(text, canvas.width / 2, canvas.height * 0.75);
		textAlpha -= (1.0 / textFadeTime / FPS);
	} else if (ship.dead) {
		confirm("Play again?");
		newGame();
	}
	
	
	// DRAW THE LIVES
	let lifeColors;
	for (let i = 0; i < lives; i++) {
		lifeColors = exploding && i === lives - 1 ? "red" : "#fff";
		drawShip((shipSize + i * shipSize * 1.2), shipSize, 0.5 * Math.PI, lifeColors);
	}
	
	
	// DRAW THE SCORE
	context.fillStyle = "#fff";
	context.font = textSize + "px helvetica";
	context.textAlign = "right";
	context.textBaseline = "middle";
	context.fillText(score, canvas.width - shipSize / 2, shipSize);
	
	
	// DRAW THE HIGH SCORE
	context.fillStyle = "#fff";
	context.font = (textSize * 0.65) + "px helvetica";
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



document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

