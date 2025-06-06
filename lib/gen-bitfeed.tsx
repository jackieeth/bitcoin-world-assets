import format from "xml-formatter";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {deterministicRandom} from "./blockUtils"

// Global cache for JSON content keyed by part
const blockJsonCache = new Map<number, any>();

// Animation update function for models and shapes with animations
// Extend the Object3D type to include the controller property
declare module "three" {
  interface Object3D {
    controller?: {
      update?: (delta: number) => void;
    };
  }
}

const imagePlaceholder = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQABAwGq9NAAAAAASUVORK5CYII=`

// Updated getBlockImage with caching support
export const getBlockImage = async (blockNumber: number, blockimgUri: string) => {
  try {
    const part = Math.floor(blockNumber / 50000) * 50;
    if (part > 800) {
      return imagePlaceholder
    }
    let data;
    if (blockJsonCache.has(part)) {
      data = blockJsonCache.get(part);
    } else {
      const response = await fetch(`/content/blocks_${part}k.json`);
      data = await response.json();
      blockJsonCache.set(part, data);
    }

    const inscriptionId = data[`${blockNumber}`];
    if (!inscriptionId) {
      return imagePlaceholder;
    }
    return `${blockimgUri}/${inscriptionId}`;
  } catch (error) {
    return imagePlaceholder
  }
    
  };

export const updateAnimations = (objects: THREE.Object3D[], delta: number) => {
  objects.forEach((obj) => {
    if (obj.controller && typeof obj.controller.update === "function") {
      obj.controller.update(delta);
    }
  });
};

// Extend the Mesh type to include attrAnimations and controller
declare module "three" {
  interface Mesh {
    attrAnimations?: Array<{
      attr: string;
      start: number;
      end: number;
      startTime: number;
      duration: number;
      pingPong: boolean;
      easing: string;
    }>;
    controller?: {
      update?: (delta: number) => void;
    };
  }
}

// Function to process XML nodes and create 3D objects
export function processXMLNode(node: any, parent: any) {
  let objects: THREE.Object3D[] = [];
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

    // Process children nodes and aggregate objects from children.
    for (let i = 0; i < node.childNodes.length; i++) {
      const childNode = node.childNodes[i];
      if (childNode.nodeType === 1) {
        const childObjects = processXMLNode(childNode, group);
        objects = objects.concat(childObjects);
      }
    }
    // Add group to parent and optionally push the group if needed.
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
    let result;
    if (hasImage) {
      if (imageData) {
        cubeData.image = imageData;
      }
      result = createCubeWithImage(cubeData);
    } else {
      result = createCube(cubeData);
    }

    // Process animation attributes from child elements
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];

      // Check for m-attr-anim element
      if (child.nodeType === 1 && child.nodeName === "m-attr-anim") {
        // Store animation data
        const animData = {
          attr: child.getAttribute("attr"),
          start: parseFloat(child.getAttribute("start") || 0),
          end: parseFloat(child.getAttribute("end") || 0),
          startTime: parseInt(child.getAttribute("start-time") || 0),
          duration: parseInt(child.getAttribute("duration") || 1000),
          pingPong: child.getAttribute("ping-pong") === "true",
          easing: child.getAttribute("easing") || "linear",
        };

        // If this sphere has no animations array yet, create one
        if (!result.attrAnimations) {
          result.attrAnimations = [];
        }

        // Add this animation to the list
        result.attrAnimations.push(animData);

        // Create the animation
        const clock = new THREE.Clock();
        let elapsedTime = 0;
        let animationStarted = false;

        // Add controller if it doesn't exist
        if (!result.controller) {
          result.controller = {};
        }

        // Add update function to handle this animation
        const originalUpdate = result.controller.update;
        result.controller.update = (delta) => {
          // Call the original update function if it exists
          if (originalUpdate) {
            originalUpdate(delta);
          }

          // Handle attribute animations
          if (result.attrAnimations) {
            elapsedTime += delta * 1000; // Convert to milliseconds

            result.attrAnimations.forEach((anim) => {
              // Only start animation after startTime has elapsed
              if (elapsedTime >= anim.startTime) {
                if (!animationStarted) {
                  animationStarted = true;
                  clock.start();
                }

                // Calculate progress
                const animElapsed = elapsedTime - anim.startTime;
                let progress = (animElapsed % anim.duration) / anim.duration;

                // Handle ping-pong
                if (
                  anim.pingPong &&
                  Math.floor(animElapsed / anim.duration) % 2 === 1
                ) {
                  progress = 1 - progress;
                }

                // Apply easing if specified
                if (anim.easing === "easeInOutCubic") {
                  progress =
                    progress < 0.5
                      ? 4 * progress ** 3
                      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                }

                // Calculate the current value
                const value = anim.start + (anim.end - anim.start) * progress;

                // Apply to the appropriate attribute
                if (anim.attr === "x") result.position.x = value;
                else if (anim.attr === "y") result.position.y = value;
                else if (anim.attr === "z") result.position.z = value;
                else if (anim.attr === "rx")
                  result.rotation.x = THREE.MathUtils.degToRad(value);
                else if (anim.attr === "ry")
                  result.rotation.y = THREE.MathUtils.degToRad(value);
                else if (anim.attr === "rz")
                  result.rotation.z = THREE.MathUtils.degToRad(value);
                else if (anim.attr === "sx") result.scale.x = value;
                else if (anim.attr === "sy") result.scale.y = value;
                else if (anim.attr === "sz") result.scale.z = value;
              }
            });
          }
        };
      }
    }

    // ---- New Code Start: Process nested m-model nodes (or other supported nodes)
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      // Skip nodes already handled like m-attr-anim and m-image.
      if (child.nodeType === 1 && child.nodeName === "m-model") {
        processXMLNode(child, result);
      }
    }
    // ---- New Code End

    // Add cube to parent and update objects array
    parent.add(result);
    objects.push(result);
  } else if (node.nodeName === "m-model") {
    // Extract model attributes
    const modelData = {
        src: node.getAttribute("src"),
        x: parseFloat(node.getAttribute("x") || 0),
        y: parseFloat(node.getAttribute("y") || 0),
        z: parseFloat(node.getAttribute("z") || 0),
        rx: node.hasAttribute("rx") ? parseFloat(node.getAttribute("rx")) : 0,
        ry: node.hasAttribute("ry") ? parseFloat(node.getAttribute("ry")) : 0,
        rz: node.hasAttribute("rz") ? parseFloat(node.getAttribute("rz")) : 0,
        sx: node.hasAttribute("sx") ? parseFloat(node.getAttribute("sx")) : 1,
        sy: node.hasAttribute("sy") ? parseFloat(node.getAttribute("sy")) : 1,
        sz: node.hasAttribute("sz") ? parseFloat(node.getAttribute("sz")) : 1,
    };

    // Create a new group to hold the model
    const modelGroup = new THREE.Group();
    modelGroup.position.set(modelData.x, modelData.y, modelData.z);
    modelGroup.rotation.set(
        THREE.MathUtils.degToRad(modelData.rx),
        THREE.MathUtils.degToRad(modelData.ry),
        THREE.MathUtils.degToRad(modelData.rz)
    );
    modelGroup.scale.set(modelData.sx, modelData.sy, modelData.sz);

    // Load the model
    const loader = new GLTFLoader();
    loader.load(
        modelData.src,
        (gltf) => {
            gltf.scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).castShadow = true;
                    (child as THREE.Mesh).receiveShadow = true;
                }
            });
            modelGroup.add(gltf.scene);
        },
        undefined,
        (error) => {
            console.error("Error loading model:", error);
        }
    );

    // Optional: Process child m-attr-anim tags for animation support
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 1 && child.nodeName === "m-attr-anim") {
            const animData = {
                attr: child.getAttribute("attr"),
                start: parseFloat(child.getAttribute("start") || 0),
                end: parseFloat(child.getAttribute("end") || 0),
                startTime: parseInt(child.getAttribute("start-time") || 0),
                duration: parseInt(child.getAttribute("duration") || 1000),
                pingPong: child.getAttribute("ping-pong") === "true",
                easing: child.getAttribute("easing") || "linear",
            };
            // Store animations in a userData field
            if (!modelGroup.userData.attrAnimations) {
                modelGroup.userData.attrAnimations = [];
            }
            modelGroup.userData.attrAnimations.push(animData);
        }
    }

    // Attach a basic controller to update animations if any
    if (modelGroup.userData.attrAnimations) {
        let elapsedTime = 0;
        let animationStarted = false;
        modelGroup.controller = {
            update: (delta: number) => {
                elapsedTime += delta * 1000; // ms
                modelGroup.userData.attrAnimations.forEach((anim: any) => {
                    if (elapsedTime >= anim.startTime) {
                        let progress = ((elapsedTime - anim.startTime) % anim.duration) / anim.duration;
                        if (anim.pingPong && Math.floor((elapsedTime - anim.startTime) / anim.duration) % 2 === 1) {
                            progress = 1 - progress;
                        }
                        if (anim.easing === "easeInOutCubic") {
                            progress = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                        }
                        const value = anim.start + (anim.end - anim.start) * progress;
                        if (anim.attr === "x") modelGroup.position.x = value;
                        else if (anim.attr === "y") modelGroup.position.y = value;
                        else if (anim.attr === "z") modelGroup.position.z = value;
                        else if (anim.attr === "rx") modelGroup.rotation.x = THREE.MathUtils.degToRad(value);
                        else if (anim.attr === "ry") modelGroup.rotation.y = THREE.MathUtils.degToRad(value);
                        else if (anim.attr === "rz") modelGroup.rotation.z = THREE.MathUtils.degToRad(value);
                        else if (anim.attr === "sx") modelGroup.scale.x = value;
                        else if (anim.attr === "sy") modelGroup.scale.y = value;
                        else if (anim.attr === "sz") modelGroup.scale.z = value;
                    }
                });
            },
        };
    }

    parent.add(modelGroup);
    objects.push(modelGroup);
  }
  return objects;
}
// Create a simple cube
function createCube(data: any) {
  const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
  const material = new THREE.MeshLambertMaterial({ color: data.color });
  const cube = new THREE.Mesh(geometry, material);

  // Position cube at its center
  cube.position.set(data.x, data.y, data.z);

  // Enable shadows
  cube.castShadow = true;
  cube.receiveShadow = true;

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

function preventSelfClosingConversion(xmlString: string) {
  // First, process the XML as before (remove comments, fix attributes, etc.)
  let processedXML = convertSelfClosingTags(xmlString);

  // Then, ensure empty elements don't get converted to self-closing tags
  // by adding a space between all empty tags
  return processedXML.replace(/<([\w-]+)([^>]*)><\/\1>/g, "<$1$2> </$1>");
}

function convertSelfClosingTags(xmlString: string) {
  // Step 1: Remove HTML comments
  let cleanedXML = xmlString.replace(/<!--[\s\S]*?-->/g, "");

  // Step 2: Remove script tags and their content
  // cleanedXML = cleanedXML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Step 3: Fix incorrectly concatenated tag and attribute
  // This looks for patterns like <tagattr="value" and inserts a space: <tag attr="value"
  cleanedXML = cleanedXML.replace(/<([\w-]+)([\w-]+)="/g, '<$1 $2="');

  // Step 4: Fix incorrectly concatenated attributes
  // This looks for patterns like attr1="value"attr2="value" and inserts a space: attr1="value" attr2="value"
  cleanedXML = cleanedXML.replace(/"([\w-]+)="/g, '" $1="');

  // Step 5: Fill empty attributes with "0"
  cleanedXML = cleanedXML.replace(/(\w+)=""/g, '$1="0"');

  // Step 6: Convert all self-closing tags to explicit opening and closing pairs
  // Handle tags with attributes - now supporting hyphens in tag names
  cleanedXML = cleanedXML.replace(
    /<([\w-]+)([^>]*?)\s*\/>/g,
    function (match, tagName, attributes) {
      // Clean up any extra spaces in attributes
      const cleanAttributes = attributes.trim();
      return `<${tagName} ${cleanAttributes ? " " + cleanAttributes : ""}></${tagName}>`;
    },
  );

  // Handle simple tags without attributes - now supporting hyphens in tag names
  cleanedXML = cleanedXML.replace(/<([\w-]+)\s*\/>/g, "<$1></$1>");

  return cleanedXML;
}

// https://github.com/bitfeed-project/bitfeed/blob/master/client/src/models/TxMondrianPoolScene.js
class MondrianLayout {
  width: number;
  height: number;
  xMax: number;
  yMax: number;
  rowOffset: number;
  rows: any[];
  txMap: any[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.xMax = 0;
    this.yMax = 0;
    this.rowOffset = 0;
    this.rows = [];
    this.txMap = [];
  }

  getSize() {
    return {
      width: this.xMax,
      height: this.yMax,
    };
  }

  getRow(position: any) {
    let index = position.y - this.rowOffset;
    return index < this.rows.length ? this.rows[index] : null;
  }

  getSlot(position: any) {
    let row = this.getRow(position);
    if (row !== null && row.map.hasOwnProperty(position.x)) {
      return row.map[position.x];
    }
    return null;
  }

  addRow() {
    let newRow = {
      y: this.rows.length + this.rowOffset,
      slots: [],
      map: {},
      max: 0,
    };
    this.rows.push(newRow);
    return newRow;
  }

  addSlot(slot: any) {
    if (slot.r <= 0) {
      return null;
    }

    let existingSlot = this.getSlot(slot.position);
    if (existingSlot !== null) {
      existingSlot.r = Math.max(existingSlot.r, slot.r);
      return existingSlot;
    } else {
      let row = this.getRow(slot.position);
      if (row === null) {
        return null;
      }

      let insertAt = row.slots.findIndex(
        (s: any) => s.position.x > slot.position.x,
      );
      if (insertAt === -1) {
        row.slots.push(slot);
      } else {
        row.slots.splice(insertAt, 0, slot);
      }

      row.map[slot.position.x] = slot;
      return slot;
    }
  }

  removeSlot(slot: any) {
    let row = this.getRow(slot.position);
    if (row !== null) {
      delete row.map[slot.position.x];
      let index = row.slots.findIndex(
        (s: any) => s.position.x === slot.position.x,
      );
      if (index !== -1) {
        row.slots.splice(index, 1);
      }
    }
  }

  fillSlot(slot: any, squareWidth: any) {
    let square = {
      left: slot.position.x,
      right: slot.position.x + squareWidth,
      bottom: slot.position.y,
      top: slot.position.y + squareWidth,
    };

    this.removeSlot(slot);

    for (let rowIndex = slot.position.y; rowIndex < square.top; rowIndex++) {
      let row = this.getRow({ x: slot.position.x, y: rowIndex });
      if (row !== null) {
        let collisions = [];
        let maxExcess = 0;

        for (let testSlot of row.slots) {
          if (
            !(
              testSlot.position.x + testSlot.r < square.left ||
              testSlot.position.x >= square.right
            )
          ) {
            collisions.push(testSlot);
            let excess = Math.max(
              0,
              testSlot.position.x + testSlot.r - (slot.position.x + slot.r),
            );
            maxExcess = Math.max(maxExcess, excess);
          }
        }

        if (
          square.right < this.width &&
          !row.map.hasOwnProperty(square.right)
        ) {
          this.addSlot({
            position: { x: square.right, y: rowIndex },
            r: slot.r - squareWidth + maxExcess,
          });
        }

        for (let collision of collisions) {
          collision.r = slot.position.x - collision.position.x;

          if (collision.r === 0) {
            this.removeSlot(collision);
          }
        }
      } else {
        this.addRow();
        if (slot.position.x > 0) {
          this.addSlot({
            position: { x: 0, y: rowIndex },
            r: slot.position.x,
          });
        }
        if (square.right < this.width) {
          this.addSlot({
            position: { x: square.right, y: rowIndex },
            r: this.width - square.right,
          });
        }
      }
    }

    for (
      let rowIndex = Math.max(0, slot.position.y - squareWidth);
      rowIndex < slot.position.y;
      rowIndex++
    ) {
      let row = this.getRow({ x: slot.position.x, y: rowIndex });
      if (row === null) continue;

      for (let i = 0; i < row.slots.length; i++) {
        let testSlot = row.slots[i];

        if (
          testSlot.position.x < slot.position.x + squareWidth &&
          testSlot.position.x + testSlot.r > slot.position.x &&
          testSlot.position.y + testSlot.r >= slot.position.y
        ) {
          let oldSlotWidth = testSlot.r;
          testSlot.r = slot.position.y - testSlot.position.y;

          let remaining = {
            x: testSlot.position.x + testSlot.r,
            y: testSlot.position.y,
            width: oldSlotWidth - testSlot.r,
            height: testSlot.r,
          };

          while (remaining.width > 0 && remaining.height > 0) {
            if (remaining.width <= remaining.height) {
              this.addSlot({
                position: { x: remaining.x, y: remaining.y },
                r: remaining.width,
              });
              remaining.y += remaining.width;
              remaining.height -= remaining.width;
            } else {
              this.addSlot({
                position: { x: remaining.x, y: remaining.y },
                r: remaining.height,
              });
              remaining.x += remaining.height;
              remaining.width -= remaining.height;
            }
          }
        }
      }
    }

    return { position: slot.position, r: squareWidth };
  }

  place(size: any) {
    let tx = {};

    let found = false;
    let squareSlot = null;

    for (let row of this.rows) {
      for (let slot of row.slots) {
        if (slot.r >= size) {
          found = true;
          squareSlot = this.fillSlot(slot, size);
          break;
        }
      }

      if (found) {
        break;
      }
    }

    if (!found) {
      let row = this.addRow();
      let slot = this.addSlot({ position: { x: 0, y: row.y }, r: this.width });
      squareSlot = this.fillSlot(slot, size);
    }

    if (squareSlot) {
      for (let x = 0; x < squareSlot.r; x++) {
        for (let y = 0; y < squareSlot.r; y++) {
          this.setTxMapCell(
            { x: squareSlot.position.x + x, y: squareSlot.position.y + y },
            tx,
          );
        }
      }
    }

    if (squareSlot && squareSlot.position.x + squareSlot.r > this.xMax) {
      this.xMax = squareSlot.position.x + squareSlot.r;
    }

    if (squareSlot && squareSlot.position.y + squareSlot.r > this.yMax) {
      this.yMax = squareSlot.position.y + squareSlot.r;
    }

    return squareSlot;
  }

  setTxMapCell(coord: any, tx: any) {
    let offsetY = coord.y - this.rowOffset;
    if (
      offsetY >= 0 &&
      offsetY < this.height &&
      coord.x >= 0 &&
      coord.x < this.width
    ) {
      let index = offsetY * this.width + coord.x;
      if (index >= 0 && index < this.txMap.length) {
        this.txMap[index] = tx;
      }
    }
  }
}

export const Block1stSat = (blockHeight:number) => {
    const blockReward0 = 5000000000;
    const halvingInv = 210000;
    
    const blockReward = (epoch:number) => {
      return blockReward0 / 2 ** epoch;
    };

    const epoch = Math.floor(blockHeight/halvingInv);
    let satNumber = 0;
    for (let index = 0; index < epoch; index++) {
      satNumber += blockReward(index) * halvingInv;
    }
    satNumber += (blockHeight%halvingInv) * blockReward(epoch);
    return satNumber;
  }

const logTxSize = (value: number) => {
  if (value === 0) return 1;
  let scale = Math.ceil(Math.log10(value)) - 5;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, scale));
};

export const genBitFeedMml = async (
  blockHeight: number,
  size: number,
  parcelColor: string,
  uri: string,
  apikey: string,
) => {
  if (!parcelColor) {
    parcelColor = "#f7931a";
  }
  if (!size) {
    size = 0.5;
  }
  let txList = [];
  const payload = { apikey: apikey, blockHeight: blockHeight.toString() };
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const body = new URLSearchParams(payload).toString();
  const compressed = await fetch(uri, {
    method: "POST",
    headers: headers,
    body: body,
  }).then((d) => d.text());

  if (compressed) {
    let lines = compressed.split(/\r?\n/);

    txList = new Array(lines.length);

    for (let i = 0; i < lines.length; i++) {
      let sats = parseInt(lines[i]);

      txList[i] = {
        value: sats,
      };
    }
  }

  for (let i = 0; i < txList.length; i++) {
    txList[i].size = logTxSize(txList[i].value);
  }

  let blockWeight = 0;
  for (let tx of txList) {
    blockWeight += tx.size * tx.size;
  }

  const platform_thickness = size * 0.1;
  const margin = size * 0.5;
  const blockWidth = Math.ceil(Math.sqrt(blockWeight));
  const mondrian = new MondrianLayout(blockWidth, blockWidth);
  let parcelsMML = "";
  const parcelSizeCounts: { [key: number]: number } = {}; // Count each parcel size
  let placeModel = true;
  const now = new Date();
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);
  const modelWillAppear = deterministicRandom(`${day}-${hour}-${minute}`) > 0.6; // Randomly decide if a model will appear

  for (let i = 0; i < txList.length; i++) {
    const slot = mondrian.place(txList[i].size);

    if (slot) {
      // Tally count per parcel size
      parcelSizeCounts[slot.r] = (parcelSizeCounts[slot.r] || 0) + 1;
      
      parcelsMML += `<m-cube id="parcel-${i}-size-${slot.r}" width="${
        slot.r * size * 0.9
      }" height="${platform_thickness * slot.r}" depth="${
        slot.r * size * 0.9
      }" x="${(slot.position.x + slot.r - blockWidth / 2) * size - margin * slot.r}" y="${(0.1 * slot.r) / 2 - platform_thickness * slot.r/2}" z="${
        (slot.position.y + slot.r - blockWidth / 2) * size - margin * slot.r
      }" color="${parcelColor}">${
        deterministicRandom(`b${i}${minute}`) > 0.995
          ? `<m-attr-anim attr="y" start="0.5" end="${
              0.2 + Math.floor(deterministicRandom(`q${i}`) * 2.1) + Math.floor(deterministicRandom(`a${minute}`) * 1.2)
            }" start-time="2000" duration="${
              5000 + Math.floor(deterministicRandom(`q${i}${minute}`) * 200)
            }" ping-pong="true" ping-pong-delay="2000"></m-attr-anim>`
          : ``
      } ${slot.r === 5 && placeModel && modelWillAppear ? `<m-model src="https://quark20a.s3.us-west-1.amazonaws.com/q/1377952728323592342_1748599938.glb" x="0" y=".65" z="0" sx=".5" sy=".5" sz=".5"> </m-model>
`: ``}</m-cube>`;
      if (slot.r === 5) {
        placeModel = false; // Only place one puppet
      }
    }
  }

  const outputMml = format(
    `<m-group>${preventSelfClosingConversion(parcelsMML)}</m-group>`,
    {
      indentation: "  ",
    },
  );

  return { mmlFile: outputMml, blockWidth, parcelSizeCounts };
};
