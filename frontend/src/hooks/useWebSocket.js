import { useEffect, useRef, useCallback } from 'react';
import { webSocketService } from '../services/websocket';

export const useWebSocket = (onMessage) => {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const handleMessage = (message) => {
      if (onMessageRef.current) {
        onMessageRef.current(message);
      }
    };

    webSocketService.addMessageHandler(handleMessage);
    webSocketService.connect();

    return () => {
      webSocketService.removeMessageHandler(handleMessage);
    };
  }, []);

  const subscribe = useCallback((channel, params) => {
    webSocketService.subscribe(channel, params);
  }, []);

  const unsubscribe = useCallback((channel) => {
    webSocketService.unsubscribe(channel);
  }, []);

  const send = useCallback((message) => {
    webSocketService.send(message);
  }, []);

  return { subscribe, unsubscribe, send };
};