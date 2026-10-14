// 生成 tabBar 占位 PNG 图标（纯色方块，后续替换为正式图标）
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function createPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const rawData = Buffer.alloc((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0
    for (let x = 0; x < width; x++) {
      rawData[offset++] = r
      rawData[offset++] = g
      rawData[offset++] = b
    }
  }
  const compressed = zlib.deflateSync(rawData)
  const iend = Buffer.alloc(0)
  const crcTable = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })()
  function crc32(buf) {
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const tb = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([tb, data])) >>> 0, 0)
    return Buffer.concat([len, tb, data, crc])
  }
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', iend)])
}

const outDir = path.join(__dirname, '..', 'src', 'assets', 'tabbar')
fs.mkdirSync(outDir, { recursive: true })

const tabs = ['home', 'class', 'notice', 'data', 'profile']
tabs.forEach((name) => {
  fs.writeFileSync(path.join(outDir, `${name}.png`), createPNG(81, 81, 153, 153, 153))
  fs.writeFileSync(path.join(outDir, `${name}_active.png`), createPNG(81, 81, 0, 98, 255))
})
console.log('Generated 10 tabBar icons')
