import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class SubscribeDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
