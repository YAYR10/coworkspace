import { Injectable, Logger } from '@nestjs/common';

export interface MailResult {
  status: 'SENT' | 'LOGGED' | 'FAILED';
  error?: string;
}

/**
 * Envío de correo por API HTTP de Brevo (gratis hasta 300 correos al día).
 * Se usa HTTP y no SMTP porque Render free bloquea los puertos SMTP.
 * Sin BREVO_API_KEY el servicio funciona en "modo demostración": guarda el correo sin enviarlo.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  get enabled(): boolean {
    return !!process.env.BREVO_API_KEY && !!process.env.MAIL_FROM;
  }

  async send(to: { email: string; name: string }, subject: string, html: string): Promise<MailResult> {
    if (!this.enabled) {
      this.logger.log(`[modo demostración] Correo para ${to.email}: ${subject}`);
      return { status: 'LOGGED' };
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME ?? 'CoworkSpace' },
          to: [to],
          subject,
          htmlContent: html,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const error = `Brevo respondió ${res.status}: ${(await res.text()).slice(0, 300)}`;
        this.logger.error(error);
        return { status: 'FAILED', error };
      }
      return { status: 'SENT' };
    } catch (err) {
      this.logger.error(`No se pudo enviar el correo: ${err.message}`);
      return { status: 'FAILED', error: err.message };
    }
  }
}
