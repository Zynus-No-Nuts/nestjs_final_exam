import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: '12345', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu hiện tại phải có ít nhất 5 ký tự' })
  currentPassword: string;

  @ApiProperty({ example: '54321', minLength: 5, maxLength: 64 })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu mới phải có ít nhất 5 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu mới không được vượt quá 64 ký tự' })
  newPassword: string;
}
