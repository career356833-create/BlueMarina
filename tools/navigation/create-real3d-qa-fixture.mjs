// Explicit engine test geometry. NOT photogrammetry, NOT Korean terrain evidence.
// Generates ignored local data only; do not deploy this fixture as service data.
import { mkdirSync, writeFileSync } from "node:fs";
import { Cartesian3, Matrix4, Transforms } from "cesium";
import { PNG } from "pngjs";
const out = new URL("../../public/navigation-3d-data/qa/", import.meta.url);
mkdirSync(out, { recursive: true });
const positions = new Float32Array([-500,0,-500, 500,0,-500, 500,0,500, -500,0,500, -500,350,-500, 500,350,-500, 500,350,500, -500,350,500]);
const uv = new Float32Array([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1]);
const indices = new Uint16Array([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);
writeFileSync(new URL('mesh.bin',out), Buffer.concat([Buffer.from(positions.buffer),Buffer.from(uv.buffer),Buffer.from(indices.buffer)]));
const png = new PNG({ width: 2, height: 2 });
png.data.set([255,60,40,255, 255,240,30,255, 20,200,255,255, 255,60,40,255]);
writeFileSync(new URL('checker.png',out),PNG.sync.write(png));
const model = {
  asset:{ version:'2.0', generator:'Blue Marina synthetic engine QA — not real terrain' },
  extensionsUsed:['KHR_materials_unlit'],scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:1},indices:2,material:0}]}],
  buffers:[{uri:'mesh.bin',byteLength:232}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:96},{buffer:0,byteOffset:96,byteLength:64},{buffer:0,byteOffset:160,byteLength:72}],
  accessors:[{bufferView:0,componentType:5126,count:8,type:'VEC3',min:[-500,0,-500],max:[500,350,500]},{bufferView:1,componentType:5126,count:8,type:'VEC2'},{bufferView:2,componentType:5123,count:36,type:'SCALAR'}],
  materials:[{extensions:{KHR_materials_unlit:{}},doubleSided:true,pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1}}],textures:[{source:0}],images:[{uri:'checker.png'}],
};
writeFileSync(new URL('mesh.gltf',out),JSON.stringify(model));
const transform = Matrix4.toArray(Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(129.125,35.145,0)));
writeFileSync(new URL('tileset.json',out),JSON.stringify({asset:{version:'1.1'},geometricError:1000,root:{transform,boundingVolume:{sphere:[0,0,175,800]},geometricError:0,content:{uri:'mesh.gltf'}}}));
console.log('Local synthetic mesh fixture created. Photorealistic coverage NOT verified.');
