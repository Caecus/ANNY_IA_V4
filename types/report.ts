export type ReportPayload = {
    functionality:
    | 'Solicitud de Ayuda'
    | 'Reconocimiento de Imagen'
    | 'Reconocimiento de Texto'
    | 'Reconocimiento de Billete'
    | 'Ayuda mediante Videollamada'
    | 'Solicitud de Ubicacion actual'
    | 'Navegacion por Mapas';
    userId: string;
    email: string;
    role: string;
    name: string;
};
