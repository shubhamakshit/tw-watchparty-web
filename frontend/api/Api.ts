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

    // ---- Aria2 downloader ----

    static ARIA2_LIST(): string {
        return `${APIManager.baseUrl}/aria2/downloads`;
    }

    static ARIA2_ADD(): string {
        return `${APIManager.baseUrl}/aria2/add`;
    }

    static ARIA2_PAUSE(gid: string): string {
        return `${APIManager.baseUrl}/aria2/pause/${gid}`;
    }

    static ARIA2_RESUME(gid: string): string {
        return `${APIManager.baseUrl}/aria2/resume/${gid}`;
    }

    static ARIA2_REMOVE(gid: string): string {
        return `${APIManager.baseUrl}/aria2/remove/${gid}`;
    }

    static ARIA2_PURGE(): string {
        return `${APIManager.baseUrl}/aria2/purge`;
    }

    // ---- File Explorer ----

    static EXPLORER_LIST(path = ''): string {
        return `${APIManager.baseUrl}/explorer/${path}`;
    }

    static EXPLORER_DELETE(): string {
        return `${APIManager.baseUrl}/explorer/delete`;
    }

    // ---- Server Config ----

    static GET_CONFIG(): string {
        return `${APIManager.baseUrl}/config`;
    }

    static UPDATE_CONFIG(): string {
        return `${APIManager.baseUrl}/config`;
    }

    // ---- Acer Scraper ----

    static ACER_SEARCH(): string {
        return `${APIManager.baseUrl}/acer/search`;
    }

    static ACER_QUALITIES(): string {
        return `${APIManager.baseUrl}/acer/qualities`;
    }

    static ACER_EPISODES(): string {
        return `${APIManager.baseUrl}/acer/episodes`;
    }

    static ACER_DOWNLOAD(): string {
        return `${APIManager.baseUrl}/acer/download`;
    }

    // ---- Watch History & File Manager Extras ----

    static EXPLORER_MKDIR(): string {
        return `${APIManager.baseUrl}/explorer/mkdir`;
    }

    static EXPLORER_RENAME(): string {
        return `${APIManager.baseUrl}/explorer/rename`;
    }

    static EXPLORER_COPY(): string {
        return `${APIManager.baseUrl}/explorer/copy`;
    }

    static EXPLORER_MOVE(): string {
        return `${APIManager.baseUrl}/explorer/move`;
    }

    static EXPLORER_UPLOAD(): string {
        return `${APIManager.baseUrl}/explorer/upload`;
    }

    static EXPLORER_ZIP(): string {
        return `${APIManager.baseUrl}/explorer/zip`;
    }

    static EXPLORER_UNZIP(): string {
        return `${APIManager.baseUrl}/explorer/unzip`;
    }

    static GET_HISTORY(): string {
        return `${APIManager.baseUrl}/history`;
    }

    static UPDATE_HISTORY(): string {
        return `${APIManager.baseUrl}/history/resume`;
    }
}

export default APIManager;