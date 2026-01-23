import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphControls } from './GraphControls';

describe('GraphControls', () => {
  const defaultProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFit: vi.fn(),
    onReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders zoom in button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /zoom in/i })
    ).toBeInTheDocument();
  });

  it('renders zoom out button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /zoom out/i })
    ).toBeInTheDocument();
  });

  it('renders fit button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByRole('button', { name: /fit/i })).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('calls onZoomIn when zoom in clicked', () => {
    render(<GraphControls {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when zoom out clicked', () => {
    render(<GraphControls {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls onFit when fit clicked', () => {
    render(<GraphControls {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /fit/i }));
    expect(defaultProps.onFit).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when reset clicked', () => {
    render(<GraphControls {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
  });

  it('has graph-controls test id', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByTestId('graph-controls')).toBeInTheDocument();
  });

  it('buttons have correct type attribute', () => {
    render(<GraphControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('buttons have title attributes for tooltip', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByTitle(/zoom in/i)).toBeInTheDocument();
    expect(screen.getByTitle(/zoom out/i)).toBeInTheDocument();
    expect(screen.getByTitle(/fit/i)).toBeInTheDocument();
    expect(screen.getByTitle(/reset/i)).toBeInTheDocument();
  });

  it('renders all four control buttons', () => {
    render(<GraphControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });
});
