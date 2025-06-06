// mmlParser.ts – universal MML → THREE.js scene graph parser
// Supports nested <m-*> tags with optional spatial audio.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/** Options passed to {@link parseMML}. */
export interface ParseMMLOptions {
  /**
   * Provide a listener to enable spatial sound for <m-audio> and the audio track
   * embedded in <m-video>. If omitted, videos are muted and audio nodes ignored.
   */
  audioListener?: THREE.AudioListener;
}

/* ------------------------------------------------------------------------- */

interface MMLAttributes {
  // transform
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number; // degrees
  sx?: number;
  sy?: number;
  sz?: number;

  // generic geometry / visuals
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  segments?: number;
  heightSegments?: number;
  color?: string | number;
  src?: string;

  // media / audio
  loop?: boolean;
  autoplay?: boolean;
  volume?: number;
  distance?: number;
  decay?: number;

  // label specific
  text?: string;
  fontSize?: number;
}

/* Utility helpers ---------------------------------------------------------- */
const fAttr = (el: Element, name: string, def = 0) => {
  const v = el.getAttribute(name);
  return v === null ? def : parseFloat(v);
};
const iAttr = (el: Element, name: string, def = 0) => {
  const v = el.getAttribute(name);
  return v === null ? def : parseInt(v, 10);
};
const bAttr = (el: Element, name: string, def = false) => {
  const v = el.getAttribute(name);
  if (v === null) return def;
  return v === "true" || v === "1";
};

function parseAttributes(el: Element): MMLAttributes {
  return {
    x: fAttr(el, "x"),
    y: fAttr(el, "y"),
    z: fAttr(el, "z"),
    rx: fAttr(el, "rx"),
    ry: fAttr(el, "ry"),
    rz: fAttr(el, "rz"),
    sx: fAttr(el, "sx", 1),
    sy: fAttr(el, "sy", 1),
    sz: fAttr(el, "sz", 1),

    width: fAttr(el, "width", 1),
    height: fAttr(el, "height", 1),
    depth: fAttr(el, "depth", 1),

    radius: fAttr(el, "radius", 0.5),
    radiusTop: el.hasAttribute("radiusTop")
      ? fAttr(el, "radiusTop")
      : undefined,
    radiusBottom: el.hasAttribute("radiusBottom")
      ? fAttr(el, "radiusBottom")
      : undefined,
    segments: iAttr(el, "segments", 32),
    heightSegments: iAttr(el, "heightSegments", 1),

    color: el.getAttribute("color") ?? 0xffffff,
    src: el.getAttribute("src") ?? undefined,

    loop: bAttr(el, "loop", true),
    autoplay: bAttr(el, "autoplay", true),
    volume: fAttr(el, "volume", 1),
    distance: fAttr(el, "distance", 1),
    decay: fAttr(el, "decay", 1),

    text: el.getAttribute("text") ?? undefined,
    fontSize: iAttr(el, "fontSize", 64),
  };
}

function createTextSprite(
  text: string,
  color: string | number,
  fontSize: number,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const pad = fontSize * 0.3;

  const scale = window.devicePixelRatio || 1;
  canvas.width = (metrics.width + pad * 2) * scale;
  canvas.height = (fontSize + pad * 2) * scale;
  ctx.scale(scale, scale);

  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle =
    typeof color === "number" ? `#${(color as number).toString(16)}` : color;
  ctx.textBaseline = "top";
  ctx.fillText(text, pad, pad);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  const size = 0.01; // world units per canvas pixel
  spr.scale.set(
    (canvas.width * size) / scale,
    (canvas.height * size) / scale,
    1,
  );
  return spr;
}

/* Animation controller ----------------------------------------------------- */
interface InternalController {
  update: (delta: number) => void;
}

/* Recursively build a THREE scene subtree --------------------------------- */
function createObject(
  el: Element,
  opts: ParseMMLOptions,
): THREE.Object3D | undefined {
  const a = parseAttributes(el);
  let obj: THREE.Object3D | undefined;

  switch (el.tagName.toLowerCase()) {
    /* ---------- primitives ---------- */
    case "m-label":
      obj = createTextSprite(a.text ?? "Label", a.color!, a.fontSize!);
      break;
    case "m-cube":
      obj = new THREE.Mesh(
        new THREE.BoxGeometry(a.width!, a.height!, a.depth!),
        new THREE.MeshStandardMaterial({ color: a.color }),
      );
      break;
    case "m-sphere":
      obj = new THREE.Mesh(
        new THREE.SphereGeometry(a.radius!, a.segments!, a.heightSegments!),
        new THREE.MeshStandardMaterial({ color: a.color }),
      );
      break;
    case "m-cylinder": {
      obj = new THREE.Mesh(
        new THREE.CylinderGeometry(
          a.radiusTop ?? a.radius!,
          a.radiusBottom ?? a.radius!,
          a.height!,
          a.segments!,
          a.heightSegments!,
          false,
        ),
        new THREE.MeshStandardMaterial({ color: a.color }),
      );
      break;
    }

    /* ---------- external assets ---------- */
    case "m-model": {
      obj = new THREE.Group();
      if (a.src) {
        const gltf = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath(
          "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
        );
        gltf.setDRACOLoader(draco);
        gltf.load(a.src, (g) => obj!.add(g.scene));
      }
      break;
    }
    case "m-image": {
      const tex = new THREE.TextureLoader().load(a.src ?? "");
      obj = new THREE.Mesh(
        new THREE.PlaneGeometry(a.width!, a.height!),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
        }),
      );
      break;
    }

    /* ---------- media with optional spatial sound ---------- */
    case "m-video": {
      const videoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(a.width!, a.height!),
        new THREE.MeshBasicMaterial({
          transparent: true,
          side: THREE.DoubleSide,
        }),
      );
      if (a.src) {
        const vid = document.createElement("video");
        vid.src = a.src;
        vid.crossOrigin = "anonymous";
        vid.loop = a.loop!;
        vid.playsInline = true;
        vid.muted = !opts.audioListener;
        if (a.autoplay) vid.play();
        (videoMesh.material as THREE.MeshBasicMaterial).map =
          new THREE.VideoTexture(vid);

        if (opts.audioListener) {
          const pSound = new THREE.PositionalAudio(opts.audioListener);
          pSound.setMediaElementSource(vid);
          pSound.setRefDistance(a.distance!);
          pSound.setRolloffFactor(a.decay!);
          pSound.setVolume(a.volume!);
          videoMesh.add(pSound);
        }
      }
      obj = videoMesh;
      break;
    }
    case "m-audio": {
      obj = new THREE.Group();
      if (opts.audioListener && a.src) {
        const loader = new THREE.AudioLoader();
        const snd = new THREE.PositionalAudio(opts.audioListener);
        loader.load(a.src, (buf) => {
          snd.setBuffer(buf);
          snd.setLoop(a.loop!);
          snd.setVolume(a.volume!);
          snd.setRefDistance(a.distance!);
          snd.setRolloffFactor(a.decay!);
          if (a.autoplay) snd.play();
        });
        obj.add(snd);
      }
      break;
    }

    /* ---------- grouping ---------- */
    case "m-group":
    case "m-store":
      obj = new THREE.Group();
      break;

    /* ---------- light ---------- */
    case "m-light":
      obj = new THREE.PointLight(
        a.color ?? 0xffffff,
        1,
        a.distance ?? 0,
        a.decay ?? 2,
      );
      break;

    default:
      console.warn(
        `[MML] Unknown tag <${el.tagName}> – replaced by empty group.`,
      );
      obj = new THREE.Group();
  }

  if (!obj) return undefined;

  /* local transform ------------------------------------------------------ */
  obj.position.set(a.x!, a.y!, a.z!);
  obj.rotation.set(
    THREE.MathUtils.degToRad(a.rx!),
    THREE.MathUtils.degToRad(a.ry!),
    THREE.MathUtils.degToRad(a.rz!),
  );
  obj.scale.set(a.sx!, a.sy!, a.sz!);

  /* attribute animations ------------------------------------------------- */
  const animTags = Array.from(el.children).filter(
    (c) => c.tagName.toLowerCase() === "m-attr-anim",
  );
  if (animTags.length) {
    let elapsed = 0;
    const anims = animTags.map((an) => ({
      attr: an.getAttribute("attr") ?? "",
      start: parseFloat(an.getAttribute("start") ?? "0"),
      end: parseFloat(an.getAttribute("end") ?? "0"),
      startTime: parseInt(an.getAttribute("start-time") ?? "0", 10),
      duration: parseInt(an.getAttribute("duration") ?? "1000", 10),
      pingPong: an.getAttribute("ping-pong") === "true",
      easing: an.getAttribute("easing") ?? "linear",
    }));

    const controller: InternalController = {
      update: (dt: number) => {
        elapsed += dt * 1000;
        anims.forEach((anim) => {
          if (elapsed < anim.startTime) return;
          const t = elapsed - anim.startTime;
          let p = (t % anim.duration) / anim.duration;
          if (anim.pingPong && Math.floor(t / anim.duration) % 2) p = 1 - p;
          if (anim.easing === "easeInOutCubic")
            p = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
          const v = anim.start + (anim.end - anim.start) * p;
          switch (anim.attr) {
            case "x":
              obj!.position.x = v;
              break;
            case "y":
              obj!.position.y = v;
              break;
            case "z":
              obj!.position.z = v;
              break;
            case "rx":
              obj!.rotation.x = THREE.MathUtils.degToRad(v);
              break;
            case "ry":
              obj!.rotation.y = THREE.MathUtils.degToRad(v);
              break;
            case "rz":
              obj!.rotation.z = THREE.MathUtils.degToRad(v);
              break;
            case "sx":
              obj!.scale.x = v;
              break;
            case "sy":
              obj!.scale.y = v;
              break;
            case "sz":
              obj!.scale.z = v;
              break;
          }
        });
      },
    };
    (obj as any)._mmlController = controller;
  }

  /* recurse -------------------------------------------------------------- */
  Array.from(el.children).forEach((child) => {
    if (child.tagName.toLowerCase() === "m-attr-anim") return;
    const childObj = createObject(child, opts);
    if (childObj) obj!.add(childObj);
  });

  return obj;
}

/* ------------------------------------------------------------------------- */

/**
 * Parse an MML XML string into a Three.js object hierarchy.
 * @param xml      MML source (single root element)
 * @param options  Parsing options; pass an AudioListener to enable spatial sound.
 */
export function parseMML(
  xml: string,
  options: ParseMMLOptions = {},
): THREE.Object3D {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return createObject(doc.documentElement, options) ?? new THREE.Group();
}

/** Advance all <m-attr-anim> controllers under the given root by `delta` seconds. */
export function updateAnimations(root: THREE.Object3D, delta: number) {
  root.traverse((o) => (o as any)._mmlController?.update(delta));
}
