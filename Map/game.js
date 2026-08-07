
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
		this.vsSource = `#version 300 es
		in vec2 position;
		out vec2 vTexCoord;
		void main() {
		    // Maps positions from clip space [-1,1] to texture space [0,1]
		    vTexCoord = position * 0.5 + 0.5;
		    // Invert Y axis because WebGL textures are upside down by default
		    vTexCoord.y = 1.0 - vTexCoord.y; 
		    gl_Position = vec4(position, 0.0, 1.0);
		}`;

		this.fsSource = `#version 300 es
		precision highp float;
		in vec2 vTexCoord;
		uniform sampler2D uTexture;
		out vec4 fragColor;
		void main() {
		    fragColor = texture(uTexture, vTexCoord);
		}`;

		this.canvas.style.background = "#1e1e1e";
		this.canvas.style.padding = "0px";
		this.canvas.style.margin = "0px";

		this.resizeCanvasFunction();
		window.addEventListener("resize", this.resizeCanvasFunction);

		if (document.body.childNodes.length >= 1) { // make sure the canvas is the first thing you see
			document.body.insertBefore(this.canvas, document.body.childNodes[0]);
		} else {
			document.body.appendChild(this.canvas);
		}

		this.gl = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");
		this.initWebGLPipeline();
		// this.ctx = this.canvas.getContext("2d");
		// this.ctx.width = this.canvas.width;
		// this.ctx.height = this.canvas.height;

		this.isLittleEndian = (() => {
		    const buffer = new ArrayBuffer(2);
		    new Uint16Array(buffer)[0] = 0x2442;
		    return new Uint8Array(buffer)[0] === 0x42;
		})();

		this.buffer = new ArrayBuffer(this.canvas.width * this.canvas.height * 4);
		this.data8 = new Uint8ClampedArray(this.buffer);
		this.data32 = new Uint32Array(this.buffer);
		this.gl.readPixels(0,0, this.canvas.width, this.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data8);

		// WebGL

		this.texture = this.gl.createTexture();

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

		this.gl.texParameteri(this.gl.TEXTURE_2D,
		    this.gl.TEXTURE_MIN_FILTER,
		    this.gl.NEAREST);

		this.gl.texParameteri(this.gl.TEXTURE_2D,
		    this.gl.TEXTURE_MAG_FILTER,
		    this.gl.NEAREST);

		this.gl.texParameteri(this.gl.TEXTURE_2D,
		    this.gl.TEXTURE_WRAP_S,
		    this.gl.CLAMP_TO_EDGE);

		this.gl.texParameteri(this.gl.TEXTURE_2D,
		    this.gl.TEXTURE_WRAP_T,
		    this.gl.CLAMP_TO_EDGE);

		this.gl.texImage2D(
		    this.gl.TEXTURE_2D,
		    0,
		    this.gl.RGBA,
		    this.canvas.width,
		    this.canvas.height,
		    0,
		    this.gl.RGBA,
		    this.gl.UNSIGNED_BYTE,
		    null // this.data8
		);
	}

	initWebGLPipeline() {
		const gl = this.gl;

		// create and compile shaders
		const vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, this.vsSource);
		gl.compileShader(vs);

		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, this.fsSource);
		gl.compileShader(fs);

		// link shader program
		this.shaderProgram = gl.createProgram();
		gl.attachShader(this.shaderProgram, vs);
		gl.attachShader(this.shaderProgram, fs);
		gl.linkProgram(this.shaderProgram);

		// full-screen quad geometry
		const vertices = new Float32Array([
			-1.0, -1.0,  1.0, -1.0,  -1.0, 1.0,
			-1.0,  1.0,  1.0, -1.0,   1.0, 1.0
		]);

		this.quadVAO = gl.createVertexArray();
		const vbo = gl.createBuffer();

		gl.bindVertexArray(this.quadVAO);
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		// get position attribute index from shader and enable it
		const positionLoc = gl.getAttribLocation(this.shaderProgram, "position");
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		// clean up bindings safely
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	clearBuffer() {
		// let r = 30;
		// let g = 30;
		// let b = 30;
		// let a = 255;

		if (this.isLittleEndian)  { // a b g r (little endian)
			// for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
			// 	this.data32[i] = -14803426; // (a << 24) | (b << 16) | (g << 8) | (r);
			// }
			this.data32.fill(-14803426);
		} else {                    // r g b a (big endian)
			// for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
			// 	this.data32[i] = 505290495; // (r << 24) | (g << 16) | (b << 8) | (a);
			// }
			this.data32.fill(505290495);
		}
	}

	setBufferPixel(x,y, r,g,b, a=255) {
		if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) return;
		r = clamp(r, 0, 255);
		g = clamp(g, 0, 255);
		b = clamp(b, 0, 255);
		a = clamp(a, 0, 255);

		// const i = (y*this.canvas.width + x) * 4;
		// data[i + 0] = r;
		// data[i + 1] = g;
		// data[i + 2] = b;
		// data[i + 3] = a;

		if (this.isLittleEndian) // a b g r (little endian)
			this.data32[y*this.canvas.width + x] = (a << 24) | (b << 16) | (g << 8) | (r);
		else                     // r g b a (big endian)
			this.data32[y*this.canvas.width + x] = (r << 24) | (g << 16) | (b << 8) | (a);

	}

	renderBuffer() {
		// this.imgData.data.set(this.data8);
		// this.ctx.putImageData(this.imgData, 0, 0);

		// pass data to webgpu
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.texSubImage2D(
		    this.gl.TEXTURE_2D, 0, 0, 0,
		    this.canvas.width, this.canvas.height,
		    this.gl.RGBA, this.gl.UNSIGNED_BYTE,
		    this.data8
		);

		// viewport dimensions
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

		// clear gpu frame
		this.gl.clearColor(0.0,0.0,0.0,1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		// activate shader program
		this.gl.useProgram(this.shaderProgram);
		this.gl.bindVertexArray(this.quadVAO);

		// draw geometry to screen
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
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
    	this.myMaze = new Maze(10, 10, 0);
    	this.myPlayer = {pos: new Point(0.5,0.5),  // world pos
    					 vel: new Point(0,0),  // velocity
    					 acc: new Point(0,0),  // acceleration
    					 rotX: 0.7853981633974483,
    					 rotY: 0,
    					 rotVelX: 0,
    					 rotVelY: 0,
    					 rotAccX: 0,
    					 rotAccY: 0,
    					 radius: 0.2,
    					 ZPOS: 0.5,
    					 velMult: 1};
    	this.drawMiniMap = false;

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

    	// debug keybinds
        if (this.input.isKeyDown("KeyQ")) throw "Q was pressed, forced stop initiated :)";
        if (this.input.isKeyDown("KeyR")) this.myMaze.generate(0.1);

    	// update player
    	let playerVelNeedsDiv = false;
        if (this.input.isKeyDown("KeyW")) {
        	this.myPlayer.acc.x += Math.cos(this.myPlayer.rotX)*0.005 * this.myPlayer.velMult;
        	this.myPlayer.acc.y += Math.sin(this.myPlayer.rotX)*0.005 * this.myPlayer.velMult;
        	playerVelNeedsDiv = true;
        }
        else if (this.input.isKeyDown("KeyS")) {
        	this.myPlayer.acc.x -= Math.cos(this.myPlayer.rotX)*0.005 * this.myPlayer.velMult;
        	this.myPlayer.acc.y -= Math.sin(this.myPlayer.rotX)*0.005 * this.myPlayer.velMult;
        	playerVelNeedsDiv = true;
        }
        if (this.input.isKeyDown("KeyA")) {
        	if (playerVelNeedsDiv) {
				this.myPlayer.acc.x *= 0.5;
				this.myPlayer.acc.y *= 0.5;
				this.myPlayer.acc.x -= 0.5*Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        		this.myPlayer.acc.y -= 0.5*Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        		this.myPlayer.acc.x *= 1.4142135623730951;
				this.myPlayer.acc.y *= 1.4142135623730951;
        	} else {
        		this.myPlayer.acc.x -= Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        		this.myPlayer.acc.y -= Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        	}
        }
        else if (this.input.isKeyDown("KeyD")) {
        	if (playerVelNeedsDiv) {
				this.myPlayer.acc.x *= 0.5;
				this.myPlayer.acc.y *= 0.5;
				this.myPlayer.acc.x += 0.5*Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        		this.myPlayer.acc.y += 0.5*Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        		this.myPlayer.acc.x *= 1.4142135623730951;
				this.myPlayer.acc.y *= 1.4142135623730951;
        	} else {
        		this.myPlayer.acc.x += Math.cos(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        		this.myPlayer.acc.y += Math.sin(this.myPlayer.rotX + 1.5707963267948966)*0.005 * this.myPlayer.velMult;
        	}
        }


        if (this.input.isKeyDown("KeyC")) {
        	// crouch
        	this.myPlayer.ZPOS = 0.25;
        	this.myPlayer.velMult = 0.5;
        } else if (this.input.isKeyDown("ShiftLeft") && Math.abs(this.myPlayer.vel.x) + Math.abs(this.myPlayer.vel.y) > 10e-3) {
        	// sprint
        	this.myPlayer.ZPOS = 0.55;
        	this.myPlayer.velMult = 1.35;
        } else {
        	// normal
        	this.myPlayer.ZPOS = 0.5;
        	this.myPlayer.velMult = 1.0;
        }

        if (this.input.isKeyDown("ArrowLeft") || this.input.isKeyDown("KeyJ")) this.myPlayer.rotAccX -= 0.015 * this.sensitivity;
        if (this.input.isKeyDown("ArrowRight") || this.input.isKeyDown("KeyL")) this.myPlayer.rotAccX += 0.015 * this.sensitivity;
        if (this.input.isKeyDown("ArrowUp") || this.input.isKeyDown("KeyI")) this.myPlayer.rotAccY += 0.01 * this.sensitivity;
        if (this.input.isKeyDown("ArrowDown") || this.input.isKeyDown("KeyK")) this.myPlayer.rotAccY -= 0.01 * this.sensitivity;

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
        const num_collision_rays_negOne = 1/(num_collision_rays+1);
        for (let i = 0; i < num_collision_rays; i++) { // cast rays around the player and see how far you are from walls
        	let a = i / num_collision_rays * 2 * Math.PI;
        	let d = new Point(Math.cos(a), Math.sin(a));
        	let cast = this.myMaze.tree.raycastNearest(this.myPlayer.pos, d);

        	if (cast != null && cast.t <= this.myPlayer.radius) {
        		let n = cast.segment.normal;
        		
        		// Vector from wall to player
				let wx = this.myPlayer.pos.x - cast.point.x;
				let wy = this.myPlayer.pos.y - cast.point.y;
				if (wx * n.x + wy * n.y > 0) {
				    n = new Point(-n.x, -n.y);
				}

        		this.myPlayer.pos.x -= n.x*(this.myPlayer.radius - cast.t + 1e-6);
        		this.myPlayer.pos.y -= n.y*(this.myPlayer.radius - cast.t + 1e-6);
        		let vn = this.myPlayer.vel.x * n.x + this.myPlayer.vel.y * n.y;
				if (vn < 1e-6) {
				    this.myPlayer.vel.x -= vn * n.x;
				    this.myPlayer.vel.y -= vn * n.y;
				}
        	}
        }

        this.myPlayer.rotX = mod(this.myPlayer.rotX + this.myPlayer.rotVelX, 2*Math.PI); // rot pos
        this.myPlayer.rotY = clamp(this.myPlayer.rotY + this.myPlayer.rotVelY, -Math.PI/7, Math.PI/7);
        this.myPlayer.rotVelX += this.myPlayer.rotAccX;                                  // rot vel
        this.myPlayer.rotVelY += this.myPlayer.rotAccY;
        this.myPlayer.rotVelX *= 0.8;
        this.myPlayer.rotVelY *= 0.8;
        this.myPlayer.rotAccX = 0;                                                       // rot acc reset
        this.myPlayer.rotAccY = 0;                                                       // rot acc reset


        if (this.input.isPointerLocked) { // doesn't work on all devices? why?
	        // Use raw deltas for camera view changes
	        this.myPlayer.rotX += this.input.mouse.moveX * this.sensitivity * 0.005;
	        this.myPlayer.rotY -= this.input.mouse.moveY * this.sensitivity * 0.005;
	    }

    	if (this.input.mouse.buttonsDown.has(0) || this.input.touches.size > 0) {
    		let canBRect = this.area.canvas.getBoundingClientRect();
        	this.input.mouse.mx = Math.round((this.input.getPointer().x - canBRect.left)*(this.area.canvas.width / canBRect.width));
        	this.input.mouse.my = Math.round((this.input.getPointer().y - canBRect.top)*(this.area.canvas.height / canBRect.height));


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

    drawVisiblePart(
	    x,
	    wallTop,
	    wallBottom,
	    visible,
	    dist,
	    BAR_WIDTH
	) {
	    for (let i = 0; i < visible.length; ++i) {
	        const region = visible[i];

	        const top = Math.max(region.top, wallTop);
	        const bottom = Math.min(region.bottom, wallBottom);

	        if (top >= bottom)
	            continue;

	        this.drawWallColumn(
	            x,
	            top,
	            bottom,
	            wallTop,
	            wallBottom,
	            dist,
	            BAR_WIDTH
	        );

	        const replacement = [];

	        if (region.top < wallTop)
	            replacement.push({
	                top: region.top,
	                bottom: wallTop,
	                dist: dist
	            });

	        if (wallBottom < region.bottom)
	            replacement.push({
	                top: wallBottom,
	                bottom: region.bottom,
	                dist: dist
	            });

	        visible.splice(i, 1, ...replacement);

	        i += replacement.length - 1;
	    }
	}

	drawWallColumn(x, top, bottom, wallTop, wallBottom, dist, BAR_WIDTH) {
		this.area.ctx.fillRect(x, top, BAR_WIDTH, bottom - top);
	}

    render(alpha, timestamp, frameTime) { // finalColor = color * alpha + background * (1 - alpha)
        const ctx = this.area.ctx;
        this.currentRenderFPS = 1000/frameTime;

        if (false) { // temp
        // Clear
        ctx.clearRect(0, 0, ctx.width, ctx.height);

        // raycast scene
        // https://www.desmos.com/notebook/jequqkbjby
        // fixed x, fish-eye-fixed, stereographic projection
        const FOV = 90;
        const RAY_NUMBER = 100;

        const RAY_NUMBER_2 = floor(RAY_NUMBER / 2);
        const FOV_RAD = FOV * Math.PI / 180;
        const FOV_RAD_2 = FOV_RAD * 0.5;
        const DELTA_FOV = FOV_RAD / RAY_NUMBER;
        const SCREEN_WIDTH = this.area.canvas.width;
        const SCREEN_HEIGHT = this.area.canvas.height;
        const BAR_WIDTH = SCREEN_WIDTH / RAY_NUMBER;
        const BAR_HEIGHT = SCREEN_HEIGHT / RAY_NUMBER;
        const F = (SCREEN_WIDTH * 0.25) / Math.tan(FOV_RAD * 0.25);
		const pitch = this.myPlayer.rotY * F;
		const horizon = SCREEN_HEIGHT * 0.5 + pitch;

    	const floorStart = Math.max(horizon, 0); // floor
		const floorEnd = SCREEN_HEIGHT;
		const floorHeight = floorEnd - floorStart;
		const ceilStart = 0; // ceil
		const ceilEnd = Math.min(horizon, SCREEN_HEIGHT);
		const ceilHeight = ceilEnd - ceilStart;

        // floor / ceiling
        for (let i = 0; i < RAY_NUMBER_2; i++) {
        	// idk if this helped, but I refrenced it:  https://lodev.org/cgtutor/raycasting2.html
			const y = floorStart + (i / RAY_NUMBER_2) * floorHeight;
			const y1 = floorStart + ((i + 1) / RAY_NUMBER_2) * floorHeight;

        	const cameraZ = this.myPlayer.ZPOS;
			
			// one
			const p = y - horizon; // distance from horizon
			if (p <= 0) continue; // skip over invalid numbers (1/0 = undefined  and  p < 0 = ceil)

			const rowDist = (cameraZ * F) / p; // world distance to floor

			// two
			const dirX = Math.cos(this.myPlayer.rotX);
			const dirY = Math.sin(this.myPlayer.rotX);

			const planeX = -dirY * Math.tan(FOV_RAD_2);
			const planeY =  dirX * Math.tan(FOV_RAD_2);

			const rayDirX0 = dirX - planeX;
			const rayDirY0 = dirY - planeY;

			const rayDirX1 = dirX + planeX;
			const rayDirY1 = dirY + planeY;

			// three
			const stepX = rowDist * (rayDirX1 - rayDirX0) / SCREEN_WIDTH;
			const stepY = rowDist * (rayDirY1 - rayDirY0) / SCREEN_WIDTH;

			let floorX = this.myPlayer.pos.x + rowDist * rayDirX0;
			let floorY = this.myPlayer.pos.y + rowDist * rayDirY0;

			const ceilY = ceilStart + (i / RAY_NUMBER_2) * ceilHeight;
			const ceilY1 = ceilStart + ((i + 1) / RAY_NUMBER_2) * ceilHeight;
			const rowDistC = ((1 - cameraZ) * F) / (horizon - ceilY); // world distance to floor

			// four
			// for (let i = 0; i < RAY_NUMBER; i++) {
			// 	const x = floor(i * BAR_WIDTH);
			// 	const x1 = floor((i + 1) * BAR_WIDTH);

			// 	const cellX = floor(floorX);
			// 	const cellY = floor(floorY);

			// 	const tx = floorX - cellX; // fract
			// 	const ty = floorY - cellY;

			// 	// sample texture

			// 	floorX += stepX;
			// 	floorY += stepY;

			// 	const light = 1 / (1 + rowDist * 0.7)
			// 	const light2 = 1 / (1 + rowDistC * 0.7)
			// 	ctx.fillStyle = `rgb(30, ${((cellX)%2 == 0 ? 30 : 100)}, ${clamp(light*255, 30, 255)})`;
	        // 	ctx.fillRect(x, floor(y), x1 - x, floor(y1) - floor(y)); // floor
			// 	ctx.fillStyle = `rgb(${clamp(light2*255, 30, 255)}, 30, 30)`;
	        // 	ctx.fillRect(x, floor(ceilY), x1 - x, floor(ceilY1) - floor(ceilY)); // ceil
			// }

			// scanlines
			const light = 1 / (1 + rowDist * 0.7)
			const light2 = 1 / (1 + rowDistC * 0.7)
			ctx.fillStyle = `rgb(30, 30, ${clamp(light*255, 30, 255)})`;
        	ctx.fillRect(0, floor(y), SCREEN_WIDTH, floor(y1) - floor(y)); // floor
			ctx.fillStyle = `rgb(${clamp(light2*255, 30, 255)}, 30, 30)`;
        	ctx.fillRect(0, floor(ceilY), SCREEN_WIDTH, floor(ceilY1) - floor(ceilY)); // ceiling
        }

        // walls
        for (let i = 0; i < RAY_NUMBER; i++) {
        	const rayAng = this.myPlayer.rotX - FOV_RAD_2 + i * DELTA_FOV;

        	const dir = new Point(
        		Math.cos(rayAng),
        		Math.sin(rayAng)
        	);

        	let hits = this.myMaze.tree.raycast(
        		this.myPlayer.pos,
        		dir
        	);

        	if (hits != null && hits.length > 0) {
        		const angDiff = rayAng - this.myPlayer.rotX;
        		const x = floor(i * BAR_WIDTH);
				const x1 = floor((i + 1) * BAR_WIDTH);
	        	const cameraZ = this.myPlayer.ZPOS;
	        	// const horizon = SCREEN_HEIGHT * (0.5 + Math.sin(this.myPlayer.rotY));
        		let visible = [{top:0, bottom:SCREEN_HEIGHT, dist:-1}];
        		
        		for (const hit of hits) {
	        		const dist = hit.t * Math.cos(angDiff);
	        		const H = F / dist;
        			const seg = hit.segment;

	        		const wallH = seg.ceiling - seg.floor;

	        		const wallT = horizon - (seg.ceiling - cameraZ) * H;
	        		const wallB = horizon - (seg.floor - cameraZ) * H;
	        		const drawH = wallH * H;


	        		// let brightness = Math.max(10, Math.min(255, 255 - dist * 40));
	        		let brightness = Math.max(0.04, Math.min(1, 1 - dist * 0.156))
	        		let R = brightness;
	        		let G = brightness;
	        		let B = brightness;
	        		let stripe = floor((hit.point.x + hit.point.y)*seg.texture[6]) % 2 == 0 ? 1 : 0;
        			R *= seg.texture[0+3*stripe];
        			G *= seg.texture[1+3*stripe];
        			B *= seg.texture[2+3*stripe];
	        		if (Math.abs(seg.normal.x) > Math.abs(seg.normal.y)) {
	        			R *= 0.8;
	        			G *= 0.8;
	        			B *= 0.8;
	        		} else {
	        			R *= 1.2;
	        			G *= 1.2;
	        			B *= 1.2;
	        		}
	        		R = Math.max(30, Math.min(255, R));
	        		G = Math.max(30, Math.min(255, G));
	        		B = Math.max(30, Math.min(255, B));
					ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;

	        		this.drawVisiblePart(x, wallT, wallB, visible, dist, x1 - x);
	        	}
        	}
        }

        // Top-down maze
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
	        // let i = 0;
	        // let bounds = [this.myMaze.tree.root];
	        // while (true) {
	        // 	if (bounds[i] == undefined) break;
	        // 	if (bounds[i].children != null) {
	        // 		for (let j = 0; j < bounds[i].children.length; j++) {
	        // 			bounds.push(bounds[i].children[j]);
	        // 		}
	        // 	}
	        // 	i++;
	        // }
	        // for (let i = 0; i < bounds.length; i++) {
	        // 	ctx.strokeStyle = `rgba(${floor(i/bounds.length * 255)},100,100, 0.5)`;
			// 	ctx.strokeRect(MAZE_START.x + (bounds[i].bounds.min.x) * MAZE_SCALE, MAZE_START.y + (bounds[i].bounds.min.y) * MAZE_SCALE, (bounds[i].bounds.max.x - bounds[i].bounds.min.x) * MAZE_SCALE, (bounds[i].bounds.max.y - bounds[i].bounds.min.y) * MAZE_SCALE);
	        // }
	    }
		} // temp


		this.area.clearBuffer();
		for (let x = 100; x < 300; x++)
			for (let y = 200; y < 500; y++)
				this.area.setBufferPixel(x, y, 200, 200, 255, 255);
		this.area.renderBuffer();

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
