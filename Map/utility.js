function floor(n) {
	return Math.floor(n);
}

function fract(n) {
	return n - floor(n);
}

function mod(n, m) {
	return fract(n / m) * m;
}

function modR(n, m) {
	return floor(n / m) * m;
}

function rgbToHex(r, g, b) {
    r = floor(r); g = floor(g); b = floor(b);
    r = r.toString(16);
    g = g.toString(16);
    b = b.toString(16);
    return ("0".repeat(2-r.length)+r) + ("0".repeat(2-g.length)+g) + ("0".repeat(2-b.length)+b);
}

function smooth(n) {
    return n*n*(3 - 2*n);
}

function lerp(a, b, t) {
    return a*(1-t) + b*t;
}


function secureRandomFloat() {
  const array = crypto.getRandomValues(new Uint32Array(1));

  return array[0] / 0xffffffff;
}

function hash12(a, b = 10) { // https://www.shadertoy.com/view/WXSBDV
    let x = a * 256.8 + 0.2;
    let y = b * 256.8 + 0.2;
    let z = x;

    x = fract(x * 0.1031);
    y = fract(y * 0.1031);
    z = fract(z * 0.1031);

    x += x * (y + 33.33);
    y += y * (z + 33.33);
    z += z * (x + 33.33);

    return fract((x + y) * z);
    /* ((fract(x * 0.1031) + fract(x * 0.1031) * (fract(y * 0.1031) + 33.33)) + (fract(y * 0.1031) + fract(y * 0.1031) * (fract(x * 0.1031) + 33.33))) * (fract(x * 0.1031) + fract(x * 0.1031) * (fract(x * 0.1031) + 33.33))
     =
    fract(x * 0.1031)*(fract(x * 0.1031)+34.33) * ((2*fract(y * 0.1031) + 34.33)*fract(x * 0.1031) + 34.33*fract(y * 0.1031)) */
}

function clamp(v, l, u) {
    return (v < l ? l : (v > u ? u : v)); // Math.max(l,Math.min(u, v));
}

function lineSDF(p, seg) {
/* // https://www.shadertoy.com/new
float lineSDF(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord/iResolution.xy;

    vec3 col = vec3(0);
    col.r = 1.0 - step(0.05, lineSDF(uv, vec2(0.2,0.5), vec2(0.2-0.6*(cos(iTime)*0.5-0.5), 0.5+0.5*(sin(iTime)))));
    
    col.g = 1.0 - step(0.01, distance(uv, vec2(0.2,0.5)));
    col.b = 1.0 - step(0.01, distance(uv, vec2(0.2-0.6*(cos(iTime)*0.5-0.5), 0.5+0.5*(sin(iTime)))));

    fragColor = vec4(col,1.0);
}
*/
    let pa = new Point(p.x - seg.p1.x, p.y - seg.p1.y);
    let ba = new Point(seg.p2.x - p.x, seg.p2.y - p.y);
    let h = clamp((pa.x * ba.x + pa.y * ba.y) / (ba.x * ba.x + ba.y * ba.y), 0.0, 1.0);

    let dx = pa.x - ba.x * h;
    let dy = pa.y - ba.y * h;
    return Math.sqrt(dx * dx + dy * dy);
}