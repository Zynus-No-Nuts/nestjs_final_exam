import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'customer@ecommerce.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Customer@123456' })
  @IsString()
  @MinLength(1)
  password: string;
}
