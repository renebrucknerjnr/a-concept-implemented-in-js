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