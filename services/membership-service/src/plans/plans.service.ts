import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './plans.dto';

/** Planes del PDF: puesto flexible, escritorio dedicado, oficina privada, solo salas. Precios en COP. */
const DEFAULT_PLANS = [
  { code: 'FLEX_DESK', name: 'Puesto flexible', price: 350000, resourceAccess: ['DESK'], description: 'Cualquier puesto libre de la red' },
  { code: 'DEDICATED_DESK', name: 'Escritorio dedicado', price: 600000, resourceAccess: ['DESK'], description: 'Escritorio fijo en una sede' },
  { code: 'PRIVATE_OFFICE', name: 'Oficina privada', price: 1500000, resourceAccess: ['DESK', 'ROOM'], description: 'Oficina privada con salas incluidas' },
  { code: 'MEETING_ROOMS_ONLY', name: 'Solo salas de reunión', price: 250000, resourceAccess: ['ROOM'], description: 'Acceso únicamente a salas' },
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Semilla automática: así el despliegue en Render queda listo sin pasos manuales. */
  async onModuleInit(): Promise<void> {
    if ((await this.prisma.membershipPlan.count()) === 0) {
      await this.prisma.membershipPlan.createMany({ data: DEFAULT_PLANS });
      this.logger.log('Planes por defecto creados');
    }
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const email = ADMIN_EMAIL.toLowerCase();
      if (!(await this.prisma.member.findUnique({ where: { email } }))) {
        await this.prisma.member.create({
          data: { name: 'Administrador', email, role: 'ADMIN', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) },
        });
        this.logger.log(`Usuario administrador ${email} creado`);
      }
    }
  }

  findAll() {
    return this.prisma.membershipPlan.findMany({ orderBy: { price: 'asc' } });
  }

  async create(dto: CreatePlanDto) {
    if (await this.prisma.membershipPlan.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException('Ya existe un plan con ese código');
    }
    return this.prisma.membershipPlan.create({ data: dto });
  }
}
