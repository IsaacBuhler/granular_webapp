let player,
  bufferData = null;
let isPlaying = false;
let grains = [];
const waveformCanvas = document.getElementById("waveformCanvas");
const waveformCtx = waveformCanvas.getContext("2d");
const canvas = document.getElementById("vizCanvas");
const ctx = canvas.getContext("2d");
const grainSizeSlider = document.getElementById("grainSize");
const overlapSlider = document.getElementById("overlap");
const playbackRateSlider = document.getElementById("playbackRate");
const attackSlider = document.getElementById("attack");
const releaseSlider = document.getElementById("release");
const analyzer = new Tone.Analyser("fft", 512);
document
  .getElementById("audioFile")
  .addEventListener("change", async function (event) {
    console.log(Tone.context.state);
    await Tone.start();
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      player = new Tone.GrainPlayer({
        url: url,
        loop: true,
        grainSize: 0.1,
        overlap: 0.05
      })
        .connect(analyzer)
        .toDestination();
      await player.load();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = Tone.getContext().rawContext;
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      bufferData = decoded.getChannelData(0);
      requestAnimationFrame(drawFullWaveform);
    }
  });

function startGrain() {
  if (player && !isPlaying) {
    player.start();
    Tone.Transport.start();
    isPlaying = true;
    requestAnimationFrame(draw);
  }
}

function stopGrain() {
  if (player && isPlaying) {
    player.stop();
    Tone.Transport.stop();
    isPlaying = false;
    grains = [];
    drawWaveform();
  }
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  drawWaveform();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawWaveform() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!bufferData) return;
  const middle = canvas.height / 2;
  const step = Math.ceil(bufferData.length / canvas.width);
  ctx.beginPath();
  ctx.moveTo(0, middle);
  for (let i = 0; i < canvas.width; i++) {
    const sample = bufferData[i * step] || 0;
    const y = middle + sample * middle;
    ctx.lineTo(i, y);
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFullWaveform() {
  console.log("Waveform canvas width:", waveformCanvas.clientWidth);
  if (!bufferData) return;
  // Resize canvas
  waveformCanvas.width = waveformCanvas.clientWidth;
  waveformCanvas.height = 100;
  waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  const middle = waveformCanvas.height / 2;
  const step = Math.ceil(bufferData.length / waveformCanvas.width);
  waveformCtx.beginPath();
  waveformCtx.moveTo(0, middle);
  for (let i = 0; i < waveformCanvas.width; i++) {
    const sample = bufferData[i * step] || 0;
    const y = middle + sample * middle;
    waveformCtx.lineTo(i, y);
  }
  waveformCtx.strokeStyle = "#fff";
  waveformCtx.lineWidth = 1;
  waveformCtx.stroke();
}

function draw() {
  if (!isPlaying) return;
  const grainSize = parseFloat(grainSizeSlider.value);
  const overlap = parseFloat(overlapSlider.value);
  const playbackRate = parseFloat(playbackRateSlider.value);
  const attack = parseFloat(attackSlider.value);
  const release = parseFloat(releaseSlider.value);
  player.grainSize = grainSize / 1000;
  player.overlap = overlap / 1000;
  player.playbackRate = playbackRate;
  if (Math.random() < 0.3) {
    grains.push({
      x: 0,
      width: grainSize / 1.5,
      height: 30 + Math.random() * 40,
      attack,
      release,
      age: 0,
      alpha: 1.0
    });
  }
  drawWaveform();
  const freqData = analyzer.getValue();
  const avgFrequency =
    freqData.reduce((acc, val) => acc + val, 0) / freqData.length;
  grains.forEach((g) => {
    g.x += 4;
    g.age++;
    const scaleFactor = Math.max(0.5, avgFrequency * 2);
    g.height = 30 * 40 * scaleFactor;
    ctx.fillStyle = `rgba(255, 255, 255, ${g.alpha})`;
    ctx.fillRect(g.x, canvas.height - g.height, g.width, g.height);
  });
  grains = grains.filter((g) => g.age < 60);
  requestAnimationFrame(draw);
}