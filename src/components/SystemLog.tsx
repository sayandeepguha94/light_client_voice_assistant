import { SystemLog } from "../types";
import { Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface SystemLogProps {
  logs: SystemLog[];
  onClear: () => void;
}

export default function SystemLogComponent({ logs, onClear }: SystemLogProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getLogStyles = (type: SystemLog["type"]) => {
    switch (type) {
      case "success":
        return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/10" };
      case "warning":
        return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/10" };
      case "error":
        return { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/10" };
      case "voice":
        return { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/10" };
      default:
        return { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/10" };
    }
  };

  return (
    <div className="bg-[#111216] border border-[#1e222b] rounded-2xl p-5 text-gray-300 shadow-xl flex flex-col h-full min-h-[350px]">
      <div className="flex items-center justify-between border-b border-[#1e222b] pb-3 mb-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">System Events Console</h3>
        </div>
        
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#1a1f29] transition-colors flex items-center space-x-1.5 text-xs font-medium"
            title="Clear Event Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="font-sans">Clear</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-thin pr-1">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
            <Terminal className="w-8 h-8 opacity-25 mb-2" />
            <p className="font-sans">No gateway events recorded yet.</p>
            <p className="font-sans text-[10px] mt-1 text-gray-600">Interact with the voice assistant or toggle dashboard devices to trigger pings.</p>
          </div>
        ) : (
          logs.map((log) => {
            const styles = getLogStyles(log.type);
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className={`border rounded-lg bg-[#0b0c10]/40 transition-colors ${styles.border} hover:bg-[#161a22]/30`}
              >
                <div
                  onClick={() => log.details && toggleExpand(log.id)}
                  className={`flex items-start justify-between p-2.5 ${log.details ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-start space-x-2.5">
                    <span className="text-gray-600 font-sans text-[10px] whitespace-nowrap mt-0.5">
                      {log.timestamp}
                    </span>
                    <span className={`font-semibold uppercase text-[9px] px-1.5 py-0.5 rounded ${styles.bg} ${styles.text} border ${styles.border}`}>
                      {log.type}
                    </span>
                    <span className="text-gray-200 break-all leading-normal">
                      {log.message}
                    </span>
                  </div>

                  {log.details && (
                    <div className="text-gray-500 hover:text-white transition-colors ml-2 mt-0.5 flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>

                {isExpanded && log.details && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#1e222b]/50 text-gray-400 text-[10px] overflow-x-auto bg-[#0b0c10]/70 select-text leading-relaxed whitespace-pre-wrap max-h-52 font-mono scrollbar-thin">
                    {log.details}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
