import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users with their roles (admin view)' })
  async listUsers() {
    return this.usersService.listAllWithRoles();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new user with a role (ADMIN, COORDINATOR, or EVALUATOR)' })
  async createUser(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    },
    @CurrentUser() user: { id: number },
  ) {
    if (!body.firstName || !body.email || !body.role) {
      throw new BadRequestException('firstName, email, and role are required');
    }

    const validRoles = ['ADMIN', 'COORDINATOR', 'EVALUATOR'];
    if (!validRoles.includes(body.role)) {
      throw new BadRequestException(
        `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      );
    }

    try {
      return await this.usersService.createUserWithRole({
        firstName: body.firstName,
        lastName: body.lastName || '',
        email: body.email,
        role: body.role,
      }, user.id);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: "Update an existing user's name, email, and role" })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    },
    @CurrentUser() user: { id: number },
  ) {
    if (!body.firstName || !body.email || !body.role) {
      throw new BadRequestException('firstName, email, and role are required');
    }

    try {
      const result = await this.usersService.updateUserWithRole(id, {
        firstName: body.firstName,
        lastName: body.lastName || '',
        email: body.email,
        role: body.role,
      }, user.id);
      if (!result) {
        throw new NotFoundException('User not found');
      }
      return result;
    } catch (err) {
      if (err instanceof Error && err.message === 'User not found') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate a user to prevent login and API access' })
  async deactivateUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    const result = await this.usersService.setActiveStatus(id, false, user.id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
    return result;
  }

  @Patch(':id/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reactivate a previously deactivated user' })
  async activateUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    const result = await this.usersService.setActiveStatus(id, true, user.id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
    return result;
  }
}
