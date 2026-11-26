import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'customer', minLength: 3 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  username: string;

  @ApiProperty({ example: '12345', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu phải có ít nhất 5 ký tự' })
  password: string;
}
