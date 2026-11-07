import { Module } from "@nestjs/common";
import { EnvoiNotificationsService } from "./envoi-notifications.service.js";
@Module({ providers: [EnvoiNotificationsService], exports: [EnvoiNotificationsService] }) export class NotificationsModule {}
