import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  Logger,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Auth } from '../auth/decorators';
import { UpdateUserDto } from './dto';
import { SendEmailDto } from './dto/send-email.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DeleteUsersDto } from './dto/delete-users.dto';
import { HttpResponse, UserData, UserPayload } from 'src/interfaces';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';

@ApiTags('Admin Users')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'users',
  version: '1',
})
@Auth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @ApiCreatedResponse({ description: 'User created' })
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    return this.usersService.create(createUserDto, user);
  }

  @ApiOkResponse({ description: 'User updated' })
  @Patch(':id')
  update(
    @Body() updateUserDto: UpdateUserDto,
    @Param('id') id: string,
    @GetUser() user: UserData,
  ) {
    return this.usersService.update(updateUserDto, id, user);
  }

  @ApiOkResponse({ description: 'User deleted' })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    return this.usersService.remove(id, user);
  }

  @ApiOkResponse({ description: 'Users deactivated' })
  @Delete('deactivate/all')
  deactivate(
    @Body() users: DeleteUsersDto,
    @GetUser() user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.usersService.deactivate(users, user);
  }

  @ApiOkResponse({ description: 'Users reactivated' })
  @Patch('reactivate/all')
  reactivateAll(@GetUser() user: UserData, @Body() users: DeleteUsersDto) {
    return this.usersService.reactivateAll(user, users);
  }

  @ApiOkResponse({ description: 'User reactivated' })
  @Patch('reactivate/:id')
  reactivate(
    @Param('id') id: string,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    return this.usersService.reactivate(id, user);
  }

  @ApiOkResponse({ description: 'Get all users' })
  @Get()
  findAll(@GetUser() user: UserPayload): Promise<UserPayload[]> {
    return this.usersService.findAll(user);
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated users' })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Number of items per page',
    type: Number,
    example: 10,
    required: false,
  })
  @ApiOkResponse({
    description: 'Paginated list of users',
    schema: {
      title: 'UsersPaginatedResponse',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              lastLogin: { type: 'string', format: 'date-time' },
              isActive: { type: 'boolean' },
              isSuperAdmin: { type: 'boolean' },
              mustChangePassword: { type: 'boolean' },
              userRol: {
                type: 'string',
                enum: ['ADMIN', 'RECEPCIONIST'],
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrevious: { type: 'boolean' },
          },
        },
      },
    },
  })
  findAllPaginated(
    @GetUser() user: UserPayload,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResponse<Omit<UserPayload, 'claims'>>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    return this.usersService.findAllPaginated(user, {
      page: pageNumber,
      pageSize: pageSizeNumber,
    });
  }

  @ApiOkResponse({ description: 'Get user by id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Omit<UserData, 'claims'>> {
    return this.usersService.findOne(id);
  }

  @ApiOkResponse({ description: 'Get new password' })
  @Post('generate-password')
  generatePassword(): { password: string } {
    return this.usersService.generatePassword();
  }

  @ApiOkResponse({ description: 'Send new password' })
  @Post('send-new-password')
  sendNewPassword(
    @Body() sendEmailDto: SendEmailDto,
    @GetUser() user: UserData,
  ) {
    return this.usersService.sendNewPassword(sendEmailDto, user);
  }
}
