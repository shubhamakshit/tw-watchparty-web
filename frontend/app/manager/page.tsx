'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
    Card,
    Checkbox,
    Stack,
    Switch,
    Group,
    Title,
    Text,
    TextInput,
    Button,
    Table,
    Progress,
    Badge,
    ActionIcon,
    Tabs,
    Breadcrumbs,
    Anchor,
    SimpleGrid,
    Divider,
    Tooltip,
    Alert,
    AppShell,
    Modal,
    useMantineColorScheme,
    Image,
    LoadingOverlay,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconDownload,
    IconTrash,
    IconFolder,
    IconFile,
    IconPlayerPlay,
    IconPlayerPause,
    IconRefresh,
    IconPlus,
    IconMoon,
    IconSun,
    IconAlertCircle,
    IconCheck,
    IconSettings,
    IconSearch,
    IconMovie,
    IconDeviceTv,
} from '@tabler/icons-react';
import APIManager from '@/api/Api';

interface DownloadInfo {
    gid: string;
    name: string;
    status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';
    total_length: number;
    completed_length: number;
    progress: number;
    download_speed: number;
    download_speed_str: string;
    eta: string;
    files: string[];
    error_message: string;
}

interface ExplorerEntry {
    name: string;
    type: 'file' | 'directory';
    size: number;
    size_str: string;
    modified_at: number;
    path: string;
}

export default function MediaManager() {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();

    // Downloader state
    const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [loadingDownloads, setLoadingDownloads] = useState(false);
    const [addingDownload, setAddingDownload] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    // Explorer state
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [loadingExplorer, setLoadingExplorer] = useState(false);
    const [explorerError, setExplorerError] = useState<string | null>(null);
    const [deletingPath, setDeletingPath] = useState<string | null>(null);

    // Settings state
    const [defaultMoviesDir, setDefaultMoviesDir] = useState('');
    const [currentMoviesDir, setCurrentMoviesDir] = useState('');
    const [newMoviesDir, setNewMoviesDir] = useState('');
    const [createIfMissing, setCreateIfMissing] = useState(true);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
    const [applyingSettings, setApplyingSettings] = useState(false);

    // Acer Scraper state
    const [scraperSearchQuery, setScraperSearchQuery] = useState('');
    const [scraperResults, setScraperResults] = useState<any[]>([]);
    const [searchingScraper, setSearchingScraper] = useState(false);
    const [scraperError, setScraperError] = useState<string | null>(null);
    const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
    const [qualities, setQualities] = useState<any[]>([]);
    const [fetchingQualities, setFetchingQualities] = useState(false);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [fetchingEpisodes, setFetchingEpisodes] = useState(false);
    const [selectedSeasonLabel, setSelectedSeasonLabel] = useState('');
    const [queuingGid, setQueuingGid] = useState<string | null>(null);
    const [queuingAll, setQueuingAll] = useState(false);
    const [selectedEpisodeLinks, setSelectedEpisodeLinks] = useState<string[]>([]);

    const handleScraperSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scraperSearchQuery.trim()) return;

        setSearchingScraper(true);
        setScraperError(null);
        setSelectedMovie(null);
        setQualities([]);
        setEpisodes([]);
        setSelectedEpisodeLinks([]);

        fetch(APIManager.ACER_SEARCH(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: scraperSearchQuery.trim() }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Search failed');
                setScraperResults(data.searchResult || []);
            })
            .catch((err) => setScraperError(err.message || String(err)))
            .finally(() => setSearchingScraper(false));
    };

    const handleFetchQualities = (result: any) => {
        setFetchingQualities(true);
        setScraperError(null);
        setSelectedMovie(result);
        setQualities([]);
        setEpisodes([]);
        setSelectedEpisodeLinks([]);

        fetch(APIManager.ACER_QUALITIES(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: result.url }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Failed to fetch qualities');
                setQualities(data.sourceQualityList || []);
                if (data.meta) {
                    setSelectedMovie((prev: any) => ({
                        ...prev,
                        mainTitle: data.meta.mainTitle,
                        title: data.meta.title || prev.title,
                        image: data.meta.image || prev.image,
                        synopsis: data.meta.synopsis,
                        type: data.meta.type,
                        imdbId: data.meta.imdbId,
                    }));
                }
            })
            .catch((err) => setScraperError(err.message || String(err)))
            .finally(() => setFetchingQualities(false));
    };

    const handleFetchEpisodes = (quality: any) => {
        setFetchingEpisodes(true);
        setScraperError(null);
        setSelectedSeasonLabel(quality.title || '');
        setEpisodes([]);
        setSelectedEpisodeLinks([]);

        fetch(APIManager.ACER_EPISODES(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: quality.episodesUrl || quality.episodes_api_url }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Failed to fetch episodes');
                setEpisodes(data.sourceEpisodes || []);
            })
            .catch((err) => setScraperError(err.message || String(err)))
            .finally(() => setFetchingEpisodes(false));
    };

    const handleQueueScraperDownload = (url: string, filename: string, seriesType: string) => {
        setQueuingGid(url);
        setScraperError(null);

        return fetch(APIManager.ACER_DOWNLOAD(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                filename,
                series_type: seriesType,
            }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Failed to queue download');
                fetchDownloads();
                return data;
            })
            .catch((err) => {
                setScraperError(err.message || String(err));
                throw err;
            })
            .finally(() => setQueuingGid(null));
    };

    const handleToggleAllEpisodes = (checked: boolean) => {
        if (checked) {
            const allLinks = episodes.map((ep) => ep.link || ep.url).filter(Boolean);
            setSelectedEpisodeLinks(allLinks);
        } else {
            setSelectedEpisodeLinks([]);
        }
    };

    const handleToggleEpisode = (link: string, checked: boolean) => {
        if (checked) {
            setSelectedEpisodeLinks((prev) => [...prev, link]);
        } else {
            setSelectedEpisodeLinks((prev) => prev.filter((item) => item !== link));
        }
    };

    const handleQueueSelectedEpisodes = async () => {
        if (selectedEpisodeLinks.length === 0 || !selectedMovie) return;
        setQueuingAll(true);
        let successCount = 0;
        
        try {
            for (let i = 0; i < episodes.length; i++) {
                const ep = episodes[i];
                const epLink = ep.link || ep.url;
                if (!epLink || !selectedEpisodeLinks.includes(epLink)) continue;

                const cleanShowTitle = selectedMovie.mainTitle || selectedMovie.title || 'Series';
                const filename = `${cleanShowTitle}_${selectedSeasonLabel}_${ep.title || `Episode_${i+1}`}.mp4`;
                try {
                    await handleQueueScraperDownload(epLink, filename, 'episode');
                    successCount++;
                    await new Promise((r) => setTimeout(r, 400));
                } catch (e) {
                    console.error("Failed to queue episode:", ep.title, e);
                }
            }
            setSelectedEpisodeLinks([]);
        } finally {
            setQueuingAll(false);
        }
    };

    const downloadsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch config
    const fetchConfig = () => {
        fetch(APIManager.GET_CONFIG())
            .then((res) => res.json())
            .then((data) => {
                setDefaultMoviesDir(data.default_movies_dir);
                setCurrentMoviesDir(data.current_movies_dir);
                setNewMoviesDir(data.current_movies_dir);
            })
            .catch(() => {});
    };

    // Fetch aria2 downloads
    const fetchDownloads = () => {
        setLoadingDownloads(true);
        fetch(APIManager.ARIA2_LIST())
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch downloads');
                return res.json();
            })
            .then((data) => {
                setDownloads(data.downloads || []);
                setDownloadError(null);
            })
            .catch((err) => setDownloadError(err.message || String(err)))
            .finally(() => setLoadingDownloads(false));
    };

    // Fetch Explorer entries
    const fetchExplorer = (path: string = '') => {
        setLoadingExplorer(true);
        setExplorerError(null);
        fetch(APIManager.EXPLORER_LIST(path))
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load directory content');
                return res.json();
            })
            .then((data) => {
                setEntries(data.entries || []);
                setCurrentPath(data.current_path || '');
            })
            .catch((err) => setExplorerError(err.message || String(err)))
            .finally(() => setLoadingExplorer(false));
    };

    // Start polling downloads and fetch initial explorer list
    useEffect(() => {
        fetchDownloads();
        
        const savedPath = localStorage.getItem('watchparty_download_path');
        if (savedPath) {
            fetch(APIManager.UPDATE_CONFIG(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movies_dir: savedPath,
                    create_if_missing: true,
                }),
            })
                .then(async (res) => {
                    const data = await res.json();
                    if (res.ok) {
                        setCurrentMoviesDir(data.current_movies_dir);
                        setNewMoviesDir(data.current_movies_dir);
                        fetchExplorer('');
                    } else {
                        fetchExplorer('');
                    }
                })
                .catch(() => {
                    fetchExplorer('');
                })
                .finally(() => {
                    fetchConfig();
                });
        } else {
            fetchExplorer('');
            fetchConfig();
        }

        downloadsIntervalRef.current = setInterval(fetchDownloads, 2000);
        return () => {
            if (downloadsIntervalRef.current) clearInterval(downloadsIntervalRef.current);
        };
    }, []);

    const handleApplyConfig = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMoviesDir.trim()) return;

        setApplyingSettings(true);
        setSettingsError(null);
        setSettingsSuccess(null);

        fetch(APIManager.UPDATE_CONFIG(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movies_dir: newMoviesDir.trim(),
                create_if_missing: createIfMissing,
            }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data?.detail ?? 'Failed to update folder');
                setSettingsSuccess('Download directory updated successfully!');
                setCurrentMoviesDir(data.current_movies_dir);
                setNewMoviesDir(data.current_movies_dir);
                localStorage.setItem('watchparty_download_path', data.current_movies_dir);
                fetchExplorer('');
            })
            .catch((err) => setSettingsError(err.message || String(err)))
            .finally(() => setApplyingSettings(false));
    };

    const handleAddDownload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!downloadUrl.trim()) return;

        setAddingDownload(true);
        setDownloadError(null);

        fetch(APIManager.ARIA2_ADD(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uri: downloadUrl.trim() }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data?.detail ?? 'Failed to add download');
                setDownloadUrl('');
                fetchDownloads();
            })
            .catch((err) => setDownloadError(err.message || String(err)))
            .finally(() => setAddingDownload(false));
    };

    const handlePause = (gid: string) => {
        fetch(APIManager.ARIA2_PAUSE(gid), { method: 'POST' })
            .then(() => fetchDownloads())
            .catch((err) => setDownloadError(err.message || String(err)));
    };

    const handleResume = (gid: string) => {
        fetch(APIManager.ARIA2_RESUME(gid), { method: 'POST' })
            .then(() => fetchDownloads())
            .catch((err) => setDownloadError(err.message || String(err)));
    };

    const handleRemove = (gid: string) => {
        fetch(APIManager.ARIA2_REMOVE(gid), { method: 'POST' })
            .then(() => fetchDownloads())
            .catch((err) => setDownloadError(err.message || String(err)));
    };

    const handlePurge = () => {
        fetch(APIManager.ARIA2_PURGE(), { method: 'POST' })
            .then(() => fetchDownloads())
            .catch((err) => setDownloadError(err.message || String(err)));
    };

    const handleDeleteFile = (path: string) => {
        if (!confirm(`Are you sure you want to delete "${path}"?`)) return;
        setDeletingPath(path);
        fetch(APIManager.EXPLORER_DELETE(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data?.detail ?? 'Failed to delete file');
                fetchExplorer(currentPath);
            })
            .catch((err) => setExplorerError(err.message || String(err)))
            .finally(() => setDeletingPath(null));
    };

    const getStatusColor = (status: DownloadInfo['status']) => {
        switch (status) {
            case 'active':
                return 'blue';
            case 'waiting':
                return 'yellow';
            case 'paused':
                return 'gray';
            case 'complete':
                return 'green';
            case 'error':
                return 'red';
            default:
                return 'gray';
        }
    };

    // Breadcrumbs segments
    const pathSegments = currentPath.split('/').filter(Boolean);
    const breadcrumbItems = [
        <Anchor key="root" onClick={() => fetchExplorer('')}>
            Root
        </Anchor>,
        ...pathSegments.map((segment, idx) => {
            const pathUrl = pathSegments.slice(0, idx + 1).join('/');
            return (
                <Anchor key={pathUrl} onClick={() => fetchExplorer(pathUrl)}>
                    {segment}
                </Anchor>
            );
        }),
    ];

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group gap="xs">
                        <Button
                            component="a"
                            href="/"
                            variant="subtle"
                            leftSection={<IconArrowLeft size={16} />}
                        >
                            Back to Control Panel
                        </Button>
                        <Title order={4}>Media & Downloader Manager</Title>
                    </Group>
                    <ActionIcon variant="default" onClick={() => toggleColorScheme()} size="lg">
                        {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                    </ActionIcon>
                </Group>
            </AppShell.Header>

            <AppShell.Main style={{ paddingTop: '80px' }}>
                <Container size="xl">
                    <Tabs defaultValue="downloader" variant="outline">
                        <Tabs.List mb="md">
                            <Tabs.Tab value="downloader" leftSection={<IconDownload size={16} />}>
                                Downloader
                            </Tabs.Tab>
                            <Tabs.Tab value="explorer" leftSection={<IconFolder size={16} />}>
                                File Explorer
                            </Tabs.Tab>
                            <Tabs.Tab value="scraper" leftSection={<IconSearch size={16} />}>
                                Search & Scrape
                            </Tabs.Tab>
                            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
                                Settings
                            </Tabs.Tab>
                        </Tabs.List>

                        {/* ==================== Downloader Tab ==================== */}
                        <Tabs.Panel value="downloader">
                            <Stack gap="md">
                                <Card withBorder>
                                    <form onSubmit={handleAddDownload}>
                                        <Group align="flex-end">
                                            <TextInput
                                                label="Download Link / Magnet Link"
                                                placeholder="http://..., magnet:?xt=..., etc."
                                                value={downloadUrl}
                                                onChange={(e) => setDownloadUrl(e.currentTarget.value)}
                                                style={{ flex: 1 }}
                                                required
                                            />
                                            <Button
                                                type="submit"
                                                loading={addingDownload}
                                                leftSection={<IconPlus size={16} />}
                                            >
                                                Add Download
                                            </Button>
                                        </Group>
                                    </form>
                                </Card>

                                {downloadError && (
                                    <Alert
                                        icon={<IconAlertCircle size={16} />}
                                        title="Downloader Error"
                                        color="red"
                                        withCloseButton
                                        onClose={() => setDownloadError(null)}
                                    >
                                        {downloadError}
                                    </Alert>
                                )}

                                <Card withBorder>
                                    <Group justify="space-between" mb="md">
                                        <Title order={5}>Active Queue</Title>
                                        <Group gap="xs">
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={fetchDownloads}
                                                loading={loadingDownloads}
                                                leftSection={<IconRefresh size={14} />}
                                            >
                                                Refresh
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="light"
                                                color="red"
                                                onClick={handlePurge}
                                                leftSection={<IconTrash size={14} />}
                                            >
                                                Purge Finished
                                            </Button>
                                        </Group>
                                    </Group>

                                    {downloads.length === 0 ? (
                                        <Text c="dimmed" ta="center" py="xl">
                                            No active downloads. Add a URL or magnet link above to start downloading.
                                        </Text>
                                    ) : (
                                        <Table striped highlightOnHover verticalSpacing="xs">
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th style={{ width: '40%' }}>Name</Table.Th>
                                                    <Table.Th>Progress</Table.Th>
                                                    <Table.Th>Speed</Table.Th>
                                                    <Table.Th>ETA</Table.Th>
                                                    <Table.Th>Status</Table.Th>
                                                    <Table.Th style={{ width: '150px' }}>Actions</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {downloads.map((dl) => (
                                                    <Table.Tr key={dl.gid}>
                                                        <Table.Td style={{ maxWidth: '300px' }}>
                                                            <Tooltip label={dl.name || dl.gid}>
                                                                <Text size="sm" fw={500} truncate>
                                                                    {dl.name || dl.gid}
                                                                </Text>
                                                            </Tooltip>
                                                            {dl.error_message && (
                                                                <Text size="xs" c="red" mt={2} truncate>
                                                                    Error: {dl.error_message}
                                                                </Text>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Stack gap={4}>
                                                                <Progress
                                                                    value={dl.progress}
                                                                    striped={dl.status === 'active'}
                                                                    animated={dl.status === 'active'}
                                                                />
                                                                <Text size="xs" c="dimmed">
                                                                    {dl.progress}% ({(dl.completed_length / 1024 / 1024).toFixed(1)} MB / {(dl.total_length / 1024 / 1024).toFixed(1)} MB)
                                                                </Text>
                                                            </Stack>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">{dl.status === 'active' ? dl.download_speed_str : '—'}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">{dl.status === 'active' ? dl.eta : '—'}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge color={getStatusColor(dl.status)} variant="light">
                                                                {dl.status}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Group gap={4} wrap="nowrap">
                                                                {dl.status === 'active' && (
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        color="yellow"
                                                                        onClick={() => handlePause(dl.gid)}
                                                                        title="Pause"
                                                                    >
                                                                        <IconPlayerPause size={16} />
                                                                    </ActionIcon>
                                                                )}
                                                                {(dl.status === 'paused' || dl.status === 'waiting') && (
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        color="green"
                                                                        onClick={() => handleResume(dl.gid)}
                                                                        title="Resume"
                                                                    >
                                                                        <IconPlayerPlay size={16} />
                                                                    </ActionIcon>
                                                                )}
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="red"
                                                                    onClick={() => handleRemove(dl.gid)}
                                                                    title="Cancel / Delete"
                                                                >
                                                                    <IconTrash size={16} />
                                                                </ActionIcon>
                                                            </Group>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    )}
                                </Card>
                            </Stack>
                        </Tabs.Panel>

                        {/* ==================== File Explorer Tab ==================== */}
                        <Tabs.Panel value="explorer">
                            <Stack gap="md">
                                {explorerError && (
                                    <Alert
                                        icon={<IconAlertCircle size={16} />}
                                        title="Explorer Error"
                                        color="red"
                                        withCloseButton
                                        onClose={() => setExplorerError(null)}
                                    >
                                        {explorerError}
                                    </Alert>
                                )}

                                <Card withBorder>
                                    <Group justify="space-between" mb="md">
                                        <Breadcrumbs separator=">">{breadcrumbItems}</Breadcrumbs>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => fetchExplorer(currentPath)}
                                            loading={loadingExplorer}
                                            leftSection={<IconRefresh size={14} />}
                                        >
                                            Refresh Files
                                        </Button>
                                    </Group>

                                    <Divider mb="sm" />

                                    {entries.length === 0 ? (
                                        <Text c="dimmed" ta="center" py="xl">
                                            This directory is empty. Downloads completed via aria2 will appear here.
                                        </Text>
                                    ) : (
                                        <Table striped highlightOnHover verticalSpacing="sm">
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th style={{ width: '50%' }}>Name</Table.Th>
                                                    <Table.Th>Size</Table.Th>
                                                    <Table.Th>Type</Table.Th>
                                                    <Table.Th style={{ width: '180px' }}>Actions</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {entries.map((entry) => (
                                                    <Table.Tr key={entry.name}>
                                                        <Table.Td>
                                                            <Group gap="xs">
                                                                {entry.type === 'directory' ? (
                                                                    <IconFolder size={18} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                                                                ) : (
                                                                    <IconFile size={18} style={{ color: 'var(--mantine-color-gray-6)' }} />
                                                                )}
                                                                {entry.type === 'directory' ? (
                                                                    <Anchor
                                                                        size="sm"
                                                                        fw={500}
                                                                        onClick={() => fetchExplorer(entry.path)}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        {entry.name}
                                                                    </Anchor>
                                                                ) : (
                                                                    <Text size="sm" fw={500}>
                                                                        {entry.name}
                                                                    </Text>
                                                                )}
                                                            </Group>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" c="dimmed">
                                                                {entry.type === 'file' ? entry.size_str : '—'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge size="xs" color={entry.type === 'directory' ? 'blue' : 'gray'} variant="light">
                                                                {entry.type}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Group gap={8}>
                                                                {entry.type === 'file' && (
                                                                    <Button
                                                                        size="xs"
                                                                        variant="light"
                                                                        color="green"
                                                                        component="a"
                                                                        href={`/?play=${encodeURIComponent(entry.path)}`}
                                                                        leftSection={<IconPlayerPlay size={12} />}
                                                                    >
                                                                        Play
                                                                    </Button>
                                                                )}
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="red"
                                                                    loading={deletingPath === entry.path}
                                                                    onClick={() => handleDeleteFile(entry.path)}
                                                                    title="Delete"
                                                                >
                                                                    <IconTrash size={16} />
                                                                </ActionIcon>
                                                            </Group>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    )}
                                </Card>
                            </Stack>
                        </Tabs.Panel>

                        {/* ==================== Search & Scrape Tab ==================== */}
                        <Tabs.Panel value="scraper">
                            <Stack gap="md" style={{ position: 'relative' }}>
                                <LoadingOverlay visible={searchingScraper || fetchingQualities || fetchingEpisodes} />

                                {scraperError && (
                                    <Alert
                                        icon={<IconAlertCircle size={16} />}
                                        title="Scraper Error"
                                        color="red"
                                        withCloseButton
                                        onClose={() => setScraperError(null)}
                                    >
                                        {scraperError}
                                    </Alert>
                                )}

                                <Card withBorder>
                                    <form onSubmit={handleScraperSearch}>
                                        <Group align="flex-end">
                                            <TextInput
                                                label="Search Movies & TV Shows (via acermovies)"
                                                placeholder="e.g. Breaking Bad, Interstellar..."
                                                value={scraperSearchQuery}
                                                onChange={(e) => setScraperSearchQuery(e.currentTarget.value)}
                                                style={{ flex: 1 }}
                                                required
                                            />
                                            <Button
                                                type="submit"
                                                loading={searchingScraper}
                                                leftSection={<IconSearch size={16} />}
                                            >
                                                Search
                                            </Button>
                                        </Group>
                                    </form>
                                </Card>

                                <Card withBorder>
                                    <Title order={5} mb="md">
                                        Search Results ({scraperResults.length})
                                    </Title>
                                    {scraperResults.length === 0 ? (
                                        <Text c="dimmed" ta="center" py="xl">
                                            Search for a title above to find movies and shows to download.
                                        </Text>
                                    ) : (
                                        <Stack gap="xs" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                            {scraperResults.map((result, idx) => (
                                                <Card
                                                    key={idx}
                                                    withBorder
                                                    padding="sm"
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedMovie?.url === result.url ? 'var(--mantine-color-blue-light)' : 'transparent',
                                                    }}
                                                    onClick={() => handleFetchQualities(result)}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                                                            {result.image && (
                                                                <Image
                                                                    src={result.image}
                                                                    w={55}
                                                                    h={80}
                                                                    fallbackSrc="https://placehold.co/55x80?text=No+Poster"
                                                                    radius="xs"
                                                                    style={{ flexShrink: 0 }}
                                                                />
                                                            )}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                                                                <Text size="sm" fw={600} style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                                                    {result.title}
                                                                </Text>
                                                                <Text size="xs" c="dimmed" lineClamp={2}>
                                                                    {result.description || 'No description'}
                                                                </Text>
                                                            </div>
                                                        </div>
                                                        <Button size="xs" variant="light" leftSection={<IconPlus size={12} />} style={{ flexShrink: 0 }}>
                                                            Fetch
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </Stack>
                                    )}
                                </Card>

                                <Modal
                                    opened={!!selectedMovie}
                                    onClose={() => setSelectedMovie(null)}
                                    size="lg"
                                    title={selectedMovie?.mainTitle || selectedMovie?.title || 'Media Details'}
                                    centered
                                >
                                    {selectedMovie && (
                                        <Stack gap="md">
                                            <Group align="flex-start" gap="md" wrap="nowrap">
                                                {selectedMovie.image && (
                                                    <Image
                                                        src={selectedMovie.image}
                                                        w={90}
                                                        h={130}
                                                        fallbackSrc="https://placehold.co/90x130?text=No+Poster"
                                                        radius="sm"
                                                    />
                                                )}
                                                <Stack gap="xs" style={{ flex: 1 }}>
                                                    {selectedMovie.mainTitle && (
                                                        <Text size="xs" c="dimmed" fw={500} lineClamp={2}>
                                                            {selectedMovie.title}
                                                        </Text>
                                                    )}
                                                    <Group gap="xs" mt={2}>
                                                        {selectedMovie.type && (
                                                            <Badge color="blue" variant="light">
                                                                {selectedMovie.type}
                                                            </Badge>
                                                        )}
                                                        {selectedMovie.imdbId && (
                                                            <Badge
                                                                component="a"
                                                                href={`https://www.imdb.com/title/${selectedMovie.imdbId}`}
                                                                target="_blank"
                                                                color="yellow"
                                                                variant="filled"
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                IMDb
                                                            </Badge>
                                                        )}
                                                    </Group>
                                                    {selectedMovie.synopsis && (
                                                        <Text size="xs" style={{ lineHeight: '1.4' }}>
                                                            {selectedMovie.synopsis}
                                                        </Text>
                                                    )}
                                                </Stack>
                                            </Group>

                                            <Divider my="xs" />

                                            {/* Qualities / Seasons selection */}
                                            <Title order={5}>
                                                Available Sources / Seasons
                                            </Title>
                                            {qualities.length === 0 ? (
                                                <Text c="dimmed" size="xs">
                                                    No source qualities found.
                                                </Text>
                                            ) : (
                                                <Group gap="xs">
                                                    {qualities.map((q, idx) => {
                                                        const isTvSeason = q.episodesUrl || q.episodes_api_url;
                                                        const isSelectedSeason = selectedSeasonLabel === q.title;

                                                        return (
                                                            <Button
                                                                key={idx}
                                                                size="xs"
                                                                variant={isSelectedSeason ? 'filled' : 'outline'}
                                                                onClick={() => {
                                                                    if (isTvSeason) {
                                                                        handleFetchEpisodes(q);
                                                                    } else {
                                                                        const cleanMovieTitle = selectedMovie.mainTitle || selectedMovie.title || 'Movie';
                                                                        const qualityLabel = q.quality || 'Direct';
                                                                        const filename = `${cleanMovieTitle}_${qualityLabel}.mp4`;
                                                                        handleQueueScraperDownload(q.url, filename, 'movie');
                                                                    }
                                                                }}
                                                                loading={queuingGid === q.url}
                                                            >
                                                                {q.title || q.quality || `Quality ${idx+1}`}
                                                            </Button>
                                                        );
                                                    })}
                                                </Group>
                                            )}

                                            {/* Episodes list */}
                                            {episodes.length > 0 && (
                                                <Stack gap="sm">
                                                    <Group justify="space-between">
                                                        <Title order={5}>
                                                            Episodes ({episodes.length})
                                                        </Title>
                                                        <Button
                                                            size="xs"
                                                            color="green"
                                                            onClick={handleQueueSelectedEpisodes}
                                                            loading={queuingAll}
                                                            disabled={selectedEpisodeLinks.length === 0}
                                                        >
                                                            Download Selected ({selectedEpisodeLinks.length})
                                                        </Button>
                                                    </Group>
                                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                        <Table striped highlightOnHover verticalSpacing="xs">
                                                            <Table.Thead>
                                                                <Table.Tr>
                                                                    <Table.Th style={{ width: '40px' }}>
                                                                        <Checkbox
                                                                            checked={episodes.length > 0 && selectedEpisodeLinks.length === episodes.map(e => e.link || e.url).filter(Boolean).length}
                                                                            indeterminate={selectedEpisodeLinks.length > 0 && selectedEpisodeLinks.length < episodes.map(e => e.link || e.url).filter(Boolean).length}
                                                                            onChange={(e) => handleToggleAllEpisodes(e.currentTarget.checked)}
                                                                        />
                                                                    </Table.Th>
                                                                    <Table.Th>Episode Name</Table.Th>
                                                                    <Table.Th style={{ width: '120px' }}>Actions</Table.Th>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {episodes.map((ep, idx) => {
                                                                    const epLink = ep.link || ep.url;
                                                                    return (
                                                                        <Table.Tr key={idx}>
                                                                            <Table.Td>
                                                                                {epLink && (
                                                                                    <Checkbox
                                                                                        checked={selectedEpisodeLinks.includes(epLink)}
                                                                                        onChange={(e) => handleToggleEpisode(epLink, e.currentTarget.checked)}
                                                                                    />
                                                                                )}
                                                                            </Table.Td>
                                                                            <Table.Td>
                                                                                <Text size="xs" fw={500}>
                                                                                    {ep.title}
                                                                                </Text>
                                                                            </Table.Td>
                                                                            <Table.Td>
                                                                                <Button
                                                                                    size="xs"
                                                                                    variant="light"
                                                                                    onClick={() => {
                                                                                        const cleanShowTitle = selectedMovie.mainTitle || selectedMovie.title || 'Series';
                                                                                        const filename = `${cleanShowTitle}_${selectedSeasonLabel}_${ep.title}.mp4`;
                                                                                        if (!epLink) return;
                                                                                        handleQueueScraperDownload(epLink, filename, 'episode');
                                                                                    }}
                                                                                    loading={queuingGid === epLink}
                                                                                >
                                                                                    Queue
                                                                                </Button>
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    );
                                                                })}
                                                            </Table.Tbody>
                                                        </Table>
                                                    </div>
                                                </Stack>
                                            )}
                                        </Stack>
                                    )}
                                </Modal>
                            </Stack>
                        </Tabs.Panel>

                        {/* ==================== Settings Tab ==================== */}
                        <Tabs.Panel value="settings">
                            <Stack gap="md">
                                {settingsError && (
                                    <Alert
                                        icon={<IconAlertCircle size={16} />}
                                        title="Settings Error"
                                        color="red"
                                        withCloseButton
                                        onClose={() => setSettingsError(null)}
                                    >
                                        {settingsError}
                                    </Alert>
                                )}

                                {settingsSuccess && (
                                    <Alert
                                        icon={<IconCheck size={16} />}
                                        title="Success"
                                        color="green"
                                        withCloseButton
                                        onClose={() => setSettingsSuccess(null)}
                                    >
                                        {settingsSuccess}
                                    </Alert>
                                )}

                                <Card withBorder>
                                    <Title order={5} mb="xs">
                                        Directory Configuration
                                    </Title>
                                    <Text size="sm" c="dimmed" mb="md">
                                        View and change the active directory used by the file explorer and downloader. Changes apply to the current server session.
                                    </Text>

                                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
                                        <Card withBorder padding="sm" bg="var(--mantine-color-default-hover)">
                                            <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                                                Default Movies Folder
                                            </Text>
                                            <Text size="md" fw={500} style={{ fontFamily: 'monospace' }} mt={4}>
                                                {defaultMoviesDir || '—'}
                                            </Text>
                                        </Card>
                                        <Card withBorder padding="sm" bg="var(--mantine-color-default-hover)">
                                            <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                                                Current Active Folder
                                            </Text>
                                            <Text size="md" fw={500} style={{ fontFamily: 'monospace' }} mt={4}>
                                                {currentMoviesDir || '—'}
                                            </Text>
                                        </Card>
                                    </SimpleGrid>

                                    <form onSubmit={handleApplyConfig}>
                                        <Stack gap="sm">
                                            <TextInput
                                                label="Change Download & Stream Folder"
                                                description="Specify an absolute path on the server (e.g. ~/Downloads/WatchParty or C:\Downloads\WatchParty)"
                                                placeholder={currentMoviesDir}
                                                value={newMoviesDir}
                                                onChange={(e) => setNewMoviesDir(e.currentTarget.value)}
                                                required
                                            />
                                            <Switch
                                                label="Create folder automatically if it does not exist"
                                                checked={createIfMissing}
                                                onChange={(e) => setCreateIfMissing(e.currentTarget.checked)}
                                            />
                                            <Button
                                                type="submit"
                                                loading={applyingSettings}
                                                style={{ alignSelf: 'flex-start' }}
                                            >
                                                Apply & Update Path
                                            </Button>
                                        </Stack>
                                    </form>
                                </Card>

                                <Card withBorder>
                                    <Title order={5} mb="xs">
                                        Preferences & Guide
                                    </Title>
                                    <Text size="sm" c="dimmed">
                                        * **Storage Location**: Completed downloads in the downloader tab are placed directly in the active folder configured above.
                                        * **Streaming Root**: The File Explorer searches recursively inside the active folder. Any files shown can be streamed instantly using the green **Play** action.
                                        * **System Port bindings**: VLC instance HTTP interfaces, telnet controls, and media stream ports are automatically allocated.
                                    </Text>
                                </Card>
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
