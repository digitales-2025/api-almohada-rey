import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventPayloads } from 'src/interfaces/event-types.interface';
import { getFirstWord } from 'src/utils';

const infoBusiness = {
  business: 'La Almohada del Rey',
  url: 'https://admin.hotelalmohadadelrey.com',
  phone: '+51 958 959 958',
  address: 'Calle Mollendo N° 37 - Urbanización Municipal., Arequipa, Peru',
  contact: 'gestion.almohadadelrey@gmail.com',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(private readonly mailerService: MailerService) {}

  @OnEvent('user.welcome-admin-first')
  async welcomeEmail(
    data: EventPayloads['user.welcome-admin-first'],
  ): Promise<boolean> {
    const { name, email, password, webAdmin } = data;
    const subject = `Bienvenido a ${infoBusiness.business}: ${getFirstWord(name)}`;

    try {
      const sendingEmail = await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'welcome-admin-first',
        context: {
          name,
          email,
          password,
          webAdmin,
          business: infoBusiness.business,
          url: infoBusiness.url,
          phone: infoBusiness.phone,
          address: infoBusiness.address,
          contact: infoBusiness.contact,
        },
      });

      if (sendingEmail) {
        return true; // Retorna true indicando éxito
      } else {
        return false; // Retorna false indicando fallo
      }
    } catch (error) {
      this.logger.error(error);
      return false; // Retorna false indicando fallo
    }
  }

  @OnEvent('user.new-password')
  async newPassword(
    data: EventPayloads['user.new-password'],
  ): Promise<boolean> {
    const { name, email, password, webAdmin } = data;
    const subject = `Hola de nuevo: ${getFirstWord(name)}`;

    try {
      const sendingEmail = await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'new-password',
        context: {
          name,
          email,
          password,
          webAdmin,
          business: infoBusiness.business,
          url: infoBusiness.url,
          phone: infoBusiness.phone,
          address: infoBusiness.address,
          contact: infoBusiness.contact,
        },
      });

      if (sendingEmail) {
        return true; // Retorna true indicando éxito
      } else {
        return false; // Retorna false indicando fallo
      }
    } catch (error) {
      this.logger.error(error);
      return false; // Retorna false indicando fallo
    }
  }
}
