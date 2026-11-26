import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'nguyenvana', minLength: 3, maxLength: 30 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Tên đăng nhập không được vượt quá 30 ký tự' })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'Tên đăng nhập chỉ gồm chữ cái không dấu, chữ số, dấu chấm hoặc gạch dưới',
  })
  username: string;

  @ApiProperty({ example: 'abc@gmail.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({ require_tld: true }, { message: 'Email không đúng định dạng (ví dụ: abc@gmail.com)' })
  email: string;

  @ApiProperty({ example: '12345', minLength: 5, maxLength: 64 })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu phải có ít nhất 5 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu không được vượt quá 64 ký tự' })
  password: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
