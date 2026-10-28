import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUrl, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';

export class ProfileDto {
  @IsString()
  @Length(2, 80)
  displayName: string;

  @IsOptional() @IsString() @MaxLength(120)
  headline?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  bio?: string;

  @IsOptional() @IsString() @MaxLength(80)
  company?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(30, { each: true })
  skills?: string[];

  @IsOptional() @IsUUID()
  locationId?: string;

  @IsOptional() @IsUrl()
  linkedinUrl?: string;

  @IsOptional() @IsBoolean()
  visible?: boolean;
}

export class EventDto {
  @IsUUID()
  locationId: string;

  @IsString() @Length(3, 120)
  title: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(600)
  durationMinutes?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  capacity?: number;
}

export class MessageDto {
  @IsUUID()
  recipientId: string;

  @IsString() @Length(1, 2000)
  body: string;
}
