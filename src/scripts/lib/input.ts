import { ResizeObserver } from "resize-observer";
import { ResizeObserverEntry } from "resize-observer/lib/ResizeObserverEntry";
import { ContentRect } from "resize-observer/lib/ContentRect";
import { Rectangle } from "./math";
import { InputEventWatcher } from "./InputEventWatcher";

import {
  InputEventListener,
  InputEventListenerCallback,
} from "./InputEventListener";

class ResizeObserverInputEventListener extends InputEventListener<HTMLElement> {
  protected callbacks: InputEventListenerCallback[] = [];
  private observer: ResizeObserver | null = null;

  constructor(target: HTMLElement) {
    super(target);
  }

  add(eventName: string, callback: InputEventListenerCallback) {
    if (eventName !== "resize") return;
    this.callbacks.push(callback);
  }

  detach() {
    this.callbacks = [];
    this.observer?.disconnect();
    this.observer = null;
    this.target = null;
  }

  protected attach(target: HTMLElement) {
    this.observer = new ResizeObserver(this.onResize.bind(this));
    this.observer.observe(target);
  }

  private onResize(entries: ResizeObserverEntry[]) {
    const rect = entries[0]?.contentRect ?? ({} as unknown);
    this.callbacks.forEach((callback) => {
      setTimeout(callback, 0, rect as ContentRect);
    });
    return this;
  }
}

export abstract class WindowInputWatcher extends InputEventWatcher<Window> {}
export abstract class HTMLElementInputWatcher extends InputEventWatcher<HTMLElement> {}

export class ScrollObserver extends HTMLElementInputWatcher {
  onScroll(callback: InputEventListenerCallback) {
    this.listener?.add("scroll", callback);
    return this;
  }
}

export class URLObserver extends WindowInputWatcher {
  onUrlChange(callback: InputEventListenerCallback) {
    this.listener?.add("hashchange", callback);
    return this;
  }
}

export type SizeObserverState = Rectangle;

abstract class ResizeObserverInputEventWatcher extends InputEventWatcher<
  HTMLElement
> {
  protected createListener(target: HTMLElement) {
    return new ResizeObserverInputEventListener(target);
  }
}

export class SizeObserver extends ResizeObserverInputEventWatcher {
  protected state: SizeObserverState;

  constructor(target: HTMLElement) {
    super(target);
    this.onResize(this._onResize.bind(this));
    this.state = {
      width: target.offsetWidth ?? 0,
      height: target.offsetHeight ?? 0,
    };
  }

  getState(): SizeObserverState {
    return this.state;
  }

  onResize(callback: InputEventListenerCallback) {
    this.listener?.add("resize", callback);
    return this;
  }

  private _onResize(rect: ContentRect) {
    this.state.width = rect.width ?? 0;
    this.state.height = rect.height ?? 0;
  }
}

export abstract class ImageDropObserverOptions {
  timeout: number = 30 * 10000;
}

export class DropObserver extends HTMLElementInputWatcher {
  constructor(target: HTMLElement, options?: ImageDropObserverOptions) {
    super(target, options);
  }

  onDragEnter(callback?: InputEventListenerCallback) {
    this.listener?.add("dragenter", this._preventDefault(callback), false);
    return this;
  }

  onDragOver(callback?: InputEventListenerCallback) {
    this.listener?.add("dragover", this._preventDefault(callback), false);
    return this;
  }

  onDragExit(callback?: InputEventListenerCallback) {
    this.listener?.add("dragexit", this._preventDefault(callback), false);
    return this;
  }

  onDragLeave(callback?: InputEventListenerCallback) {
    this.listener?.add("dragleave", this._preventDefault(callback), false);
    return this;
  }

  onFileDrop(callback: InputEventListenerCallback) {
    this.listener?.add(
      "drop",
      this._preventDefault(async (e: DragEvent) => {
        const file = e.dataTransfer?.files[0];
        if (!file) return;
        const data = await this.readFile(file);
        callback(data);
      }),
      false
    );
    return this;
  }

  onUrlDrop(callback: InputEventListenerCallback) {
    this.listener?.add(
      "drop",
      this._preventDefault(async (e: DragEvent) => {
        const item = e.dataTransfer?.items[0];
        if (item) item.getAsString(callback);
      }),
      false
    );
    return this;
  }

  private readFile(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      let rejected = false;
      let timer = setTimeout(() => {
        reject(new Error("Read file timeout."));
        rejected = true;
      }, this.options?.timeout ?? 10000);
      reader.onload = (event) => {
        if (rejected) return;
        clearTimeout(timer);
        return resolve(event.target?.result as string);
      };
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  private _preventDefault(callback?: InputEventListenerCallback) {
    return (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (callback) callback(event);
      return false;
    };
  }
}

export class ImageDropObserver extends DropObserver {
  constructor(target: HTMLElement, options?: ImageDropObserverOptions) {
    super(target, options);
  }

  onDrop(callback: InputEventListenerCallback) {
    return super.onFileDrop((data: string) => {
      const image = this.readImage(data);
      setTimeout(callback, 0, image);
    });
  }

  private readImage(data: string): null | HTMLElement {
    if (!this.target) return null;
    let image = this.target?.ownerDocument.createElement("img");
    image.src = data;
    return image;
  }
}
