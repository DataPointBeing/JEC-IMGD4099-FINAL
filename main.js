import { default as seagulls } from './seagulls/seagulls.js';

import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.1/dist/tweakpane.min.js';

const canvas = document.getElementsByTagName('canvas')[0];

const sg      = await seagulls.init(),
   frag    = await seagulls.import( './frag.wgsl' ),
   compute = await seagulls.import( './compute.wgsl' ),
   render  = seagulls.constants.vertex + frag,
   size    = (window.innerWidth * window.innerHeight),
   stateA   = new Float32Array(size),
   stateB   = new Float32Array(size),
   stateColor = new Float32Array(size * 3)

let scrollAxes = [0, 0];

function causeFlow(ev) {
   scrollAxes[0] = ev.deltaX;
   scrollAxes[1] = ev.deltaY;
   sg.uniforms.scroll = scrollAxes;
}

canvas.onwheel = causeFlow;

for( let i = 0; i < size; i++ ) {
   stateA[i] = Math.round(Math.random() < 0.3? 1:0);
   stateB[i] = 0.345; //Math.round( Math.random() > 0.9? 1:0 )
   stateColor[i * 3] = 0.5;
   stateColor[(i * 3) + 1] = 0.79;
   stateColor[(i * 3) + 2] = 0.58;
}

let mseState = [0, 0, 0];
let funColor = [(Math.random()*0.65)+0.25, (Math.random()*0.65)+0.25, (Math.random()*0.65)+0.25];

let frames = 0;

function updateMouseState() {
   sg.uniforms.mseState = mseState;
   sg.uniforms.funColor = funColor;
}

window.onmousemove = function(event) {
   mseState[0] = event.pageX;
   mseState[1] = event.pageY;
   updateMouseState();
}

canvas.onmousedown = function() {
   mseState[2] = 1;
   funColor = [(Math.random()*0.65)+0.25, (Math.random()*0.65)+0.25, (Math.random()*0.65)+0.25];
   updateMouseState();
}
document.onmouseup = function() {
   mseState[2] = 0;
   updateMouseState();
}

// tweakpane stuff
const tpParams = {
   da: 1.00,
   db: 0.26,
   feed: 0.14,
   kill: 0.047,
   brushA: 0.2,
   brushANoise: 0.05,
   brushSize: 40,
   tesselate: false,
   reverseTesselation: false
};

const pane = new Pane();
pane.addBinding(tpParams, 'da', {min: 0, max: 1 }).on('change',  e => {sg.uniforms.Da = e.value;});
pane.addBinding(tpParams, 'db', {min: 0, max: 1 }).on('change',  e => {sg.uniforms.Db = e.value;});
pane.addBinding(tpParams, 'feed', {min: 0, max: 0.5 }).on('change',  e => {sg.uniforms.f = e.value;});
pane.addBinding(tpParams, 'kill', {min: 0, max: 0.5 }).on('change',  e => {sg.uniforms.k = e.value;});
pane.addBinding(tpParams, 'brushA', {min: 0, max: 1 }).on('change',  e => {sg.uniforms.brushA = [e.value, sg.uniforms.brushA[1]];});
pane.addBinding(tpParams, 'brushANoise', {min: 0, max: 5 }).on('change',  e => {sg.uniforms.brushA = [sg.uniforms.brushA[0], e.value];});
pane.addBinding(tpParams, 'brushSize', {min: 5, max: 200 }).on('change',  e => {sg.uniforms.brushSize = e.value;});
pane.addBinding(tpParams, 'tesselate').on('change',  e => {sg.uniforms.tesselate = e.value;});
pane.addBinding(tpParams, 'reverseTesselation').on('change',  e => {sg.uniforms.reverseTesselation = e.value;});


sg.buffers({ stAin:stateA, stAout:stateA, stBin:stateB, stBout:stateB, stColin:stateColor, stColout:stateColor})
   .uniforms({
      res: [window.innerWidth, window.innerHeight],
      Da: tpParams.da,
      Db: tpParams.db,
      f: tpParams.feed,
      k: tpParams.kill,
      mseState: mseState,
      funColor: funColor,
      brushA: [tpParams.brushA, tpParams.brushANoise],
      brushSize: tpParams.brushSize,
      tesselate: tpParams.tesselate? 1:0,
      reverseTesselation: tpParams.reverseTesselation? 1:0,
      scroll: scrollAxes
   })
   .backbuffer(false)
   .pingpong(1)
   .compute(
      compute,
      [Math.round(window.innerWidth / 16), Math.round(window.innerHeight / 16), 1],
      { pingpong:['stAin', 'stBin', 'stColin'] }
   )
   .render(render)
   .run()
