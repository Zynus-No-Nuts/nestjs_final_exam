import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ResponseMessage('Categories retrieved successfully')
  @ApiOperation({ summary: 'List all categories (flat list or parent-child tree)' })
  @ApiQuery({ name: 'tree', required: false, type: Boolean, example: true })
  findAll(@Query('tree', new ParseBoolPipe({ optional: true })) tree?: boolean) {
    return this.categoriesService.findAll(tree ?? false);
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Category retrieved successfully')
  @ApiOperation({ summary: 'Get category details with parent and children' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Category created successfully')
  @ApiOperation({ summary: '[ADMIN] Create a new category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Category updated successfully')
  @ApiOperation({ summary: '[ADMIN] Update an existing category' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Category deleted successfully')
  @ApiOperation({ summary: '[ADMIN] Delete a category (must have no assigned products)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
