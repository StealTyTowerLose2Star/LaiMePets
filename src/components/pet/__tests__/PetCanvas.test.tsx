import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock @react-three/fiber — 用纯 HTML div 替代 Canvas，避免 jsdom 中的 WebGL 问题
vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    children,
    onCreated,
    style,
  }: {
    children?: React.ReactNode;
    onCreated?: () => void;
    style?: React.CSSProperties;
  }) => {
    // 模拟 Canvas onCreated 回调
    if (onCreated) {
      setTimeout(() => onCreated(), 0);
    }
    return (
      <div data-testid="mock-canvas" style={style}>
        {children}
      </div>
    );
  },
}));

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  ContactShadows: () => null,
  useGLTF: vi.fn(),
}));

// Mock Environment 组件
vi.mock('../Environment', () => ({
  Environment: () => null,
}));

// Mock PlaceholderPet 组件
vi.mock('../PlaceholderPet', () => ({
  PlaceholderPet: ({ behavior }: { behavior: string }) => (
    <div data-testid="placeholder-pet" data-behavior={behavior}>
      PlaceholderPet
    </div>
  ),
}));

import { PetCanvas } from '../PetCanvas';

describe('PetCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a container div', () => {
    const { container } = render(<PetCanvas />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('DIV');
    expect(root.className).toContain('relative');
    expect(root.className).toContain('h-full');
    expect(root.className).toContain('w-full');
  });

  it('renders mock Canvas element', () => {
    render(<PetCanvas />);
    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.style.background).toBe('transparent');
  });

  it('renders PlaceholderPet when no modelPath provided', () => {
    render(<PetCanvas />);
    const placeholder = screen.getByTestId('placeholder-pet');
    expect(placeholder).toBeTruthy();
  });

  it('renders loading spinner on initial mount', () => {
    render(<PetCanvas />);
    const spinner = screen.getByText('加载 3D 场景中...');
    expect(spinner).toBeTruthy();
  });

  it('passes behavior prop to PlaceholderPet', () => {
    render(<PetCanvas behavior="stretching" />);
    const placeholder = screen.getByTestId('placeholder-pet');
    expect(placeholder.getAttribute('data-behavior')).toBe('stretching');
  });

  it('handles empty modelPath gracefully (idle phase)', () => {
    const { container } = render(<PetCanvas modelPath="" />);
    const canvas = container.querySelector('[data-testid="mock-canvas"]');
    expect(canvas).toBeTruthy();
    // Empty string should still show PlaceholderPet
    const placeholder = screen.getByTestId('placeholder-pet');
    expect(placeholder).toBeTruthy();
  });
});
