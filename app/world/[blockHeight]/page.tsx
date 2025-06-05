"use client";

import { useEffect, useRef, useState } from "react";

// Extend the Window interface to include XverseProviders
declare global {
  interface Window {
    XverseProviders?: any;
  }
}
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
  const [playerName, setPlayerName] = useState<string>(
    () => `player${Math.floor(1000 + Math.random() * 9000)}`,
  );

  const [connected, setConnected] = useState(false);

  const [blockImageUrl, setBlockImageUrl] = useState<string>("");
  const [satInfo, setSatInfo] = useState<any>({});
  const [imgLoaded, setImgLoaded] = useState(false);
   const [Entering, setIsEntering] = useState(false);
  const [xmlContent, setXmlDoc] = useState<string>("");
  const [traitLine, setTraitLine] = useState<string>("");

  const [parcelStats, setParcelStats] = useState<{
    counts: Record<string, number>;
    total: number;
  } | null>(null);
  const connectedRef = useRef(connected);
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  if (!blockHeight) return null;

  const [xverseAvailable, setXverseAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.XverseProviders) {
      setXverseAvailable(true);
    }
  }, []);

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
    camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    canvasRef.current.appendChild(renderer.domElement);

    //------------------- orbit controls (3rd‑person camera)
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    if (isMobile) {
        // On mobile, disable zoom and enable two-finger tap panning
        controls.enableZoom = false;
        controls.enablePan = true;
        controls.touches.ONE = THREE.TOUCH.ROTATE;
        controls.touches.TWO = THREE.TOUCH.PAN;
    } else {
        // On desktop, enable zoom and use right mouse button for panning only
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    }
    controls.minDistance = 2;
    controls.maxDistance = 15;

    //------------------- local cube (player)
    const playerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffa200 }),
    );
    playerMesh.castShadow = true;
    playerMesh.position.set(
      Math.random() * 5 - 2.5,
      1.5,
      Math.random() * 5 - 2.5,
    );
    playerMesh.visible = false; // hide until entering the world
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    playerLabelRef.current = makeLabel(playerName, labelsRef.current);
    playerLabelRef.current.style.display = "none";

    // decorative small cube under main cube
    const smallCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffa200 }),
    );
    smallCube.position.set(0, -0.5, 0);
    smallCube.castShadow = true;
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

    //------------------- movement helpers (3rd‑person flying)
    const clock = new THREE.Clock();
    const speed = 6; // units per second

    const smoothRemotes = (dt: number) => {
      const alpha = 1 - Math.exp(-dt * 10);
      remotePlayersRef.current.forEach(({ mesh, targetPos, label }) => {
        mesh.position.lerp(targetPos, alpha);
        updateLabel(mesh, label, camera);
      });
    };

    // ======= Collision helper =======
    const checkCollision = (newPos: THREE.Vector3) => {
      const player = playerMeshRef.current;
      if (!player || !objectsRef.current) return false;

      // Update the player's world matrix.
      player.updateMatrixWorld(true);
      // Create the player's current bounding box.
      const playerBox = new THREE.Box3().setFromObject(player);
      // Calculate the offset and translate the box.
      const offset = newPos.clone().sub(player.position);
      playerBox.translate(offset);

      let collided = false;
      // console.log("objectsRef.current:", objectsRef)
      objectsRef.current.forEach((child) => {
        // Skip the player and any direct children of the player.
        if (child === player || child.parent === player) return;
        if (child instanceof THREE.Mesh && child.geometry) {
          child.updateMatrixWorld(true);
          const childBox = new THREE.Box3().setFromObject(child);
          if (playerBox.intersectsBox(childBox)) {
            collided = true;
          }
        }
      });
      return collided;
    };

    const updateLocal = (dt: number) => {
    const moveInput = new THREE.Vector3();
    if (keysPressedRef.current["KeyW"]) moveInput.z += 1;
    if (keysPressedRef.current["KeyS"]) moveInput.z -= 1;
    if (keysPressedRef.current["KeyA"]) moveInput.x -= 1;
    if (keysPressedRef.current["KeyD"]) moveInput.x += 1;
    if (keysPressedRef.current["Space"]) moveInput.y += 1;
    if (
      keysPressedRef.current["ShiftLeft"] ||
      keysPressedRef.current["ShiftRight"]
    )
      moveInput.y -= 1;

    if (moveInput.lengthSq() > 0) {
      moveInput.normalize();

      // camera‑relative directions
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const worldMove = new THREE.Vector3();
      worldMove.addScaledVector(forward, moveInput.z);
      worldMove.addScaledVector(right, moveInput.x);
      worldMove.addScaledVector(new THREE.Vector3(0, 1, 0), moveInput.y);

      const dtSpeed = dt * speed;
      const currentPos = playerMesh.position.clone();
      const nextPos = currentPos.add(worldMove.clone().multiplyScalar(dtSpeed));

      if (!checkCollision(nextPos)) {
        // No collision: update normally.
        playerMesh.position.copy(nextPos);
      } else {
        // Collision detected: push avatar out.
        let pushDir = new THREE.Vector3();
        const playerBox = new THREE.Box3().setFromObject(playerMesh);
        objectsRef.current.forEach((child) => {
          // Skip the player and its direct children.
          if (child === playerMesh || child.parent === playerMesh) return;
          if (child instanceof THREE.Mesh && child.geometry) {
            child.updateMatrixWorld(true);
            const childBox = new THREE.Box3().setFromObject(child);
            if (playerBox.intersectsBox(childBox)) {
              // Compute the center of the colliding object.
              const childCenter = new THREE.Vector3();
              childBox.getCenter(childCenter);
              const dir = playerMesh.position.clone().sub(childCenter);
              if (dir.lengthSq() > 0) {
                pushDir.add(dir.normalize());
              }
            }
          }
        });
        if (pushDir.lengthSq() > 0) {
          // Adjust pushStrength as needed.
          const pushStrength = .1;
          pushDir.normalize();
          playerMesh.position.add(pushDir.multiplyScalar(pushStrength));
        }
      }
    }

    // broadcast position to server
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "update",
          id: playerId,
          pos: playerMesh.position,
        }),
      );
    }

    // label follow
    if (playerLabelRef.current && connectedRef.current) {
      updateLabel(playerMesh, playerLabelRef.current, camera);
      playerLabelRef.current.style.display = "block";
    }
};

    const animate = () => {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();

      updateAnimations(objectsRef.current, dt);
      updateLocal(dt);
      smoothRemotes(dt);

      // keep camera orbiting the player
      controls.target.copy(playerMesh.position);
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
  }, [blockHeight, playerId]);

  useEffect(() => {
    if (playerMeshRef.current) {
      playerMeshRef.current.visible = connected;
    }
    if (playerLabelRef.current) {
      playerLabelRef.current.style.display = connected ? "block" : "none";
    }
  }, [connected]);

  useEffect(() => {
    if (playerLabelRef.current) {
      playerLabelRef.current.textContent = playerName;
    }
  }, [playerName]);

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
          smallCube.castShadow = true;
          mesh.add(smallCube);
        }
        remote.label.textContent = p.name ?? id.slice(-4);
        remote.targetPos.set(p.x, p.y, p.z);
        if (remote.mesh.position.lengthSq() === 0)
          remote.mesh.position.copy(remote.targetPos);
      });

      // remove stale players
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
  }, [connected, blockHeight, playerId]);

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
      try {
          const sat = await new Ordiscan(apiKey).sat.getInfo(
          Block1stSat(Number(blockHeight)),
        );
        setSatInfo({
          ...sat,
          rarity: sat.satributes
            .sort((a: string, b: string) => a.localeCompare(b))
            .join(" "),
        });
      } catch (error) {
        console.log(error, "ordiscan is down")

      }
      
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

  const checkMember = async () => {
    setIsEntering(true);
    const res = await window.XverseProviders.BitcoinProvider.request(
      "getAccounts",
      {
        purposes: ["ordinals"],
        message: "Bitcoin World Asset",
      },
      window.XverseProviders.BitcoinProvider,
    );
    if (res.result) {
      const ordinalsAddressItem = res.result.find(
        (address: any) => address.purpose === "ordinals",
      );
      const ordAddress = ordinalsAddressItem?.address;
      const newName = ordAddress.slice(0, 4) + "..." + ordAddress.slice(-4);
      const resHolder = await fetch(
        `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/getbwauser?btcAddress=${ordAddress}&passcode=${process.env.NEXT_PUBLIC_QUARK20_API_GETHOLDER_KEY}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      ).then((d) => d.json());
      if (resHolder["success"] && resHolder["blk"]){
        if (resHolder["blk"] < 100000){
          setPlayerName(`BLOCK ${resHolder["blk"]}`);
        } else {
          setPlayerName(newName);
        }
      } else {
        setPlayerName(newName);
      }
      setConnected(true);
    }
    setIsEntering(false);
  };

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
          {satInfo && satInfo.creation_date && <span>Mined: {satInfo.creation_date}</span>}
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

        { xverseAvailable && !connected && (
          <div><br/><button
            onClick={checkMember}
            className="mt-6 w-60 px-4 py-1.5 text-white text-xs rounded hover:bg-gray-500 border border-white transition-colors"
          >
            {Entering ? "Entering...":<span>Enter Bitcoin World {blockHeight}</span>}
          </button></div>
        )}
      </div>
    </main>
  );
}
