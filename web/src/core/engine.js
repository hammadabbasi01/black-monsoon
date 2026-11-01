import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Final grade: filmic colour grade, vignette, grain, chromatic fringe, damage + underwater tint.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, dmg: { value: 0 }, uw: { value: 0 },
    flash: { value: 0 }, grain: { value: 0.05 }, ca: { value: 0.0015 }, sat: { value: 1.0 }, fade: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
  uniform sampler2D tDiffuse; uniform float time,dmg,uw,flash,grain,ca,sat,fade; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 uv=vUv; vec2 d=uv-.5; float r=dot(d,d);
    if(uw>0.){ uv+=vec2(sin(uv.y*24.+time*2.),cos(uv.x*20.+time*1.7))*.003*uw; }
    float c=ca*(1.+dmg*4.)*(.4+r*2.);
    vec3 col=vec3(texture2D(tDiffuse,uv+d*c).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-d*c).b);
    float l=dot(col,vec3(.2126,.7152,.0722));
    col=mix(vec3(l),col,sat*(1.-dmg*.6));
    // teal shadows / warm highlights
    col=mix(col*vec3(.92,1.02,1.08), col*vec3(1.06,1.0,.92), smoothstep(.05,.6,l));
    col=mix(col, col*vec3(.55,.9,1.0)+vec3(0.,.03,.05), uw);
    col*=1.-r*(1.25+dmg*1.5);
    col=mix(col,vec3(.5,0.,0.)*l+col*.6,dmg*.35);
    col+=flash;
    col+=(h(uv*vec2(1920.,1080.)+fract(time*7.))-.5)*grain;
    col*=1.-fade;
    gl_FragColor=vec4(max(col,0.),1.);
  }`,
};

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 1600);
    this.baseFov = 72;
    this.scene.add(this.camera);
    this.quality = 1;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.grade = null;
    this.onResize = [];
    addEventListener('resize', () => this.resize());
  }

  setQuality(q) {
    this.quality = q;
    const dpr = Math.min(devicePixelRatio || 1, q === 2 ? 2 : q === 1 ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q > 0;
    this.renderer.shadowMap.type = q === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.buildComposer();
    this.resize();
  }

  buildComposer() {
    if (this.composer) this.composer.dispose?.();
    const q = this.quality;
    const size = new THREE.Vector2(innerWidth, innerHeight);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q === 2 ? 4 : q === 1 ? 2 : 0 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), q === 0 ? 0.55 : 0.7, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.grain.value = q === 0 ? 0.03 : 0.05;
    this.composer.addPass(this.grade);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.onResize.forEach((f) => f(w, h));
  }

  render(dt) {
    this.time += dt;
    if (this.grade) this.grade.uniforms.time.value = this.time;
    this.composer.render(dt);
  }
}
