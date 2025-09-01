interface ParseResult<T = any> {
    success: boolean;
    value: T;
    type: string;
    error?: string;
}

interface Parser<T = any> {
    name: string;
    canParse: (value: string) => boolean;
    parse: (value: string) => T;
    priority: number; // Menor número = mayor prioridad
}

class ExtensibleParser {
    private parsers: Parser[] = [];

    constructor() {
        // Registrar parsers por defecto
        this.registerDefaultParsers();
    }

    // Registrar un nuevo parser
    registerParser<T>(parser: Parser<T>): void {
        this.parsers.push(parser);
        // Ordenar por prioridad
        this.parsers.sort((a, b) => a.priority - b.priority);
    }

    // Remover un parser por nombre
    removeParser(name: string): boolean {
        const index = this.parsers.findIndex(p => p.name === name);
        if (index !== -1) {
            this.parsers.splice(index, 1);
            return true;
        }
        return false;
    }

    // Parsear valor con intentos múltiples
    safeParse<T = any>(value: any): ParseResult<T> {
        // Si no es string o es null/undefined, retornar tal como está
        if (value == null || typeof value !== 'string') {
            return {
                success: true,
                value: value as T,
                type: typeof value
            };
        }

        const trimmed = value.trim();

        // Si es string vacío
        if (!trimmed) {
            return {
                success: true,
                value: trimmed as T,
                type: 'string'
            };
        }

        // Intentar con cada parser registrado
        for (const parser of this.parsers) {
            // console.log(`Intentando parser '${parser.name}' para: "${trimmed.substring(0,50)}..."`); // Debugging line
            if (parser.canParse(trimmed)) {
                try {
                    const parsed = parser.parse(trimmed);
                    return {
                        success: true,
                        value: parsed as T,
                        type: parser.name
                    };
                } catch (error: any) {
                    console.warn(`Parser '${parser.name}' falló:`, error.message); // Usar error.message para un log más limpio
                    // Continúa al siguiente parser si falla
                    continue;
                }
            }
        }

        // Si ningún parser funcionó, retornar string original (o un error si se prefiere no-string)
        return {
            success: true,
            value: trimmed as T, // Considerar si esto debe ser 'error: No parser found'
            type: 'string'
        };
    }

    private registerDefaultParsers(): void {
        // Parser para JSON estricto
        this.registerParser({
            name: 'json-strict',
            priority: 1,
            canParse: (value: string) => {
                return (value.startsWith('{') && value.endsWith('}')) ||
                    (value.startsWith('[') && value.endsWith(']'));
            },
            parse: (value: string) => JSON.parse(value)
        });

        // NUEVO PARSER: Para JSON con prefijo (ej. "instance:{...}" o "data:[...]")
        this.registerParser({
            name: 'prefixed-json',
            priority: 1.5, // Ejecutar después de json-strict, pero antes de json-sloppy
            canParse: (value: string) => {
                const firstColonIndex = value.indexOf(':');
                if (firstColonIndex === -1) return false;

                const contentAfterColon = value.substring(firstColonIndex + 1).trim();
                // Check if the content after the colon starts with { or [
                return contentAfterColon.startsWith('{') || contentAfterColon.startsWith('[');
            },
            parse: (value: string) => {
                const firstColonIndex = value.indexOf(':');
                const prefix = value.substring(0, firstColonIndex).trim();
                const jsonString = value.substring(firstColonIndex + 1).trim();

                // Recursively use safeParse for the JSON content
                // This allows the inner JSON to be strict or sloppy itself
                const parsedContent = this.safeParse(jsonString).value;

                return { [prefix]: parsedContent }; // Return an object with the prefix as key
            }
        });

        // Parser para JSON "sloppy" (con correcciones)
        this.registerParser({
            name: 'json-sloppy',
            priority: 2,
            canParse: (value: string) => {
                // Modificado para ser un poco más restrictivo, aunque la prioridad del prefixed-json lo manejará.
                // Intentará si contiene llaves o corchetes, o si parece un conjunto de pares clave-valor (con : y ,)
                return (value.includes('{') || value.includes('[')) ||
                       (value.includes(':') && value.includes(','));
            },
            parse: (value: string) => {
                let fixed = value;

                // Agregar comillas a las claves si no las tienen
                fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

                // Convertir comillas simples a dobles en valores string
                fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');

                // Manejar valores sin comillas que parecen strings o que podrían ser números/booleanos
                // Esta parte es delicada y podría necesitar más ajustes según los casos.
                // Por ejemplo, `key:value` se convertiría en `key:"value"`.
                // Si el valor es un número o booleano, no debería ir entre comillas.
                fixed = fixed.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*|true|false|null)\s*([,}])/g, (match, p1, p2) => {
                    const lowerP1 = p1.toLowerCase();
                    if (lowerP1 === 'true' || lowerP1 === 'false' || lowerP1 === 'null' || !isNaN(Number(p1))) {
                        return `: ${p1}${p2}`; // Ya es un tipo JSON válido, no agregar comillas
                    }
                    return `: "${p1}"${p2}`; // Es un string sin comillas, agregar comillas
                });
                
                // Remover comas finales
                fixed = fixed.replace(/,\s*([}\]])/g, '$1');

                // Intentar agregar llaves faltantes si parece un objeto pero no empieza con '{'
                if (fixed.includes(':') && !fixed.trim().startsWith('{') && !fixed.trim().startsWith('[')) {
                    fixed = `{${fixed}}`;
                }

                return JSON.parse(fixed);
            }
        });

        // Parser para números
        this.registerParser({
            name: 'number',
            priority: 3,
            canParse: (value: string) => {
                return /^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(value);
            },
            parse: (value: string) => {
                const num = Number(value);
                if (isNaN(num)) throw new Error('No es un número válido');
                return num;
            }
        });

        // Parser para booleanos
        this.registerParser({
            name: 'boolean',
            priority: 4,
            canParse: (value: string) => {
                const lower = value.toLowerCase();
                return lower === 'true' || lower === 'false' ||
                    lower === 'yes' || lower === 'no' ||
                    lower === 'on' || lower === 'off' ||
                    lower === '1' || lower === '0';
            },
            parse: (value: string) => {
                const lower = value.toLowerCase();
                return lower === 'true' || lower === 'yes' ||
                    lower === 'on' || lower === '1';
            }
        });

        // Parser para fechas ISO
        this.registerParser({
            name: 'date-iso',
            priority: 5,
            canParse: (value: string) => {
                return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value);
            },
            parse: (value: string) => new Date(value)
        });

        // Parser para URLs
        this.registerParser({
            name: 'url',
            priority: 6,
            canParse: (value: string) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            parse: (value: string) => new URL(value)
        });

        // Parser para arrays separados por comas
        this.registerParser({
            name: 'csv-array',
            priority: 7,
            canParse: (value: string) => {
                return value.includes(',') && !value.includes('{') && !value.includes('[');
            },
            parse: (value: string) => {
                return value.split(',').map(item => {
                    const trimmed = item.trim();
                    // Intentar parsear cada elemento recursivamente
                    const result = this.safeParse(trimmed);
                    return result.value;
                });
            }
        });

        // Parser para null/undefined
        this.registerParser({
            name: 'null',
            priority: 8,
            canParse: (value: string) => {
                const lower = value.toLowerCase();
                return lower === 'null' || lower === 'undefined' || lower === 'none';
            },
            parse: (value: string) => {
                const lower = value.toLowerCase();
                return lower === 'undefined' ? undefined : null;
            }
        });
    }

    // Método de conveniencia que solo retorna el valor
    parse<T = any>(value: any): T {
        return this.safeParse<T>(value).value;
    }

    // Obtener información sobre todos los parsers registrados
    getRegisteredParsers(): string[] {
        return this.parsers.map(p => p.name);
    }
}

// Crear instancia global
const parser = new ExtensibleParser();

// Función de conveniencia para mantener compatibilidad
function safeParse<T = any>(value: any): T {
    return parser.parse<T>(value);
}

// Función que retorna información completa del parsing
function safeParseWithInfo<T = any>(value: any): ParseResult<T> {
    return parser.safeParse<T>(value);
}

// Exportar para uso
export {
    ExtensibleParser,
    safeParse,
    safeParseWithInfo,
    parser as defaultParser,
    type Parser,
    type ParseResult
};