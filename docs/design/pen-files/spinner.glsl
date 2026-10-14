/** @schema 2.11 */
#version 100
precision mediump float;

/* @resolution */
uniform vec2 u_resolution;
/* @time */
uniform float u_time;

#define PI 3.14159265359

// Warm Linen Primary: #D4916E
// 在 Primary（#D4916E 背景）按钮上使用白色，Secondary 按钮上可将下方改为 #D4916E 或 #1A1A1A
#define ICON_COLOR vec3(1.0, 1.0, 1.0)

float sdRing(vec2 p, float radius, float stroke) {
    float d = abs(length(p) - radius);
    return smoothstep(stroke * 0.5 + 1.0, stroke * 0.5 - 1.0, d);
}

void main() {
    vec2 c = u_resolution * 0.5;
    vec2 p = gl_FragCoord.xy - c;

    // 24x24 grid，半径 9px，线宽 2px
    float radius = u_resolution.y * 0.375;
    float stroke = 2.0;

    // 匀速旋转，约 2 秒/圈
    float angle = -u_time * 3.14159265359;
    float a = atan(p.y, p.x) - angle;

    // 把角度归一化到 [0, 2PI]
    float aw = fract((a + PI) / (2.0 * PI));
    aw = abs(aw - 0.5) * 2.0 * PI;

    // 可见弧长约 230°（4.0 弧度），两端做圆角淡出
    float arcLen = 4.0;
    float arc = smoothstep(0.0, 2.5, aw) * smoothstep(arcLen + 2.5, arcLen - 2.5, aw);

    float alpha = sdRing(p, radius, stroke) * arc;

    gl_FragColor = vec4(ICON_COLOR, alpha);
}
