import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  city: string;

  @IsString()
  address: string;
}

export class CreateRoomDto {
  @IsUUID()
  locationId: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsObject()
  equipment?: Record<string, boolean>;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsObject()
  equipment?: Record<string, boolean>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDeskDto {
  @IsUUID()
  locationId: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  isDedicated?: boolean;
}

export class UpdateDeskDto {
  @IsOptional()
  @IsBoolean()
  isDedicated?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RoomQueryDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  /** Filtra por equipamiento, p. ej. ?equipment=projector */
  @IsOptional()
  @IsString()
  equipment?: string;
}
