import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

interface MMLAttributes {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  width?: number;
  height?: number;
  depth?: number;
  intensity?: number; // For lights
  distance?: number; // For lights
  decay?: number; // For lights
  radius?: number; // For cylinder
  segments?: number; // For cylinder
  color?: string;
  src?: string; // For model
}

function parseAttributes(element: Element): MMLAttributes {
  return {
    x: parseFloat(element.getAttribute("x") || "0"),
    y: parseFloat(element.getAttribute("y") || "0"),
    z: parseFloat(element.getAttribute("z") || "0"),
    rx: THREE.MathUtils.degToRad(parseFloat(element.getAttribute("rx") || "0")),
    ry: THREE.MathUtils.degToRad(parseFloat(element.getAttribute("ry") || "0")),
    rz: THREE.MathUtils.degToRad(parseFloat(element.getAttribute("rz") || "0")),
    sx: parseFloat(element.getAttribute("sx") || "1"),
    sy: parseFloat(element.getAttribute("sy") || "1"),
    sz: parseFloat(element.getAttribute("sz") || "1"),
    width: parseFloat(element.getAttribute("width") || "1"),
    height: parseFloat(element.getAttribute("height") || "1"),
    depth: parseFloat(element.getAttribute("depth") || "1"),
    color: element.getAttribute("color") || "#ffffff",
    src: element.getAttribute("src") || "",
  };
}

function createObject(
  element: Element,
  parentTransform: THREE.Matrix4,
): THREE.Object3D | undefined {
  const attrs = parseAttributes(element);
  let object: THREE.Object3D | undefined;

  switch (element.tagName.toLowerCase()) {
    case "m-cube": {
      const geometry = new THREE.BoxGeometry(
        attrs.width!,
        attrs.height!,
        attrs.depth!,
      );
      const material = new THREE.MeshStandardMaterial({ color: attrs.color });
      object = new THREE.Mesh(geometry, material);
      break;
    }
    case "m-image": {
      const geometry = new THREE.PlaneGeometry(attrs.width!, attrs.height!);
      const texture = new THREE.TextureLoader().load(attrs.src!);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      object = new THREE.Mesh(geometry, material);
      break;
    }
    case "m-group": {
      object = new THREE.Group();
      break;
    }
    case "m-store": {
      object = new THREE.Group();
      break;
    }
    case "m-model": {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
      ); // Use CDN path
      loader.setDRACOLoader(dracoLoader);

      object = new THREE.Group(); // Create temporary group

      loader.load(attrs.src!, (gltf) => {
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = true;
            (child as THREE.Mesh).receiveShadow = true;
          }
        });
        (object as THREE.Group).add(gltf.scene);
      });
      break;
    }

    case "m-cylinder": {
      const geometry = new THREE.CylinderGeometry(
        attrs.radius || 1,
        attrs.radius || 1,
        attrs.height || 1,
        attrs.segments || 32,
      );
      const material = new THREE.MeshStandardMaterial({ color: attrs.color });
      object = new THREE.Mesh(geometry, material);
      object.castShadow = true;
      object.receiveShadow = true;
      break;
    }

    case "m-light": {
      object = new THREE.PointLight(
        attrs.color || 0xffffff,
        attrs.intensity || 1,
        attrs.distance || 0,
        attrs.decay || 2,
      );
      object.castShadow = true;
      break;
    }

    case "m-attr-anim": {
      // Skip processing - handled by parent
      return undefined;
    }

    default:
      console.warn(`Skipping unimplemented element type: ${element.tagName}`);
      return undefined;
  }

  if (object) {
    // Apply local transform
    object.position.set(attrs.x!, attrs.y!, attrs.z!);
    object.rotation.set(attrs.rx!, attrs.ry!, attrs.rz!);
    object.scale.set(attrs.sx!, attrs.sy!, attrs.sz!);

    // Handle animations
    const animations = Array.from(element.children).filter(
      (child) => child.tagName.toLowerCase() === "m-attr-anim",
    );

    if (animations.length > 0) {
      (object as any).attrAnimations = animations.map((anim) => ({
        attr: anim.getAttribute("attr") || "",
        start: parseFloat(anim.getAttribute("start") || "0"),
        end: parseFloat(anim.getAttribute("end") || "0"),
        startTime: parseInt(anim.getAttribute("start-time") || "0", 10),
        duration: parseInt(anim.getAttribute("duration") || "1000", 10),
        pingPong: anim.getAttribute("ping-pong") === "true",
        easing: anim.getAttribute("easing") || "linear",
      }));

      // Add animation controller
      object.controller = {
        update: (delta: number) => {
          const elapsedTime = performance.now();
          (object as any).attrAnimations.forEach((anim: any) => {
            if (elapsedTime >= anim.startTime) {
              let progress =
                ((elapsedTime - anim.startTime) % anim.duration) /
                anim.duration;

              if (
                anim.pingPong &&
                Math.floor((elapsedTime - anim.startTime) / anim.duration) %
                  2 ===
                  1
              ) {
                progress = 1 - progress;
              }

              if (anim.easing === "easeInOutCubic") {
                progress =
                  progress < 0.5
                    ? 4 * progress ** 3
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              }

              const value = anim.start + (anim.end - anim.start) * progress;

              switch (anim.attr) {
                case "x":
                  object.position.x = value;
                  break;
                case "y":
                  object.position.y = value;
                  break;
                case "z":
                  object.position.z = value;
                  break;
                case "rx":
                  object.rotation.x = THREE.MathUtils.degToRad(value);
                  break;
                case "ry":
                  object.rotation.y = THREE.MathUtils.degToRad(value);
                  break;
                case "rz":
                  object.rotation.z = THREE.MathUtils.degToRad(value);
                  break;
                case "sx":
                  object.scale.x = value;
                  break;
                case "sy":
                  object.scale.y = value;
                  break;
                case "sz":
                  object.scale.z = value;
                  break;
              }
            }
          });
        },
      };
    }

    // Apply parent transform
    object.applyMatrix4(parentTransform);

    // Process children recursively
    for (const child of Array.from(element.children)) {
      if (child.tagName.toLowerCase() !== "m-attr-anim") {
        const childObject = createObject(child, object.matrix);
        if (childObject) object.add(childObject);
      }
    }
  }

  return object;
}

export function parseMML(mmlContent: string): THREE.Object3D {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mmlContent, "text/xml");
  const rootElement = doc.documentElement;

  // Start with identity matrix for root transform
  const rootTransform = new THREE.Matrix4();
  return createObject(rootElement, rootTransform) ?? new THREE.Group();
}
