import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class IssueCredentialDto {
  @IsOptional()
  @IsIn(['QR', 'NFC'])
  kind?: 'QR' | 'NFC';

  /** Solo el personal puede emitir una credencial para otro miembro (p. ej. una tarjeta NFC en recepción). */
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class ValidateDto {
  @IsString()
  @Length(10, 200)
  token: string;

  @IsUUID()
  locationId: string;
}
