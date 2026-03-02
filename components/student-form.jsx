'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, X, Upload, User } from 'lucide-react';

const ENROLLMENT_STATUSES = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'transferred', label: 'Transferred' },
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function StudentForm({
  formData,
  formErrors,
  courses,
  editingStudent,
  saving,
  error,
  success,
  onChange,
  onSubmit,
  onCancel,
  photoDisplayUrl,
  onPhotoChange,
  onPhotoUpload,
  uploadingPhoto,
  hasSelectedPhoto,
  hasCurrentPhoto,
  onPhotoClear,
  photoInputRef,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editingStudent ? 'Edit Student' : 'New Student'}</h2>
          <Button variant="ghost" onClick={onCancel} className="gap-2">
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

        {(photoDisplayUrl != null || onPhotoChange) && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              {photoDisplayUrl ? (
                <img src={photoDisplayUrl} alt="Student" className="w-full h-full object-cover" />
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
                  onChange={onPhotoChange}
                  className="max-w-[200px]"
                  disabled={uploadingPhoto}
                />
                {editingStudent && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onPhotoUpload}
                      disabled={!hasSelectedPhoto || uploadingPhoto}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingPhoto ? 'Uploading...' : 'Upload'}
                    </Button>
                    {hasCurrentPhoto && onPhotoClear && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onPhotoClear}
                        disabled={uploadingPhoto}
                        className="gap-2"
                      >
                        Clear
                      </Button>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {editingStudent ? 'JPG, PNG or GIF. Max 5MB. Upload to update, or Clear to remove.' : 'JPG, PNG or GIF. Max 5MB. Saved when you create the student.'}
              </p>
            </div>
          </div>
        )}
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
                placeholder="Alternate phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <Input
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={onChange}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={onChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select gender</option>
                {GENDERS.map((gender) => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address - Street</label>
              <Input
                name="address.street"
                value={formData.address.street}
                onChange={onChange}
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                name="address.city"
                value={formData.address.city}
                onChange={onChange}
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                name="address.state"
                value={formData.address.state}
                onChange={onChange}
                placeholder="State"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pincode</label>
              <Input
                name="address.pincode"
                value={formData.address.pincode}
                onChange={onChange}
                placeholder="Pincode"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Roll Number</label>
              <Input
                name="rollNumber"
                value={formData.rollNumber}
                onChange={onChange}
                placeholder="Roll number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Course <span className="text-destructive">*</span>
              </label>
              <select
                name="course"
                value={formData.course}
                onChange={onChange}
                className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${formErrors.course ? 'border-destructive' : ''}`}
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course._id || course.id} value={course._id || course.id}>
                    {course.name} ({course.batch})
                  </option>
                ))}
              </select>
              {formErrors.course && <p className="text-sm text-destructive mt-1">{formErrors.course}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Enrollment Date <span className="text-destructive">*</span>
              </label>
              <Input
                name="enrollmentDate"
                type="date"
                value={formData.enrollmentDate}
                onChange={onChange}
                className={formErrors.enrollmentDate ? 'border-destructive w-full' : 'w-full'}
              />
              {formErrors.enrollmentDate && <p className="text-sm text-destructive mt-1">{formErrors.enrollmentDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Enrollment Status</label>
              <select
                name="enrollmentStatus"
                value={formData.enrollmentStatus}
                onChange={onChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ENROLLMENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Graduation Date</label>
              <Input
                name="graduationDate"
                type="date"
                value={formData.graduationDate}
                onChange={onChange}
                className="w-full"
              />
            </div>

            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold mb-2">Guardian Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Guardian Name</label>
              <Input
                name="guardianInfo.name"
                value={formData.guardianInfo.name}
                onChange={onChange}
                placeholder="Guardian name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Relationship</label>
              <Input
                name="guardianInfo.relationship"
                value={formData.guardianInfo.relationship}
                onChange={onChange}
                placeholder="e.g., Father, Mother"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Guardian Phone</label>
              <Input
                name="guardianInfo.phone"
                value={formData.guardianInfo.phone}
                onChange={onChange}
                placeholder="Guardian phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Guardian Email</label>
              <Input
                name="guardianInfo.email"
                type="email"
                value={formData.guardianInfo.email}
                onChange={onChange}
                placeholder="Guardian email"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium mt-2">
              <input
                type="checkbox"
                name="isActive"
                checked={!!formData.isActive}
                onChange={onChange}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Create Student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

