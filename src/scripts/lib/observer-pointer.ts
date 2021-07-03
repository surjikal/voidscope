import { HTMLElementInputWatcher } from "./input";
import { InputEventListenerCallback } from "./InputEventListener";
import { Vector } from "./math";


class PointerDragState {
  offset        : Vector = { x: 0.0, y: 0.0 };
  startOffset   : Vector = { x: 0.0, y: 0.0 };
  startPosition : Vector = { x: 0.0, y: 0.0 };
}

export class PointerObserverState {
  position         : Vector = { x: 0.0, y: 0.0 };
  previousPosition : Vector = { x: 0.0, y: 0.0 };
  percentPosition  : Vector = { x: 0.0, y: 0.0 };
  offset           : Vector = { x: 0.0, y: 0.0 };
  active           : boolean = false;
}

export class PointerObserverOptions {
  ratio: number = 1;
}

export class PointerObserver extends HTMLElementInputWatcher {
  protected state: PointerObserverState;
  protected drag:  PointerDragState;

  constructor(element: HTMLElement, options?: PointerObserverOptions) {
    super(element, options);
    this.state = new PointerObserverState();
    this.drag = new PointerDragState();
    this.onUp(this._onUp.bind(this));
    this.onDown(this._onDown.bind(this));
    this.onMove(this._onMove.bind(this));
  }

  onUp(callback: InputEventListenerCallback) {
    this.listener?.add("mouseup", callback);
    return this;
  }

  onDown(callback: InputEventListenerCallback) {
    this.listener?.add("mousedown", callback);
    return this;
  }

  onMove(callback: InputEventListenerCallback) {
    this.listener?.add("mousemove", callback);
    return this;
  }

  getState(): PointerObserverState {
    return this.state;
  }

  private _onUp(event: MouseEvent) {
    this.state.active = false;
  }

  private _onDown(event: MouseEvent) {
    const position = this.getPositionFromMouseEvent(event);
    const percentPosition = this.getPercentagePositionFromMouseEvent(event);
    this.state.active = true;
    this.state.position = Object.assign({}, position);
    this.state.percentPosition = percentPosition;
    this.drag.offset = { x: 0, y: 0 };
    this.drag.startOffset = Object.assign({}, this.state.offset);
    this.drag.startPosition = Object.assign({}, position);
  }

  private _onMove(event: MouseEvent) {
    const position = this.getPositionFromMouseEvent(event);
    ["x", "y"].forEach(k => {
      this.state.previousPosition[k] = this.state.position[k];
      this.state.position[k] = position[k];
      if (!this.state.active) return;
      this.drag.offset[k] = position[k] - this.drag.startPosition[k];
      this.state.offset[k] = this.drag.startOffset[k] + this.drag.offset[k];
    });
  }

  private getPositionFromMouseEvent(event: MouseEvent): Vector {
    let [x, y] = [event.clientX, event.clientY].map(p => {
      return Math.floor(p * 1.0);
    });
    return { x, y };
  }

  private getPercentagePositionFromMouseEvent(event: any) {
    const { width, height } = event.target.getBoundingClientRect();
    return {
      x: Math.floor(event.clientX / width),
      y: Math.floor(event.clientY / height)
    };
  }
}
