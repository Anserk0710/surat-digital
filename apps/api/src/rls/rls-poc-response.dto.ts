import { ApiProperty } from '@nestjs/swagger';

export class RlsPocResourceResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  ownerEmployeeId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  officeId!: string;

  @ApiProperty({ type: String })
  label!: string;
}
