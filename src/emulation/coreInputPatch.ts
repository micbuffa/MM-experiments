/** Raccord au glue JS Emscripten du WASM MAME figé, pas de recompilation du cœur. */
export const CORE_GLUE_SHA256 =
  'ffe2f31c70f81b8c0793d6e6b0a686a759b642e8c3c8c2deeb3bb3a2e597aa0f';
export const CORE_WASM_SHA256 =
  '368c682fb15296cb8003fa771d9e5cc25616624747d3dc7ec7eab29f060dc9b7';
export const MOUSE_CALLBACK_MARKER =
  'target=findEventTarget(target);var mouseEventHandlerFunc=(e=event)=>{fillMouseEventData(JSEvents.mouseEvent,e,target);';
export const ITERATION_MARKER =
  'callUserCallback(func);for(var post of MainLoop.postMainLoop){post()}';
export const PATCHED_ITERATION_MARKER =
  'if(Module.marbleBeforeIteration)Module.marbleBeforeIteration();callUserCallback(func);if(Module.marbleAfterIteration)Module.marbleAfterIteration();for(var post of MainLoop.postMainLoop){post()}';

const INPUT_TABLE_MARKER = 'wasmTable=wasmExports["Eh"];';
// Table slot 490 is rwebinput_input_state in CORE_WASM_SHA256.
// This module re-exports a typed (10 × i32) → i32 JS import as a WASM function.
const inputStateTrampoline = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 15, 1, 96, 10, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 1, 127, 2, 7, 1, 1, 105, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0,
  0,
];

export function isolateTrackpadPort(source: string): string {
  if (source.split(INPUT_TABLE_MARKER).length !== 2)
    throw new Error('Table d’entrée différente de la version vérifiée.');
  return source.replace(
    INPUT_TABLE_MARKER,
    `${INPUT_TABLE_MARKER}
{
 const original=wasmTable.get(490);
 if(typeof original!=="function"||original.length!==10)throw new Error("ABI des ports d’entrée incompatible");
 const adapter=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(${JSON.stringify(inputStateTrampoline)})),{
  i:{f:(data,joy,secondary,info,binds,blocked,port,device,index,id)=>
   device===2&&port!==(typeof Module!=="undefined"&&Module.marbleTrackpadPort===1?1:0)?0:original(data,joy,secondary,info,binds,blocked,port,device,index,id)}
 });
 wasmTable.set(490,adapter.exports.f);
}`,
  );
}

// ABI de rwebinput_mouse_state_t dans input/drivers/emulatorjs_input.c (6dd4353) :
// 4 doubles (0..31), x/y (32/36), pending (40/44), poll (48/52), boutons (56), sizeof 64.
// Ce bloc est remplacé seulement si l'empreinte du glue ET le marqueur correspondent.
const replacement = `target=findEventTarget(target);
if(target===Module.canvas&&callbackfunc){
 if(userData<=0||userData%8||userData+64>HEAPU8.length)throw new Error("ABI souris incompatible");
 Module.marbleNativeInput={
  state:()=>({pendingX:HEAP32[(userData+40)>>2],pendingY:HEAP32[(userData+44)>>2],polledX:HEAP32[(userData+48)>>2],polledY:HEAP32[(userData+52)>>2],buttons:HEAPU8[userData+56]}),
  clear:()=>HEAPU8.fill(0,userData,userData+64),
  setPending:(x,y)=>{HEAP32[(userData+40)>>2]=x;HEAP32[(userData+44)>>2]=y;}
 };
}
var mouseEventHandlerFunc=(e=event)=>{
 if(target===Module.canvas&&eventTypeString!=="mousemove")return;
 fillMouseEventData(JSEvents.mouseEvent,e,target);
 if(target===Module.canvas){
  var delta=Module.marbleMouseTransform?Module.marbleMouseTransform(e,Module.marbleNativeInput.state()):[0,0];
  HEAP32[(JSEvents.mouseEvent+32)>>2]=delta[0];HEAP32[(JSEvents.mouseEvent+36)>>2]=delta[1];
 }`;

export function patchCoreInput(source: string): string {
  if (source.split(MOUSE_CALLBACK_MARKER).length !== 2)
    throw new Error(
      'Glue souris différent de la version vérifiée ; capture désactivée.',
    );
  if (source.split(ITERATION_MARKER).length !== 2)
    throw new Error('Boucle native différente de la version vérifiée.');
  return source
    .replace(MOUSE_CALLBACK_MARKER, replacement)
    .replace(ITERATION_MARKER, PATCHED_ITERATION_MARKER);
}
