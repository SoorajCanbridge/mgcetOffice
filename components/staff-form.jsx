'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, X, Plus, Trash2, Upload, User } from 'lucide-react';
import { api, API_URL, deleteUploadedFile } from '@/lib/api';
import { getStaffPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const TEACHING_DESIGNATIONS = [
  { value: 'professor', label: 'Professor' },
  { value: 'associate-professor', label: 'Associate Professor' },
  { value: 'assistant-professor', label: 'Assistant Professor' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'visiting-faculty', label: 'Visiting Faculty' },
  { value: 'guest-faculty', label: 'Guest Faculty' },
];

const NON_TEACHING_DESIGNATIONS = [
  { value: 'principal', label: 'Principal' },
  { value: 'vice-principal', label: 'Vice Principal' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'admin-officer', label: 'Admin Officer' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'lab-technician', label: 'Lab Technician' },
  { value: 'lab-assistant', label: 'Lab Assistant' },
  { value: 'peon', label: 'Peon' },
  { value: 'security-guard', label: 'Security Guard' },
  { value: 'maintenance-staff', label: 'Maintenance Staff' },
  { value: 'canteen-staff', label: 'Canteen Staff' },
  { value: 'driver', label: 'Driver' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'it-support', label: 'IT Support' },
  { value: 'hr-officer', label: 'HR Officer' },
  { value: 'store-keeper', label: 'Store Keeper' },
  { value: 'other', label: 'Other' },
];

const SHIFTS = [
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'general', label: 'General' },
];

const EMPTY_QUALIFICATION = {
  degree: '',
  institution: '',
  year: '',
  percentage: '',
};

const EMPTY_STAFF = {
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  alternatePhone: '',
  dateOfBirth: '',
  gender: '',
  address: {
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  },
  department: '',
  designation: '',
  specialization: '',
  qualifications: [EMPTY_QUALIFICATION],
  experience: {
    totalYears: '',
    teachingYears: '',
    industryYears: '',
  },
  courses: [],
  reportingTo: '',
  role: '',
  office: '',
  workLocation: '',
  shift: 'general',
  joiningDate: '',
  employmentStatus: 'active',
  staffType: 'teaching',
  salary: '',
  documents: {
    aadhar: '',
    pan: '',
    certificates: '',
  },
  emergencyContact: {
    name: '',
    relation: '',
    phone: '',
    email: '',
  },
  image: '',
  isActive: true,
};

const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'retired', label: 'Retired' },
  { value: 'terminated', label: 'Terminated' },
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function StaffForm({
  open,
  onClose,
  editingStaff,
  courses = [],
  onSuccess,
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(EMPTY_STAFF);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reportingToOptions, setReportingToOptions] = useState([]);
  const [photoPreviewDataUrl, setPhotoPreviewDataUrl] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Fetch reporting managers (non-teaching staff) when staffType is non-teaching
  useEffect(() => {
    if (formData.staffType === 'non-teaching' && user?.college) {
      const fetchReportingManagers = async () => {
        try {
          const response = await api.get(`/teachers?college=${user.college}&staffType=non-teaching&limit=1000`, {}, true);
          const data = response?.data || response || [];
          setReportingToOptions(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Failed to load reporting managers:', err);
        }
      };
      fetchReportingManagers();
    } else {
      setReportingToOptions([]);
    }
  }, [formData.staffType, user?.college]);

  // Reset form when modal opens/closes or editingStaff changes
  useEffect(() => {
    if (open) {
      if (editingStaff) {
        setFormData({
          employeeId: editingStaff.employeeId || '',
          name: editingStaff.name || '',
          email: editingStaff.email || '',
          phone: editingStaff.phone || '',
          alternatePhone: editingStaff.alternatePhone || '',
          dateOfBirth: formatDateForInput(editingStaff.dateOfBirth),
          gender: editingStaff.gender || '',
          address: {
            street: editingStaff.address?.street || '',
            city: editingStaff.address?.city || '',
            state: editingStaff.address?.state || '',
            pincode: editingStaff.address?.pincode || '',
            country: editingStaff.address?.country || 'India',
          },
          department: editingStaff.department || '',
          designation: editingStaff.designation || '',
          staffType: editingStaff.staffType || 'teaching',
          specialization: Array.isArray(editingStaff.specialization) ? editingStaff.specialization.join(', ') : editingStaff.specialization || '',
          qualifications:
            Array.isArray(editingStaff.qualifications) && editingStaff.qualifications.length > 0
              ? editingStaff.qualifications.map((q) => ({
                  degree: q.degree || '',
                  institution: q.institution || '',
                  year: q.year ? String(q.year) : '',
                  percentage: q.percentage !== undefined && q.percentage !== null ? String(q.percentage) : '',
                }))
              : [{ ...EMPTY_QUALIFICATION }],
          experience: {
            totalYears:
              editingStaff.experience?.totalYears !== undefined && editingStaff.experience?.totalYears !== null
                ? String(editingStaff.experience.totalYears)
                : '',
            teachingYears:
              editingStaff.experience?.teachingYears !== undefined && editingStaff.experience?.teachingYears !== null
                ? String(editingStaff.experience.teachingYears)
                : '',
            industryYears:
              editingStaff.experience?.industryYears !== undefined && editingStaff.experience?.industryYears !== null
                ? String(editingStaff.experience.industryYears)
                : '',
          },
          courses: Array.isArray(editingStaff.courses)
            ? editingStaff.courses.map((course) => course._id || course.id || course)
            : [],
          reportingTo: editingStaff.reportingTo?._id || editingStaff.reportingTo || '',
          role: editingStaff.role || '',
          office: editingStaff.office || '',
          workLocation: editingStaff.workLocation || '',
          shift: editingStaff.shift || 'general',
          joiningDate: formatDateForInput(editingStaff.joiningDate),
          employmentStatus: editingStaff.employmentStatus || 'active',
          salary: editingStaff.salary !== undefined && editingStaff.salary !== null ? String(editingStaff.salary) : '',
          documents: {
            aadhar: editingStaff.documents?.aadhar || '',
            pan: editingStaff.documents?.pan || '',
            certificates: Array.isArray(editingStaff.documents?.certificates)
              ? editingStaff.documents.certificates.join(', ')
              : editingStaff.documents?.certificates || '',
          },
          emergencyContact: {
            name: editingStaff.emergencyContact?.name || '',
            relation: editingStaff.emergencyContact?.relation || '',
            phone: editingStaff.emergencyContact?.phone || '',
            email: editingStaff.emergencyContact?.email || '',
          },
          image: editingStaff.image ?? editingStaff.photo ?? '',
          isActive: editingStaff.isActive ?? true,
        });
        setPhotoPreviewDataUrl(null);
        setSelectedPhotoFile(null);
      } else {
        setFormData(EMPTY_STAFF);
      }
      setFormErrors({});
      setError('');
      setSuccess('');
    }
  }, [open, editingStaff]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked, options } = e.target;

    setFormData((prev) => {
      if (name.startsWith('address.')) {
        const field = name.split('.')[1];
        return {
          ...prev,
          address: {
            ...prev.address,
            [field]: value,
          },
        };
      }

      if (name.startsWith('experience.')) {
        const field = name.split('.')[1];
        return {
          ...prev,
          experience: {
            ...prev.experience,
            [field]: value,
          },
        };
      }

      if (name.startsWith('documents.')) {
        const field = name.split('.')[1];
        return {
          ...prev,
          documents: {
            ...prev.documents,
            [field]: value,
          },
        };
      }

      if (name.startsWith('emergencyContact.')) {
        const field = name.split('.')[1];
        return {
          ...prev,
          emergencyContact: {
            ...prev.emergencyContact,
            [field]: value,
          },
        };
      }

      // When staffType changes, clear courses for non-teaching and reportingTo for teaching
      if (name === 'staffType') {
        return {
          ...prev,
          [name]: value,
          courses: value === 'non-teaching' ? [] : prev.courses,
          reportingTo: value === 'teaching' ? '' : prev.reportingTo,
        };
      }

      if (name.startsWith('qualifications.')) {
        const [, indexStr, field] = name.split('.');
        const index = Number(indexStr);
        const nextQualifications = [...prev.qualifications];
        nextQualifications[index] = {
          ...nextQualifications[index],
          [field]: value,
        };
        return {
          ...prev,
          qualifications: nextQualifications,
        };
      }

      if (name === 'courses') {
        const selected = Array.from(options || [])
          .filter((option) => option.selected)
          .map((option) => option.value);
        return { ...prev, courses: selected };
      }

      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
    });

    setFormErrors((prev) => {
      const newErrors = { ...prev };
      if (name.startsWith('qualifications.')) {
        const prefix = name.split('.').slice(0, 2).join('.');
        Object.keys(newErrors).forEach((key) => {
          if (key.startsWith(prefix)) delete newErrors[key];
        });
      } else if (
        name.startsWith('address.') ||
        name.startsWith('experience.') ||
        name.startsWith('documents.') ||
        name.startsWith('emergencyContact.')
      ) {
        Object.keys(newErrors).forEach((key) => {
          if (key.startsWith(name.split('.')[0])) delete newErrors[key];
        });
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
    setError('');
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors = {};
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const department = formData.department.trim();
    const designation = formData.designation;
    const pincode = formData.address.pincode.trim();
    const currentYear = new Date().getFullYear();

    if (!name) nextErrors.name = 'Name is required';
    else if (name.length < 2) nextErrors.name = 'Name must be at least 2 characters';

    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Invalid email format';
    }

    if (!phone) nextErrors.phone = 'Phone is required';
    if (!formData.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) nextErrors.gender = 'Gender is required';

    if (!formData.address.city.trim()) nextErrors['address.city'] = 'City is required';
    if (!formData.address.state.trim()) nextErrors['address.state'] = 'State is required';
    if (!pincode) nextErrors['address.pincode'] = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(pincode)) nextErrors['address.pincode'] = 'Pincode must be 6 digits';

    if (!department) nextErrors.department = 'Department is required';
    if (!designation) nextErrors.designation = 'Designation is required';
    if (!formData.joiningDate) nextErrors.joiningDate = 'Joining date is required';
    if (!formData.employmentStatus) nextErrors.employmentStatus = 'Employment status is required';

    // Validate courses for teaching staff
    if (formData.staffType === 'teaching' && formData.courses && formData.courses.length > 0) {
      // Courses validation is handled by backend
    }

    // Validate reportingTo for non-teaching staff (optional but if provided should be valid)
    // Backend will validate this

    ['totalYears', 'teachingYears', 'industryYears'].forEach((field) => {
      const val = formData.experience?.[field];
      if (val !== '' && val !== undefined) {
        const num = Number(val);
        if (Number.isNaN(num) || num < 0) {
          nextErrors[`experience.${field}`] = 'Must be a non-negative number';
        }
      }
    });

    if (formData.salary !== '' && formData.salary !== undefined) {
      const salaryNum = Number(formData.salary);
      if (Number.isNaN(salaryNum) || salaryNum < 0) {
        nextErrors.salary = 'Salary must be a non-negative number';
      }
    }

    formData.qualifications.forEach((q, idx) => {
      const hasData = q.degree || q.institution || q.year || q.percentage;
      if (hasData && !q.degree.trim()) {
        nextErrors[`qualifications.${idx}.degree`] = 'Degree is required';
      }
      if (q.year) {
        const year = Number(q.year);
        if (Number.isNaN(year) || year < 1950 || year > currentYear) {
          nextErrors[`qualifications.${idx}.year`] = `Year must be between 1950 and ${currentYear}`;
        }
      }
      if (q.percentage) {
        const percentage = Number(q.percentage);
        if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
          nextErrors[`qualifications.${idx}.percentage`] = 'Percentage must be 0-100';
        }
      }
    });

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const addQualification = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      qualifications: [...prev.qualifications, { ...EMPTY_QUALIFICATION }],
    }));
  }, []);

  const removeQualification = useCallback((index) => {
    setFormData((prev) => {
      if (prev.qualifications.length <= 1) return prev;
      const next = prev.qualifications.filter((_, i) => i !== index);
      return {
        ...prev,
        qualifications: next.length ? next : [{ ...EMPTY_QUALIFICATION }],
      };
    });
  }, []);

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedPhotoFile(null);
      setPhotoPreviewDataUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    setSelectedPhotoFile(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreviewDataUrl(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    if (!selectedPhotoFile || !editingStaff) return;
    const staffId = editingStaff._id || editingStaff.id;
    if (!staffId) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const oldPath = editingStaff.image ?? editingStaff.photo ?? formData.image ?? formData.photo;
      if (oldPath) await deleteUploadedFile(oldPath);
      const fd = new FormData();
      fd.append('folder', 'staff');
      fd.append('file', selectedPhotoFile);
      const response = await api.uploadFile('/upload/single', fd, true);
      const path = response?.data?.path ?? response?.path;
      if (path) {
        await api.put(`/teachers/${staffId}`, { image: path }, {}, true);
        setFormData((prev) => ({ ...prev, image: path }));
      }
      setPhotoPreviewDataUrl(null);
      setSelectedPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setSuccess('Photo updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [selectedPhotoFile, editingStaff, formData.image, formData.photo]);

  const handlePhotoClear = useCallback(async () => {
    if (!editingStaff) return;
    const staffId = editingStaff._id || editingStaff.id;
    if (!staffId) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const currentPath = formData.image ?? formData.photo ?? (editingStaff.image ?? editingStaff.photo);
      if (currentPath) await deleteUploadedFile(currentPath);
      await api.put(`/teachers/${staffId}`, { image: '' }, {}, true);
      setFormData((prev) => ({ ...prev, image: '' }));
      setPhotoPreviewDataUrl(null);
      setSelectedPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setSuccess('Photo cleared.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to clear photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [editingStaff, formData.image, formData.photo]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setError('Please fix the errors in the form.');
      return;
    }

    setSaving(true);
    try {
      const specializationArray = formData.specialization
        ? formData.specialization
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      const qualificationPayload = formData.qualifications
        .map((q) => ({
          degree: q.degree.trim(),
          institution: q.institution.trim() || undefined,
          year: q.year !== '' ? Number(q.year) : undefined,
          percentage: q.percentage !== '' ? Number(q.percentage) : undefined,
        }))
        .filter((q) => q.degree);

      const experiencePayload =
        ['totalYears', 'teachingYears', 'industryYears'].some((field) => formData.experience?.[field] !== '') &&
        formData.experience
          ? {
              totalYears:
                formData.experience.totalYears !== '' ? Number(formData.experience.totalYears) : undefined,
              teachingYears:
                formData.experience.teachingYears !== '' ? Number(formData.experience.teachingYears) : undefined,
              industryYears:
                formData.experience.industryYears !== '' ? Number(formData.experience.industryYears) : undefined,
            }
          : undefined;

      const certificatesArray = formData.documents.certificates
        ? formData.documents.certificates
            .split(/[,\\n]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;

      const documentsPayload =
        formData.documents.aadhar ||
        formData.documents.pan ||
        (certificatesArray && certificatesArray.length > 0)
          ? {
              aadhar: formData.documents.aadhar.trim() || undefined,
              pan: formData.documents.pan.trim() || undefined,
              certificates: certificatesArray,
            }
          : undefined;

      const emergencyPayload =
        formData.emergencyContact.name ||
        formData.emergencyContact.relation ||
        formData.emergencyContact.phone ||
        formData.emergencyContact.email
          ? {
              name: formData.emergencyContact.name.trim() || undefined,
              relation: formData.emergencyContact.relation.trim() || undefined,
              phone: formData.emergencyContact.phone.trim() || undefined,
              email: formData.emergencyContact.email.trim() || undefined,
            }
          : undefined;

      const payload = {
        employeeId: formData.employeeId?.trim() || undefined,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        address: {
          street: formData.address.street.trim() || undefined,
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          pincode: formData.address.pincode.trim(),
          country: formData.address.country.trim() || undefined,
        },
        department: formData.department.trim(),
        designation: formData.designation,
        staffType: formData.staffType || 'teaching',
        specialization: specializationArray,
        qualifications: qualificationPayload,
        experience: experiencePayload,
        courses: formData.staffType === 'teaching' && Array.isArray(formData.courses) ? formData.courses.filter(Boolean) : [],
        reportingTo: formData.staffType === 'non-teaching' && formData.reportingTo ? formData.reportingTo : undefined,
        role: formData.staffType === 'non-teaching' && formData.role ? formData.role.trim() : undefined,
        office: formData.staffType === 'non-teaching' && formData.office ? formData.office.trim() : undefined,
        workLocation: formData.staffType === 'non-teaching' && formData.workLocation ? formData.workLocation.trim() : undefined,
        shift: formData.staffType === 'non-teaching' && formData.shift ? formData.shift : undefined,
        joiningDate: formData.joiningDate || undefined,
        employmentStatus: formData.employmentStatus || undefined,
        salary: formData.salary !== '' ? Number(formData.salary) : undefined,
        documents: documentsPayload,
        emergencyContact: emergencyPayload,
        isActive: !!formData.isActive,
        college: user.college,
      };

      let imagePath = formData.image || formData.photo || '';
      if (!editingStaff && selectedPhotoFile) {
        const fd = new FormData();
        fd.append('folder', 'staff');
        fd.append('file', selectedPhotoFile);
        const uploadRes = await api.uploadFile('/upload/single', fd, true);
        imagePath = uploadRes?.data?.path ?? uploadRes?.path ?? '';
      }
      if (imagePath !== undefined) payload.image = imagePath;

      const staffId = editingStaff ? (editingStaff._id || editingStaff.id) : null;
      if (staffId) {
        await api.put(`/teachers/${staffId}`, payload, {}, true);
        setSuccess('Staff updated successfully.');
      } else {
        await api.post('/teachers', payload, {}, true);
        setSuccess('Staff created successfully.');
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to save staff');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  }, [formData, validateForm, editingStaff, selectedPhotoFile, user.college, onSuccess, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editingStaff ? 'Edit Staff' : 'New Staff'}</h2>
          <Button type="button" variant="ghost" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md mb-4">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border">
            {photoPreviewDataUrl || getStaffPhotoUrl(formData.image ?? formData.photo, API_URL) ? (
              <img
                src={photoPreviewDataUrl || getStaffPhotoUrl(formData.image ?? formData.photo, API_URL)}
                alt="Staff"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Photo (optional)</label>
            <div className="flex gap-2 flex-wrap items-center">
              <Input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="max-w-[200px]"
                disabled={uploadingPhoto}
              />
              {editingStaff && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePhotoUpload}
                    disabled={!selectedPhotoFile || uploadingPhoto}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingPhoto ? 'Uploading...' : 'Upload'}
                  </Button>
                  {(formData.image || formData.photo) && (
                    <Button type="button" variant="outline" onClick={handlePhotoClear} disabled={uploadingPhoto} className="gap-2">
                      Clear
                    </Button>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {editingStaff ? 'JPG, PNG or GIF. Max 5MB. Upload to update, or Clear to remove.' : 'JPG, PNG or GIF. Max 5MB. Saved when you create the staff.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Employee ID <span className="text-xs text-muted-foreground">(optional, auto if blank)</span>
              </label>
              <Input
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="Auto-generated if left blank"
                disabled={!!editingStaff}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && <p className="text-sm text-destructive mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-sm text-destructive mt-1">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone <span className="text-destructive">*</span>
              </label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                className={formErrors.phone ? 'border-destructive' : ''}
              />
              {formErrors.phone && <p className="text-sm text-destructive mt-1">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Alternate Phone</label>
              <Input
                name="alternatePhone"
                value={formData.alternatePhone}
                onChange={handleChange}
                placeholder="Alternate phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth <span className="text-destructive">*</span>
              </label>
              <Input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} className="w-full" />
              {formErrors.dateOfBirth && <p className="text-sm text-destructive mt-1">{formErrors.dateOfBirth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Gender <span className="text-destructive">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select gender</option>
                {GENDERS.map((gender) => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
              {formErrors.gender && <p className="text-sm text-destructive mt-1">{formErrors.gender}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address - Street</label>
              <Input name="address.street" value={formData.address.street} onChange={handleChange} placeholder="Street address" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input name="address.city" value={formData.address.city} onChange={handleChange} placeholder="City" />
              {formErrors['address.city'] && <p className="text-sm text-destructive mt-1">{formErrors['address.city']}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input name="address.state" value={formData.address.state} onChange={handleChange} placeholder="State" />
              {formErrors['address.state'] && <p className="text-sm text-destructive mt-1">{formErrors['address.state']}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pincode</label>
              <Input name="address.pincode" value={formData.address.pincode} onChange={handleChange} placeholder="Pincode" />
              {formErrors['address.pincode'] && <p className="text-sm text-destructive mt-1">{formErrors['address.pincode']}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input name="address.country" value={formData.address.country} onChange={handleChange} placeholder="Country" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Department <span className="text-destructive">*</span>
              </label>
              <Input name="department" value={formData.department} onChange={handleChange} placeholder="e.g., Computer Science" />
              {formErrors.department && <p className="text-sm text-destructive mt-1">{formErrors.department}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Designation <span className="text-destructive">*</span>
              </label>
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select designation</option>
                {(formData.staffType === 'teaching' ? TEACHING_DESIGNATIONS : NON_TEACHING_DESIGNATIONS).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {formErrors.designation && <p className="text-sm text-destructive mt-1">{formErrors.designation}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Staff Type <span className="text-destructive">*</span>
              </label>
              <select
                name="staffType"
                value={formData.staffType}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="teaching">Teaching</option>
                <option value="non-teaching">Non-Teaching</option>
              </select>
            </div>

            {formData.staffType === 'teaching' && (
              <div>
                <label className="block text-sm font-medium mb-2">Specialization (comma separated)</label>
                <Input
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="AI, ML"
                />
              </div>
            )}

            {formData.staffType === 'non-teaching' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Input
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="Role"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Office</label>
                  <Input
                    name="office"
                    value={formData.office}
                    onChange={handleChange}
                    placeholder="Office"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Work Location</label>
                  <Input
                    name="workLocation"
                    value={formData.workLocation}
                    onChange={handleChange}
                    placeholder="Work Location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Shift</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {SHIFTS.map((shift) => (
                      <option key={shift.value} value={shift.value}>
                        {shift.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Reporting To (Optional)</label>
                  <select
                    name="reportingTo"
                    value={formData.reportingTo}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select Reporting Manager</option>
                    {reportingToOptions.map((staff) => (
                      <option key={staff._id || staff.id} value={staff._id || staff.id}>
                        {staff.name} ({staff.employeeId || 'N/A'}) - {staff.designation || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Qualifications</h3>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addQualification}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {formData.qualifications.map((q, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-md border-border">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Degree {q.degree || formData.qualifications.length === 1 ? <span className="text-destructive">*</span> : null}
                      </label>
                      <Input
                        name={`qualifications.${idx}.degree`}
                        value={q.degree}
                        onChange={handleChange}
                        placeholder="e.g., PhD"
                        className={formErrors[`qualifications.${idx}.degree`] ? 'border-destructive' : ''}
                      />
                      {formErrors[`qualifications.${idx}.degree`] && (
                        <p className="text-xs text-destructive mt-1">{formErrors[`qualifications.${idx}.degree`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Institution</label>
                      <Input
                        name={`qualifications.${idx}.institution`}
                        value={q.institution}
                        onChange={handleChange}
                        placeholder="Institution"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Year</label>
                      <Input
                        name={`qualifications.${idx}.year`}
                        type="number"
                        value={q.year}
                        onChange={handleChange}
                        placeholder="YYYY"
                        className={formErrors[`qualifications.${idx}.year`] ? 'border-destructive' : ''}
                      />
                      {formErrors[`qualifications.${idx}.year`] && (
                        <p className="text-xs text-destructive mt-1">{formErrors[`qualifications.${idx}.year`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Percentage</label>
                      <Input
                        name={`qualifications.${idx}.percentage`}
                        type="number"
                        value={q.percentage}
                        onChange={handleChange}
                        placeholder="0-100"
                        className={formErrors[`qualifications.${idx}.percentage`] ? 'border-destructive' : ''}
                      />
                      {formErrors[`qualifications.${idx}.percentage`] && (
                        <p className="text-xs text-destructive mt-1">{formErrors[`qualifications.${idx}.percentage`]}</p>
                      )}
                    </div>
                    {formData.qualifications.length > 1 && (
                      <div className="md:col-span-4 flex justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQualification(idx)} className="gap-1">
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {formData.staffType === 'teaching' && (
              <div>
                <label className="block text-sm font-medium mb-2">Courses (multi-select)</label>
                <select
                  name="courses"
                  multiple
                  value={formData.courses}
                  onChange={handleChange}
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {courses.map((course) => (
                    <option key={course._id || course.id} value={course._id || course.id}>
                      {course.name} ({course.batch})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Joining Date <span className="text-destructive">*</span>
              </label>
              <Input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} className="w-full" />
              {formErrors.joiningDate && <p className="text-sm text-destructive mt-1">{formErrors.joiningDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Employment Status <span className="text-destructive">*</span>
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {EMPLOYMENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {formErrors.employmentStatus && <p className="text-sm text-destructive mt-1">{formErrors.employmentStatus}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Salary</label>
              <Input
                name="salary"
                type="number"
                value={formData.salary}
                onChange={handleChange}
                placeholder="Monthly salary"
                className={formErrors.salary ? 'border-destructive' : ''}
              />
              {formErrors.salary && <p className="text-sm text-destructive mt-1">{formErrors.salary}</p>}
            </div>

            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold mb-2">Experience</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Total Years</label>
                  <Input
                    name="experience.totalYears"
                    type="number"
                    value={formData.experience.totalYears}
                    onChange={handleChange}
                    placeholder="0"
                    className={formErrors['experience.totalYears'] ? 'border-destructive' : ''}
                  />
                  {formErrors['experience.totalYears'] && (
                    <p className="text-xs text-destructive mt-1">{formErrors['experience.totalYears']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Teaching Years</label>
                  <Input
                    name="experience.teachingYears"
                    type="number"
                    value={formData.experience.teachingYears}
                    onChange={handleChange}
                    placeholder="0"
                    className={formErrors['experience.teachingYears'] ? 'border-destructive' : ''}
                  />
                  {formErrors['experience.teachingYears'] && (
                    <p className="text-xs text-destructive mt-1">{formErrors['experience.teachingYears']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Industry Years</label>
                  <Input
                    name="experience.industryYears"
                    type="number"
                    value={formData.experience.industryYears}
                    onChange={handleChange}
                    placeholder="0"
                    className={formErrors['experience.industryYears'] ? 'border-destructive' : ''}
                  />
                  {formErrors['experience.industryYears'] && (
                    <p className="text-xs text-destructive mt-1">{formErrors['experience.industryYears']}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold mb-2">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Aadhar</label>
                  <Input name="documents.aadhar" value={formData.documents.aadhar} onChange={handleChange} placeholder="Aadhar number" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">PAN</label>
                  <Input name="documents.pan" value={formData.documents.pan} onChange={handleChange} placeholder="PAN number" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Certificates (comma or newline separated)</label>
                  <textarea
                    name="documents.certificates"
                    value={formData.documents.certificates}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Certificate links/ids"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold mb-2">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Name</label>
                  <Input
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleChange}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Relation</label>
                  <Input
                    name="emergencyContact.relation"
                    value={formData.emergencyContact.relation}
                    onChange={handleChange}
                    placeholder="Relation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Phone</label>
                  <Input
                    name="emergencyContact.phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleChange}
                    placeholder="Contact phone"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <Input
                    name="emergencyContact.email"
                    value={formData.emergencyContact.email}
                    onChange={handleChange}
                    placeholder="Contact email"
                    type="email"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium mt-2">
              <input
                type="checkbox"
                name="isActive"
                checked={!!formData.isActive}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

