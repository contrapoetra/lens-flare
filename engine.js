const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
if (!gl) alert("WebGL 2 not supported");

let isAnimating = false;
let animationStartTime = 0;
const lightAnimationRadius = 0.5;
const lightAnimationSpeed = 0.0005; // Radians per millisecond

// LENS SYSTEMS

// 1. Brendel (Simple 3-group)
const BRENDEL_DATA = [
    { r: 0.42971, t: 0.098, n: 1.691, v: 54.8, ap: 0.35 },
    { r: -1.15325, t: 0.021, n: 1.548, v: 45.4, ap: 0.35 },
    { r: 3.06847, t: 0.08161, n: 1.0, v: 0, ap: 0.35 },
    { r: 0, t: 0.05, n: 1.0, v: 0, ap: 0.28 }, // Stop (Idx 3)
    { r: -0.59064, t: 0.01872, n: 1.639, v: 34.6, ap: 0.28 },
    { r: 0.40928, t: 0.10640, n: 1.0, v: 0, ap: 0.28 },
    { r: 1.83931, t: 0.07046, n: 1.691, v: 54.8, ap: 0.3 },
    { r: -0.48906, t: 0, n: 1.0, v: 0, ap: 0.3 }
];

// 2. Nikon Zoom (US 2011/0228407 Example 1 - Wide Angle)
// ~37 surfaces. We simplify slightly for realtime performance.
// Note: Variable distances d5, d12, d17, d19 are hardcoded for Wide angle.
const NIKON_DATA = [
    { r: 107.5999, t: 2.5, n: 1.833, v: 33.17, ap: 25.0 }, // L11
    { r: 62.4829, t: 8.8, n: 1.497, v: 82.52, ap: 25.0 }, // L12
    { r: -378.7547, t: 0.1, n: 1.0, v: 25.0, ap: 25.0 },
    { r: 62.1920, t: 8.5, n: 1.497, v: 82.52, ap: 25.0 }, // L13
    { r: 2842.4167, t: 1.5, n: 1.0, v: 0, ap: 25.0 }, // d5 (Wide)
    { r: 33.8242, t: 2.0, n: 1.824, v: 41.37, ap: 15.0 }, // L21
    { r: 25.0487, t: 5.95, n: 1.0, v: 0, ap: 15.0 },
    { r: -74.3443, t: 1.8, n: 1.488, v: 71.58, ap: 15.0 }, // L22
    { r: 36.7151, t: 4.77, n: 1.846, v: 23.78, ap: 15.0 }, // L23
    { r: -780.6979, t: 2.63, n: 1.0, v: 0, ap: 15.0 },
    { r: -49.1692, t: 1.8, n: 1.729, v: 54.66, ap: 15.0 }, // L24
    { r: 487.4476, t: 19.36, n: 1.0, v: 0, ap: 15.0 }, // d12 (Wide)
    { r: 133.3716, t: 3.42, n: 1.729, v: 54.66, ap: 15.0 }, // L31
    { r: -119.7323, t: 0.1, n: 1.0, v: 0, ap: 15.0 },
    { r: 146.3097, t: 2.0, n: 1.834, v: 37.16, ap: 15.0 }, // L32
    { r: 42.6439, t: 5.9, n: 1.603, v: 65.46, ap: 15.0 }, // L33
    { r: -89.8556, t: 13.06, n: 1.0, v: 0, ap: 15.0 }, // d17 (Wide)
    { r: -50.0000, t: 2.0, n: 1.761, v: 29.19, ap: 15.0 }, // L34
    { r: -69.7595, t: 5.23, n: 1.0, v: 0, ap: 15.0 }, // d19 (Wide)
    { r: 0, t: 3.72, n: 1.0, v: 0, ap: 10.0 }, // STOP (S20)
    { r: 52.0128, t: 3.72, n: 1.716, v: 55.44, ap: 15.0 }, // L41
    { r: -358.6198, t: 0.1, n: 1.0, v: 0, ap: 15.0 },
    { r: 44.5918, t: 4.0, n: 1.497, v: 82.52, ap: 15.0 }, // L42
    { r: -375.0581, t: 2.0, n: 1.849, v: 30.97, ap: 15.0 }, // L43
    { r: 50.7950, t: 18.7, n: 1.0, v: 0, ap: 15.0 },
    { r: 69.5944, t: 3.4, n: 1.808, v: 22.79, ap: 15.0 }, // L44
    { r: -100.4799, t: 1.6, n: 1.657, v: 54.98, ap: 15.0 }, // L45
    { r: 34.2068, t: 2.64, n: 1.0, v: 0, ap: 15.0 },
    { r: -346.1430, t: 1.6, n: 1.841, v: 30.09, ap: 15.0 }, // L46
    { r: 70.2413, t: 3.0, n: 1.0, v: 0, ap: 15.0 },
    { r: 55.6811, t: 3.9, n: 1.514, v: 64.49, ap: 15.0 }, // L47
    { r: -95.4983, t: 0.1, n: 1.0, v: 0, ap: 15.0 },
    { r: 59.3918, t: 3.9, n: 1.514, v: 64.62, ap: 15.0 }, // L48
    { r: 4.9899, t: 0.0, n: 1.0, v: 0, ap: 15.0 }, // Typo in patent? Check S35
    { r: -37.0818, t: 1.9, n: 1.800, v: 34.96, ap: 15.0 }, // L49
    { r: -73.3082, t: 0.0, n: 1.0, v: 0, ap: 15.0 }
];

let activeLens = [];
let ghosts = [];
let sensorZ = 0;
let scaleFactor = 150;
let apertureIndex = 3;
let sensitivity = 1.0;
let sensorScaleFactor = 0.8;

function loadLens(type) {
    activeLens = [];
    currentZ = 0;

    let rawData, scale;
    if (type === 'brendel') {
        rawData = BRENDEL_DATA;
        scale = 150;
        apertureIndex = 3;
    } else {
        rawData = NIKON_DATA;
        scale = 1.0; // Nikon data is already in mm
        apertureIndex = 19; // Stop is S20 -> index 19
    }

    scaleFactor = scale;

    rawData.forEach(l => {
        const lens = {
            radius: l.r * scale,
            thickness: l.t * scale,
            n_d: l.n,
            V: l.v,
            aperture: l.ap * scale,
            z: currentZ,
            center: 0
        };
        lens.center = lens.radius !== 0 ? lens.z + lens.radius : lens.z;
        activeLens.push(lens);
        currentZ += lens.thickness;
    });

    sensorZ = currentZ + (type === 'brendel' ? 0.8 * scale : 51.8 * scale);
    sensorScaleFactor = (activeLens.length > 10) ? 0.3 : 0.8;
    sensitivity = sensorScaleFactor * 1.25;

    ghosts = [{indices: [-1,-1], name: "Primary Image"}];
    const maxGhosts = 40;

    const step = type === 'nikon' ? 2 : 1;

    for(let i=0; i<activeLens.length; i+=step) {
        if(activeLens[i].radius === 0 && i === apertureIndex) continue;
        for(let j=i-1; j>=0; j-=step) {
            if(activeLens[j].radius === 0 && j === apertureIndex) continue;
            ghosts.push({indices: [i, j], name: `Ghost S${i}->S${j}`});
            if (ghosts.length > maxGhosts) break;
        }
        if (ghosts.length > maxGhosts) break;
    }

    const slider = document.getElementById('ghost-slider');
    slider.max = ghosts.length - 1;
    slider.value = -1;
    document.getElementById('ghost-val').innerText = "All";
}

document.getElementById('lens-select').onchange = (e) => {
    loadLens(e.target.value);
};

const ghostSlider = document.getElementById('ghost-slider');
ghostSlider.oninput = e => {
    const i = parseInt(e.target.value);
    document.getElementById('ghost-val').innerText = i === -1 ? "All" : i === 0 ? "Primary" : ghosts[i].name;
};

function createShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src.trim());
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader Compile Error:", gl.getShaderInfoLog(s));
        return null;
    }
    return s;
}

function createCleanApertureTexture(gl, sides) {
    sides = Math.max(3, Math.round(sides));
    const size = 512;
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = size; ctx.canvas.height = size;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,size,size);

    const cx = size/2, cy = size/2;
    const rBase = size * 0.1;

    ctx.beginPath();
    for(let i=0; i<sides; i++) {
        const a = (Math.PI*2/sides)*i - Math.PI/2;
        const x = cx + rBase*Math.cos(a), y = cy + rBase*Math.sin(a);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle = '#FFF';

    ctx.filter = 'blur(1px)';
    ctx.globalCompositeOperation = 'screen';
    ctx.fill();

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return tex;
}
let apertureTex = createCleanApertureTexture(gl, 7);

let program, locs;
let gridBuffer = gl.createBuffer();
let gridIndexBuffer = gl.createBuffer();
let indexCount = 0, gridRes = 64, wireframeMode = false;

function buildGrid(res, isWire) {
    gridRes = res;
    wireframeMode = isWire;
    const verts = [], inds = [];

    const rings = res;
    const sectors = res * 2;

    verts.push(0, 0);

    for (let r = 1; r <= rings; r++) {
        const radius = r / rings;
        for (let s = 0; s < sectors; s++) {
            const angle = (s / sectors) * Math.PI * 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            verts.push(x, y);
        }
    }

    for (let r = 0; r < rings; r++) {
        for (let s = 0; s < sectors; s++) {
            const nextS = (s + 1) % sectors;

            if (r === 0) {
                inds.push(0, s + 1, nextS + 1);
            } else {
                const innerStart = 1 + (r - 1) * sectors;
                const outerStart = 1 + r * sectors;

                const i1 = innerStart + s;
                const i2 = innerStart + nextS;
                const o1 = outerStart + s;
                const o2 = outerStart + nextS;

                inds.push(i1, o1, i2); // tri 1
                inds.push(o1, o2, i2); // tri 2
            }
        }
    }

    indexCount = inds.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    // Use UNSIGNED_INT for indices if vertex count > 65k
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(inds), gl.STATIC_DRAW);
}
buildGrid(64, false);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridIndexBuffer);

// Render Variables
const SPECTRAL = [{nm:650, rgb:[1,0.1,0.1]}, {nm:530, rgb:[0.15,1.1,0.15]}, {nm:450, rgb:[0.2,0.2,1]}];
let smoothLx = 0.3, smoothLy = -0.2;
let prevSmoothLx = 0.3, prevSmoothLy = -0.2;
let currentApertureSides = 7;
const BLUR_SAMPLES = 8;

function render(currentTime) {
    if (!program || !locs) return;

    if (isAnimating) {
        if (animationStartTime === 0) {
            animationStartTime = currentTime;
        }
        const elapsedTime = currentTime - animationStartTime;
        const angle = elapsedTime * lightAnimationSpeed; // radians

        const newLx = lightAnimationRadius * Math.cos(angle);
        const newLy = lightAnimationRadius * Math.sin(angle);

        document.getElementById('light-x').value = newLx.toFixed(4);
        document.getElementById('light-y').value = newLy.toFixed(4);
    }

    const uiRes = parseInt(document.getElementById('grid-res').value);
    const mode = document.getElementById('render-mode').value;
    const isWire = (mode === 'wireframe' || mode === 'velocity');
    if(uiRes !== gridRes || isWire !== wireframeMode) {
        buildGrid(uiRes, isWire);
    }

    const uiSides = Math.max(3, parseInt(document.getElementById('aperture-sides').value) || 7);
    if(uiSides !== currentApertureSides) {
        currentApertureSides = uiSides;
        gl.deleteTexture(apertureTex);
        apertureTex = createCleanApertureTexture(gl, currentApertureSides);
    }

    const targetLx = parseFloat(document.getElementById('light-x').value);
    const targetLy = parseFloat(document.getElementById('light-y').value);

    // Update Previous State before updating Current
    prevSmoothLx = smoothLx;
    prevSmoothLy = smoothLy;

    // Interpolation (Inertia)
    smoothLx += (targetLx - smoothLx) * 0.1;
    smoothLy += (targetLy - smoothLy) * 0.1;

    // Current Light Dir
    const lx = smoothLx, ly = smoothLy, lz = 1.0;
    const len = Math.sqrt(lx*lx + ly*ly + lz*lz);
    const rayDir = [lx/len, -ly/len, 1.0/len];

    // Previous Light Dir
    const plx = prevSmoothLx, ply = prevSmoothLy;
    const plen = Math.sqrt(plx*plx + ply*ply + lz*lz);
    const prevRayDir = [plx/plen, -ply/plen, 1.0/plen];

    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);

    if (mode === 'velocity') {
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    }

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, apertureTex); gl.uniform1i(locs.apertureTex, 0);

    gl.uniform3f(locs.lightDir, rayDir[0], rayDir[1], rayDir[2]);
    gl.uniform3f(locs.prevLightDir, prevRayDir[0], prevRayDir[1], prevRayDir[2]);
    gl.uniform1i(locs.blurSamples, BLUR_SAMPLES);
    gl.uniform1f(locs.blurStrength, parseFloat(document.getElementById('blur-strength').value));

    gl.uniform1f(locs.apertureVal, parseFloat(document.getElementById('aperture-slider').value));
    gl.uniform1f(locs.sensorZ, sensorZ);
    gl.uniform2f(locs.screenSize, canvas.width, canvas.height);
    gl.uniform1f(locs.scale, canvas.height * sensorScaleFactor);

    const modeMap = { 'textured': 0, 'wireframe': 1, 'velocity': 2 };
    gl.uniform1i(locs.renderMode, modeMap[document.getElementById('render-mode').value]);

    gl.uniform1i(locs.numLenses, activeLens.length);
    gl.uniform1i(locs.apertureIndex, apertureIndex);

    activeLens.forEach((l, i) => {
        const b = `u_lenses[${i}]`;
        gl.uniform1f(gl.getUniformLocation(program, `${b}.center`), l.center);
        gl.uniform1f(gl.getUniformLocation(program, `${b}.radius`), l.radius);
        gl.uniform1f(gl.getUniformLocation(program, `${b}.aperture`), l.aperture);
        gl.uniform1f(gl.getUniformLocation(program, `${b}.n_d`), l.n_d);
        gl.uniform1f(gl.getUniformLocation(program, `${b}.V`), l.V);
        gl.uniform1f(gl.getUniformLocation(program, `${b}.z`), l.z);
    });

    const selGhost = parseInt(document.getElementById('ghost-slider').value);
    const exposure = parseFloat(document.getElementById('exposure').value);

    for(let i=0; i<ghosts.length; i++) {
        if(selGhost !== -1 && selGhost !== i && i !== 0) continue;
        gl.uniform2i(locs.ghostIndices, ghosts[i].indices[0], ghosts[i].indices[1]);

        for(let s=0; s<3; s++) {
            gl.uniform1f(locs.wavelength, SPECTRAL[s].nm);
            gl.uniform1i(locs.channel, s);
            let intensity = exposure * (i===0 ? 0.6 : 0.15);
            const col = SPECTRAL[s].rgb;
            gl.uniform3f(locs.baseColor, col[0]*intensity, col[1]*intensity, col[2]*intensity);

            if (mode === 'velocity') {
                gl.uniform1i(locs.renderMode, 3);
                gl.drawElementsInstanced(gl.POINTS, indexCount, gl.UNSIGNED_INT, 0, BLUR_SAMPLES);
            } else {
                gl.uniform1i(locs.renderMode, mode === 'wireframe' ? 1 : 0);
                gl.drawElementsInstanced(isWire ? gl.LINES : gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0, BLUR_SAMPLES);
            }
        }
    }

    drawMiniMap(selGhost === -1 ? 0 : selGhost, {x:rayDir[0], y:rayDir[1], z:rayDir[2]});
    requestAnimationFrame(render);
}

const miniCtx = document.getElementById('mini-canvas').getContext('2d');
function drawMiniMap(gIdx, dir) {
    const c = document.getElementById('mini-canvas');
    if(c.width!==400) c.width=400; if(c.height!==200) c.height=200;
    const ctx = miniCtx;
    ctx.fillStyle='#111'; ctx.fillRect(0,0,400,200);

    const minZ = -20;
    const maxZ = sensorZ + (activeLens.length > 10 ? 50 : 20);
    const pad = 40;
    const sx = (400-pad*2)/(maxZ-minZ);
    const maxY = activeLens[0].aperture * 1.5;
    const sy = (200-pad*2)/(maxY*2);

    const mapX = z => pad + (z-minZ)*sx;
    const mapY = y => 100 + y*sy;

    ctx.strokeStyle='#333'; ctx.beginPath(); ctx.moveTo(0,100); ctx.lineTo(400,100); ctx.stroke();

    activeLens.forEach((l, i) => {
        ctx.beginPath();
        if(l.radius===0) {
            let x=mapX(l.z), y=l.aperture;
            ctx.moveTo(x, mapY(-y)); ctx.lineTo(x, mapY(y));
            ctx.strokeStyle = i===apertureIndex ? '#f90' : '#4af';
        } else {
            let cx=mapX(l.center), r=Math.abs(l.radius*sx);
            let th=Math.asin(Math.min(1, l.aperture/Math.abs(l.radius)));
            let s=(l.radius>0)?Math.PI-th:-th, e=(l.radius>0)?Math.PI+th:th;
            ctx.arc(cx, 100, r, s, e);
            ctx.strokeStyle='#4af';
        }
        ctx.stroke();
    });

    ctx.strokeStyle='#888'; ctx.beginPath(); ctx.moveTo(mapX(sensorZ), mapY(-20)); ctx.lineTo(mapX(sensorZ), mapY(20)); ctx.stroke();

    ctx.globalAlpha = 0.5;
    const ghost = ghosts[gIdx];
    const isPrimary = ghost.indices[0] === -1;
    const bounces = [];
    if (isPrimary) bounces.push({idx:activeLens.length-1, d:1});
    else { bounces.push({idx:ghost.indices[0], d:1}); bounces.push({idx:ghost.indices[1], d:-1}); bounces.push({idx:activeLens.length-1, d:1}); }

    const strips = parseInt(document.getElementById('grid-res').value);
    const skip = Math.max(1, Math.ceil(strips/12));
    const appVal = parseFloat(document.getElementById('aperture-slider').value);

    for (let i=0; i<strips; i+=skip) {
        const t = (i/(strips-1))*2-1;
        let pos = {x:0, y:t*activeLens[0].aperture*0.9*appVal, z:-10};
        let rDir = {...dir};
        ctx.beginPath(); ctx.moveTo(mapX(pos.z), mapY(pos.y));
        ctx.strokeStyle = isPrimary ? '#afa' : '#f88';

        let k=0, stage=0, dead=false;
        while(stage < bounces.length) {
            let target=bounces[stage].idx, d=bounces[stage].d;
            while ( (d>0 && k<=target) || (d<0 && k>=target) ) {
                if(k<0||k>=activeLens.length) { dead=true; break; }
                const l=activeLens[k];
                let hitZ=l.z, t=(hitZ-pos.z)/rDir.z, hitY=pos.y+rDir.y*t;
                let lim=l.aperture; if(k===apertureIndex) lim*=appVal;
                if(Math.abs(hitY)>lim) { dead=true; break; }
                ctx.lineTo(mapX(hitZ), mapY(hitY));
                pos.z=hitZ; pos.y=hitY;
                if(l.radius!==0) rDir.y *= 0.95;
                k+=d;
            }
            if (dead) break;
            if (!isPrimary && stage<2) rDir.z *= -1;
            stage++; k-=d;
        }
        if (!dead) {
            let t = (sensorZ-pos.z)/rDir.z;
            ctx.lineTo(mapX(sensorZ), mapY(pos.y+rDir.y*t));
        }
        ctx.stroke();
    }
    ctx.globalAlpha=1.0;
}

let isDrag = false;
let lastX = 0, lastY = 0;

canvas.addEventListener('mousedown', e => {
    isDrag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    if (isAnimating) {
        isAnimating = false;
        document.getElementById('animateButton').innerText = 'Animate Light';
    }
});
window.addEventListener('mouseup', () => isDrag = false);
window.addEventListener('mousemove', e => {
    if(isDrag) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        const r = canvas.getBoundingClientRect();
        const factorX = (4.0 / r.width) * sensitivity;
        const factorY = (3.0 / r.height) * sensitivity;

        let lx = parseFloat(document.getElementById('light-x').value) || 0;
        let ly = parseFloat(document.getElementById('light-y').value) || 0;

        lx += dx * factorX;
        ly += dy * factorY;

        document.getElementById('light-x').value = lx.toFixed(4);
        document.getElementById('light-y').value = ly.toFixed(4);
    }
});
window.onresize = () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight; gl.viewport(0,0,canvas.width,canvas.height); };
window.onresize();

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) {
        document.body.style.cursor = '';
    }
}, false);

// Draggable Inputs
document.querySelectorAll('.draggable').forEach(el => {
    let isDragging = false;
    let startX;
    let startVal;
    let totalMovementX = 0;

    el.addEventListener('mousedown', e => {
        isDragging = false;
        startX = e.clientX;
        startVal = parseFloat(el.value) || 0;
        totalMovementX = 0;

        const onWindowMove = wm => {
            if (!isDragging && Math.abs(wm.clientX - startX) > 3) {
                isDragging = true;
                el.blur();
                document.body.style.cursor = 'ew-resize';
                canvas.requestPointerLock();

                // Stop animation if light position inputs are dragged
                if (isAnimating && (el.id === 'light-x' || el.id === 'light-y')) {
                    isAnimating = false;
                    document.getElementById('animateButton').innerText = 'Animate Light';
                }
            }

            if (isDragging) {
                wm.preventDefault();

                let currentDX;
                if (document.pointerLockElement === canvas) {
                    totalMovementX += wm.movementX;
                    currentDX = totalMovementX;
                } else {
                    currentDX = wm.clientX - startX;
                }

                const step = parseFloat(el.dataset.step) || 0.1;
                let val = startVal + currentDX * step;

                if(el.id === 'grid-res') val = Math.max(16, val);
                if(el.id === 'aperture-slider') val = Math.max(0.01, val);
                if(el.id === 'aperture-sides') val = Math.max(3, val);

                if(el.dataset.int) el.value = Math.round(val);
                else el.value = val.toFixed(el.dataset.dec || 2);
            }
        };

        const onWindowUp = () => {
            window.removeEventListener('mousemove', onWindowMove);
            window.removeEventListener('mouseup', onWindowUp);
            document.body.style.cursor = '';
            document.exitPointerLock();
        };

        window.addEventListener('mousemove', onWindowMove);
        window.addEventListener('mouseup', onWindowUp);
    });

    el.addEventListener('dblclick', () => el.select());
});

document.getElementById('reset-light-btn').addEventListener('click', () => {
    document.getElementById('light-x').value = '0.0000';
    document.getElementById('light-y').value = '0.0000';
    if (isAnimating) {
        isAnimating = false;
        document.getElementById('animateButton').innerText = 'Animate Light';
    }
});

const animateButton = document.getElementById('animateButton');
animateButton.addEventListener('click', () => {
    isAnimating = !isAnimating;
    if (isAnimating) {
        animationStartTime = performance.now();
        animateButton.innerText = 'Stop Animation';
    } else {
        animateButton.innerText = 'Animate Light';
    }
});

// finally
async function init() {
    try {
        const [vsSrc, fsSrc] = await Promise.all([
            fetch('shaders/vertex.glsl').then(r => r.text()),
            fetch('shaders/fragment.glsl').then(r => r.text())
        ]);

        const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Link Error:", gl.getProgramInfoLog(program));
            return;
        }

        locs = {
            uv: gl.getAttribLocation(program, 'a_uv'),
            lightDir: gl.getUniformLocation(program, 'u_lightDir'),
            prevLightDir: gl.getUniformLocation(program, 'u_prevLightDir'),
            apertureVal: gl.getUniformLocation(program, 'u_apertureVal'),
            ghostIndices: gl.getUniformLocation(program, 'u_ghostIndices'),
            sensorZ: gl.getUniformLocation(program, 'u_sensorZ'),
            wavelength: gl.getUniformLocation(program, 'u_wavelength'),
            screenSize: gl.getUniformLocation(program, 'u_screenSize'),
            scale: gl.getUniformLocation(program, 'u_scale'),
            baseColor: gl.getUniformLocation(program, 'u_baseColor'),
            renderMode: gl.getUniformLocation(program, 'u_renderMode'),
            numLenses: gl.getUniformLocation(program, 'u_numLenses'),
            apertureTex: gl.getUniformLocation(program, 'u_apertureTex'),
            channel: gl.getUniformLocation(program, 'u_channel'),
            apertureIndex: gl.getUniformLocation(program, 'u_apertureIndex'),
            blurSamples: gl.getUniformLocation(program, 'u_blurSamples'),
            blurStrength: gl.getUniformLocation(program, 'u_blurStrength')
        };

        loadLens('brendel');

        document.getElementById('loading').style.display = 'none';
        requestAnimationFrame(render);

    } catch (e) {
        console.error("Failed to initialize application:", e);
        document.getElementById('loading').innerText = "Error Initializing: " + e.message;
    }
}

init();
