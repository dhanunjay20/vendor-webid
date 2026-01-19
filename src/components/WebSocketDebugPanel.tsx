import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DebugEvent {
  timestamp: string;
  type: string;
  data: any;
}

interface WebSocketDebugPanelProps {
  isConnected: boolean;
  currentUserId: string;
  typingStatus: Record<string, boolean>;
  events: DebugEvent[];
}

export const WebSocketDebugPanel: React.FC<WebSocketDebugPanelProps> = ({
  isConnected,
  currentUserId,
  typingStatus,
  events,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
        >
          Debug Panel (Ctrl+Shift+D)
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">WebSocket Debug Panel</CardTitle>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <div className="font-semibold mb-1">Connection Status</div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div>
            <div className="font-semibold mb-1">Current User ID</div>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{currentUserId || 'Not Set'}</code>
          </div>

          <div>
            <div className="font-semibold mb-1">Active Typing States</div>
            {Object.keys(typingStatus).length === 0 ? (
              <div className="text-gray-500 italic">No active typing</div>
            ) : (
              <div className="space-y-1">
                {Object.entries(typingStatus).map(([userId, isTyping]) => (
                  <div key={userId} className="flex items-center gap-2">
                    <Badge variant={isTyping ? 'default' : 'secondary'} className="text-xs">
                      {isTyping ? 'Typing' : 'Stopped'}
                    </Badge>
                    <code className="text-xs">{userId.substring(0, 12)}...</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="font-semibold mb-1">Recent Events ({events.length})</div>
            <ScrollArea className="h-48 border rounded p-2">
              {events.length === 0 ? (
                <div className="text-gray-500 italic">No events yet</div>
              ) : (
                <div className="space-y-2">
                  {events.slice(-20).reverse().map((event, idx) => (
                    <div key={idx} className="border-b pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <span className="text-gray-500 text-xs">{event.timestamp}</span>
                      </div>
                      <pre className="text-xs bg-gray-50 p-1 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t">
            Press Ctrl+Shift+D to toggle this panel
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
