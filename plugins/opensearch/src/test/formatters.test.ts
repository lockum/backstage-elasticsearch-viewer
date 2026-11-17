import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatNumber,
  formatDate,
} from '../components/common/formatters';

describe('Formatters', () => {
  describe('formatBytes', () => {
    it('formats 0 or negative bytes as 0 B', () => {
      assert.equal(formatBytes(0), '0 B');
      assert.equal(formatBytes(-10), '0 B');
      assert.equal(formatBytes(undefined), '0 B');
    });

    it('formats bytes, kilobytes, megabytes, and gigabytes accurately', () => {
      assert.equal(formatBytes(500), '500 B');
      assert.equal(formatBytes(1024), '1 KB');
      assert.equal(formatBytes(1048576 * 15), '15 MB');
      assert.equal(formatBytes(1073741824 * 2.5), '2.5 GB');
      assert.equal(formatBytes(1099511627776 * 1.2), '1.2 TB');
    });
  });

  describe('formatNumber', () => {
    it('formats undefined or NaN to 0', () => {
      assert.equal(formatNumber(undefined), '0');
      assert.equal(formatNumber(NaN), '0');
    });

    it('formats integers with thousands separators', () => {
      const formatted = formatNumber(1250000);
      assert.match(formatted, /1[,\s.]250[,\s.]000/);
    });
  });

  describe('formatDate', () => {
    it('returns a dash for missing timestamp', () => {
      assert.equal(formatDate(undefined), '—');
      assert.equal(formatDate(''), '—');
    });

    it('formats a numeric epoch timestamp into a string', () => {
      const formatted = formatDate(1763337600000);
      assert.notEqual(formatted, '—');
      assert.equal(typeof formatted, 'string');
    });
  });
});
