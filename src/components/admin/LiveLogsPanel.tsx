import { useEffect, useState, useRef } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Terminal, Activity } from "lucide-react";
import { format } from "date-fns";

export interface LogEvent {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  userId?: string;
  details?: any;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const LiveLogsPanel = () => {
  const { adminToken } = useAdmin();
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adminToken) return;

    const eventSource = new EventSource(`${API_URL}/api/admin/logs/stream?token=${adminToken}`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      setConnected(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "history") {
          setLogs(data.logs);
        } else if (data.type === "log") {
          setLogs((prev) => {
            const newLogs = [...prev, data.log];
            if (newLogs.length > 200) newLogs.shift();
            return newLogs;
          });
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [adminToken]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level) {
      case "error": return "text-red-500";
      case "warn": return "text-yellow-500";
      case "debug": return "text-slate-500";
      default: return "text-green-400"; // info
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-300 font-mono text-xs shadow-2xl flex flex-col h-[400px]">
      <div className="bg-slate-900 border-b border-slate-800 p-2 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-300">Superviseur Invisible (Live)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Statut</span>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-medium text-slate-400">{connected ? 'Connecté' : 'Déconnecté'}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2 opacity-50">
            <Activity className="w-8 h-8" />
            <p>En attente d'événements système...</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded-md transition-colors leading-relaxed">
              <div className="text-slate-600 shrink-0 select-none">
                {format(new Date(log.timestamp), 'HH:mm:ss')}
              </div>
              <div className={`font-semibold shrink-0 uppercase w-12 ${getLogColor(log.level)}`}>
                [{log.level}]
              </div>
              <div className="flex-1 break-words flex items-start flex-wrap gap-2">
                <span className={log.level === 'error' ? 'text-red-400' : 'text-slate-300'}>
                  {log.message}
                </span>
                {log.userId && (
                  <span className="text-slate-500 bg-slate-900 px-1.5 rounded-md border border-slate-800 text-[10px]">
                    user: {log.userId.split('-')[0]}
                  </span>
                )}
                {log.details?.count !== undefined && (
                  <span className="text-blue-400 bg-blue-400/10 px-1.5 rounded-md border border-blue-400/20 text-[10px]">
                    +{log.details.count}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
