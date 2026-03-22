'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import SubscriptionForm from '@/components/SubscriptionForm';
import { User, Building2, Loader2, ChevronRight, ChevronLeft, Eye, EyeOff, CreditCard } from 'lucide-react';

const EMPTY_USER = {
  name: '',
  email: '',
  password: '',
};

const EMPTY_COLLEGE = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  website: '',
  establishedYear: '',
};

function validateUserForm(data) {
  const errs = {};
  if (!data.name?.trim()) errs.name = 'Name is required';
  if (!data.email?.trim()) errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errs.email = 'Invalid email';
  if (!data.password?.trim()) errs.password = 'Password is required';
  else if (data.password.length < 6) errs.password = 'Password must be at least 6 characters';
  return errs;
}

function validateCollegeForm(data) {
  const errs = {};
  if (!data.name?.trim()) errs.name = 'Name is required';
  if (!data.code?.trim()) errs.code = 'Code is required';
  if (!data.address?.trim()) errs.address = 'Address is required';
  if (!data.city?.trim()) errs.city = 'City is required';
  if (!data.state?.trim()) errs.state = 'State is required';
  if (!data.pincode?.trim()) errs.pincode = 'Pincode is required';
  else if (!/^[0-9]{6}$/.test(data.pincode.trim())) errs.pincode = 'Pincode must be 6 digits';
  if (!data.email?.trim()) errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errs.email = 'Invalid email';
  if (data.website?.trim() && !/^https?:\/\/.+/.test(data.website.trim())) errs.website = 'Enter a valid URL';
  if (data.establishedYear) {
    const y = parseInt(data.establishedYear, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(y) || y < 1800 || y > currentYear) errs.establishedYear = `Year between 1800 and ${currentYear}`;
  }
  return errs;
}

export default function ClientForm({ open, onOpenChange, onSuccess }) {
  const [activeTab, setActiveTab] = useState('user');
  const [userData, setUserData] = useState(EMPTY_USER);
  const [collegeData, setCollegeData] = useState(EMPTY_COLLEGE);
  const [userErrors, setUserErrors] = useState({});
  const [collegeErrors, setCollegeErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCollege, setCreatedCollege] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Lazy-load plans only when needed for the subscription step.
  useEffect(() => {
    if (!open) return;
    if (activeTab !== 'subscription') return;
    if (plans.length > 0 || loadingPlans) return;

    let cancelled = false;
    setLoadingPlans(true);
    api
      .get('/plans', {}, true)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res ?? [];
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setPlans([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingPlans(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, activeTab, plans.length, loadingPlans]);

  const handleUserChange = useCallback((field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
    if (userErrors[field]) setUserErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }, [userErrors]);

  const handleCollegeChange = useCallback((e) => {
    const { name, value } = e.target;
    setCollegeData((prev) => ({ ...prev, [name]: value }));
    if (collegeErrors[name]) setCollegeErrors((prev) => ({ ...prev, [name]: undefined }));
    setError('');
  }, [collegeErrors]);

  const handleCreateUserAndNext = useCallback(async (e) => {
    e.preventDefault();
    const errs = validateUserForm(userData);
    setUserErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await api.post('/client', {
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
      }, {}, true);
      const created = response?.data ?? response;
      const id = created?._id ?? created?.id;
      if (id) {
        setCreatedUser({
          id,
          name: created.name ?? userData.name.trim(),
          email: created.email ?? userData.email.trim().toLowerCase(),
        });
      }
      setActiveTab('college');
      setCollegeData((prev) => ({
        ...prev,
        email: userData.email.trim().toLowerCase(),
        name: userData.name.trim(),
      }));
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }, [userData]);

  const resetAndClose = useCallback(() => {
    setActiveTab('user');
    setUserData(EMPTY_USER);
    setCollegeData(EMPTY_COLLEGE);
    setUserErrors({});
    setCollegeErrors({});
    setError('');
    setCreatedUser(null);
    setShowPassword(false);
    setCreatedCollege(null);
    // keep loaded plans cached; they are small and reused
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleCreateCollege = useCallback(async (e) => {
    e.preventDefault();
    const errs = validateCollegeForm(collegeData);
    setCollegeErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: collegeData.name.trim(),
        clientId: createdUser?.id,
        code: collegeData.code.trim().toUpperCase(),
        address: collegeData.address.trim(),
        city: collegeData.city.trim(),
        state: collegeData.state.trim(),
        pincode: collegeData.pincode.trim(),
        phone: collegeData.phone.trim(),
        email: collegeData.email.trim().toLowerCase(),
        website: collegeData.website?.trim() || undefined,
        establishedYear: collegeData.establishedYear ? parseInt(collegeData.establishedYear, 10) : undefined,
      };
      if (createdUser?.id) payload.ownerId = createdUser.id;
      const response = await api.post('/client/college', payload, {}, true);
      const created = response?.data ?? response;
      // Be flexible about where the backend puts the created college id.
      const collegeId =
        created?.college?._id ??
        created?.collegeId ??
        created?._id ??
        created?.id;

      if (!collegeId) {
        setError('College was created but no id was returned from the server. Cannot continue to subscription.');
        return;
      }

      setCreatedCollege({
        id: collegeId,
        name: created.name ?? created.college?.name ?? collegeData.name.trim(),
        code: created.code ?? created.college?.code ?? collegeData.code.trim().toUpperCase(),
      });
      setActiveTab('subscription');
    } catch (err) {
      setError(err.message || 'Failed to create college');
    } finally {
      setSubmitting(false);
    }
  }, [collegeData, createdUser, onSuccess, resetAndClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange?.(v); }}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
          <DialogDescription>
            Step 1: create the client user. Step 2: add the college. Step 3: attach a subscription plan.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('user')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'user'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" />
            User
          </button>
          <button
            type="button"
            onClick={() => createdUser && setActiveTab('college')}
            disabled={!createdUser}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'college'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } ${!createdUser ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Building2 className="h-4 w-4" />
            College
          </button>
          <button
            type="button"
            onClick={() => createdCollege && setActiveTab('subscription')}
            disabled={!createdCollege}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'subscription'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } ${!createdCollege ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CreditCard className="h-4 w-4" />
            Subscription
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {activeTab === 'user' && (
          <form id="client-form-user" onSubmit={handleCreateUserAndNext} className="space-y-4">
            <div>
              <label htmlFor="user-name" className="block text-sm font-medium mb-1.5">Name</label>
              <Input
                id="user-name"
                value={userData.name}
                onChange={(e) => handleUserChange('name', e.target.value)}
                placeholder="Full name"
                className={userErrors.name ? 'border-destructive' : ''}
              />
              {userErrors.name && <p className="text-xs text-destructive mt-1">{userErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium mb-1.5">Email (login)</label>
              <Input
                id="user-email"
                type="email"
                value={userData.email}
                onChange={(e) => handleUserChange('email', e.target.value)}
                placeholder="user@example.com"
                className={userErrors.email ? 'border-destructive' : ''}
              />
              {userErrors.email && <p className="text-xs text-destructive mt-1">{userErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="user-password" className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={userData.password}
                  onChange={(e) => handleUserChange('password', e.target.value)}
                  placeholder="Min 6 characters"
                  className={`${userErrors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {userErrors.password && <p className="text-xs text-destructive mt-1">{userErrors.password}</p>}
            </div>
          </form>
        )}

        {activeTab === 'college' && (
          <form id="client-form-college" onSubmit={handleCreateCollege} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {createdUser && (
              <div className="p-3 rounded-md bg-muted/60 border border-border text-sm flex flex-col gap-1">
                <span className="font-medium">User created</span>
                <span className="text-muted-foreground">
                  {createdUser.name} &lt;{createdUser.email}&gt;
                </span>
              </div>
            )}
            <div>
              <label htmlFor="college-name" className="block text-sm font-medium mb-1.5">Institution name</label>
              <Input
                id="college-name"
                name="name"
                value={collegeData.name}
                onChange={handleCollegeChange}
                placeholder="College name"
                className={collegeErrors.name ? 'border-destructive' : ''}
              />
              {collegeErrors.name && <p className="text-xs text-destructive mt-1">{collegeErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="college-code" className="block text-sm font-medium mb-1.5">Code</label>
              <Input
                id="college-code"
                name="code"
                value={collegeData.code}
                onChange={handleCollegeChange}
                placeholder="e.g. MGCET"
                className={collegeErrors.code ? 'border-destructive' : ''}
              />
              {collegeErrors.code && <p className="text-xs text-destructive mt-1">{collegeErrors.code}</p>}
            </div>
            <div>
              <label htmlFor="college-address" className="block text-sm font-medium mb-1.5">Address</label>
              <Input
                id="college-address"
                name="address"
                value={collegeData.address}
                onChange={handleCollegeChange}
                placeholder="Street address"
                className={collegeErrors.address ? 'border-destructive' : ''}
              />
              {collegeErrors.address && <p className="text-xs text-destructive mt-1">{collegeErrors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="college-city" className="block text-sm font-medium mb-1.5">City</label>
                <Input
                  id="college-city"
                  name="city"
                  value={collegeData.city}
                  onChange={handleCollegeChange}
                  placeholder="City"
                  className={collegeErrors.city ? 'border-destructive' : ''}
                />
                {collegeErrors.city && <p className="text-xs text-destructive mt-1">{collegeErrors.city}</p>}
              </div>
              <div>
                <label htmlFor="college-state" className="block text-sm font-medium mb-1.5">State</label>
                <Input
                  id="college-state"
                  name="state"
                  value={collegeData.state}
                  onChange={handleCollegeChange}
                  placeholder="State"
                  className={collegeErrors.state ? 'border-destructive' : ''}
                />
                {collegeErrors.state && <p className="text-xs text-destructive mt-1">{collegeErrors.state}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="college-pincode" className="block text-sm font-medium mb-1.5">Pincode</label>
              <Input
                id="college-pincode"
                name="pincode"
                value={collegeData.pincode}
                onChange={handleCollegeChange}
                placeholder="6 digits"
                maxLength={6}
                className={collegeErrors.pincode ? 'border-destructive' : ''}
              />
              {collegeErrors.pincode && <p className="text-xs text-destructive mt-1">{collegeErrors.pincode}</p>}
            </div>
            <div>
              <label htmlFor="college-phone" className="block text-sm font-medium mb-1.5">Phone</label>
              <Input
                id="college-phone"
                name="phone"
                value={collegeData.phone}
                onChange={handleCollegeChange}
                placeholder="Phone"
                className={collegeErrors.phone ? 'border-destructive' : ''}
              />
              {collegeErrors.phone && <p className="text-xs text-destructive mt-1">{collegeErrors.phone}</p>}
            </div>
            <div>
              <label htmlFor="college-email" className="block text-sm font-medium mb-1.5">Email</label>
              <Input
                id="college-email"
                name="email"
                type="email"
                value={collegeData.email}
                onChange={handleCollegeChange}
                placeholder="college@example.com"
                className={collegeErrors.email ? 'border-destructive' : ''}
              />
              {collegeErrors.email && <p className="text-xs text-destructive mt-1">{collegeErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="college-website" className="block text-sm font-medium mb-1.5">Website</label>
              <Input
                id="college-website"
                name="website"
                value={collegeData.website}
                onChange={handleCollegeChange}
                placeholder="https://..."
                className={collegeErrors.website ? 'border-destructive' : ''}
              />
              {collegeErrors.website && <p className="text-xs text-destructive mt-1">{collegeErrors.website}</p>}
            </div>
            <div>
              <label htmlFor="college-establishedYear" className="block text-sm font-medium mb-1.5">Established year</label>
              <Input
                id="college-establishedYear"
                name="establishedYear"
                value={collegeData.establishedYear}
                onChange={handleCollegeChange}
                placeholder="e.g. 2020"
                className={collegeErrors.establishedYear ? 'border-destructive' : ''}
              />
              {collegeErrors.establishedYear && <p className="text-xs text-destructive mt-1">{collegeErrors.establishedYear}</p>}
            </div>
          </form>
        )}

        {activeTab === 'subscription' && createdCollege && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pt-2">
            <div className="p-3 rounded-md bg-muted/60 border border-border text-sm flex flex-col gap-1">
              <span className="font-medium">College created</span>
              <span className="text-muted-foreground">
                {createdCollege.name} ({createdCollege.code})
              </span>
            </div>
            <SubscriptionForm
              embedded
              open
              onOpenChange={() => {}}
              onSuccess={() => {
                onSuccess?.();
                resetAndClose();
              }}
              collegeId={createdCollege.id}
              plans={plans}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {activeTab === 'user' ? (
            <>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
                Cancel
              </Button>
              <Button form="client-form-user" type="submit" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                {submitting ? 'Creating...' : 'Create user & Next'}
              </Button>
            </>
          ) : activeTab === 'college' ? (
            <>
              {!createdUser && (
                <Button type="button" variant="outline" onClick={() => setActiveTab('user')} disabled={submitting}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <Button form="client-form-college" type="submit" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                {submitting ? 'Creating...' : 'Create college'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
                Cancel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
