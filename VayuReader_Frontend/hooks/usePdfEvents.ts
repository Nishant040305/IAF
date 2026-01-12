import { useEffect, useRef } from 'react';
import { PDF_BASE_URL } from '@/constants/config';

// Define supported event types
export type PdfEventType = 'connected' | 'PDF_ADDED' | 'PDF_UPDATED' | 'PDF_DELETED';

export interface PdfEventPayload {
    message?: string;
    id?: string;
    title?: string;
    category?: string;
    [key: string]: any;
}

export type PdfEvent = {
    type: PdfEventType;
    data: PdfEventPayload;
};

/**
 * Hook to subscribe to Server-Sent Events for PDF updates.
 * 
 * @param onEvent Callback function to handle incoming events
 * @param dependencies Optional dependency array to re-subscribe if changed
 */
export const usePdfEvents = (
    onEvent: (event: PdfEvent) => void,
    dependencies: any[] = []
) => {
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        let es: EventSource | null = null;

        const connect = () => {
            // Ensure we have a valid URL
            if (!PDF_BASE_URL) return;

            const url = `${PDF_BASE_URL}/api/events`;
            console.log('[SSE] Connecting to:', url);

            // Create EventSource connection
            // Note: This relies on Expo/React Native Polyfill for EventSource
            // If authenticating via cookies, standard EventSource usually handles it automatically
            es = new EventSource(url);
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log('[SSE] Connection established');
            };

            // Handle 'connected' event
            es.addEventListener('connected', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    // console.log('[SSE] Connected payload:', data);
                    onEvent({ type: 'connected', data });
                } catch (e) {
                    console.error('[SSE] Failed to parse connected event', e);
                }
            });

            // Handle PDF Added
            es.addEventListener('PDF_ADDED', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[SSE] PDF Added:', data.title);
                    onEvent({ type: 'PDF_ADDED', data });
                } catch (e) {
                    console.error('[SSE] Failed to parse PDF_ADDED event', e);
                }
            });

            // Handle PDF Updated
            es.addEventListener('PDF_UPDATED', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[SSE] PDF Updated:', data.title);
                    onEvent({ type: 'PDF_UPDATED', data });
                } catch (e) {
                    console.error('[SSE] Failed to parse PDF_UPDATED event', e);
                }
            });

            // Handle PDF Deleted
            es.addEventListener('PDF_DELETED', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[SSE] PDF Deleted:', data.title);
                    onEvent({ type: 'PDF_DELETED', data });
                } catch (e) {
                    console.error('[SSE] Failed to parse PDF_DELETED event', e);
                }
            });

            es.onerror = (error: any) => {
                // SSE automatically retries on error, but we log it
                // console.log('[SSE] Connection error (will auto-retry):', error);
            };
        };

        connect();

        // Cleanup function
        return () => {
            if (es) {
                console.log('[SSE] Closing connection');
                es.close();
                eventSourceRef.current = null;
            }
        };
    }, dependencies);
};
