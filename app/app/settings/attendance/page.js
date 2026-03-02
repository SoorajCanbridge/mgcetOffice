'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { Edit2, Save, X, Clock, MapPin, Calendar, Settings, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const formatTimeForInput = (time) => {
  if (!time) return '';
  try {
    if (typeof time === 'string' && time.includes('T')) {
      return time.split('T')[1]?.substring(0, 5) || '';
    }
    if (typeof time === 'string' && time.includes(':')) {
      return time.substring(0, 5);
    }
    return time;
  } catch {
    return '';
  }
};

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const ATTENDANCE_METHODS = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'biometric', label: 'Biometric' },
  { value: 'mobile-app', label: 'Mobile App' },
  { value: 'web-portal', label: 'Web Portal' },
  { value: 'rfid', label: 'RFID Card' },
  { value: 'face-recognition', label: 'Face Recognition' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'late', label: 'Late' },
  { value: 'early-leave', label: 'Early Leave' },
  { value: 'on-duty', label: 'On Duty' },
  { value: 'work-from-home', label: 'Work From Home' },
  { value: 'comp-off', label: 'Comp Off' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'conference', label: 'Conference' },
  { value: 'sabbatical', label: 'Sabbatical' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'medical-emergency', label: 'Medical Emergency' },
];

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'compensatory', label: 'Compensatory Leave' },
  { value: 'sabbatical', label: 'Sabbatical Leave' },
  { value: 'other', label: 'Other' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push Notification' },
  { value: 'in-app', label: 'In-App Notification' },
];

const REPORT_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AttendanceCriteriaSettingsPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('timeSettings');
  const [criteria, setCriteria] = useState(null);
  const [formData, setFormData] = useState({
    isActive: true,
    timeSettings: {
      expectedCheckIn: '09:00',
      expectedCheckOut: '17:00',
      workingHoursPerDay: 8,
      halfDayHours: 4,
      breakDuration: 60, // minutes
      breakStartTime: '13:00',
      breakEndTime: '14:00',
      flexibleTiming: false,
      flexibleCheckInWindow: 30, // minutes
    },
    toleranceSettings: {
      lateArrivalTolerance: 15, // minutes
      earlyDepartureTolerance: 15, // minutes
      autoMarkLateAfter: 30, // minutes
      autoMarkEarlyLeaveAfter: 30, // minutes
      requireApprovalForLate: true,
      requireApprovalForEarlyLeave: true,
      requireApprovalAfterMinutes: 30, // minutes
    },
    attendanceMethods: {
      allowedMethods: ['manual', 'mobile-app', 'web-portal'],
      primaryMethod: 'manual',
      requirePhotoVerification: false,
      requireLocationVerification: false,
      allowMultipleCheckIns: false,
      allowMultipleCheckOuts: false,
    },
    locationSettings: {
      enabled: false,
      checkInLocation: {
        latitude: null,
        longitude: null,
        address: '',
        radius: 100, // meters
      },
      checkOutLocation: {
        latitude: null,
        longitude: null,
        address: '',
        radius: 100, // meters
      },
      allowDifferentLocations: true,
      strictLocationCheck: false,
    },
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      allowWeekendAttendance: false,
      allowHolidayAttendance: false,
      customHolidays: [],
    },
    overtimeSettings: {
      enabled: true,
      standardHours: 8,
      overtimeThreshold: 8, // hours
      requireOvertimeApproval: true,
      overtimeRate: 1.5,
      allowOvertimeOnWeekends: true,
      allowOvertimeOnHolidays: true,
    },
    statusRules: {
      allowedStatuses: ['present', 'absent', 'half-day', 'leave', 'holiday', 'late', 'early-leave', 'work-from-home'],
      defaultStatus: 'present',
      autoStatusDetection: true,
      statusBasedWorkingHours: {
        present: 8,
        'half-day': 4,
        'work-from-home': 8,
        'on-duty': 8,
        training: 8,
        meeting: 8,
        conference: 8,
      },
    },
    leaveSettings: {
      allowedLeaveTypes: ['casual', 'sick', 'earned', 'unpaid', 'other'],
      requireLeaveApproval: true,
      allowHalfDayLeave: true,
      maxLeaveDaysPerMonth: 0, // 0 means unlimited
      maxLeaveDaysPerYear: 0, // 0 means unlimited
      leaveBalanceTracking: true,
    },
    approvalWorkflow: {
      enabled: true,
      autoApproveWithinTolerance: true,
      approvalHierarchy: [],
      requireMultipleApprovals: false,
      minApprovalsRequired: 1,
      allowSelfApproval: false,
      approvalTimeout: 24, // hours
    },
    regularizationSettings: {
      enabled: true,
      allowRegularization: true,
      maxRegularizationDays: 7, // days after attendance date
      requireRegularizationReason: true,
      requireRegularizationApproval: true,
    },
    notificationSettings: {
      notifyOnLateArrival: true,
      notifyOnEarlyLeave: true,
      notifyOnAbsence: true,
      notifyOnOvertime: true,
      notifyOnPendingApproval: true,
      notificationChannels: ['email', 'in-app'],
    },
    advancedSettings: {
      allowBackdateEntry: true,
      maxBackdateDays: 7,
      allowFutureDateEntry: false,
      maxFutureDateDays: 0,
      requireRemarksForAbsence: false,
      requireRemarksForLeave: true,
      trackIPAddress: false,
      trackDeviceInfo: false,
      enableAttendanceReports: true,
      attendanceReportFrequency: 'monthly',
    },
  });

  useEffect(() => {
    if (user?.college) {
      fetchAttendanceCriteria();
    }
  }, [user?.college]);

  const fetchAttendanceCriteria = async () => {
    try {
      setFetching(true);
      setError('');
      
      const response = await api.get(`/attendance-criteria/college`, {}, true);
      const data = response?.data || response;
      
      if (data) {
        setCriteria(data.data);
        // Merge with defaults
        setFormData((prev) => ({
          ...prev,
          isActive: data.isActive !== undefined ? data.isActive : prev.isActive,
          timeSettings: { ...prev.timeSettings, ...(data.timeSettings || {}) },
          toleranceSettings: { ...prev.toleranceSettings, ...(data.toleranceSettings || {}) },
          attendanceMethods: { ...prev.attendanceMethods, ...(data.attendanceMethods || {}) },
          locationSettings: { ...prev.locationSettings, ...(data.locationSettings || {}) },
          workingDays: { ...prev.workingDays, ...(data.workingDays || {}) },
          overtimeSettings: { ...prev.overtimeSettings, ...(data.overtimeSettings || {}) },
          statusRules: { ...prev.statusRules, ...(data.statusRules || {}) },
          leaveSettings: { ...prev.leaveSettings, ...(data.leaveSettings || {}) },
          approvalWorkflow: { ...prev.approvalWorkflow, ...(data.approvalWorkflow || {}) },
          regularizationSettings: { ...prev.regularizationSettings, ...(data.regularizationSettings || {}) },
          notificationSettings: { ...prev.notificationSettings, ...(data.notificationSettings || {}) },
          advancedSettings: { ...prev.advancedSettings, ...(data.advancedSettings || {}) },
        }));
      } else {
        // No criteria exists, use defaults
        setCriteria(null);
      }
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('not found')) {
        setError('');
        setCriteria(null);
      } else {
        setError(err.message || 'Failed to fetch attendance criteria');
      }
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setError('');
  };

  const handleNestedChange = (section, parentField, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentField]: {
          ...(prev[section][parentField] || {}),
          [field]: value,
        },
      },
    }));
    setError('');
  };

  const handleArrayToggle = (section, field, value) => {
    setFormData((prev) => {
      const currentArray = prev[section][field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray,
        },
      };
    });
    setError('');
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    fetchAttendanceCriteria();
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        // Format time strings properly
        timeSettings: {
          ...formData.timeSettings,
          expectedCheckIn: formatTimeForInput(formData.timeSettings.expectedCheckIn),
          expectedCheckOut: formatTimeForInput(formData.timeSettings.expectedCheckOut),
          breakStartTime: formatTimeForInput(formData.timeSettings.breakStartTime),
          breakEndTime: formatTimeForInput(formData.timeSettings.breakEndTime),
        },
      };

      const response = await api.post(
        `/attendance-criteria/college`,
        payload,
        {},
        true
      );

      const updatedData = response?.data || response;
      setCriteria(updatedData);
      setIsEditing(false);
      setSuccess('Attendance criteria saved successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save attendance criteria');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (section) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.patch(
        `/attendance-criteria/college/${user.college}/section`,
        {
          section,
          data: formData[section],
        },
        {},
        true
      );

      const updatedData = response?.data || response;
      setCriteria(updatedData);
      setSuccess(`${section} updated successfully!`);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || `Failed to update ${section}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefaults = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(
        `/attendance-criteria/college/${user.college}/default`,
        {},
        true
      );
      const data = response?.data || response;
      if (data) {
        setCriteria(data);
        setFormData((prev) => ({
          ...prev,
          isActive: data.isActive !== undefined ? data.isActive : prev.isActive,
          timeSettings: { ...prev.timeSettings, ...(data.timeSettings || {}) },
          toleranceSettings: { ...prev.toleranceSettings, ...(data.toleranceSettings || {}) },
          attendanceMethods: { ...prev.attendanceMethods, ...(data.attendanceMethods || {}) },
          locationSettings: { ...prev.locationSettings, ...(data.locationSettings || {}) },
          workingDays: { ...prev.workingDays, ...(data.workingDays || {}) },
          overtimeSettings: { ...prev.overtimeSettings, ...(data.overtimeSettings || {}) },
          statusRules: { ...prev.statusRules, ...(data.statusRules || {}) },
          leaveSettings: { ...prev.leaveSettings, ...(data.leaveSettings || {}) },
          approvalWorkflow: { ...prev.approvalWorkflow, ...(data.approvalWorkflow || {}) },
          regularizationSettings: { ...prev.regularizationSettings, ...(data.regularizationSettings || {}) },
          notificationSettings: { ...prev.notificationSettings, ...(data.notificationSettings || {}) },
          advancedSettings: { ...prev.advancedSettings, ...(data.advancedSettings || {}) },
        }));
        setSuccess('Default criteria loaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to load default criteria');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'timeSettings', label: 'Time Settings', icon: Clock },
    { id: 'toleranceSettings', label: 'Tolerance Settings', icon: AlertCircle },
    { id: 'attendanceMethods', label: 'Attendance Methods', icon: CheckCircle2 },
    { id: 'locationSettings', label: 'Location Settings', icon: MapPin },
    { id: 'workingDays', label: 'Working Days', icon: Calendar },
    { id: 'overtimeSettings', label: 'Overtime Settings', icon: Clock },
    { id: 'statusRules', label: 'Status Rules', icon: Settings },
    { id: 'leaveSettings', label: 'Leave Settings', icon: Calendar },
    { id: 'approvalWorkflow', label: 'Approval Workflow', icon: CheckCircle2 },
    { id: 'regularizationSettings', label: 'Regularization Settings', icon: Settings },
    { id: 'notificationSettings', label: 'Notification Settings', icon: Bell },
    { id: 'advancedSettings', label: 'Advanced Settings', icon: Settings },
  ];

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance criteria...</p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    const section = formData[activeSection];
    if (!section) return null;

    switch (activeSection) {
      case 'timeSettings':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Expected Check-In Time
              </label>
              {isEditing ? (
                <Input
                  type="time"
                  value={formatTimeForInput(section.expectedCheckIn)}
                  onChange={(e) => handleChange('timeSettings', 'expectedCheckIn', e.target.value)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formatTimeForInput(section.expectedCheckIn) || 'Not set'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Expected Check-Out Time
              </label>
              {isEditing ? (
                <Input
                  type="time"
                  value={formatTimeForInput(section.expectedCheckOut)}
                  onChange={(e) => handleChange('timeSettings', 'expectedCheckOut', e.target.value)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {formatTimeForInput(section.expectedCheckOut) || 'Not set'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Working Hours Per Day
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={section.workingHoursPerDay || ''}
                  onChange={(e) => handleChange('timeSettings', 'workingHoursPerDay', parseFloat(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.workingHoursPerDay || 0} hours
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Half Day Hours
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={section.halfDayHours || ''}
                  onChange={(e) => handleChange('timeSettings', 'halfDayHours', parseFloat(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.halfDayHours || 0} hours
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Break Duration (minutes)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  max="480"
                  value={section.breakDuration || ''}
                  onChange={(e) => handleChange('timeSettings', 'breakDuration', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.breakDuration || 0} minutes
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Break Start Time
                </label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={formatTimeForInput(section.breakStartTime)}
                    onChange={(e) => handleChange('timeSettings', 'breakStartTime', e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {formatTimeForInput(section.breakStartTime) || 'Not set'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Break End Time
                </label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={formatTimeForInput(section.breakEndTime)}
                    onChange={(e) => handleChange('timeSettings', 'breakEndTime', e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {formatTimeForInput(section.breakEndTime) || 'Not set'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="flexibleTiming"
                checked={section.flexibleTiming || false}
                onCheckedChange={(checked) => handleChange('timeSettings', 'flexibleTiming', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="flexibleTiming" className="text-sm font-medium">
                Allow Flexible Timing
              </label>
            </div>
            {section.flexibleTiming && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Flexible Check-In Window (minutes)
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    value={section.flexibleCheckInWindow || ''}
                    onChange={(e) => handleChange('timeSettings', 'flexibleCheckInWindow', parseInt(e.target.value) || 0)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {section.flexibleCheckInWindow || 0} minutes
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'toleranceSettings':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Late Arrival Tolerance (minutes)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.lateArrivalTolerance || ''}
                  onChange={(e) => handleChange('toleranceSettings', 'lateArrivalTolerance', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.lateArrivalTolerance || 0} minutes
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Early Departure Tolerance (minutes)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.earlyDepartureTolerance || ''}
                  onChange={(e) => handleChange('toleranceSettings', 'earlyDepartureTolerance', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.earlyDepartureTolerance || 0} minutes
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Auto Mark Late After (minutes)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.autoMarkLateAfter || ''}
                  onChange={(e) => handleChange('toleranceSettings', 'autoMarkLateAfter', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.autoMarkLateAfter || 0} minutes
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Auto Mark Early Leave After (minutes)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.autoMarkEarlyLeaveAfter || ''}
                  onChange={(e) => handleChange('toleranceSettings', 'autoMarkEarlyLeaveAfter', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.autoMarkEarlyLeaveAfter || 0} minutes
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireApprovalForLate"
                checked={section.requireApprovalForLate || false}
                onCheckedChange={(checked) => handleChange('toleranceSettings', 'requireApprovalForLate', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requireApprovalForLate" className="text-sm font-medium">
                Require Approval for Late Arrival
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireApprovalForEarlyLeave"
                checked={section.requireApprovalForEarlyLeave || false}
                onCheckedChange={(checked) => handleChange('toleranceSettings', 'requireApprovalForEarlyLeave', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requireApprovalForEarlyLeave" className="text-sm font-medium">
                Require Approval for Early Leave
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Require Approval After (minutes)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.requireApprovalAfterMinutes || ''}
                  onChange={(e) => handleChange('toleranceSettings', 'requireApprovalAfterMinutes', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.requireApprovalAfterMinutes || 0} minutes
                </p>
              )}
            </div>
          </div>
        );

      case 'attendanceMethods':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Method
              </label>
              {isEditing ? (
                <Select
                  value={section.primaryMethod || 'manual'}
                  onValueChange={(value) => handleChange('attendanceMethods', 'primaryMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTENDANCE_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {ATTENDANCE_METHODS.find((m) => m.value === section.primaryMethod)?.label || 'Not set'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 mb-3">
                Allowed Methods
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  {ATTENDANCE_METHODS.map((method) => (
                    <div key={method.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`method-${method.value}`}
                        checked={(section.allowedMethods || []).includes(method.value)}
                        onCheckedChange={() => handleArrayToggle('attendanceMethods', 'allowedMethods', method.value)}
                      />
                      <label htmlFor={`method-${method.value}`} className="text-sm">
                        {method.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {(section.allowedMethods || []).map((m) => ATTENDANCE_METHODS.find((method) => method.value === m)?.label).filter(Boolean).join(', ') || 'Not set'}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requirePhotoVerification"
                checked={section.requirePhotoVerification || false}
                onCheckedChange={(checked) => handleChange('attendanceMethods', 'requirePhotoVerification', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requirePhotoVerification" className="text-sm font-medium">
                Require Photo Verification
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireLocationVerification"
                checked={section.requireLocationVerification || false}
                onCheckedChange={(checked) => handleChange('attendanceMethods', 'requireLocationVerification', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requireLocationVerification" className="text-sm font-medium">
                Require Location Verification
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowMultipleCheckIns"
                checked={section.allowMultipleCheckIns || false}
                onCheckedChange={(checked) => handleChange('attendanceMethods', 'allowMultipleCheckIns', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="allowMultipleCheckIns" className="text-sm font-medium">
                Allow Multiple Check-Ins
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowMultipleCheckOuts"
                checked={section.allowMultipleCheckOuts || false}
                onCheckedChange={(checked) => handleChange('attendanceMethods', 'allowMultipleCheckOuts', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="allowMultipleCheckOuts" className="text-sm font-medium">
                Allow Multiple Check-Outs
              </label>
            </div>
          </div>
        );

      case 'locationSettings':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="locationEnabled"
                checked={section.enabled || false}
                onCheckedChange={(checked) => handleChange('locationSettings', 'enabled', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="locationEnabled" className="text-sm font-medium">
                Enable Location Settings (Geofencing)
              </label>
            </div>
            {section.enabled && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Check-In Location</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Latitude</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          value={section.checkInLocation?.latitude || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkInLocation', 'latitude', parseFloat(e.target.value) || null)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkInLocation?.latitude || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Longitude</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          value={section.checkInLocation?.longitude || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkInLocation', 'longitude', parseFloat(e.target.value) || null)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkInLocation?.longitude || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Address</label>
                      {isEditing ? (
                        <Input
                          type="text"
                          value={section.checkInLocation?.address || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkInLocation', 'address', e.target.value)}
                          placeholder="Enter address"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkInLocation?.address || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Radius (meters)</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="10"
                          value={section.checkInLocation?.radius || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkInLocation', 'radius', parseInt(e.target.value) || 0)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkInLocation?.radius || 0} meters
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Check-Out Location</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Latitude</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          value={section.checkOutLocation?.latitude || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkOutLocation', 'latitude', parseFloat(e.target.value) || null)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkOutLocation?.latitude || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Longitude</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          value={section.checkOutLocation?.longitude || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkOutLocation', 'longitude', parseFloat(e.target.value) || null)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkOutLocation?.longitude || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Address</label>
                      {isEditing ? (
                        <Input
                          type="text"
                          value={section.checkOutLocation?.address || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkOutLocation', 'address', e.target.value)}
                          placeholder="Enter address"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkOutLocation?.address || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Radius (meters)</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="10"
                          value={section.checkOutLocation?.radius || ''}
                          onChange={(e) => handleNestedChange('locationSettings', 'checkOutLocation', 'radius', parseInt(e.target.value) || 0)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                          {section.checkOutLocation?.radius || 0} meters
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowDifferentLocations"
                      checked={section.allowDifferentLocations !== undefined ? section.allowDifferentLocations : true}
                      onCheckedChange={(checked) => handleChange('locationSettings', 'allowDifferentLocations', checked)}
                      disabled={!isEditing}
                    />
                    <label htmlFor="allowDifferentLocations" className="text-sm font-medium">
                      Allow Different Check-In and Check-Out Locations
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="strictLocationCheck"
                      checked={section.strictLocationCheck || false}
                      onCheckedChange={(checked) => handleChange('locationSettings', 'strictLocationCheck', checked)}
                      disabled={!isEditing}
                    />
                    <label htmlFor="strictLocationCheck" className="text-sm font-medium">
                      Strict Location Check
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'workingDays':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">Working Days</label>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={section[day.value] || false}
                    onCheckedChange={(checked) => handleChange('workingDays', day.value, checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor={`day-${day.value}`} className="text-sm font-medium">
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowWeekendAttendance"
                  checked={section.allowWeekendAttendance || false}
                  onCheckedChange={(checked) => handleChange('workingDays', 'allowWeekendAttendance', checked)}
                  disabled={!isEditing}
                />
                <label htmlFor="allowWeekendAttendance" className="text-sm font-medium">
                  Allow Weekend Attendance
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowHolidayAttendance"
                  checked={section.allowHolidayAttendance || false}
                  onCheckedChange={(checked) => handleChange('workingDays', 'allowHolidayAttendance', checked)}
                  disabled={!isEditing}
                />
                <label htmlFor="allowHolidayAttendance" className="text-sm font-medium">
                  Allow Holiday Attendance
                </label>
              </div>
            </div>
            {isEditing && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2">Custom Holidays</label>
                <p className="text-sm text-muted-foreground mb-2">
                  Custom holidays management will be available in a future update.
                </p>
              </div>
            )}
          </div>
        );

      case 'overtimeSettings':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overtimeEnabled"
                checked={section.enabled !== undefined ? section.enabled : true}
                onCheckedChange={(checked) => handleChange('overtimeSettings', 'enabled', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="overtimeEnabled" className="text-sm font-medium">
                Enable Overtime Tracking
              </label>
            </div>
            {section.enabled !== false && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Standard Hours
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={section.standardHours || ''}
                      onChange={(e) => handleChange('overtimeSettings', 'standardHours', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                      {section.standardHours || 0} hours
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Overtime Threshold (hours)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={section.overtimeThreshold || ''}
                      onChange={(e) => handleChange('overtimeSettings', 'overtimeThreshold', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                      {section.overtimeThreshold || 0} hours
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Overtime Rate (multiplier)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={section.overtimeRate || ''}
                      onChange={(e) => handleChange('overtimeSettings', 'overtimeRate', parseFloat(e.target.value) || 1)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                      {section.overtimeRate || 1}x
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireOvertimeApproval"
                    checked={section.requireOvertimeApproval !== undefined ? section.requireOvertimeApproval : true}
                    onCheckedChange={(checked) => handleChange('overtimeSettings', 'requireOvertimeApproval', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="requireOvertimeApproval" className="text-sm font-medium">
                    Require Approval for Overtime
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowOvertimeOnWeekends"
                    checked={section.allowOvertimeOnWeekends !== undefined ? section.allowOvertimeOnWeekends : true}
                    onCheckedChange={(checked) => handleChange('overtimeSettings', 'allowOvertimeOnWeekends', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="allowOvertimeOnWeekends" className="text-sm font-medium">
                    Allow Overtime on Weekends
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowOvertimeOnHolidays"
                    checked={section.allowOvertimeOnHolidays !== undefined ? section.allowOvertimeOnHolidays : true}
                    onCheckedChange={(checked) => handleChange('overtimeSettings', 'allowOvertimeOnHolidays', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="allowOvertimeOnHolidays" className="text-sm font-medium">
                    Allow Overtime on Holidays
                  </label>
                </div>
              </>
            )}
          </div>
        );

      case 'statusRules':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Default Status
              </label>
              {isEditing ? (
                <Select
                  value={section.defaultStatus || 'present'}
                  onValueChange={(value) => handleChange('statusRules', 'defaultStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {STATUS_OPTIONS.find((s) => s.value === section.defaultStatus)?.label || 'Not set'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 mb-3">
                Allowed Statuses
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={(section.allowedStatuses || []).includes(status.value)}
                        onCheckedChange={() => handleArrayToggle('statusRules', 'allowedStatuses', status.value)}
                      />
                      <label htmlFor={`status-${status.value}`} className="text-sm">
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {(section.allowedStatuses || []).map((s) => STATUS_OPTIONS.find((status) => status.value === s)?.label).filter(Boolean).join(', ') || 'Not set'}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoStatusDetection"
                checked={section.autoStatusDetection !== undefined ? section.autoStatusDetection : true}
                onCheckedChange={(checked) => handleChange('statusRules', 'autoStatusDetection', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="autoStatusDetection" className="text-sm font-medium">
                Auto Status Detection
              </label>
            </div>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-3">
                Status-Based Working Hours
              </label>
              {isEditing ? (
                <div className="space-y-3">
                  {['present', 'half-day', 'work-from-home', 'on-duty', 'training', 'meeting', 'conference'].map((statusKey) => (
                    <div key={statusKey}>
                      <label className="block text-sm font-medium mb-1">
                        {STATUS_OPTIONS.find((s) => s.value === statusKey)?.label || statusKey} (hours)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={section.statusBasedWorkingHours?.[statusKey] || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            statusRules: {
                              ...prev.statusRules,
                              statusBasedWorkingHours: {
                                ...(prev.statusRules.statusBasedWorkingHours || {}),
                                [statusKey]: parseFloat(e.target.value) || 0,
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(section.statusBasedWorkingHours || {}).map(([key, value]) => (
                    <p key={key} className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                      {STATUS_OPTIONS.find((s) => s.value === key)?.label || key}: {value} hours
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'leaveSettings':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 mb-3">
                Allowed Leave Types
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  {LEAVE_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`leave-${type.value}`}
                        checked={(section.allowedLeaveTypes || []).includes(type.value)}
                        onCheckedChange={() => handleArrayToggle('leaveSettings', 'allowedLeaveTypes', type.value)}
                      />
                      <label htmlFor={`leave-${type.value}`} className="text-sm">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {(section.allowedLeaveTypes || []).map((t) => LEAVE_TYPES.find((type) => type.value === t)?.label).filter(Boolean).join(', ') || 'Not set'}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireLeaveApproval"
                checked={section.requireLeaveApproval !== undefined ? section.requireLeaveApproval : true}
                onCheckedChange={(checked) => handleChange('leaveSettings', 'requireLeaveApproval', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requireLeaveApproval" className="text-sm font-medium">
                Require Approval for Leave
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowHalfDayLeave"
                checked={section.allowHalfDayLeave !== undefined ? section.allowHalfDayLeave : true}
                onCheckedChange={(checked) => handleChange('leaveSettings', 'allowHalfDayLeave', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="allowHalfDayLeave" className="text-sm font-medium">
                Allow Half Day Leave
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Leave Days Per Month (0 = unlimited)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.maxLeaveDaysPerMonth !== undefined ? section.maxLeaveDaysPerMonth : ''}
                  onChange={(e) => handleChange('leaveSettings', 'maxLeaveDaysPerMonth', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.maxLeaveDaysPerMonth === 0 ? 'Unlimited' : (section.maxLeaveDaysPerMonth || 0)} days
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Leave Days Per Year (0 = unlimited)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={section.maxLeaveDaysPerYear !== undefined ? section.maxLeaveDaysPerYear : ''}
                  onChange={(e) => handleChange('leaveSettings', 'maxLeaveDaysPerYear', parseInt(e.target.value) || 0)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {section.maxLeaveDaysPerYear === 0 ? 'Unlimited' : (section.maxLeaveDaysPerYear || 0)} days
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="leaveBalanceTracking"
                checked={section.leaveBalanceTracking !== undefined ? section.leaveBalanceTracking : true}
                onCheckedChange={(checked) => handleChange('leaveSettings', 'leaveBalanceTracking', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="leaveBalanceTracking" className="text-sm font-medium">
                Enable Leave Balance Tracking
              </label>
            </div>
          </div>
        );

      case 'approvalWorkflow':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approvalEnabled"
                checked={section.enabled !== undefined ? section.enabled : true}
                onCheckedChange={(checked) => handleChange('approvalWorkflow', 'enabled', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="approvalEnabled" className="text-sm font-medium">
                Enable Approval Workflow
              </label>
            </div>
            {section.enabled !== false && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoApproveWithinTolerance"
                    checked={section.autoApproveWithinTolerance !== undefined ? section.autoApproveWithinTolerance : true}
                    onCheckedChange={(checked) => handleChange('approvalWorkflow', 'autoApproveWithinTolerance', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="autoApproveWithinTolerance" className="text-sm font-medium">
                    Auto Approve Within Tolerance
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireMultipleApprovals"
                    checked={section.requireMultipleApprovals || false}
                    onCheckedChange={(checked) => handleChange('approvalWorkflow', 'requireMultipleApprovals', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="requireMultipleApprovals" className="text-sm font-medium">
                    Require Multiple Approvals
                  </label>
                </div>
                {section.requireMultipleApprovals && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Minimum Approvals Required
                    </label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        value={section.minApprovalsRequired || ''}
                        onChange={(e) => handleChange('approvalWorkflow', 'minApprovalsRequired', parseInt(e.target.value) || 1)}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                        {section.minApprovalsRequired || 1} approval(s)
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowSelfApproval"
                    checked={section.allowSelfApproval || false}
                    onCheckedChange={(checked) => handleChange('approvalWorkflow', 'allowSelfApproval', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="allowSelfApproval" className="text-sm font-medium">
                    Allow Self Approval
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Approval Timeout (hours)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="1"
                      value={section.approvalTimeout || ''}
                      onChange={(e) => handleChange('approvalWorkflow', 'approvalTimeout', parseInt(e.target.value) || 24)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                      {section.approvalTimeout || 24} hours
                    </p>
                  )}
                </div>
                {isEditing && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-2">
                      Approval Hierarchy
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Approval hierarchy management will be available in a future update.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'regularizationSettings':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="regularizationEnabled"
                checked={section.enabled !== undefined ? section.enabled : true}
                onCheckedChange={(checked) => handleChange('regularizationSettings', 'enabled', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="regularizationEnabled" className="text-sm font-medium">
                Enable Regularization
              </label>
            </div>
            {section.enabled !== false && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowRegularization"
                    checked={section.allowRegularization !== undefined ? section.allowRegularization : true}
                    onCheckedChange={(checked) => handleChange('regularizationSettings', 'allowRegularization', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="allowRegularization" className="text-sm font-medium">
                    Allow Regularization
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Regularization Days (days after attendance date)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      value={section.maxRegularizationDays || ''}
                      onChange={(e) => handleChange('regularizationSettings', 'maxRegularizationDays', parseInt(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                      {section.maxRegularizationDays || 0} days
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireRegularizationReason"
                    checked={section.requireRegularizationReason !== undefined ? section.requireRegularizationReason : true}
                    onCheckedChange={(checked) => handleChange('regularizationSettings', 'requireRegularizationReason', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="requireRegularizationReason" className="text-sm font-medium">
                    Require Reason for Regularization
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireRegularizationApproval"
                    checked={section.requireRegularizationApproval !== undefined ? section.requireRegularizationApproval : true}
                    onCheckedChange={(checked) => handleChange('regularizationSettings', 'requireRegularizationApproval', checked)}
                    disabled={!isEditing}
                  />
                  <label htmlFor="requireRegularizationApproval" className="text-sm font-medium">
                    Require Approval for Regularization
                  </label>
                </div>
              </>
            )}
          </div>
        );

      case 'notificationSettings':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyOnLateArrival"
                checked={section.notifyOnLateArrival !== undefined ? section.notifyOnLateArrival : true}
                onCheckedChange={(checked) => handleChange('notificationSettings', 'notifyOnLateArrival', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="notifyOnLateArrival" className="text-sm font-medium">
                Notify on Late Arrival
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyOnEarlyLeave"
                checked={section.notifyOnEarlyLeave !== undefined ? section.notifyOnEarlyLeave : true}
                onCheckedChange={(checked) => handleChange('notificationSettings', 'notifyOnEarlyLeave', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="notifyOnEarlyLeave" className="text-sm font-medium">
                Notify on Early Leave
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyOnAbsence"
                checked={section.notifyOnAbsence !== undefined ? section.notifyOnAbsence : true}
                onCheckedChange={(checked) => handleChange('notificationSettings', 'notifyOnAbsence', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="notifyOnAbsence" className="text-sm font-medium">
                Notify on Absence
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyOnOvertime"
                checked={section.notifyOnOvertime !== undefined ? section.notifyOnOvertime : true}
                onCheckedChange={(checked) => handleChange('notificationSettings', 'notifyOnOvertime', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="notifyOnOvertime" className="text-sm font-medium">
                Notify on Overtime
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyOnPendingApproval"
                checked={section.notifyOnPendingApproval !== undefined ? section.notifyOnPendingApproval : true}
                onCheckedChange={(checked) => handleChange('notificationSettings', 'notifyOnPendingApproval', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="notifyOnPendingApproval" className="text-sm font-medium">
                Notify on Pending Approval
              </label>
            </div>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2 mb-3">
                Notification Channels
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <div key={channel.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`channel-${channel.value}`}
                        checked={(section.notificationChannels || []).includes(channel.value)}
                        onCheckedChange={() => handleArrayToggle('notificationSettings', 'notificationChannels', channel.value)}
                      />
                      <label htmlFor={`channel-${channel.value}`} className="text-sm">
                        {channel.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {(section.notificationChannels || []).map((c) => NOTIFICATION_CHANNELS.find((channel) => channel.value === c)?.label).filter(Boolean).join(', ') || 'Not set'}
                </p>
              )}
            </div>
          </div>
        );

      case 'advancedSettings':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowBackdateEntry"
                checked={section.allowBackdateEntry !== undefined ? section.allowBackdateEntry : true}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'allowBackdateEntry', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="allowBackdateEntry" className="text-sm font-medium">
                Allow Backdate Entry
              </label>
            </div>
            {section.allowBackdateEntry && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Maximum Backdate Days
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    value={section.maxBackdateDays || ''}
                    onChange={(e) => handleChange('advancedSettings', 'maxBackdateDays', parseInt(e.target.value) || 0)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {section.maxBackdateDays || 0} days
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowFutureDateEntry"
                checked={section.allowFutureDateEntry || false}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'allowFutureDateEntry', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="allowFutureDateEntry" className="text-sm font-medium">
                Allow Future Date Entry
              </label>
            </div>
            {section.allowFutureDateEntry && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Maximum Future Date Days
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    value={section.maxFutureDateDays || ''}
                    onChange={(e) => handleChange('advancedSettings', 'maxFutureDateDays', parseInt(e.target.value) || 0)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {section.maxFutureDateDays || 0} days
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireRemarksForAbsence"
                checked={section.requireRemarksForAbsence || false}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'requireRemarksForAbsence', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requireRemarksForAbsence" className="text-sm font-medium">
                Require Remarks for Absence
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireRemarksForLeave"
                checked={section.requireRemarksForLeave !== undefined ? section.requireRemarksForLeave : true}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'requireRemarksForLeave', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="requireRemarksForLeave" className="text-sm font-medium">
                Require Remarks for Leave
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trackIPAddress"
                checked={section.trackIPAddress || false}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'trackIPAddress', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="trackIPAddress" className="text-sm font-medium">
                Track IP Address
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trackDeviceInfo"
                checked={section.trackDeviceInfo || false}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'trackDeviceInfo', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="trackDeviceInfo" className="text-sm font-medium">
                Track Device Information
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableAttendanceReports"
                checked={section.enableAttendanceReports !== undefined ? section.enableAttendanceReports : true}
                onCheckedChange={(checked) => handleChange('advancedSettings', 'enableAttendanceReports', checked)}
                disabled={!isEditing}
              />
              <label htmlFor="enableAttendanceReports" className="text-sm font-medium">
                Enable Attendance Reports
              </label>
            </div>
            {section.enableAttendanceReports && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Attendance Report Frequency
                </label>
                {isEditing ? (
                  <Select
                    value={section.attendanceReportFrequency || 'monthly'}
                    onValueChange={(value) => handleChange('advancedSettings', 'attendanceReportFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {REPORT_FREQUENCIES.find((f) => f.value === section.attendanceReportFrequency)?.label || 'Not set'}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Attendance Criteria Settings</h1>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button onClick={handleLoadDefaults} variant="outline" className="gap-2">
                  Load Defaults
                </Button>
                <Button onClick={handleEdit} variant="outline" className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  Edit Settings
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          Configure attendance rules, timings, and validation criteria for your institution.
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-4 sticky top-4">
            <h3 className="font-semibold mb-3">Sections</h3>
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {sections.find((s) => s.id === activeSection)?.label || 'Settings'}
              </h2>
              {isEditing && (
                <Button
                  onClick={() => handleSaveSection(activeSection)}
                  size="sm"
                  variant="outline"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Section
                </Button>
              )}
            </div>
            {renderSection()}
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 mt-6">
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
              <Button onClick={handleSave} disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save All Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

