import format from "xml-formatter";

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
  apikey: string
) => {
  if (!parcelColor) {
    parcelColor = "#f7931a";
  }
  if (!size) {
    size = 0.5;
  }
  let txList = [];
const payload = { "apikey": apikey, "blockHeight": blockHeight.toString() };
const headers = { "Content-Type": "application/x-www-form-urlencoded" };
const body = new URLSearchParams(payload).toString();
const compressed = await fetch(uri, {
    method: "POST",
    headers: headers,
    body: body
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

  for (let i = 0; i < txList.length; i++) {
    const slot = mondrian.place(txList[i].size);

    if (slot) {
      parcelsMML += `<m-cube id="parcel-${i}-size-${slot.r}" width="${slot.r * size * 0.9}" height="${platform_thickness * slot.r}" depth="${slot.r * size * 0.9}" x="${(slot.position.x + slot.r - blockWidth / 2) * size - margin * slot.r}" y="${(0.1 * slot.r) / 2}" z="${(slot.position.y + slot.r - blockWidth / 2) * size - margin * slot.r}" color="${parcelColor}">${Math.random() > 0.95 ? `<m-attr-anim attr="y" start="0.5" end="${0.5 + Math.floor(Math.random() * 10)}" start-time="2000" duration="${5000 + Math.floor(Math.random() * 5000)}" ping-pong="true" ping-pong-delay="1000"></m-attr-anim>`: ``} </m-cube>`;
    }
  }

  const outputMml = format(
    `<m-group>${preventSelfClosingConversion(parcelsMML)}</m-group>`,
    {
      indentation: "  ",
    },
  );

  return { mmlFile: outputMml, blockWidth };
};
