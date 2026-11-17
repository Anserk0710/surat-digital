import { createParamDecorator, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { OrganizationRequest } from "./organization-access.guard.js";

export const CurrentOrganizationActor = createParamDecorator(
    (_data: unknown, context: ExecutionContext) => {
        const request = context.switchToHttp()
            .getRequest<OrganizationRequest>();

        if (!request.organizationActor) {
            throw new UnauthorizedException(
                'Authentication required.',
            );
        }

        return request.organizationActor;
    },
);