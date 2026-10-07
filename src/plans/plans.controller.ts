import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { CreatePlanDto, UpdatePlanDto } from './plans.dto';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  findAll() {
    return this.plans.findAll();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePlanDto) {
    assertAdmin(user);
    return this.plans.create(dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    assertAdmin(user);
    return this.plans.update(id, dto);
  }
}
