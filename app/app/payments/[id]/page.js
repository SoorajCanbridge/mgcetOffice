'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CreditCard, ArrowLeft, Download, Printer, Mail, Phone, MapPin,
  RefreshCcw, DollarSign, CheckCircle, XCircle,
  Clock, FileText, Package, Copy,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getLogoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const PAYMENTS_BASE = '/finance/payments';
const DEFAULT_LEVEL_LABELS = { A: 'Level A', B: 'Level B', C: 'Level C' };
const normalizeLevelLabels = (labels) => ({ ...DEFAULT_LEVEL_LABELS, ...(labels || {}) });

const formatDateForDisplay = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return '—'; }
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  } catch { return String(value); }
};

const formatPaymentMethodLabel = (method) => {
  if (!method && method !== 0) return 'N/A';
  return String(method).replace(/[-_]/g, ' ').trim() || 'N/A';
};

const formatPaddedId = (value, minDigits = 4) => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  return /^\d+$/.test(raw) ? raw.padStart(minDigits, '0') : raw;
};

/** Receipt number is stored in `transactionId`. */
const formatReceiptNumber = (payment) =>
  payment?.transactionId != null && String(payment.transactionId).trim()
    ? formatPaddedId(payment.transactionId, 5)
    : '';

/** Bank/gateway transaction id is stored in `paymentNumber`. */
const formatPaymentTransactionId = (payment) =>
  payment?.paymentNumber != null && String(payment.paymentNumber).trim()
    ? formatPaddedId(payment.paymentNumber)
    : '';

const formatAccountTypeLabel = (t) => {
  if (!t) return '—';
  return String(t).charAt(0).toUpperCase() + String(t).slice(1);
};

const formatDateForCSV = (date) => {
  if (!date) return '';
  try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
};

/** Print-only: DM Sans via Google Fonts in print window head; falls back to system UI if offline */
const RECEIPT_PRINT_FONT_STACK =
  '"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const RECEIPT_PRINT_STYLES = `
  :root {
    --pr-ink: #0f172a;
    --pr-muted: #0f172a;
    --pr-faint: #0f172a;
    --pr-line: #e2e8f0;
    --pr-surface: #f8fafc;
    --pr-accent: #059669;
    --pr-accent-ink: #047857;
    --pr-warn-bg: #fffbeb;
    --pr-warn-ink: #b45309;
    --pr-danger: #dc2626;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${RECEIPT_PRINT_FONT_STACK};
    padding: 0;
    color: var(--pr-ink);
    background: #f1f5f9;
    font-size: 12.5px;
    line-height: 1.35;
    font-feature-settings: "tnum" 1;
    -webkit-font-smoothing: antialiased;
  }
  .print-container {
    width: 100%;
    max-width: 186mm;
    margin: 0 auto;
    padding: 8px 6px 12px;
  }
  .pr-copy { margin-bottom: 10px; }
  .pr-copy + .pr-copy { page-break-before: always; break-before: page; }
  /* Two identical receipts on one A4 — compact layout; overflow flows to next page */
  body.pr-print-two-on-one { font-size: 10px; line-height: 1.22; }
  body.pr-print-two-on-one .pr-copy {
    margin-bottom: 0;
    /* Prefer each receipt as one unit; UA may break inside if taller than one page */
    break-inside: avoid-page;
  }
  body.pr-print-two-on-one .pr-copy + .pr-copy {
    page-break-before: auto;
    break-before: auto;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 2px dashed var(--pr-faint);
  }
  body.pr-print-two-on-one .pr-accent { height: 2px; }
  body.pr-print-two-on-one .pr-logo,
  body.pr-print-two-on-one .pr-logo-ph {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    font-size: 13px;
  }
  body.pr-print-two-on-one .pr-head {
    gap: 8px;
    padding: 5px 8px 4px;
  }
  body.pr-print-two-on-one .pr-head-left { gap: 6px; }
  body.pr-print-two-on-one .pr-inst { font-size: 12px; letter-spacing: -0.015em; }
  body.pr-print-two-on-one .pr-inst-line { font-size: 8px; margin-top: 1px; line-height: 1.25; }
  body.pr-print-two-on-one .pr-doc-label { font-size: 7.5px; margin-bottom: 1px; }
  body.pr-print-two-on-one .pr-doc-num { font-size: 15px; }
  body.pr-print-two-on-one .pr-doc-date { font-size: 8px; margin-top: 2px; }
  body.pr-print-two-on-one .pr-badge { margin-top: 3px; padding: 2px 6px; font-size: 7.5px; }
  body.pr-print-two-on-one .pr-strip {
    gap: 4px 5px;
    padding: 3px 8px;
    font-size: 8.5px;
  }
  body.pr-print-two-on-one .pr-chip { padding: 2px 5px; gap: 3px; border-radius: 4px; }
  body.pr-print-two-on-one .pr-chip-k { font-size: 7.5px; }
  body.pr-print-two-on-one .pr-title-center {
    display: block;
    font-size: 9px;
    margin: 0 0 4px;
    letter-spacing: 0.12em;
  }
  body.pr-print-two-on-one .pr-body { padding: 5px 8px 5px; }
  body.pr-print-two-on-one .pr-grid { gap: 5px; margin-bottom: 5px; }
  body.pr-print-two-on-one .pr-panel { padding: 5px 7px; border-radius: 5px; }
  body.pr-print-two-on-one .pr-panel-h { font-size: 7.5px; margin-bottom: 3px; }
  body.pr-print-two-on-one .pr-levels-wrap { margin-top: 6px; padding: 5px 5px 4px; gap: 4px 6px; }
  body.pr-print-two-on-one .pr-level-k { font-size: 7px; margin-bottom: 2px; }
  body.pr-print-two-on-one .pr-level-v { font-size: 8.5px; }
  body.pr-print-two-on-one .pr-payee-name { font-size: 10px; margin-bottom: 2px; }
  body.pr-print-two-on-one .pr-dl > div {
    grid-template-columns: 58px 1fr;
    gap: 2px 5px;
    font-size: 8.5px;
    padding: 1px 0;
  }
  body.pr-print-two-on-one .pr-amount-panel { padding: 5px 6px; border-radius: 5px; }
  body.pr-print-two-on-one .pr-above-amount {
    gap: 6px 12px;
    margin-bottom: 4px;
    padding-bottom: 4px;
  }
  body.pr-print-two-on-one .pr-above-k { font-size: 7px; margin-bottom: 0; }
  body.pr-print-two-on-one .pr-above-v { font-size: 9px; }
  body.pr-print-two-on-one .pr-amount-label { font-size: 7px; margin-bottom: 2px; }
  body.pr-print-two-on-one .pr-amount-val { font-size: 16px; }
  body.pr-print-two-on-one .pr-subblock { margin-top: 4px; padding-top: 4px; }
  body.pr-print-two-on-one .pr-subblock-h { font-size: 7px; margin-bottom: 3px; }
  body.pr-print-two-on-one .pr-mini-row { font-size: 8px; padding: 2px 0; gap: 5px; }
  body.pr-print-two-on-one .pr-summary-alloc-grid,
  body.pr-print-two-on-one .pr-invoice-summary-row {
    gap: 5px;
    margin-bottom: 5px;
  }
  body.pr-print-two-on-one .pr-block { margin-bottom: 5px; }
  body.pr-print-two-on-one .pr-block-h {
    font-size: 7.5px;
    margin-bottom: 3px;
    gap: 4px;
  }
  body.pr-print-two-on-one .pr-block-h::before { width: 2px; height: 8px; }
  body.pr-print-two-on-one .pr-data-table { font-size: 8.5px; border-radius: 4px; }
  body.pr-print-two-on-one .pr-data-table thead th {
    padding: 2px 4px;
    font-size: 7px;
  }
  body.pr-print-two-on-one .pr-data-table tbody td { padding: 2px 4px; }
  body.pr-print-two-on-one .pr-data-table tfoot td { padding: 3px 4px; font-size: 8px; }
  body.pr-print-two-on-one .pr-data-table--wide { font-size: 8px; }
  body.pr-print-two-on-one .pr-compact-alloc { font-size: 7.5px; }
  body.pr-print-two-on-one .pr-compact-alloc thead th,
  body.pr-print-two-on-one .pr-compact-alloc tbody td,
  body.pr-print-two-on-one .pr-compact-alloc tfoot td { padding: 2px 3px !important; }
  body.pr-print-two-on-one .pr-warn { margin-top: 3px; padding: 3px 5px; font-size: 8px; }
  body.pr-print-two-on-one .pr-invoice-bar {
    gap: 5px 10px;
    padding: 3px 7px;
    margin-bottom: 4px;
    border-radius: 4px;
  }
  body.pr-print-two-on-one .pr-invoice-bar strong { font-size: 9px; }
  body.pr-print-two-on-one .pr-invoice-bar span { font-size: 8px; }
  body.pr-print-two-on-one .pr-ledger {
    max-width: 200px;
    margin-bottom: 4px;
    border-radius: 5px;
  }
  body.pr-print-two-on-one .pr-ledger table { font-size: 8.5px; }
  body.pr-print-two-on-one .pr-ledger tr td { padding: 3px 6px; }
  body.pr-print-two-on-one .pr-ledger tr td:first-child { font-size: 7.5px; }
  body.pr-print-two-on-one .pr-ledger tr.pr-ledger-total td {
    font-size: 8.5px;
    padding-top: 3px;
    padding-bottom: 3px;
  }
  body.pr-print-two-on-one .pr-notes {
    padding: 4px 6px;
    font-size: 8.5px;
    line-height: 1.25;
    border-radius: 4px;
  }
  body.pr-print-two-on-one .pr-notes-h { font-size: 7px; margin-bottom: 2px; }
  body.pr-print-two-on-one .pr-footer { padding: 4px 8px 5px; }
  body.pr-print-two-on-one .pr-footer-thanks { font-size: 9px; margin-bottom: 1px; }
  body.pr-print-two-on-one .pr-footer-sub { font-size: 7.5px; line-height: 1.2; }
  body.pr-print-two-on-one .pr-footer-row { margin-top: 3px; font-size: 7.5px; }
  body.pr-print-two-on-one .pr-footer-row--compact {
    margin-top: 0;
    justify-content: center;
    text-align: center;
    font-weight: 600;
    color: var(--pr-muted);
    line-height: 1.25;
  }
  .pr-sheet {
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 12px 40px rgba(15, 23, 42, 0.06);
    overflow: hidden;
    border: 1px solid var(--pr-line);
  }
  .pr-accent {
    height: 3px;
    background: linear-gradient(90deg, var(--pr-accent) 0%, #10b981 45%, #34d399 100%);
  }
  .pr-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--pr-line);
  }
  .pr-head-left { display: flex; gap: 10px; align-items: flex-start; min-width: 0; flex: 1; }
  .pr-logo {
    width: 40px; height: 40px; flex-shrink: 0;
    border-radius: 8px; border: 1px solid var(--pr-line); background: #fff;
    object-fit: contain;
  }
  .pr-logo-ph {
    width: 40px; height: 40px; flex-shrink: 0; border-radius: 8px;
    background: linear-gradient(145deg, var(--pr-accent-soft, #ecfdf5) 0%, #d1fae5 100%);
    border: 1px solid #a7f3d0;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 800; color: var(--pr-accent);
  }
  .pr-inst { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: var(--pr-ink); line-height: 1.2; }
  .pr-inst-line { font-size: 10px; color: var(--pr-muted); margin-top: 3px; line-height: 1.35; max-width: none; }
  .pr-head-right { text-align: right; flex-shrink: 0; }
  .pr-doc-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--pr-faint);
    margin-bottom: 3px;
  }
  .pr-doc-num { font-size: 21px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; color: var(--pr-ink); line-height: 1; }
  .pr-doc-date { font-size: 10px; color: var(--pr-muted); margin-top: 4px; }
  .pr-badge {
    display: inline-block; margin-top: 5px; padding: 3px 8px; border-radius: 999px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  }
  .pr-badge.completed { background: #ecfdf5; color: var(--pr-accent-ink); border: 1px solid #a7f3d0; }
  .pr-badge.pending { background: #fffbeb; color: #a16207; border: 1px solid #fde68a; }
  .pr-badge.failed { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .pr-badge.cancelled { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
  .pr-strip {
    display: flex; flex-wrap: wrap; gap: 6px 8px;
    padding: 6px 12px;
    background: var(--pr-surface);
    border-bottom: 1px solid var(--pr-line);
    font-size: 10px;
  }
  .pr-chip { display: inline-flex; align-items: baseline; gap: 5px; padding: 3px 8px; background: #fff; border: 1px solid var(--pr-line); border-radius: 6px; }
  .pr-chip-k { font-weight: 700; color: var(--pr-muted); font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
  .pr-chip-v { font-weight: 600; color: var(--pr-ink); }
  .pr-body { padding: 10px 12px 10px; }
  .pr-title-center {
    text-align: center;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--pr-ink);
    margin: 0 0 10px;
  }
  .pr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .pr-panel {
    border: 1px solid var(--pr-line);
    border-radius: 8px;
    padding: 8px 10px;
    background: #fff;
  }
  .pr-panel-h {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pr-faint);
    margin-bottom: 6px;
  }
  .pr-payee-name { font-size: 12px; font-weight: 700; color: var(--pr-ink); margin-bottom: 4px; }
  .pr-dl { margin: 0; }
  .pr-dl > div { display: grid; grid-template-columns: 72px 1fr; gap: 4px 8px; font-size: 10.5px; padding: 2px 0; border-bottom: 1px dashed #f1f5f9; }
  .pr-dl > div:last-child { border-bottom: none; }
  .pr-dl dt { color: var(--pr-muted); font-weight: 700; }
  .pr-dl dd { color: var(--pr-ink); font-weight: 500; word-break: break-word; }
  .pr-levels-wrap {
    margin-top: 10px;
    padding: 8px 8px 6px;
    border-top: 1px solid var(--pr-line);
    border-radius: 6px;
    background: var(--pr-surface);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 10px;
    align-items: start;
  }
  .pr-level-cell { min-width: 0; text-align: left; }
  .pr-level-k {
    display: block;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pr-faint);
    margin-bottom: 3px;
    line-height: 1.2;
  }
  .pr-level-v {
    display: block;
    font-size: 10px;
    font-weight: 700;
    color: var(--pr-muted);
    line-height: 1.35;
    word-break: break-word;
  }
  .pr-amount-panel {
    border-radius: 8px;
    padding: 10px 8px;
    text-align: center;
    background: linear-gradient(165deg, #ecfdf5 0%, #f0fdf4 40%, #ffffff 100%);
    border: 1px solid #a7f3d0;
  }
  .pr-above-amount {
    display: flex; flex-wrap: wrap; gap: 10px 24px; justify-content: center;
    margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #d1fae5; text-align: left;
  }
  .pr-above-amount > div { min-width: 0; }
  .pr-above-k { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pr-muted); display: block; margin-bottom: 2px; }
  .pr-above-v { font-size: 11px; font-weight: 700; color: var(--pr-ink); }
  .pr-summary-alloc-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; margin-bottom: 10px;
  }
  .pr-invoice-summary-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; margin-bottom: 10px;
  }
  .pr-compact-alloc { font-size: 9px; }
  .pr-compact-alloc thead th, .pr-compact-alloc tbody td, .pr-compact-alloc tfoot td { padding: 3px 5px !important; }
  .pr-amount-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pr-accent-ink); opacity: 0.85; margin-bottom: 4px; }
  .pr-amount-val { font-size: 23px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; color: var(--pr-accent); line-height: 1.05; }
  .pr-subblock { margin-top: 8px; padding-top: 8px; border-top: 1px solid #d1fae5; text-align: left; }
  .pr-subblock-h { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pr-muted); margin-bottom: 5px; }
  .pr-mini-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; padding: 3px 0; border-bottom: 1px solid #f1f5f9; }
  .pr-mini-row:last-child { border-bottom: none; }
  .pr-mini-k { color: var(--pr-muted); font-weight: 700; }
  .pr-mini-v { font-weight: 600; color: var(--pr-ink); text-align: right; word-break: break-all; }
  .pr-block { margin-bottom: 10px; }
  .pr-block:last-child { margin-bottom: 0; }
  .pr-block-h {
    display: flex; align-items: center; gap: 6px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pr-muted);
    margin-bottom: 5px;
  }
  .pr-block-h::before {
    content: ""; width: 3px; height: 11px; border-radius: 2px; background: var(--pr-accent);
  }
  .pr-data-table {
    width: 100%; border-collapse: separate; border-spacing: 0;
    font-size: 10.5px; border: 1px solid var(--pr-line); border-radius: 6px; overflow: hidden;
  }
  .pr-data-table thead th {
    text-align: left; padding: 4px 6px;
    background: var(--pr-surface);
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--pr-muted);
    border-bottom: 1px solid var(--pr-line);
  }
  .pr-data-table thead th.num { text-align: right; }
  .pr-data-table tbody td {
    padding: 4px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top;
    color: var(--pr-ink);
  }
  .pr-data-table tbody tr:last-child td { border-bottom: none; }
  .pr-data-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .pr-data-table tfoot td {
    padding: 5px 6px; font-weight: 700; font-variant-numeric: tabular-nums;
    background: #f8fafc; border-top: 1px solid var(--pr-line); color: var(--pr-ink);
  }
  .pr-data-table tfoot td[colspan] { text-align: left; font-weight: 700; color: var(--pr-muted); font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; }
  .pr-data-table tfoot td.num { text-align: right; color: var(--pr-accent); }
  .pr-data-table--wide { font-size: 9.5px; }
  .pr-data-table--wide thead th, .pr-data-table--wide tbody td, .pr-data-table--wide tfoot td { padding-left: 4px; padding-right: 4px; }
  .pr-warn {
    margin-top: 5px; padding: 5px 8px; border-radius: 5px; font-size: 10px;
    background: var(--pr-warn-bg); color: var(--pr-warn-ink); border: 1px solid #fde68a;
  }
  .pr-invoice-bar {
    display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline;
    padding: 6px 10px; border-radius: 6px;
    background: var(--pr-surface); border: 1px solid var(--pr-line);
    margin-bottom: 8px;
  }
  .pr-invoice-bar strong { font-size: 11.5px; font-weight: 700; }
  .pr-invoice-bar span { font-size: 10px; color: var(--pr-muted); }
  .pr-ledger {
    width: 100%;
    max-width: 240px;
    margin-left: auto;
    border: 1px solid var(--pr-line); border-radius: 8px; overflow: hidden;
    margin-bottom: 8px;
  }
  .pr-ledger table { width: 100%; border-collapse: collapse; font-size: 11px; font-variant-numeric: tabular-nums; }
  .pr-ledger tr td { padding: 5px 10px; border-bottom: 1px solid #f1f5f9; }
  .pr-ledger tr td:first-child { color: var(--pr-muted); font-weight: 700; font-size: 10px; }
  .pr-ledger tr td:last-child { text-align: right; font-weight: 700; color: var(--pr-ink); }
  .pr-ledger tr.pr-ledger-total td {
    background: var(--pr-surface);
    border-bottom: none; font-size: 11.5px; padding-top: 6px; padding-bottom: 6px;
  }
  .pr-ledger tr.pr-ledger-total td:last-child { color: var(--pr-danger); }
  .pr-ledger tr.pr-ledger-total.pr-ledger-zero td:last-child { color: var(--pr-accent); }
  .pr-notes {
    padding: 8px 10px; border-radius: 6px; background: #fafafa; border: 1px dashed var(--pr-line);
    font-size: 10.5px; color: #475569; line-height: 1.4; margin-bottom: 0; white-space: pre-wrap;
  }
  .pr-notes-h { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pr-muted); margin-bottom: 5px; }
  .pr-footer {
    padding: 8px 12px 10px;
    border-top: 1px solid var(--pr-line);
    background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
    text-align: center;
  }
  .pr-footer-thanks { font-size: 11px; font-weight: 700; color: var(--pr-ink); margin-bottom: 3px; }
  .pr-footer-sub { font-size: 9.5px; color: var(--pr-muted); line-height: 1.35; }
  .pr-footer-row { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; font-size: 9px; color: var(--pr-faint); }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-container { padding: 0; max-width: 100%; width: 100%; }
    .pr-sheet { box-shadow: none; border-radius: 0; border: none; }
    .pr-grid { gap: 8px; }
    body.pr-print-two-on-one {
      font-size: 9.25px;
      line-height: 1.58;
    }
    body.pr-print-two-on-one .pr-doc-num { font-size: 14px; }
    body.pr-print-two-on-one .pr-amount-val { font-size: 14px; }
    body.pr-print-two-on-one .pr-inst { font-size: 11px; }
    body.pr-print-two-on-one .pr-head { padding: 4px 6px 3px; }
    body.pr-print-two-on-one .pr-body { padding: 4px 6px 4px; }
    body.pr-print-two-on-one .pr-grid { gap: 4px; margin-bottom: 4px; }
    body.pr-print-two-on-one .pr-panel { padding: 4px 6px; }
    body.pr-print-two-on-one .pr-block { margin-bottom: 4px; }
    body.pr-print-two-on-one .pr-summary-alloc-grid,
    body.pr-print-two-on-one .pr-invoice-summary-row { gap: 4px; margin-bottom: 4px; }
    body.pr-print-two-on-one .pr-data-table thead th { padding: 1px 3px; }
    body.pr-print-two-on-one .pr-data-table tbody td { padding: 1px 3px; }
    body.pr-print-two-on-one .pr-data-table tfoot td { padding: 2px 3px; }
    body.pr-print-two-on-one .pr-copy + .pr-copy {
      margin-top: 6mm;
      padding-top: 5mm;
      border-top-width: 2px;
    }
    body.pr-print-two-on-one .pr-footer { padding: 3px 6px 4px; }
    @page { margin: 8mm; size: A4 portrait; }
  }
`;

export default function PaymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const paymentId = params?.id;
  const printRef = useRef(null);

  const [payment, setPayment] = useState(null);
  const [student, setStudent] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [account, setAccount] = useState(null);
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [printDrawerOpen, setPrintDrawerOpen] = useState(false);
  const [pendingPrintTitle, setPendingPrintTitle] = useState('Payment Receipt');
  const [levelLabels, setLevelLabels] = useState(DEFAULT_LEVEL_LABELS);

  const courseDetails = useMemo(() => {
    const invoiceCourse = invoice?.courseDetails || {};
    const studentCourse = student?.course && typeof student.course === 'object' ? student.course : {};
    return {
      courseName: String(invoiceCourse.courseName || studentCourse.name || '').trim(),
      levelA: String(invoiceCourse.levelA || studentCourse.levelA || '').trim(),
      levelB: String(invoiceCourse.levelB || studentCourse.levelB || '').trim(),
      levelC: String(invoiceCourse.levelC || studentCourse.levelC || '').trim(),
    };
  }, [invoice?.courseDetails, student?.course]);

  const collegeLogoUrl = useMemo(() => {
    if (!college?.logo) return '';
    return getLogoUrl(college.logo, API_URL, true);
  }, [college?.logo]);

  const amountSplits = useMemo(() => {
    const raw = payment?.amountSplits;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((s, i) => ({ ...s, key: s?._id ?? `split-${i}`, amount: Number(s?.amount) || 0 }));
  }, [payment?.amountSplits]);

  const hasAmountSplits = amountSplits.length > 0;
  const splitsTotal = useMemo(() => amountSplits.reduce((sum, s) => sum + s.amount, 0), [amountSplits]);
  const splitTotalMismatch = hasAmountSplits && Math.abs(splitsTotal - (Number(payment?.amount) || 0)) > 0.01;

  const fetchPaymentDetails = useCallback(async () => {
    if (!paymentId || !user?.college) return;
    try {
      setLoading(true); setError('');
      const collegeId = typeof user.college === 'object' ? (user.college._id || user.college.id || '') : String(user.college);
      const [payResponse, collegeResponse, levelConfigResponse] = await Promise.all([
        api.get(`${PAYMENTS_BASE}/${paymentId}`, {}, true),
        api.get(`/colleges/${collegeId}`, {}, true).catch(() => ({ data: null })),
        api.get(`/academic/config/${collegeId}`).catch(() => ({ data: null })),
      ]);
      const data = payResponse?.data || payResponse;
      setPayment(data);
      const collegeData = collegeResponse?.data || collegeResponse;
      if (collegeData) setCollege(collegeData);
      const levelConfigData = levelConfigResponse?.data || levelConfigResponse || {};
      setLevelLabels(normalizeLevelLabels(levelConfigData.levelNames));

      if (data.student) {
        const studentId = typeof data.student === 'object' ? data.student._id : data.student;
        if (studentId) {
          try {
            const res = await api.get(`/students/${studentId}`, {}, true);
            setStudent(res?.data || res);
          } catch { if (typeof data.student === 'object') setStudent(data.student); }
        } else if (typeof data.student === 'object') setStudent(data.student);
      }

      if (data.invoice) {
        const invoiceId = typeof data.invoice === 'object' ? data.invoice._id : data.invoice;
        if (invoiceId) {
          try {
            const res = await api.get(`/finance/invoices/${invoiceId}`, {}, true);
            setInvoice(res?.data || res);
          } catch { if (typeof data.invoice === 'object') setInvoice(data.invoice); }
        } else if (typeof data.invoice === 'object') setInvoice(data.invoice);
      }

      if (data.account) {
        const accountId = typeof data.account === 'object' ? data.account._id : data.account;
        if (accountId) {
          try {
            const res = await api.get(`/finance/accounts/${accountId}`, {}, true);
            setAccount(res?.data || res);
          } catch { if (typeof data.account === 'object') setAccount(data.account); }
        } else if (typeof data.account === 'object') setAccount(data.account);
      }
    } catch (err) {
      setError(err.message || 'Failed to load payment details');
    } finally { setLoading(false); }
  }, [paymentId, user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchPaymentDetails();
  }, [user?.college, paymentId, fetchPaymentDetails]);

  const handleExportCSV = useCallback(() => {
    if (!payment) return;
    setExporting(true);
    try {
      const rows = [
        ['Payment Receipt'], [],
        ['Receipt Number', formatReceiptNumber(payment) || ''],
        ['Payment Date', formatDateForCSV(payment.paymentDate)],
        ['Amount', payment.amount || 0],
        ['Status', payment.status || ''],
      ];
      if (!hasAmountSplits) rows.push(['Payment Method', payment.paymentMethod || '']);
      if (hasAmountSplits) {
        rows.push([], ['Amount Allocation'], ['Account', 'Type', 'Method', 'Amount']);
        amountSplits.forEach(s => rows.push([s.account?.name || '', s.account?.accountType || '', s.paymentMethod || '', s.amount ?? '']));
      }
      if (student) { rows.push([], ['Student Name', student.name || ''], ['Student ID', student.studentId || student.rollNumber || '']); }
      if (courseDetails.courseName || courseDetails.levelA || courseDetails.levelB || courseDetails.levelC) {
        rows.push(
          [],
          ['Course details'],
          ['Course', courseDetails.courseName || ''],
          [levelLabels.A || DEFAULT_LEVEL_LABELS.A, courseDetails.levelA || ''],
          [levelLabels.B || DEFAULT_LEVEL_LABELS.B, courseDetails.levelB || ''],
          [levelLabels.C || DEFAULT_LEVEL_LABELS.C, courseDetails.levelC || ''],
        );
      }
      if (invoice) {
        rows.push([], ['Invoice Number', invoice.invoiceNumber || ''], ['Invoice Total', invoice.totalAmount || 0]);
        if (Array.isArray(invoice.items) && invoice.items.length > 0) {
          const productTax = invoice.taxCalculationMethod === 'product';
          rows.push(
            [],
            ['Invoice line items'],
            productTax
              ? ['Description', 'Qty', 'Unit price', 'Amount', 'Tax %', 'Tax', 'Paid', 'Balance']
              : ['Description', 'Qty', 'Unit price', 'Amount', 'Paid', 'Balance']
          );
          invoice.items.forEach((item) => {
            const amt = item.amount || 0;
            const paid = item.paidAmount || 0;
            const bal = amt - paid;
            if (productTax) {
              rows.push([
                item.description || '',
                item.quantity ?? '',
                item.unitPrice ?? '',
                amt,
                item.taxRate != null ? `${item.taxRate}%` : '',
                item.taxAmount ?? '',
                paid,
                bal,
              ]);
            } else {
              rows.push([item.description || '', item.quantity ?? '', item.unitPrice ?? '', amt, paid, bal]);
            }
          });
        }
      }
      if (payment.referenceNumber) rows.push(['Reference Number', payment.referenceNumber]);
      if (payment.paymentNumber) rows.push(['Transaction ID', formatPaymentTransactionId(payment)]);
      if (payment.description) rows.push(['Description', payment.description]);

      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payment-${formatReceiptNumber(payment) || paymentId}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { alert('Failed to export CSV'); } finally { setExporting(false); }
  }, [payment, student, invoice, amountSplits, hasAmountSplits, paymentId, courseDetails, levelLabels]);

  const getPrintBodyHtml = useCallback((compactTwoUp = false) => {
    if (!payment) return '';
    const esc = (s) => (s ?? '').toString().replace(/</g, '&lt;');
    const collegeName = college?.name || 'Institution';
    const collegeAddr = [college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    const collegeContact = [college?.phone, college?.email].filter(Boolean).join(' · ');
    const logoBlock = collegeLogoUrl
      ? `<img class="pr-logo" src="${collegeLogoUrl}" alt="" />`
      : `<div class="pr-logo-ph">${esc((collegeName || 'I').charAt(0))}</div>`;

    const invTotal = invoice?.totalAmount ?? invoice?.subtotal;
    const invPaid = invoice?.paidAmount ?? 0;
    const invBalance = invoice?.balanceAmount ?? (invTotal != null ? invTotal - invPaid : null);
    const st = payment.status || 'pending';

    const studentRef = student?.studentId || student?.rollNumber || '';
    const nonStudentRecipient =
      !student && payment?.recipient && typeof payment.recipient === 'object'
        ? payment.recipient
        : !student && invoice?.billTo && typeof invoice.billTo === 'object'
          ? invoice.billTo
          : null;
    const recipientName = student?.name || nonStudentRecipient?.name || '';
    const recipientAddress = nonStudentRecipient?.address || '';
    const contactLine = student
      ? [student?.email, student?.phone || student?.alternatePhone].filter(Boolean).join(' · ')
      : [nonStudentRecipient?.email, nonStudentRecipient?.phone].filter(Boolean).join(' · ');
    const payeeDl = student || nonStudentRecipient
      ? `<dl class="pr-dl">
          ${contactLine ? `<div><dt>Contact</dt><dd>${esc(contactLine)}</dd></div>` : ''}
          ${recipientAddress ? `<div><dt>Address</dt><dd>${esc(recipientAddress)}</dd></div>` : ''}
          ${courseDetails.courseName ? `<div><dt>Batch</dt><dd>${esc(courseDetails.courseName)}</dd></div>` : ''}
        </dl>`
      : `<p style="color:#94a3b8;font-size:9px;margin:0">—</p>`;

    const detailRows = [
      payment.paymentNumber && { k: 'Transaction ID', v: esc(formatPaymentTransactionId(payment)) },
      payment.chequeNumber && {
        k: 'Cheque',
        v: `${esc(payment.chequeNumber)}${payment.chequeDate ? ' · ' + formatDateForDisplay(payment.chequeDate) : ''}`,
      },
      payment.bankName && { k: 'Bank', v: esc(payment.bankName) },
      !hasAmountSplits && account && { k: 'Account', v: esc(account.name) },
    ].filter(Boolean);
    const detailsBlock =
      detailRows.length > 0
        ? `<div class="pr-subblock">
            <div class="pr-subblock-h">Payment details</div>
            ${detailRows.map((r) => `<div class="pr-mini-row"><span class="pr-mini-k">${r.k}</span><span class="pr-mini-v">${r.v}</span></div>`).join('')}
          </div>`
        : '';

    const stripChips = [
      !hasAmountSplits
        ? `<span class="pr-chip"><span class="pr-chip-k">Method</span><span class="pr-chip-v">${esc(formatPaymentMethodLabel(payment.paymentMethod))}</span></span>`
        : '',
      payment.referenceNumber
        ? `<span class="pr-chip"><span class="pr-chip-k">Reference</span><span class="pr-chip-v">${esc(payment.referenceNumber)}</span></span>`
        : '',
    ]
      .filter(Boolean)
      .join('');

    const aboveAmountHtml = `
      <div class="pr-above-amount">
        <div>
          <span class="pr-above-k">Payment date</span>
          <span class="pr-above-v">${formatDateForDisplay(payment.paymentDate)}</span>
        </div>
        ${payment.createdBy?.name
        ? `<div>
          <span class="pr-above-k">Recorded by</span>
          <span class="pr-above-v">${esc(payment.createdBy.name)}</span>
        </div>`
        : ''
      }
      </div>`;

    const ledgerLastClass =
      invBalance != null
        ? `pr-ledger-total${invBalance <= 0 ? ' pr-ledger-zero' : ''}`
        : 'pr-ledger-total pr-ledger-zero';

    const ledgerRowsHtml = `
      ${invTotal != null ? `<tr><td>Invoice total</td><td>${formatCurrency(invTotal)}</td></tr>` : ''}
      <tr><td>Amount Received</td><td>${formatCurrency(payment.amount || 0)}</td></tr>
      ${invPaid != null && invTotal != null ? `<tr><td>Total paid on invoice</td><td>${formatCurrency(invPaid)}</td></tr>` : ''}
      ${invBalance != null
        ? `<tr class="${ledgerLastClass}"><td>Balance due</td><td>${formatCurrency(invBalance)}</td></tr>`
        : `<tr class="pr-ledger-total pr-ledger-zero"><td>Amount received</td><td>${formatCurrency(payment.amount || 0)}</td></tr>`
      }`;

    const receiptSummaryBlock = `<div class="pr-block">
      <div class="pr-block-h">Receipt summary</div>
      <div class="pr-ledger"><table><tbody>${ledgerRowsHtml}</tbody></table></div>
    </div>`;

    const allocationCompactHtml = hasAmountSplits
      ? `<div class="pr-block">
      <div class="pr-block-h">Amount allocation</div>
      <table class="pr-data-table pr-compact-alloc">
        <thead><tr><th>Account</th><th>Type</th><th class="num">Amt</th></tr></thead>
        <tbody>${amountSplits
        .map(
          (s) =>
            `<tr><td>${esc(s.account?.name || '—')}</td><td>${esc(formatAccountTypeLabel(s.account?.accountType))}</td><td class="num">${formatCurrency(s.amount)}</td></tr>`
        )
        .join('')}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="num">${formatCurrency(splitsTotal)}</td></tr></tfoot>
      </table>
      ${splitTotalMismatch
        ? `<div class="pr-warn">Split total does not match receipt amount — verify with your records.</div>`
        : ''
      }
    </div>`
      : '';

    const invoiceBarHtml = invoice
      ? `<div class="pr-invoice-bar">
        <div><strong>${esc(invoice.invoiceNumber || 'N/A')}</strong> <span>· Invoice</span></div>
        ${invoice.invoiceDate ? `<span>Issued ${formatDateForDisplay(invoice.invoiceDate)}</span>` : ''}
        ${invoice.dueDate ? `<span>Due ${formatDateForDisplay(invoice.dueDate)}</span>` : ''}
      </div>`
      : '';

    const summarySectionHtml = hasAmountSplits
      ? `${invoice ? `${invoiceBarHtml}` : ''}
      <div class="pr-summary-alloc-grid">
        ${allocationCompactHtml}
         ${receiptSummaryBlock}
      
      </div>`
      : invoice
        ? `<div class="pr-invoice-summary-row">
        ${invoiceBarHtml}
        ${receiptSummaryBlock}
      </div>`
        : receiptSummaryBlock;

    const invLineItems = Array.isArray(invoice?.items) ? invoice.items : [];
    const invProductTax = invoice?.taxCalculationMethod === 'product';
    const showInvQtyUnitPrice = invLineItems.some((item) => Number(item?.quantity ?? 0) !== 1);
    const invoiceLineItemsHtml =
      invoice && invLineItems.length > 0
        ? `<div class="pr-block">
          <div class="pr-block-h">Invoice line items</div>
          <table class="pr-data-table pr-data-table--wide">
            <thead><tr>
              <th>Description</th>
              ${showInvQtyUnitPrice ? '<th class="num">Qty</th>' : ''}
              ${showInvQtyUnitPrice ? '<th class="num">Unit price</th>' : ''}
              <th class="num">Amount</th>
              ${invProductTax ? '<th class="num">Tax %</th><th class="num">Tax</th>' : ''}
              <th class="num">Paid</th>
              <th class="num">Balance</th>
            </tr></thead>
            <tbody>${invLineItems
          .map((item) => {
            const itemAmount = item.amount || 0;
            const itemPaid = item.paidAmount || 0;
            const itemBalance = itemAmount - itemPaid;
            const taxCells = invProductTax
              ? `<td class="num">${item.taxRate != null ? esc(String(item.taxRate)) + '%' : '—'}</td><td class="num">${formatCurrency(item.taxAmount || 0)}</td>`
              : '';
            return `<tr>
                <td>${esc(item.description || '—')}</td>
                ${showInvQtyUnitPrice ? `<td class="num">${esc(String(item.quantity ?? 0))}</td>` : ''}
                ${showInvQtyUnitPrice ? `<td class="num">${formatCurrency(item.unitPrice || 0)}</td>` : ''}
                <td class="num">${formatCurrency(itemAmount)}</td>
                ${taxCells}
                <td class="num">${formatCurrency(itemPaid)}</td>
                <td class="num">${formatCurrency(itemBalance)}</td>
              </tr>`;
          })
          .join('')}
            </tbody>
          </table>
        </div>`
        : '';

    return `
      <div class="pr-sheet">
        <div class="pr-accent"></div>
        <header class="pr-head">
          <div class="pr-head-left">
            ${logoBlock}
            <div>
              <div class="pr-inst">${esc(collegeName)}</div>
              ${collegeAddr ? `<div class="pr-inst-line">${esc(collegeAddr)}</div>` : ''}
              ${collegeContact ? `<div class="pr-inst-line">${esc(collegeContact)}</div>` : ''}
            </div>
          </div>
          <div class="pr-head-right">
            <div class="pr-doc-label">receipt</div>
            <div class="pr-doc-num">${esc(formatReceiptNumber(payment) || 'N/A')}</div>
            <span class="pr-badge ${st}">${esc(st)}</span>
          </div>
        </header>
        <div class="pr-body">
          <div class="pr-title-center">Receipt</div>
          <div class="pr-grid">
            <section class="pr-panel">
              <div class="pr-panel-h">Received from</div>
              ${recipientName ? `<div class="pr-payee-name">${esc(recipientName)}${studentRef ? ` (${esc(studentRef)})` : ''}</div>` : ''}
              ${payeeDl}
              ${courseDetails.levelA || courseDetails.levelB || courseDetails.levelC ? `<div class="pr-levels-wrap">${courseDetails.levelA ? `<div class="pr-level-cell"><span class="pr-level-k">${esc(levelLabels.A || DEFAULT_LEVEL_LABELS.A)}</span><span class="pr-level-v">${esc(courseDetails.levelA)}</span></div>` : '<div class="pr-level-cell"></div>'}${courseDetails.levelB ? `<div class="pr-level-cell"><span class="pr-level-k">${esc(levelLabels.B || DEFAULT_LEVEL_LABELS.B)}</span><span class="pr-level-v">${esc(courseDetails.levelB)}</span></div>` : '<div class="pr-level-cell"></div>'}${courseDetails.levelC ? `<div class="pr-level-cell"><span class="pr-level-k">${esc(levelLabels.C || DEFAULT_LEVEL_LABELS.C)}</span><span class="pr-level-v">${esc(courseDetails.levelC)}</span></div>` : '<div class="pr-level-cell"></div>'}</div>` : ''}

            </section>
            <section class="pr-amount-panel">
              ${aboveAmountHtml}
              <div class="pr-amount-label">Amount received</div>
              <div class="pr-amount-val">${formatCurrency(payment.amount || 0)}</div>
              ${detailsBlock}
            </section>
          </div> 
          ${invoiceLineItemsHtml}
          ${summarySectionHtml}
         
          ${payment.description || payment.notes
        ? `<div class="pr-block">
                  <div class="pr-notes-h">Notes</div>
                  <div class="pr-notes">${esc(payment.description || payment.notes || '').replace(/\n/g, '<br/>')}</div>
                </div>`
        : ''
      }
        </div>
        <footer class="pr-footer">
          ${compactTwoUp
        ? `<div class="pr-footer-row pr-footer-row--compact">Thank you · Valid without signature · Printed ${formatDateForDisplay(new Date())}</div>`
        : `<div class="pr-footer-thanks">Thank you for your payment</div>
          <div class="pr-footer-sub">This document was generated electronically and is valid without a signature.</div>
          <div class="pr-footer-row">
            <span>Printed ${formatDateForDisplay(new Date())}</span>
          </div>`
      }
        </footer>
      </div>
    `;
  }, [
    payment,
    college,
    collegeLogoUrl,
    student,
    invoice,
    account,
    courseDetails,
    levelLabels,
    hasAmountSplits,
    amountSplits,
    splitsTotal,
    splitTotalMismatch,
  ]);

  const openPrintWindow = useCallback((title, copies = 1) => {
    if (!payment) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow popups to continue'); return; }
    const safeCopies = Math.max(1, Number(copies) || 1);
    const bodyHtml = getPrintBodyHtml(safeCopies === 2);
    const copiesHtml = Array.from({ length: safeCopies })
      .map(() => `<div class="pr-copy">${bodyHtml}</div>`)
      .join('');
    const bodyAttrs = safeCopies === 2 ? ' class="pr-print-two-on-one"' : '';
    const twoOnOnePageStyle =
      safeCopies === 2
        ? '<style>@media print { @page { margin: 4.5mm 5mm; size: A4 portrait; } }</style>'
        : '';
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8">` +
      `<link rel="preconnect" href="https://fonts.googleapis.com">` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
      `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">` +
      `<title>${title} - ${(formatReceiptNumber(payment) || '').replace(/</g, '&lt;')}</title>` +
      `<style>${RECEIPT_PRINT_STYLES}</style>${twoOnOnePageStyle}</head><body${bodyAttrs}><div class="print-container">${copiesHtml}</div></body></html>`
    );
    w.document.close();
    setTimeout(() => w.print(), 300);
  }, [payment, getPrintBodyHtml]);

  const startPrintFlow = useCallback((title) => {
    setPendingPrintTitle(title);
    setPrintDrawerOpen(true);
  }, []);

  const printWithCopies = useCallback(
    (copies) => {
      setPrintDrawerOpen(false);
      openPrintWindow(pendingPrintTitle, copies);
    },
    [openPrintWindow, pendingPrintTitle]
  );

  const handlePrint = useCallback(() => startPrintFlow('Payment Receipt'), [startPrintFlow]);
  const handleExportPDF = useCallback(() => startPrintFlow('Payment Receipt PDF'), [startPrintFlow]);

  const statusConfig = {
    completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle, label: 'Completed' },
    pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500', icon: Clock, label: 'Pending' },
    failed: { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-400', icon: XCircle, label: 'Cancelled' },
  };
  const sc = statusConfig[payment?.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-slate-800 animate-spin"></div>
        </div>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Loading receipt…</p>
      </div>
    </div>
  );

  if (error || !payment) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <XCircle className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-slate-600">{error || 'Payment not found'}</p>
        <button onClick={() => router.push('/app/payments')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Payments
        </button>
      </div>
    </div>
  );

  const invTotal = invoice?.totalAmount ?? invoice?.subtotal;
  const invPaid = invoice?.paidAmount ?? 0;
  const invBalance = invoice?.balanceAmount ?? (invTotal != null ? invTotal - invPaid : null);
  const invProductTax = invoice?.taxCalculationMethod === 'product';
  const invLineItems = Array.isArray(invoice?.items) ? invoice.items : [];
  const showInvQtyUnitPrice = invLineItems.some((item) => Number(item?.quantity ?? 0) !== 1);
  const nonStudentRecipient =
    !student && payment?.recipient && typeof payment.recipient === 'object'
      ? payment.recipient
      : !student && invoice?.billTo && typeof invoice.billTo === 'object'
        ? invoice.billTo
        : null;
  const recipientName = student?.name || nonStudentRecipient?.name || '';
  const recipientRef = student?.studentId
    ? `(${student.studentId})`
    : student?.rollNumber
      ? `(Roll No: ${student.rollNumber})`
      : '';
  const recipientContactLine = student
    ? [student?.email, student?.phone || student?.alternatePhone].filter(Boolean).join(' | ')
    : [nonStudentRecipient?.email, nonStudentRecipient?.phone].filter(Boolean).join(' | ');
  const recipientAddress = student?.address
    ? [student.address.street, student.address.city, student.address.state, student.address.pincode].filter(Boolean).join(', ')
    : nonStudentRecipient?.address || '';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* ── Top action bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/app/payments')}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {formatReceiptNumber(payment) || 'Payment Receipt'}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                {sc.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{formatDateForDisplay(payment.paymentDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchPaymentDetails} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCcw className="h-3.5 w-3.5" />Refresh
          </button>
          <button onClick={handleExportCSV} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />{exporting ? 'Exporting…' : 'CSV'}
          </button>
          <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="h-3.5 w-3.5" />PDF
          </button>
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
            <Printer className="h-3.5 w-3.5" />Print Receipt
          </button>
        </div>
      </div>

      {/* ── Receipt document ── */}
      <div ref={printRef} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border print:border-slate-200">

        {/* College header band */}
        <div className="px-8 pt-8 pb-7 border-b border-slate-100">
          <div className="flex items-start justify-between gap-6">
            {/* Brand */}
            <div className="flex items-start gap-4 min-w-0">
              {collegeLogoUrl ? (
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <img src={collegeLogoUrl} alt={college?.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl">
                  {(college?.name || 'I').charAt(0)}
                </div>
              )}
              <div className="min-w-0 pt-0.5">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{college?.name || 'Institution Name'}</h2>
                {(college?.address || college?.city) && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {[college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-1">
                  {college?.phone && <span className="text-xs text-slate-400">{college.phone}</span>}
                  {college?.email && <span className="text-xs text-slate-400">{college.email}</span>}
                </div>
              </div>
            </div>

            {/* Receipt identity */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">Receipt</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatReceiptNumber(payment) || 'N/A'}</p>
              <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${sc.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                {payment.status}
              </span>
            </div>
          </div>
        </div>

        {/* Thin accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="px-8 py-8 space-y-8">

          {/* ── Row 1: Recipient + Amount hero ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Recipient */}
            <div className="lg:col-span-2 space-y-1">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-3">Received From</p>
              {recipientName || recipientContactLine || recipientAddress ? (
                <div className="space-y-2">
                  {recipientName && <p className="text-base font-bold text-slate-900">{recipientName} {recipientRef}</p>}
                  <div className="space-y-1.5 pt-1">
                    {recipientContactLine && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {recipientContactLine}
                      </div>
                    )}
                    {recipientAddress && (
                      <div className="flex items-start gap-2 text-xs text-slate-500">
                        Address:
                        <span>{recipientAddress}</span>
                      </div>
                    )}
                    {courseDetails.courseName && (
                      <div className="text-xs text-slate-500">
                        <span className="text-slate-400">Batch:</span>{' '}
                        <span className="font-semibold text-slate-700">{courseDetails.courseName}</span>
                      </div>
                    )}
                    {['A', 'B', 'C'].some((k) => courseDetails[`level${k}`]) && (
                      <div className="text-xs text-slate-500">
                        {['A', 'B', 'C'].map((k) =>
                          courseDetails[`level${k}`] ? (
                            <span key={k} className="mr-3 last:mr-0">
                              <span className="text-slate-400">{levelLabels[k] || DEFAULT_LEVEL_LABELS[k]}:</span>{' '}
                              <span className="font-semibold text-slate-700">{courseDetails[`level${k}`]}</span>
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No recipient information</p>
              )}
            </div>

            {/* Amount + meta */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1">Payment date</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDateForDisplay(payment.paymentDate)}</p>
                </div>
                {payment.createdBy?.name && (
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1">Recorded by</p>
                    <p className="text-sm font-semibold text-slate-900">{payment.createdBy.name}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  !hasAmountSplits && { label: 'Payment Method', value: formatPaymentMethodLabel(payment.paymentMethod) },
                  payment.referenceNumber && { label: 'Reference No.', value: payment.referenceNumber },
                  payment.paymentNumber && { label: 'Transaction ID', value: formatPaymentTransactionId(payment), mono: true },
                  payment.chequeNumber && { label: 'Cheque No.', value: payment.chequeNumber },
                  payment.chequeDate && { label: 'Cheque Date', value: formatDateForDisplay(payment.chequeDate) },
                  payment.bankName && { label: 'Bank Name', value: payment.bankName },
                  !hasAmountSplits && account && { label: 'Account', value: account.name },
                ]
                  .filter(Boolean)
                  .map((item, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1">{item.label}</p>
                      <p className={`text-xs font-semibold text-slate-700 ${item.mono ? 'font-mono' : ''} truncate`}>{item.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-slate-100"></div>

          {/* ── Invoice line items (products) ── */}
          {invLineItems.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-2.5 px-4 text-left text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">Description</th>
                        {showInvQtyUnitPrice && (
                          <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Qty</th>
                        )}
                        {showInvQtyUnitPrice && (
                          <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Unit price</th>
                        )}
                        <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Amount</th>
                        {invProductTax && (
                          <>
                            <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Tax %</th>
                            <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Tax</th>
                          </>
                        )}
                        <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Paid</th>
                        <th className="py-2.5 px-4 text-right text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase whitespace-nowrap">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invLineItems.map((item, index) => {
                        const itemAmount = item.amount || 0;
                        const itemPaid = item.paidAmount || 0;
                        const itemBalance = itemAmount - itemPaid;
                        return (
                          <tr key={item._id || index} className="border-b border-slate-50 last:border-0">
                            <td className="py-3 px-4 font-medium text-slate-800 align-top">{item.description || '—'}</td>
                            {showInvQtyUnitPrice && (
                              <td className="py-3 px-4 text-right text-slate-600 tabular-nums">{item.quantity ?? 0}</td>
                            )}
                            {showInvQtyUnitPrice && (
                              <td className="py-3 px-4 text-right text-slate-600 tabular-nums">{formatCurrency(item.unitPrice || 0)}</td>
                            )}
                            <td className="py-3 px-4 text-right font-semibold text-slate-800 tabular-nums">{formatCurrency(itemAmount)}</td>
                            {invProductTax && (
                              <>
                                <td className="py-3 px-4 text-right text-slate-500 tabular-nums">{item.taxRate != null ? `${item.taxRate}%` : '—'}</td>
                                <td className="py-3 px-4 text-right text-slate-500 tabular-nums">{formatCurrency(item.taxAmount || 0)}</td>
                              </>
                            )}
                            <td className={`py-3 px-4 text-right tabular-nums ${itemPaid > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                              {formatCurrency(itemPaid)}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-medium tabular-nums ${itemBalance > 0 ? 'text-red-600' : itemBalance < 0 ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                            >
                              {formatCurrency(itemBalance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* ── Receipt summary ± Invoice ref (no splits) or Summary | Allocation (splits) ── */}
          {hasAmountSplits ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Amount allocation</p>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="rounded-lg border border-slate-100 overflow-hidden text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-1.5 px-2 text-left text-[9px] font-bold tracking-[0.1em] text-slate-400 uppercase">Account</th>
                        <th className="py-1.5 px-2 text-left text-[9px] font-bold tracking-[0.1em] text-slate-400 uppercase hidden sm:table-cell">Type</th>
                        <th className="py-1.5 px-2 text-right text-[9px] font-bold tracking-[0.1em] text-slate-400 uppercase">Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amountSplits.map((s) => (
                        <tr key={s.key} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 px-2 font-medium text-slate-800 max-w-[140px] truncate" title={s.account?.name}>
                            {s.account?.name || '—'}
                          </td>
                          <td className="py-2 px-2 text-slate-500 capitalize hidden sm:table-cell">{formatAccountTypeLabel(s.account?.accountType)}</td>
                          <td className="py-2 px-2 text-right font-semibold tabular-nums text-slate-800">{formatCurrency(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                          Total
                        </td>
                        <td className="py-2 px-2 text-right font-bold tabular-nums text-slate-900">{formatCurrency(splitsTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {splitTotalMismatch && (
                  <p className="text-[11px] text-amber-600 mt-2 flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5"></span>
                    Split total differs from receipt total — verify with your records.
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Receipt summary</p>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="space-y-0 rounded-xl border border-slate-100 overflow-hidden">
                  {invTotal != null && (
                    <div className="flex justify-between items-center px-3 py-2.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Invoice Total</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(invTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-3 py-2.5 border-b border-slate-50">
                    <span className="text-xs text-slate-500">Amount Received</span>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{formatCurrency(payment.amount || 0)}</span>
                  </div>
                  {invoice?.paidAmount != null && invTotal != null && (
                    <div className="flex justify-between items-center px-3 py-2.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Total Paid</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                  )}
                  {invBalance != null ? (
                    <div className="flex justify-between items-center px-3 py-3 bg-slate-50">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Balance Due</span>
                      <span className={`text-base font-bold tabular-nums ${invBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(invBalance)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center px-3 py-3 bg-slate-50">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Amount Received</span>
                      <span className="text-base font-bold tabular-nums text-emerald-600">{formatCurrency(payment.amount || 0)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {invoice && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Invoice Reference</p>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-800 text-sm">{invoice.invoiceNumber || 'N/A'}</span>
                    </div>
                    {invoice.invoiceDate && (
                      <div>
                        <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-0.5">Invoice Date</p>
                        <p className="text-xs text-slate-600">{formatDateForDisplay(invoice.invoiceDate)}</p>
                      </div>
                    )}
                    {invoice.dueDate && (
                      <div>
                        <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-0.5">Due Date</p>
                        <p className="text-xs text-slate-600">{formatDateForDisplay(invoice.dueDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className={invoice ? '' : 'sm:col-span-2 max-w-sm ml-auto w-full'}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Receipt summary</p>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="space-y-0 rounded-xl border border-slate-100 overflow-hidden">
                  {invTotal != null && (
                    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Invoice Total</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(invTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 border-b border-slate-50">
                    <span className="text-xs text-slate-500">Amount Received</span>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{formatCurrency(payment.amount || 0)}</span>
                  </div>
                  {invoice?.paidAmount != null && invTotal != null && (
                    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Total Paid</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                  )}
                  {invBalance != null ? (
                    <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Balance Due</span>
                      <span className={`text-base font-bold tabular-nums ${invBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(invBalance)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Amount Received</span>
                      <span className="text-base font-bold tabular-nums text-emerald-600">{formatCurrency(payment.amount || 0)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* ── Notes ── */}
          {(payment.description || payment.notes) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Notes</p>
                <div className="flex-1 h-px bg-slate-100"></div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4">
                <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{payment.description || payment.notes}</p>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Payment Acknowledged</p>
                <p className="text-[10px] text-slate-400">Computer-generated receipt · No signature required</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">Generated {formatDateForDisplay(new Date())}</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={`grid grid-cols-1 gap-3 ${hasAmountSplits ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {[
          { label: 'Payment Amount', value: formatCurrency(payment.amount || 0), icon: DollarSign, accent: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Status', value: sc.label, icon: StatusIcon, accent: sc.color.split(' ')[0], bg: sc.color.split(' ')[1], border: sc.color.split(' ')[2] },
          ...(!hasAmountSplits
            ? [{ label: 'Payment Method', value: (payment.paymentMethod || 'N/A').replace(/_/g, ' '), icon: CreditCard, accent: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' }]
            : []),
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl border ${card.bg} ${card.border} flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`h-5 w-5 ${card.accent}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">{card.label}</p>
              <p className="text-sm font-bold text-slate-800 capitalize truncate mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={printDrawerOpen} onOpenChange={setPrintDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Select Print Copies</SheetTitle>
            <SheetDescription>Print one receipt per page, or two duplicate receipts on a single page.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => printWithCopies(1)}
              className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">1 Page</p>
                  <p className="text-xs text-slate-500 mt-0.5">Print a single copy of this payment receipt.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => printWithCopies(2)}
              className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                  <Copy className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">2 copies on 1 page</p>
                  <p className="text-xs text-slate-500 mt-0.5">Two identical receipts on one sheet, separated by a dashed line (e.g. office copy and customer copy).</p>
                </div>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}