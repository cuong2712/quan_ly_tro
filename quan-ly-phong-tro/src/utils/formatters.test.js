import { describe, it, expect } from 'vitest';
import { formatVND, formatDate, getVietQRUrl } from './formatters';

describe('formatters utility functions', () => {
  describe('formatVND', () => {
    it('should format numbers into VND currency format', () => {
      const result = formatVND(1500000);
      // expect result to contain numbers and VND or ₫ symbol
      expect(result).toMatch(/1\.500\.000/);
    });

    it('should return "0 đ" for null, undefined, or NaN inputs', () => {
      expect(formatVND(null)).toBe('0 đ');
      expect(formatVND(undefined)).toBe('0 đ');
      expect(formatVND(NaN)).toBe('0 đ');
    });

    it('should format 0 correctly', () => {
      const result = formatVND(0);
      expect(result).toMatch(/0/);
    });
  });

  describe('formatDate', () => {
    it('should format valid date strings into DD/MM/YYYY format', () => {
      const formatted = formatDate('2026-08-10');
      expect(formatted).toBe('10/08/2026');
    });

    it('should return empty string if input is falsy', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
    });

    it('should return original string if input is invalid date', () => {
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('getVietQRUrl', () => {
    it('should generate correct VietQR url with default and custom parameters', () => {
      const url = getVietQRUrl({
        bankId: 'MB',
        accountNo: '123456789',
        accountName: 'NGUYEN VAN A',
        amount: 2500000,
        addInfo: 'Tien nhat 08/2026'
      });

      expect(url).toContain('https://img.vietqr.io/image/MB-123456789-compact2.png');
      expect(url).toContain('amount=2500000');
      expect(url).toContain('addInfo=Tien%20nhat%2008%2F2026');
      expect(url).toContain('accountName=NGUYEN%20VAN%20A');
    });
  });
});
