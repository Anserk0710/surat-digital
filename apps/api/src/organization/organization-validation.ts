import { BadRequestException } from '@nestjs/common';

const canonicalTimezones = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

export function validateIanaTimezone(value: string): string {
  if (!canonicalTimezones.has(value)) {
    throw new BadRequestException({
      code: 'INVALID_IANA_TIMEZONE',
      message: 'Timezone must use an IANA timezone name.',
    });
  }

  return value;
}

export function parseCalendarDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Invalid calendar date.');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Invalid calendar date.');
  }

  return parsed;
}

export function validateDateRange(
  from: Date | null | undefined,
  until: Date | null | undefined,
): void {
  if (from && until && until < from) {
    throw new BadRequestException({
      code: 'INVALID_ASSIGNMENT_PERIOD',
      message: 'validUntil must not precede validFrom',
    });
  }
}
