const fs = require("fs");
const path = require("path");

function buildEndCrystalModel() {
  const positions = [];
  const normals = [];
  const indices = [];
  const thicknesses = [];
  const aos = [];
  const daoNs = [];
  const daoPs = [];
  const SNs = [];

  function addQuad(p0, p1, p2, p3, n, thick, aoVal) {
    if (thick === undefined) thick = 0.5;
    if (aoVal === undefined) aoVal = 1.0;
    const baseIdx = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    SNs.push(...n, ...n, ...n, ...n);
    thicknesses.push(thick, thick, thick, thick);
    aos.push(aoVal, aoVal, aoVal, aoVal);
    daoNs.push(...n, ...n, ...n, ...n);
    daoPs.push(...n, ...n, ...n, ...n);

    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
  }

  function addBox(minX, minY, minZ, maxX, maxY, maxZ, rotMatrix, thick, ao) {
    if (thick === undefined) thick = 0.3;
    if (ao === undefined) ao = 1.0;
    const transform = (p) => {
      if (!rotMatrix) return p;
      const x = p[0]*rotMatrix[0] + p[1]*rotMatrix[1] + p[2]*rotMatrix[2];
      const y = p[0]*rotMatrix[3] + p[1]*rotMatrix[4] + p[2]*rotMatrix[5];
      const z = p[0]*rotMatrix[6] + p[1]*rotMatrix[7] + p[2]*rotMatrix[8];
      return [x, y, z];
    };
    const transformNorm = (n) => {
      if (!rotMatrix) return n;
      const x = n[0]*rotMatrix[0] + n[1]*rotMatrix[1] + n[2]*rotMatrix[2];
      const y = n[0]*rotMatrix[3] + n[1]*rotMatrix[4] + n[2]*rotMatrix[5];
      const z = n[0]*rotMatrix[6] + n[1]*rotMatrix[7] + n[2]*rotMatrix[8];
      return [x, y, z];
    };

    // +Z (front)
    addQuad(
      transform([minX, minY, maxZ]), transform([maxX, minY, maxZ]),
      transform([maxX, maxY, maxZ]), transform([minX, maxY, maxZ]),
      transformNorm([0, 0, 1]), thick, ao
    );
    // -Z (back)
    addQuad(
      transform([maxX, minY, minZ]), transform([minX, minY, minZ]),
      transform([minX, maxY, minZ]), transform([maxX, maxY, minZ]),
      transformNorm([0, 0, -1]), thick, ao
    );
    // +Y (top)
    addQuad(
      transform([minX, maxY, maxZ]), transform([maxX, maxY, maxZ]),
      transform([maxX, maxY, minZ]), transform([minX, maxY, minZ]),
      transformNorm([0, 1, 0]), thick, ao
    );
    // -Y (bottom)
    addQuad(
      transform([minX, minY, minZ]), transform([maxX, minY, minZ]),
      transform([maxX, minY, maxZ]), transform([minX, minY, maxZ]),
      transformNorm([0, -1, 0]), thick, ao
    );
    // +X (right)
    addQuad(
      transform([maxX, minY, maxZ]), transform([maxX, minY, minZ]),
      transform([maxX, maxY, minZ]), transform([maxX, maxY, maxZ]),
      transformNorm([1, 0, 0]), thick, ao
    );
    // -X (left)
    addQuad(
      transform([minX, minY, minZ]), transform([minX, minY, maxZ]),
      transform([minX, maxY, maxZ]), transform([minX, maxY, minZ]),
      transformNorm([-1, 0, 0]), thick, ao
    );
  }

  function getRotationMatrix(axis, angle) {
    const [x, y, z] = axis;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    return [
      t*x*x + c,   t*x*y - s*z, t*x*z + s*y,
      t*x*y + s*z, t*y*y + c,   t*y*z - s*x,
      t*x*z - s*y, t*y*z + s*x, t*z*z + c
    ];
  }

  function multMatrix(a, b) {
    const r = new Array(9);
    for(let i=0; i<3; i++) {
      for(let j=0; j<3; j++) {
        r[i*3+j] = a[i*3+0]*b[0*3+j] + a[i*3+1]*b[1*3+j] + a[i*3+2]*b[2*3+j];
      }
    }
    return r;
  }

  function buildNotchedCubeFrame(size, beamW, rotMat, thick, ao) {
    const s = size / 2;
    const b = beamW;
    // 12 outer beams
    addBox(-s, -s, -s, -s+b, -s+b, s, rotMat, thick, ao);
    addBox(s-b, -s, -s, s, -s+b, s, rotMat, thick, ao);
    addBox(-s, s-b, -s, -s+b, s, s, rotMat, thick, ao);
    addBox(s-b, s-b, -s, s, s, s, rotMat, thick, ao);

    addBox(-s, -s+b, -s, -s+b, s-b, -s+b, rotMat, thick, ao);
    addBox(s-b, -s+b, -s, s, s-b, -s+b, rotMat, thick, ao);
    addBox(-s, -s+b, s-b, -s+b, s-b, s, rotMat, thick, ao);
    addBox(s-b, -s+b, s-b, s, s-b, s, rotMat, thick, ao);

    addBox(-s+b, -s, -s, s-b, -s+b, -s+b, rotMat, thick, ao);
    addBox(-s+b, s-b, -s, s-b, s, -s+b, rotMat, thick, ao);
    addBox(-s+b, -s, s-b, s-b, -s+b, s, rotMat, thick, ao);
    addBox(-s+b, s-b, s-b, s-b, s, s, rotMat, thick, ao);

    // Minecraft end crystal tooth pattern on all faces (notched pixel pattern)
    const toothSize = b * 0.9;
    const toothDepth = b * 0.75;
    const count = 5;
    for (let i = 1; i <= count; i++) {
      if (i % 2 === 1) {
        const offset = -s + b + (i / (count + 1)) * (size - 2*b);
        // Face +/- Z
        addBox(offset - toothSize/2, s - b - toothDepth, s - b, offset + toothSize/2, s - b, s, rotMat, thick, ao);
        addBox(offset - toothSize/2, -s + b, s - b, offset + toothSize/2, -s + b + toothDepth, s, rotMat, thick, ao);
        addBox(-s, offset - toothSize/2, s - b, -s + b + toothDepth, offset + toothSize/2, s, rotMat, thick, ao);
        addBox(s - b - toothDepth, offset - toothSize/2, s - b, s, offset + toothSize/2, s, rotMat, thick, ao);

        addBox(offset - toothSize/2, s - b - toothDepth, -s, offset + toothSize/2, s - b, -s + b, rotMat, thick, ao);
        addBox(offset - toothSize/2, -s + b, -s, offset + toothSize/2, -s + b + toothDepth, -s + b, rotMat, thick, ao);
        addBox(-s, offset - toothSize/2, -s, -s + b + toothDepth, offset + toothSize/2, -s + b, rotMat, thick, ao);
        addBox(s - b - toothDepth, offset - toothSize/2, -s, s, offset + toothSize/2, -s + b, rotMat, thick, ao);

        // Face +/- X
        addBox(s - b, offset - toothSize/2, s - b - toothDepth, s, offset + toothSize/2, s - b, rotMat, thick, ao);
        addBox(s - b, offset - toothSize/2, -s + b, s, offset + toothSize/2, -s + b + toothDepth, rotMat, thick, ao);
        addBox(-s, offset - toothSize/2, s - b - toothDepth, -s + b, offset + toothSize/2, s - b, rotMat, thick, ao);
        addBox(-s, offset - toothSize/2, -s + b, -s + b, offset + toothSize/2, -s + b + toothDepth, rotMat, thick, ao);
      }
    }
  }

  // 1. Outer Frame 1 (Main axis)
  buildNotchedCubeFrame(1.5, 0.12, null, 0.15, 0.95);

  // 2. Outer Frame 2 (Rotated along diagonal like Minecraft)
  const normDiag = [1 / Math.SQRT2, 1 / Math.SQRT2, 0];
  const rot1 = getRotationMatrix(normDiag, Math.PI / 3);
  const rot2 = getRotationMatrix([0, 1, 0], Math.PI / 4);
  const rotFrame2 = multMatrix(rot1, rot2);
  buildNotchedCubeFrame(1.5, 0.12, rotFrame2, 0.15, 0.95);

  // 3. Middle Nested Frame
  const rotMiddle = getRotationMatrix([0, 1, 0], Math.PI / 4);
  buildNotchedCubeFrame(1.1, 0.09, rotMiddle, 0.3, 0.85);

  // 4. Central Glowing Crystal Core (Single solid geometric crystal core, precisely scaled and rotated without protrusion)
  const coreSize = 0.52;
  const rotCore = multMatrix(getRotationMatrix([1, 0, 1].map(v => v/Math.SQRT2), Math.PI/4), getRotationMatrix([0, 1, 0], Math.PI/4));
  addBox(-coreSize/2, -coreSize/2, -coreSize/2, coreSize/2, coreSize/2, coreSize/2, rotCore, 0.95, 1.0);

  // 5. Inner Core Concentric Rune Beacon (Sharing same rotation axis to prevent any corner sticking out)
  const nucSize = 0.36;
  addBox(-nucSize/2, -nucSize/2, -nucSize/2, nucSize/2, nucSize/2, nucSize/2, rotCore, 1.0, 1.0);

  // Package into .buf format
  const vCount = positions.length / 3;
  const iCount = indices.length;

  const header = {
    vertexCount: vCount,
    indexCount: iCount,
    attributes: [
      { id: "daoN", needsPack: false, componentSize: 3, storageType: "Float32Array" },
      { id: "normal", needsPack: false, componentSize: 3, storageType: "Float32Array" },
      {
        id: "SN",
        needsPack: true,
        componentSize: 3,
        storageType: "Int16Array",
        packedComponents: [{ from: -1, delta: 2 }, { from: -1, delta: 2 }, { from: -1, delta: 2 }]
      },
      {
        id: "ao",
        needsPack: true,
        componentSize: 1,
        storageType: "Uint16Array",
        packedComponents: [{ from: 0, delta: 1 }]
      },
      {
        id: "daoP",
        needsPack: true,
        componentSize: 3,
        storageType: "Int16Array",
        packedComponents: [{ from: 0, delta: 1 }, { from: 0, delta: 1 }, { from: 0, delta: 1 }]
      },
      { id: "indices", needsPack: false, componentSize: 1, storageType: "Uint16Array" },
      {
        id: "position",
        needsPack: true,
        componentSize: 3,
        storageType: "Uint16Array",
        packedComponents: [{ from: -1, delta: 2 }, { from: -1, delta: 2 }, { from: -1, delta: 2 }]
      },
      {
        id: "thickness",
        needsPack: true,
        componentSize: 1,
        storageType: "Uint8Array",
        packedComponents: [{ from: 0, delta: 1 }]
      }
    ],
    meshType: "Mesh"
  };

  let headerJson = JSON.stringify(header);
  let headerBuf = Buffer.from(headerJson, "utf8");
  while ((4 + headerBuf.length) % 4 !== 0) {
    headerJson += " ";
    headerBuf = Buffer.from(headerJson, "utf8");
  }
  const headerLen = headerBuf.length;

  // Binary buffers
  const daoNArr = new Float32Array(daoNs);
  const normalArr = new Float32Array(normals);
  
  // SN: Int16Array
  const snArr = new Int16Array(vCount * 3);
  for (let i = 0; i < vCount * 3; i++) {
    let normVal = (SNs[i] - (-1)) / 2;
    snArr[i] = Math.round(normVal * 65536 - 32768);
  }

  // ao: Uint16Array
  const aoArr = new Uint16Array(vCount);
  for (let i = 0; i < vCount; i++) {
    aoArr[i] = Math.round(aos[i] * 65535);
  }

  // daoP: Int16Array
  const daoPArr = new Int16Array(vCount * 3);
  for (let i = 0; i < vCount * 3; i++) {
    daoPArr[i] = Math.round(daoPs[i] * 32767);
  }

  // indices: Uint16Array
  const idxArr = new Uint16Array(indices);

  // position: Uint16Array
  const posArr = new Uint16Array(vCount * 3);
  for (let i = 0; i < vCount * 3; i++) {
    let normVal = (positions[i] - (-1)) / 2;
    normVal = Math.max(0, Math.min(1, normVal));
    posArr[i] = Math.round(normVal * 65535);
  }

  // thickness: Uint8Array
  const thickArr = new Uint8Array(vCount);
  for (let i = 0; i < vCount; i++) {
    thickArr[i] = Math.round(thicknesses[i] * 255);
  }

  const fileBuffers = [
    Buffer.alloc(4),
    headerBuf,
    Buffer.from(daoNArr.buffer),
    Buffer.from(normalArr.buffer),
    Buffer.from(snArr.buffer),
    Buffer.from(aoArr.buffer),
    Buffer.from(daoPArr.buffer),
    Buffer.from(idxArr.buffer),
    Buffer.from(posArr.buffer),
    Buffer.from(thickArr.buffer)
  ];
  fileBuffers[0].writeUInt32LE(headerLen, 0);

  const finalBuf = Buffer.concat(fileBuffers);
  const dir = path.join(__dirname, "assets/models/home");
  fs.writeFileSync(path.join(dir, "cross.buf"), finalBuf);
  fs.writeFileSync(path.join(dir, "cross_ld.buf"), finalBuf);
  console.log("Successfully rebuilt pure color End Crystal binary model! Vertices:", vCount, "Indices:", iCount, "Bytes:", finalBuf.length);
}

buildEndCrystalModel();
