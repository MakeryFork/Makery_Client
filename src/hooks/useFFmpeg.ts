import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export function useFFmpeg(onError: (msg: string) => void) {
  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => console.log(message));
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL("/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg-core.wasm", "application/wasm"),
      });
      setFfmpegLoaded(true);
    } catch (e) {
      console.error("FFmpeg load error:", e);
      onError("Export engine failed to load. Refresh the page and try again.");
    }
  };

  return { ffmpegRef, ffmpegLoaded, loadFFmpeg };
}
