'use client'
import { useEffect, useRef, useState } from "react";

export default function SenderPage() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [, setIsOpen] = useState<boolean>(false);
  const [hidden, setHidden] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    // const socket = new WebSocket('ws://localhost:8080');
    const socket = new WebSocket('wss://v-test-b-1.onrender.com');
    setSocket(socket);
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'videoSender'
      }));
    };

    return () => {
      socket.close();
    };
  }, []);

  const initiateConn = async () => {
    if (!socket) {

      alert("Connection not found!!")
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: 'videoIceCandidate',
          candidate: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.send(JSON.stringify({
          type: 'videoCreateOffer',
          sdp: pc.localDescription
        }));
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'videoCreateAnswer') {
        await pc.setRemoteDescription(message.sdp);
      } else if (message.type === 'videoIceCandidate') {
        await pc.addIceCandidate(message.candidate);
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      setIsOpen(true);
      setHidden(false);
    } catch (error) {

      alert("Failed to access media devices!!")
      console.error("Error accessing media devices:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div >
      <div >
        <button onClick={initiateConn}>Start call</button>
        <div >
          <span ><a className="text-sky-500"></a> path.</span>
        </div>
      </div>
      <dialog
        open={!hidden}
      >
        <div >
          <div >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full max-h-[60vh] object-contain bg-white"
            />
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full max-h-[30vh] object-contain bg-white"
            />
          </div>
        </div>
      </dialog>
    </div>
  );
};