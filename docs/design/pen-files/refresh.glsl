/** @schema 2.11 */
#version 100
precision mediump float;

/* @resolution */
uniform vec2 u_resolution;
/* @time */
uniform float u_time;

#define PI 3.14159265359
#define ICON_COLOR vec3(1.0, 1.0, 1.0)

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float sdRing(vec2 p, float radius, float stroke) {
    float d = abs(length(p) - radius);
    return smoothstep(stroke * 0.5 + 1.0, stroke * 0.5 - 1.0, d);
}

void main() {
    vec2 c = u_resolution * 0.5;
    float angle = -u_time * 3.14159265359;
    float co = cos(angle);
    float si = sin(angle);
    mat2 m = mat2(co, si, -si, co);
    vec2 p = m * (gl_FragCoord.xy - c);

    float radius = u_resolution.y * 0.375;
    float stroke = 2.0;

    // 圆环，留一个缺口
    float a = atan(p.y, p.x);
    float phi = fract((a + PI) / (2.0 * PI));
    float gap = 0.35; // 缺口约占 0.35 / 1.0
    float ring = sdRing(p, radius, stroke);
    float inGap = smoothstep(0.0, 0.06, phi) * smoothstep(gap + 0.06, gap - 0.06, phi);
    float alpha = ring * (1.0 - inGap);

    // 缺口末端的小箭头（chevron）
    float arrowAngle = gap * 2.0 * PI;
    vec2 tip = vec2(cos(arrowAngle), sin(arrowAngle)) * radius;
    vec2 dir = vec2(-sin(arrowAngle), cos(arrowAngle));
    vec2 p1 = tip + dir * 3.5;
    vec2 p2 = tip - dir * 1.5 + vec2(-dir.y, dir.x) * 2.0;
    vec2 p3 = tip - dir * 1.5 - vec2(-dir.y, dir.x) * 2.0;

    float dArrow = min(sdSegment(p, p1, p2), sdSegment(p, p1, p3));
    float arrow = smoothstep(stroke * 0.5 + 1.0, stroke * 0.5 - 1.0, dArrow);

    alpha = max(alpha, arrow);

    gl_FragColor = vec4(ICON_COLOR, alpha);
}
