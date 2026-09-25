import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreatePlanDto {
  @Matches(/^[A-Z_]+$/, { message: 'code debe estar en MAYÚSCULAS_CON_GUIONES' })
  code: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['DESK', 'ROOM'], { each: true })
  resourceAccess: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
