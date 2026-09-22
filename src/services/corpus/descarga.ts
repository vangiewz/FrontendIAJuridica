import { repositorio } from './repositorio';
import { obtenerVersionCorpus, obtenerPaginaCorpus } from './api';
import { esErrorDeTransporte } from '../api';

export const CODIGO_CIVIL = 'Codigo Civil';
export const TAMANO_PAGINA = 200;

export async function sincronizarCorpus(
  codigo: string,
  alProgreso?: (guardados: number, total: number) => void,
): Promise<'ya-estaba' | 'descargado' | 'sin-red'> {
  try {
    const versionActual = await obtenerVersionCorpus(codigo);
    const versionGuardada = await repositorio.versionGuardada(codigo);
    const completo = await repositorio.estaCompleto(codigo);

    if (versionGuardada === versionActual.version && completo) {
      if (alProgreso) {
        const p = await repositorio.progreso(codigo);
        alProgreso(p.guardados, p.total);
      }
      return 'ya-estaba';
    }

    if (versionGuardada !== versionActual.version) {
      await repositorio.limpiar(codigo);
    }

    let progreso = await repositorio.progreso(codigo);
    let desde = progreso.guardados;
    
    while (desde < versionActual.cantidad) {
      const pagina = await obtenerPaginaCorpus(codigo, desde, TAMANO_PAGINA);
      
      if (pagina.version !== versionActual.version) {
        // La versión cambió durante la descarga, abortar.
        throw new Error('Versión cambiada en el servidor');
      }

      await repositorio.guardarPagina(codigo, pagina.version, pagina.articulos);
      progreso = await repositorio.progreso(codigo);
      desde = progreso.guardados;
      
      if (alProgreso) {
        alProgreso(progreso.guardados, versionActual.cantidad);
      }
    }

    await repositorio.marcarCompleto(codigo, versionActual.version, versionActual.cantidad);
    return 'descargado';

  } catch (error: any) {
    if (esErrorDeTransporte(error)) {
      return 'sin-red';
    }
    throw error;
  }
}
