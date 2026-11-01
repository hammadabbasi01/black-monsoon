import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = 'assets/';
const texCache = new Map();
let maxAniso = 4;
const loader = new THREE.TextureLoader();

export const Assets = {
  models: {},
  env: null,
  setRenderer(r) { maxAniso = Math.min(8, r.capabilities.getMaxAnisotropy()); },

  // Load + configure a texture once. Clones share the image but can carry their own repeat.
  tex(name, { srgb = true, repeat = null } = {}) {
    const key = name + (srgb ? ':s' : ':l');
    let t = texCache.get(key);
    if (!t) {
      t = loader.load(BASE + 'tex/' + name);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = maxAniso;
      texCache.set(key, t);
    }
    if (repeat) {
      const c = t.clone();
      c.repeat.set(repeat[0], repeat[1]);
      c.needsUpdate = true;
      return c;
    }
    return t;
  },

  async preloadTextures(names, onProgress) {
    let done = 0;
    await Promise.all(names.map((n) => new Promise((res) => {
      const srgb = !/_n\.|_r\./.test(n);
      const key = n + (srgb ? ':s' : ':l');
      const t = loader.load(BASE + 'tex/' + n, () => { done++; onProgress && onProgress(done / names.length); res(); }, undefined, () => { done++; res(); });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = maxAniso;
      texCache.set(key, t);
    })));
  },

  async loadModel(name, file) {
    const gltf = await new GLTFLoader().loadAsync(BASE + file);
    this.models[name] = gltf;
    return gltf;
  },

  async loadEnv(renderer, file) {
    // RGBE packed into a PNG (alpha = shared exponent) so it ships as a plain image
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = BASE + file; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
    const f = new Float32Array(c.width * c.height * 4);
    for (let i = 0; i < d.length; i += 4) { const e = d[i + 3]; const k = e ? Math.pow(2, e - 136) : 0; f[i] = d[i] * k; f[i + 1] = d[i + 1] * k; f[i + 2] = d[i + 2] * k; f[i + 3] = 1; }
    const hdr = new THREE.DataTexture(f, c.width, c.height, THREE.RGBAFormat, THREE.FloatType); hdr.flipY = true; hdr.needsUpdate = true;
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromEquirectangular(hdr);
    hdr.dispose(); pm.dispose();
    this.env = rt.texture;
    return this.env;
  },
};
