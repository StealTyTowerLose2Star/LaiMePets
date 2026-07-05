/**
 * Vitest 测试环境初始化
 *
 * 为 jsdom 环境提供 Three.js / WebGL / R3F 所需的最小 DOM API polyfill。
 */

import '@testing-library/jest-dom/vitest';

// ── WebGL Context Mock ──
// Three.js 在 jsdom 中无法创建真正的 WebGL 上下文。
// 提供一个最小 mock 避免组件挂载时崩溃。

const mockWebGLContext = {
  createShader: () => ({}),
  shaderSource: () => {},
  compileShader: () => {},
  getShaderParameter: () => true,
  getShaderInfoLog: () => '',
  createProgram: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  getProgramInfoLog: () => '',
  useProgram: () => {},
  getAttribLocation: () => 0,
  getUniformLocation: () => ({}),
  enableVertexAttribArray: () => {},
  vertexAttribPointer: () => {},
  uniformMatrix4fv: () => {},
  uniform1i: () => {},
  uniform1f: () => {},
  uniform3f: () => {},
  uniform4f: () => {},
  createBuffer: () => ({}),
  bindBuffer: () => {},
  bufferData: () => {},
  bufferSubData: () => {},
  viewport: () => {},
  clearColor: () => {},
  clear: () => {},
  enable: () => {},
  disable: () => {},
  blendFunc: () => {},
  depthFunc: () => {},
  depthMask: () => {},
  colorMask: () => {},
  scissor: () => {},
  getError: () => 0,
  getParameter: () => null,
  getExtension: () => null,
  getSupportedExtensions: () => [],
  getContextAttributes: () => ({ alpha: true }),
  isContextLost: () => false,
  createTexture: () => ({}),
  bindTexture: () => {},
  texImage2D: () => {},
  texParameteri: () => {},
  activeTexture: () => {},
  generateMipmap: () => {},
  createFramebuffer: () => ({}),
  bindFramebuffer: () => {},
  framebufferTexture2D: () => {},
  checkFramebufferStatus: () => 0x8cd5,
  deleteFramebuffer: () => {},
  deleteTexture: () => {},
  deleteBuffer: () => {},
  deleteShader: () => {},
  deleteProgram: () => {},
  drawElements: () => {},
  drawArrays: () => {},
  getRenderbufferParameter: () => 0,
  createRenderbuffer: () => ({}),
  bindRenderbuffer: () => {},
  renderbufferStorage: () => {},
  framebufferRenderbuffer: () => {},
  readPixels: () => {},
  pixelStorei: () => {},
  texSubImage2D: () => {},
  bindAttribLocation: () => {},
  createVertexArray: () => ({}),
  bindVertexArray: () => {},
  deleteVertexArray: () => {},
  isVertexArray: () => false,
  drawBuffers: () => {},
};

// 为每个 canvas 元素提供 webgl2 上下文的 mock
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
  options?: unknown,
) {
  if (contextId === 'webgl2' || contextId === 'webgl') {
    return mockWebGLContext as unknown as WebGL2RenderingContext;
  }
  return originalGetContext.call(this, contextId as never, options as never);
} as typeof HTMLCanvasElement.prototype.getContext;

// ── DOM API Polyfills ──

// ResizeObserver (drei 内部使用)
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// URL.createObjectURL / revokeObjectURL (drei useGLTF 可能使用)
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock-url';
  URL.revokeObjectURL = () => {};
}

// requestAnimationFrame / cancelAnimationFrame (jsdom 提供基本存根)
// 确保在测试中使用 vi.useFakeTimers() 控制时间

// PointerEvent (R3F 事件系统使用)
if (typeof PointerEvent === 'undefined') {
  globalThis.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
}
