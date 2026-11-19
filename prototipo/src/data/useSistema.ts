import { useContext } from 'react';
import { SistemaContext, type Ctx } from './contexto';

export function useSistema(): Ctx {
  const c = useContext(SistemaContext);
  if (!c) throw new Error('useSistema debe usarse dentro de SistemaProvider');
  return c;
}
