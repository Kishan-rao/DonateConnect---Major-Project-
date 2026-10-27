import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import * as AuthContextModule from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage Component & Role-Specific Login', () => {
  const mockLogin = vi.fn();
  const mockVerifyOtp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      login: mockLogin,
      verifyOtp: mockVerifyOtp,
      register: vi.fn(),
      registerDonor: vi.fn(),
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });
  });

  it('renders role selector tabs and defaults to DONOR', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Donor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NGO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delivery Partner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
  });

  it('submits login with expectedRole DONOR and navigates to /donations', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-donor-token',
      user: { id: '1', email: 'donor@example.com', fullName: 'Donor User', role: 'DONOR' },
      requiresOtp: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.clear(emailInput);
    await user.type(emailInput, 'donor@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'password123');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'donor@example.com',
        password: 'password123',
        expectedRole: 'DONOR',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/donations');
    });
  });

  it('submits login with expectedRole VOLUNTEER when Delivery Partner tab is active and navigates to /driver-dashboard', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-volunteer-token',
      user: { id: '2', email: 'dispatch@donateconnect.in', fullName: 'Driver User', role: 'VOLUNTEER' },
      requiresOtp: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const deliveryTab = screen.getByRole('button', { name: 'Delivery Partner' });
    fireEvent.click(deliveryTab);

    const user = userEvent.setup();
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRole: 'VOLUNTEER',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/driver-dashboard');
    });
  });

  it('submits login with expectedRole NGO when NGO tab is active and navigates to /ngo-dashboard', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-ngo-token',
      user: { id: '3', email: 'contact@goonj.org', fullName: 'Goonj Foundation', role: 'NGO' },
      requiresOtp: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const ngoTab = screen.getByRole('button', { name: 'NGO' });
    fireEvent.click(ngoTab);

    const user = userEvent.setup();
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRole: 'NGO',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/ngo-dashboard');
    });
  });

  it('submits login with expectedRole ADMIN when Admin tab is active and navigates to /admin', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-admin-token',
      user: { id: '4', email: 'admin@donateconnect.in', fullName: 'Admin User', role: 'ADMIN' },
      requiresOtp: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const adminTab = screen.getByRole('button', { name: 'Admin' });
    fireEvent.click(adminTab);

    const user = userEvent.setup();
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRole: 'ADMIN',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('displays role-mismatch error clearly on screen and does not navigate', async () => {
    const roleMismatchMessage = 'This account is not registered as a donor. Please use Volunteer Sign In.';
    mockLogin.mockRejectedValueOnce(new Error(roleMismatchMessage));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('name@example.com'), 'volunteer@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(roleMismatchMessage)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('clears previous role-mismatch error when switching sign-in tabs', async () => {
    const roleMismatchMessage = 'This account is not registered as a donor. Please use Volunteer Sign In.';
    mockLogin.mockRejectedValueOnce(new Error(roleMismatchMessage));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('name@example.com'), 'volunteer@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(roleMismatchMessage)).toBeInTheDocument();
    });

    // Switch to Delivery Partner tab
    const deliveryTab = screen.getByRole('button', { name: 'Delivery Partner' });
    fireEvent.click(deliveryTab);

    // Error should be cleared
    expect(screen.queryByText(roleMismatchMessage)).not.toBeInTheDocument();
  });

  it('initializes tab from query parameter ?role=ngo', async () => {
    render(
      <MemoryRouter initialEntries={['/login?role=ngo']}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('NGO Portal')).toBeInTheDocument();

    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-ngo-token',
      user: { id: '3', email: 'contact@goonj.org', fullName: 'Goonj Foundation', role: 'NGO' },
      requiresOtp: false,
    });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRole: 'NGO',
        })
      );
    });
  });

  it('initializes Delivery Partner tab from query parameter ?role=volunteer', async () => {
    render(
      <MemoryRouter initialEntries={['/login?role=volunteer']}>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-vol-token',
      user: { id: '2', email: 'dispatch@donateconnect.in', fullName: 'Partner User', role: 'VOLUNTEER' },
      requiresOtp: false,
    });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRole: 'VOLUNTEER',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/driver-dashboard');
    });
  });

  it('initializes Delivery Partner tab from query parameter ?role=delivery_partner', async () => {
    render(
      <MemoryRouter initialEntries={['/login?role=delivery_partner']}>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      token: 'jwt-vol-token',
      user: { id: '2', email: 'dispatch@donateconnect.in', fullName: 'Partner User', role: 'VOLUNTEER' },
      requiresOtp: false,
    });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRole: 'VOLUNTEER',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/driver-dashboard');
    });
  });

  it('redirects already-authenticated users to their role portal automatically', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      verifyOtp: mockVerifyOtp,
      isAuthenticated: true,
      user: { id: '10', fullName: 'Active NGO', email: 'ngo@hub.org', role: 'NGO' },
      loading: false,
    } as any);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/ngo-dashboard');
    });
  });

  it('toggles password visibility when clicking the eye button without submitting form', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });

    // Initially masked
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Type a password
    await user.clear(passwordInput);
    await user.type(passwordInput, 'mysecretpass');
    expect(passwordInput).toHaveValue('mysecretpass');

    // Reveal password
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveValue('mysecretpass');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
    // Clicking toggle button did not submit form
    expect(mockLogin).not.toHaveBeenCalled();

    // Conceal password
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveValue('mysecretpass');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
