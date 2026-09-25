import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsISO8601, IsUUID } from 'class-validator';
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
