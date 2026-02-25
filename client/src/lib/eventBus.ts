/**
 * Lightweight typed event bus for cross-component communication
 * and future AI/integration readiness.
 *
 * Usage:
 *   eventBus.emit("project.created", { projectId: 1 });
 *   const unsub = eventBus.on("project.created", (data) => console.log(data));
 *   unsub(); // cleanup
 */

type EventMap = {
    "project.created": { projectId: number; name: string };
    "project.updated": { projectId: number };
    "project.deleted": { projectId: number };
    "task.created": { taskId: number; projectId: number };
    "task.updated": { taskId: number; projectId: number };
    "task.deleted": { taskId: number; projectId: number };
    "risk.created": { riskId: number; projectId: number };
    "tag.added": { tagId: number; projectId: number; label: string };
    "view.saved": { viewId: number; name: string };
    "navigate": { path: string };
    "command.execute": { command: string; payload?: unknown };
};

type EventKey = keyof EventMap;
type Handler<K extends EventKey> = (data: EventMap[K]) => void;

const listeners = new Map<EventKey, Set<Handler<any>>>();

export const eventBus = {
    on<K extends EventKey>(event: K, handler: Handler<K>): () => void {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(handler);
        return () => {
            listeners.get(event)?.delete(handler);
        };
    },

    emit<K extends EventKey>(event: K, data: EventMap[K]): void {
        listeners.get(event)?.forEach((handler) => {
            try {
                handler(data);
            } catch (err) {
                console.error(`[eventBus] Error in handler for "${event}":`, err);
            }
        });
    },

    /** Remove all listeners (useful for testing) */
    clear(): void {
        listeners.clear();
    },
};

export type { EventMap, EventKey };
