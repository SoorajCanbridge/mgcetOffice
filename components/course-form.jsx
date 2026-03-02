'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

export default function CourseForm({
  formData,
  formErrors,
  levelLabels,
  levelValues,
  staff,
  editingCourse,
  saving,
  error,
  success,
  onChange,
  onSubmit,
  onCancel,
}) {
  // Filter Level B options based on selected Level A
  const filteredLevelBOptions = useMemo(() => {
    if (!formData.levelA) return [];
    return levelValues.B
      .filter((item) => item.parent === formData.levelA)
      .flatMap((item) => item.values);
  }, [formData.levelA, levelValues.B]);

  // Filter Level C options based on selected Level B
  const filteredLevelCOptions = useMemo(() => {
    if (!formData.levelB) return [];
    return levelValues.C
      .filter((item) => item.parent === formData.levelB)
      .flatMap((item) => item.values);
  }, [formData.levelB, levelValues.C]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editingCourse ? 'Edit Course' : 'New Course'}</h2>
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
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Batch <span className="text-destructive">*</span>
              </label>
              <Input
                name="batch"
                value={formData.batch}
                onChange={onChange}
                placeholder="e.g., 2024-2025"
                className={formErrors.batch ? 'border-destructive' : ''}
              />
              {formErrors.batch && <p className="text-sm text-destructive mt-1">{formErrors.batch}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={onChange}
                placeholder="Course name"
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && <p className="text-sm text-destructive mt-1">{formErrors.name}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={onChange}
                placeholder="Short description (optional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {levelLabels.A} <span className="text-destructive">*</span>
              </label>
              <select
                name="levelA"
                value={formData.levelA}
                onChange={onChange}
                className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${formErrors.levelA ? 'border-destructive' : ''}`}
              >
                <option value="">Select {levelLabels.A}</option>
                {levelValues.A.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {formErrors.levelA && <p className="text-sm text-destructive mt-1">{formErrors.levelA}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{levelLabels.B}</label>
              <select
                name="levelB"
                value={formData.levelB}
                onChange={onChange}
                disabled={!formData.levelA}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {formData.levelA ? `Select ${levelLabels.B} (Optional)` : `Select ${levelLabels.A} first`}
                </option>
                {filteredLevelBOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{levelLabels.C}</label>
              <select
                name="levelC"
                value={formData.levelC}
                onChange={onChange}
                disabled={!formData.levelB}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {formData.levelB ? `Select ${levelLabels.C} (Optional)` : `Select ${levelLabels.B} first`}
                </option>
                {filteredLevelCOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Academic Duration <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  name="academicDurationValue"
                  type="number"
                  value={formData.academicDuration.value}
                  onChange={onChange}
                  placeholder="Duration"
                  min="1"
                  className={formErrors.academicDuration ? 'border-destructive' : ''}
                />
                <select
                  name="academicDurationUnit"
                  value={formData.academicDuration.unit}
                  onChange={onChange}
                  className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${formErrors.academicDuration ? 'border-destructive' : ''}`}
                >
                  <option value="day">Day(s)</option>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </div>
              {formErrors.academicDuration && <p className="text-sm text-destructive mt-1">{formErrors.academicDuration}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date <span className="text-destructive">*</span>
              </label>
              <Input
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={onChange}
                className={formErrors.startDate ? 'border-destructive w-full' : 'w-full'}
              />
              {formErrors.startDate && <p className="text-sm text-destructive mt-1">{formErrors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Seat Limit</label>
              <Input
                name="seatLimit"
                type="number"
                value={formData.seatLimit}
                onChange={onChange}
                placeholder="Optional: Maximum number of seats"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tutor</label>
              <select
                name="tutor"
                value={formData.tutor}
                onChange={onChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select Tutor (Optional)</option>
                {Array.isArray(staff) && staff
                  .filter((staffMember) => staffMember.isActive !== false && staffMember.staffType === 'teaching')
                  .map((staffMember) => (
                    <option key={staffMember._id || staffMember.id} value={staffMember._id || staffMember.id}>
                      {staffMember.name} {staffMember.employeeId ? `(${staffMember.employeeId})` : ''}
                    </option>
                  ))}
              </select>
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
              {saving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

