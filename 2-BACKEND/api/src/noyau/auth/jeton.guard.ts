import { CanActivate, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
@Injectable() export class JetonGuard implements CanActivate { constructor(private readonly reflector: Reflector) {} canActivate(context: any) { return this.reflector.getAllAndOverride("public", [context.getHandler(), context.getClass()]) === true; } }
