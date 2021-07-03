import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { Vector } from "../lib/math";
import {
  ImageDropObserver,
  ScrollObserver,
  SizeObserver,
  SizeObserverState,
  URLObserver
} from "../lib/input";
import {
  KeyboardObserver,
  KeyboardObserverState
} from "../lib/observer-keyboard";
import { PointerObserver, PointerObserverState } from "../lib/observer-pointer";

const SHADER = {
  fragment: require("./passthrough.frag") as string,
  vertex: require("./passthrough.vert") as string
};

class InputObservers {
  public url!: URLObserver;
  public scroll!: ScrollObserver;
  public keyboard!: KeyboardObserver;
  public pointer!: PointerObserver;
  public size!: SizeObserver;
  public drop!: ImageDropObserver;

  constructor(el: HTMLElement, canvas: HTMLElement, window: Window) {
    this.attach(el, canvas, window);
  }

  attach(el: HTMLElement, canvas: HTMLElement, window: Window) {
    this.url = new URLObserver(window);
    this.scroll = new ScrollObserver(el);
    this.keyboard = new KeyboardObserver(el);
    this.pointer = new PointerObserver(el);
    this.drop = new ImageDropObserver(el);
    this.size = new SizeObserver(el);
  }

  detach() {
    this.url?.detach();
    this.scroll?.detach();
    this.keyboard?.detach();
    this.pointer?.detach();
    this.drop?.detach();
    this.size?.detach();
  }
}

type Shader = { vertex: any; fragment: any };
type Uniforms = { [key: string]: { type: string; value: any } };

abstract class Engine {
  private animationTimer: null | number = null;
  private framerates = [1, 30, 60, 120];
  private counters: {fps: Record<string, number>} = { fps: {} };
  private clock = {
    current: Date.now(),
    previous: Date.now()
  };
  protected fps: Record<string, boolean> = {};
  protected delta = { current: 0, previous: 0, diff: 0 };

  constructor() {
    this.framerates.forEach(framerate => {
      this.counters.fps[framerate] = 0;
      this.fps[framerate] = false;
    });
  }

  start() {
    this.clock.current = Date.now();
    this.clock.previous = Date.now();
    this.loop();
  }

  stop() {
    if (this.animationTimer !== null) {
      cancelAnimationFrame(this.animationTimer);
    }
  }

  protected render() {}
  protected update() {}

  protected tick() {
    this.clock.previous = this.clock.current;
    this.clock.current = Date.now();
    const diff = this.clock.current - this.clock.previous;

    this.framerates.forEach(key => {
      const timer = this.counters.fps[key];
      const triggered = timer > (1 / key) * 1000;
      this.counters.fps[key] = triggered ? 0 : timer + diff;
      this.fps[key] = triggered;
    });

    try {
      this.update();
    } catch (error) {
      this.stop();
      throw error;
    }

    try {
      this.render();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  protected loop() {
    this.tick();
    this.animationTimer = requestAnimationFrame(this.loop.bind(this));
  }
}

class ShaderCanvasGraphics {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  public composer: EffectComposer;

  constructor(shader: Shader, uniforms: Uniforms, pixelRatio = 1) {
    this.renderer = this.getRenderer(pixelRatio);
    this.composer = new EffectComposer(this.renderer);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.camera.position.z = 1;

    this.scene = new THREE.Scene();
    const mesh = this.getMesh(uniforms, shader);
    this.scene.add(mesh);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // this.composer.addPass(new BokehPass(this.scene, this.camera, {}));
    // this.composer.addPass(new AfterimagePass());
  }

  render() {
    this.composer.render();
  }

  getElement() {
    const canvas = this.renderer.domElement;
    canvas.setAttribute("tabindex", "-1");
    canvas.width = 0;
    canvas.height = 0;
    return canvas;
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  private getRenderer(pixelRatio = 1) {
    let renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0xffffff, 0);
    return renderer;
  }

  private getMesh(uniforms: Uniforms, shader: Shader) {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertex,
        fragmentShader: shader.fragment
      })
    );
  }
}

export class ShaderCanvas extends Engine {
  private imagePromise: null | Promise<any> = null;
  private graphics: ShaderCanvasGraphics;

  protected uniforms: Uniforms;
  protected observers: null | InputObservers = null;
  protected el: null | HTMLElement = null;
  protected points: number[] = [];

  constructor(el: HTMLElement, window: Window) {
    super();
    this.uniforms = this.getUniforms();
    this.graphics = new ShaderCanvasGraphics(
      this.getShader(),
      this.uniforms,
      this.getPixelRatio()
    );
    this.attach(el, window);
  }

  attach(el: HTMLElement, window: Window) {
    this.detach();
    this.el = el;

    const canvas = this.graphics.getElement();
    canvas.style.transition = "filter 0.3s";
    canvas.width = 100;
    canvas.height = 100;
    el.appendChild(canvas);

    this.observers = new InputObservers(el, canvas, window);

    const euclideanDistance = (start: Vector, end: Vector) => {
      const x = Math.pow(start.x - end.x, 2);
      const y = Math.pow(start.y - end.y, 2);
      return Math.sqrt(x + y);
    };

    this.points = [];
    this.observers.pointer.onUp(() => {
      const state = this.observers?.pointer.getState();
      if (!state || !state.active) return;
      const distance = euclideanDistance(state.position, state.previousPosition);
      this.points.push(distance);
      this.points =
        this.points.length > 10 ? this.points.slice(1) : this.points;
    });

    this.observers.drop
      .onDragOver(() => {})
      .onDragExit(() => {})
      .onDragEnter(() => {
        canvas.style.filter = "blur(20px)";
      })
      .onDragLeave(() => {
        canvas.style.filter = "blur(0px)";
      })
      .onFileDrop(file => {
        canvas.style.filter = "blur(0px)";
        this.setTextureFromImage(file);
      })
      .onUrlDrop(url => {
        canvas.style.filter = "blur(0px)";
        this.setImage(url);
        window.location.hash = `#${url}`;
      });

    this.observers.url.onUrlChange(url => {
      console.log("URL Changedw")
      const imageUrl = window.location.hash?.slice(1) ?? null;
      if (!imageUrl) return;
      this.setImage(imageUrl);
    });

    this.observers.size.onResize((width, height) => {
      canvas.width = width;
      canvas.height = height;
    });

    this.observers.scroll.onScroll(event => {});
  }

  getShader() {
    return { vertex: SHADER.vertex, fragment: SHADER.fragment };
  }

  getUniforms() {
    return {
      resolution: {
        type: "v2",
        value: new THREE.Vector2(0.0, 0.0)
      },
      imageResolution: {
        type: "v2",
        value: new THREE.Vector2(0.0, 0.0)
      },
      time: {
        type: "f",
        value: 0.0
      },
      random: {
        type: "f",
        value: Math.random()
      },
      pointerPosition: {
        type: "v3",
        value: new THREE.Vector3(0.0, 0.0, 0.0)
      },
      pointerOffset: {
        type: "v2",
        value: new THREE.Vector2(0.0, 0.0)
      },
      texture: {
        type: "t",
        value: null
      },
      pixelRatio: {
        type: "float",
        value: this.getPixelRatio()
      }
    };
  }

  getPixelRatio() {
    return window.devicePixelRatio ?? 1;
  }

  async start() {
    if (this.imagePromise) await this.imagePromise;
    super.start();
  }

  render() {
    this.graphics.render();
  }

  update() {
    if (this.observers) {
      this.updateSize(this.observers.size.getState());
      this.updateKeyboard(this.observers.keyboard.getState());
      this.updatePointer(this.observers.pointer.getState());
    }
    this.updateTime(this.delta.current);
  }

  updateTime(timeDelta: number) {
    this.uniforms.time.value += timeDelta;
  }

  updatePointer(pointer: PointerObserverState) {
    this.uniforms.pointerOffset.value.x = pointer.offset.x;
    this.uniforms.pointerOffset.value.y = pointer.offset.y;
    this.uniforms.pointerPosition.value.x = pointer.position.x;
    this.uniforms.pointerPosition.value.y = pointer.position.y;
    this.uniforms.pointerPosition.value.z = pointer.active ? 0.0 : 1.0;
  }

  updateKeyboard(state: KeyboardObserverState) {}

  updateSize(state: SizeObserverState) {
    this.graphics.setSize(state.width, state.height);
    this.uniforms.resolution.value.set(state.width, state.height);
  }

  detach() {
    const canvas = this.graphics.getElement();
    this.el?.removeChild(canvas);
    this.observers?.detach();
    this.observers = null;
    this.el = null;
  }

  async setImage(imageUrl: string) {
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(imageUrl);
    this.setTexture(texture);
  }

  private setTextureFromImage(
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ) {
    let texture = new THREE.Texture(image);
    this.setTexture(texture);
  }

  setTexture(texture: THREE.Texture) {
    const image = texture.image;
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    texture.anisotropy = 1;
    texture.format = THREE.RGBFormat;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.uniforms.texture = { type: "t", value: texture };
    this.uniforms.imageResolution.value.x = width || 0;
    this.uniforms.imageResolution.value.y = height || 0;
  }
}
