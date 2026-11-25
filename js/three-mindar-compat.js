import * as THREE from "three";

export * from "three";

// MindAR 1.2.5 imports this removed constant; r175 already defaults to sRGB output.
export const sRGBEncoding = 3001;

// MindAR does not forward rendererSettings, so inject the photo-safe context here.
export class WebGLRenderer extends THREE.WebGLRenderer {
  constructor(parameters = {}) {
    super({ ...parameters, preserveDrawingBuffer: true });
  }
}
