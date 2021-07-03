import {
  InputEventListener,
  InputEventListenerTarget,
} from "./InputEventListener";

export type InputEventWatcherOptions = { [key: string]: any };
export type InputEventWatcherState = any;

export abstract class InputEventWatcher<T extends InputEventListenerTarget> {
  protected listener: null | InputEventListener<T> = null;
  protected target: null | T = null;
  protected state: InputEventWatcherState;
  protected options: InputEventWatcherOptions;

  constructor(target: T, options?: InputEventWatcherOptions) {
    this.options = options ?? {};
    this.attach(target);
  }

  protected attach(target: T) {
    this.detach();
    this.target = target;
    this.listener = this.createListener(target);
  }

  protected createListener(target: T) {
    return new InputEventListener(target);
  }

  public detach() {
    this.listener?.detach();
    this.listener = null;
    this.target = null;
    this.state = null;
  }

  public getState(): InputEventWatcherState {
    return this.state;
  }

  public updateOptions(options: InputEventWatcherOptions) {
    this.options = Object.assign({}, this.options, options);
  }
}
