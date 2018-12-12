
const DEFAULT_VERTEX_SHADER = `
precision highp float;
precision highp int;

attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main(void) {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`

const DEFAULT_FRAGMENT_SHADER = `
precision highp float;
precision highp int;

uniform float time;
uniform sampler2D texture;

varying vec2 vUv;
void main(void) {
  gl_FragColor = texture2D(texture, vUv);
}
`



class ShaderCanvas {

  constructor(el, imageUrl) {
    if (!el) {
      throw new Error("Missing required `el` argument.");
    }
    if (!imageUrl) {
      throw new Error("Missing required `imageUrl` argument.");
    }
    this.camera = this.getCamera();
    this.renderer = this.getRenderer();
    this.uniforms = this.getUniforms();
    this.scene = this.getScene(this.uniforms);
    this.clock = new THREE.Clock();
    this.started = false;
    this.attach(el, this.renderer);
    this.updateTextureFromURL(imageUrl, () => { this.start(); });
  }

  getRenderer() {
    let renderer = new THREE.WebGLRenderer({
        antialias: false
    ,   alpha: false
    ,   depth: false
    ,   powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(this.getPixelRatio());
    renderer.setClearColor(0xffffff, 0.0);
    return renderer;
  }

  getCamera() {
    return new THREE.OrthographicCamera(45, 0, 1, 100);
  }

  getScene(uniforms) {
    let scene = new THREE.Scene();
    let mesh = this.getMesh(uniforms);
    scene.add(mesh);
    return scene;
  }

  getPixelRatio() {
    return window.devicePixelRatio ? window.devicePixelRatio : 1;
  }

  getShaderPrograms() {
    return {
      vertex: DEFAULT_VERTEX_SHADER
    , fragment: DEFAULT_FRAGMENT_SHADER
    }
  }

  getMesh(uniforms) {
    const shaders = this.getShaderPrograms();
    let material = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(2, 2),
      new THREE.RawShaderMaterial({
        uniforms: uniforms
      , vertexShader: shaders.vertex
      , fragmentShader: shaders.fragment
      })
    );
    material.depthTest = false;
    return material;
  }

  getUniforms() {
    return {
      resolution: {
        type: 'v2',
        value: new THREE.Vector2(0.0, 0.0)
      }
    , imageResolution: {
        type: 'v2',
        value: new THREE.Vector2(0.0, 0.0)
      }
    , time: {
        type: 'f',
        value: 0.0
      }
    , shiftKey: {
        type: 'f',
        value: 0.0
      }
    , random: {
        type: 'f',
        value: Math.random()
      }
    , mouse: {
        type: 'v3',
        value: new THREE.Vector2(0.0, 0.0, 0.0)
      }
    , pixelRatio: {
        type: 'float'
      , value: this.getPixelRatio()
      }
    }
  }

  start(interval) {
    if (!this.el) {
      throw new Error("Must be attached to an element before starting.")
    }
    this.sz = 0;
    this.started = true;
    this.renderDelta = 0;
    this.renderClock = new THREE.Clock();
    this.interval = 1 / 60;
    this.animationTimer = this.renderLoop();
  }

  stop() {
    this.started = false;
    cancelAnimationFrame(this.animationTimer);
  }

  renderLoop() {
    this.renderDelta += this.renderClock.getDelta();
    if (this.renderDelta > this.interval) {
      this.renderDelta = this.renderDelta % this.interval;
      this.render();
      this.update();
    }
    this.animationTimer = requestAnimationFrame(this.renderLoop.bind(this));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  update() {
    this.updateSize(this.size.width, this.size.height);
    this.updateMouse();
    this.updateTime();
  }

  updateTime() {
    this.uniforms.time.value += this.clock.getDelta();
  }

  updateMouse() {
    this.uniforms.mouse.value.x = this.mouse.position.x;
    this.uniforms.mouse.value.y = this.mouse.position.y;
    this.uniforms.mouse.value.z = this.mouse.position.pressed ? 1.0 : 0.0;
  }

  updateSize(width, height) {
    let rendererSize = this.renderer.getSize();
    let sizeHasChanged = (this.size.width != rendererSize.width || this.size.height != rendererSize.height);
    if (!sizeHasChanged) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.uniforms.resolution.value.set(width, height);
  }

  attach(el, renderer) {
    renderer = renderer ? renderer : this.renderer;
    if (!this.renderer) { throw new Error("Missing required 'renderer' argument."); }
    this.detach(el);
    this.attachHandlers(el);
    this.el = el;
    let canvas = renderer.domElement;
    canvas.setAttribute('tabindex', '-1')
    this.el.appendChild(canvas);
    this.size = {width:el.clientWidth, height:el.clientHeight};
  }

  detach(el, renderer) {
    el = this.el || el;
    renderer = this.renderer || renderer;
    if (!el || !renderer) return;
    this.detachHandlers();
    try { el.removeChild(renderer.domElement) } catch (e) {}
    this.el = null;
    this.size = {width:0, height:0};
  }

  attachHandlers(el) {
    this.detachHandlers();
    this.attachResizeHandler(el);
    this.attachFileDropHandler(el);
    this.attachKeyboardHandler(el);
    this.attachMouseHandler(el);
  }

  detachHandlers() {
    (this._eventCleanupFns || []).forEach((x) => x());
    this._eventCleanupFns = [];
  }

  attachKeyboardHandler(el) {
    this.keyboard = {};
    this._addEventListener(el, "keydown", (e) => {
      this.onKeyDown(e.keyCode, e.shiftKey);
    });
    this._addEventListener(el, "keyup", (e) => {
      this.onKeyUp(e.keyCode, e.shiftKey);
    });
  }

  attachMouseHandler(el) {

    if (!this.mouse) {
      this.mouse = {};
      this.mouse.pressed = false;
      this.mouse.initialPosition = {x:0, y:0};
      this.mouse.position = {x:0, y:0};
      this.mouse.offset = {x:0, y:0};
      this.mouse.currentOffset = {x:0, y:0};
    }

    this._addEventListener(el, "mousedown", (e) => {
      this.mouse.pressed = true;
      this.mouse.currentOffset = {x:0, y:0};
      this.mouse.initialOffset = {x:this.mouse.offset.x, y:this.mouse.offset.y};
      this.mouse.initialPosition = {x:e.clientX, y:e.clientY};
      this.mouse.position = {x:e.clientX, y:e.clientY};
      this.onMouseDown();
    });

    this._addEventListener(el, "mouseup", (e) => {
      this.mouse.pressed = false;
      console.log(this.mouse.offset);
      this.onMouseUp();
    });

    this._addEventListener(el, "mousemove", (e) => {
      this.mouse.position = {x:e.clientX, y:e.clientY};
      if (this.mouse.pressed) {
        this.mouse.currentOffset.x = (e.clientX - this.mouse.initialPosition.x);
        this.mouse.currentOffset.y = (e.clientY - this.mouse.initialPosition.y);
        this.mouse.offset.x = (this.mouse.initialOffset.x + this.mouse.currentOffset.x);
        this.mouse.offset.y = (this.mouse.initialOffset.y + this.mouse.currentOffset.y);
      }
      this.onMouseMove(this.mouse);
    });
  }

  attachResizeHandler(el) {
    this.size = {width:el.offsetWidth, height:el.offsetHeight};
    const resizeObserver = new ResizeObserver((el) => {
      const {width, height} = el[0].contentRect;
      this.size = {width:width, height:height};
    });
    resizeObserver.observe(el);
    this._eventCleanupFns.push(() => { resizeObserver.unobserve(el); });
    return this;
  }

  attachFileDropHandler(el) {

    const getImageFromDropEvent = (dropEvent, cb) => {
      let file = dropEvent.dataTransfer.files[0];
      let reader = new FileReader();
      reader.onload = (event) => {
          let image = document.createElement('img');
          image.src = event.target.result;
          cb(image);
      }
      reader.readAsDataURL(file);
    }

    this._addEventListener(el, "dragover", (e) => {
      e.preventDefault();
      return false;
    });

    this._addEventListener(el, "drop", (e) => {
      e.preventDefault();
      getImageFromDropEvent(e, (image) => {
        this.onImageDropped(image);
      });
      return false;
    });

    return this;
  }

  _addEventListener(el, eventName, handlerFn) {
    el.addEventListener(eventName, handlerFn);
    this._eventCleanupFns.push(() => { el.removeEventListener(eventName, handlerFn)});
  }

  updateTextureFromImage(image) {
    var texture = new THREE.Texture(image);
    this.updateTexture(texture, image.naturalWidth, image.naturalHeight);
  }

  updateTextureFromURL(imageUrl, cb) {
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (texture, textureData) => {
      this.updateTexture(texture, texture.image.naturalWidth, texture.image.naturalHeight);
      if (cb) { cb(); }
    });
  }

  updateTexture(texture, width, height) {
    texture.anisotropy = 1;
    texture.format = THREE.RGBFormat;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.NearestMipMapLinearFilter;
    texture.needsUpdate = true;
    this.uniforms.texture = {type: 't', value: texture};
    this.uniforms.texture.value.wrapS = THREE.RepeatWrapping;
    this.uniforms.texture.value.wrapT = THREE.RepeatWrapping;
    this.uniforms.imageResolution.value.x = width || 0;
    this.uniforms.imageResolution.value.y = height || 0;
  }

  onImageDropped(image) {
    // Timeout here to let the size get assigned to the image object...
    // Potential race condition, but works fine for mvp
    setTimeout(() => { this.updateTextureFromImage(image); }, 0);
  }

  onKeyDown(keyCode, shiftKey) {
    this.keyboard[keyCode] = true;
  }

  onKeyUp(keyCode, shiftKey) {
    this.keyboard[keyCode] = false;
  }

  onMouseDown() {
    return;
  }

  onMouseUp() {
    return;
  }

  onMouseMove(mouse) {
    return;
  }

  onResize(width, height) {
    this.size = {width:width, height:height};
  }
}


class KaleidoscopeShader extends ShaderCanvas {

  constructor(el, imageUrl) {
    super(el, imageUrl);
  }

  getUniforms() {
    let uniforms = super.getUniforms();
    uniforms.axisCount = { type: 'i', value: 12 };
    uniforms.zoom = { type: 'f', value: 1.5 };
    uniforms.offset = { type: 'v2', value: new THREE.Vector2(0.0, 0.0) };
    uniforms.speed = { type: 'f', value: 0.75 };
    uniforms.frame = { type: 'f', value: 0.0 };
    return uniforms;
  }

  getShaderPrograms() {
    return {
      vertex: `
      precision highp float;
      precision highp int;

      attribute vec3 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main(void) {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
      }
      `
    , fragment: `
      precision highp float;
      precision highp int;

      const float PI  = 3.1415926535;
      const float PI2 = 6.2831853072;

      varying vec2 vUv;
      varying vec3 position;

      uniform sampler2D texture;
      uniform vec2 resolution;
      uniform vec2 imageResolution;
      uniform float time;
      uniform float frame;
      uniform float speed;
      uniform vec2 offset;
      uniform float zoom;
      uniform vec3 mouse;
      uniform float axisCount;
      uniform float pixelRatio;

      int intModulo(float a, float b) {
          float m = mod(a, b);
          return int(m + 0.5);
      }

      void main(void) {
          vec2 resolution = resolution * pixelRatio;
          vec2 c = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

          float angleFrac = PI2 / (2.0 * axisCount);
          float phi = abs(atan(c.y, c.x));
          float r = length(c);
          int count = int(phi / angleFrac);

          phi = mod(phi, angleFrac);
          if (intModulo(float(count), 2.0) == 1) {
              phi = angleFrac - phi;
          }
          float x = r;
          float y = r * sin(phi);

          vec2 offset = (offset - 0.5 * resolution.xy) / resolution.y;
          offset = offset * vec2(2.5, 1.0);

          vec2 timeOffset = (frame * 0.0007) * vec2(-1.8, 0.8);
          vec2 cc = (vec2(x, y) * zoom) + timeOffset + offset;

          gl_FragColor = texture2D(texture, cc);
      }
      `
    }
  }

  onKeyDown(keyCode, shiftKey) {
    super.onKeyDown(keyCode, shiftKey);

    // Up / Down: Change the number of axis
    if (!shiftKey) {
      var value = this.uniforms.axisCount.value;
      if (keyCode == 38) { value = value+1; }
      if (keyCode == 40) { value = Math.max(2, value-1); }
      this.uniforms.axisCount.value = value;
    }

    // Numpad: Change the image
    if (keyCode >= 49 && keyCode <= 57) {
      let numberKey = keyCode - 48;
      this.updateTextureFromURL(`./${numberKey}.jpg`);
    }

    // Space: Stop/Start animation timer
    if (keyCode == 32) {
      this.clock.running ? this.clock.stop() : this.clock.start();
    }
  }

  onMouseMove(mouse) {
    this.uniforms.offset.value.x = mouse.offset.x;
    this.uniforms.offset.value.y = mouse.offset.y;
  }

  update() {
    this.updateFromKeyboardState();
    this.updateFrame();
    super.update();
  }

  updateFrame() {
    if (!this.clock.running) return;
    this.uniforms.frame.value += 1 * (this.uniforms.speed.value);
  }

  updateFromKeyboardState() {
    this.updateZoomFromKeyboardState();
    this.updateSpeedFromKeyboardState();
  }

  updateZoomFromKeyboardState() {
    if (!this.keyboard[16]) return;
    let value = this.uniforms.zoom.value;
    if (this.keyboard[38]) { value = value-0.01; }
    if (this.keyboard[40]) { value = value+0.02; }
    this.uniforms.zoom.value = value;
  }

  updateSpeedFromKeyboardState() {
    let speedIncrement = this.keyboard[16] ? 0.25 : 0.05;
    var value = this.uniforms.speed.value;
    if (this.keyboard[37]) { value = value-speedIncrement; }
    if (this.keyboard[39]) { value = value+speedIncrement; }
    this.uniforms.speed.value = value;
  }

}

let kaleidoscope = new KaleidoscopeShader(document.body, `https://i.imgur.com/a1II23N.jpg`);
// kaleidoscope.start();