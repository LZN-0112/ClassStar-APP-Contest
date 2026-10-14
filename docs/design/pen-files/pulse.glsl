/** @schema 2.11 */
#version 100
precision mediump float;

/* @resolution */
uniform vec2 u_resolution;
/* @time */
uniform float u_time;

#define ICON_COLOR vec3(1.0, 1.0, 1.0)

void main() {
    vec2 c = u_resolution * 0.5;
    vec2 p = gl_FragCoord.xy - c;
    float dist = length(p);

    float alpha = 0.0;

    // 中心点（常亮）
    float dotRadius = 2.5;
    float centerDot = smoothstep(dotRadius + 1.0, dotRadius - 1.0, dist);
    alpha = max(alpha, centerDot);

    // 两道向外扩散的脉冲环
    float period = 1.8;
    float stroke = 1.5;
    float maxR = u_resolution.y * 0.42;

    for (int i = 0; i < 2; i++) {
        float offset = float(i) * 0.5;
        float phase = fract(u_time / period + offset);
        float r = 3.0 + phase * maxR;
        float ring = smoothstep(stroke * 0.5 + 1.0, stroke * 0.5 - 1.0, abs(dist - r));
        float fade = 1.0 - phase;
        alpha = max(alpha, ring * fade * 0.9);
    }

    // 中心点轻微呼吸
    float breathe = 0.85 + 0.15 * sin(u_time * 3.0);
    alpha = max(alpha, centerDot * breathe);

    gl_FragColor = vec4(ICON_COLOR, alpha);
}
