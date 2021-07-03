precision highp float;
precision highp int;

varying vec2 vUv;

void main(void) {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
