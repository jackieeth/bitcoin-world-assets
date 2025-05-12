"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useParams } from "next/navigation";

export default function BlockPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const blockHeight = params.blockHeight;

  useEffect(() => {
    if (!canvasRef.current) return;

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
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

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

    window.addEventListener("resize", onWindowResize);

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

    // Create a simple cube
    function createCube(data: any) {
      const geometry = new THREE.BoxGeometry(
        data.width,
        data.height,
        data.depth,
      );
      const material = new THREE.MeshLambertMaterial({ color: data.color });
      const cube = new THREE.Mesh(geometry, material);

      // Position cube at its center
      cube.position.set(data.x, data.y, data.z);

      // Enable shadows
      cube.castShadow = true;
      cube.receiveShadow = true;

      // Add the cube to our objects array for later manipulation
      objects.push(cube);

      return cube;
    }

    // Create a cube with an image texture
    function createCubeWithImage(data: any) {
      // Create base cube
      const cube = createCube(data);

      // Set up image plane
      const planeGeometry = new THREE.PlaneGeometry(
        data.image.width,
        data.image.width,
      );

      // Create a texture loader
      const textureLoader = new THREE.TextureLoader();

      // Create a placeholder material until the texture loads
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
      });

      const imagePlane = new THREE.Mesh(planeGeometry, planeMaterial);

      // Position the image relative to the cube
      imagePlane.position.set(
        data.image.x,
        data.image.y,
        data.image.z + data.depth / 2 + 0.01,
      );

      // Enable shadows for image plane
      imagePlane.castShadow = true;
      imagePlane.receiveShadow = true;

      // Add image plane to the cube
      cube.add(imagePlane);

      // Try to load the texture from the URL
      try {
        // Some URLs may not be accessible, so provide an error handler
        textureLoader.load(
          // URL
          data.image.src,

          // Success callback
          function (texture) {
            planeMaterial.map = texture;
            planeMaterial.needsUpdate = true;
            console.log("Texture loaded successfully from", data.image.src);
          },

          // Progress callback
          undefined,

          // Error callback
          function (err) {
            console.error("Error loading texture:", err);
            planeMaterial.color.set(0xcccccc); // Gray fallback
            planeMaterial.needsUpdate = true;
          },
        );
      } catch (e) {
        console.error("Exception when loading texture:", e);
        planeMaterial.color.set(0xcccccc); // Gray fallback
        planeMaterial.needsUpdate = true;
      }

      return cube;
    }

    // Parse and create the entire MML structure
    async function createMMLStructure(blockHeight: number) {
      const mml = await fetch(
        `https://quark20a.s3.us-west-1.amazonaws.com/q/${blockHeight}.xml`,
      );
      const xmlString = await mml.text();

      // Parse the XML string
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      // Create main group container
      const mainGroup = new THREE.Group();

      // Process the XML document
      processXMLNode(xmlDoc.documentElement, mainGroup);

      // Add the main group to the scene
      scene.add(mainGroup);

      // Auto-scale camera to fit the 3D content
      const box = new THREE.Box3().setFromObject(mainGroup);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let distance = maxSize / (2 * Math.tan(fov / 2));
      distance *= 0.8; // add extra space

      // Position the camera relative to the center
      camera.position.set(
        center.x + distance,
        center.y + distance,
        center.z + distance,
      );
      camera.lookAt(center);

      // Update the OrbitControls target
      controls.target.copy(center);
      controls.update();

      // Update the camera aspect ratio and renderer size
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Log the number of objects created
      console.log(
        "XML parsed successfully, created " + objects.length + " objects",
      );
    }

    // Function to process XML nodes and create 3D objects
    function processXMLNode(node: any, parent: any) {
      if (node.nodeName === "m-group") {
        // Create a new group for m-group element
        const group = new THREE.Group();

        // Set position if specified
        if (node.hasAttribute("x"))
          group.position.x = parseFloat(node.getAttribute("x"));
        if (node.hasAttribute("y"))
          group.position.y = parseFloat(node.getAttribute("y"));
        if (node.hasAttribute("z"))
          group.position.z = parseFloat(node.getAttribute("z"));

        // Set scale if specified
        if (node.hasAttribute("sx"))
          group.scale.x = parseFloat(node.getAttribute("sx"));
        if (node.hasAttribute("sy"))
          group.scale.y = parseFloat(node.getAttribute("sy"));
        if (node.hasAttribute("sz"))
          group.scale.z = parseFloat(node.getAttribute("sz"));

        // Set rotation if specified (convert from degrees to radians)
        if (node.hasAttribute("rx"))
          group.rotation.x = THREE.MathUtils.degToRad(
            parseFloat(node.getAttribute("rx")),
          );
        if (node.hasAttribute("ry"))
          group.rotation.y = THREE.MathUtils.degToRad(
            parseFloat(node.getAttribute("ry")),
          );
        if (node.hasAttribute("rz"))
          group.rotation.z = THREE.MathUtils.degToRad(
            parseFloat(node.getAttribute("rz")),
          );

        // Process children nodes
        for (let i = 0; i < node.childNodes.length; i++) {
          const childNode = node.childNodes[i];
          if (childNode.nodeType === 1) {
            // Element node
            processXMLNode(childNode, group);
          }
        }

        // Add group to parent
        parent.add(group);
      } else if (node.nodeName === "m-cube") {
        // Extract cube attributes
        const cubeData: {
          x: number;
          y: number;
          z: number;
          width: number;
          height: number;
          depth: number;
          color: any;
          image?: {
            src: string | null;
            x: number;
            y: number;
            z: number;
            width: number;
          };
        } = {
          x: parseFloat(node.getAttribute("x") || 0),
          y: parseFloat(node.getAttribute("y") || 0),
          z: parseFloat(node.getAttribute("z") || 0),
          width: parseFloat(node.getAttribute("width") || 1),
          height: parseFloat(node.getAttribute("height") || 1),
          depth: parseFloat(node.getAttribute("depth") || 1),
          color: node.getAttribute("color") || "#ffffff",
        };

        // Check for image child
        let hasImage = false;
        let imageData = null;

        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (child.nodeType === 1 && child.nodeName === "m-image") {
            // Element node
            hasImage = true;
            imageData = {
              src: child.getAttribute("src"),
              x: parseFloat(child.getAttribute("x") || 0),
              y: parseFloat(child.getAttribute("y") || 0),
              z: parseFloat(child.getAttribute("z") || 0),
              width: parseFloat(child.getAttribute("width") || 1),
            };
            break;
          }
        }

        // Create cube with or without image
        let cube;
        if (hasImage) {
          if (imageData) {
            cubeData.image = imageData;
          }
          cube = createCubeWithImage(cubeData);
        } else {
          cube = createCube(cubeData);
        }

        // Add cube to parent
        parent.add(cube);
      }
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

      // Update controls
      controls.update();

      // Render scene
      renderer.render(scene, camera);
    }
    animate();

    // Cleanup on unmount
    return () => {
      if (canvasRef.current && renderer.domElement) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <main className="max-w-screen max-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div ref={canvasRef} className="w-full h-screen" />
    </main>
  );
}
