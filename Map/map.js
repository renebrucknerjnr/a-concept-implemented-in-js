function areCollinear(seg1, seg2) {
    return (
        isCollinear(seg1.p1, seg1.p2, seg2.p1) &&
        isCollinear(seg1.p1, seg1.p2, seg2.p2)
    );
}

function project(point, dir) {
    return point.x * dir.x + point.y * dir.y;
}


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

	_mergeSegments() {
	    let result = [];
	    let anythingDone = false;
	    const EPSILON = 1e-10;

	    for (let s of this.segments) {
	        let merged = false;

	        for (let r of result) {
	            if (areCollinear(r, s)) {
				    const dir = {
				        x: r.p2.x - r.p1.x,
				        y: r.p2.y - r.p1.y
				    };

				    const r1 = project(r.p1, dir);
				    const r2 = project(r.p2, dir);
				    const s1 = project(s.p1, dir);
				    const s2 = project(s.p2, dir);

				    // const rMin = Math.min(r1, r2);
				    // const rMax = Math.max(r1, r2);
				    // const sMin = Math.min(s1, s2);
				    // const sMax = Math.max(s1, s2);

				    // if (rMax >= sMin && sMax >= rMin) {
				    //     // merge...
	                    // const endpoints = [r.p1, r.p2, s.p1, s.p2];

					// 	let start = endpoints[0];
					// 	let end = endpoints[0];

					// 	let startProj = project(start, dir);
					// 	let endProj = startProj;

					// 	for (const p of endpoints) {
					// 	    const proj = project(p, dir);

					// 	    if (proj < startProj) {
					// 	        start = p;
					// 	        startProj = proj;
					// 	    }

					// 	    if (proj > endProj) {
					// 	        end = p;
					// 	        endProj = proj;
					// 	    }
					// 	}

					// 	r.p1 = start;
					// 	r.p2 = end;
					// 	merged = true;
					// 	break;
	                // }
	                
	                const endpoints = [
					    { p: r.p1, proj: project(r.p1, dir) },
					    { p: r.p2, proj: project(r.p2, dir) },
					    { p: s.p1, proj: project(s.p1, dir) },
					    { p: s.p2, proj: project(s.p2, dir) }
					];
	                const rMin = Math.min(endpoints[0].proj, endpoints[1].proj);
					const rMax = Math.max(endpoints[0].proj, endpoints[1].proj);
					const sMin = Math.min(endpoints[2].proj, endpoints[3].proj);
					const sMax = Math.max(endpoints[2].proj, endpoints[3].proj);

					if (rMax + EPSILON >= sMin && sMax + EPSILON >= rMin) {
					    endpoints.sort((a, b) => a.proj - b.proj);

					    r.p1 = endpoints[0].p;
					    r.p2 = endpoints[3].p;

					    // let start = endpoints[0];
						// let end = endpoints[0];

						// for (const ep of endpoints) {
						//     if (ep.proj < start.proj) start = ep;
						//     if (ep.proj > end.proj) end = ep;
						// }

						// r.p1 = start.p;
						// r.p2 = end.p;

						anythingDone = true;
					    merged = true;
					    break;
					}
	            }
	        }

	        if (!merged)
	            result.push(s);
	    }

	    this.segments = result;
	    return anythingDone;
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
		if (this.segments.length < 3) return;
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

	_addBoundry() {
		this.segments.push(new Segment(new Point(0, 0), new Point(this.width, 0)));
		this.segments.push(new Segment(new Point(this.width, 0), new Point(this.width, this.height)));
		this.segments.push(new Segment(new Point(this.width, this.height), new Point(0, this.height)));
		this.segments.push(new Segment(new Point(0, this.height), new Point(0, 0)));
	}
		
	generate(removeRandomWalls = 0) { // generate maze from segments using recursive division (related: BSP)
		if (this.width <= 2 && this.height <= 2) return;

		this.segments = new Array();


		this._gen(0,0, this.width, this.height, 0);

		for (let i = 0; i < removeRandomWalls * (this.width * this.height * 0.8); i++) {
			this._removeRandomSegment();
		}

		this._addBoundry();
		while (this._mergeSegments()) {}
		this._removeOneLongSegments();
	}
}


class Quad {
    constructor(bounds, capacity = 8, depth = 0, maxDepth = 10) {
        this.bounds = bounds;

        this.capacity = capacity;
        this.depth = depth;
        this.maxDepth = maxDepth;

        this.items = [];      // Segment references
        this.children = null;
    }

    subdivide() {
        const { min, max } = this.bounds;

        const mx = (min.x + max.x) * 0.5;
        const my = (min.y + max.y) * 0.5;

        this.children = [
            new Quad(
                new Rect(
                    new Point(min.x, min.y),
                    new Point(mx, my)
                ),
                this.capacity,
                this.depth + 1,
                this.maxDepth
            ),

            new Quad(
                new Rect(
                    new Point(mx, min.y),
                    new Point(max.x, my)
                ),
                this.capacity,
                this.depth + 1,
                this.maxDepth
            ),

            new Quad(
                new Rect(
                    new Point(min.x, my),
                    new Point(mx, max.y)
                ),
                this.capacity,
                this.depth + 1,
                this.maxDepth
            ),

            new Quad(
                new Rect(
                    new Point(mx, my),
                    new Point(max.x, max.y)
                ),
                this.capacity,
                this.depth + 1,
                this.maxDepth
            )
        ];
    }

    findContainingChild(segment) {
        if (!this.children)
            return null;

        for (const child of this.children) {
            if (child.bounds.containsRect(segment.bounds))
                return child;
        }

        return null;
    }

    redistribute() {
        let i = 0;

        while (i < this.items.length) {
            const child = this.findContainingChild(this.items[i]);

            if (child) {
                child.insert(this.items[i]);
                this.items.splice(i, 1);
            } else {
                i++;
            }
        }
    }

    insert(segment) {
        if (!this.bounds.intersectsRect(segment.bounds))
            return false;

        if (this.children) {
            const child = this.findContainingChild(segment);

            if (child)
                return child.insert(segment);
        }

        this.items.push(segment);

        if (
            !this.children &&
            this.items.length > this.capacity &&
            this.depth < this.maxDepth
        ) {
            this.subdivide();
            this.redistribute();
        }

        return true;
    }

    query(rect, out = []) {
        if (!this.bounds.intersectsRect(rect))
            return out;

        for (const seg of this.items) {
            if (rectIntersectsRect(seg.bounds, rect))
                out.push(seg);
        }

        if (this.children) {
            for (const child of this.children)
                child.query(rect, out);
        }

        return out;
    }

    clear() {
        this.items.length = 0;

        if (this.children) {
            for (const child of this.children)
                child.clear();

            this.children = null;
        }
    }
}

class QuadTree {
    constructor(bounds, capacity = 8, maxDepth = 10) {
        this.root = new Quad(bounds, capacity, 0, maxDepth);
    }

    clear() {
        this.root.clear();
    }

    insert(segment) {
        return this.root.insert(segment);
    }

    insertAll(segments) {
        for (const s of segments)
            this.insert(s);
    }

    query(rect) {
        return this.root.query(rect);
    }
}