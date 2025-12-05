#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec2 a_uv;

struct Lens { float center; float radius; float aperture; float n_d; float V; float z; };
const int MAX_LENSES = 40;

uniform Lens u_lenses[MAX_LENSES];
uniform int u_numLenses;
uniform vec3 u_lightDir;
uniform vec3 u_prevLightDir;
uniform float u_apertureVal;
uniform ivec2 u_ghostIndices;
uniform float u_sensorZ;
uniform float u_wavelength;
uniform vec2 u_screenSize;
uniform float u_scale;
uniform int u_apertureIndex;
uniform int u_blurSamples;
uniform float u_blurStrength;
uniform int u_renderMode; // 0:Tex, 1:Wire, 2:VelWire, 3:VelPoints

out float v_intensity;
out float v_r_rel;
out vec2 v_texCoord;
out vec2 v_velocity;

float getIOR(float n_d, float V, float wavelength) {
    if (n_d == 1.0) return 1.0;
    float dispersion = (n_d - 1.0) / V;
    float shift = (587.6 - wavelength) * 0.002;
    return n_d + dispersion * shift;
}

float fresnel(vec3 I, vec3 N, float n1, float n2) {
    float cosTheta = abs(dot(I, N));
    float r0 = (n1 - n2) / (n1 + n2);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

vec3 intersectSurface(vec3 rayPos, vec3 rayDir, int k) {
    float r = u_lenses[k].radius;
    float z = u_lenses[k].z;
    float center = u_lenses[k].center;
    float t = -1.0;
    if (abs(r) < 0.001) {
        if (abs(rayDir.z) > 1e-6) t = (z - rayPos.z) / rayDir.z;
    } else {
        vec3 L = rayPos - vec3(0.0, 0.0, center);
        float a = dot(rayDir, rayDir);
        float b = 2.0 * dot(rayDir, L);
        float c = dot(L, L) - (r * r);
        float disc = b*b - 4.0*a*c;
        if (disc >= 0.0) {
            float t0 = (-b - sqrt(disc)) / (2.0*a);
            float t1 = (-b + sqrt(disc)) / (2.0*a);
            float z0 = rayPos.z + rayDir.z * t0;
            float z1 = rayPos.z + rayDir.z * t1;
            t = (abs(z0 - z) < abs(z1 - z)) ? t0 : t1;
        }
    }
    return vec3(t, 0.0, (t > -9999.0) ? 1.0 : 0.0);
}

struct TraceResult {
    vec3 sensorHit;
    float intensity;
    float max_r_rel;
    vec2 texCoord;
    bool dead;
};

TraceResult traceLens(vec3 dir) {
    float entranceScale = u_lenses[0].aperture * 2.0;
    vec3 rayPos = vec3(a_uv * entranceScale, -10.0);
    vec3 rayDir = normalize(dir);

    TraceResult res;
    res.intensity = 1.0;
    res.max_r_rel = 0.0;
    res.texCoord = vec2(0.0);
    res.dead = false;

    float currentIOR = 1.0;
    int g1 = u_ghostIndices.x;
    int g2 = u_ghostIndices.y;
    bool isPrimary = (g1 == -1);

    int stage = 0; int k = 0; int direction = 1;
    int target = isPrimary ? u_numLenses - 1 : g1;

    for(int step = 0; step < 100; step++) {
        vec3 hitRes = intersectSurface(rayPos, rayDir, k);
        if (hitRes.z == 0.0) { res.dead = true; break; }

        rayPos = rayPos + rayDir * hitRes.x;

        if (k == u_apertureIndex) {
            float maxR = u_lenses[k].aperture * u_apertureVal;
            res.texCoord = rayPos.xy / maxR;
        }

        float limit = u_lenses[k].aperture;
        if (k == u_apertureIndex) limit *= u_apertureVal;

        float r_rel = length(rayPos.xy) / limit;
        res.max_r_rel = max(res.max_r_rel, r_rel);

        vec3 normal;
        if (abs(u_lenses[k].radius) < 0.001) normal = vec3(0.0, 0.0, -float(direction));
        else {
            normal = normalize(rayPos - vec3(0.0, 0.0, u_lenses[k].center));
            if (u_lenses[k].radius < 0.0) normal = -normal;
        }

        float nextIOR = 1.0;
        if (direction > 0) nextIOR = getIOR(u_lenses[k].n_d, u_lenses[k].V, u_wavelength);
        else {
            if (k > 0) nextIOR = getIOR(u_lenses[k-1].n_d, u_lenses[k-1].V, u_wavelength);
            else nextIOR = 1.0;
        }

        bool isReflect = false;
        if (!isPrimary) {
            if (stage == 0 && k == g1 && direction > 0) isReflect = true;
            if (stage == 1 && k == g2 && direction < 0) isReflect = true;
        }

        if (isReflect) {
            rayDir = reflect(rayDir, normal);
            float f = fresnel(rayDir, normal, currentIOR, nextIOR);
            float coating = 0.5 + 0.5 * pow(abs(u_wavelength - 550.0) / 300.0, 2.0);
            res.intensity *= f * 4.0 * coating;

            if (stage == 0) { stage = 1; direction = -1; target = g2; }
            else if (stage == 1) { stage = 2; direction = 1; target = u_numLenses - 1; }
        } else {
            float eta = currentIOR / nextIOR;
            float cosI = dot(-rayDir, normal);
            vec3 n = normal;
            if (cosI < 0.0) { cosI = -cosI; n = -n; }
            float k_ref = 1.0 - eta * eta * (1.0 - cosI * cosI);

            if (k_ref < 0.0) { res.dead = true; break; }
            rayDir = eta * rayDir + (eta * cosI - sqrt(k_ref)) * n;
            currentIOR = nextIOR;
        }

        k += direction;
        if (stage == 0 && k > target) { if(isPrimary) break; }
        if (stage == 2 && k > target) break;
        if (k < 0 || k >= u_numLenses) break;
    }

    if (!res.dead) {
        float tSensor = (u_sensorZ - rayPos.z) / rayDir.z;
        if (tSensor > 0.0) {
            res.sensorHit = rayPos + rayDir * tSensor;
        } else {
            res.dead = true;
        }
    }
    return res;
}

void main() {
    // 1. Trace Current Frame
    TraceResult curr = traceLens(u_lightDir);

    // 2. Trace Previous Frame
    TraceResult prev = traceLens(u_prevLightDir);

    if (curr.dead || prev.dead) {
        gl_Position = vec4(-10.0, -10.0, -10.0, 1.0); // Safe off-screen
        v_intensity = 0.0;
        v_r_rel = 999.0;
        return;
    }

    // 3. Screen Space Projection
    float aspect = u_screenSize.x / u_screenSize.y;

    vec2 posCurr = (curr.sensorHit.xy * 20.0) / u_scale;
    vec2 posPrev = (prev.sensorHit.xy * 20.0) / u_scale;

    // Fix aspect ratio for X
    posCurr.x /= aspect;
    posPrev.x /= aspect;

    // 4. Calculate Velocity with Strength
    vec2 velocity = (posCurr - posPrev) * u_blurStrength;
    v_velocity = velocity;

    // 5. Apply Motion Blur
    float t = float(gl_InstanceID) / float(u_blurSamples - 1);
    vec2 motionVector = posCurr - posPrev;
    vec2 startPos = posCurr - motionVector * u_blurStrength;
    vec2 finalPos = mix(startPos, posCurr, t);

    // Apply standard clipping/fading logic
    float dist = length(vec2(finalPos.x * aspect, finalPos.y));
    float fade = smoothstep(3.0, 1.5, dist);

    gl_Position = vec4(finalPos.x, finalPos.y, 0.0, 1.0);

    // v_intensity = curr.intensity * fade * (1.0 / float(u_blurSamples));
    v_intensity = curr.intensity * (1.0 / float(u_blurSamples));
    v_r_rel = curr.max_r_rel;
    v_texCoord = curr.texCoord;

    gl_PointSize = (u_renderMode == 3) ? 4.0 : 1.0;
}
