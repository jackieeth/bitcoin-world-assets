"use client";

import { useEffect, useRef, useState } from "react";
import Ordiscan from "ordiscan";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useParams } from "next/navigation";
import {
  genBitFeedMml,
  processXMLNode,
  updateAnimations,
  getBlockImage,
  Block1stSat
} from "../../../lib/gen-bitfeed";

export default function BlockPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<any[]>([]);
  const params = useParams();
  const blockHeight = params.blockHeight;
  const [blockImageUrl, setBlockImageUrl] = useState<string>("");
  const [satInfo, setSatInfo] = useState<any>({});
  const [imgLoaded, setImgLoaded] = useState(false);
  const [xmlContent, setXmlDoc] = useState<string>("");
  // New state for parcel stats
  const [parcelStats, setParcelStats] = useState<{ counts: Record<string, number>, total: number } | null>(null);

  function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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

    setupLights();
    createMMLStructure(Number(blockHeight));
    window.addEventListener("resize", onWindowResize);

    function setupLights() {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 2.8);
      mainLight.position.set(50, 50, 25);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 500;
      const d = 100;
      mainLight.shadow.camera.left = -d;
      mainLight.shadow.camera.right = d;
      mainLight.shadow.camera.top = d;
      mainLight.shadow.camera.bottom = -d;
      scene.add(mainLight);

      const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
      backLight.position.set(-10, 10, -10);
      scene.add(backLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-20, 0, 20);
      scene.add(fillLight);
    }

    async function createMMLStructure(blockHeight: number) {
      const defaultSize = 0.5;
      const parcelColor = "#cccccc";
      const { mmlFile, blockWidth, parcelSizeCounts } = await genBitFeedMml(
        blockHeight,
        defaultSize,
        parcelColor,
        `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/gettxdata` || "",
        process.env.NEXT_PUBLIC_QUARK20_API_KEY || "",
      );

      // Set parcel stats state
      setParcelStats({
        counts: parcelSizeCounts,
        total: Object.values(parcelSizeCounts).reduce((sum, count) => sum + count, 0)
      });

      const xmlString = mmlFile;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      setXmlDoc(xmlString)
      const mainGroup = new THREE.Group();
      objectsRef.current = processXMLNode(xmlDoc.documentElement, mainGroup);
      scene.add(mainGroup);

      const box = new THREE.Box3().setFromObject(mainGroup);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let distance = maxSize / (2 * Math.tan(fov / 2));
      distance *= 0.8;
      camera.position.set(
        center.x + distance,
        center.y + distance,
        center.z + distance,
      );
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

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
          process.env.NEXT_PUBLIC_BLOCKIMAGE_URL || ""
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
        const satData = await ordiscan.sat.getInfo(Block1stSat(Number(blockHeight)));

        const sortedSatributes = satData.satributes.sort(
          (a: string, b: string) => a.localeCompare(b),
        );
        const satDataWithRarity = { ...satData, rarity: sortedSatributes.join(" ") };
        setSatInfo(satDataWithRarity);
      }
    }
    fetchSat();
  }, [blockHeight]);

  return (
    <main className="relative max-w-screen max-h-screen bg-black text-white">
      <div ref={canvasRef} className="w-full h-screen" />
      
      <div className="absolute top-4 left-4 text-xl">
        <a href="/" className="text-xs text-slate-400">Bitcoin World Asset</a><br/>
        {blockHeight ? `BLOCK ${blockHeight}` : "Loading BTC block..."}
        <br />
        <span className="text-xs text-slate-400">
          SAT #{Block1stSat(Number(blockHeight))} {satInfo && satInfo.rarity && `(${satInfo.rarity})`}<br/>
          {satInfo.creation_date}<br/>
        </span>
        <span className="text-xs">
          BTC block data <a style={{textDecoration: "underline"}} href={`https://bitfeed.live/block/height/${blockHeight}`}>visualized</a>
        </span><br/>
        {blockImageUrl && (
          <img
            src={blockImageUrl}
            className={`w-24 h-24 mt-2 grayscale transition-opacity duration-700 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
          />
        )}
        <button
          className="text-xs text-slate-400"
          onClick={() => downloadFile(`block_${blockHeight}.xml`, xmlContent)}
        >
          [Download 3D data]
        </button>
        {parcelStats && (
          <div className="text-xs mt-2">
            <strong>Parcel info:</strong><br/>
            {Object.entries(parcelStats.counts).map(([size, count]) => (
              <div key={size}>size {size}: {count}</div>
            ))}
            <div>Total: <b>{parcelStats.total}</b></div>
          </div>
        )}
      </div>

    </main>
  );
}
