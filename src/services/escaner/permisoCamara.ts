import { Camera } from 'expo-camera';

export interface PermisoCamara {
  concedido: boolean;
  /** Si es false y no está concedido, solo se cambia desde Ajustes. */
  puedePreguntar: boolean;
}

const aPermiso = (r: { granted: boolean; canAskAgain: boolean }): PermisoCamara => ({
  concedido: r.granted, puedePreguntar: r.canAskAgain,
});

export async function consultarPermisoCamara(): Promise<PermisoCamara> {
  return aPermiso(await Camera.getCameraPermissionsAsync());
}

/** Muestra el diálogo del sistema solo si hace falta (la primera vez o si se puede volver a preguntar). */
export async function pedirPermisoCamara(): Promise<PermisoCamara> {
  return aPermiso(await Camera.requestCameraPermissionsAsync());
}
