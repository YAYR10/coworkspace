import { IsIn, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
import { ROLES, Role } from '../common/current-user';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,19}$/, { message: 'Teléfono inválido' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  city?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}

export class ChangeRoleDto {
  @IsIn(ROLES, { message: 'role debe ser MEMBER, COORDINATOR o ADMIN' })
  role: Role;
}
