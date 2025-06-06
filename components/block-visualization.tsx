"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  genBitFeedMml,
  processXMLNode,
  updateAnimations,
} from "../lib/gen-bitfeed";

interface BlockVisualizationProps {
  blockHeight: number;
}

export function BlockVisualization({ blockHeight }: BlockVisualizationProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<any[]>([]); // Initialize objectsRef as an empty array
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create a clock for animation timing
    const clock = new THREE.Clock();

    // Main scene variables
    let scene: any, camera: any, renderer: any, controls: any;
    let objects = [];

    // Setup scene, camera, and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(50, 40, 80);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Enable alpha for transparency
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Set clear color to transparent

    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    canvasRef.current.appendChild(renderer.domElement);

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    controls.zoomSpeed = 1.0;
    // controls.autoRotate = true;
    controls.rotateSpeed = 0.1;

    // Setup lighting
    setupLights();

    // Parse MML data and create the 3D model
    createMMLStructure(Number(blockHeight));

    // window.addEventListener("resize", onWindowResize);

    // Setup scene lighting
    function setupLights() {
      // Ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      // Primary light for shadows - directional light
      const mainLight = new THREE.DirectionalLight(0xffffff, 2.8);
      mainLight.position.set(50, 50, 25);
      mainLight.castShadow = true;

      // Configure shadow properties
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 500;

      // Set the shadow camera frustum to cover the entire scene
      const d = 100;
      mainLight.shadow.camera.left = -d;
      mainLight.shadow.camera.right = d;
      mainLight.shadow.camera.top = d;
      mainLight.shadow.camera.bottom = -d;

      scene.add(mainLight);

      // Secondary lights (no shadows, just for better illumination)
      const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
      backLight.position.set(-10, 10, -10);
      scene.add(backLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-20, 0, 20);
      scene.add(fillLight);
    }

    // Parse and create the entire MML structure
    async function createMMLStructure(blockHeight: number) {
      const defaultSize = 0.5;
      const parcelColor = "#cccccc"; //"#f7931a";
      const { mmlFile, blockWidth } = await genBitFeedMml(
        blockHeight,
        defaultSize,
        parcelColor,
        process.env.NEXT_PUBLIC_QUARK20_API_TXDATA_URL || "",
        process.env.NEXT_PUBLIC_QUARK20_API_KEY || "",
      );

      const xmlString = mmlFile;

      // Parse the XML string
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      // Create main group container
      const mainGroup = new THREE.Group();

      // Process the XML document
      objectsRef.current = processXMLNode(xmlDoc.documentElement, mainGroup);

      // Add the main group to the scene
      scene.add(mainGroup);

      // Auto-scale camera to fit the 3D content
      const box = new THREE.Box3().setFromObject(mainGroup);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let distance = maxSize / (2 * Math.tan(fov / 2));
      distance *= 0.4 + Math.random()* 0.1 - 0.1; // add extra space

      // Position the camera relative to the center
      camera.position.set(
        center.x + distance,
        center.y + distance * 0.5 + 20,
        center.z + Math.random() * 4 - 2,
      );

      // Adjust the camera to look down more
      camera.lookAt(center.x, center.y , center.z); // Decrease the y-coordinate to look down

      // Update the OrbitControls target
      controls.target.copy(center);
      controls.update();

      // Update the camera aspect ratio and renderer size
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Handle window resizing
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Update all object animations (models, cylinders, spheres, cubes)
      const delta = clock.getDelta(); // seconds.
      updateAnimations(objectsRef.current, delta);

      // Update controls
      controls.update();

      // Render scene
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      // Cleanup resources on unmount
      canvasRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [blockHeight]);

  return (
    <div
      ref={canvasRef}
      style={{
        height: "45vh", // Full viewport height
        width: "95vw", // Full viewport width
        margin: 0,
        padding: 0,
        overflow: "hidden", // Prevent scrollbars
      }}
    />
  );
}
