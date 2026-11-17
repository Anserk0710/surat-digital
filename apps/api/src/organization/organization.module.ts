import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { OrganizationController } from "./organization.controller.js";
import { OrganizationService } from "./organization.service.js";
import { OrganizationAccessGuard } from "./organization-access.guard.js";

@Module({
    imports: [AuthModule],
    controllers: [OrganizationController],
    providers: [OrganizationService, OrganizationAccessGuard],
    exports: [OrganizationService],
})

export class OrganizationModule { }