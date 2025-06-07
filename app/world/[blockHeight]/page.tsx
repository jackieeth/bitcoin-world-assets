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

import { getBlockImage, Block1stSat } from "../../../lib/gen-bitfeed";
import { parseMML, updateAnimations } from "../../../lib/mmlParser";
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
  const GRAVITY = -20; // m/s²  (tweak to taste)
  const JUMP_VEL = 8;
  const JUMP_MIN = 5; // lowest jump velocity (tap)
  const JUMP_MAX = 10; // highest jump velocity (full hold)
  const JUMP_HOLD_MS = 250; // how long it takes to reach full jump
  const halfHeight = 0.7; // half of player box height
  const MAX_JUMPS = 2; // ground jump + 1 extra
  const SKIN = 0.02; // 2 cm is ample at human scale
  const MAX_SLOPE = 0.7; // 0.7 ≈ cos(45°) — treat steeper faces as walls
  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const groundRef = useRef<THREE.Object3D | null>(null);
  const jumpsLeftRef = useRef<number>(MAX_JUMPS);
  const velocityRef = useRef(new THREE.Vector3()); // per-frame velocity
  const onGroundRef = useRef(true); // is avatar touching ground?

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
  const [mmlContent, setMmlDoc] = useState<string>("");
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
    // camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    canvasRef.current.appendChild(renderer.domElement);

    //------------------- orbit controls (3rd‑person camera)
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8; // smoother scroll
    controls.minDistance = 1.5; // feel free to tweak
    controls.maxDistance = 12;

    controls.enableDamping = true;
    if (isMobile) {
      controls.enableZoom = false;
      controls.enablePan = true;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.PAN;
    } else {
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
    }
    controls.minDistance = 2;
    controls.maxDistance = 30;

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
    playerMesh.visible = false;
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    playerLabelRef.current = makeLabel(playerName, labelsRef.current);
    playerLabelRef.current.style.display = "none";

    const smallCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffa200 }),
    );
    smallCube.position.set(0, -0.5, 0);
    smallCube.castShadow = true;
    playerMesh.add(smallCube);

    controls.target.copy(playerMesh.position); // keep focus

    // bring the camera a bit closer initially
    camera.position.set(0, 2, 4);

    //------------------- world + lights
    setupLights(scene);
    createMMLStructure(
      Number(blockHeight),
      2,
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const alreadyHeld = keysPressedRef.current["Space"]; // state *before* we flag it
        if (!alreadyHeld && jumpsLeftRef.current > 0) {
          velocityRef.current.y = JUMP_VEL; // upward impulse
          onGroundRef.current = false;
          jumpsLeftRef.current--; // consume a charge
        }
      }
      keysPressedRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    //------------------- movement helpers (3rd‑person flying)
    const clock = new THREE.Clock();
    const speed = 6;

    const smoothRemotes = (dt: number) => {
      const alpha = 1 - Math.exp(-dt * 10);
      remotePlayersRef.current.forEach(({ mesh, targetPos, label }) => {
        mesh.position.lerp(targetPos, alpha);
        updateLabel(mesh, label, camera);
      });
    };

    const checkCollision = (
      newPos: THREE.Vector3,
      ignore?: THREE.Object3D | null,
    ) => {
      const player = playerMeshRef.current;
      if (!player) return false;

      const playerBox = new THREE.Box3().setFromObject(player);
      playerBox.translate(newPos.clone().sub(player.position));

      for (const child of objectsRef.current) {
        if (
          child === player || // self
          child.parent === player || // parts of self
          child === ignore ||
          ignore?.parent === child // ground underfoot
        )
          continue;

        if (child instanceof THREE.Mesh && child.geometry) {
          const childBox = new THREE.Box3().setFromObject(child);
          if (playerBox.intersectsBox(childBox)) return true;
        }
      }
      return false;
    };

    const updateLocal = (dt: number) => {
      if (!playerMesh) return;

      /* ----------------------- INPUT ----------------------- */
      const dir = new THREE.Vector3(
        (keysPressedRef.current["KeyD"] ? 1 : 0) -
          (keysPressedRef.current["KeyA"] ? 1 : 0),
        0,
        (keysPressedRef.current["KeyW"] ? 1 : 0) -
          (keysPressedRef.current["KeyS"] ? 1 : 0),
      );

      // normalise only horizontal part
      if (dir.lengthSq() > 0) dir.normalize();

      /* ------------------ frame-dependent speed ------------ */
      let currentSpeed =
        speed *
        (keysPressedRef.current["ShiftLeft"] ||
        keysPressedRef.current["ShiftRight"]
          ? 2.5
          : 1);
      if (!onGroundRef.current) currentSpeed *= 0.4; // ↓ air control

      /* --------------- convert input to world space -------- */
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();

      const move = new THREE.Vector3()
        .addScaledVector(forward, dir.z)
        .addScaledVector(right, dir.x)
        .multiplyScalar(currentSpeed);

      /* ------------------- apply physics ------------------- */
      const vel = velocityRef.current;

      vel.x = move.x; // direct-drive horizontal velocity
      vel.z = move.z;
      // vel.y += GRAVITY * dt;              // gravity integration
      if (!onGroundRef.current) vel.y += GRAVITY * dt;

      const nextPos = playerMesh.position.clone().addScaledVector(vel, dt);

      /* ----------- ground / mesh collision & landing -------- */

      let landed = false;

      // 1) ground plane at y=0
      if (nextPos.y - halfHeight < 0) {
        nextPos.y = halfHeight;
        vel.y = 0;
        landed = true;
      }

      // 2) meshes: simple “down” ray hit-test
      const downRay = new THREE.Raycaster(
        new THREE.Vector3(nextPos.x, nextPos.y, nextPos.z),
        new THREE.Vector3(0, -1, 0),
        0,
        halfHeight + 0.05, // small epsilon
      );
      const rayOrigin = nextPos.clone();
      rayOrigin.y += SKIN; // begin just inside the collider
      downRay.set(rayOrigin, DOWN);
      downRay.far = halfHeight + SKIN + 0.1;
      const hits = downRay
        .intersectObjects(objectsRef.current, true)
        .filter((h) => h.face && h.face.normal.dot(UP) > MAX_SLOPE);
      if (hits.length > 0) {
        const groundY = hits[0].point.y; // reliable top-face hit
        const desiredY = groundY + halfHeight + SKIN;

        // (c) only snap if the difference is meaningful
        if (Math.abs(nextPos.y - desiredY) > 1e-4) nextPos.y = desiredY;

        vel.y = 0;
        landed = true;
        groundRef.current = hits[0].object; // <— NEW
      } else {
        groundRef.current = null;
      }

      onGroundRef.current = landed;
      if (landed) jumpsLeftRef.current = MAX_JUMPS;

      const blocked = checkCollision(nextPos, groundRef.current);
      if (!blocked) {
        playerMesh.position.copy(nextPos);
      }

      // /* ---------------- apply position --------------------- */
      // playerMesh.position.copy(nextPos);

      /* --------------- send network update ---------------- */
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "update",
            id: playerId,
            pos: playerMesh.position,
          }),
        );
      }

      /* ----------------- update label --------------------- */
      if (playerLabelRef.current && connectedRef.current) {
        updateLabel(playerMesh, playerLabelRef.current, camera);
        playerLabelRef.current.style.display = "block";
      }
    };

    const animate = () => {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (sceneRef.current) {
        updateAnimations(sceneRef.current, dt);
      }
      updateLocal(dt);
      smoothRemotes(dt);

      // Ensure controls target stays above y=0
      controls.target.copy(playerMesh.position);
      controls.target.y = Math.max(0, controls.target.y);
      controls.update();

      renderer.render(scene, camera);
    };
    animate();

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
        console.log(error, "ordiscan is down");
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

  function registerMeshes(root: THREE.Object3D) {
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        objectsRef.current.push(child as THREE.Mesh);
      }
    });
  }

  const checkMember = async () => {
    setIsEntering(true);
    try {
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
        ).then((d) => d.json());

        if (resHolder["success"] && resHolder["blk"]) {
          const mmlUrl =
            "https://quark20a.s3.us-west-1.amazonaws.com/q/bc1pdrr0vwh2x63u2vmxmcwn8v8l57d6dzrh7hzlhggg48vkjrfa2cvquqlesy.xml";
          const mmlContent = await fetch(mmlUrl).then((d) => d.text());
          setMmlDoc(mmlContent);

          if (sceneRef.current) {
            try {
              const mmlObject = parseMML(mmlContent);
              sceneRef.current!.add(mmlObject);
              registerMeshes(mmlObject);
              if (Array.isArray(objectsRef.current)) {
                objectsRef.current.push(...mmlObject.children);
              }
            } catch (error) {
              console.error("Error parsing MML:", error);
            }
          }

          if (resHolder["blk"] < 100000) {
            setPlayerName(`BLOCK ${resHolder["blk"]}`);
          } else {
            setPlayerName(newName);
          }
        } else {
          setPlayerName(newName);
        }
        setConnected(true);
      }
    } catch (error) {
      console.error("Error during member check:", error);
    } finally {
      setIsEntering(false);
    }
  };

  // =============== JSX layout ================
  return (
    <main className="relative max-w-screen max-h-screen bg-black text-white">
      <div ref={canvasRef} className="w-full h-full" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0" />

      {/* info panel */}
      <div className="absolute top-4 left-4 text-xl">
        <a href="/" className="text-slate-400 text-xs">
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
          {satInfo && satInfo.creation_date && (
            <span>Mined: {satInfo.creation_date}</span>
          )}
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
        {parcelStats && (
          <div className="text-xs mt-2">
            <strong>Parcel info:</strong>
            <br />
            {Object.entries(parcelStats.counts).map(([size, count]) => (
              <div key={size}>
                size {size}: {count}
              </div>
            ))}
            <div>
              Total: <b>{parcelStats.total}</b>
            </div>
          </div>
        )}
        {xverseAvailable && !connected && (
          <div>
            <br />
            <button
              onClick={checkMember}
              className="mt-6 w-60 px-4 py-1.5 text-white text-xs rounded hover:bg-orange-400 border border-white transition-colors"
            >
              {Entering ? (
                "Entering..."
              ) : (
                <span>Enter Bitcoin World #{blockHeight}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
