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
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  async listUsers() {
    return this.usersService.listAllWithRoles();
  }

  @Post()
  @Roles('ADMIN')
  async createUser(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    },
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
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @Put(':id')
  @Roles('ADMIN')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    },
  ) {
    if (!body.firstName || !body.email || !body.role) {
      throw new BadRequestException('firstName, email, and role are required');
    }

    try {
      const user = await this.usersService.updateUserWithRole(id, {
        firstName: body.firstName,
        lastName: body.lastName || '',
        email: body.email,
        role: body.role,
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (err) {
      if (err instanceof Error && err.message === 'User not found') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN')
  async deactivateUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.setActiveStatus(id, false);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch(':id/activate')
  @Roles('ADMIN')
  async activateUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.setActiveStatus(id, true);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
