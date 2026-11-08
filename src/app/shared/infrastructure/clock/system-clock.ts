import type { Clock, FechaHora } from '../../domain/fecha-hora';
import { formatearFechaHora } from '../../domain/fecha-hora';

export class SystemClock implements Clock {
  ahora(): FechaHora {
    return formatearFechaHora(new Date());
  }
}
