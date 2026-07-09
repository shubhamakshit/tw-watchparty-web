'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ActionIcon,
    AppShell,
    Badge,
    Burger,
    Button,
    Card,
    Divider,
    Grid,
    Group,
    Modal,
    NumberInput,
    Progress,
    ScrollArea,
    Select,
    SimpleGrid,
    Slider,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
    Title,
    useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconArrowLeft,
    IconFolder,
    IconMovie,
    IconPlus,
    IconRefresh,
    IconTrash,
    IconSun,
    IconMoon,
    IconVolume,
    IconVolumeOff,
} from '@tabler/icons-react';
import APIManager from '@/api/Api';

// ---------- Types ----------

export interface StartVLCRequest {
    video_path: string;
    stream_key?: string | null;
    rtmp_url?: string | null;
    loop: boolean;
    video_bitrate: number;
    audio_bitrate: number;
    fps: number;
    name?: string | null;
    audio_track?: number | null;
    sub_track?: number | null;
    scale: string;
    vcodec: string;
    acodec: string;
    samplerate: number;
    preset: string;
    keyint: number;
}

export interface InstanceInfo {
    id: string;
    name: string;
    pid: number | null;
    telnet_port: number;
    http_port: number;
    video_path: string;
    status: string;
    started_at: number | null;
    returncode: number | null;
    start_req?: StartVLCRequest | null;
}

export type ExecuteResponse = {
    status: string;
    message: string;
};

export interface StatusResponse {
    status: string;
    message: Message;
}

export interface Message {
    fullscreen: number;
    stats: { [key: string]: number };
    seek_sec: number;
    apiversion: number;
    currentplid: number;
    time: number;
    volume: number;
    length: number;
    random: boolean;
    audiofilters: { filter_0: string };
    information: Information;
    rate: number;
    videoeffects: {
        hue: number;
        saturation: number;
        contrast: number;
        brightness: number;
        gamma: number;
    };
    state: string;
    loop: boolean;
    version: string;
    position: number;
    audiodelay: number;
    repeat: boolean;
    subtitledelay: number;
    equalizer: never[];
}

export interface Information {
    chapter: number;
    chapters: number[];
    title: number;
    category: Category;
    titles: number[];
}

export type StreamInfo = { [field: string]: string };

export interface Meta {
    title?: string;
    filename?: string;
    DURATION?: string;
    [key: string]: string | undefined;
}

export interface Category {
    meta?: Meta;
    [streamKey: string]: StreamInfo | Meta | undefined;
}

interface LogEntry {
    id: number;
    command: string;
    response: ExecuteResponse;
    timestamp: string;
}

// ---------- Helpers ----------

function formatTime(seconds: number): string {
    if (!seconds || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function isStreamInfo(entry: StreamInfo | Meta | undefined): entry is StreamInfo {
    return !!entry && typeof entry === 'object' && 'Type' in entry;
}

function statusColor(status: string): string {
    if (status === 'running') return 'green';
    if (status === 'starting') return 'yellow';
    if (status === 'error') return 'red';
    return 'gray';
}

// ---------- Component ----------

export default function Home() {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    const [navOpened, { toggle: toggleNav }] = useDisclosure();
    const [startModalOpened, { open: openStartModal, close: closeStartModal }] = useDisclosure();

    // Instances
    const [instances, setInstances] = useState<InstanceInfo[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [instancesLoading, setInstancesLoading] = useState(false);

    // Active instance status
    const [status, setStatus] = useState<StatusResponse | null>(null);

    // Start-form state
    const [videoPath, setVideoPath] = useState('');
    const [streamKey, setStreamKey] = useState('');
    const [rtmpUrl, setRtmpUrl] = useState('');
    const [loop, setLoop] = useState(true);
    const [videoBitrate, setVideoBitrate] = useState<number>(3000); // default to 3000
    const [audioBitrate, setAudioBitrate] = useState<number>(128);
    const [fps, setFps] = useState<number>(60); // default to 60
    const [scale, setScale] = useState('Auto');
    const [vcodec, setVcodec] = useState('h264');
    const [acodec, setAcodec] = useState('mp4a');
    const [samplerate, setSamplerate] = useState<number>(44100);
    const [preset, setPreset] = useState('veryfast');
    const [keyint, setKeyint] = useState<number>(60);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isReconfiguring, setIsReconfiguring] = useState(false);
    const [shouldAutoSelectTracks, setShouldAutoSelectTracks] = useState(true);

    const [instanceName, setInstanceName] = useState('');
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);

    const populateForm = (req: StartVLCRequest) => {
        setVideoPath(req.video_path);
        setStreamKey(req.stream_key || '');
        setRtmpUrl(req.rtmp_url || '');
        setLoop(req.loop);
        setVideoBitrate(req.video_bitrate);
        setAudioBitrate(req.audio_bitrate);
        setFps(req.fps);
        setScale(req.scale || 'Auto');
        setVcodec(req.vcodec || 'h264');
        setAcodec(req.acodec || 'mp4a');
        setSamplerate(req.samplerate || 44100);
        setPreset(req.preset || 'veryfast');
        setKeyint(req.keyint || 60);
        setSelectedAudioTrack(req.audio_track ?? null);
        setSelectedSubTrack(req.sub_track ?? null);
        setInstanceName(req.name || '');
    };

    const resetForm = () => {
        setVideoPath('');
        setLoop(true);
        setVideoBitrate(3000);
        setAudioBitrate(128);
        setFps(60);
        setScale('Auto');
        setVcodec('h264');
        setAcodec('mp4a');
        setSamplerate(44100);
        setPreset('veryfast');
        setKeyint(60);
        setSelectedAudioTrack(null);
        setSelectedSubTrack(null);
        setInstanceName('');
        setStartError(null);
    };

    const handleReconfigOpen = () => {
        if (!activeInstance) return;
        setIsReconfiguring(true);
        setShouldAutoSelectTracks(false);
        const req = activeInstance.start_req || {
            video_path: activeInstance.video_path,
            loop: true,
            video_bitrate: 3000,
            audio_bitrate: 128,
            fps: 60,
            scale: 'Auto',
            vcodec: 'h264',
            acodec: 'mp4a',
            samplerate: 44100,
            preset: 'veryfast',
            keyint: 60,
            audio_track: null,
            sub_track: null,
            name: activeInstance.name,
            stream_key: localStorage.getItem('twitch_stream_key') || '',
            rtmp_url: localStorage.getItem('rtmp_url') || '',
        };
        populateForm(req as StartVLCRequest);
        openStartModal();
    };

    const handleStartNewOpen = () => {
        setIsReconfiguring(false);
        setShouldAutoSelectTracks(true);
        resetForm();
        const savedTwitch = localStorage.getItem('twitch_stream_key') || '';
        const savedRtmp = localStorage.getItem('rtmp_url') || '';
        setStreamKey(savedTwitch);
        setRtmpUrl(savedRtmp);
        openStartModal();
    };

    // Movie Browser State
    const [browserOpened, { open: openBrowser, close: closeBrowser }] = useDisclosure();
    const [browserPath, setBrowserPath] = useState('');
    const [browserContents, setBrowserContents] = useState<{ files: string[]; subfolders: string[] } | null>(null);
    const [browserLoading, setBrowserLoading] = useState(false);
    const [browserError, setBrowserError] = useState<string | null>(null);

    // Track Probing State
    const [audioTracks, setAudioTracks] = useState<{
        vlc_index: number;
        ffprobe_index: number;
        codec: string;
        language: string;
        title: string;
    }[]>([]);
    const [subTracks, setSubTracks] = useState<{
        vlc_index: number;
        ffprobe_index: number;
        codec: string;
        language: string;
        title: string;
    }[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | null>(null);
    const [selectedSubTrack, setSelectedSubTrack] = useState<number | null>(null);
    const [probing, setProbing] = useState(false);
    const [probeError, setProbeError] = useState<string | null>(null);
    const [instanceLogs, setInstanceLogs] = useState<string[]>([]);

    // Active instance control QOL states
    const [activeAudioTracks, setActiveAudioTracks] = useState<any[]>([]);
    const [activeSubTracks, setActiveSubTracks] = useState<any[]>([]);
    const [activeAudioTrack, setActiveAudioTrack] = useState<number | null>(null);
    const [activeSubTrack, setActiveSubTrack] = useState<number | null>(null);
    const [volume, setVolume] = useState<number>(100);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [prevVolume, setPrevVolume] = useState<number>(100);

    // Command console
    const [command, setCommand] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [sending, setSending] = useState(false);

    // Progress bar interaction
    const [hoverPct, setHoverPct] = useState<number | null>(null);
    const [seekPreview, setSeekPreview] = useState<number | null>(null);
    const progressBarRef = useRef<HTMLDivElement | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const instancesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logIdRef = useRef(0);
    const activeIdRef = useRef<string | null>(null);

    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    // Poll the instance list every 3s
    useEffect(() => {
        const fetchInstances = () => {
            setInstancesLoading(true);
            fetch(APIManager.LIST_INSTANCES(), { method: 'GET' })
                .then((res) => res.json())
                .then((res: InstanceInfo[]) => {
                    setInstances(res);
                    // Auto-select the first running instance if nothing is selected
                    setActiveId((prev) => {
                        if (prev && res.some((i) => i.id === prev)) return prev;
                        return res[0]?.id ?? null;
                    });
                })
                .catch(() => {})
                .finally(() => setInstancesLoading(false));
        };

        fetchInstances();
        instancesPollRef.current = setInterval(fetchInstances, 3000);
        return () => {
            if (instancesPollRef.current) clearInterval(instancesPollRef.current);
        };
    }, []);

    // Load twitch key, rtmpUrl, and check play query param on mount
    useEffect(() => {
        const savedKey = localStorage.getItem('twitch_stream_key');
        if (savedKey) setStreamKey(savedKey);
        const savedRtmp = localStorage.getItem('rtmp_url');
        if (savedRtmp) setRtmpUrl(savedRtmp);

        const urlParams = new URLSearchParams(window.location.search);
        const playPath = urlParams.get('play');
        if (playPath) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsReconfiguring(false);
            setVideoPath(playPath);
            openStartModal();
        }
    }, []);

    // Fetch movies directory contents for browser
    useEffect(() => {
        if (!browserOpened) return;
        setBrowserLoading(true);
        setBrowserError(null);
        fetch(APIManager.MOVIES(browserPath))
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load movies directory');
                return res.json();
            })
            .then((data) => {
                setBrowserContents(data.message);
            })
            .catch((err) => {
                setBrowserError(err.message || String(err));
                setBrowserContents(null);
            })
            .finally(() => setBrowserLoading(false));
    }, [browserPath, browserOpened]);

    // Probe video file when videoPath is selected/typed
    useEffect(() => {
        if (!videoPath.trim()) {
            setAudioTracks([]);
            setSubTracks([]);
            setSelectedAudioTrack(null);
            setSelectedSubTrack(null);
            return;
        }
        setProbing(true);
        setProbeError(null);
        fetch(APIManager.PROBE(videoPath))
            .then((res) => {
                if (!res.ok) throw new Error('Failed to probe video file');
                return res.json();
            })
            .then((data) => {
                setAudioTracks(data.audio || []);
                setSubTracks(data.subtitle || []);
                // Auto-select the first available track if there are any
                if (shouldAutoSelectTracks) {
                    if (data.audio && data.audio.length > 0) {
                        setSelectedAudioTrack(data.audio[0].vlc_index);
                    } else {
                        setSelectedAudioTrack(null);
                    }
                    if (data.subtitle && data.subtitle.length > 0) {
                        setSelectedSubTrack(data.subtitle[0].vlc_index);
                    } else {
                        setSelectedSubTrack(null);
                    }
                }
            })
            .catch((err) => {
                setProbeError(err.message || String(err));
                setAudioTracks([]);
                setSubTracks([]);
                setSelectedAudioTrack(null);
                setSelectedSubTrack(null);
            })
            .finally(() => {
                setProbing(false);
                setShouldAutoSelectTracks(true);
            });
    }, [videoPath, shouldAutoSelectTracks]);

    // Poll status and logs of the active instance every 1s
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus(null);
        setInstanceLogs([]);

        if (!activeId) return;

        const fetchData = () => {
            const id = activeIdRef.current;
            if (!id) return;
            // Fetch status
            fetch(APIManager.STATUS(id), { method: 'GET' })
                .then((res) => res.json())
                .then((res: StatusResponse) => {
                    if (activeIdRef.current === id) {
                        setStatus(res);
                        if (res.message && typeof res.message.volume === 'number') {
                            const currentVolPct = Math.round((res.message.volume / 256) * 100);
                            setVolume(currentVolPct);
                            setIsMuted(res.message.volume === 0);
                        }
                    }
                })
                .catch(() => {});
            // Fetch logs
            fetch(APIManager.LOGS(id), { method: 'GET' })
                .then((res) => res.json())
                .then((res) => {
                    if (activeIdRef.current === id && res.status === 'success') {
                        setInstanceLogs(res.message);
                    }
                })
                .catch(() => {});
        };

        fetchData();
        pollRef.current = setInterval(fetchData, 1000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeId]);

    // Probe active instance video path for QOL controls
    useEffect(() => {
        const activeInst = instances.find((i) => i.id === activeId);
        if (!activeInst) {
            setActiveAudioTracks([]);
            setActiveSubTracks([]);
            return;
        }
        fetch(APIManager.PROBE(activeInst.video_path))
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((data) => {
                setActiveAudioTracks(data.audio || []);
                setActiveSubTracks(data.subtitle || []);
            })
            .catch(() => {
                setActiveAudioTracks([]);
                setActiveSubTracks([]);
            });
    }, [activeId, instances]);

    const handleVolumeChange = (val: number) => {
        if (!activeId) return;
        setVolume(val);
        setIsMuted(val === 0);
        // VLC volume is 0-512, where 256 is 100%
        const vlcVol = Math.round((val / 100) * 256);
        fetch(APIManager.VOLUME(activeId, String(vlcVol)), { method: 'POST' }).catch(() => {});
    };

    const handleMuteToggle = () => {
        if (!activeId) return;
        if (isMuted) {
            handleVolumeChange(prevVolume || 100);
            setIsMuted(false);
        } else {
            setPrevVolume(volume);
            handleVolumeChange(0);
            setIsMuted(true);
        }
    };

    const handleTrackChange = (type: 'audio' | 'subtitle', val: number) => {
        if (!activeId) return;
        if (type === 'audio') {
            setActiveAudioTrack(val);
        } else {
            setActiveSubTrack(val);
        }
        fetch(APIManager.TRACK(activeId, type, val), { method: 'POST' }).catch(() => {});
    };

    const sendCommand = (cmd: string) => {
        if (!activeId) return;
        setSending(true);
        fetch(APIManager.EXECUTE(activeId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd }),
        })
            .then((res) => res.json())
            .then((res: ExecuteResponse) => {
                logIdRef.current += 1;
                setLogs((prev) =>
                    [
                        { id: logIdRef.current, command: cmd, response: res, timestamp: new Date().toLocaleTimeString() },
                        ...prev,
                    ].slice(0, 50)
                );
            })
            .catch((err) => {
                logIdRef.current += 1;
                setLogs((prev) =>
                    [
                        {
                            id: logIdRef.current,
                            command: cmd,
                            response: { status: 'error', message: String(err) },
                            timestamp: new Date().toLocaleTimeString(),
                        },
                        ...prev,
                    ].slice(0, 50)
                );
            })
            .finally(() => setSending(false));
    };

    const execButtonHandler = () => {
        if (!command.trim()) return;
        sendCommand(command);
        setCommand('');
    };

    const handleStart = () => {
        setStartError(null);
        if (!videoPath.trim()) {
            setStartError('Video path is required.');
            return;
        }
        if (!streamKey.trim() && !rtmpUrl.trim()) {
            setStartError('Provide a stream key or a full RTMP URL.');
            return;
        }

        // Save Twitch key and RTMP url to localStorage
        if (streamKey.trim()) {
            localStorage.setItem('twitch_stream_key', streamKey.trim());
        } else {
            localStorage.removeItem('twitch_stream_key');
        }
        if (rtmpUrl.trim()) {
            localStorage.setItem('rtmp_url', rtmpUrl.trim());
        } else {
            localStorage.removeItem('rtmp_url');
        }

        setStarting(true);
        const url = isReconfiguring && activeId ? APIManager.RECONFIGURE(activeId) : APIManager.START();
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video_path: videoPath,
                stream_key: streamKey || undefined,
                rtmp_url: rtmpUrl || undefined,
                loop,
                video_bitrate: videoBitrate,
                audio_bitrate: audioBitrate,
                fps,
                name: instanceName || undefined,
                audio_track: selectedAudioTrack !== null ? selectedAudioTrack : undefined,
                sub_track: selectedSubTrack !== null ? selectedSubTrack : undefined,
                scale,
                vcodec,
                acodec,
                samplerate,
                preset,
                keyint,
            }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data?.detail ?? 'Failed to start VLC');
                return data as InstanceInfo;
            })
            .then((inst) => {
                setInstances((prev) => {
                    if (prev.some((i) => i.id === inst.id)) {
                        return prev.map((i) => (i.id === inst.id ? inst : i));
                    }
                    return [...prev, inst];
                });
                setActiveId(inst.id);
                closeStartModal();
                setVideoPath('');
                setInstanceName('');
            })
            .catch((err) => setStartError(String(err.message ?? err)))
            .finally(() => setStarting(false));
    };

    const stopActive = (force: boolean) => {
        if (!activeId) return;
        const url = force ? APIManager.KILL(activeId) : APIManager.STOP(activeId);
        fetch(url, { method: 'POST' })
            .then((res) => res.json())
            .then((inst: InstanceInfo) => {
                setInstances((prev) => prev.map((i) => (i.id === inst.id ? inst : i)));
            })
            .catch(() => {});
    };

    const deleteActive = () => {
        if (!activeId) return;
        const id = activeId;
        fetch(APIManager.DELETE(id), { method: 'DELETE' })
            .then(() => {
                setInstances((prev) => prev.filter((i) => i.id !== id));
                setActiveId((prev) => (prev === id ? null : prev));
            })
            .catch(() => {});
    };

    const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !message?.length) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        sendCommand(`seek ${pct.toFixed(1)}%`);
    };

    const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !message?.length) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        setHoverPct(pct);
        setSeekPreview((pct / 100) * message.length);
    };

    const activeInstance = instances.find((i) => i.id === activeId) ?? null;
    const message = status?.status !== 'error' ? status?.message : undefined;
    const category = message?.information?.category;

    const streamEntries = category
        ? Object.entries(category).filter(([key, val]) => key !== 'meta' && isStreamInfo(val))
        : [];
    const meta = category?.meta;

    const videoStream = streamEntries.find(([, v]) => (v as StreamInfo).Type === 'Video')?.[1] as StreamInfo | undefined;
    const audioStream = streamEntries.find(([, v]) => (v as StreamInfo).Type === 'Audio')?.[1] as StreamInfo | undefined;
    const subtitleStream = streamEntries.find(([, v]) => (v as StreamInfo).Type === 'Subtitle')?.[1] as
        | StreamInfo
        | undefined;

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !navOpened, desktop: false } }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between" style={{ width: '100%', flexWrap: 'nowrap' }}>
                    <Group gap="xs" style={{ flexWrap: 'nowrap' }}>
                        <Burger opened={navOpened} onClick={toggleNav} hiddenFrom="sm" size="sm" />
                        <Title order={4} style={{ whiteSpace: 'nowrap' }}>The TWITCH WatchParty Bridge</Title>
                    </Group>
                    <Group gap="xs" style={{ flexWrap: 'nowrap' }}>
                        {activeInstance && (
                            <Badge color={statusColor(activeInstance.status)}>
                                {activeInstance.name} · {activeInstance.status}
                            </Badge>
                        )}
                        <Button
                            component="a"
                            href="/manager"
                            variant="light"
                            size="sm"
                            leftSection={<IconFolder size={16} />}
                        >
                            Media Manager
                        </Button>
                        <ActionIcon
                            variant="default"
                            onClick={() => toggleColorScheme()}
                            size="lg"
                            aria-label="Toggle color scheme"
                        >
                            {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                        </ActionIcon>
                    </Group>
                </Group>
            </AppShell.Header>

            {/* ---------------- Navbar: instance manager ---------------- */}
            <AppShell.Navbar p="md">
                <ScrollArea h="100%" scrollbarSize={6} offsetScrollbars>
                    <Stack gap="xs" pr="xs">
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                                VLC Instances
                            </Text>
                            <Group gap={4}>
                                <ActionIcon
                                    variant="subtle"
                                    onClick={() =>
                                        fetch(APIManager.LIST_INSTANCES())
                                            .then((r) => r.json())
                                            .then(setInstances)
                                    }
                                    loading={instancesLoading}
                                    aria-label="Refresh instances"
                                >
                                    <IconRefresh size={16} />
                                </ActionIcon>
                                <ActionIcon variant="filled" onClick={handleStartNewOpen} aria-label="Start new instance">
                                    <IconPlus size={16} />
                                </ActionIcon>
                            </Group>
                        </Group>

                        <Select
                            placeholder="Select an instance"
                            data={instances
                                .filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index)
                                .map((i) => ({
                                    value: i.id,
                                    label: `${i.name} (${i.status})`,
                                }))}
                            value={activeId}
                            onChange={setActiveId}
                            searchable
                            nothingFoundMessage="No instances yet"
                        />

                        {activeInstance && (
                            <Card withBorder padding="xs">
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">
                                        PID: {activeInstance.pid ?? '—'}
                                    </Text>
                                    <Text size="xs" c="dimmed" truncate>
                                        {activeInstance.video_path}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        telnet:{activeInstance.telnet_port} · http:{activeInstance.http_port}
                                    </Text>
                                </Stack>
                                <Group mt="xs" grow gap={4}>
                                    <Button size="xs" color="blue" variant="light" onClick={handleReconfigOpen}>
                                        Configure
                                    </Button>
                                    <Button size="xs" color="orange" variant="light" onClick={() => stopActive(false)}>
                                        Stop
                                    </Button>
                                    <Button size="xs" color="red" variant="light" onClick={() => stopActive(true)}>
                                        Kill
                                    </Button>
                                </Group>
                                <Button
                                    size="xs"
                                    mt={6}
                                    fullWidth
                                    color="red"
                                    variant="subtle"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={deleteActive}
                                >
                                    Remove
                                </Button>
                            </Card>
                        )}

                        <Divider label="Media Controls" my="xs" />

                        <SimpleGrid cols={2}>
                            <Button onClick={() => sendCommand('play')} loading={sending} disabled={!activeId}>
                                Play
                            </Button>
                            <Button onClick={() => sendCommand('pause')} loading={sending} variant="light" disabled={!activeId}>
                                Pause
                            </Button>
                            <Button onClick={() => sendCommand('stop')} loading={sending} color="red" variant="light" disabled={!activeId}>
                                Stop
                            </Button>
                            <Button onClick={() => sendCommand('fullscreen')} loading={sending} variant="light" disabled={!activeId}>
                                Fullscreen
                            </Button>
                            <Button onClick={() => sendCommand('prev')} loading={sending} variant="light" disabled={!activeId}>
                                Previous
                            </Button>
                            <Button onClick={() => sendCommand('next')} loading={sending} variant="light" disabled={!activeId}>
                                Next
                            </Button>
                            <Button onClick={() => sendCommand('snapshot')} loading={sending} variant="light" disabled={!activeId}>
                                Snapshot
                            </Button>
                        </SimpleGrid>

                        <Divider label="Seek" my="xs" />
                        <SimpleGrid cols={2}>
                            <Button onClick={() => sendCommand('seek -60s')} variant="default" disabled={!activeId}>
                                -60s
                            </Button>
                            <Button onClick={() => sendCommand('seek +60s')} variant="default" disabled={!activeId}>
                                +60s
                            </Button>
                            <Button onClick={() => sendCommand('seek -10s')} variant="default" disabled={!activeId}>
                                -10s
                            </Button>
                            <Button onClick={() => sendCommand('seek +10s')} variant="default" disabled={!activeId}>
                                +10s
                            </Button>
                        </SimpleGrid>

                        <Divider label="Volume" my="xs" />
                        <SimpleGrid cols={2}>
                            <Button onClick={() => sendCommand('voldown 1')} variant="default" disabled={!activeId}>
                                Vol -
                            </Button>
                            <Button onClick={() => sendCommand('volup 1')} variant="default" disabled={!activeId}>
                                Vol +
                            </Button>
                        </SimpleGrid>

                        <Divider label="Playback rate" my="xs" />
                        <SimpleGrid cols={3}>
                            <Button onClick={() => sendCommand('slower')} variant="default" disabled={!activeId}>
                                Slower
                            </Button>
                            <Button onClick={() => sendCommand('normal')} variant="default" disabled={!activeId}>
                                Normal
                            </Button>
                            <Button onClick={() => sendCommand('faster')} variant="default" disabled={!activeId}>
                                Faster
                            </Button>
                        </SimpleGrid>

                        <Divider label="Toggles" my="xs" />
                        <SimpleGrid cols={3}>
                            <Button size="xs" variant={message?.loop ? 'filled' : 'default'} onClick={() => sendCommand('loop')} disabled={!activeId}>
                                Loop
                            </Button>
                            <Button size="xs" variant={message?.repeat ? 'filled' : 'default'} onClick={() => sendCommand('repeat')} disabled={!activeId}>
                                Repeat
                            </Button>
                            <Button size="xs" variant={message?.random ? 'filled' : 'default'} onClick={() => sendCommand('random')} disabled={!activeId}>
                                Random
                            </Button>
                        </SimpleGrid>

                        <Divider label="Custom command" my="xs" />
                        <TextInput
                            value={command}
                            onChange={(e) => setCommand(e.currentTarget.value)}
                            placeholder="e.g. volume 150"
                            onKeyDown={(e) => e.key === 'Enter' && execButtonHandler()}
                            disabled={!activeId}
                        />
                        <Button fullWidth onClick={execButtonHandler} loading={sending} disabled={!activeId}>
                            Execute
                        </Button>
                    </Stack>
                </ScrollArea>
            </AppShell.Navbar>

            {/* ---------------- Main: status dashboard ---------------- */}
            <AppShell.Main>
                {!activeId ? (
                    <Card withBorder>
                        <Text c="dimmed">No instance selected. Start a new VLC stream to begin.</Text>
                        <Button mt="sm" leftSection={<IconPlus size={16} />} onClick={handleStartNewOpen}>
                            Start VLC
                        </Button>
                    </Card>
                ) : (
                    <Stack gap="md">
                        <Card withBorder>
                            <Group justify="space-between" mb={4}>
                                <Text size="sm">{formatTime(message?.time ?? 0)}</Text>
                                <Text size="sm" c="dimmed">
                                    {formatTime(message?.length ?? 0)}
                                </Text>
                            </Group>

                            <div
                                ref={progressBarRef}
                                onClick={handleSeekClick}
                                onMouseMove={handleSeekHover}
                                onMouseLeave={() => setHoverPct(null)}
                                style={{ position: 'relative', cursor: message?.length ? 'pointer' : 'default', padding: '8px 0' }}
                            >
                                <Progress value={(message?.position ?? 0) * 100} animated={message?.state === 'playing'} size="lg" />
                                {hoverPct !== null && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 4,
                                                left: `${hoverPct}%`,
                                                width: 2,
                                                height: 'calc(100% - 8px)',
                                                background: 'var(--mantine-color-gray-6)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: -20,
                                                left: `${hoverPct}%`,
                                                transform: 'translateX(-50%)',
                                                background: 'var(--mantine-color-dark-6)',
                                                color: 'white',
                                                fontSize: 11,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                pointerEvents: 'none',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {formatTime(seekPreview ?? 0)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </Card>

                        <Card withBorder>
                            <Title order={5} mb="sm">
                                Live Stream Controls
                            </Title>
                            <Grid align="flex-end">
                                {/* Volume Slider & Mute */}
                                <Grid.Col span={{ base: 12, md: 4 }}>
                                    <Group gap="xs" align="flex-end">
                                        <ActionIcon
                                            variant="light"
                                            size="lg"
                                            onClick={handleMuteToggle}
                                            color={isMuted ? 'red' : 'blue'}
                                            style={{ marginBottom: 4 }}
                                        >
                                            {isMuted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
                                        </ActionIcon>
                                        <div style={{ flex: 1 }}>
                                            <Text size="xs" c="dimmed" mb={4}>Volume: {volume}%</Text>
                                            <Slider
                                                value={volume}
                                                onChange={handleVolumeChange}
                                                min={0}
                                                max={150}
                                                step={1}
                                                label={(val) => `${val}%`}
                                            />
                                        </div>
                                    </Group>
                                </Grid.Col>

                                {/* Audio Track Selector */}
                                <Grid.Col span={{ base: 12, md: 4 }}>
                                    <Select
                                        label="Live Audio Track"
                                        placeholder={activeAudioTracks.length === 0 ? "No audio tracks" : "Select audio track"}
                                        value={activeAudioTrack !== null ? String(activeAudioTrack) : ''}
                                        onChange={(val) => val && handleTrackChange('audio', Number(val))}
                                        disabled={activeAudioTracks.length === 0}
                                        data={activeAudioTracks.map((t) => ({
                                            value: String(t.vlc_index),
                                            label: `Track ${t.vlc_index} [${t.language.toUpperCase()}] (${t.title || t.codec})`,
                                        }))}
                                    />
                                </Grid.Col>

                                {/* Subtitle Track Selector */}
                                <Grid.Col span={{ base: 12, md: 4 }}>
                                    <Select
                                        label="Live Subtitle Track"
                                        placeholder="None / Disabled"
                                        value={activeSubTrack !== null ? String(activeSubTrack) : 'none'}
                                        onChange={(val) => handleTrackChange('subtitle', val === 'none' ? -1 : Number(val))}
                                        disabled={activeSubTracks.length === 0}
                                        data={[
                                            { value: 'none', label: 'None / Disabled' },
                                            ...activeSubTracks.map((t) => ({
                                                value: String(t.vlc_index),
                                                label: `Track ${t.vlc_index} [${t.language.toUpperCase()}] (${t.title || t.codec})`,
                                            }))
                                        ]}
                                    />
                                </Grid.Col>
                            </Grid>
                        </Card>

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card withBorder h="100%">
                                    <Title order={5} mb="sm">
                                        Playback
                                    </Title>
                                    <SimpleGrid cols={2} spacing="xs">
                                        <Text size="sm" c="dimmed">State</Text>
                                        <Text size="sm">{message?.state ?? '—'}</Text>
                                        <Text size="sm" c="dimmed">Volume</Text>
                                        <Text size="sm">{message?.volume ?? '—'}</Text>
                                        <Text size="sm" c="dimmed">Rate</Text>
                                        <Text size="sm">{message?.rate ?? '—'}x</Text>
                                        <Text size="sm" c="dimmed">Loop / Repeat / Random</Text>
                                        <Text size="sm">
                                            {message?.loop ? 'on' : 'off'} / {message?.repeat ? 'on' : 'off'} / {message?.random ? 'on' : 'off'}
                                        </Text>
                                    </SimpleGrid>
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card withBorder h="100%">
                                    <Title order={5} mb="sm">
                                        Metadata
                                    </Title>
                                    <SimpleGrid cols={2} spacing="xs">
                                        <Text size="sm" c="dimmed">Title</Text>
                                        <Text size="sm" truncate>{meta?.title ?? '—'}</Text>
                                        <Text size="sm" c="dimmed">Filename</Text>
                                        <Text size="sm" truncate>{meta?.filename ?? '—'}</Text>
                                        <Text size="sm" c="dimmed">Duration</Text>
                                        <Text size="sm">{meta?.DURATION ?? '—'}</Text>
                                    </SimpleGrid>
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Card withBorder h="100%">
                                    <Title order={5} mb="sm">Video</Title>
                                    {videoStream ? (
                                        <SimpleGrid cols={2} spacing="xs">
                                            <Text size="sm" c="dimmed">Codec</Text>
                                            <Text size="sm">{videoStream.Codec}</Text>
                                            <Text size="sm" c="dimmed">Resolution</Text>
                                            <Text size="sm">{videoStream.Video_resolution}</Text>
                                            <Text size="sm" c="dimmed">Frame rate</Text>
                                            <Text size="sm">{videoStream.Frame_rate}</Text>
                                        </SimpleGrid>
                                    ) : (
                                        <Text size="sm" c="dimmed">No video stream</Text>
                                    )}
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Card withBorder h="100%">
                                    <Title order={5} mb="sm">Audio</Title>
                                    {audioStream ? (
                                        <SimpleGrid cols={2} spacing="xs">
                                            <Text size="sm" c="dimmed">Codec</Text>
                                            <Text size="sm">{audioStream.Codec}</Text>
                                            <Text size="sm" c="dimmed">Sample rate</Text>
                                            <Text size="sm">{audioStream.Sample_rate}</Text>
                                            <Text size="sm" c="dimmed">Language</Text>
                                            <Text size="sm">{audioStream.Language ?? '—'}</Text>
                                        </SimpleGrid>
                                    ) : (
                                        <Text size="sm" c="dimmed">No audio stream</Text>
                                    )}
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Card withBorder h="100%">
                                    <Title order={5} mb="sm">Subtitles</Title>
                                    {subtitleStream ? (
                                        <SimpleGrid cols={2} spacing="xs">
                                            <Text size="sm" c="dimmed">Codec</Text>
                                            <Text size="sm">{subtitleStream.Codec}</Text>
                                            <Text size="sm" c="dimmed">Description</Text>
                                            <Text size="sm">{subtitleStream.Description}</Text>
                                        </SimpleGrid>
                                    ) : (
                                        <Text size="sm" c="dimmed">No subtitle stream</Text>
                                    )}
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={12}>
                                <Card withBorder>
                                    <Title order={5} mb="sm">
                                        All Streams ({streamEntries.length})
                                    </Title>
                                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                                        {streamEntries.map(([key, val]) => {
                                            const stream = val as StreamInfo;
                                            return (
                                                <Card key={key} withBorder padding="xs">
                                                    <Text size="sm" fw={600} mb={4}>{key}</Text>
                                                    {Object.entries(stream).map(([field, value]) => (
                                                        <Group key={field} justify="space-between" gap="xs">
                                                            <Text size="xs" c="dimmed">{field}</Text>
                                                            <Text size="xs">{value}</Text>
                                                        </Group>
                                                    ))}
                                                </Card>
                                            );
                                        })}
                                    </SimpleGrid>
                                </Card>
                            </Grid.Col>
                        </Grid>

                        <Card withBorder>
                            <Title order={5} mb="sm">Command Log</Title>
                            <ScrollArea h={220}>
                                <Stack gap={4}>
                                    {logs.length === 0 && (
                                        <Text size="sm" c="dimmed">No commands sent yet.</Text>
                                    )}
                                    {logs.map((entry) => (
                                        <Group key={entry.id} justify="space-between" wrap="nowrap">
                                            <Text size="xs" c="dimmed">{entry.timestamp}</Text>
                                            <Text size="xs" fw={600}>{entry.command}</Text>
                                            <Badge size="xs" color={entry.response.status === 'error' ? 'red' : 'green'}>
                                                {entry.response.status}
                                            </Badge>
                                            <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                                                {entry.response.message}
                                            </Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </ScrollArea>
                            <Textarea
                                mt="sm"
                                label="Raw status"
                                value={JSON.stringify(status, null, 2)}
                                readOnly
                                autosize
                                minRows={4}
                                maxRows={10}
                            />
                        </Card>

                        <Card withBorder>
                            <Title order={5} mb="sm">
                                VLC System Logs
                            </Title>
                            <ScrollArea h={250} style={{ backgroundColor: 'var(--mantine-color-dark-8)', borderRadius: '4px', padding: '8px' }}>
                                <Stack gap={2}>
                                    {instanceLogs.length === 0 && (
                                        <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>No logs yet...</Text>
                                    )}
                                    {instanceLogs.map((line, idx) => {
                                        let color = 'white';
                                        if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) color = 'var(--mantine-color-red-3)';
                                        
                                        return (
                                            <Text key={idx} size="xs" style={{ fontFamily: 'monospace', color, whiteSpace: 'pre-wrap' }}>
                                                {line}
                                            </Text>
                                        );
                                    })}
                                </Stack>
                            </ScrollArea>
                        </Card>
                    </Stack>
                )}
            </AppShell.Main>

            {/* ---------------- Start instance modal ---------------- */}
            <Modal opened={startModalOpened} onClose={closeStartModal} title={isReconfiguring ? 'Configure Stream Settings' : 'Start a new VLC stream'}>
                <Stack gap="sm">
                    <Group align="flex-end" gap="xs">
                        <TextInput
                            label="Video path"
                            description="Relative to the server's movies folder, or an absolute path"
                            placeholder={String.raw`bbb_sunflower_1080p_30fps_normal.mp4`}
                            value={videoPath}
                            onChange={(e) => setVideoPath(e.currentTarget.value)}
                            required
                            style={{ flex: 1 }}
                        />
                        <Button variant="default" onClick={openBrowser}>
                            Browse...
                        </Button>
                    </Group>

                    {probing && (
                        <Text size="xs" c="dimmed">
                            Probing video file tracks...
                        </Text>
                    )}

                    {probeError && (
                        <Text size="xs" c="red">
                            Failed to probe tracks: {probeError}
                        </Text>
                    )}

                    {!probing && !probeError && audioTracks.length > 0 && (
                        <Select
                            label="Audio Track"
                            placeholder="Select audio track"
                            value={selectedAudioTrack !== null ? String(selectedAudioTrack) : ''}
                            onChange={(val) => setSelectedAudioTrack(val ? Number(val) : null)}
                            data={audioTracks.map((t) => ({
                                value: String(t.vlc_index),
                                label: `Track ${t.vlc_index} [${t.language.toUpperCase()}] (${t.title || t.codec})`,
                            }))}
                        />
                    )}

                    {!probing && !probeError && subTracks.length > 0 && (
                        <Select
                            label="Subtitle Track"
                            placeholder="None"
                            value={selectedSubTrack !== null ? String(selectedSubTrack) : 'none'}
                            onChange={(val) => setSelectedSubTrack(val === 'none' ? null : Number(val))}
                            data={[
                                { value: 'none', label: 'None / Disabled' },
                                ...subTracks.map((t) => ({
                                    value: String(t.vlc_index),
                                    label: `Track ${t.vlc_index} [${t.language.toUpperCase()}] (${t.title || t.codec})`,
                                })),
                            ]}
                        />
                    )}
                    <TextInput
                        label="Instance name"
                        placeholder="optional label, defaults to a random id"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.currentTarget.value)}
                    />
                    <TextInput
                        label="Twitch stream key"
                        placeholder="live_xxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx"
                        value={streamKey}
                        onChange={(e) => setStreamKey(e.currentTarget.value)}
                    />
                    <TextInput
                        label="Or full RTMP URL"
                        description="Overrides stream key if set"
                        placeholder="rtmp://live.twitch.tv/app/..."
                        value={rtmpUrl}
                        onChange={(e) => setRtmpUrl(e.currentTarget.value)}
                    />
                    <Switch label="Loop video" checked={loop} onChange={(e) => setLoop(e.currentTarget.checked)} />
                    <SimpleGrid cols={3}>
                        <NumberInput label="Video kbps" value={videoBitrate} onChange={(v) => setVideoBitrate(Number(v))} min={200} />
                        <NumberInput label="Audio kbps" value={audioBitrate} onChange={(v) => setAudioBitrate(Number(v))} min={32} />
                        <NumberInput label="FPS" value={fps} onChange={(v) => setFps(Number(v))} min={1} max={60} />
                    </SimpleGrid>

                    <Switch
                        label="Show advanced transcode settings"
                        checked={showAdvanced}
                        onChange={(e) => setShowAdvanced(e.currentTarget.checked)}
                    />

                    {showAdvanced && (
                        <>
                            <Divider label="Advanced transcode options" />
                            <SimpleGrid cols={3}>
                                <TextInput
                                    label="Video Codec"
                                    placeholder="h264"
                                    value={vcodec}
                                    onChange={(e) => setVcodec(e.currentTarget.value)}
                                />
                                <TextInput
                                    label="Audio Codec"
                                    placeholder="mp4a"
                                    value={acodec}
                                    onChange={(e) => setAcodec(e.currentTarget.value)}
                                />
                                <TextInput
                                    label="Scale"
                                    placeholder="Auto"
                                    value={scale}
                                    onChange={(e) => setScale(e.currentTarget.value)}
                                />
                            </SimpleGrid>
                            <SimpleGrid cols={3}>
                                <NumberInput
                                    label="Samplerate"
                                    value={samplerate}
                                    onChange={(v) => setSamplerate(Number(v))}
                                    min={8000}
                                />
                                <TextInput
                                    label="Preset"
                                    placeholder="veryfast"
                                    value={preset}
                                    onChange={(e) => setPreset(e.currentTarget.value)}
                                />
                                <NumberInput
                                    label="Keyframe interval"
                                    value={keyint}
                                    onChange={(v) => setKeyint(Number(v))}
                                    min={1}
                                />
                            </SimpleGrid>
                        </>
                    )}

                    {startError && (
                        <Text size="sm" c="red">
                            {startError}
                        </Text>
                    )}

                    <Button onClick={handleStart} loading={starting} fullWidth>
                        {isReconfiguring ? 'Reconfigure & Restart Stream' : 'Start VLC'}
                    </Button>
                </Stack>
            </Modal>

            {/* ---------------- Movie Browser Modal ---------------- */}
            <Modal opened={browserOpened} onClose={closeBrowser} title="Browse Movies" size="lg">
                <Stack gap="sm">
                    {/* Navigation Bar / Breadcrumbs */}
                    <Group justify="space-between" align="center">
                        <Group gap="xs">
                            {browserPath && (
                                <ActionIcon
                                    variant="subtle"
                                    onClick={() => {
                                        const parts = browserPath.split('/').filter(Boolean);
                                        parts.pop();
                                        setBrowserPath(parts.join('/'));
                                    }}
                                    title="Go back"
                                >
                                    <IconArrowLeft size={18} />
                                </ActionIcon>
                            )}
                            <Text size="sm" fw={500}>
                                Path: <span style={{ fontFamily: 'monospace' }}>/ {browserPath || '(root)'}</span>
                            </Text>
                        </Group>
                        {browserPath && (
                            <Button size="xs" variant="subtle" onClick={() => setBrowserPath('')}>
                                Root
                            </Button>
                        )}
                    </Group>

                    <Divider />

                    {/* Loader or Content */}
                    {browserLoading ? (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                            Loading directory contents...
                        </Text>
                    ) : browserError ? (
                        <Text size="sm" c="red" ta="center" py="xl">
                            Error: {browserError}
                        </Text>
                    ) : (
                        <ScrollArea h={350} type="auto">
                            <Stack gap="xs">
                                {!browserContents ||
                                ((browserContents.subfolders || []).length === 0 && (browserContents.files || []).length === 0) ? (
                                    <Text size="sm" c="dimmed" ta="center" py="xl">
                                        This directory is empty.
                                    </Text>
                                ) : (
                                    <>
                                        {/* Subfolders */}
                                        {(browserContents.subfolders || []).map((folder) => (
                                            <Card
                                                key={folder}
                                                withBorder
                                                padding="xs"
                                                shadow="none"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    const newPath = browserPath ? `${browserPath}/${folder}` : folder;
                                                    setBrowserPath(newPath);
                                                }}
                                            >
                                                <Group gap="sm">
                                                    <IconFolder size={20} color="var(--mantine-color-blue-6)" />
                                                    <Text size="sm" fw={500}>
                                                        {folder}
                                                    </Text>
                                                </Group>
                                            </Card>
                                        ))}

                                        {/* Files */}
                                        {(browserContents.files || []).map((file) => (
                                            <Card
                                                key={file}
                                                withBorder
                                                padding="xs"
                                                shadow="none"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    const relativeFilePath = browserPath ? `${browserPath}/${file}` : file;
                                                    setVideoPath(relativeFilePath);
                                                    closeBrowser();
                                                }}
                                            >
                                                <Group gap="sm">
                                                    <IconMovie size={20} color="var(--mantine-color-teal-6)" />
                                                    <Text size="sm" style={{ wordBreak: 'break-all' }}>
                                                        {file}
                                                    </Text>
                                                </Group>
                                            </Card>
                                        ))}
                                    </>
                                )}
                            </Stack>
                        </ScrollArea>
                    )}
                </Stack>
            </Modal>
        </AppShell>
    );
}