"use client";

import { useEffect, useRef, useState } from "react";
import Ordiscan from "ordiscan";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useParams } from "next/navigation";

import {
  updateAnimations,
  getBlockImage,
  Block1stSat,
} from "../../../lib/gen-bitfeed";
import blocksOfSats from "../../../lib/uncommonBlocksOf.json";
import uncommonSatribute from "../../../lib/uncommonSatributes.json";
import {
  setupLights,
  createMMLStructure,
  generateId,
  makeLabel,
  updateLabel,
} from "../../../lib/blockUtils";

interface RemotePlayer {
  mesh: THREE.Mesh;
  targetPos: THREE.Vector3;
  label: HTMLDivElement;
}

export default function BlockPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const objectsRef = useRef<any[]>([]);
  const playerMeshRef = useRef<THREE.Mesh>(null);
  const playerLabelRef = useRef<HTMLDivElement>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});

  const params = useParams();
  const blockHeight = params.blockHeight as string | undefined;
  const [playerId] = useState<string>(() => generateId());
  const [playerName] = useState<string>(
    () => `player${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [connected, setConnected] = useState(false);

  const [blockImageUrl, setBlockImageUrl] = useState<string>("");
  const [satInfo, setSatInfo] = useState<any>({});
  const [imgLoaded, setImgLoaded] = useState(false);
  const [xmlContent, setXmlDoc] = useState<string>("");
  const [traitLine, setTraitLine] = useState<string>("");
  const [parcelStats, setParcelStats] = useState<{
    counts: Record<string, number>;
    total: number;
  } | null>(null);

  if (!blockHeight) return null;

  // =============== THREE scene initialisation ================
  useEffect(() => {
    if (!canvasRef.current || !labelsRef.current) return;

    //------------------- scene, camera, renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    canvasRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    //------------------- local cube
    const playerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffa200 }),
    );
    playerMesh.castShadow = true;
    playerMesh.position.set(0, 2, 0);
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    playerLabelRef.current = makeLabel(playerName, labelsRef.current);
    // Create and attach a smaller cube under the main cube
    const smallCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffa200 }),
    );
    smallCube.position.set(0, -0.5, 0);
    playerMesh.add(smallCube);

    //------------------- world + lights
    setupLights(scene);
    createMMLStructure(
      Number(blockHeight),
      0.5,
      "#ccc",
      `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/gettxdata` || "",
      process.env.NEXT_PUBLIC_QUARK20_API_KEY || "",
      scene,
      camera,
      controls,
      renderer,
      objectsRef,
      setXmlDoc,
      setParcelStats,
    );

    //------------------- event handlers
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    const onKeyDown = (e: KeyboardEvent) =>
      (keysPressedRef.current[e.code] = true);
    const onKeyUp = (e: KeyboardEvent) =>
      (keysPressedRef.current[e.code] = false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    //------------------- animation loop
    const clock = new THREE.Clock();
    const speed = 10;
    const cameraOffset = new THREE.Vector3(0, 5, 10);

    const smoothRemotes = (dt: number) => {
      const alpha = 1 - Math.exp(-dt * 10);
      remotePlayersRef.current.forEach(({ mesh, targetPos, label }) => {
        mesh.position.lerp(targetPos, alpha);
        updateLabel(mesh, label, camera);
      });
    };

    const updateLocal = (dt: number) => {
      const m = new THREE.Vector3();
      if (keysPressedRef.current["KeyW"]) m.z -= 1;
      if (keysPressedRef.current["KeyS"]) m.z += 1;
      if (keysPressedRef.current["KeyA"]) m.x -= 1;
      if (keysPressedRef.current["KeyD"]) m.x += 1;
      if (keysPressedRef.current["Space"]) m.y += 1;
      if (
        keysPressedRef.current["ShiftLeft"] ||
        keysPressedRef.current["ShiftRight"]
      )
        m.y -= 1;
      if (m.lengthSq() > 0)
        playerMesh.position.add(m.normalize().multiplyScalar(dt * speed));

      // send position
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "update",
            id: playerId,
            pos: playerMesh.position,
          }),
        );
      }

      // camera follow
      camera.position.lerp(playerMesh.position.clone().add(cameraOffset), 0.1);
      camera.lookAt(playerMesh.position);

      // label
      if (playerLabelRef.current)
        updateLabel(playerMesh, playerLabelRef.current, camera);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      updateAnimations(objectsRef.current, dt);
      updateLocal(dt);
      smoothRemotes(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    //------------------- cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.dispose();
    };
  }, [blockHeight, playerId, playerName]);

  // =============== WebSocket connection ================
  useEffect(() => {
    if (!connected) return;
    const wsUrl =
      (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080") +
      `?room=${blockHeight}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", id: playerId, name: playerName }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type !== "state") return;
      const playersState: Record<
        string,
        { x: number; y: number; z: number; name?: string }
      > = data.players;
      Object.entries(playersState).forEach(([id, p]) => {
        if (id === playerId) return;
        let remote = remotePlayersRef.current.get(id);
        if (!remote) {
          if (!labelsRef.current) return;
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({
              color: "orange",
              transparent: true,
              opacity: 0.7,
            }),
          );
          mesh.castShadow = true;
          sceneRef.current?.add(mesh);
          const label = makeLabel(p.name ?? id.slice(-4), labelsRef.current);
          remote = { mesh, label, targetPos: new THREE.Vector3() };
          remotePlayersRef.current.set(id, remote);
          const smallCube = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshStandardMaterial({
              color: "orange",
              transparent: true,
              opacity: 0.7,
            }),
          );
          smallCube.position.set(0, -0.5, 0);
          mesh.add(smallCube);
        }
        remote.label.textContent = p.name ?? id.slice(-4);
        remote.targetPos.set(p.x, p.y, p.z);
        if (remote.mesh.position.lengthSq() === 0)
          remote.mesh.position.copy(remote.targetPos);
      });

      // remove stale
      remotePlayersRef.current.forEach((remote, id) => {
        if (!playersState[id]) {
          sceneRef.current?.remove(remote.mesh);
          labelsRef.current?.removeChild(remote.label);
          remotePlayersRef.current.delete(id);
        }
      });
    };

    ws.onclose = () => {
      remotePlayersRef.current.forEach(({ mesh, label }) => {
        sceneRef.current?.remove(mesh);
        labelsRef.current?.removeChild(label);
      });
      remotePlayersRef.current.clear();
    };

    return () => ws.close();
  }, [connected, blockHeight, playerId, playerName]);

  // =============== data‑fetching effects ================
  useEffect(() => {
    if (!blockHeight) return;
    (async () => {
      const url = await getBlockImage(
        Number(blockHeight),
        process.env.NEXT_PUBLIC_BLOCKIMAGE_URL || "",
      );
      setBlockImageUrl(url);
    })();
  }, [blockHeight]);

  useEffect(() => {
    if (!blockHeight) return;
    (async () => {
      const apiKey = process.env.NEXT_PUBLIC_ORDISCAN_API_KEY;
      if (!apiKey) return;
      const sat = await new Ordiscan(apiKey).sat.getInfo(
        Block1stSat(Number(blockHeight)),
      );
      setSatInfo({
        ...sat,
        rarity: sat.satributes
          .sort((a: string, b: string) => a.localeCompare(b))
          .join(" "),
      });
    })();
  }, [blockHeight]);

  useEffect(() => {
    if (!blockHeight) return;
    const traits: string[] = [];
    if (uncommonSatribute["size9"].includes(Number(blockHeight)))
      traits.push("Size9");
    if (uncommonSatribute["bitmap"].includes(Number(blockHeight)))
      traits.push(".bitmap");
    if (blocksOfSats["blocksOf"].includes(Number(blockHeight)))
      traits.push("BlocksOfBitcoin");
    setTraitLine(traits.join(" ").trim());
  }, [blockHeight]);

  // =============== JSX layout ================
  return (
    <main className="relative max-w-screen max-h-screen bg-black text-white">
      <div ref={canvasRef} className="w-full h-full" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0" />

      {/* info panel */}
      <div className="absolute top-4 left-4 text-xl">
        <a href="/" className="text-slate-400 text-xs underline">
          Bitcoin World Asset
        </a>
        <br />
        {blockHeight ? `BLOCK ${blockHeight}` : "Loading..."}
        <br />
        <span className="text-xs text-slate-400">
          {satInfo.rarity && (
            <span className="text-gray-300">{satInfo.rarity}</span>
          )}
          <br />
          SAT #{Block1stSat(Number(blockHeight))}
          {traitLine && (
            <span className="text-gray-300">
              <br />
              Traits: {traitLine}
            </span>
          )}
          <br />
          Mined: {satInfo.creation_date}
        </span>

        {blockImageUrl && (
          <a
            href={`https://bitfeed.live/block/height/${blockHeight}`}
            target="_blank"
            className="block mt-2"
          >
            <img
              src={blockImageUrl}
              onLoad={() => setImgLoaded(true)}
              className={`w-24 h-24 grayscale transition-opacity duration-700 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </a>
        )}

        {/* Enter World */}
        {!connected && (
          <button
            onClick={() => setConnected(true)}
            className="mt-6 px-4 py-1.5 text-white text-xs rounded hover:bg-gray-500 border border-white transition-colors"
          >
            Enter Bitcoin World {blockHeight}
          </button>
        )}
      </div>
    </main>
  );
}
