export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
export const MIN_PASSWORD_LENGTH = 5;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return 'Vui lòng nhập tên đăng nhập';
  }
  if (trimmed.length < 3 || trimmed.length > 30) {
    return 'Tên đăng nhập phải từ 3 đến 30 ký tự';
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Tên đăng nhập chỉ gồm chữ cái không dấu, chữ số, dấu chấm hoặc gạch dưới';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Vui lòng nhập địa chỉ email';
  }
  if (!STRICT_EMAIL_REGEX.test(trimmed)) {
    return 'Email không đúng định dạng (ví dụ: abc@gmail.com)';
  }
  return null;
}

export function validatePassword(password: string, fieldLabel = 'Mật khẩu'): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `${fieldLabel} phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
  }
  return null;
}
