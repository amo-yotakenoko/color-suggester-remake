import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const MunsellCanvas = () => {
    const canvasRef = useRef(null);
    const renderer = useRef(null);
    const scene = useRef(null);
    const camera = useRef(null);
    const controls = useRef(null);
    const colorObjects = useRef([]);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Three.js
        renderer.current = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
        renderer.current.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);

        scene.current = new THREE.Scene();

        camera.current = new THREE.PerspectiveCamera(45, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 1, 10000);
        camera.current.position.set(0, 0, 100);

        controls.current = new OrbitControls(camera.current, canvasRef.current);
        controls.current.enableDamping = true;
        controls.current.dampingFactor = 0.2;

        /**
         * 毎フレームレンダリングを実行するループ
         */
        const tick = () => {
            if (!renderer.current || !scene.current || !camera.current || !controls.current) return;
            requestAnimationFrame(tick);
            renderer.current.render(scene.current, camera.current);
            controls.current.update();
        };

        /**
         * カメラをアニメーションさせる
         * @param {number} count アニメーションの進行度
         */
        const cameraControlsAnimetion = (count) => {
            if (count > 100) return;
            const easing = 1 - Math.pow(1 - (count / 100), 2);
            const angle2 = (easing + 50) * 4;
            const x = Math.sin(angle2) * 100;
            const y = easing * 70;
            const z = Math.cos(angle2) * 100;
            const distance = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
            camera.current.position.set(x / distance * 100, y / distance * 100, z / distance * 100);
            controls.current.update();
            requestAnimationFrame(() => cameraControlsAnimetion(count + 1));
        };

        /**
         * シーンに色を表すメッシュを追加する
         * @param {string} colorcode カラーコード
         * @param {number} H 色相
         * @param {number} V 明度
         * @param {number} C 彩度
         */
        const addColorMesh = (colorcode, H, V, C) => {
            let rad = (H / 40.0) * 2 * Math.PI;
            let x = Math.sin(rad) * C * 1.5;
            let y = Math.cos(rad) * C * 1.5;
            let z = V * 5 - 20;
            const material = new THREE.MeshBasicMaterial({ color: colorcode });
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(1, 4, 1),
                material
            );
            sphere.position.set(y, z, x);
            scene.current.add(sphere);
            
            colorObjects.current.push([sphere, colorcode, [H, V, C]]);
        };

        /**
         * 色データを読み込み、メッシュをシーンに追加するループを開始する
         */
        const readcolorcodeToHVC = () => {
            fetch('munsell/colorcodeToHVC.txt')
                .then((response) => response.text())
                .then((text) => {
                    const munsellColors = text.split('\n').map((line) => line.split('\t'));
                    let i = 1;
                    const colorAddLoop = () => {
                        for (let j = 0; j < 10; j++) {
                            if (!munsellColors[i]) return;
                            const color = munsellColors[i];
                            if (color) {
                                addColorMesh(color[0], parseFloat(color[1]), parseFloat(color[2]), parseFloat(color[3]));
                            }
                            i++;
                        }
                        requestAnimationFrame(colorAddLoop);
                    };
                    colorAddLoop();
                });
        };

        tick();
        cameraControlsAnimetion(-30);
        readcolorcodeToHVC();

    }, []);

    return <canvas ref={canvasRef} width="512" height="512" />;
};

export default MunsellCanvas;
