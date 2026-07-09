class APIManager {
    static baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}` 
        : 'http://localhost:8000';

    // ---- Instance lifecycle ----

    static START(): string {
        return `${APIManager.baseUrl}/vlc/start`;
    }

    static RECONFIGURE(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/reconfigure`;
    }

    static LIST_INSTANCES(): string {
        return `${APIManager.baseUrl}/vlc/instances`;
    }

    static GET_INSTANCE(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}`;
    }

    static STOP(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/stop`;
    }

    static KILL(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/kill`;
    }

    static DELETE(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}`;
    }

    static LOGS(instanceId: string, lines = 50): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/logs?lines=${lines}`;
    }

    // ---- Per-instance control ----

    static EXECUTE(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/exec`;
    }

    static VOLUME(instanceId: string, val: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/volume?val=${encodeURIComponent(val)}`;
    }

    static TRACK(instanceId: string, type: string, val: number): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/track?type=${encodeURIComponent(type)}&val=${val}`;
    }

    static STATUS(instanceId: string): string {
        return `${APIManager.baseUrl}/vlc/${instanceId}/status`;
    }

    // ---- Filesystem browsing ----

    static MOVIES(path = ''): string {
        return `${APIManager.baseUrl}/movies/${path}`;
    }

    static PROBE(path = ''): string {
        return `${APIManager.baseUrl}/movies/probe/${path}`;
    }
}

export default APIManager;