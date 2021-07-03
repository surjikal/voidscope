import { Vector2 } from "three";
import { ShaderCanvas } from "../canvas";
import { KeyboardObserverState } from "../lib/observer-keyboard";

const fragment = require("./kaleidoscope.frag") as string;
const vertex = require("./kaleidoscope.vert") as string;

export class KaleidoscopeShader extends ShaderCanvas {
  running = true;
  pointerSpeed = 0;
  friction = 0.0000005;

  constructor(el: HTMLElement, window: Window) {
    super(el, window);
    this.observers?.keyboard.onKeyPress(this.onKeyPress.bind(this));
  }

  getUniforms() {
    let uniforms = super.getUniforms() as any;
    uniforms.axis = { type: "f", value: 12.0 };
    uniforms.zoom = { type: "v2", value: new Vector2(1.0, 1.0) };
    uniforms.frame = { type: "v2", value: new Vector2(0.0, 0.0) };
    uniforms.stretch = { type: "v2", value: new Vector2(0.0, 0.65) };
    uniforms.speed = {
      type: "v2",
      value: new Vector2(-0.0004, 0.0003)
    };
    return uniforms;
  }

  getShader() {
    return { vertex, fragment };
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key == " ") this.running = !this.running;
  }

  private getSpeed(speed: number, friction: number) {
    if (Math.abs(speed) <= friction) return 0;
    friction = speed > 0 ? friction : -friction;
    speed = speed - friction;
    return speed;
  }

  update() {
    super.update();

    const keyboard = this.observers?.keyboard.getState();

    const isMoving = keyboard && (
      keyboard.ArrowUp ||
      keyboard.ArrowDown ||
      keyboard.ArrowLeft ||
      keyboard.ArrowRight);

    const friction = isMoving ? this.friction : 0;

    if (!isMoving && this.running) {
      const { x, y } = this.uniforms.speed.value;
      this.uniforms.speed.value.x = this.getSpeed(x, friction);
      this.uniforms.speed.value.y = this.getSpeed(y, friction);
    }

    const pointer = this.observers?.pointer.getState();

    if (!pointer || !pointer.active) {
      this.uniforms.frame.value.x += (this.running || isMoving) ? this.uniforms.speed.value.x : 0.0;
      this.uniforms.frame.value.y += (this.running || isMoving) ? this.uniforms.speed.value.y : 0.0;
    }
  }

  updateKeyboard(state: KeyboardObserverState) {
    this.updateStretch(state);
    this.updateAxisFromKeyboardState(state);
    this.updateZoomFromKeyboardState(state);
    this.updateSpeedFromKeyboardState(state);
  }

  updateAxisFromKeyboardState(state: KeyboardObserverState) {
    if (state.ShiftLeft) return;
    var value = this.uniforms.axis.value;

    if (state.KeyQ) value = value + 0.1;
    if (state.KeyE) value = Math.max(2, value - 0.1);

    this.uniforms.axis.value = value;
  }

  updateStretch(state: KeyboardObserverState) {
    var value = this.uniforms.stretch.value.y;
    if (state.KeyD) value = value + 0.01;
    if (state.KeyA) value = Math.abs(value - 0.01);
    this.uniforms.stretch.value.y = value;
  }

  updateZoomFromKeyboardState(state: KeyboardObserverState) {
    let increment = state.ShiftLeft ? 0.1 : 0.01;
    let value = this.uniforms.zoom.value.x;
    if (state.KeyW) value = value - increment;
    if (state.KeyS) value = value + increment;
    this.uniforms.zoom.value.x = value;
    this.uniforms.zoom.value.y = value;
  }

  updateSpeedFromKeyboardState(state: KeyboardObserverState) {
    if (!this.running) return;
    let increment = state.ShiftLeft ? 0.0004 : 0.0001;

    let value = this.uniforms.speed.value.x;
    if (state.ArrowRight) value = value - increment;
    if (state.ArrowLeft) value = value + increment;
    this.uniforms.speed.value.x = value;

    value = this.uniforms.speed.value.y;
    if (state.ArrowUp) value = value - increment;
    if (state.ArrowDown) value = value + increment;
    this.uniforms.speed.value.y = value;
  }
}
