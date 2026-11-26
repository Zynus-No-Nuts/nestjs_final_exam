import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ResponseMessage('Profile retrieved successfully')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('profile/password')
  @ResponseMessage('Password changed successfully')
  @ApiOperation({ summary: 'Change current authenticated user password' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get('addresses')
  @ResponseMessage('Shipping addresses retrieved successfully')
  @ApiOperation({ summary: 'List all shipping addresses of current user' })
  listAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.listAddresses(userId);
  }

  @Post('addresses')
  @ResponseMessage('Shipping address created successfully')
  @ApiOperation({ summary: 'Add a new shipping address for current user' })
  createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(userId, dto);
  }

  @Patch('addresses/:id')
  @ResponseMessage('Shipping address updated successfully')
  @ApiOperation({ summary: 'Update an existing shipping address' })
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('addresses/:id')
  @ResponseMessage('Shipping address deleted successfully')
  @ApiOperation({ summary: 'Delete a shipping address' })
  deleteAddress(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) addressId: string) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('Users retrieved successfully')
  @ApiOperation({ summary: '[ADMIN] List all users with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.findAllUsers(page, limit);
  }
}
