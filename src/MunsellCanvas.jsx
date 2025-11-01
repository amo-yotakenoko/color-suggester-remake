import React, { useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

const MunsellColorSphere = ({ color, hvc }) => {
    const [H, V, C] = hvc;
    const rad = (H / 40.0) * 2 * Math.PI;
    const x = Math.sin(rad) * C * 1.5;
    const y = Math.cos(rad) * C * 1.5;
    const z = V * 5 - 20;
    const threeColor = useMemo(() => new THREE.Color(color), [color]);

    return (
        <mesh position={[y, z, x]}>
            <sphereGeometry args={[0.5, 4, 4]} />
            <meshBasicMaterial color={threeColor} />
        </mesh>
    );
};

const ColorCube = ({ color, hvc, size = 1.5, emissive = false }) => {
    const [H, V, C] = hvc;
    const rad = (H / 40.0) * 2 * Math.PI;
    const x = Math.sin(rad) * C * 1.5;
    const y = Math.cos(rad) * C * 1.5;
    const z = V * 5 - 20;
    const threeColor = useMemo(() => new THREE.Color(color), [color]);
    const emissiveColor = useMemo(() => emissive ? threeColor : new THREE.Color('black'), [emissive, threeColor]);

    return (
        <mesh position={[y, z, x]}>
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial color={threeColor} emissive={emissiveColor} />
        </mesh>
    );
};

const MunsellColors = ({ munsellColors = [] }) => {
    return (
        <>
            {munsellColors.map((color, i) => (
                <MunsellColorSphere key={i} color={color.hex} hvc={color.hvc} />
            ))}
        </>
    );
};

const findClosestMunsell = (rgb, munsellColors = []) => {
    let closestColor = null;
    let minDistance = Infinity;

    munsellColors.forEach(munsellColor => {
        if (!munsellColor || !munsellColor.rgb) return;
        const distance = Math.sqrt(
            Math.pow(rgb[0] - munsellColor.rgb[0], 2) +
            Math.pow(rgb[1] - munsellColor.rgb[1], 2) +
            Math.pow(rgb[2] - munsellColor.rgb[2], 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = munsellColor;
        }
    });
    return closestColor;
};

const SampleColors = ({ munsellData }) => {
    const sampleColors = [
        "255,0,0", // Red
        "0,255,0", // Green
        "0,0,255", // Blue
        "255,255,0", // Yellow
        "0,255,255", // Cyan
        "255,0,255", // Magenta
    ];

    const closestColors = useMemo(() => {
        if (!munsellData) return [];
        return sampleColors.map(colorStr => {
            const rgb = colorStr.split(',').map(c => parseInt(c, 10));
            const closest = findClosestMunsell(rgb, munsellData);
            return { color: `rgb(${colorStr})`, hvc: closest ? closest.hvc : null };
        }).filter(item => item.hvc);
    }, [munsellData]);

    return (
        <>
            {closestColors.map((item, i) => (
                <ColorCube key={i} color={item.color} hvc={item.hvc} />
            ))}
        </>
    );
};

const ExtractedColors = ({ extractedColors, munsellData }) => {
    const closestColors = useMemo(() => {
        console.log('ExtractedColors received:', extractedColors);
        if (!extractedColors || !munsellData) return [];
        const mappedColors = extractedColors.map(color => {
            const rgb = color;
            const closest = findClosestMunsell(rgb, munsellData);
            return { color: `rgb(${rgb.join(',')})`, hvc: closest ? closest.hvc : null };
        });
        console.log('Mapped colors:', mappedColors);
        const filteredColors = mappedColors.filter(item => item.hvc);
        console.log('Filtered colors:', filteredColors);
        return filteredColors;
    }, [extractedColors, munsellData]);

    return (
        <>
            {closestColors.map((item, i) => (
                <ColorCube key={i} color={item.color} hvc={item.hvc} size={2.5} emissive={true} />
            ))}
        </>
    );
};


const MunsellCanvas = ({ extractedColors, munsellColors }) => {
    return (
        <Canvas style={{ width: '100%', height: '100%' }}>
            <OrthographicCamera makeDefault position={[0, 50, 150]} zoom={10} />
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <MunsellColors munsellColors={munsellColors || []} />
            {munsellColors && munsellColors.length > 0 && <SampleColors munsellData={munsellColors} />}
            {munsellColors && munsellColors.length > 0 && <ExtractedColors extractedColors={extractedColors} munsellData={munsellColors} />}
            <OrbitControls
                autoRotate
                autoRotateSpeed={5}
                enableDamping
                dampingFactor={0.2}
                enablePan={false}
                minDistance={50}
                maxDistance={200}
            />
        </Canvas>
    );
};

export default MunsellCanvas;