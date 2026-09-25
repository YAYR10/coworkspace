import { Controller, Get, NotFoundException } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';

@Controller('members')
export class MembersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const member = await this.prisma.member.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } },
      },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    return member;
  }
}
