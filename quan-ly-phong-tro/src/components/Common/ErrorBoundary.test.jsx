import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test Error Message');
};

const GoodChild = () => <div>Normal Content</div>;

describe('ErrorBoundary Component', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('should catch error and display error UI', () => {
    // Suppress console.error during test expected throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary title="Lỗi tải dữ liệu">
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Lỗi tải dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Test Error Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử tải lại phần này/i })).toBeInTheDocument();

    spy.mockRestore();
  });

  it('should call onReset when reset button is clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handleReset = vi.fn();

    render(
      <ErrorBoundary onReset={handleReset}>
        <ProblemChild />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /Thử tải lại phần này/i });
    fireEvent.click(button);

    expect(handleReset).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
