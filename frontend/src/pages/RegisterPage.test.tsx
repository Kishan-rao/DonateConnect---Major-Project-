import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterPage } from './RegisterPage';
import * as AuthContextModule from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RegisterPage Component & Role Routing', () => {
  const mockRegister = vi.fn();
  const mockVerifyOtp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      verifyOtp: mockVerifyOtp,
      register: mockRegister,
      registerDonor: mockRegister,
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });
  });

  it('renders default Donor registration form and switches to NGO mode on click', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Initial state: Donor
    expect(screen.getByText('Register as Donor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Bengaluru/i)).not.toBeInTheDocument();

    // Click Register as NGO
    const ngoTab = screen.getByRole('button', { name: 'Register as NGO' });
    fireEvent.click(ngoTab);

    // NGO specific fields appear
    expect(screen.getByText('NGO / Organization Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Akshaya Relief Foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/NGO Operational Address \(Bengaluru\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently registering NGOs operating in Bengaluru \/ Bangalore region/i)).toBeInTheDocument();
  });

  it('pre-selects NGO tab when URL contains ?role=ngo', () => {
    render(
      <MemoryRouter initialEntries={['/register?role=ngo']}>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByText('NGO / Organization Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Akshaya Relief Foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/NGO Operational Address \(Bengaluru\)/i)).toBeInTheDocument();
  });

  it('submits NGO registration with role NGO and transitions to OTP verification', async () => {
    mockRegister.mockResolvedValueOnce({
      requiresOtp: true,
      token: null,
      user: {
        id: 'user-ngo-1',
        email: 'contact@bengalururelief.org',
        fullName: 'Bengaluru Relief Society',
        role: 'NGO',
        createdAt: '2026-10-16',
      },
    });

    render(
      <MemoryRouter initialEntries={['/register?role=ngo']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/Akshaya Relief Foundation/i), 'Bengaluru Relief Society');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'contact@bengalururelief.org');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'Password123!');
    await user.type(screen.getByPlaceholderText(/123 Indiranagar/i), '123 Indiranagar, Bengaluru');
    await user.type(screen.getByPlaceholderText(/\+91 98765/i), '+91 98765 43210');

    await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'NGO',
          fullName: 'Bengaluru Relief Society',
          email: 'contact@bengalururelief.org',
          address: '123 Indiranagar, Bengaluru',
          phone: '+91 98765 43210',
        })
      );
    });

    // OTP screen is displayed
    expect(screen.getByText(/We've sent a 6-digit code to/i)).toBeInTheDocument();
    expect(screen.getByText('contact@bengalururelief.org')).toBeInTheDocument();
  });

  it('routes to /ngo-dashboard after successful NGO OTP verification', async () => {
    mockRegister.mockResolvedValueOnce({
      requiresOtp: true,
      token: null,
      user: {
        id: 'user-ngo-1',
        email: 'contact@bengalururelief.org',
        fullName: 'Bengaluru Relief Society',
        role: 'NGO',
        createdAt: '2026-10-16',
      },
    });

    mockVerifyOtp.mockResolvedValueOnce({
      id: 'user-ngo-1',
      email: 'contact@bengalururelief.org',
      fullName: 'Bengaluru Relief Society',
      role: 'NGO',
      createdAt: '2026-10-16',
    });

    render(
      <MemoryRouter initialEntries={['/register?role=ngo']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Fill form
    await user.type(screen.getByPlaceholderText(/Akshaya Relief Foundation/i), 'Bengaluru Relief Society');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'contact@bengalururelief.org');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'Password123!');
    await user.type(screen.getByPlaceholderText(/123 Indiranagar/i), '123 Indiranagar, Bengaluru');
    await user.type(screen.getByPlaceholderText(/\+91 98765/i), '+91 98765 43210');

    await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

    // Wait for OTP view
    await waitFor(() => {
      expect(screen.getByText(/6-Digit OTP Code/i)).toBeInTheDocument();
    });

    // Enter OTP digits
    const inputs = screen.getAllByRole('textbox');
    // In OtpInput, each digit is an input box
    for (let i = 0; i < 6; i++) {
      fireEvent.change(inputs[i], { target: { value: '1' } });
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify & Complete Registration/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'contact@bengalururelief.org',
        otp: '111111',
      });
      // Verifies the user is redirected exclusively to the NGO portal, NOT /donations or /driver-dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/ngo-dashboard');
    });
  });

  it('routes to /donations when Donor registers without requiring OTP', async () => {
    mockRegister.mockResolvedValueOnce({
      requiresOtp: false,
      token: 'jwt-donor-token',
      user: {
        id: 'donor-1',
        email: 'donor@example.com',
        fullName: 'Jane Donor',
        role: 'DONOR',
        createdAt: '2026-10-16',
      },
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Jane Donor');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'donor@example.com');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'Password123!');

    await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/donations');
    });
  });

  it('routes to /driver-dashboard when Delivery volunteer registers without requiring OTP', async () => {
    mockRegister.mockResolvedValueOnce({
      requiresOtp: false,
      token: 'jwt-driver-token',
      user: {
        id: 'driver-1',
        email: 'driver@example.com',
        fullName: 'Ravi Driver',
        role: 'VOLUNTEER',
        createdAt: '2026-10-16',
      },
    });

    render(
      <MemoryRouter initialEntries={['/register?role=volunteer']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Ravi Driver');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'driver@example.com');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'Password123!');

    await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/driver-dashboard');
    });
  });

  it('routes to /driver-dashboard when Delivery Partner registers via ?role=delivery_partner', async () => {
    mockRegister.mockResolvedValueOnce({
      requiresOtp: false,
      token: 'jwt-driver-token',
      user: {
        id: 'driver-2',
        email: 'delivery@example.com',
        fullName: 'Amit Delivery',
        role: 'VOLUNTEER',
        createdAt: '2026-10-16',
      },
    });

    render(
      <MemoryRouter initialEntries={['/register?role=delivery_partner']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Amit Delivery');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'delivery@example.com');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'Password123!');

    await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'VOLUNTEER',
          email: 'delivery@example.com',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/driver-dashboard');
    });
  });

  it('displays backend error message if registration fails', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          message: 'We currently accept NGOs operating in the Bengaluru region.',
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/register?role=ngo']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/Akshaya Relief Foundation/i), 'Delhi Foundation');
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'contact@delhi.org');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'Password123!');
    await user.type(screen.getByPlaceholderText(/123 Indiranagar/i), 'Connaught Place, New Delhi');
    await user.type(screen.getByPlaceholderText(/\+91 98765/i), '+91 98765 43210');

    await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(screen.getByText('We currently accept NGOs operating in the Bengaluru region.')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
