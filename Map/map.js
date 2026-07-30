class Maze {
	constructor(w, h, cellW = 1, cellH = 1) {
		this.width = w;
		this.height = h;
		this.width += (1-this.width % 2); // add one if needed (to make width an odd number)
		this.height += (1-this.height % 2);

		this.cellWidth = cellW;
		this.cellHeight = cellH;

		this.generate(0.1);
	}

	_mergeSegmentsYAxis() {
	    let result = [];

	    for (let s of this.segments) {
	        let merged = false;

	        for (let r of result) {
	            // same y, touching horizontally
	            if (
	                r.p1.y === r.p2.y &&
	                s.p1.y === s.p2.y &&
	                r.p1.y === s.p1.y
	            ) {
	                let min1 = Math.min(r.p1.x, r.p2.x);
	                let max1 = Math.max(r.p1.x, r.p2.x);

	                let min2 = Math.min(s.p1.x, s.p2.x);
	                let max2 = Math.max(s.p1.x, s.p2.x);

	                if (max1 >= min2 && max2 >= min1) {
	                    r.p1.x = Math.min(min1, min2);
	                    r.p2.x = Math.max(max1, max2);
	                    merged = true;
	                    break;
	                }
	            }
	        }

	        if (!merged)
	            result.push(s);
	    }

	    this.segments = result;
	}

	_mergeSegmentsXAxis() {
	    let result = [];

	    for (let s of this.segments) {
	        let merged = false;

	        for (let r of result) {
	            // same x, touching horizontally
	            if (
	                r.p1.x === r.p2.x &&
	                s.p1.x === s.p2.x &&
	                r.p1.x === s.p1.x
	            ) {
	                let min1 = Math.min(r.p1.y, r.p2.y);
	                let max1 = Math.max(r.p1.y, r.p2.y);

	                let min2 = Math.min(s.p1.y, s.p2.y);
	                let max2 = Math.max(s.p1.y, s.p2.y);

	                if (max1 >= min2 && max2 >= min1) {
	                    r.p1.y = Math.min(min1, min2);
	                    r.p2.y = Math.max(max1, max2);
	                    merged = true;
	                    break;
	                }
	            }
	        }

	        if (!merged)
	            result.push(s);
	    }

	    this.segments = result;
	}

	_removeOneLongSegments() {
		let result = [];
		for (const s of this.segments) {
			if (Math.sqrt((s.p1.x - s.p2.x)**2 + (s.p1.y - s.p2.y)**2) > 0.9) {
				result.push(s);
			}
		}
		this.segments = result;
	}

	_gen(x,y,w,h,i) {
		// if (i >= 2) return;

		let horizontal = (h >= 2); // is the sub-map large enough to split with horizontal line
		let vertical = (w >= 2); // can the map be cut in half along the y-axis

		// if (w > h * 2)
		//     horizontal = false;
		// if (h > w * 2)
		//     vertical = false;

		if (!horizontal && !vertical) return; // no to both? stop recursion
		else if (horizontal && vertical)
			horizontal = (h == w ? (secureRandomFloat() < 0.5) : (h > w ? true : false)); // yes to both? choose the larger one
			// horizontal = (secureRandomFloat() < 0.5); // yes to both? randomly choose

		if (horizontal) { // split with horizontal line (—) (decreases height while width stays the same)
			// fixed points
			let X1 = x;
			let X2 = x+w;

			// cut position (how high)
			let Y = y + Math.floor(secureRandomFloat() * (h - 2)) + 1;
			let H1 = Y - y;
			let H2 = h - H1;

			let p1 = new Point(X1, Y);
			let p2 = new Point(X2, Y);

			// door (how far along cut)
			let D = Math.floor(secureRandomFloat() * w);
			if (D > 0) {
				let p3 = new Point(X1 + D, Y);
				this.segments.push(new Segment(p1, p3));
			}
			if (D < w - 1) {
				let p4 = new Point(X1 + D + 1, Y);
				this.segments.push(new Segment(p4, p2));
			}

			// continue to the next rooms
			this._gen(x, y, w, H1, i+1);
			this._gen(x, Y, w, H2, i+1);

		} else { // vertical | (when not horizontal)
			// fixed points
			let Y1 = y;
			let Y2 = y+h;

			// cut position (left to right)
			let X = x + Math.floor(secureRandomFloat() * (w - 1)) + 1;
			let W1 = X - x;
			let W2 = w - W1;

			let p1 = new Point(X, Y1);
			let p2 = new Point(X, Y2);

			// door
			let D = Math.floor(secureRandomFloat() * h);
			if (D > 0) {
				let p3 = new Point(X, Y1 + D);
				this.segments.push(new Segment(p1, p3));
			}
			if (D < h - 1) {
				let p4 = new Point(X, Y1 + D + 1);
				this.segments.push(new Segment(p4, p2));
			}

			// recursion into the next rooms
			this._gen(x, y, W1, h, i+1);
			this._gen(X, y, W2, h, i+1);
		}
	}

	_removeRandomSegment() {
		let ri0 = Math.floor(secureRandomFloat()*this.segments.length);
		let seg = this.segments[ri0];
		this.segments.splice(ri0, 1); // remove it
		
		if (seg.p1.x > seg.p2.x || seg.p2.x > seg.p1.x) { // segment is vertical (|)
			let l = seg.p2.y - seg.p1.y;
			
			let D = Math.floor(secureRandomFloat() * l);
			if (D > 0) {
				let p3 = new Point(seg.p1.x, seg.p1.y + D);
				this.segments.push(new Segment(seg.p1, p3));
			}
			if (D < l - 1) {
				let p4 = new Point(seg.p1.x, seg.p1.y + D + 1);
				this.segments.push(new Segment(p4, seg.p2));
			}

		} else { // segment is horizontal
			let l = seg.p2.x - seg.p1.x;
			
			let D = Math.floor(secureRandomFloat() * l);
			if (D > 0) {
				let p3 = new Point(seg.p1.x + D, seg.p1.y);
				this.segments.push(new Segment(p1, p3));
			}
			if (D < l - 1) {
				let p4 = new Point(seg.p1.x + D + 1, seg.p1.y);
				this.segments.push(new Segment(p4, p2));
			}
		}
	}
		
	generate(removeRandomWalls = 50) { // generate maze from segments using recursive division (related: BSP)
		if (this.width <= 2 && this.height <= 2) return;

		this.segments = new Array();

		// add boundry
		// this.segments.push(new Segment(new Point(0, 0), new Point(this.width, 0)));
		// this.segments.push(new Segment(new Point(this.width, 0), new Point(this.width, this.height)));
		// this.segments.push(new Segment(new Point(this.width, this.height), new Point(0, this.height)));
		// this.segments.push(new Segment(new Point(0, this.height), new Point(0, 0)));

		this._gen(0,0, this.width, this.height, 0);

		for (let i = 0; i < removeRandomWalls; i++) {
			this._removeRandomSegment();
		}

		this._mergeSegmentsXAxis();
		this._mergeSegmentsYAxis();
		this._removeOneLongSegments();
	}
}
