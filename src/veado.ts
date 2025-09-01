// main.ts
import { VeadotubeClient, VeadotubeConnection,} from './veadotube-client';
import type { VeadotubeInstance,VeadotubeMessage } from './types';
async function main() {
    console.log("--- Iniciando Cliente Veadotube ---");
    const client = new VeadotubeClient();

    client.on('instanceStart', (instance: VeadotubeInstance) => {
        console.log(`\nEVENTO [instanceStart] -> Nueva instancia detectada: ${instance.name} (${instance.id})`);
        const connection = client.createConnection(instance);

        // Ejemplo: Después de 5 segundos, intentar cambiar el estado del avatar
        setTimeout(() => {
            console.log(`\n[ACCIÓN] Intentando cambiar al estado 'happy' en la instancia ${instance.id}`);
            // NOTA: El ID del estado 'happy' puede variar. Debes obtenerlo de la lista de estados.
            connection.setAvatarState('happy');
        }, 5000);
    });

    client.on('instanceEnd', (instanceId: string) => {
        console.log(`\nEVENTO [instanceEnd] -> Instancia finalizada: ${instanceId}`);
    });

    client.on('connectionReceive', (connection: VeadotubeConnection, message: VeadotubeMessage) => {
        console.log(`\nEVENTO [connectionReceive] -> Mensaje de ${connection.instance.id}:`);
        console.log(JSON.stringify(message, null, 2));

        // Manejar la lista de estados recibida
        if (message.payload?.states) {
            console.log("-> Lista de estados disponibles:", message.payload.states.map((s: any) => s.id));
        }
        // Manejar el estado actual recibido
        if (message.payload?.state) {
            console.log("-> Estado actual del avatar:", message.payload.state);
        }
    });

    client.on('connectionError', (connection: VeadotubeConnection, error: Error) => {
        console.error(`\nEVENTO [connectionError] -> Error en ${connection.instance.id}:`, error.message);
    });

    try {
        client.startInstanceDiscovery();
    } catch (error) {
        if (error instanceof Error) {
            console.error("No se pudo iniciar el descubrimiento de instancias:", error.message);
        }
    }

    // Mantener el script en ejecución (para un script de servidor)
    // process.stdin.resume();
}

main();