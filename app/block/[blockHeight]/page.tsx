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
import { downloadFile, setupLights, createMMLStructure } from "./blockUtils";

export default function BlockPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<any[]>([]);
  const params = useParams();
  const blockHeight = params.blockHeight;
  const [blockImageUrl, setBlockImageUrl] = useState<string>("");
  const [satInfo, setSatInfo] = useState<any>({});
  const [imgLoaded, setImgLoaded] = useState(false);
  const [xmlContent, setXmlDoc] = useState<string>("");
  const [traitLine, setTraitLine] = useState<string>("");
  // New state for parcel stats
  const [parcelStats, setParcelStats] = useState<{
    counts: Record<string, number>;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const clock = new THREE.Clock();
    let scene: any, camera: any, renderer: any, controls: any;
    let objects = [];

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(50, 40, 80);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasRef.current.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    controls.zoomSpeed = 1.0;
    controls.rotateSpeed = 0.1;

    setupLights(scene);
    createMMLStructure(
      Number(blockHeight),
      0.5,
      "#cccccc",
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
    window.addEventListener("resize", onWindowResize);

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      updateAnimations(objectsRef.current, delta);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      if (canvasRef.current && renderer.domElement) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    async function fetchBlockImage() {
      if (blockHeight) {
        const url = await getBlockImage(
          Number(blockHeight),
          process.env.NEXT_PUBLIC_BLOCKIMAGE_URL || "",
        );
        setBlockImageUrl(url);
      }
    }
    fetchBlockImage();
  }, [blockHeight]);

  useEffect(() => {
    async function fetchSat() {
      if (blockHeight) {
        const apiKey = process.env.NEXT_PUBLIC_ORDISCAN_API_KEY;
        if (!apiKey) throw new Error("API key not provided");
        const ordiscan = new Ordiscan(apiKey);
        const satData = await ordiscan.sat.getInfo(
          Block1stSat(Number(blockHeight)),
        );

        const sortedSatributes = satData.satributes.sort(
          (a: string, b: string) => a.localeCompare(b),
        );
        const satDataWithRarity = {
          ...satData,
          rarity: sortedSatributes.join(" "),
        };
        setSatInfo(satDataWithRarity);
      }
    }
    fetchSat();
  }, [blockHeight]);

  useEffect(() => {
    async function fetchTraits() {
      const traits = [];
      if (uncommonSatribute["size9"].includes(Number(blockHeight))) {
        traits.push("Size9");
      }
      if (uncommonSatribute["bitmap"].includes(Number(blockHeight))) {
        traits.push(".bitmap");
      }
      if (blocksOfSats["blocksOf"].includes(Number(blockHeight))) {
        traits.push("BlocksOfBitcoin");
      }
      setTraitLine(traits.join(" ").trim());
    }
    fetchTraits();
  }, [blockHeight]);

  return (
    <main className="relative max-w-screen max-h-screen bg-black text-white">
      <div ref={canvasRef} className="w-full h-screen" />

      <div className="absolute top-4 left-4 text-xl">
        <a href="/" className="text-xs text-slate-400">
          Bitcoin World Asset
        </a>
        <br />
        {blockHeight ? `BLOCK ${blockHeight}` : "Loading BTC block..."}
        <br />
        <span className="text-xs text-slate-400">
          <span style={{ color: "#ccc" }}>
            {satInfo && satInfo.rarity && `${satInfo.rarity}`}
          </span>
          <br />
          SAT #{Block1stSat(Number(blockHeight))}
          {traitLine ? (
            <span style={{ color: "#ccc" }}>
              <br />
              Traits: {traitLine}
            </span>
          ) : (
            <span />
          )}
          <br />
          Mined: {satInfo.creation_date}
          <br />
        </span>

        {blockImageUrl && (
          <a
            style={{ textDecoration: "underline" }}
            href={`https://bitfeed.live/block/height/${blockHeight}`}
          >
            <img
              src={blockImageUrl}
              className={`w-24 h-24 mt-2 grayscale transition-opacity duration-700 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
            />
          </a>
        )}
        <button
          className="text-xs text-slate-400"
          onClick={() => downloadFile(`block_${blockHeight}.xml`, xmlContent)}
        >
          [Download 3D data]
        </button>
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
      </div>
    </main>
  );
}
