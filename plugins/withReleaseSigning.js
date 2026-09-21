const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Firma de PRODUCCIÓN para la variante `release` de Android.
 *
 * `expo prebuild` regenera `android/`, y su plantilla firma el release con la clave de DEBUG. Este plugin
 * lo corrige cada vez, para que un prebuild nunca vuelva a dejar un release firmado con debug.
 *
 * Los secretos NO están aquí ni en Git: Gradle lee el keystore y sus contraseñas de un archivo de
 * propiedades FUERA del repositorio (por defecto `D:/IAJ/secrets/android-release.properties`, o la ruta de
 * la variable de entorno `ANDROID_RELEASE_PROPERTIES`), con las claves storeFile, storePassword,
 * keyAlias y keyPassword. Si falta, compilar un release FALLA con un mensaje claro (nunca cae en debug).
 * Compilar debug no lo necesita.
 */
const MARCA = '// [release-signing]';

const CARGA = `${MARCA} Firma de producción: el keystore y sus contraseñas viven FUERA del repositorio.
def releasePropsFile = file(System.getenv('ANDROID_RELEASE_PROPERTIES') ?: 'D:/IAJ/secrets/android-release.properties')
def releaseProps = new Properties()
if (releasePropsFile.exists()) { releasePropsFile.withInputStream { releaseProps.load(it) } }
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.contains('Release') } && !releasePropsFile.exists()) {
        throw new GradleException("Falta el archivo de firma de producción: \${releasePropsFile}. No se firma un release con la clave de debug.")
    }
}

`;

const FIRMA_RELEASE = `        release {
            if (releasePropsFile.exists()) {
                storeFile file(releaseProps['storeFile'])
                storePassword releaseProps['storePassword']
                keyAlias releaseProps['keyAlias']
                keyPassword releaseProps['keyPassword']
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let g = mod.modResults.contents;
    if (g.includes(MARCA)) return mod; // ya aplicado

    if (!/^android \{/m.test(g)) throw new Error('withReleaseSigning: no se encontró el bloque android { } en build.gradle');
    g = g.replace(/^android \{/m, `${CARGA}android {`);

    if (!/signingConfigs \{\s*\n\s*debug \{/.test(g)) throw new Error('withReleaseSigning: no se encontró signingConfigs.debug');
    g = g.replace(/(signingConfigs \{\s*\n\s*debug \{[\s\S]*?\n        \}\n)/, `$1${FIRMA_RELEASE}`);

    const dentroDeRelease = /(buildTypes \{[\s\S]*?\n        release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!dentroDeRelease.test(g)) throw new Error('withReleaseSigning: no se encontró la firma del release');
    g = g.replace(dentroDeRelease, '$1signingConfig signingConfigs.release');

    mod.modResults.contents = g;
    return mod;
  });
};
