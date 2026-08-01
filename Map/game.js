
var GLOBAL_SPEED_VARIABLE_FOR_FFT_EPICYCLES = 100;


class GameArea {
	constructor() {
		this.canvas = document.createElement("canvas");
		this.resizeCanvasFunction = this.resizeCanvasFunction.bind(this); // or wrap the callback (on resize) in an arrow function
	}

	resizeCanvasFunction() {
		// 16:9
		if (window.innerWidth >= window.innerHeight) {
			this.canvas.width = 2048; // 2**11
			this.canvas.height = 1152; // 2**10+2**7
		} else {
			this.canvas.width = 1152;
			this.canvas.height = 2048;
		}

		let canvasAspect = this.canvas.width / this.canvas.height;
		let viewPortAspect = window.innerWidth / window.innerHeight;

		if (viewPortAspect > canvasAspect) {
			this.canvas.style.width = "auto";
			this.canvas.style.height = "100vh";

			let w = window.innerHeight * canvasAspect;
			let w2 = Math.max(0, (document.documentElement.clientWidth - w)*0.5);
			this.canvas.style.margin = "0px";
			this.canvas.style.marginLeft = `${w2}px`;
			this.canvas.style.marginRight = `${w2}px`;
		} else {
			this.canvas.style.width = "100vw";
			this.canvas.style.height = "auto";

			let h = window.innerWidth / canvasAspect;
			let h2 = Math.max(0, (document.documentElement.clientHeight - h)*0.5);
			this.canvas.style.margin = "0px";
			this.canvas.style.marginTop = `${h2}px`;
			this.canvas.style.marginBottom = `${h2}px`;
		}
	}

	start() {
		this.canvas.style.background = "#222";
		this.canvas.style.padding = "0px";
		this.canvas.style.margin = "0px";

		this.resizeCanvasFunction();
		window.addEventListener("resize", this.resizeCanvasFunction);

		if (document.body.childNodes.length >= 1) { // make sure the canvas is the first thing you see
			document.body.insertBefore(this.canvas, document.body.childNodes[0]);
		} else {
			document.body.appendChild(this.canvas);
		}

		this.ctx = this.canvas.getContext("2d");
		this.ctx.width = this.canvas.width;
		this.ctx.height = this.canvas.height;
	}
}


class InputManager {
    constructor() {
        this.keysDown = new Set();
        this.keysPressed = new Set();
        this.keysReleased = new Set();

        this.mouse = {
            x: 0,
            y: 0,
            mx: 0,
            my: 0,
            moveX: 0,
            moveY: 0,
            buttonsDown: new Set(),
            buttonsPressed: new Set(),
            buttonsReleased: new Set()
        };

        this.touches = new Map(); // active touches
		this.touchPressed = new Set();
		this.touchReleased = new Set();
        
        this.lastTouchReleaseXY = {x: -1, y: -1};
        this.lastMouseReleaseXY = {x: -1, y: -1};

		this.swipe = {
		    active: false,
		    startX: 0,
		    startY: 0,
		    x: 0,
		    y: 0
		};

		this.isPointerLocked = false; // Track lock state internally

        this._bindEvents();
    }

    _bindEvents() {
        // Keyboard
        window.addEventListener("keydown", (e) => {
            if (!this.keysDown.has(e.code)) {
                this.keysPressed.add(e.code);
            }
            this.keysDown.add(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.keysDown.delete(e.code);
            this.keysReleased.add(e.code);
        });

        // Mouse move
        window.addEventListener("mousemove", (e) => {

        	this.mouse.moveX = e.movementX;
        	this.mouse.moveY = e.movementY;

        	if (!this.isPointerLocked) {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
                this.swipe.x = e.clientX;
                this.swipe.y = e.clientY;
            }
        });

        // Mouse down
        window.addEventListener("mousedown", (e) => {
            if (!this.mouse.buttonsDown.has(e.button)) {
                this.mouse.buttonsPressed.add(e.button);
            }
            this.mouse.buttonsDown.add(e.button);

            if (!this.swipe.active) {
	            this.swipe.active = true;
	            this.swipe.startX = e.clientX;
	            this.swipe.startY = e.clientY;
	        }
        });

        // Mouse up
        window.addEventListener("mouseup", (e) => {
            this.mouse.buttonsDown.delete(e.button);
            this.mouse.buttonsReleased.add(e.button);
            this.lastMouseReleaseXY.x = e.clientX;
            this.lastMouseReleaseXY.y = e.clientY;

            this.swipe.active = false;
        });

        // Pointer Lock State Changes
        document.addEventListener("pointerlockchange", () => {
            // Checks if any element is currently locking the cursor
            this.isPointerLocked = !!document.pointerLockElement; 
            if (!this.isPointerLocked) {
                this.swipe.active = false;
            }
        });

        // TOUCH START
		window.addEventListener("touchstart", (e) => {
		    for (const t of e.changedTouches) {
		        this.touches.set(t.identifier, {
		            x: t.clientX,
		            y: t.clientY
		        });

		        this.touchPressed.add(t.identifier);

		        // swipe start (first finger only)
		        if (!this.swipe.active) {
		            this.swipe.active = true;
		            this.swipe.startX = t.clientX;
		            this.swipe.startY = t.clientY;
		        }
		    }
		});

		// TOUCH MOVE
		window.addEventListener("touchmove", (e) => {
		    for (const t of e.changedTouches) {
		        if (this.touches.has(t.identifier)) {
		            this.touches.set(t.identifier, {
		                x: t.clientX,
		                y: t.clientY
		            });

		            this.swipe.x = t.clientX;
		            this.swipe.y = t.clientY;
		        }
		    }
		});

		// TOUCH END
		window.addEventListener("touchend", (e) => {
		    for (const t of e.changedTouches) {
		        this.touches.delete(t.identifier);
		        this.touchReleased.add(t.identifier);
                this.lastTouchReleaseXY.x = t.clientX;
                this.lastTouchReleaseXY.y = t.clientY;
                // console.log(t)
		    }

		    if (this.touches.size === 0) {
		        this.swipe.active = false;
		    }
		});

        // Prevent stuck input when switching tabs
        window.addEventListener("blur", () => {
            this.keysDown.clear();
            this.mouse.buttonsDown.clear();
            this.touches.clear();
            this.swipe.active = false;
        });
    }

    // Call this via user interaction loop (e.g. click to start game)
    requestLock(element) {
        if (!element) return;
        element.requestPointerLock({ unadjustedMovement: true }).catch(err => {
            console.error("Pointer lock rejected:", err);
        });
    }

    exitLock() {
        document.exitPointerLock();
    }

    // Keyboard queries
    isKeyDown(code) {
        return this.keysDown.has(code);
    }

    isKeyPressed(code) {
        return this.keysPressed.has(code);
    }

    isKeyReleased(code) {
        return this.keysReleased.has(code);
    }

    // Mouse queries
    isMouseDown(button = 0) {
        return this.mouse.buttonsDown.has(button);
    }

    isMousePressed(button = 0) {
        return this.mouse.buttonsPressed.has(button);
    }

    isMouseReleased(button = 0) {
        return this.mouse.buttonsReleased.has(button);
    }

    getPointer() {
	    // Prefer touch if available
	    if (this.touches.size > 0) {
	        const first = this.touches.values().next().value;
	        return {
	            x: Math.round(first.x),
	            y: Math.round(first.y),
	            active: true,
	            type: "touch"
	        };
	    }

	    return {
	        x: this.mouse.x,
	        y: this.mouse.y,
	        active: this.mouse.buttonsDown.size > 0,
	        type: "mouse"
	    };
	}

    endFrame() {
	    // keyboard
	    this.keysPressed.clear();
	    this.keysReleased.clear();

	    // mouse
	    this.mouse.buttonsPressed.clear();
	    this.mouse.buttonsReleased.clear();

	    // touch
	    this.touchPressed.clear();
	    this.touchReleased.clear();

	    // clear deltas
	    this.mouse.moveX = 0;
	    this.mouse.moveY = 0;
	}
}


class Game {
    constructor() {
    	this.area = new GameArea();

    	// the maze
    	this.sensitivity = 1.0;
    	this.myMaze = new Maze(10, 10);
    	this.myPlayer = {pos: new Point(0.5,0.5),  // world pos
    					 vel: new Point(0,0),  // velocity
    					 acc: new Point(0,0),  // acceleration
    					 rotX: 0.7853981633974483,
    					 rotY: 0,
    					 rotVelX: 0,
    					 rotVelY: 0,
    					 rotAccX: 0,
    					 rotAccY: 0,
    					 radius: 0.2};
    	this.drawMiniMap = true;

        // Timing
        this.lastTime = 0;
        this.accumulator = 0;
        this.FPS = 60;
        this.fixedDelta = 1000 / this.FPS; // 60 updates per second
        this.maxFrameTime = 250; // 1000/(this.FPS/15)
        this.currentUpdateFPS = this.FPS;
        this.currentRenderFPS = this.FPS;

        this.input = new InputManager();

        this.start();
    }

    start() {
    	this.area.start();

		// Trigger lock on user action
		this.area.canvas.addEventListener("click", () => {
		    if (!this.input.isPointerLocked) {
		        this.input.requestLock(this.area.canvas);
		    }
		});

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;

        let frameTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Clamp huge frame jumps (tab freeze protection)
        if (frameTime > this.maxFrameTime) {
            frameTime = this.maxFrameTime;
        }

        this.accumulator += frameTime;

        // Fixed update loop
        while (this.accumulator >= this.fixedDelta) {
            this.update(this.fixedDelta / 1000);
            this.accumulator -= this.fixedDelta;
        }

        const alpha = this.accumulator / this.fixedDelta;
        this.render(alpha, timestamp, frameTime);

        this.input.endFrame();

        requestAnimationFrame(this.loop);
    }

    update(dt) {
    	this.currentUpdateFPS = 1 / dt;
        
        // if (this.input.isKeyDown("KeyW") || this.input.isKeyDown("ArrowUp")) this.player.d = 3;

    	// update player
    	let playerVelNeedsDiv = false;
        if (this.input.isKeyDown("KeyW")) {
        	this.myPlayer.acc.x += Math.cos(this.myPlayer.rotX)*0.005;
        	this.myPlayer.acc.y += Math.sin(this.myPlayer.rotX)*0.005;
        	playerVelNeedsDiv = true;
        }
        else if (this.input.isKeyDown("KeyS")) {
        	this.myPlayer.acc.x -= Math.cos(this.myPlayer.rotX)*0.005;
        	this.myPlayer.acc.y -= Math.sin(this.myPlayer.rotX)*0.005;
        	playerVelNeedsDiv = true;
        }
        if (this.input.isKeyDown("KeyA")) {
        	if (playerVelNeedsDiv) {
				this.myPlayer.acc.x *= 0.5;
				this.myPlayer.acc.y *= 0.5;
				this.myPlayer.acc.x -= 0.5*Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        		this.myPlayer.acc.y -= 0.5*Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        		this.myPlayer.acc.x *= 1.4142135623730951;
				this.myPlayer.acc.y *= 1.4142135623730951;
        	} else {
        		this.myPlayer.acc.x -= Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        		this.myPlayer.acc.y -= Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        	}
        }
        else if (this.input.isKeyDown("KeyD")) {
        	if (playerVelNeedsDiv) {
				this.myPlayer.acc.x *= 0.5;
				this.myPlayer.acc.y *= 0.5;
				this.myPlayer.acc.x += 0.5*Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        		this.myPlayer.acc.y += 0.5*Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        		this.myPlayer.acc.x *= 1.4142135623730951;
				this.myPlayer.acc.y *= 1.4142135623730951;
        	} else {
        		this.myPlayer.acc.x += Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        		this.myPlayer.acc.y += Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005;
        	}
        }

        if (this.input.isKeyDown("ArrowLeft")) this.myPlayer.rotAccX -= 0.015 * this.sensitivity;
        if (this.input.isKeyDown("ArrowRight")) this.myPlayer.rotAccX += 0.015 * this.sensitivity;

        this.myPlayer.pos.x += this.myPlayer.vel.x; // pos
        this.myPlayer.pos.y += this.myPlayer.vel.y;
        this.myPlayer.vel.x += this.myPlayer.acc.x; // vel
        this.myPlayer.vel.y += this.myPlayer.acc.y;
        this.myPlayer.vel.x *= 0.9;
        this.myPlayer.vel.y *= 0.9;
        this.myPlayer.acc.x = 0;                    // acc reset
        this.myPlayer.acc.y = 0;

        // collision
        const num_collision_rays = 10;
        const num_collision_rays_negOne = 1/num_collision_rays;
        for (let i = 0; i < num_collision_rays; i++) { // cast rays around the player and see how far you are from walls
        	let a = i / num_collision_rays * 2 * Math.PI;
        	let d = new Point(Math.cos(a), Math.sin(a));
        	let cast = this.myMaze.tree.raycast(this.myPlayer.pos, d);

        	if (cast != null && cast.t <= this.myPlayer.radius) {
        		// let d2 = new Point(cast.point.x - this.myPlayer.pos.x, cast.point.y - this.myPlayer.pos.y)
        		this.myPlayer.pos.x -= d.x*cast.t*num_collision_rays_negOne;
        		this.myPlayer.pos.y -= d.y*cast.t*num_collision_rays_negOne;
        		this.myPlayer.vel.x *= Math.abs(d.y); // this wall sliding does not take into accoun what angle the wall is at (axis-aligned walls only)
        		this.myPlayer.vel.y *= Math.abs(d.x);
        	}
        }

        this.myPlayer.rotX = mod(this.myPlayer.rotX + this.myPlayer.rotVelX, 2*Math.PI); // rot pos
        this.myPlayer.rotY = mod(this.myPlayer.rotY + this.myPlayer.rotVelY, 2*Math.PI);
        this.myPlayer.rotVelX += this.myPlayer.rotAccX;                                  // rot vel
        this.myPlayer.rotVelY += this.myPlayer.rotAccY;
        this.myPlayer.rotVelX *= 0.8;
        this.myPlayer.rotVelY *= 0.8;
        this.myPlayer.rotAccX = 0;                                                       // rot acc reset
        this.myPlayer.rotAccY = 0;                                                       // rot acc reset


        if (this.input.isPointerLocked) {
	        // Use raw deltas for camera view changes
	        this.player.rotationY += this.input.mouse.moveX * this.sensitivity;
	        this.player.rotationX += this.input.mouse.moveY * this.sensitivity;
	    }

    	if (this.input.mouse.buttonsDown.has(0) || this.input.touches.size > 0) {
    		let canBRect = this.area.canvas.getBoundingClientRect();
        	this.input.mouse.mx = Math.round((this.input.getPointer().x - canBRect.left)*(this.area.ctx.width / canBRect.width));
        	this.input.mouse.my = Math.round((this.input.getPointer().y - canBRect.top)*(this.area.ctx.height / canBRect.height));


			// let lastLineI = this.linePoints.length - 1;
			// let lastLinePointI = this.linePoints[lastLineI].raw.length - 1;

			// if (this.linePoints[lastLineI].raw.length > 0) {
    		// 	let dx = this.linePoints[lastLineI].raw[lastLinePointI].x - this.input.mouse.mx;
    		// 	let dy = this.linePoints[lastLineI].raw[lastLinePointI].y - this.input.mouse.my;
    		// 	let dh = Math.sqrt(dx * dx + dy * dy);

    		// 	if (dh > 5) { // the distance before a new point is created
    		// 		this.linePoints[lastLineI].raw.push(new Point(this.input.mouse.mx, this.input.mouse.my));
    		// 	}
    		// } else {
    		// 	this.linePoints[lastLineI].raw.push(new Point(this.input.mouse.mx, this.input.mouse.my));
    		// }
    	} else if (this.input.mouse.buttonsReleased.has(0) || this.input.touchReleased.size > 0) {
    		// this.linePoints[this.linePoints.length-1].process(this.penBase);

    		// this.linePoints.push(new Stroke());
    		// this.path.push([]);

    		// while (this.linePoints.length > 2) this.linePoints.splice(0,1); // keep only one Stroke
    		// while (this.path.length > 2) this.path.splice(0,1);
    	}
    }

    render(alpha, timestamp, frameTime) { // finalColor = color * alpha + background * (1 - alpha)
        const ctx = this.area.ctx;
        this.currentRenderFPS = 1000/frameTime;

        // Clear
        ctx.clearRect(0, 0, ctx.width, ctx.height);

        // raycast scene
        // https://www.desmos.com/notebook/jequqkbjby
        // fixed x, fish-eye-fixed, stereographic projection
        const FOV = 90;
        const RAY_NUMBER = 200;

        const FOV_RAD = FOV * Math.PI / 180;
        const FOV_RAD_2 = FOV_RAD * 0.5;
        const DELTA_FOV = FOV_RAD / RAY_NUMBER;
        const SCREEN_WIDTH = this.area.canvas.width;
        const SCREEN_HEIGHT = this.area.canvas.height;
        const BAR_WIDTH = SCREEN_WIDTH / RAY_NUMBER;
        const F = (SCREEN_WIDTH * 0.25) / Math.tan(FOV_RAD * 0.25);
        // let lineX = F * Math.tan(rayAngDiffCenter);

        for (let i = 0; i < RAY_NUMBER; i++) {
        	const rayAng = this.myPlayer.rotX - FOV_RAD_2 + i * DELTA_FOV;

        	const dir = new Point(
        		Math.cos(rayAng),
        		Math.sin(rayAng)
        	);

        	let cast = this.myMaze.tree.raycast(
        		this.myPlayer.pos,
        		dir
        	);

        	// Test if quad tree is really the problem
        	// let cast = {t: Infinity, point: new Point(0,0)};
        	// for (const s of this.myMaze.segments) {
        	// 	let d = raySegment(this.myPlayer.pos, dir, s);
        	// 	if (d != null && cast.t > d.t) cast = d;
        	// }

        	if (cast != null) {
        		const angDiff = rayAng - this.myPlayer.rotX;
        		const dist = cast.t * Math.cos(angDiff);
        		const H = F / dist;

        		const x = floor(i * BAR_WIDTH);
				const x1 = floor((i + 1) * BAR_WIDTH);
        		const y = (SCREEN_HEIGHT - H) * 0.5;

        		const wallDelta = new Point(cast.segment.p1.x - cast.segment.p2.x, cast.segment.p1.y - cast.segment.p2.y);

        		let brightness = Math.max(10, Math.min(255, 255 - dist * 40));
        		let R = brightness;
        		let G = brightness;
        		let B = brightness;
        		if (wallDelta.x >= wallDelta.y) {
        			R *= 0.8;
        			G *= 0.8;
        		} else {
        			B *= 0.8;
        			G *= 0.8;
        		}
        		if (floor((cast.point.x + cast.point.y)*5) % 2 == 0) G *= 0.5; // vertical stripes in walls
				ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        		ctx.fillRect(x, y, x1 - x, H);
        	}
        }


        // Draw top down maze
        if (this.drawMiniMap) {
	        const MAZE_SCALE = 30;
	        const MAZE_START = new Point(this.area.canvas.width - MAZE_SCALE*this.myMaze.width - 10, 10);
	        ctx.fillStyle = "#cdcd9a";
	        ctx.fillRect(MAZE_START.x, MAZE_START.y, this.myMaze.width * MAZE_SCALE, this.myMaze.height * MAZE_SCALE);
	        
	        // draw top down player on maze
	        ctx.fillStyle = "#1e1e1e";
	        ctx.strokeStyle = "#ff1e1e";
	        ctx.lineWidth = "3";
	     	ctx.beginPath();
			ctx.arc(MAZE_START.x + (this.myPlayer.pos.x) * MAZE_SCALE, MAZE_START.y + (this.myPlayer.pos.y) * MAZE_SCALE, MAZE_SCALE*this.myPlayer.radius, 0, Math.PI*2);
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(MAZE_START.x + (this.myPlayer.pos.x) * MAZE_SCALE, MAZE_START.y + (this.myPlayer.pos.y) * MAZE_SCALE);
			ctx.lineTo(MAZE_START.x + (this.myPlayer.pos.x + Math.cos(this.myPlayer.rotX)) * MAZE_SCALE, MAZE_START.y + (this.myPlayer.pos.y + Math.sin(this.myPlayer.rotX)) * MAZE_SCALE);
			ctx.stroke();

	    	ctx.strokeStyle = "#9a9acd";
	    	ctx.lineWidth = "5";
	        for (const s of this.myMaze.segments) {
	        	ctx.beginPath();
	        	ctx.moveTo(s.p1.x * MAZE_SCALE + MAZE_START.x, s.p1.y * MAZE_SCALE + MAZE_START.y);
	        	ctx.lineTo(s.p2.x * MAZE_SCALE + MAZE_START.x, s.p2.y * MAZE_SCALE + MAZE_START.y);
	        	ctx.stroke();
	        }

	        // draw quad tree
	        let i = 0;
	        let bounds = [this.myMaze.tree.root];
	        while (true) {
	        	if (bounds[i] == undefined) break;
	        	if (bounds[i].children != null) {
	        		for (let j = 0; j < bounds[i].children.length; j++) {
	        			bounds.push(bounds[i].children[j]);
	        		}
	        	}
	        	i++;
	        }
	        for (let i = 0; i < bounds.length; i++) {
	        	ctx.strokeStyle = `rgba(${floor(i/bounds.length * 255)},100,100, 0.5)`;
				ctx.strokeRect(MAZE_START.x + (bounds[i].bounds.min.x) * MAZE_SCALE, MAZE_START.y + (bounds[i].bounds.min.y) * MAZE_SCALE, (bounds[i].bounds.max.x - bounds[i].bounds.min.x) * MAZE_SCALE, (bounds[i].bounds.max.y - bounds[i].bounds.min.y) * MAZE_SCALE);
	        }
	    }


        // Debug info
        // ctx.fillStyle = "white";
        // ctx.font = "60px monospace";
        // ctx.fillText(`R_FPS: ${this.currentRenderFPS.toFixed(0)}`, 10, 60);
        // let canBRect = this.area.canvas.getBoundingClientRect();
        // ctx.fillText(`Mouse: (${Math.round((this.input.getPointer().x - canBRect.left)*(ctx.width / canBRect.width))}, ${Math.round((this.input.getPointer().y - canBRect.top)*(ctx.height / canBRect.height))})`, 10, 40);
    }
}


function startGame() {
	const game = new Game();
}

startGame();
