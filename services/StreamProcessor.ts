
interface StreamFrame {
    imageData: string; // Base64 encoded image
    timestamp: number;
    frameId: string;
}

interface StreamProcessorOptions {
    streamUrl: string;
    onFrameCapture?: (frame: StreamFrame) => void;
    captureInterval?: number; // milliseconds between captures
}

class StreamProcessor {
    private canvas: HTMLCanvasElement | null = null;
    private video: HTMLVideoElement | null = null;
    private captureInterval: NodeJS.Timeout | null = null;
    private isProcessing: boolean = false;
    private frameCounter: number = 0;

    constructor() {
        if (typeof document !== 'undefined') {
            // Create hidden canvas for frame extraction
            this.canvas = document.createElement('canvas');
            this.canvas.style.display = 'none';
            document.body.appendChild(this.canvas);

            // Create hidden video element
            this.video = document.createElement('video');
            this.video.style.display = 'none';
            this.video.crossOrigin = 'anonymous';
            this.video.muted = true;
            document.body.appendChild(this.video);
        }
    }

    /**
     * Iniciar procesamiento del stream de video
     */
    async startProcessing(options: StreamProcessorOptions): Promise<boolean> {
        try {
            if (!this.video || !this.canvas) {
                console.error('[StreamProcessor] Canvas o Video no disponible');
                return false;
            }

            if (this.isProcessing) {
                console.log('[StreamProcessor] Ya procesando stream');
                return true;
            }

            console.log('[StreamProcessor] Iniciando procesamiento de stream:', options.streamUrl);

            // Configure video source
            this.video.src = options.streamUrl;
            this.video.load();

            return new Promise((resolve, reject) => {
                if (!this.video) {
                    reject(new Error('Video element not available'));
                    return;
                }

                this.video.onloadedmetadata = () => {
                    if (!this.video || !this.canvas) return;

                    // Set canvas dimensions to match video
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;

                    // Start video playback
                    this.video.play().then(() => {
                        this.isProcessing = true;
                        this.startFrameCapture(options);
                        resolve(true);
                    }).catch(reject);
                };

                this.video.onerror = (error) => {
                    console.error('[StreamProcessor] Error cargando video:', error);
                    reject(error);
                };
            });

        } catch (error) {
            console.error('[StreamProcessor] Error iniciando procesamiento:', error);
            return false;
        }
    }

    /**
     * Detener procesamiento del stream
     */
    stopProcessing(): void {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }

        if (this.video) {
            this.video.pause();
            this.video.src = '';
        }

        this.isProcessing = false;
        this.frameCounter = 0;
        console.log('[StreamProcessor] Procesamiento detenido');
    }

    /**
     * Iniciar captura de frames del video
     */
    private startFrameCapture(options: StreamProcessorOptions): void {
        const interval = options.captureInterval || 1000; // Default 1 frame per second

        this.captureInterval = setInterval(() => {
            const frame = this.captureCurrentFrame();
            if (frame && options.onFrameCapture) {
                options.onFrameCapture(frame);
            }
        }, interval);

        console.log(`[StreamProcessor] Captura de frames iniciada (cada ${interval}ms)`);
    }

    /**
     * Capturar frame actual del video como base64
     */
    private captureCurrentFrame(): StreamFrame | null {
        try {
            if (!this.video || !this.canvas || this.video.readyState < 2) {
                return null;
            }

            const ctx = this.canvas.getContext('2d');
            if (!ctx) {
                console.error('[StreamProcessor] No se pudo obtener contexto 2D');
                return null;
            }

            // Draw current video frame to canvas
            ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            // Convert to base64
            const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
            
            // Remove data:image/jpeg;base64, prefix
            const base64Data = imageData.split(',')[1];

            this.frameCounter++;

            return {
                imageData: base64Data,
                timestamp: Date.now(),
                frameId: `frame_${this.frameCounter}_${Date.now()}`
            };

        } catch (error) {
            console.error('[StreamProcessor] Error capturando frame:', error);
            return null;
        }
    }

    /**
     * Capturar frame único bajo demanda
     */
    async captureFrame(): Promise<StreamFrame | null> {
        if (!this.isProcessing) {
            console.warn('[StreamProcessor] Stream no está siendo procesado');
            return null;
        }

        return this.captureCurrentFrame();
    }

    /**
     * Verificar si está procesando
     */
    isStreamProcessing(): boolean {
        return this.isProcessing;
    }

    /**
     * Limpiar recursos
     */
    cleanup(): void {
        this.stopProcessing();

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
        }

        if (this.video && this.video.parentNode) {
            this.video.parentNode.removeChild(this.video);
            this.video = null;
        }
    }
}

// Singleton instance
let streamProcessorInstance: StreamProcessor | null = null;

export const getStreamProcessor = (): StreamProcessor => {
    if (!streamProcessorInstance) {
        streamProcessorInstance = new StreamProcessor();
    }
    return streamProcessorInstance;
};

export default StreamProcessor;
export type { StreamFrame, StreamProcessorOptions };
