import { HTMLElementInputWatcher } from "./input";
import { InputEventListenerCallback } from "./InputEventListener";

export type KeyboardObserverState = { [keyboardEventCode: string]: boolean };

export class KeyboardObserver extends HTMLElementInputWatcher {
  protected state: KeyboardObserverState = {};

  constructor(element: HTMLElement) {
    super(element);
    this.onKeyDown(this._updateState.bind(this, true));
    this.onKeyUp(this._updateState.bind(this, false));
  }

  onKeyPress(callback: InputEventListenerCallback) {
    this.listener?.add("keypress", callback);
  }

  getState() {
    return this.state;
  }

  protected onKeyDown(callback: InputEventListenerCallback) {
    this.listener?.add("keydown", callback);
  }

  protected onKeyUp(callback: InputEventListenerCallback) {
    this.listener?.add("keyup", callback);
  }

  private _updateState(value: boolean, event: KeyboardEvent) {
    this.state[event.code] = value;
  }
}
