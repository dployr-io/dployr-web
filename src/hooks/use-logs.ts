import { parseLog } from "@/lib/utils";
import type { Deployment, LogLevel, Service } from "@/types";
import type { Log } from "@/types";
import { useEffect, useRef, useState } from "react";

export function useLogs(id?: string, filterItem?: Deployment | Service | null) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<"ALL" | LogLevel>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const logsEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!id) {
            return;
        }

        const token = null;

        const streamUrl = `${import.meta.env.VITE_BASE_URL}/logs/stream?id=${encodeURIComponent(id)}`;
        const urlWithAuth = token ? `${streamUrl}&token=${encodeURIComponent(token)}` : streamUrl;
        const eventSource = new EventSource(urlWithAuth);

        eventSource.onmessage = (event) => {
            const log = parseLog(event.data);
            setLogs((prevLogs) => [...prevLogs, log]);
        };

        eventSource.onerror = (error) => {
            console.error("Error occured while streaming logs:", error);
            eventSource.close();
        };

        return () => eventSource.close();
    }, [filterItem, id]);

    useEffect(() => {
        let filtered = logs;

        if (selectedLevel !== "ALL") {
            filtered = filtered.filter(
                (log) => log.level === selectedLevel,
            );
        }

        if (searchQuery) {
            filtered = filtered.filter((log) =>
                log.message.toLowerCase().includes(searchQuery.toLowerCase()),
            );
        }

        setFilteredLogs(filtered);
    }, [logs, selectedLevel, searchQuery]);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [filteredLogs]);

    return {
        logs,
        filteredLogs,
        selectedLevel,
        searchQuery,
        logsEndRef,
        setSelectedLevel,
        setSearchQuery,
    };
}
