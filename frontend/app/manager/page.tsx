'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
    Card,
    Stack,
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
    useMantineColorScheme,
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

    const downloadsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        fetchExplorer('');
        downloadsIntervalRef.current = setInterval(fetchDownloads, 2000);
        return () => {
            if (downloadsIntervalRef.current) clearInterval(downloadsIntervalRef.current);
        };
    }, []);

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
                                Downloader (aria2)
                            </Tabs.Tab>
                            <Tabs.Tab value="explorer" leftSection={<IconFolder size={16} />}>
                                File Explorer
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
                    </Tabs>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
