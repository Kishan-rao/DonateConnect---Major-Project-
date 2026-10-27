import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentUserProfileApi,
  changePasswordApi,
  getUserPreferencesApi,
  updateUserPreferencesApi,
  deleteAccountApi,
} from '../api/userApi';
import { User, UserPreference, ChangePasswordRequest } from '../types';
import { StatusToggle } from '../components/StatusToggle';
import { pushModalDismiss } from '../utils/useAndroidBackButton';
import {
  User as UserIcon,
  Mail,
  Shield,
  KeyRound,
  Bell,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user: authUser, logout, refetchUser } = useAuth();
  const navigate = useNavigate();

  // User details state
  const [userProfile, setUserProfile] = useState<User | null>(authUser);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notification preferences state
  const [preferences, setPreferences] = useState<UserPreference>({
    emailNotifications: true,
    donationUpdates: true,
    deliveryUpdates: true,
    commentNotifications: true,
  });
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!showDeleteModal) return;
    return pushModalDismiss(() => {
      setShowDeleteModal(false);
      setDeleteConfirmationInput('');
      setDeleteError(null);
    });
  }, [showDeleteModal]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [profile, prefs] = await Promise.all([
          getCurrentUserProfileApi(),
          getUserPreferencesApi(),
        ]);
        if (isMounted) {
          setUserProfile(profile);
          setPreferences(prefs);
        }
      } catch (err: any) {
        if (isMounted) {
          setPrefError(err.message || 'Failed to load user preferences');
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
          setPrefLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const payload: ChangePasswordRequest = {
        currentPassword,
        newPassword,
      };
      await changePasswordApi(payload);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTogglePreference = async (
    key: keyof UserPreference,
    value: boolean
  ) => {
    setPrefError(null);
    setPrefSuccess(null);

    const updated = {
      ...preferences,
      [key]: value,
    };
    setPreferences(updated);
    setPrefSaving(true);

    try {
      const saved = await updateUserPreferencesApi(updated);
      setPreferences(saved);
      setPrefSuccess('Notification preferences saved.');
    } catch (err: any) {
      // Revert on error
      setPreferences(preferences);
      setPrefError(err.message || 'Failed to update preferences.');
    } finally {
      setPrefSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput.trim() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await deleteAccountApi({ confirmation: 'DELETE' });
      setShowDeleteModal(false);
      logout();
      navigate('/', { replace: true });
    } catch (err: any) {
      setDeleteError(
        err.message || 'Failed to delete account. Please try again or contact support.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayUser = userProfile || authUser;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Account Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your profile details, notification preferences, and security settings.
          </p>
        </div>
      </div>

      {/* Account Overview Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-[#7567E8]" />
          Account Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              Full Name
            </span>
            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
              {displayUser?.fullName || 'Not provided'}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              Email Address
            </span>
            <p className="text-sm sm:text-base font-bold text-gray-900 truncate flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              {displayUser?.email}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              Account Role
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7567E8]/10 text-[#7567E8] font-bold text-xs uppercase tracking-wider border border-[#7567E8]/20">
              <Shield className="w-3 h-3" />
              {displayUser?.role}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              Account Status
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active
            </span>
          </div>
        </div>
      </section>

      {/* Notification Preferences Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#7567E8]" />
            Notification Preferences
          </h2>
          {prefSaving && (
            <span className="text-xs text-gray-400 italic">Saving changes...</span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Control how and when you receive automated emails and status updates from DonateConnect.
        </p>

        {prefSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {prefSuccess}
          </div>
        )}

        {prefError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {prefError}
          </div>
        )}

        <div className="divide-y divide-gray-100 pt-2">
          <StatusToggle
            id="pref-email-notifications"
            label="Email Notifications"
            description="Receive critical account updates, summaries, and verification notices via email."
            checked={preferences.emailNotifications}
            disabled={prefLoading || prefSaving}
            onChange={(val) => handleTogglePreference('emailNotifications', val)}
          />

          <StatusToggle
            id="pref-donation-updates"
            label="Donation Updates"
            description="Get notified whenever your donation is accepted, scheduled, or status changes."
            checked={preferences.donationUpdates}
            disabled={prefLoading || prefSaving}
            onChange={(val) => handleTogglePreference('donationUpdates', val)}
          />

          <StatusToggle
            id="pref-delivery-updates"
            label="Delivery Updates"
            description="Receive live tracking dispatches and pickup completion notices."
            checked={preferences.deliveryUpdates}
            disabled={prefLoading || prefSaving}
            onChange={(val) => handleTogglePreference('deliveryUpdates', val)}
          />

          <StatusToggle
            id="pref-comment-notifications"
            label="Comments & Inquiries"
            description="Get alerts when a donor or NGO replies to your donation activity thread."
            checked={preferences.commentNotifications}
            disabled={prefLoading || prefSaving}
            onChange={(val) => handleTogglePreference('commentNotifications', val)}
          />
        </div>
      </section>

      {/* Password Management Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#7567E8]" />
          Change Password
        </h2>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label
              htmlFor="current-password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#7567E8] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#7567E8] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Repeat new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#7567E8] focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-5 py-2.5 rounded-xl bg-[#7567E8] hover:bg-[#6050e0] text-white font-bold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7567E8] disabled:opacity-50"
          >
            {passwordLoading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* Danger Zone: Account Deletion */}
      <section className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Danger Zone: Delete Account
            </h2>
            <p className="text-xs text-rose-700 mt-1 max-w-xl">
              Permanently delete your DonateConnect account and all associated personal data from our servers. Once confirmed, this action cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationInput('');
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 id="delete-modal-title" className="text-xl font-extrabold text-gray-900">
                Confirm Account Deletion
              </h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete your account? All your personal details, preferences, and notifications will be wiped immediately.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
              <p className="font-semibold mb-1">Important:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your current session and security token will be instantly invalidated.</li>
                <li>Your email address will become available for registration under any permitted role.</li>
                <li>If you are the sole administrator, this action will be rejected to protect system continuity.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div>
              <label
                htmlFor="confirm-delete-input"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Please type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmationInput.trim() !== 'DELETE'}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
