import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'abc@gmail.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({ require_tld: true }, { message: 'Email không đúng định dạng (ví dụ: abc@gmail.com)' })
  email: string;

  @ApiProperty({ example: '12345', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu phải có ít nhất 5 ký tự' })
  password: string;
}
