/**
 * Reference: extend Payment model so a single payment can credit multiple ledger accounts.
 * Merge these pieces into your existing Payment schema file (alongside amountSplits for methods).
 *
 * API contract (frontend sends):
 * - account: ObjectId — primary account (first split); kept for backward compatibility.
 * - accountSplits: [{ account: ObjectId, amount: Number }] — optional; when present, sum must equal `amount`.
 */

const mongoose = require('mongoose');

const ACCOUNT_SPLIT_EPS = 0.01;

/** Sub-doc: allocate part of the payment to a specific account */
const accountSplitSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

// --- Add to paymentSchema fields: ---
// accountSplits: {
//   type: [accountSplitSchema],
//   default: undefined,
// },

/**
 * Pre-validate: merge with your existing syncPaymentMethodFromSplits hook, or chain two pre('validate') hooks.
 * Order: run account split sync first (sets `account`), then payment-method split logic.
 */
function syncAccountFromSplits(next) {
  const splits = this.accountSplits;
  if (splits && splits.length > 0) {
    const sum = splits.reduce((s, row) => s + (Number(row.amount) || 0), 0);
    if (Math.abs(sum - Number(this.amount)) > ACCOUNT_SPLIT_EPS) {
      this.invalidate('accountSplits', 'Sum of account splits must equal payment amount');
      return next();
    }
    const ids = splits.map((row) => row.account).filter(Boolean);
    if (ids.length !== splits.length) {
      this.invalidate('accountSplits', 'Each account split must reference an account');
      return next();
    }
    // Primary `account` for legacy code paths / indexes
    this.account = splits[0].account;
  }
  next();
}

// paymentSchema.pre('validate', syncAccountFromSplits);

/**
 * Optional: relax `account` required when only accountSplits are sent (if you prefer):
 *
 * account: {
 *   type: mongoose.Schema.Types.ObjectId,
 *   ref: 'Account',
 *   required: function accountRequired() {
 *     return !this.accountSplits || this.accountSplits.length === 0;
 *   },
 * },
 */

module.exports = {
  accountSplitSchema,
  syncAccountFromSplits,
  ACCOUNT_SPLIT_EPS,
};
