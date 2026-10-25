export function formatNumber(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatPercent(part, total) {
  const t = Number(total) || 0;
  if (t <= 0) return null;
  return Math.round(((Number(part) || 0) / t) * 100);
}

export function formatPeriodKey(doc) {
  if (!doc) return '—';
  if (doc.periodKey && doc.periodType !== 'total') return doc.periodKey;
  if (doc.periodStart) {
    const d = new Date(doc.periodStart);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  if (doc.periodKey) return doc.periodKey;
  return '—';
}

export function sortByPeriod(docs = [], dir = 'asc') {
  const sorted = [...docs].sort(
    (a, b) => new Date(a.periodStart || 0) - new Date(b.periodStart || 0)
  );
  return dir === 'desc' ? sorted.reverse() : sorted;
}

export function delta(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) {
    return { value: c - p, pct: c > 0 ? 100 : 0, direction: c > 0 ? 'up' : c < 0 ? 'down' : 'flat' };
  }
  const diff = c - p;
  const pct = Math.round((diff / Math.abs(p)) * 100);
  return { value: diff, pct, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
}

export function greetingForHour(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function seriesFromDocs(docs, getter) {
  return sortByPeriod(docs, 'asc').map((doc) => Number(getter(doc)) || 0);
}

export function buildInsights({ course = {}, student = {}, previousCourse = {}, previousStudent = {} }) {
  const enrolled = student.enrolled ?? 0;
  const active = student.active ?? 0;
  const dropped = student.dropped ?? 0;
  const graduated = student.graduated ?? 0;
  const totalEnrolled = course.totalEnrolled ?? 0;
  const completed = course.completed ?? 0;
  const cancelled = course.cancelled ?? 0;
  const completion = formatPercent(completed, totalEnrolled);
  const dropout = formatPercent(dropped, enrolled || totalEnrolled);
  const retention = formatPercent(active, enrolled || totalEnrolled);
  const items = [];

  if (completion != null) {
    items.push({
      id: 'completion',
      title: 'Course completion',
      description: `${formatNumber(completed)} completed of ${formatNumber(totalEnrolled)} enrolled`,
      value: `${completion}%`,
      variant: completion >= 60 ? 'success' : completion >= 30 ? 'warning' : 'info',
    });
  }

  if (retention != null) {
    items.push({
      id: 'retention',
      title: 'Active retention',
      description: 'Share of students currently active',
      value: `${retention}%`,
      variant: retention >= 70 ? 'success' : retention >= 40 ? 'info' : 'warning',
    });
  }

  if (dropout != null && dropout > 0) {
    items.push({
      id: 'dropout',
      title: 'Dropout rate',
      description: `${formatNumber(dropped)} students marked dropped`,
      value: `${dropout}%`,
      variant: dropout >= 15 ? 'warning' : 'info',
    });
  }

  if (graduated > 0) {
    items.push({
      id: 'graduated',
      title: 'Graduated',
      description: 'Students who completed their programme',
      value: formatNumber(graduated),
      variant: 'success',
    });
  }

  const activeDelta = delta(course.active, previousCourse.active);
  if (previousCourse.active != null && activeDelta.direction !== 'flat') {
    items.push({
      id: 'course-trend',
      title: 'Active courses vs last period',
      description: `${activeDelta.direction === 'up' ? 'Up' : 'Down'} ${Math.abs(activeDelta.pct)}%`,
      value: `${activeDelta.value > 0 ? '+' : ''}${formatNumber(activeDelta.value)}`,
      variant: activeDelta.direction === 'up' ? 'success' : 'warning',
    });
  }

  const studentDelta = delta(student.active, previousStudent.active);
  if (previousStudent.active != null && studentDelta.direction !== 'flat') {
    items.push({
      id: 'student-trend',
      title: 'Active students vs last period',
      description: `${studentDelta.direction === 'up' ? 'Up' : 'Down'} ${Math.abs(studentDelta.pct)}%`,
      value: `${studentDelta.value > 0 ? '+' : ''}${formatNumber(studentDelta.value)}`,
      variant: studentDelta.direction === 'up' ? 'success' : 'warning',
    });
  }

  if (cancelled > 0) {
    items.push({
      id: 'cancelled',
      title: 'Cancelled courses',
      description: 'Requires review if this keeps rising',
      value: formatNumber(cancelled),
      variant: 'warning',
    });
  }

  return items.slice(0, 4);
}
