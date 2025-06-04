import * as THREE from "three";
import { genBitFeedMml, processXMLNode } from "./gen-bitfeed";

// Download file utility
export function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Setup lights utility
export function setupLights(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 4.2);
  mainLight.position.set(50, 50, 25);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
  backLight.position.set(-10, 10, -10);
  scene.add(backLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-20, 0, 20);
  scene.add(fillLight);
}

// Create MML structure utility
export async function createMMLStructure(
  blockHeight: number,
  defaultSize: number,
  parcelColor: string,
  apiUrl: string,
  apiKey: string,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  controls: any,
  renderer: THREE.WebGLRenderer,
  objectsRef: React.MutableRefObject<any[]>,
  setXmlDoc: (xml: string) => void,
  setParcelStats: (stats: {
    counts: Record<string, number>;
    total: number;
  }) => void,
) {
  const { mmlFile, blockWidth, parcelSizeCounts } = await genBitFeedMml(
    blockHeight,
    defaultSize,
    parcelColor,
    apiUrl,
    apiKey,
  );

  setParcelStats({
    counts: parcelSizeCounts,
    total: Object.values(parcelSizeCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
  });

  const xmlString = mmlFile;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  setXmlDoc(xmlString);
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
