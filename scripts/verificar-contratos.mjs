import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));
const salida = mkdtempSync(join(raiz, '.test-out-'));
const tsc = join(raiz, 'node_modules', 'typescript', 'bin', 'tsc');

const modulos = [
  'src/models/consultas/esquemas.ts'
];

try {
  execFileSync(process.execPath, [tsc, '--ignoreConfig', ...modulos, '--outDir', salida,
    '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--strict', '--rootDir', 'src'],
  { cwd: raiz, stdio: 'inherit' });
} catch {
  rmSync(salida, { recursive: true, force: true });
  console.error('No compilaron los módulos puros.');
  process.exit(1);
}

const cargar = createRequire(join(salida, 'x.js'));
const { EsquemaConsultaIniciar } = cargar('./models/consultas/esquemas');

// Corre en Node, no en Expo, asi que el .env no se carga solo: por defecto apunta al
// backend local, que es contra el que tiene sentido comparar contratos mientras se trabaja.
const apiUrl = process.env.API_URL || 'http://127.0.0.1:8000';

async function verificar() {
  try {
    const res = await fetch(`${apiUrl}/openapi.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const spec = await res.json();
    
    const consultaRequest = spec.components?.schemas?.ConsultaRequest;
    if (!consultaRequest) {
      throw new Error('ConsultaRequest no encontrado en el OpenAPI');
    }
    const props = consultaRequest.properties;

    // Check Zod schema shape
    const zodShape = EsquemaConsultaIniciar.shape;

    // Validar 'texto'
    const textoDef = zodShape.texto._def;
    let minLengthZod, maxLengthZod;
    for (const check of textoDef.checks) {
      if (check.kind === 'min') minLengthZod = check.value;
      if (check.kind === 'max') maxLengthZod = check.value;
    }
    if (props.texto.minLength !== minLengthZod) {
      throw new Error(`Discrepancia en texto minLength: Backend ${props.texto.minLength}, Frontend ${minLengthZod}`);
    }
    if (props.texto.maxLength !== maxLengthZod) {
      throw new Error(`Discrepancia en texto maxLength: Backend ${props.texto.maxLength}, Frontend ${maxLengthZod}`);
    }

    // Validar 'documento_id' nullability
    const isDocNullable = zodShape.documento_id.isNullable();
    const isDocNullableBackend = props.documento_id.anyOf?.some((t) => t.type === 'null') || props.documento_id.type?.includes('null');
    if (isDocNullableBackend && !isDocNullable) {
      throw new Error('Discrepancia: documento_id es nullable en backend pero no en Zod');
    }

    console.log('Contratos verificados correctamente.');
  } catch (e) {
    console.error('Fallo la verificación de contratos:', e.message);
    process.exit(1);
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
}

verificar();
