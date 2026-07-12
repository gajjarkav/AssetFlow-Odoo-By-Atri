// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeDefined();
    expect(buttonElement.className).toContain('bg-[#22C55E]'); // Default variant color
  });

  it('applies the destructive variant class', () => {
    render(<Button variant="destructive">Delete</Button>);
    const buttonElement = screen.getByRole('button', { name: /delete/i });
    expect(buttonElement.className).toContain('bg-[#EF4444]');
  });

  it('respects the disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const buttonElement = screen.getByRole('button') as HTMLButtonElement;
    expect(buttonElement.disabled).toBe(true);
    expect(buttonElement.className).toContain('disabled:opacity-50');
  });
});
