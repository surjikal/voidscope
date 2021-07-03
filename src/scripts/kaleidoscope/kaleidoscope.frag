precision highp float;
precision highp int;

const float PI  = 3.1415926535;
const float PI2 = 6.2831853072;

varying vec3 position;

uniform sampler2D texture;
uniform float pixelRatio;
uniform vec2 resolution;
uniform vec2 imageResolution;
uniform float time;
uniform vec2 zoom;

uniform vec2 frame;
uniform vec2 speed;
uniform vec2 pointerPosition;
uniform vec2 pointerOffset;
uniform float axis;



int intModulo(float a, float b) {
    float m = mod(a, b);
    return int(m + 0.5);
}

void main(void) {
    vec2 resolution = resolution * pixelRatio;
    vec2 c = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    // c.x -= mod(c.x, 1.0 / 256.0);
	// c.y -= mod(c.y, 1.0 / 256.0);

    float angleFrac = PI2 / (2.0 * axis);
    float phi = abs(atan(c.y, c.x));
    float r = length(c);
    int count = int(phi / angleFrac);

    phi = mod(phi, angleFrac);
    if (intModulo(float(count), 2.0) == 1) {
        phi = angleFrac - phi;
    }
    float x = r;
    float y = r * sin(phi);

    vec2 offset = (((pointerOffset / 0.5) - 0.5 * resolution.xy) / resolution.y);

    vec2 transform = vec2(1.5,  0.5) * 0.5;

    vec2 cc = (zoom * vec2(x, y)) + frame + (transform * speed) + (offset);


    vec3 result = texture2D(texture, cc).rgb;
    gl_FragColor = vec4(result, 1.0);
}
