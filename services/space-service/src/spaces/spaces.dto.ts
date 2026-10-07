import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, MaxLength, Min } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  country?: string;

  @IsString()
  city: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(2, 40, { each: true })
  services?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(2, 40, { each: true })
  services?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class LocationQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  /** Solo personal: incluye sedes sin publicar */
  @IsOptional()
  @IsString()
  all?: string;
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

  /** Solo salas de sedes de este país */
  @IsOptional()
  @IsString()
  country?: string;

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

export class DeskQueryDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
