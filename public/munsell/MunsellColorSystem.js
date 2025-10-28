//https://ics.media/entry/14771/
// window.addEventListener('DOMContentLoaded', init);
var canvas;

  // レンダラーを作成
  canvas = document.querySelector('#munsellColorSystemCanvas');
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true  } );
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  // renderer.setClearColor(0x000000, 0); 
  renderer.setSize(width, height);

  // シーンを作成
const scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xffffff);

  // カメラを作成
  const munsellCamera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
munsellCamera.position.set(0, 0, 100);

  //  camera.rotation.set(0, 90, 0);
  // camera.position.y += 20;

  // カメラコントローラーを作成
  const controls = new THREE.OrbitControls(munsellCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.2;


  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(300, 300, 300),
    new THREE.MeshNormalMaterial());
// scene.add(mesh);


// requestAnimationFrame(cameraControlsAnimation(0));
tick();
cameraControlsAnimetion(-30);

function cameraControlsAnimetion(count) {
  // console.log("aaa"+[0,Math.sin(count*0.1)*100,Math.cos(count*0.1)* 100])
  // camera.position.y += 10; 
  easing = 1 - Math.pow(1 - (count / 100), 2);
  // var angle = 0.01
  var angle2 =  (easing+50)*4
  x = Math.sin(angle2) * 100
  y =   easing *70
  z = Math.cos(angle2) * 100
  distance=Math.sqrt(x**2 + y**2 + z**2);

munsellCamera.position.set(x/distance*100,y/distance*100,z/distance*100);
  controls.update();
  if (count < 100) {
    // requestAnimationFrame(() => cameraControlsAnimetion(count+1));
  requestAnimationFrame(()=>cameraControlsAnimetion(count + 1));
  }
}
// 毎フレーム時に実行されるループイベントです
function tick() {
  // レンダリング
  requestAnimationFrame(tick);
  renderer.render(scene, munsellCamera);
  //  mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.01;
  // カメラコントローラーをアップデート
  controls.update();
}



var colorObjects=[]
function addColorMesh(colorcode, H, V, C) {
  // console.log([colorcode, H, S, C])
// if (Math.random()<0.9) 
//   return;
   let rad = (H / 40.0)  *2 * Math.PI;
    let x=Math.sin(rad) * C*1.5;
 let y=Math.cos(rad) * C*1.5;
  let z = V * 5-20;
   material= new THREE.MeshBasicMaterial({ color: colorcode })
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 4, 1),
  material);
  sphere.position.set(y, z, x);
  scene.add(sphere)
  // console.log(sphere)
  colorObjects.push([sphere,colorcode,[H,V,C]])
} 

