import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  GraphLoadingState,
  GraphEmptyState,
  GraphErrorState,
} from './GraphStates';

describe('GraphStates', () => {
  describe('GraphLoadingState', () => {
    it('renders with status role', () => {
      render(<GraphLoadingState />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays loading message', () => {
      render(<GraphLoadingState />);
      expect(screen.getByText(/loading graph/i)).toBeInTheDocument();
    });

    it('has aria-busy attribute', () => {
      render(<GraphLoadingState />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');
    });

    it('has aria-live attribute for accessibility', () => {
      render(<GraphLoadingState />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('renders spinner element', () => {
      render(<GraphLoadingState />);
      // Look for the spinner div with animate-spin class
      const container = screen.getByRole('status');
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('GraphEmptyState', () => {
    it('displays no nodes message', () => {
      render(<GraphEmptyState />);
      expect(screen.getByText(/no nodes/i)).toBeInTheDocument();
    });

    it('suggests adding entities', () => {
      render(<GraphEmptyState />);
      expect(screen.getByText(/add entities/i)).toBeInTheDocument();
    });

    it('mentions MCP tools', () => {
      render(<GraphEmptyState />);
      expect(screen.getByText(/mcp tools/i)).toBeInTheDocument();
    });

    it('renders an icon/illustration', () => {
      render(<GraphEmptyState />);
      // Check for SVG element
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has appropriate heading', () => {
      render(<GraphEmptyState />);
      expect(
        screen.getByRole('heading', { name: /no nodes found/i })
      ).toBeInTheDocument();
    });
  });

  describe('GraphErrorState', () => {
    it('displays provided error message', () => {
      render(<GraphErrorState message="Network error occurred" />);
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('shows default message when none provided', () => {
      render(<GraphErrorState />);
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('has alert role for accessibility', () => {
      render(<GraphErrorState />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders error icon', () => {
      render(<GraphErrorState />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays custom error message exactly', () => {
      const customMessage = 'Custom error: Database connection failed';
      render(<GraphErrorState message={customMessage} />);
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('applies danger color styling', () => {
      render(<GraphErrorState />);
      const alert = screen.getByRole('alert');
      const errorText = alert.querySelector('.text-danger');
      expect(errorText).toBeInTheDocument();
    });
  });
});
