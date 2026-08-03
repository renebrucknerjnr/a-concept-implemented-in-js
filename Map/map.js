function areCollinear(seg1, seg2) {
    return (
        isCollinear(seg1.p1, seg1.p2, seg2.p1) &&
        isCollinear(seg1.p1, seg1.p2, seg2.p2)
    );
}

function project(point, dir) {
    return point.x * dir.x + point.y * dir.y;
}

function rayRect(origin, dir, rect, maxT = Infinity) {
    let tx1, tx2;

    if (dir.x === 0) {
        if (origin.x < rect.min.x || origin.x > rect.max.x)
            return null;

        tx1 = -Infinity;
        tx2 = Infinity;
    } else {
        tx1 = (rect.min.x - origin.x) / dir.x;
        tx2 = (rect.max.x - origin.x) / dir.x;
    }

    let ty1, ty2;

    if (dir.y === 0) {
        if (origin.y < rect.min.y || origin.y > rect.max.y)
            return null;

        ty1 = -Infinity;
        ty2 = Infinity;
    } else {
        ty1 = (rect.min.y - origin.y) / dir.y;
        ty2 = (rect.max.y - origin.y) / dir.y;
    }

    let tmin = Math.max(
        Math.min(tx1, tx2),
        Math.min(ty1, ty2)
    );

    let tmax = Math.min(
        Math.max(tx1, tx2),
        Math.max(ty1, ty2)
    );

    if (tmax < 0) return null;
    if (tmin > tmax) return null;

    const entry = Math.max(0, tmin);

    if (entry > maxT) return null;

    return entry;
}

// https://www.desmos.com/calculator/hj2kt8b8no
function raySegment(origin, dir, segment) {
	// if (dir.x > 0 && (origin.x > segment.p1.x && origin.x > segment.p2.x)) return null; // ray goes right and segment is left
	// if (dir.x < 0 && (origin.x < segment.p1.x && origin.x < segment.p2.x)) return null; // ray goes left and segment is right
	// if (dir.y > 0 && (origin.y > segment.p1.y && origin.y > segment.p2.y)) return null; // ray goes up and segment is down
	// if (dir.y < 0 && (origin.y < segment.p1.y && origin.y < segment.p2.y)) return null; // ray goes down and segment is up

	// let dist1 = Math.sqrt((origin.x - segment.p1.x)**2 + (origin.y - segment.p1.y)**2);
	// let dist2 = Math.sqrt((origin.x - segment.p2.x)**2 + (origin.y - segment.p2.y)**2);
	// let dist = Math.max(dist1,dist2);
	// let ray = new Segment(origin, new Point(origin.x + dir.x * dist * 2, origin.y + dir.y * dist * 2));
	// let inter = ray.intersect(segment);

	// const t = Math.hypot(
	//     inter.x - origin.x,
	//     inter.y - origin.y
	// ); // world space, not along line?

	// if (!inter.hit) return null;

	// return {
	//     t: t,                        // distance along ray
	//     point: new Point(inter.x, inter.y) // intersection point
	// };



	const sx = segment.p2.x - segment.p1.x;
    const sy = segment.p2.y - segment.p1.y;

    const det = dir.x * sy - dir.y * sx;

    if (Math.abs(det) < 1e-7)
        return null;

    const dx = segment.p1.x - origin.x;
    const dy = segment.p1.y - origin.y;

    const t = (dx * sy - dy * sx) / det;
    const u = (dx * dir.y - dy * dir.x) / det;

    if (t < 0)
        return null;

    if (u < 0 || u > 1)
        return null;

    return {
        t,
        point: new Point(
            origin.x + t * dir.x,
            origin.y + t * dir.y
        )
    };
}

function countQuad(node) {
    let total = node.items.length;

    if (node.children)
        for (const child of node.children)
            total += countQuad(child);

    return total;
}

function verifyQuad(node) {
    for (const seg of node.items) {
        if (!node.bounds.containsRect(seg.bounds)) {
            console.log("Segment stored outside node!", node.depth, seg);
        }
    }

    if (node.children)
        for (const child of node.children)
            verifyQuad(child);
}


// TODO:  add different wall types (with different heights and textures)
// TODO:  add floor / ceiling tiles
// TODO:  add entities
// TODO:  add sounds
// TODO:  add lights (maybe)
// TODO:  maybe add doors (maybe)
// TODO:  maybe beacons?

class Maze {
	constructor(w, h, hashIndex=0) {
		this.width = w;
		this.height = h;
		this.width += (1-this.width % 2); // add one if needed (to make width an odd number)
		this.height += (1-this.height % 2);
		this.newGenHashIndex = hashIndex;

		this.segments = null;

		this.generate(0.1);
	}

	_mergeSegments() {
	    let result = [];
	    let anythingDone = false;
	    const EPSILON = 1e-7;

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

	        			r.computeBounds(); // this fixed the bug (the quadtree needed correct bounds to work properly, while the bruteforce didn't)
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

	_gen(x,y,w,h,i, hashIndex=0) {
		// if (i >= 2) return;

		let horizontal = (h >= 2); // is the sub-map large enough to split with horizontal line
		let vertical = (w >= 2); // can the map be cut in half along the y-axis

		// if (w > h * 2)
		//     horizontal = false;
		// if (h > w * 2)
		//     vertical = false;

		if (!horizontal && !vertical) return; // no to both? stop recursion
		else if (horizontal && vertical)
			// horizontal = (h == w ? (secureRandomFloat() < 0.5) : (h > w ? true : false)); // yes to both? choose the larger one
			horizontal = (h == w ? (hash12(hashIndex, hashIndex*5) < 0.5) : (h > w ? true : false)); // yes to both? choose the larger one
			// horizontal = (secureRandomFloat() < 0.5); // yes to both? randomly choose

		if (horizontal) { // split with horizontal line (—) (decreases height while width stays the same)
			// fixed points
			let X1 = x;
			let X2 = x+w;

			// cut position (how high)
			// let Y = y + Math.floor(secureRandomFloat() * (h - 2)) + 1;
			let Y = y + Math.floor(hash12(hashIndex, hashIndex*6) * (h - 2)) + 1;
			let H1 = Y - y;
			let H2 = h - H1;

			let p1 = new Point(X1, Y);
			let p2 = new Point(X2, Y);

			// door (how far along cut)
			// let D = Math.floor(secureRandomFloat() * w);
			let D = Math.floor(hash12(hashIndex, hashIndex*7) * w);
			if (D > 0) {
				let p3 = new Point(X1 + D, Y);
				this.segments.push(new Segment(p1, p3));
			}
			if (D < w - 1) {
				let p4 = new Point(X1 + D + 1, Y);
				this.segments.push(new Segment(p4, p2));
			}

			// continue to the next rooms
			this._gen(x, y, w, H1, i+1, hashIndex+this.width);
			this._gen(x, Y, w, H2, i+1, hashIndex+this.width);

		} else { // vertical | (when not horizontal)
			// fixed points
			let Y1 = y;
			let Y2 = y+h;

			// cut position (left to right)
			// let X = x + Math.floor(secureRandomFloat() * (w - 1)) + 1;
			let X = x + Math.floor(hash12(hashIndex, hashIndex*8) * (w - 1)) + 1;
			let W1 = X - x;
			let W2 = w - W1;

			let p1 = new Point(X, Y1);
			let p2 = new Point(X, Y2);

			// door
			// let D = Math.floor(secureRandomFloat() * h);
			let D = Math.floor(hash12(hashIndex, hashIndex*9) * h);
			if (D > 0) {
				let p3 = new Point(X, Y1 + D);
				this.segments.push(new Segment(p1, p3));
			}
			if (D < h - 1) {
				let p4 = new Point(X, Y1 + D + 1);
				this.segments.push(new Segment(p4, p2));
			}

			// recursion into the next rooms
			this._gen(x, y, W1, h, i+1, hashIndex+this.width);
			this._gen(X, y, W2, h, i+1, hashIndex+this.width);
		}
	}

	_removeRandomSegment(hashIndex=0) {
		if (this.segments.length < 3) return;
		// let ri0 = Math.floor(secureRandomFloat()*this.segments.length);
		let ri0 = Math.floor(hash12(hashIndex, hashIndex*2)*this.segments.length);
		let seg = this.segments[ri0];
		this.segments.splice(ri0, 1); // remove it
		
		if (seg.p1.x > seg.p2.x || seg.p2.x > seg.p1.x) { // segment is vertical (|)
			let l = seg.p2.y - seg.p1.y;
			
			// let D = Math.floor(secureRandomFloat() * l);
			let D = Math.floor(hash12(hashIndex, hashIndex*3) * l);
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
			
			// let D = Math.floor(secureRandomFloat() * l);
			let D = Math.floor(hash12(hashIndex, hashIndex*4) * l);
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

	_giveRandomHeights(hashIndex = 0) {
		for (let i = 0; i < this.segments.length; i++) {
			this.segments[i].floor = 0;
			this.segments[i].ceiling = 0.4 + 1.2*hash12(hashIndex + i, 10*hashIndex + i * this.segments.length);
		}
	}
		
	generate(removeRandomWalls = 0, hashIndex = null) { // generate maze from segments using recursive division (related: BSP)
		if (this.width <= 2 && this.height <= 2) return;
		if (hashIndex == null) hashIndex = this.newGenHashIndex++;

		this.segments = new Array();


		this._gen(0,0, this.width, this.height, 0, (removeRandomWalls+1)*hashIndex);

		for (let i = 0; i < removeRandomWalls * (this.width * this.height * 0.8); i++) {
			this._removeRandomSegment(i + hashIndex * removeRandomWalls);
		}

		this._addBoundry();
		while (this._mergeSegments()) {}
		this._removeOneLongSegments();

		this._giveRandomHeights();

		this._generateTree();
	}

	_generateTree() {
		this.tree = new QuadTree(new Rect(new Point(0,0), new Point(this.width, this.height)));
		this.tree.insertAll(this.segments);
	}

	bruteForceRaycastNearest(origin, dir) {
		let cast = {t: Infinity, point: new Point(0,0), segment: null};
    	for (const s of this.segments) {
    		let d = raySegment(origin, dir, s);
    		if (d != null && cast.t > d.t) cast = {t: d.t, point: d.point, segment: s};
    	}
    	return cast;
	}

	bruteForceRaycast(origin, dir) {
		let hits = [];
    	for (const s of this.segments) {
    		let d = raySegment(origin, dir, s);
    		if (d != null) hits.push({t: d.t, point: d.point, segment: s});
    	}
    	hits.sort((a,b) => a.t - b.t);
    	return hits;
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
        if (!this.bounds.intersectRect(segment.bounds).hit)
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
        if (!this.bounds.intersectRect(rect).hit)
            return out;

        for (const seg of this.items) {
            if (seg.bounds.intersectRect(rect).hit)
                out.push(seg);
        }

        if (this.children) {
            for (const child of this.children)
                child.query(rect, out);
        }

        return out;
    }

    raycastNearest(origin, dir, best = null) {
	    const maxT = best ? best.t : Infinity;

	    const entry = rayRect(origin, dir, this.bounds, maxT);

	    if (entry === null)
	        return best;

	    // Test segments stored in this node.
	    for (const seg of this.items) {
	    	const hit = raySegment(origin, dir, seg);

	        if (!hit)
	            continue;

	        if (!best || hit.t < best.t) {
	            best = {
	                t: hit.t,
	                point: hit.point,
	                segment: seg
	            };
	        }
	    }

	    if (!this.children)
	        return best;

	    // Visit children nearest-first.
	    const order = [];

	    for (const child of this.children) {
	        const t = rayRect(
	            origin,
	            dir,
	            child.bounds,
	            best ? best.t : Infinity
	        );

	        if (t !== null)
	            order.push({ child, t });
	    }

	    order.sort((a, b) => a.t - b.t); // slow, faster to manually check the order

	    for (const item of order)
	        best = item.child.raycastNearest(origin, dir, best);

	    return best;
	}

	raycast(origin, dir, hits = []) {
	    const entry = rayRect(origin, dir, this.bounds, Infinity);

	    if (entry === null)
	        return hits;

	    // Test segments in this node.
	    for (const seg of this.items) {
	        const hit = raySegment(origin, dir, seg);

	        if (!hit)
	            continue;

	        hits.push({
	            t: hit.t,
	            point: hit.point,
	            segment: seg
	        });
	    }

	    if (this.children) {
	        // Visit children nearest-first.
	        const order = [];

	        for (const child of this.children) {
	            const t = rayRect(
	                origin,
	                dir,
	                child.bounds,
	                Infinity
	            );

	            if (t !== null)
	                order.push({ child, t });
	        }

	        order.sort((a, b) => a.t - b.t);

	        for (const item of order)
	            item.child.raycast(origin, dir, hits);
	    }

	    // return hits.sort((a, b) => a.t - b.t);
	    return hits;
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

    raycastNearest(origin, dir) {
	    return this.root.raycastNearest(origin, dir);
	}

    raycast(origin, dir) {
	    return this.root.raycast(origin, dir).sort((a, b) => a.t - b.t);
	}
}