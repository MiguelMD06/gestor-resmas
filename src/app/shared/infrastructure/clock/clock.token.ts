import { InjectionToken } from '@angular/core';

import type { Clock } from '../../domain/fecha-hora';

export const CLOCK = new InjectionToken<Clock>('CLOCK');
