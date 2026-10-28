import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class SubscribeDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

/** Activación interna después de un pago aprobado (la llama Billing; el Gateway no la expone). */
export class InternalActivateDto {
  @IsUUID()
  memberId: string;

  @IsUUID()
  planId: string;

  @IsUUID()
  paymentId: string;
}
