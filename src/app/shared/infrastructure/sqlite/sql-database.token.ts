import { InjectionToken } from '@angular/core';

import type { SqlDatabase } from './sql-database.port';

export const SQL_DATABASE = new InjectionToken<SqlDatabase>('SQL_DATABASE');
