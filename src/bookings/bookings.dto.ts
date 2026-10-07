import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class CreateBookingDto {
  @IsEnum(ResourceType, { message: 'resourceType debe ser ROOM o DESK' })
  resourceType: ResourceType;

  @IsUUID()
  resourceId: string;

  @IsISO8601()
  startTime: string;

  @IsISO8601()
  endTime: string;
}

export class AvailabilityQueryDto {
  @IsUUID()
  resourceId: string;

  @Type(() => Date)
  @IsDate()
  from: Date;

  @Type(() => Date)
  @IsDate()
  to: Date;
}

/** Filtros del listado de reservas para coordinadores y administradores. */
export class StaffBookingQueryDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
