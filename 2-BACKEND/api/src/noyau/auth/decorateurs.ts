import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
export const JetonUtilisateur = createParamDecorator((_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest().headers.authorization?.replace("Bearer ", ""));
