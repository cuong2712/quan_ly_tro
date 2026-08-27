/**
 * Comprehensive Validation Utilities for SmartRent
 * Kiểm tra ràng buộc dữ liệu Họ tên, Số điện thoại, CCCD/CMND, Email, v.v.
 */

// Regex họ tên tiếng Việt và tiếng Anh (cho phép chữ cái, dấu thanh tiếng Việt, khoảng trắng, dấu gạch nối)
export const NAME_REGEX = /^[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđùúủũụưừứửữựòóỏõọôồốổỗộơờớởỡợìíỉĩịỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆĐÙÚỦŨỤƯỪỨỬỮỰÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÌÍỈĨỊỲÝỶỸỴ\s'-]{2,100}$/;

// Regex số điện thoại di động Việt Nam (10 số, đầu 03, 05, 07, 08, 09 hoặc +84)
export const PHONE_REGEX = /^(0|\+84|84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

// Regex CCCD (12 số) hoặc CMND (9 số)
export const CCCD_REGEX = /^(\d{12}|\d{9})$/;

// Regex Email chuẩn RFC 5322
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Kiểm tra Họ và Tên
 * @param {string} name
 * @param {string} [fieldName='Họ và tên']
 * @returns {string|null} Trả về thông báo lỗi hoặc null nếu hợp lệ
 */
export const validateFullName = (name, fieldName = 'Họ và tên') => {
  if (!name || !name.trim()) {
    return `${fieldName} không được để trống.`;
  }
  const clean = name.trim();
  if (clean.length < 2) {
    return `${fieldName} phải có ít nhất 2 ký tự.`;
  }
  if (clean.length > 100) {
    return `${fieldName} không được vượt quá 100 ký tự.`;
  }
  if (!NAME_REGEX.test(clean)) {
    return `${fieldName} không hợp lệ (chỉ được chứa chữ cái tiếng Việt/tiếng Anh, không chứa số hoặc ký tự đặc biệt).`;
  }
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    if (words[0].length < 2) {
      return `${fieldName} vui lòng nhập đầy đủ họ và tên.`;
    }
  }
  return null;
};

/**
 * Kiểm tra Số điện thoại Việt Nam
 * @param {string} phone
 * @param {string} [fieldName='Số điện thoại']
 * @returns {string|null}
 */
export const validatePhone = (phone, fieldName = 'Số điện thoại') => {
  if (!phone || !phone.trim()) {
    return `${fieldName} không được để trống.`;
  }
  const clean = phone.trim().replace(/[\s.-]/g, '');
  if (!PHONE_REGEX.test(clean)) {
    return `${fieldName} không hợp lệ (phải gồm 10 chữ số, bắt đầu bằng các đầu số di động Việt Nam như 03, 05, 07, 08, 09).`;
  }
  return null;
};

/**
 * Kiểm tra Số CCCD / CMND
 * @param {string} cccd
 * @param {boolean} [required=false]
 * @param {string} [fieldName='Số CCCD/CMND']
 * @returns {string|null}
 */
export const validateCCCD = (cccd, required = false, fieldName = 'Số CCCD/CMND') => {
  if (!cccd || !cccd.trim()) {
    if (required) return `${fieldName} không được để trống.`;
    return null;
  }
  const clean = cccd.trim().replace(/\s/g, '');
  if (!CCCD_REGEX.test(clean)) {
    return `${fieldName} không hợp lệ (phải gồm đúng 12 chữ số cho CCCD hoặc 9 chữ số cho CMND, không chứa chữ cái).`;
  }
  return null;
};

/**
 * Kiểm tra Email
 * @param {string} email
 * @param {boolean} [required=false]
 * @param {string} [fieldName='Email']
 * @returns {string|null}
 */
export const validateEmail = (email, required = false, fieldName = 'Email') => {
  if (!email || !email.trim()) {
    if (required) return `${fieldName} không được để trống.`;
    return null;
  }
  const clean = email.trim();
  if (!EMAIL_REGEX.test(clean)) {
    return `${fieldName} không đúng định dạng (VD: example@domain.com).`;
  }
  return null;
};

/**
 * Kiểm tra số tiền / số dương
 * @param {number|string} val
 * @param {string} [fieldName='Số tiền']
 * @param {number} [min=0]
 * @returns {string|null}
 */
export const validatePositiveNumber = (val, fieldName = 'Số tiền', min = 0) => {
  const num = Number(val);
  if (isNaN(num)) {
    return `${fieldName} phải là một số hợp lệ.`;
  }
  if (num < min) {
    return `${fieldName} không được nhỏ hơn ${min}.`;
  }
  return null;
};

/**
 * Kiểm tra số lượng xe và biển số xe
 * @param {number} count
 * @param {string} platesStr
 * @returns {string|null}
 */
export const validateVehicles = (count, platesStr) => {
  const num = parseInt(count, 10) || 0;
  if (num < 0) return 'Số lượng xe không được nhỏ hơn 0.';
  if (num === 0) return null;

  const plates = (platesStr || '')
    .split(/[\n,;]+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (plates.length !== num) {
    return `Số lượng xe đã khai báo là ${num} xe, nhưng bạn mới nhập ${plates.length} biển số xe. Vui lòng nhập đủ ${num} biển số xe tương ứng (ngăn cách bằng dấu phẩy hoặc xuống dòng).`;
  }

  for (let i = 0; i < plates.length; i++) {
    const plate = plates[i];
    if (plate.length < 5 || plate.length > 15) {
      return `Biển số xe thứ ${i + 1} "${plate}" không hợp lệ (độ dài thông thường từ 5 đến 15 ký tự).`;
    }
  }

  return null;
};

