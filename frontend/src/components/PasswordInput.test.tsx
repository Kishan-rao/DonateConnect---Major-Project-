import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput Component', () => {
  it('is masked by default with type="password"', () => {
    render(<PasswordInput placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('clicking the eye button reveals the password and changes label to Hide password', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });

    await user.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('clicking again conceals the password', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });

    await user.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByRole('button', { name: 'Hide password' });
    await user.click(hideBtn);
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('preserves the entered value when toggling visibility back and forth', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');

    await user.type(input, 'SuperSecret123!');
    expect(input).toHaveValue('SuperSecret123!');

    // Reveal
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveValue('SuperSecret123!');
    expect(input).toHaveAttribute('type', 'text');

    // Conceal again
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveValue('SuperSecret123!');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('operates independently when multiple password fields (e.g. password and confirm-password) are rendered', async () => {
    const user = userEvent.setup();

    const DualPasswordForm = () => {
      const [pwd, setPwd] = useState('');
      const [confirmPwd, setConfirmPwd] = useState('');

      return (
        <div>
          <PasswordInput
            placeholder="Password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            showAriaLabel="Show password"
            hideAriaLabel="Hide password"
          />
          <PasswordInput
            placeholder="Confirm Password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            showAriaLabel="Show confirm password"
            hideAriaLabel="Hide confirm password"
          />
        </div>
      );
    };

    render(<DualPasswordForm />);

    const pwdInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm Password');
    const showPwdBtn = screen.getByRole('button', { name: 'Show password' });
    const showConfirmBtn = screen.getByRole('button', { name: 'Show confirm password' });

    await user.type(pwdInput, 'MyPassword1');
    await user.type(confirmInput, 'MyPassword1');

    // Initially both are masked
    expect(pwdInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Reveal only the main password
    await user.click(showPwdBtn);
    expect(pwdInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Reveal the confirm password
    await user.click(showConfirmBtn);
    expect(pwdInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'text');

    // Mask the main password again while confirm password stays revealed
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(pwdInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'text');

    // Mask confirm password
    await user.click(screen.getByRole('button', { name: 'Hide confirm password' }));
    expect(pwdInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Values remain intact
    expect(pwdInput).toHaveValue('MyPassword1');
    expect(confirmInput).toHaveValue('MyPassword1');
  });

  it('clicking the visibility toggle does not submit the form', async () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    const user = userEvent.setup();

    render(
      <form onSubmit={handleSubmit}>
        <PasswordInput placeholder="Enter password" />
        <button type="submit">Submit Form</button>
      </form>
    );

    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggleBtn);

    expect(handleSubmit).not.toHaveBeenCalled();

    // Now clicking actual submit triggers handleSubmit
    await user.click(screen.getByRole('button', { name: 'Submit Form' }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('respects the disabled state for both the input and the toggle button', () => {
    render(<PasswordInput placeholder="Disabled password" disabled />);
    const input = screen.getByPlaceholderText('Disabled password');
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });

    expect(input).toBeDisabled();
    expect(toggleBtn).toBeDisabled();
  });
});

