import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusToggle } from './StatusToggle';

describe('StatusToggle Component', () => {
  it('renders with label and description', () => {
    render(
      <StatusToggle
        id="toggle-test"
        label="Email Alerts"
        description="Receive daily emails"
        checked={true}
        onChange={() => {}}
      />
    );

    expect(screen.getAllByText('Email Alerts')[0]).toBeInTheDocument();
    expect(screen.getByText('Receive daily emails')).toBeInTheDocument();
  });

  it('displays green ON text when checked is true', () => {
    render(
      <StatusToggle
        id="toggle-on"
        label="Push Notifications"
        checked={true}
        onChange={() => {}}
      />
    );

    const statusText = screen.getByText('ON');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-emerald-600');
  });

  it('displays red OFF text when checked is false', () => {
    render(
      <StatusToggle
        id="toggle-off"
        label="Push Notifications"
        checked={false}
        onChange={() => {}}
      />
    );

    const statusText = screen.getByText('OFF');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-rose-600');
  });

  it('triggers onChange with inverted state when clicked', () => {
    const handleChange = vi.fn();
    render(
      <StatusToggle
        id="toggle-click"
        label="Updates"
        checked={true}
        onChange={handleChange}
      />
    );

    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);

    expect(handleChange).toHaveBeenCalledWith(false);
  });
});
