import { CanActivate, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
@Injectable() export class RolesGuard implements CanActivate { constructor(private readonly reflector: Reflector) {} canActivate(context: any) { const roles = this.reflector.getAllAndOverride<string[]>("roles", [context.getHandler(), context.getClass()]); return !roles || roles.length === 0; } }
