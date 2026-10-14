/** @schema 2.11 */
#version 100
precision mediump float;

/* @resolution */
uniform vec2 u_resolution;
/* @time */
uniform float u_time;

#define ICON_COLOR vec3(1.0, 1.0, 1.0)

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void main() {
    vec2 c = u_resolution * 0.5;
    // 轻微摇摆/倒置动画，幅度 ±0.25 弧度，周期约 2 秒
    float rot = 0.25 * sin(u_time * 1.5);
    float co = cos(rot);
    float si = sin(rot);
    mat2 m = mat2(co, si, -si, co);
    vec2 p = m * (gl_FragCoord.xy - c);

    // 24x24 坐标系下的沙漏骨架，2px 描边
    float stroke = 2.0;
    float d = 1000.0;

    vec2 tl = vec2(-8.0,  7.0);
    vec2 tr = vec2( 8.0,  7.0);
    vec2 bl = vec2(-8.0, -7.0);
    vec2 br = vec2( 8.0, -7.0);
    vec2 neck = vec2(0.0, 0.0);

    // 上沿、下沿
    d = min(d, sdSegment(p, tl, tr));
    d = min(d, sdSegment(p, bl, br));
    // 从四角到中心颈的四条斜线
    d = min(d, sdSegment(p, tl, neck));
    d = min(d, sdSegment(p, tr, neck));
    d = min(d, sdSegment(p, bl, neck));
    d = min(d, sdSegment(p, br, neck));

    float alpha = smoothstep(stroke * 0.5 + 1.0, stroke * 0.5 - 1.0, d);

    gl_FragColor = vec4(ICON_COLOR, alpha);
}
