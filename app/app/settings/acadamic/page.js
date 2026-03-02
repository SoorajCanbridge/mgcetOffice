'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GraduationCap, Edit2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_LEVEL_NAMES = {
  A: 'Level A',
  B: 'Level B',
  C: 'Level C',
};

const DEFAULT_LEVEL_VALUES = {
  A: [],
  B: [],
  C: [],
};

const DEFAULT_LEVEL_INPUTS = {
  A: '',
  B: { parent: '', value: '' },
  C: { parent: '', value: '' },
};

const normalizeLevelNames = (levelNames) => ({
  ...DEFAULT_LEVEL_NAMES,
  ...(levelNames || {}),
});

const normalizeLevelValues = (levelValues) => {
  const normalizeLeafArray = (value) => {
    if (Array.isArray(value)) {
      return value.map((v) => `${v}`.trim()).filter(Boolean);
    }
    if (value === undefined || value === null) return [];
    const single = `${value}`.trim();
    return single ? [single] : [];
  };

  const normalizeNested = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const parent = `${item?.parent || ''}`.trim();
        const values = normalizeLeafArray(item?.values);
        if (!parent) return null;
        return { parent, values };
      })
      .filter(Boolean);
  };

  return {
    A: normalizeLeafArray(levelValues?.A),
    B: normalizeNested(levelValues?.B),
    C: normalizeNested(levelValues?.C),
  };
};

export default function AcademicSettingsPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [levelNames, setLevelNames] = useState({});
  const [levelValues, setLevelValues] = useState(DEFAULT_LEVEL_VALUES);
  const [originalLevelNames, setOriginalLevelNames] = useState(DEFAULT_LEVEL_NAMES);
  const [originalLevelValues, setOriginalLevelValues] = useState(DEFAULT_LEVEL_VALUES);
  const [levelValueInputs, setLevelValueInputs] = useState(DEFAULT_LEVEL_INPUTS);
  const [errors, setErrors] = useState({});

  useEffect(() => { 
    fetchAcademicConfig();
  }, [user?.college]);

  const fetchAcademicConfig = async () => {
    try {
      setFetching(true);
      setError('');

      const response = await api.get(`/academic/config/${user.college}`);
      const config = response?.data || response || {};
      const normalized = normalizeLevelNames(config.levelNames);
      const normalizedValues = normalizeLevelValues(config.levelValues);

      setLevelNames(normalized);
      setLevelValues(normalizedValues);
      setOriginalLevelNames(normalized);
      setOriginalLevelValues(normalizedValues);
      setLevelValueInputs(DEFAULT_LEVEL_INPUTS);
    } catch (err) {
      setError(err.message || 'Failed to load academic configuration');
    } finally {
      setFetching(false);
    }
  };

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    setLevelNames((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setError('');
  };

  const handleValueInputChange = (level, field, value) => {
    setLevelValueInputs((prev) => ({
      ...prev,
      [level]: field
        ? {
            ...prev[level],
            [field]: value,
          }
        : value,
    }));
    if (errors[`value-${level}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`value-${level}`];
        return next;
      });
    }
    setError('');
  };

  const addLevelAValue = () => {
    const next = `${levelValueInputs.A || ''}`.trim();
    if (!next) return;
    setLevelValues((prev) => {
      if (prev.A.includes(next)) return prev;
      return { ...prev, A: [...prev.A, next] };
    });
    setLevelValueInputs((prev) => ({ ...prev, A: '' }));
  };

  const addNestedValue = (level) => {
    const parent = `${levelValueInputs[level].parent || ''}`.trim();
    const value = `${levelValueInputs[level].value || ''}`.trim();
    if (!parent || !value) return;

    setLevelValues((prev) => {
      const existingEntries = prev[level] || [];
      const idx = existingEntries.findIndex((item) => item.parent === parent);
      if (idx === -1) {
        return {
          ...prev,
          [level]: [...existingEntries, { parent, values: [value] }],
        };
      }

      const entry = existingEntries[idx];
      if (entry.values.includes(value)) return prev;

      const updatedEntry = { ...entry, values: [...entry.values, value] };
      const nextEntries = [...existingEntries];
      nextEntries[idx] = updatedEntry;
      return { ...prev, [level]: nextEntries };
    });

    setLevelValueInputs((prev) => ({
      ...prev,
      [level]: { parent, value: '' },
    }));
  };

  const removeLevelAValue = (value) => {
    setLevelValues((prev) => ({
      ...prev,
      A: prev.A.filter((v) => v !== value),
      B: (prev.B || []).filter((item) => item.parent !== value),
      C: (prev.C || []).filter((item) => item.parent !== value),
    }));
  };

  const removeNestedValue = (level, parent, value) => {
    setLevelValues((prev) => {
      const entries = prev[level] || [];
      const nextEntries = entries
        .map((entry) => {
          if (entry.parent !== parent) return entry;
          const filteredValues = entry.values.filter((v) => v !== value);
          if (!filteredValues.length) return null;
          return { ...entry, values: filteredValues };
        })
        .filter(Boolean);

      // If removing a parent entry removes options for deeper levels, clean them.
      if (level === 'B') {
        const remainingBValues = nextEntries.flatMap((item) => item.values);
        return {
          ...prev,
          B: nextEntries,
          C: (prev.C || []).filter((item) => remainingBValues.includes(item.parent)),
        };
      }

      if (level === 'C') {
        return { ...prev, C: nextEntries };
      }

      return { ...prev, [level]: nextEntries };
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    ['A', 'B', 'C'].forEach((key) => {
      if (!levelNames[key]?.trim()) {
        nextErrors[key] = 'Name is required';
      }
    });

    if (!(levelValues.A || []).length) {
      nextErrors['value-A'] = 'At least one Level A value is required';
    }

    const levelBParents = new Set(levelValues.A || []);
    const hasInvalidBParent = (levelValues.B || []).some((entry) => !entry.parent || !levelBParents.has(entry.parent));
    const hasEmptyBValues = (levelValues.B || []).some((entry) => !(entry.values || []).length);
    if (hasInvalidBParent || hasEmptyBValues) {
      nextErrors['value-B'] = 'Each Level B item needs a valid Level A parent and at least one value';
    }

    const levelCParents = new Set((levelValues.B || []).flatMap((entry) => entry.values || []));
    const hasInvalidCParent = (levelValues.C || []).some((entry) => !entry.parent || !levelCParents.has(entry.parent));
    const hasEmptyCValues = (levelValues.C || []).some((entry) => !(entry.values || []).length);
    if (hasInvalidCParent || hasEmptyCValues) {
      nextErrors['value-C'] = 'Each Level C item needs a valid Level B parent and at least one value';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setLevelNames(originalLevelNames);
    setLevelValues(originalLevelValues);
    setLevelValueInputs(DEFAULT_LEVEL_INPUTS);
    setIsEditing(false);
    setErrors({});
    setError('');
    setSuccess('');
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
      const payload = {
        levelNames: {
          A: levelNames.A.trim(),
          B: levelNames.B.trim(),
          C: levelNames.C.trim(),
        },
        levelValues: {
          A: (levelValues.A || []).map((v) => `${v}`.trim()).filter(Boolean),
          B: (levelValues.B || []).map((entry) => ({
            parent: `${entry.parent}`.trim(),
            values: (entry.values || []).map((v) => `${v}`.trim()).filter(Boolean),
          })),
          C: (levelValues.C || []).map((entry) => ({
            parent: `${entry.parent}`.trim(),
            values: (entry.values || []).map((v) => `${v}`.trim()).filter(Boolean),
          })),
        },
      };

      const response = await api.put(`/academic/config/${user.college}`, payload, {}, true);
      const updatedNames = (response?.data && response.data.levelNames) || payload.levelNames;
      const updatedValues = (response?.data && response.data.levelValues) || payload.levelValues;

      setOriginalLevelNames(normalizeLevelNames(updatedNames));
      setOriginalLevelValues(normalizeLevelValues(updatedValues));
      setLevelNames(normalizeLevelNames(updatedNames));
      setLevelValues(normalizeLevelValues(updatedValues));
      setLevelValueInputs(DEFAULT_LEVEL_INPUTS);
      setIsEditing(false);
      setSuccess('Academic configuration saved successfully.');
      setErrors({});

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save academic configuration');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading academic configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Academic Configuration</h1>
          </div>
          {!isEditing && (
            <Button onClick={handleEdit} variant="outline" className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Level Names
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Manage the display names and hierarchical values for academic levels.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {['A', 'B', 'C'].map((key) => (
            <div key={key}>
              <label htmlFor={key} className="block text-sm font-medium mb-2">
                Level {key} Name
              </label>
              {isEditing ? (
                <>
                  <Input
                    id={key}
                    name={key}
                    value={levelNames[key]}
                    onChange={handleNameChange}
                    placeholder={`Enter name for Level ${key}`}
                    className={errors[key] ? 'border-destructive' : ''}
                  />
                  {errors[key] && <p className="text-sm text-destructive mt-1">{errors[key]}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                  {levelNames[key] || `Level ${key}`}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">{levelNames.A}</label>
              {errors['value-A'] && <p className="text-sm text-destructive">{errors['value-A']}</p>}
            </div>
            {isEditing ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(levelValues.A || []).map((value) => (
                    <span
                      key={`A-${value}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => removeLevelAValue(value)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${value}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="value-A"
                    name="value-A"
                    value={levelValueInputs.A}
                    onChange={(e) => handleValueInputChange('A', null, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addLevelAValue();
                      }
                    }}
                    placeholder="Type and press Enter for Level A"
                    className={errors['value-A'] ? 'border-destructive' : ''}
                  />
                  <Button type="button" variant="outline" onClick={addLevelAValue}>
                    Add
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                {(levelValues.A || []).length ? (levelValues.A || []).join(', ') : 'Not set'}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">{levelNames.B} </label>
              {errors['value-B'] && <p className="text-sm text-destructive">{errors['value-B']}</p>}
            </div>
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <select
                    className={`h-10 rounded-md border px-3 text-sm bg-background ${errors['value-B'] ? 'border-destructive' : 'border-input'}`}
                    value={levelValueInputs.B.parent}
                    onChange={(e) => handleValueInputChange('B', 'parent', e.target.value)}
                  >
                    <option value="">Select Level A parent</option>
                    {(levelValues.A || []).map((val) => (
                      <option key={`A-option-${val}`} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <Input
                    id="value-B"
                    name="value-B"
                    value={levelValueInputs.B.value}
                    onChange={(e) => handleValueInputChange('B', 'value', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addNestedValue('B');
                      }
                    }}
                    placeholder="Type Level B value"
                    className={errors['value-B'] ? 'border-destructive' : ''}
                  />
                  <Button type="button" variant="outline" onClick={() => addNestedValue('B')} disabled={!(levelValues.A || []).length}>
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {(levelValues.B || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No Level B values added.</p>
                  )}
                  {(levelValues.B || []).map((entry) => (
                    <div key={`B-${entry.parent}`}>
                      <p className="text-sm font-medium mb-1">Parent: {entry.parent}</p>
                      <div className="flex flex-wrap gap-2">
                        {(entry.values || []).map((value) => (
                          <span
                            key={`B-${entry.parent}-${value}`}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                          >
                            {value}
                            <button
                              type="button"
                              onClick={() => removeNestedValue('B', entry.parent, value)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${value}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {(levelValues.B || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No Level B values configured.</p>
                )}
                {(levelValues.B || []).map((entry) => (
                  <p key={`B-view-${entry.parent}`} className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {entry.parent}: {(entry.values || []).join(', ')}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">{levelNames.C} </label>
              {errors['value-C'] && <p className="text-sm text-destructive">{errors['value-C']}</p>}
            </div>
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <select
                    className={`h-10 rounded-md border px-3 text-sm bg-background ${errors['value-C'] ? 'border-destructive' : 'border-input'}`}
                    value={levelValueInputs.C.parent}
                    onChange={(e) => handleValueInputChange('C', 'parent', e.target.value)}
                  >
                    <option value="">Select Level B parent</option>
                    {(levelValues.B || [])
                      .flatMap((entry) => entry.values || [])
                      .map((val) => (
                        <option key={`B-child-option-${val}`} value={val}>
                          {val}
                        </option>
                      ))}
                  </select>
                  <Input
                    id="value-C"
                    name="value-C"
                    value={levelValueInputs.C.value}
                    onChange={(e) => handleValueInputChange('C', 'value', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addNestedValue('C');
                      }
                    }}
                    placeholder="Type Level C value"
                    className={errors['value-C'] ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addNestedValue('C')}
                    disabled={!(levelValues.B || []).flatMap((entry) => entry.values || []).length}
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {(levelValues.C || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No Level C values added.</p>
                  )}
                  {(levelValues.C || []).map((entry) => (
                    <div key={`C-${entry.parent}`}>
                      <p className="text-sm font-medium mb-1">Parent: {entry.parent}</p>
                      <div className="flex flex-wrap gap-2">
                        {(entry.values || []).map((value) => (
                          <span
                            key={`C-${entry.parent}-${value}`}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                          >
                            {value}
                            <button
                              type="button"
                              onClick={() => removeNestedValue('C', entry.parent, value)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${value}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {(levelValues.C || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No Level C values configured.</p>
                )}
                {(levelValues.C || []).map((entry) => (
                  <p key={`C-view-${entry.parent}`} className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                    {entry.parent}: {(entry.values || []).join(', ')}
                  </p>
                ))}
              </div>
            )}
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

