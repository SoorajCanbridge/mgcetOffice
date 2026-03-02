'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api, API_URL } from '@/lib/api';
import { getLogoUrl } from '@/lib/utils';
import { Edit2, Save, X, Building2, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function GeneralSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const {user} = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
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
  });
  const [originalData, setOriginalData] = useState(null);
  const [errors, setErrors] = useState({});
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch institution details on component mount
  useEffect(() => {
    fetchInstitutionDetails();
  }, []);

  const fetchInstitutionDetails = async () => {
    try {
      setFetching(true);
      setError('');
      
      // Assuming the API endpoint is /api/institution or /api/institution-details
      const college = await api.get(`/colleges/${user.college}`);
      setFormData({
        name: college?.data.name || '',
        code: college?.data.code || '',
        address: college?.data.address || '',
        city: college?.data.city || '',
        state: college?.data.state || '',
        pincode: college?.data.pincode || '',
        phone: college?.data.phone || '',
        email: college?.data.email || '',
        website: college?.data.website || '',
        establishedYear: college?.data.establishedYear || '',
      });
      setOriginalData(college?.data);
      // Set logo URL if available (resolve to API base URL so image loads from backend)
      if (college?.data?.logo) {
        const resolved = getLogoUrl(college.data.logo, API_URL);
        setLogoUrl(resolved);
        setLogoPreview(resolved);
      } else {
        setLogoUrl('');
        setLogoPreview('');
      }
    } catch (err) {
      // If institution doesn't exist yet, allow creating it
      if (err.message.includes('404') || err.message.includes('not found')) {
        setError('');
      } else {
        setError(err.message || 'Failed to fetch institution details');
      }
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setError('');
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // State validation
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    // Pincode validation
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Website validation (optional, but if provided should be valid)
    if (formData.website.trim() && !/^https?:\/\/.+/.test(formData.website.trim())) {
      newErrors.website = 'Please enter a valid website URL (starting with http:// or https://)';
    }

    // Established Year validation
    if (formData.establishedYear) {
      const year = parseInt(formData.establishedYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        newErrors.establishedYear = `Year must be between 1800 and ${currentYear}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    fetchInstitutionDetails();
    setIsEditing(false);
    setErrors({});
    setError('');
    setSuccess('');
    setLogoPreview(logoUrl); // Reset preview to original logo
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      setSelectedFile(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handleLogoUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setUploadingLogo(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('logo', selectedFile);

      const response = await api.uploadFile(`/colleges/${user.college}/logo`, formData, true);
      
      // Update logo URL from response (resolve to API base URL so image loads from backend)
      const rawLogo = response?.data?.logo || response?.logo || response?.data?.logoUrl;
      if (rawLogo) {
        const resolved = getLogoUrl(rawLogo, API_URL);
        setLogoUrl(resolved);
        setLogoPreview(resolved);
      } else {
        setLogoUrl(logoPreview);
      }

      setSuccess('Logo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Clear file input and selected file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Failed to upload logo');
      // Reset preview on error
      setLogoPreview(logoUrl);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Prepare data for submission
      const submitData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        website: formData.website.trim() || undefined,
        establishedYear: formData.establishedYear ? parseInt(formData.establishedYear) : undefined,
      };

      let response;
      if (originalData) {
        // Update existing institution
        response = await api.put(`/colleges/${user.college}`, submitData,{},true);
      } else {
        // Create new institution
        response = await api.post('/colleges', submitData,{},true);
      }

      setOriginalData(response || submitData);
      setIsEditing(false);
      setSuccess('Institution details saved successfully!');
      setErrors({});
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save institution details');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading institution details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">General Settings</h1>
          </div>
          {!isEditing && (
            <Button onClick={handleEdit} variant="outline" className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Details
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2">Manage your institution details and information</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            College Logo
          </h2>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 border-2 border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="College Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No logo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-4">
              <div>
                <label htmlFor="logo-upload" className="block text-sm font-medium mb-2">
                  Upload Logo
                </label>
                <div className="flex gap-3">
                  <Input
                    id="logo-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="flex-1"
                    disabled={uploadingLogo}
                  />
                  <Button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo || !selectedFile}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Institution Name <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter institution name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.name || 'Not set'}
                </p>
              )}
            </div>

            {/* Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Institution Code <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Enter institution code"
                    className={errors.code ? 'border-destructive' : ''}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.code || 'Not set'}
                </p>
              )}
            </div>

            {/* Established Year */}
            <div>
              <label htmlFor="establishedYear" className="block text-sm font-medium mb-2">
                Established Year
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="establishedYear"
                    name="establishedYear"
                    type="number"
                    value={formData.establishedYear}
                    onChange={handleChange}
                    placeholder="e.g., 1990"
                    min="1800"
                    max={new Date().getFullYear()}
                    className={errors.establishedYear ? 'border-destructive' : ''}
                  />
                  {errors.establishedYear && (
                    <p className="text-sm text-destructive mt-1">{errors.establishedYear}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.establishedYear || 'Not set'}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium mb-2">
                Address <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter full address"
                    className={errors.address ? 'border-destructive' : ''}
                  />
                  {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.address || 'Not set'}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-2">
                City <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    className={errors.city ? 'border-destructive' : ''}
                  />
                  {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.city || 'Not set'}
                </p>
              )}
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-2">
                State <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                    className={errors.state ? 'border-destructive' : ''}
                  />
                  {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.state || 'Not set'}
                </p>
              )}
            </div>

            {/* Pincode */}
            <div>
              <label htmlFor="pincode" className="block text-sm font-medium mb-2">
                Pincode <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="Enter 6-digit pincode"
                    maxLength="6"
                    className={errors.pincode ? 'border-destructive' : ''}
                  />
                  {errors.pincode && <p className="text-sm text-destructive mt-1">{errors.pincode}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.pincode || 'Not set'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.phone || 'Not set'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email <span className="text-destructive">*</span>
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.email || 'Not set'}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium mb-2">
                Website
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className={errors.website ? 'border-destructive' : ''}
                  />
                  {errors.website && <p className="text-sm text-destructive mt-1">{errors.website}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formData.website || 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

