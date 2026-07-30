
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
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            this.swipe.x = e.clientX;
		    this.swipe.y = e.clientY;
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
	}
}


class Game {
    constructor() {
    	this.area = new GameArea();

    	// the maze
    	this.myMaze = new Maze(10, 10);

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

        // Draw top down maze
        const MAZE_SCALE = 90;
        const MAZE_START = new Point(100, 100);
        ctx.fillStyle = "#cdcd9a";
        ctx.fillRect(MAZE_START.x, MAZE_START.y, this.myMaze.width * MAZE_SCALE, this.myMaze.height * MAZE_SCALE);
        ctx.fillStyle = "#1e1e1e";
        for (let i = 0; i < this.myMaze.width; i++) {
        	for (let j = 0; j < this.myMaze.height; j++) {
        		ctx.beginPath();
        		ctx.arc(MAZE_START.x + (i+0.5) * MAZE_SCALE, MAZE_START.y + (j+0.5) * MAZE_SCALE, MAZE_SCALE*0.2, 0, Math.PI*2);
        		ctx.fill();
        	}
        }

    	ctx.strokeStyle = "#9a9acd";
    	ctx.lineWidth = "5";
        for (const s of this.myMaze.segments) {
        	ctx.beginPath();
        	ctx.moveTo(s.p1.x * MAZE_SCALE + MAZE_START.x, s.p1.y * MAZE_SCALE + MAZE_START.y);
        	ctx.lineTo(s.p2.x * MAZE_SCALE + MAZE_START.x, s.p2.y * MAZE_SCALE + MAZE_START.y);
        	ctx.stroke();
        }

        // Debug info
        ctx.fillStyle = "white";
        ctx.font = "60px monospace";
        ctx.fillText(`R_FPS: ${this.currentRenderFPS.toFixed(0)}`, 10, 60);
        // let canBRect = this.area.canvas.getBoundingClientRect();
        // ctx.fillText(`Mouse: (${Math.round((this.input.getPointer().x - canBRect.left)*(ctx.width / canBRect.width))}, ${Math.round((this.input.getPointer().y - canBRect.top)*(ctx.height / canBRect.height))})`, 10, 40);
    }
}


function startGame() {
	const game = new Game();
}

startGame();
