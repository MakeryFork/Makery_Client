import { useEffect, useRef, useState } from "react";
import { PIXELS_PER_SECOND } from "@/components/editor/types";

export function usePlayback(maxDuration: number, timelineRef: React.RefObject<HTMLDivElement>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const maxDurationRef = useRef(maxDuration);
  maxDurationRef.current = maxDuration;

  const loop = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    let newTime = currentTimeRef.current + deltaTime;
    if (newTime >= maxDurationRef.current) {
      newTime = maxDurationRef.current;
      setIsPlaying(false);
    }
    currentTimeRef.current = newTime;
    setCurrentTime(newTime);

    if (timelineRef.current) {
      timelineRef.current.scrollLeft = newTime * PIXELS_PER_SECOND;
    }
    if (newTime < maxDurationRef.current) {
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      if (currentTimeRef.current >= maxDurationRef.current) {
        currentTimeRef.current = 0;
        setCurrentTime(0);
      }
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(loop);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = 0;
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isPlaying && currentTimeRef.current >= maxDurationRef.current) {
      currentTimeRef.current = 0;
    }
    setIsPlaying((p) => !p);
  };

  const handleScroll = () => {
    if (!isPlaying && timelineRef.current) {
      const time = timelineRef.current.scrollLeft / PIXELS_PER_SECOND;
      currentTimeRef.current = time;
      setCurrentTime(time);
    }
  };

  return { isPlaying, setIsPlaying, currentTime, currentTimeRef, togglePlay, handleScroll };
}
