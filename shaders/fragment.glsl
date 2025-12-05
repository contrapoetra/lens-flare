#version 300 es
precision highp float;
precision highp int;
in float v_intensity;
in float v_r_rel;
in vec2 v_texCoord;
in vec2 v_velocity;
uniform vec3 u_baseColor;
uniform int u_renderMode; // 0: Textured, 1: Wireframe, 2: Velocity
uniform sampler2D u_apertureTex;
out vec4 outColor;

void main() {
    float clip = 1.0 - smoothstep(0.98, 1.02, v_r_rel);
    if (v_intensity <= 0.0001) discard;

    if (u_renderMode == 3) { // viewing velocity (directional) heatmap
        float speed = length(v_velocity);

        // Angle to Hue
        float angle = atan(v_velocity.y, v_velocity.x);
        float hue = angle / 6.2831853 + 0.5;

        // HSV to RGB
        vec3 p = abs(fract(vec3(hue) + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - vec3(3.0));
        vec3 col = clamp(p - vec3(1.0), 0.0, 1.0);

        // Circular point shape
        vec2 circ = 2.0 * gl_PointCoord - 1.0;
        if (dot(circ, circ) > 1.0) discard;

        // Fade based on speed (so static points fade out)
        float visibility = smoothstep(0.0, 0.00, speed);

        outColor = vec4(col, visibility);
        return;
    }

    float texFactor = 1.0;
    if (u_renderMode == 0) {
        vec2 uv = v_texCoord * 0.5 + 0.5;
        texFactor = texture(u_apertureTex, uv).r;
        if (texFactor < 0.05) discard;
    }

    float alpha = v_intensity * clip * texFactor;
    if (u_renderMode == 1) outColor = vec4(u_baseColor, min(1.0, alpha * 4.0));
    else outColor = vec4(u_baseColor * alpha, 1.0);
}
