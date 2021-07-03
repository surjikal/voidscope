// Provides a way to add some event listeners against something,
// and easily cleans them up

export class InputEventListener<T extends InputEventListenerTarget> {
  protected target: T | null;
  private registered: (() => void)[] = [];

  constructor(target: T) {
    this.attach(target);
    this.target = target;
  }

  add(eventName: string, callback: InputEventListenerCallback, ...args: any[]) {
    const target = this.target;
    if (!target) return;
    target.addEventListener(eventName, callback, ...args);
    this.registered.push(() => {
      target.removeEventListener(eventName, callback);
    });
  }

  detach() {
    this.registered.forEach(this.remove.bind(this));
    this.target = null;
  }

  protected attach(target: T) {
    this.detach();
    this.target = target;
  }

  private remove(fn: () => void) {
    try {
      fn();
    } catch (error) {
      console.error(error);
    }
  }
}

export type InputEventListenerCallback = (...args: any[]) => void;

export interface InputEventListenerTarget {
  addEventListener(
    type: string,
    listener: InputEventListenerCallback,
    ...args: any
  ): void;
  removeEventListener(type: string, listener: InputEventListenerCallback): void;
  destroy?: () => void;
}
